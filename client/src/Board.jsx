const CELL_SIZE = 48;

const DOOR_COLOR = { green: "#4f8f3f", blue: "#2f5d8a", red: "#a1272c" };

const RANGE_DIRS = [
  { dx: 1, dy: 0, side: "east" },
  { dx: -1, dy: 0, side: "west" },
  { dx: 0, dy: 1, side: "south" },
  { dx: 0, dy: -1, side: "north" },
];

// Miroir client de la fonction serveur : cases atteignables en suivant les
// passages ouverts (pas seulement en ligne droite), jusqu'à `maxRange`,
// bloquées par un mur plein ou une porte verrouillée.
function zonesInRange(board, from, maxRange) {
  const cellAt = (x, y) => board.cells.find((c) => c.x === x && c.y === y);
  const distances = new Map([[`${from.x},${from.y}`, 0]]);
  let frontier = [from];

  for (let dist = 1; dist <= maxRange && frontier.length > 0; dist++) {
    const next = [];
    for (const pos of frontier) {
      const cell = cellAt(pos.x, pos.y);
      if (!cell) continue;
      for (const { dx, dy, side } of RANGE_DIRS) {
        const nx = pos.x + dx, ny = pos.y + dy;
        const key = `${nx},${ny}`;
        if (distances.has(key)) continue;
        const wall = cell.walls[side];
        if (wall === true) continue;
        if (wall && wall.door && wall.locked) continue;
        if (!cellAt(nx, ny)) continue;
        distances.set(key, dist);
        next.push({ x: nx, y: ny });
      }
    }
    frontier = next;
  }

  distances.delete(`${from.x},${from.y}`);
  return Array.from(distances.entries()).map(([key, distance]) => {
    const [x, y] = key.split(",").map(Number);
    return { x, y, distance };
  });
}

// Une forme distincte par type (pas seulement une couleur) : lisible même
// sans distinguer les teintes, et reconnaissable d'un coup d'œil une fois
// appris. Marcheur = rond, Coureur = triangle (vitesse), Brute = hexagone
// (carrure), Abomination = étoile à pointes (danger maximal).
function ZombieShape({ type, cx, cy, r, className }) {
  if (type === "runner") {
    const pts = [[cx, cy - r], [cx + r * 0.95, cy + r * 0.8], [cx - r * 0.95, cy + r * 0.8]];
    return <polygon points={pts.map((p) => p.join(",")).join(" ")} className={className} />;
  }
  if (type === "brute") {
    const pts = [0, 60, 120, 180, 240, 300].map((deg) => {
      const rad = (deg * Math.PI) / 180;
      return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
    });
    return <polygon points={pts.map((p) => p.join(",")).join(" ")} className={className} />;
  }
  if (type === "abomination") {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const deg = i * 45;
      const rad = (deg * Math.PI) / 180;
      const radius = i % 2 === 0 ? r * 1.15 : r * 0.55;
      pts.push([cx + radius * Math.sin(rad), cy - radius * Math.cos(rad)]);
    }
    return <polygon points={pts.map((p) => p.join(",")).join(" ")} className={className} />;
  }
  return <circle cx={cx} cy={cy} r={r} className={className} />;
}
const ZOMBIE_TYPE_LABEL = {
  walker: "Marcheur",
  runner: "Coureur",
  brute: "Brute",
  abomination: "Abomination",
};

// Une lettre + une couleur par type, pour les distinguer d'un coup d'œil sur
// le plateau (les Brutes et Abominations sont aussi dessinées plus grandes).
const ZOMBIE_DISPLAY = {
  walker: { letter: "M", size: 9 },
  runner: { letter: "C", size: 9 },
  brute: { letter: "B", size: 12 },
  abomination: { letter: "A", size: 14 },
};

const DANGER_THRESHOLDS = { blue: 0, yellow: 7, orange: 19, red: 43 };
function dangerLevel(adrenaline) {
  if (adrenaline >= DANGER_THRESHOLDS.red) return "red";
  if (adrenaline >= DANGER_THRESHOLDS.orange) return "orange";
  if (adrenaline >= DANGER_THRESHOLDS.yellow) return "yellow";
  return "blue";
}

