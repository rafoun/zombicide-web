import { useEffect, useState } from "react";
import { socket } from "./socket.js";
import Board from "./Board.jsx";

export default function App() {
  const [name, setName] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [room, setRoom] = useState(null); // { code, hostSocketId, status, players }
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    socket.on("room_update", (updatedRoom) => setRoom(updatedRoom));
    socket.on("game_started", (state) => setGameState(state));
    socket.on("game_state", (state) => setGameState(state));

    return () => {
      socket.off("room_update");
      socket.off("game_started");
      socket.off("game_state");
    };
  }, []);

  function ensureConnected() {
    if (!socket.connected) socket.connect();
  }

  function handleCreateRoom() {
    if (!name.trim()) return setError("Entre un nom de joueur.");
    ensureConnected();
    socket.emit("create_room", { name }, (res) => {
      if (!res.ok) return setError(res.error || "Erreur");
      setRoom(res.room);
      setError("");
    });
  }

  function handleJoinRoom() {
    if (!name.trim()) return setError("Entre un nom de joueur.");
    if (!codeInput.trim()) return setError("Entre un code de salon.");
    ensureConnected();
    socket.emit("join_room", { code: codeInput.toUpperCase(), name }, (res) => {
      if (!res.ok) return setError(res.error || "Erreur");
      setRoom(res.room);
      setError("");
    });
  }

  function handleStartGame() {
    socket.emit("start_game");
  }

  const isHost = room && socket.id === room.hostSocketId;

  if (gameState) {
    return (
      <Board
        gameState={gameState}
        mySocketId={socket.id}
        onMoveTo={(x, y) => socket.emit("game_action", { type: "move", x, y })}
        onEndTurn={() => socket.emit("game_action", { type: "end_turn" })}
      />
    );
  }

  if (room) {
    return (
      <div className="app">
        <h1>Salon {room.code}</h1>
        <p>Partage ce code à tes amis pour qu'ils rejoignent.</p>
        <ul>
          {room.players.map((p, i) => (
            <li key={i}>{p.name}</li>
          ))}
        </ul>
        {isHost ? (
          <button disabled={room.players.length < 2} onClick={handleStartGame}>
            Lancer la partie ({room.players.length}/8)
          </button>
        ) : (
          <p>En attente que l'hôte lance la partie...</p>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <h1>Zombicide Web</h1>
      <label>
        Ton nom
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="actions">
        <button onClick={handleCreateRoom}>Créer un salon</button>

        <div className="join">
          <input
            placeholder="Code du salon"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
          />
          <button onClick={handleJoinRoom}>Rejoindre</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
