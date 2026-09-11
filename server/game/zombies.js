import { canMove } from "./board.js";
import { ZOMBIE_SPAWN_COUNT } from "./decks.js";

const WOUND_ORDER = ["blue", "yellow", "orange", "red", "dead"];

export function spawnZombies(state) {
  const spawnCells = state.board.cells.filter((c) => c.isSpawnZone);
  if (spawnCells.length === 0) return;

  const count = ZOMBIE_SPAWN_COUNT[state.dangerLevel] || 2;

  for (let i = 0; i < count; i++) {
    const cell = spawnCells[i % spawnCells.length];
    state.zombies.push({
      id: `z-${state.round}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      type: "walker",
      position: { x: cell.x, y: cell.y },
    });
  }
}

function neighbors(board, pos) {
  const candidates = [
    { x: pos.x + 1, y: pos.y },
    { x: pos.x - 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
    { x: pos.x, y: pos.y - 1 },
  ];
  return candidates.filter((c) => canMove(board, pos, c));
}

// BFS : renvoie la première case du plus court chemin depuis `from` vers la
// case la plus proche parmi `targets`, en respectant les murs du plateau.
function nextStepToward(board, from, targets) {
  const targetKeys = new Set(targets.map((t) => `${t.x},${t.y}`));
  const visited = new Set([`${from.x},${from.y}`]);
  const queue = [{ pos: from, firstStep: null }];

  while (queue.length > 0) {
    const { pos, firstStep } = queue.shift();
    if (firstStep && targetKeys.has(`${pos.x},${pos.y}`)) {
      return firstStep;
    }
    for (const next of neighbors(board, pos)) {
      const key = `${next.x},${next.y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ pos: next, firstStep: firstStep || next });
    }
  }
  return null;
}

function isAdjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

function biteCharacter(character, events) {
  const currentIndex = WOUND_ORDER.indexOf(character.woundLevel);
  const nextLevel = WOUND_ORDER[Math.min(currentIndex + 1, WOUND_ORDER.length - 1)];
  character.woundLevel = nextLevel;
  events.push(
    nextLevel === "dead"
      ? `${character.name} a été tué par un zombie.`
      : `${character.name} a été mordu (${nextLevel}).`
  );
}

// Fait jouer tous les zombies : ceux déjà collés à un survivant mordent tout
// de suite, les autres avancent d'une case vers le survivant le plus proche
// (et mordent s'ils se retrouvent adjacents après ce déplacement).
export function activateZombies(state) {
  const events = [];

  for (const zombie of state.zombies) {
    const aliveCharacters = state.characters.filter((c) => c.woundLevel !== "dead");
    if (aliveCharacters.length === 0) break;

    const alreadyAdjacent = aliveCharacters.find((c) => isAdjacent(c.position, zombie.position));
    if (alreadyAdjacent) {
      biteCharacter(alreadyAdjacent, events);
      continue;
    }

    const step = nextStepToward(state.board, zombie.position, aliveCharacters.map((c) => c.position));
    if (step) zombie.position = step;

    const nowAdjacent = aliveCharacters.find((c) => isAdjacent(c.position, zombie.position));
    if (nowAdjacent) biteCharacter(nowAdjacent, events);
  }

  return events;
}
