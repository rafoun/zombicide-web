import { useEffect, useState } from "react";
import { socket } from "./socket.js";
import Board from "./Board.jsx";
import PlayerPanel from "./PlayerPanel.jsx";
import InventoryPanel from "./InventoryPanel.jsx";
import EventLog from "./EventLog.jsx";
import DiceRoll from "./DiceRoll.jsx";
import ZombiePhaseViewer from "./ZombiePhaseViewer.jsx";

function missionProgress(gameState) {
  const alive = gameState.characters.filter((c) => !c.dead);
  if (gameState.scenarioObjective === "collect_and_exit") {
    const remaining = gameState.board.cells.filter((c) => c.objective).length;
    const taken = gameState.totalObjectives - remaining;
    return `Objectifs : ${taken}/${gameState.totalObjectives} — puis rejoindre la Sortie`;
  }
  if (gameState.scenarioObjective === "arm_and_exit") {
    const armed = alive.filter((c) => c.equipment.some((e) => e.type === "weapon")).length;
    return `Survivants armés : ${armed}/${alive.length} — puis rejoindre la Sortie`;
  }
  if (gameState.scenarioObjective === "reach_danger_level") {
    const best = Math.max(0, ...alive.map((c) => c.adrenaline));
    return `Meilleure Adrénaline : ${best}/43 PA (Niveau Rouge)`;
  }
  return "";
}

