// IA des zombies, au plus près des règles officielles :
// - 4 types avec leurs propres seuils d'élimination et gains d'adrénaline.
// - Chaque zombie activé : ATTAQUE s'il partage la zone d'un survivant vivant,
//   sinon il se DÉPLACE d'une case vers le survivant le plus proche (chemin
//   le plus court respectant les murs). Les Coureurs ont 2 Actions.
// - Étape SPAWN : on fait apparaître des zombies dans la zone de spawn selon
//   le niveau de danger le plus élevé parmi les survivants vivants.

import { canMove } from "./board.js";
import { SPAWN_TABLE, dangerLevelForAdrenaline } from "./decks.js";

export const ZOMBIE_TYPES = {
  walker: { label: "Marcheur", killDamage: 1, adrenaline: 1, actionsPerActivation: 1 },
  runner: { label: "Coureur", killDamage: 1, adrenaline: 1, actionsPerActivation: 2 },
  brute: { label: "Brute", killDamage: 2, adrenaline: 1, actionsPerActivation: 1 },
  abomination: { label: "Abomination", killDamage: 3, adrenaline: 5, actionsPerActivation: 1 },
};

export function highestDangerLevel(characters) {
  const alive = characters.filter((c) => !c.dead);
  if (alive.length === 0) return "blue";
  const order = ["blue", "yellow", "orange", "red"];
  let best = "blue";
  for (const c of alive) {
    const lvl = dangerLevelForAdrenaline(c.adrenaline);
    if (order.indexOf(lvl) > order.indexOf(best)) best = lvl;
  }
  return best;
}

export function spawnZombies(state) {
  const spawnCells = state.board.cells.filter((c) => c.isSpawnZone);
  if (spawnCells.length === 0) return;

  const level = highestDangerLevel(state.characters);
  const spawnList = SPAWN_TABLE[level] || SPAWN_TABLE.blue;
  const hasAbomination = state.zombies.some((z) => z.type === "abomination");

  let i = 0;
  for (const entry of spawnList) {
    if (entry.type === "abomination" && hasAbomination) continue; // 1 seule à la fois
    for (let n = 0; n < entry.count; n++) {
      const cell = spawnCells[i % spawnCells.length];
      i++;
      state.zombies.push({
        id: `z-${state.round}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        type: entry.type,
        position: { x: cell.x, y: cell.y },
      });
      if (entry.type === "abomination") break; // jamais plus d'une par vague
    }
  }
}

function neighbors(board, pos) {
  return [
    { x: pos.x + 1, y: pos.y },
    { x: pos.x - 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
    { x: pos.x, y: pos.y - 1 },
  ].filter((c) => canMove(board, pos, c));
}

// BFS : première case du plus court chemin de `from` vers la case la plus
// proche parmi `targets`, en respectant les murs.
function nextStepToward(board, from, targets) {
  const targetKeys = new Set(targets.map((t) => `${t.x},${t.y}`));
  const visited = new Set([`${from.x},${from.y}`]);
  const queue = [{ pos: from, firstStep: null }];
  while (queue.length > 0) {
    const { pos, firstStep } = queue.shift();
    if (firstStep && targetKeys.has(`${pos.x},${pos.y}`)) return firstStep;
    for (const next of neighbors(board, pos)) {
      const key = `${next.x},${next.y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ pos: next, firstStep: firstStep || next });
    }
  }
  return null;
}

function sameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

function biteRandomCharacter(charactersInCell, events) {
  const target = charactersInCell[Math.floor(Math.random() * charactersInCell.length)];
  target.wounds += 1;
  if (target.wounds >= 3) {
    target.dead = true;
    events.push(`${target.name} a été tué par un zombie.`);
  } else {
    events.push(`${target.name} a été mordu (${target.wounds}/3 blessures).`);
  }
}

export function activateZombies(state) {
  const events = [];

  for (const zombie of state.zombies) {
    const actions = ZOMBIE_TYPES[zombie.type]?.actionsPerActivation || 1;

    for (let a = 0; a < actions; a++) {
      const aliveCharacters = state.characters.filter((c) => !c.dead);
      if (aliveCharacters.length === 0) return events;

      const inSameCell = aliveCharacters.filter((c) => sameCell(c.position, zombie.position));
      if (inSameCell.length > 0) {
        biteRandomCharacter(inSameCell, events);
        continue;
      }

      const step = nextStepToward(state.board, zombie.position, aliveCharacters.map((c) => c.position));
      if (step) zombie.position = step;
      // NOTE: un zombie qui vient de se déplacer n'attaque pas le même tour
      // (sauf un Coureur qui rejoue une 2e Action juste après, cf. boucle).
    }
  }

  return events;
}
