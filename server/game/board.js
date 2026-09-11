// Plateau : grille de cases ("zones"), chacune avec des murs sur ses 4 côtés
// qui bloquent le déplacement et la ligne de vue. Une seule tuile de départ
// pour l'instant ; le vrai jeu assemble plusieurs tuiles physiques.

const DELTA = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
const OPPOSITE = { north: "south", south: "north", east: "west", west: "east" };

function getCell(board, x, y) {
  if (x < 0 || y < 0 || x >= board.width || y >= board.height) return null;
  return board.cells[y * board.width + x];
}

function addWall(board, x, y, side) {
  const cell = getCell(board, x, y);
  if (!cell) return;
  cell.walls[side] = true;
  const [dx, dy] = DELTA[side];
  const neighbor = getCell(board, x + dx, y + dy);
  if (neighbor) neighbor.walls[OPPOSITE[side]] = true;
}

export function createStarterBoard() {
  const width = 6;
  const height = 6;
  const cells = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push({
        x,
        y,
        walls: { north: y === 0, south: y === height - 1, west: x === 0, east: x === width - 1 },
        isSpawnZone: x === width - 1 && y === 0, // coin en haut à droite : zone de spawn
      });
    }
  }
  const board = { width, height, cells };

  // Quelques murs intérieurs (petite maison) — à remplacer par de vraies tuiles plus tard.
  addWall(board, 2, 0, "south");
  addWall(board, 2, 1, "east");
  addWall(board, 3, 1, "south");
  addWall(board, 1, 3, "east");
  addWall(board, 1, 3, "south");

  return board;
}

export function canMove(board, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
  const fromCell = getCell(board, from.x, from.y);
  const toCell = getCell(board, to.x, to.y);
  if (!fromCell || !toCell) return false;
  if (dx === 1) return !fromCell.walls.east;
  if (dx === -1) return !fromCell.walls.west;
  if (dy === 1) return !fromCell.walls.south;
  if (dy === -1) return !fromCell.walls.north;
  return false;
}

export function startingPositions(count) {
  const positions = [];
  for (let i = 0; i < count; i++) positions.push({ x: i, y: 5 });
  return positions;
}