export default function Board({ gameState, mySocketId, onMoveTo, onForceDoor, targetingWeapon, onConfirmTarget }) {
  const { board, characters, zombies, turnOrder, currentTurnIndex, round } = gameState;
  const currentPlayerId = turnOrder[currentTurnIndex];
  const isMyTurn = currentPlayerId === mySocketId;
  const myCharacter = characters.find((c) => c.playerId === mySocketId);
  const currentCharacter = characters.find((c) => c.playerId === currentPlayerId);

  function isAdjacent(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  function cellAt(x, y) {
    return board.cells.find((c) => c.x === x && c.y === y);
  }

  // Cases que l'arme en cours de visée peut effectivement atteindre (portée +
  // ligne de vue), et qui contiennent au moins un zombie à viser — sauf pour
  // Jump, qui vise une case vide exactement à 2 zones (ce n'est pas un tir).
  const rangedTargets = (() => {
    if (!targetingWeapon || !myCharacter) return [];
    const [minRange, maxRange] = targetingWeapon.range || [0, 0];
    if (targetingWeapon.isJump) {
      return zonesInRange(board, myCharacter.position, maxRange).filter((t) => t.distance === maxRange);
    }
    const inRange = zonesInRange(board, myCharacter.position, maxRange).filter((t) => t.distance >= minRange);
    if (minRange <= 0) inRange.push({ x: myCharacter.position.x, y: myCharacter.position.y, distance: 0 });
    return inRange.filter((t) => zombies.some((z) => z.position.x === t.x && z.position.y === t.y));
  })();

  function isRangedTarget(x, y) {
    return rangedTargets.some((t) => t.x === x && t.y === y);
  }

  // Renvoie ce qu'il y a entre 2 cases adjacentes : true (mur infranchissable),
  // un objet Porte ({door, locked, color}), ou rien (passage libre).
  function wallBetween(from, to) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const side = dx === 1 ? "east" : dx === -1 ? "west" : dy === 1 ? "south" : "north";
    return cellAt(from.x, from.y)?.walls[side];
  }

  function handleCellClick(x, y) {
    if (!isMyTurn || !myCharacter || myCharacter.dead) return;

    if (targetingWeapon) {
      if (isRangedTarget(x, y)) onConfirmTarget(x, y);
      return; // en visée : on ne fait rien d'autre qu'essayer de tirer
    }

    if (!isAdjacent(myCharacter.position, { x, y })) return;
    const wall = wallBetween(myCharacter.position, { x, y });
    if (wall === true) return; // mur infranchissable, rien à faire ici
    if (wall && wall.door && wall.locked) {
      onForceDoor(x, y); // porte verrouillée : on tente de la forcer (pied de biche)
      return;
    }
    onMoveTo(x, y);
  }

  // Regroupe les zombies d'une case par type (un Marcheur ne doit jamais
  // cacher une Brute qui partagerait la même case).
  function zombiesAt(x, y) {
    const here = zombies.filter((z) => z.position.x === x && z.position.y === y);
    const byType = {};
    for (const z of here) byType[z.type] = (byType[z.type] || 0) + 1;
    return Object.entries(byType).map(([type, count]) => ({ type, count }));
  }

  // Position de chaque pastille de type dans une case (jusqu'à 4 types
  // différents empilés sur la même case, disposés en petit quadrillage).
  const SLOT_OFFSETS = [
    [-1, -1], [1, -1], [-1, 1], [1, 1],
  ];

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
      <div className={`turn-banner turn-banner--${dangerLevel(currentCharacter?.adrenaline || 0)}`}>
        <span className="turn-banner__round">Manche {round}</span>
        <span className={`turn-banner__player ${isMyTurn ? "turn-banner__player--me" : ""}`}>
          {isMyTurn ? "🎯 " : ""}Tour de {currentCharacter?.name}
          {isMyTurn ? " — c'est toi" : ""}
        </span>
      </div>

      {targetingWeapon && (
        <p className="targeting-hint">
          {targetingWeapon.isJump ? "Jump" : `Visée avec ${targetingWeapon.name}`} (Portée {targetingWeapon.range?.[0] ?? 0}-{targetingWeapon.range?.[1] ?? 0}) :
          {rangedTargets.length > 0 ? " clique une zone en surbrillance." : targetingWeapon.isJump ? " aucune zone atteignable." : " aucun zombie à portée."}
        </p>
      )}

      <svg
        width={board.width * CELL_SIZE}
        height={board.height * CELL_SIZE}
        className="board-svg"
        viewBox={`0 0 ${board.width * CELL_SIZE} ${board.height * CELL_SIZE}`}
      >
        {board.cells.map((cell) => {
          const px = cell.x * CELL_SIZE;
          const py = cell.y * CELL_SIZE;
          const blockedByWall = myCharacter && wallBetween(myCharacter.position, cell) === true;
          const isTarget = isRangedTarget(cell.x, cell.y);
          const clickable = targetingWeapon
            ? isTarget
            : isMyTurn && myCharacter && !myCharacter.dead && isAdjacent(myCharacter.position, cell) && !blockedByWall;

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
                  className={isTarget ? "board-cell__highlight board-cell__highlight--target" : "board-cell__highlight"}
                  pointerEvents="none" />
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
          // Porte : trait coloré, avec un repère perpendiculaire façon "battant"
          // au milieu, et un petit cadenas si elle est verrouillée.
          const color = DOOR_COLOR[value.color] || "#8a7f5a";
          const doorColor = value.locked ? DOOR_COLOR.red : color;
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const vertical = side === "east" || side === "west";
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                className={`board-door ${value.locked ? "board-door--locked" : ""}`}
                stroke={doorColor}
              />
              <line
                x1={vertical ? midX - 5 : midX} y1={vertical ? midY : midY - 5}
                x2={vertical ? midX + 5 : midX} y2={vertical ? midY : midY + 5}
                className="board-door__leaf" stroke={doorColor}
              />
              {value.locked && (
                <g transform={`translate(${midX}, ${midY})`} className="board-door__lock">
                  <rect x={-4} y={-1} width={8} height={6} rx={1} />
                  <path d="M -2.5 -1 L -2.5 -3 A 2.5 2.5 0 0 1 2.5 -3 L 2.5 -1" fill="none" />
                </g>
              )}
            </g>
          );
        })}

        {board.cells.map((cell) => {
          const groups = zombiesAt(cell.x, cell.y);
          if (groups.length === 0) return null;
          const cx = cell.x * CELL_SIZE + CELL_SIZE / 2;
          const cy = cell.y * CELL_SIZE + CELL_SIZE / 2;
          // 1 seul type : la pastille prend le centre de la case. Plusieurs
          // types : chacun prend un coin, pour qu'aucun ne soit caché.
          const single = groups.length === 1;
          return (
            <g key={`z-${cell.x}-${cell.y}`}>
              {groups.map((g, i) => {
                const display = ZOMBIE_DISPLAY[g.type] || ZOMBIE_DISPLAY.walker;
                const [ox, oy] = single ? [0, 0] : SLOT_OFFSETS[i % SLOT_OFFSETS.length];
                const spread = single ? 0 : CELL_SIZE / 4.2;
                const gx = cx + ox * spread;
                const gy = cy + oy * spread;
                const r = single ? display.size + 2 : display.size - 2;
                return (
                  <g key={g.type} title={ZOMBIE_TYPE_LABEL[g.type]}>
                    <ZombieShape type={g.type} cx={gx} cy={gy} r={r} className={`zombie-token zombie-token--${g.type}`} />
                    <text x={gx} y={gy + 3.5} textAnchor="middle" className="zombie-token__letter">
                      {display.letter}
                    </text>
                    {g.count > 1 && (
                      <text x={gx + r} y={gy - r} textAnchor="middle" className="zombie-count">{g.count}</text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {characters.map((c) => {
          const woundLevel = c.dead ? "red" : ["blue", "yellow", "orange"][c.wounds] || "orange";
          return (
            <g key={c.playerId}>
              <circle
                cx={c.position.x * CELL_SIZE + CELL_SIZE / 2}
                cy={c.position.y * CELL_SIZE + CELL_SIZE / 2}
                r={CELL_SIZE / 3.2 + 2.5}
                className={`character-token__ring character-token__ring--${woundLevel}`}
              />
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
          );
        })}
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
      <div className="board-legend">
        {Object.entries(ZOMBIE_TYPE_LABEL).map(([type, label]) => (
          <span key={type} className="board-legend__zombie">
            <svg width="14" height="14" viewBox="-9 -9 18 18">
              <ZombieShape type={type} cx={0} cy={0} r={7} className={`zombie-token zombie-token--${type}`} />
            </svg>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
