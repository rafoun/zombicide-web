// Plateau : grille de cases regroupées en "zones" (pièces de bâtiment ou
// segments de rue), à l'image de l'assemblage de tuiles du vrai jeu
// (cf. légende officielle : zone de départ, zone de spawn zombies, sorties,
// objectifs, portes colorées/verrouillées). Deux tuiles de large sur deux de
// haut, assemblées comme sur les photos de référence.

const DELTA = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
const OPPOSITE = { north: "south", south: "north", east: "west", west: "east" };

function getCell(board, x, y) {
  if (x < 0 || y < 0 || x >= board.width || y >= board.height) return null;
  return board.cells[y * board.width + x];
}

// Mur infranchissable (bord de tuile, séparation de rue/bâtiment).
function addWall(board, x, y, side) {
  const cell = getCell(board, x, y);
  if (!cell) return;
  cell.walls[side] = true;
  const [dx, dy] = DELTA[side];
  const neighbor = getCell(board, x + dx, y + dy);
  if (neighbor) neighbor.walls[OPPOSITE[side]] = true;
}

// Porte : franchissable librement si non verrouillée, bloquée sinon (le
// système de clés/objectifs pour déverrouiller arrivera avec la Fouille en
// bâtiment). `color` sert uniquement à l'affichage (vert/bleu), comme sur les
// tuiles officielles.
function addDoor(board, x, y, side, { locked = false, color = null } = {}) {
  const cell = getCell(board, x, y);
  if (!cell) return;
  const door = { door: true, locked, color };
  cell.walls[side] = door;
  const [dx, dy] = DELTA[side];
  const neighbor = getCell(board, x + dx, y + dy);
  if (neighbor) neighbor.walls[OPPOSITE[side]] = door; // même objet -> même état des deux côtés
}

// Délimite une pièce de bâtiment : mure tout son périmètre (les portes sont
// percées séparément avec addDoor) et assigne zoneId/building aux cases.
function defineRoom(board, x0, y0, x1, y1, zoneId, label) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const cell = getCell(board, x, y);
      if (!cell) continue;
      cell.zoneId = zoneId;
      cell.building = true;
    }
  }
  board.zones[zoneId] = { id: zoneId, building: true, label };

  for (let x = x0; x <= x1; x++) {
    if (y0 === 0 || getCell(board, x, y0 - 1)?.zoneId !== zoneId) addWall(board, x, y0, "north");
    if (y1 === board.height - 1 || getCell(board, x, y1 + 1)?.zoneId !== zoneId) addWall(board, x, y1, "south");
  }
  for (let y = y0; y <= y1; y++) {
    if (x0 === 0 || getCell(board, x0 - 1, y)?.zoneId !== zoneId) addWall(board, x0, y, "west");
    if (x1 === board.width - 1 || getCell(board, x1 + 1, y)?.zoneId !== zoneId) addWall(board, x1, y, "east");
  }
}

function defineStreetZone(board, x0, y0, x1, y1, zoneId, label) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const cell = getCell(board, x, y);
      if (!cell) continue;
      cell.zoneId = zoneId;
      cell.building = false;
    }
  }
  board.zones[zoneId] = { id: zoneId, building: false, label };
}

function markSpawn(board, x, y) {
  const cell = getCell(board, x, y);
  if (cell) cell.isSpawnZone = true;
}

function markStart(board, x, y) {
  const cell = getCell(board, x, y);
  if (cell) cell.isStartZone = true;
}

function markExit(board, x, y) {
  const cell = getCell(board, x, y);
  if (cell) cell.isExit = true;
}

function markObjective(board, x, y, color) {
  const cell = getCell(board, x, y);
  if (cell) cell.objective = { color };
}

