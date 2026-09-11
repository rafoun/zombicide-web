const CELL_SIZE = 64;

export default function Board({ gameState, mySocketId, onMoveTo, onAttack }) {
  const { board, characters, zombies, turnOrder, currentTurnIndex, round } = gameState;
  const currentPlayerId = turnOrder[currentTurnIndex];
  const isMyTurn = currentPlayerId === mySocketId;
  const myCharacter = characters.find((c) => c.playerId === mySocketId);
  const currentCharacter = characters.find((c) => c.playerId === currentPlayerId);

  function isAdjacent(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  function zombieAt(x, y) {
    return zombies.find((z) => z.position.x === x && z.position.y === y);
  }

  function handleCellClick(x, y) {
    if (!isMyTurn || !myCharacter) return;
    if (!isAdjacent(myCharacter.position, { x, y })) return;

    const zombie = zombieAt(x, y);
    if (zombie) {
      onAttack(zombie.id);
    } else {
      onMoveTo(x, y);
    }
  }

  return (
    <div className="board-wrapper">
      <div className="turn-banner">
        <span className="turn-banner__round">Manche {round}</span>
        <span className={`turn-banner__player ${isMyTurn ? "turn-banner__player--me" : ""}`}>
          Tour de {currentCharacter?.name}
          {isMyTurn ? " — c'est toi" : ""}
        </span>
      </div>

      <svg
        width={board.width * CELL_SIZE}
        height={board.height * CELL_SIZE}
        className="board-svg"
        viewBox={`0 0 ${board.width * CELL_SIZE} ${board.height * CELL_SIZE}`}
      >
        {board.cells.map((cell) => {
          const px = cell.x * CELL_SIZE;
          const py = cell.y * CELL_SIZE;
          const clickable =
            isMyTurn && myCharacter && isAdjacent(myCharacter.position, cell);
          const hasZombie = Boolean(zombieAt(cell.x, cell.y));

          return (
            <g key={`${cell.x}-${cell.y}`}>
              <rect
                x={px}
                y={py}
                width={CELL_SIZE}
                height={CELL_SIZE}
                className={`board-cell ${cell.isSpawnZone ? "board-cell--spawn" : ""}`}
                onClick={() => handleCellClick(cell.x, cell.y)}
                style={{ cursor: clickable ? "pointer" : "default" }}
              />
              {clickable && (
                <rect
                  x={px + 3}
                  y={py + 3}
                  width={CELL_SIZE - 6}
                  height={CELL_SIZE - 6}
                  className={`board-cell__highlight ${
                    hasZombie ? "board-cell__highlight--attack" : ""
                  }`}
                  pointerEvents="none"
                />
              )}
              {cell.walls.north && (
                <line x1={px} y1={py} x2={px + CELL_SIZE} y2={py} className="board-wall" />
              )}
              {cell.walls.south && (
                <line
                  x1={px}
                  y1={py + CELL_SIZE}
                  x2={px + CELL_SIZE}
                  y2={py + CELL_SIZE}
                  className="board-wall"
                />
              )}
              {cell.walls.west && (
                <line x1={px} y1={py} x2={px} y2={py + CELL_SIZE} className="board-wall" />
              )}
              {cell.walls.east && (
                <line
                  x1={px + CELL_SIZE}
                  y1={py}
                  x2={px + CELL_SIZE}
                  y2={py + CELL_SIZE}
                  className="board-wall"
                />
              )}
            </g>
          );
        })}

        {zombies.map((z) => (
          <g key={z.id}>
            <rect
              x={z.position.x * CELL_SIZE + CELL_SIZE / 2 - 12}
              y={z.position.y * CELL_SIZE + CELL_SIZE / 2 - 12}
              width={24}
              height={24}
              className="zombie-token"
              transform={`rotate(45 ${z.position.x * CELL_SIZE + CELL_SIZE / 2} ${
                z.position.y * CELL_SIZE + CELL_SIZE / 2
              })`}
            />
          </g>
        ))}

        {characters.map((c) => (
          <g key={c.playerId}>
            <circle
              cx={c.position.x * CELL_SIZE + CELL_SIZE / 2}
              cy={c.position.y * CELL_SIZE + CELL_SIZE / 2}
              r={CELL_SIZE / 3.2}
              className={`character-token ${
                c.playerId === mySocketId ? "character-token--me" : ""
              } ${c.woundLevel === "dead" ? "character-token--dead" : ""}`}
            />
            <text
              x={c.position.x * CELL_SIZE + CELL_SIZE / 2}
              y={c.position.y * CELL_SIZE + CELL_SIZE / 2 + 4}
              textAnchor="middle"
              className="character-token__label"
            >
              {c.name.slice(0, 3)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
