import { canMove } from "./board.js";
import { shuffle } from "./decks.js";
import { spawnZombies, activateZombies } from "./zombies.js";

// Applique une action de jeu à l'état courant. Retourne { ok: true, state }
// ou { ok: false, error } sans jamais muter l'état en cas de refus.
export function applyAction(state, playerSocketId, action) {
  const currentPlayerId = state.turnOrder[state.currentTurnIndex];
  if (state.phase !== "player_turn") {
    return { ok: false, error: "Ce n'est pas le tour des joueurs." };
  }
  if (playerSocketId !== currentPlayerId) {
    return { ok: false, error: "Ce n'est pas ton tour." };
  }

  if (action.type === "move") {
    return handleMove(state, playerSocketId, action);
  }
  if (action.type === "end_turn") {
    return handleEndTurn(state);
  }
  if (action.type === "search") {
    return handleSearch(state, playerSocketId);
  }
  if (action.type === "attack") {
    return handleAttack(state, playerSocketId, action);
  }

  return { ok: false, error: `Action inconnue : ${action.type}` };
}

function handleMove(state, playerSocketId, action) {
  const character = state.characters.find((c) => c.playerId === playerSocketId);
  if (!character) return { ok: false, error: "Personnage introuvable." };
  if (character.actionsLeft <= 0) return { ok: false, error: "Plus d'actions ce tour-ci." };

  const target = { x: action.x, y: action.y };
  if (!canMove(state.board, character.position, target)) {
    return { ok: false, error: "Déplacement invalide (mur ou case non adjacente)." };
  }

  const occupied = state.characters.some(
    (c) => c.position.x === target.x && c.position.y === target.y
  );
  if (occupied) return { ok: false, error: "Case déjà occupée par un autre personnage." };

  character.position = target;
  character.actionsLeft -= 1;

  return { ok: true, state };
}

function handleSearch(state, playerSocketId) {
  const character = state.characters.find((c) => c.playerId === playerSocketId);
  if (!character) return { ok: false, error: "Personnage introuvable." };
  if (character.actionsLeft <= 0) return { ok: false, error: "Plus d'actions ce tour-ci." };

  // TODO: restreindre la fouille aux zones "bâtiment" une fois les tuiles enrichies.
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

function handleAttack(state, playerSocketId, action) {
  const character = state.characters.find((c) => c.playerId === playerSocketId);
  if (!character) return { ok: false, error: "Personnage introuvable." };
  if (character.actionsLeft <= 0) return { ok: false, error: "Plus d'actions ce tour-ci." };

  const zombie = state.zombies.find((z) => z.id === action.zombieId);
  if (!zombie) return { ok: false, error: "Ce zombie n'est plus là." };

  const dist = Math.abs(character.position.x - zombie.position.x) + Math.abs(character.position.y - zombie.position.y);
  if (dist > 1) return { ok: false, error: "Ce zombie n'est pas à portée de mêlée." };

  // Combat simplifié : un dé par point de dégât de l'arme (1 à mains nues),
  // chaque dé >= 4 est une touche. Une seule touche suffit à abattre un
  // zombie de base (à enrichir plus tard avec la santé des types de zombies).
  const weapon = character.equipment.find((e) => e.type === "weapon");
  const diceCount = weapon ? weapon.dice : 1;

  let hits = 0;
  for (let i = 0; i < diceCount; i++) {
    if (Math.floor(Math.random() * 6) + 1 >= 4) hits += 1;
  }

  character.actionsLeft -= 1;

  const events = [];
  if (hits > 0) {
    state.zombies = state.zombies.filter((z) => z.id !== zombie.id);
    character.zombieKills += 1;
    events.push(`${character.name} a abattu un zombie !`);
  } else {
    events.push(`${character.name} a raté son attaque.`);
  }

  return { ok: true, state, events };
}

function handleEndTurn(state) {
  const character = state.characters[state.currentTurnIndex];
  character.actionsLeft = 0;

  const isLastPlayer = state.currentTurnIndex === state.turnOrder.length - 1;
  if (!isLastPlayer) {
    state.currentTurnIndex += 1;
    state.characters[state.currentTurnIndex].actionsLeft = 3;
    return { ok: true, state };
  }

  // Dernier joueur du tour : on joue la phase zombie (apparition + activation)
  // puis on repart directement sur une nouvelle manche de joueurs.
  state.phase = "zombie_turn";
  spawnZombies(state);
  const events = activateZombies(state);
  state.phase = "player_turn";
  state.round += 1;
  state.currentTurnIndex = 0;
  state.characters[0].actionsLeft = 3;

  return { ok: true, state, events };
}