// Plateau 12x12 = assemblage de 4 tuiles (2x2), avec une rue en croix (2 cases
// de large, comme les doubles voies des tuiles officielles) et 4 bâtiments
// dans les angles, chacun divisé en 2 pièces reliées par une porte.
export function createStarterBoard() {
  const width = 12;
  const height = 12;
  const cells = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push({
        x, y,
        zoneId: "street",
        building: false,
        walls: { north: y === 0, south: y === height - 1, west: x === 0, east: x === width - 1 },
        isSpawnZone: false,
        isStartZone: false,
        isExit: false,
        objective: null,
      });
    }
  }
  const board = { width, height, cells, zones: {} };

  defineStreetZone(board, 0, 0, width - 1, height - 1, "street", "Rue");

  // --- Bâtiment Nord-Ouest (tuile "2A") ---
  defineRoom(board, 0, 0, 2, 4, "nw-1", "2A");
  defineRoom(board, 3, 0, 4, 4, "nw-2", "2A");
  addDoor(board, 2, 2, "east", { color: "green" });       // entre les 2 pièces
  addDoor(board, 2, 4, "south", { color: "green" });      // vers la rue

  // --- Bâtiment Nord-Est (tuile "4A") ---
  defineRoom(board, 7, 0, 8, 4, "ne-1", "4A");
  defineRoom(board, 9, 0, 11, 4, "ne-2", "4A");
  addDoor(board, 8, 2, "east", { color: "blue" });
  addDoor(board, 9, 4, "south", { color: "blue" });
  markObjective(board, 10, 2, "blue"); // objectif bleu, comme sur la légende

  // --- Bâtiment Sud-Ouest (tuile "4B") ---
  defineRoom(board, 0, 7, 2, 11, "sw-1", "4B");
  defineRoom(board, 3, 7, 4, 11, "sw-2", "4B");
  addDoor(board, 2, 9, "east", { color: "green" });
  addDoor(board, 2, 7, "north", { color: "green" });
  markObjective(board, 1, 10, "green"); // objectif vert

  // --- Bâtiment Sud-Est (tuile "5C") ---
  defineRoom(board, 7, 7, 8, 11, "se-1", "5C");
  defineRoom(board, 9, 7, 11, 11, "se-2", "5C");
  addDoor(board, 8, 9, "east", { locked: true, color: "red" }); // porte verrouillée
  addDoor(board, 9, 7, "north", { color: "blue" });
  markObjective(board, 10, 9, "red"); // objectif générique, derrière la porte verrouillée

  // --- Zones de spawn zombies (coins de bâtiments + extrémités de rue,
  //     comme les icônes rouges de la légende officielle) ---
  markSpawn(board, 0, 0);
  markSpawn(board, 11, 0);
  markSpawn(board, 0, 11);
  markSpawn(board, 11, 11);
  markSpawn(board, 5, 0);
  markSpawn(board, 6, 11);

  // --- Zone de départ des joueurs (icône bleue "Player starting area") ---
  markStart(board, 0, 5);
  markStart(board, 0, 6);
  markStart(board, 1, 5);
  markStart(board, 1, 6);

  // --- Sorties (bandes jaunes "EXIT" en bord de rue) ---
  markExit(board, 5, 11);
  markExit(board, 6, 11);

  return board;
}

export function canMove(board, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
  const fromCell = getCell(board, from.x, from.y);
  const toCell = getCell(board, to.x, to.y);
  if (!fromCell || !toCell) return false;

  const side = dx === 1 ? "east" : dx === -1 ? "west" : dy === 1 ? "south" : "north";
  const wall = fromCell.walls[side];
  if (wall === true) return false; // mur infranchissable
  if (wall && wall.door && wall.locked) return false; // porte verrouillée, pas encore de clé
  return true;
}

export function getZone(board, x, y) {
  const cell = getCell(board, x, y);
  return cell ? board.zones[cell.zoneId] : null;
}

export function startingPositions(board, count) {
  const startCells = board.cells.filter((c) => c.isStartZone);
  const pool = startCells.length > 0 ? startCells : [board.cells[0]];
  const positions = [];
  for (let i = 0; i < count; i++) {
    const cell = pool[i % pool.length];
    positions.push({ x: cell.x, y: cell.y });
  }
  return positions;
}