export default function App() {
  const [name, setName] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [logMessages, setLogMessages] = useState([]);
  const [error, setError] = useState("");
  const [selectedWeaponId, setSelectedWeaponId] = useState(null);
  const [isTargeting, setIsTargeting] = useState(false);
  const [diceResult, setDiceResult] = useState(null);
  const [zombiePhase, setZombiePhase] = useState(null);
  const [zombiePhaseIndex, setZombiePhaseIndex] = useState(0);

  useEffect(() => {
    socket.on("room_update", (updatedRoom) => setRoom(updatedRoom));
    socket.on("game_started", (state) => setGameState(state));
    socket.on("game_state", (state) => setGameState(state));
    socket.on("game_log", (messages) => setLogMessages((prev) => [...prev, ...messages].slice(-6)));
    socket.on("dice_result", (result) => setDiceResult(result));
    socket.on("zombie_phase", (steps) => { setZombiePhase(steps); setZombiePhaseIndex(0); });

    return () => {
      socket.off("room_update");
      socket.off("game_started");
      socket.off("game_state");
      socket.off("game_log");
      socket.off("dice_result");
      socket.off("zombie_phase");
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

  function handleSelectScenario(scenarioId) {
    socket.emit("select_scenario", { scenarioId });
  }

  function handlePlayAgain() {
    setGameState(null);
    setLogMessages([]);
  }

  const isHost = room && socket.id === room.hostSocketId;

  if (gameState) {
    const currentPlayerId = gameState.turnOrder[gameState.currentTurnIndex];
    const isMyTurn = currentPlayerId === socket.id;
    const myCharacter = gameState.characters.find((c) => c.playerId === socket.id);
    const zombiesHere = myCharacter
      ? gameState.zombies.filter((z) => z.position.x === myCharacter.position.x && z.position.y === myCharacter.position.y)
      : [];
    const mission = { name: gameState.scenarioName, progress: missionProgress(gameState) };

    const weapons = myCharacter ? myCharacter.equipment.filter((e) => e.type === "weapon") : [];
    const activeWeapon = weapons.find((w) => w.id === selectedWeaponId) || weapons[0] || null;

    function handleAttackClick() {
      if (activeWeapon?.mode === "ranged") {
        setIsTargeting(true); // il faut maintenant cliquer une case sur le plateau
      } else {
        socket.emit("game_action", { type: "attack", weaponId: activeWeapon?.id });
      }
    }

    function handleConfirmTarget(x, y) {
      socket.emit("game_action", { type: "attack", weaponId: activeWeapon?.id, target: { x, y } });
      setIsTargeting(false);
    }

    function handleNextZombieStep() {
      if (zombiePhaseIndex + 1 >= zombiePhase.length) {
        setZombiePhase(null);
        setZombiePhaseIndex(0);
      } else {
        setZombiePhaseIndex((i) => i + 1);
      }
    }

    return (
      <div className="game-layout">
        {diceResult && <DiceRoll result={diceResult} onDone={() => setDiceResult(null)} />}
        {zombiePhase && <ZombiePhaseViewer steps={zombiePhase} index={zombiePhaseIndex} onNext={handleNextZombieStep} />}
        {gameState.phase === "game_over" && (
          <div className={`game-over-banner game-over-banner--${gameState.gameOver?.result}`}>
            <strong>{gameState.gameOver?.result === "won" ? "Victoire !" : "Défaite..."}</strong>
            <span>{gameState.gameOver?.reason}</span>
            {isHost && <button onClick={handlePlayAgain}>Retour au salon</button>}
          </div>
        )}
        <PlayerPanel
          character={myCharacter}
          isMyTurn={isMyTurn}
          zombiesHere={zombiesHere}
          weapons={weapons}
          selectedWeaponId={activeWeapon?.id || null}
          onSelectWeapon={setSelectedWeaponId}
          isTargeting={isTargeting}
          onCancelTargeting={() => setIsTargeting(false)}
          onSearch={() => socket.emit("game_action", { type: "search" })}
          onAttack={handleAttackClick}
          onUseItem={(itemId) => socket.emit("game_action", { type: "use_item", itemId })}
          onEndTurn={() => { setIsTargeting(false); socket.emit("game_action", { type: "end_turn" }); }}
          mission={mission}
        />
        <Board
          gameState={gameState}
          mySocketId={socket.id}
          onMoveTo={(x, y) => socket.emit("game_action", { type: "move", x, y })}
          onForceDoor={(x, y) => socket.emit("game_action", { type: "force_door", x, y })}
          targetingWeapon={isTargeting ? activeWeapon : null}
          onConfirmTarget={handleConfirmTarget}
        />
        <div className="right-column">
          <InventoryPanel equipment={myCharacter?.equipment || []} />
          <EventLog messages={logMessages} />
        </div>
      </div>
    );
  }

  if (room) {
    const scenarios = room.scenarios || [];
    const selectedScenario = scenarios.find((s) => s.id === room.scenarioId) || scenarios[0];

    return (
      <div className="app app--lobby">
        <h1>Salon {room.code}</h1>
        <p>Partage ce code à tes amis pour qu'ils rejoignent.</p>
        <ul>{room.players.map((p, i) => <li key={i}>{p.name}</li>)}</ul>

        <h2>Scénario</h2>
        <div className="scenario-list">
          {scenarios.map((s) => (
            <button
              key={s.id}
              className={`scenario-card ${s.id === room.scenarioId ? "scenario-card--selected" : ""}`}
              disabled={!isHost}
              onClick={() => handleSelectScenario(s.id)}
            >
              <div className="scenario-card__header">
                <span className="scenario-card__name">{s.name}</span>
                <span className="scenario-card__meta">{s.difficulty} · {s.time}</span>
              </div>
              <p className="scenario-card__flavor">{s.flavor}</p>
            </button>
          ))}
        </div>

        {selectedScenario && (
          <ul className="scenario-rules">
            {selectedScenario.specialRules.map((rule, i) => <li key={i}>{rule}</li>)}
          </ul>
        )}

        {isHost ? (
          <button disabled={room.players.length < 2} onClick={handleStartGame}>
            Lancer la partie ({room.players.length}/8)
          </button>
        ) : (
          <p>En attente que l'hôte choisisse un scénario et lance la partie...</p>
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
          <input placeholder="Code du salon" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} />
          <button onClick={handleJoinRoom}>Rejoindre</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
