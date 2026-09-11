const CELL_SIZE = 64;

export default function Board({ gameState, mySocketId, onMoveTo }) {
  const { board, characters, zombies, turnOrder, currentTurnIndex, round } = gameState;
  const currentPlayerId = turnOrder[currentTurnIndex];
  const isMyTurn = currentPlayerId === mySocketId;
  const myCharacter = characters.find((c) => c.playerId === mySocketId);
  const currentCharacter = characters.find((c) => c.playerId === currentPlayerId);

  function isAdjacent(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  function handleCellClick(x, y) {
    if (!isMyTurn || !myCharacter || myCharacter.dead) return;
    if (!isAdjacent(myCharacter.position, { x, y })) return;
    onMoveTo(x, y);
  }

  function zombiesAt(x, y) {
    return zombies.filter((z) => z.position.x === x && z.position.y === y);
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
          const clickable = isMyTurn && myCharacter && !myCharacter.dead && isAdjacent(myCharacter.position, cell);

          return (
            <g key={`${cell.x}-${cell.y}`}>
              <rect
                x={px} y={py} width={CELL_SIZE} height={CELL_SIZE}
                className={`board-cell ${cell.isSpawnZone ? "board-cell--spawn" : ""}`}
                onClick={() => handleCellClick(cell.x, cell.y)}
                style={{ cursor: clickable ? "pointer" : "default" }}
              />
              {clickable && (
                <rect x={px + 3} y={py + 3} width={CELL_SIZE - 6} height={CELL_SIZE - 6}
                  className="board-cell__highlight" pointerEvents="none" />
              )}
              {cell.walls.north && <line x1={px} y1={py} x2={px + CELL_SIZE} y2={py} className="board-wall" />}
              {cell.walls.south && <line x1={px} y1={py + CELL_SIZE} x2={px + CELL_SIZE} y2={py + CELL_SIZE} className="board-wall" />}
              {cell.walls.west && <line x1={px} y1={py} x2={px} y2={py + CELL_SIZE} className="board-wall" />}
              {cell.walls.east && <line x1={px + CELL_SIZE} y1={py} x2={px + CELL_SIZE} y2={py + CELL_SIZE} className="board-wall" />}
            </g>
          );
        })}

        {board.cells.map((cell) => {
          const zs = zombiesAt(cell.x, cell.y);
          if (zs.length === 0) return null;
          const cx = cell.x * CELL_SIZE + CELL_SIZE / 2;
          const cy = cell.y * CELL_SIZE + CELL_SIZE / 2;
          return (
            <g key={`z-${cell.x}-${cell.y}`}>
              <rect x={cx - 12} y={cy - 12} width={24} height={24}
                className={`zombie-token zombie-token--${zs[0].type}`}
                transform={`rotate(45 ${cx} ${cy})`} />
              {zs.length > 1 && (
                <text x={cx + 16} y={cy - 10} className="zombie-count">{zs.length}</text>
              )}
            </g>
          );
        })}

        {characters.map((c) => (
          <g key={c.playerId}>
            <circle
              cx={c.position.x * CELL_SIZE + CELL_SIZE / 2}
              cy={c.position.y * CELL_SIZE + CELL_SIZE / 2}
              r={CELL_SIZE / 3.2}
              className={`character-token ${c.playerId === mySocketId ? "character-token--me" : ""} ${c.dead ? "character-token--dead" : ""}`}
            />
            <text
              x={c.position.x * CELL_SIZE + CELL_SIZE / 2}
              y={c.position.y * CELL_SIZE + CELL_SIZE / 2 + 4}
              textAnchor="middle" className="character-token__label"
            >
              {c.name.slice(0, 3)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
