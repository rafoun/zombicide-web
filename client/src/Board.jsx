const CELL_SIZE = 60;

export default function Board({ gameState, mySocketId, onMoveTo, onEndTurn, onSearch }) {
  const { board, characters, turnOrder, currentTurnIndex, round } = gameState;
  const currentPlayerId = turnOrder[currentTurnIndex];
  const isMyTurn = currentPlayerId === mySocketId;
  const myCharacter = characters.find((c) => c.playerId === mySocketId);
  const currentCharacter = characters.find((c) => c.playerId === currentPlayerId);

  function isAdjacent(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  function handleCellClick(x, y) {
    if (!isMyTurn || !myCharacter) return;
    if (!isAdjacent(myCharacter.position, { x, y })) return;
    onMoveTo(x, y);
  }

  return (
    <div className="board-wrapper">
      <div className="board-hud">
        <p>
          Manche {round} — Tour de <strong>{currentCharacter?.name}</strong>
          {isMyTurn ? " (toi)" : ""}
        </p>
        {myCharacter && <p>Actions restantes : {myCharacter.actionsLeft}</p>}
        {isMyTurn && myCharacter?.actionsLeft > 0 && (
          <button onClick={onSearch}>Fouiller (piocher équipement)</button>
        )}
        {isMyTurn && <button onClick={onEndTurn}>Terminer mon tour</button>}
      </div>

      {myCharacter && myCharacter.equipment.length > 0 && (
        <div className="equipment-list">
          <strong>Ton équipement :</strong>
          <ul>
            {myCharacter.equipment.map((card, i) => (
              <li key={i}>{card.name}</li>
            ))}
          </ul>
        </div>
      )}

      <svg
        width={board.width * CELL_SIZE}
        height={board.height * CELL_SIZE}
        className="board-svg"
      >
        {board.cells.map((cell) => {
          const px = cell.x * CELL_SIZE;
          const py = cell.y * CELL_SIZE;
          const clickable =
            isMyTurn && myCharacter && isAdjacent(myCharacter.position, cell);

          return (
            <g key={`${cell.x}-${cell.y}`}>
              <rect
                x={px}
                y={py}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill={cell.isSpawnZone ? "#3a1f1f" : "#2a2a2a"}
                stroke="#444"
                onClick={() => handleCellClick(cell.x, cell.y)}
                style={{ cursor: clickable ? "pointer" : "default" }}
              />
              {clickable && (
                <rect
                  x={px + 2}
                  y={py + 2}
                  width={CELL_SIZE - 4}
                  height={CELL_SIZE - 4}
                  fill="none"
                  stroke="#4ade80"
                  strokeWidth={2}
                  pointerEvents="none"
                />
              )}
              {cell.walls.north && (
                <line x1={px} y1={py} x2={px + CELL_SIZE} y2={py} stroke="#eee" strokeWidth={3} />
              )}
              {cell.walls.south && (
                <line
                  x1={px}
                  y1={py + CELL_SIZE}
                  x2={px + CELL_SIZE}
                  y2={py + CELL_SIZE}
                  stroke="#eee"
                  strokeWidth={3}
                />
              )}
              {cell.walls.west && (
                <line x1={px} y1={py} x2={px} y2={py + CELL_SIZE} stroke="#eee" strokeWidth={3} />
              )}
              {cell.walls.east && (
                <line
                  x1={px + CELL_SIZE}
                  y1={py}
                  x2={px + CELL_SIZE}
                  y2={py + CELL_SIZE}
                  stroke="#eee"
                  strokeWidth={3}
                />
              )}
            </g>
          );
        })}

        {characters.map((c) => (
          <g key={c.playerId}>
            <circle
              cx={c.position.x * CELL_SIZE + CELL_SIZE / 2}
              cy={c.position.y * CELL_SIZE + CELL_SIZE / 2}
              r={CELL_SIZE / 3}
              fill={c.playerId === mySocketId ? "#4ade80" : "#60a5fa"}
              stroke="#111"
              strokeWidth={2}
            />
            <text
              x={c.position.x * CELL_SIZE + CELL_SIZE / 2}
              y={c.position.y * CELL_SIZE + CELL_SIZE / 2 + 4}
              textAnchor="middle"
              fontSize="10"
              fill="#111"
            >
              {c.name.slice(0, 3)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
