// IA des zombies, au plus près des règles officielles :
// - 4 types avec leurs propres seuils d'élimination et gains d'adrénaline.
// - Chaque zombie activé : ATTAQUE s'il partage la zone d'un survivant vivant,
//   sinon il se DÉPLACE d'une case vers le survivant le plus proche (chemin
//   le plus court respectant les murs). Les Coureurs ont 2 Actions.
// - Étape SPAWN : on fait apparaître des zombies dans la zone de spawn selon
//   le niveau de danger le plus élevé parmi les survivants vivants.

import { canMove } from "./board.js";
import { shuffle, dangerLevelForAdrenaline } from "./decks.js";

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

function makeZombie(type, cell) {
  return {
    id: `z-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    position: { x: cell.x, y: cell.y },
  };
}

function drawZombieCard(state) {
  if (state.decks.zombieDeck.length === 0) {
    if (state.decks.zombieDiscard.length === 0) return null; // aucune carte nulle part (ne devrait pas arriver)
    state.decks.zombieDeck = shuffle(state.decks.zombieDiscard);
    state.decks.zombieDiscard = [];
  }
  const card = state.decks.zombieDeck.pop();
  state.decks.zombieDiscard.push(card);
  return card;
}

// Étape SPAWN (p. 25) : une carte Zombie par Zone de Spawn active, dans
// l'ordre (Zone de Départ du Spawn en premier, puis les autres — ici l'ordre
// dans lequel chaque plateau les déclare, qui suit déjà une logique
// géographique cohérente), au lieu de vider toute une table d'un coup.
// Renvoie une liste d'étapes ({kind, message, ...détails}) — une par Zone de
// Spawn traitée — pour que le client puisse les afficher une par une.
export function spawnZombies(state) {
  const spawnCells = state.board.cells.filter((c) => c.isSpawnZone);
  if (spawnCells.length === 0) return [];

  const level = highestDangerLevel(state.characters);
  const steps = [];

  for (const cell of spawnCells) {
    const card = drawZombieCard(state);
    if (!card) break;

    const zone = state.board.zones[cell.zoneId];
    const zoneLabel = zone?.label || "une zone de spawn";
    const cellPos = { x: cell.x, y: cell.y };

    if (card.type === "abomination") {
      const hasAbomination = state.zombies.some((z) => z.type === "abomination");
      if (!hasAbomination) {
        const zombie = makeZombie("abomination", cell);
        state.zombies.push(zombie);
        steps.push({
          kind: "spawn", zombieType: "abomination", count: 1, zoneLabel, cell: cellPos,
          message: `Une Abomination apparaît (${zoneLabel}) !`,
        });
      } else {
        state.pendingExtraActivations = state.pendingExtraActivations || [];
        state.pendingExtraActivations.push("abomination");
        steps.push({
          kind: "abomination_extra", zoneLabel,
          message: "Carte Abomination piochée alors qu'il y en a déjà une : elle agira une fois de plus ce tour-ci.",
        });
      }
      continue;
    }

    const count = card.counts[level] ?? 0;
    if (count === 0) continue; // ex. carte Brute piochée en Bleu/Jaune : rien n'apparaît
    for (let n = 0; n < count; n++) state.zombies.push(makeZombie(card.type, cell));
    steps.push({
      kind: "spawn", zombieType: card.type, count, zoneLabel, cell: cellPos,
      message: `${count} ${ZOMBIE_TYPES[card.type].label}(s) apparaissent (${zoneLabel}).`,
    });
  }

  return steps;
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

function biteRandomCharacter(zombie, charactersInCell) {
  const target = charactersInCell[Math.floor(Math.random() * charactersInCell.length)];
  target.wounds += 1;
  const characterDied = target.wounds >= 3;
  if (characterDied) target.dead = true;
  const label = ZOMBIE_TYPES[zombie.type].label;
  return {
    kind: "bite", zombieId: zombie.id, zombieType: zombie.type, at: { ...zombie.position },
    targetPlayerId: target.playerId, targetName: target.name, characterDied,
    message: characterDied
      ? `${label} mord ${target.name}, qui succombe à ses blessures.`
      : `${label} mord ${target.name} (${target.wounds}/3 blessures).`,
  };
}

// Résout une seule Activation d'un zombie : ATTAQUE s'il partage la zone
// d'un Survivant vivant, sinon DÉPLACEMENT d'une case vers le plus proche.
// Renvoie l'étape correspondante, ou null si plus personne n'est vivant
// (plus la peine de continuer) ou si le zombie ne peut rien faire.
function activateOnce(zombie, state) {
  const aliveCharacters = state.characters.filter((c) => !c.dead);
  if (aliveCharacters.length === 0) return null;

  const inSameCell = aliveCharacters.filter((c) => sameCell(c.position, zombie.position));
  if (inSameCell.length > 0) return biteRandomCharacter(zombie, inSameCell);

  const step = nextStepToward(state.board, zombie.position, aliveCharacters.map((c) => c.position));
  if (step) {
    const from = { ...zombie.position };
    zombie.position = step;
    return {
      kind: "move", zombieId: zombie.id, zombieType: zombie.type, from, to: { ...step },
      message: `${ZOMBIE_TYPES[zombie.type].label} se déplace.`,
    };
  }

  return {
    kind: "idle", zombieId: zombie.id, zombieType: zombie.type, at: { ...zombie.position },
    message: `${ZOMBIE_TYPES[zombie.type].label} ne peut ni bouger ni attaquer.`,
  };
}

export function activateZombies(state) {
  const steps = [];

  for (const zombie of state.zombies) {
    const actions = ZOMBIE_TYPES[zombie.type]?.actionsPerActivation || 1;
    for (let a = 0; a < actions; a++) {
      const step = activateOnce(zombie, state);
      if (!step) return steps; // plus personne de vivant : inutile de continuer
      steps.push(step);
    }
  }

  // Cartes Abomination piochées alors qu'il y en avait déjà une sur le
  // plateau (p. 17) : chaque Abomination déjà présente rejoue une Activation
  // au lieu de faire apparaître une 2e Abomination.
  const pending = state.pendingExtraActivations || [];
  state.pendingExtraActivations = [];
  for (const type of pending) {
    for (const zombie of state.zombies.filter((z) => z.type === type)) {
      const step = activateOnce(zombie, state);
      if (step) steps.push(step);
    }
  }

  return steps;
}
