import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { customAlphabet } from "nanoid";
import { createInitialGameState } from "./game/state.js";
import { applyAction } from "./game/actions.js";
import { scenarioSummaries, SCENARIOS } from "./game/scenarios.js";

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "https://zombicide-web.vercel.app" },
});

app.get("/health", (req, res) => res.json({ ok: true }));

const rooms = new Map();

function roomSummary(room) {
  return {
    code: room.code,
    hostSocketId: room.hostSocketId,
    status: room.status,
    players: room.players.map((p) => ({ name: p.name })),
    scenarioId: room.scenarioId,
    scenarios: scenarioSummaries(),
  };
}

function broadcastRoom(room) {
  io.to(room.code).emit("room_update", roomSummary(room));
}

io.on("connection", (socket) => {
  let currentRoomCode = null;

  socket.on("create_room", ({ name }, callback) => {
    const code = nanoid();
    const room = {
      code,
      hostSocketId: socket.id,
      players: [{ socketId: socket.id, name }],
      status: "lobby",
      scenarioId: SCENARIOS[0].id,
      game: null,
    };
    rooms.set(code, room);
    socket.join(code);
    currentRoomCode = code;
    callback({ ok: true, room: roomSummary(room) });
  });

  socket.on("join_room", ({ code, name }, callback) => {
    const room = rooms.get(code);
    if (!room) return callback({ ok: false, error: "Salon introuvable" });
    if (room.status !== "lobby") return callback({ ok: false, error: "La partie a déjà commencé" });
    if (room.players.length >= 8) return callback({ ok: false, error: "Salon complet (8 joueurs max)" });

    room.players.push({ socketId: socket.id, name });
    socket.join(code);
    currentRoomCode = code;
    broadcastRoom(room);
    callback({ ok: true, room: roomSummary(room) });
  });

  socket.on("select_scenario", ({ scenarioId }) => {
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostSocketId !== socket.id || room.status !== "lobby") return;
    if (!SCENARIOS.some((s) => s.id === scenarioId)) return;
    room.scenarioId = scenarioId;
    broadcastRoom(room);
  });

  socket.on("start_game", () => {
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostSocketId !== socket.id) return;
    if (room.players.length < 2) return;

    room.status = "playing";
    room.game = createInitialGameState(room.players, room.scenarioId);
    io.to(room.code).emit("game_started", room.game);
    broadcastRoom(room);
  });

  socket.on("game_action", (action, callback) => {
    const room = rooms.get(currentRoomCode);
    if (!room || room.status !== "playing") {
      return callback?.({ ok: false, error: "Aucune partie en cours." });
    }

    const result = applyAction(room.game, socket.id, action);
    if (result.ok) {
      io.to(room.code).emit("game_state", room.game);
      if (result.events?.length) io.to(room.code).emit("game_log", result.events);
    }
    callback?.(result.ok ? { ok: true } : { ok: false, error: result.error });
  });

  socket.on("disconnect", () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    room.players = room.players.filter((p) => p.socketId !== socket.id);
    if (room.players.length === 0) {
      rooms.delete(currentRoomCode);
      return;
    }
    if (room.hostSocketId === socket.id) room.hostSocketId = room.players[0].socketId;
    broadcastRoom(room);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Serveur Zombicide-web lancé sur le port ${PORT}`);
});
