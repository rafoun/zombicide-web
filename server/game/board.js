// Modélisation simplifiée d'un plateau Zombicide : une grille de cases (x, y),
// chacune avec des murs sur ses 4 côtés (nord/est/sud/ouest) qui bloquent le
// déplacement. On part avec UNE tuile de départ codée en dur ; plus tard on
// pourra piocher/assembler plusieurs tuiles comme dans le vrai jeu.

const DELTA = {
  north: [0, -1],
  south: [0, 1],
  east: [1, 0],
  west: [-1, 0],
};
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
        walls: {
          north: y === 0,
          south: y === height - 1,
          west: x === 0,
          east: x === width - 1,
        },
        isSpawnZone: x === width - 1 && y === 0, // coin en haut à droite : zone de spawn zombie
      });
    }
  }

  const board = { width, height, cells };

  // Quelques murs intérieurs pour simuler une petite maison (à remplacer plus
  // tard par de vraies tuiles Zombicide).
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
  if (Math.abs(dx) + Math.abs(dy) !== 1) return false; // uniquement case adjacente, en ligne

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
  // Aligne les personnages sur la rangée du bas pour démarrer.
  const positions = [];
  for (let i = 0; i < count; i++) {
    positions.push({ x: i, y: 5 });
  }
  return positions;
}
