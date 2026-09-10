import { canMove } from "./board.js";

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

function handleEndTurn(state) {
  const character = state.characters[state.currentTurnIndex];
  character.actionsLeft = 0;

  const isLastPlayer = state.currentTurnIndex === state.turnOrder.length - 1;
  if (isLastPlayer) {
    // TODO: déclencher le tour des zombies ici une fois l'IA écrite.
    state.currentTurnIndex = 0;
    state.round += 1;
  } else {
    state.currentTurnIndex += 1;
  }

  const nextCharacter = state.characters[state.currentTurnIndex];
  nextCharacter.actionsLeft = 3;

  return { ok: true, state };
}
