const CELL_SIZE = 48;

const DOOR_COLOR = { green: "#4f8f3f", blue: "#2f5d8a", red: "#a1272c" };

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

  // Un seul segment de mur/porte par frontière (évite de dessiner deux fois
  // la même limite en la parcourant depuis chaque case voisine).
  const boundaries = [];
  for (const cell of board.cells) {
    if (cell.walls.south) boundaries.push({ cell, side: "south", value: cell.walls.south });
    if (cell.walls.east) boundaries.push({ cell, side: "east", value: cell.walls.east });
    if (cell.y === 0 && cell.walls.north) boundaries.push({ cell, side: "north", value: cell.walls.north });
    if (cell.x === 0 && cell.walls.west) boundaries.push({ cell, side: "west", value: cell.walls.west });
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

          let cellClass = cell.building ? "board-cell--building" : "board-cell--street";
          if (cell.isSpawnZone) cellClass += " board-cell--spawn";
          if (cell.isStartZone) cellClass += " board-cell--start";
          if (cell.isExit) cellClass += " board-cell--exit";

          return (
            <g key={`${cell.x}-${cell.y}`}>
              <rect
                x={px} y={py} width={CELL_SIZE} height={CELL_SIZE}
                className={`board-cell ${cellClass}`}
                onClick={() => handleCellClick(cell.x, cell.y)}
                style={{ cursor: clickable ? "pointer" : "default" }}
              />
              {clickable && (
                <rect x={px + 3} y={py + 3} width={CELL_SIZE - 6} height={CELL_SIZE - 6}
                  className="board-cell__highlight" pointerEvents="none" />
              )}

              {cell.isExit && (
                <text x={px + CELL_SIZE / 2} y={py + CELL_SIZE / 2 + 3} textAnchor="middle"
                  className="board-icon-label board-icon-label--exit" pointerEvents="none">SORTIE</text>
              )}
              {cell.isStartZone && (
                <circle cx={px + CELL_SIZE / 2} cy={py + CELL_SIZE / 2} r={6}
                  className="board-icon board-icon--start" pointerEvents="none" />
              )}
              {cell.isSpawnZone && (
                <polygon
                  points={`${px + CELL_SIZE / 2},${py + 8} ${px + CELL_SIZE - 8},${py + CELL_SIZE - 8} ${px + 8},${py + CELL_SIZE - 8}`}
                  className="board-icon board-icon--spawn" pointerEvents="none"
                />
              )}
              {cell.objective && (
                <g pointerEvents="none">
                  <line x1={px + 12} y1={py + 12} x2={px + CELL_SIZE - 12} y2={py + CELL_SIZE - 12}
                    className={`board-objective board-objective--${cell.objective.color}`} />
                  <line x1={px + CELL_SIZE - 12} y1={py + 12} x2={px + 12} y2={py + CELL_SIZE - 12}
                    className={`board-objective board-objective--${cell.objective.color}`} />
                </g>
              )}
            </g>
          );
        })}

        {/* Murs pleins et portes (colorées, en pointillés rouges si verrouillées) */}
        {boundaries.map(({ cell, side, value }, i) => {
          const px = cell.x * CELL_SIZE;
          const py = cell.y * CELL_SIZE;
          let x1, y1, x2, y2;
          if (side === "south") { x1 = px; y1 = py + CELL_SIZE; x2 = px + CELL_SIZE; y2 = py + CELL_SIZE; }
          else if (side === "north") { x1 = px; y1 = py; x2 = px + CELL_SIZE; y2 = py; }
          else if (side === "east") { x1 = px + CELL_SIZE; y1 = py; x2 = px + CELL_SIZE; y2 = py + CELL_SIZE; }
          else { x1 = px; y1 = py; x2 = px; y2 = py + CELL_SIZE; }

          if (value === true) {
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="board-wall" />;
          }
          // Porte : trait coloré, pointillé et plus fin si verrouillée.
          const color = DOOR_COLOR[value.color] || "#8a7f5a";
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              className={`board-door ${value.locked ? "board-door--locked" : ""}`}
              stroke={value.locked ? DOOR_COLOR.red : color}
            />
          );
        })}

        {board.cells.map((cell) => {
          const zs = zombiesAt(cell.x, cell.y);
          if (zs.length === 0) return null;
          const cx = cell.x * CELL_SIZE + CELL_SIZE / 2;
          const cy = cell.y * CELL_SIZE + CELL_SIZE / 2;
          return (
            <g key={`z-${cell.x}-${cell.y}`}>
              <rect x={cx - 10} y={cy - 10} width={20} height={20}
                className={`zombie-token zombie-token--${zs[0].type}`}
                transform={`rotate(45 ${cx} ${cy})`} />
              {zs.length > 1 && (
                <text x={cx + 14} y={cy - 8} className="zombie-count">{zs.length}</text>
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

      <div className="board-legend">
        <span><i className="board-legend__swatch board-legend__swatch--building" /> Bâtiment</span>
        <span><i className="board-legend__swatch board-legend__swatch--street" /> Rue</span>
        <span><i className="board-legend__swatch board-legend__swatch--spawn" /> Spawn zombies</span>
        <span><i className="board-legend__swatch board-legend__swatch--start" /> Départ joueurs</span>
        <span><i className="board-legend__swatch board-legend__swatch--exit" /> Sortie</span>
        <span><i className="board-legend__swatch board-legend__swatch--door-green" /> Porte</span>
        <span><i className="board-legend__swatch board-legend__swatch--door-red" /> Porte verrouillée</span>
      </div>
    </div>
  );
}
