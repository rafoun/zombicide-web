import { canMove } from "./board.js";
import { shuffle, maxActionsForAdrenaline } from "./decks.js";
import { spawnZombies, activateZombies, ZOMBIE_TYPES } from "./zombies.js";

export function applyAction(state, playerSocketId, action) {
  const currentPlayerId = state.turnOrder[state.currentTurnIndex];
  if (state.phase !== "player_turn") return { ok: false, error: "Ce n'est pas le tour des joueurs." };
  if (playerSocketId !== currentPlayerId) return { ok: false, error: "Ce n'est pas ton tour." };

  if (action.type === "move") return handleMove(state, playerSocketId, action);
  if (action.type === "end_turn") return handleEndTurn(state);
  if (action.type === "search") return handleSearch(state, playerSocketId);
  if (action.type === "attack") return handleAttack(state, playerSocketId);

  return { ok: false, error: `Action inconnue : ${action.type}` };
}

function getCharacter(state, playerSocketId) {
  return state.characters.find((c) => c.playerId === playerSocketId);
}

function handleMove(state, playerSocketId, action) {
  const character = getCharacter(state, playerSocketId);
  if (!character || character.dead) return { ok: false, error: "Personnage indisponible." };
  if (character.actionsLeft <= 0) return { ok: false, error: "Plus d'actions ce tour-ci." };

  const target = { x: action.x, y: action.y };
  if (!canMove(state.board, character.position, target)) {
    return { ok: false, error: "Déplacement invalide (mur ou case non adjacente)." };
  }

  character.position = target;
  character.actionsLeft -= 1;
  return { ok: true, state };
}

function handleSearch(state, playerSocketId) {
  const character = getCharacter(state, playerSocketId);
  if (!character || character.dead) return { ok: false, error: "Personnage indisponible." };
  if (character.actionsLeft <= 0) return { ok: false, error: "Plus d'actions ce tour-ci." };

  // TODO: restreindre aux zones "bâtiment" une fois les tuiles enrichies (règle officielle).
  if (state.decks.equipmentDeck.length === 0) {
    if (state.decks.discardEquipment.length === 0) {
      return { ok: false, error: "Plus aucune carte équipement disponible." };
    }
    state.decks.equipmentDeck = shuffle(state.decks.discardEquipment);
    state.decks.discardEquipment = [];
  }

  const card = state.decks.equipmentDeck.pop();
  character.equipment.push(card);
  character.actionsLeft -= 1;
  return { ok: true, state };
}

// Ordre de priorité des cibles, comme dans le vrai jeu :
// 1) Brute/Abomination  2) Marcheur  3) Coureur
const TARGETING_PRIORITY = ["brute", "abomination", "walker", "runner"];

function handleAttack(state, playerSocketId) {
  const character = getCharacter(state, playerSocketId);
  if (!character || character.dead) return { ok: false, error: "Personnage indisponible." };
  if (character.actionsLeft <= 0) return { ok: false, error: "Plus d'actions ce tour-ci." };

  const zombiesHere = state.zombies.filter(
    (z) => z.position.x === character.position.x && z.position.y === character.position.y
  );
  if (zombiesHere.length === 0) return { ok: false, error: "Aucun zombie dans ta zone." };

  const weapon = character.equipment.find((e) => e.type === "weapon");
  const dice = weapon ? weapon.dice : 1;
  const accuracy = weapon ? weapon.accuracy : 4;
  const damage = weapon ? weapon.damage : 1;

  let hits = 0;
  for (let i = 0; i < dice; i++) {
    if (Math.floor(Math.random() * 6) + 1 >= accuracy) hits += 1;
  }

  character.actionsLeft -= 1;
  const events = [];

  if (hits === 0) {
    events.push(`${character.name} a raté son attaque.`);
    return { ok: true, state, events };
  }

  let remainingHits = hits;
  const killedIds = [];
  for (const zombieType of TARGETING_PRIORITY) {
    if (remainingHits <= 0) break;
    const stats = ZOMBIE_TYPES[zombieType];
    if (damage < stats.killDamage) continue; // arme trop faible pour ce type

    const targets = zombiesHere.filter((z) => z.type === zombieType && !killedIds.includes(z.id));
    for (const target of targets) {
      if (remainingHits <= 0) break;
      killedIds.push(target.id);
      remainingHits -= 1;
      character.adrenaline += stats.adrenaline;
      character.zombieKills += 1;
    }
  }

  if (killedIds.length > 0) {
    state.zombies = state.zombies.filter((z) => !killedIds.includes(z.id));
    events.push(`${character.name} élimine ${killedIds.length} zombie(s) !`);
  } else {
    events.push(`${character.name} touche mais son arme est trop faible pour ces zombies.`);
  }

  return { ok: true, state, events };
}

function handleEndTurn(state) {
  const character = state.characters[state.currentTurnIndex];
  character.actionsLeft = 0;

  const isLastPlayer = state.currentTurnIndex === state.turnOrder.length - 1;
  if (!isLastPlayer) {
    state.currentTurnIndex += 1;
    const next = state.characters[state.currentTurnIndex];
    next.actionsLeft = maxActionsForAdrenaline(next.adrenaline);
    return { ok: true, state };
  }

  // Dernier joueur : phase zombie (spawn + activation), puis nouvelle manche.
  state.phase = "zombie_turn";
  spawnZombies(state);
  const events = activateZombies(state);
  state.phase = "player_turn";
  state.round += 1;
  state.currentTurnIndex = 0;
  const first = state.characters[0];
  if (!first.dead) first.actionsLeft = maxActionsForAdrenaline(first.adrenaline);

  return { ok: true, state, events };
}
