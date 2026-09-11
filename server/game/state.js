import { createStarterBoard, startingPositions } from "./board.js";
import { createEquipmentDeck, maxActionsForAdrenaline } from "./decks.js";

export function createInitialGameState(players) {
  const board = createStarterBoard();
  const positions = startingPositions(board, players.length);

  return {
    round: 1,
    phase: "player_turn",
    board,
    turnOrder: players.map((p) => p.socketId),
    currentTurnIndex: 0,
    characters: players.map((p, i) => ({
      playerId: p.socketId,
      name: p.name,
      position: positions[i],
      wounds: 0, // 0,1,2 -> blessé ; 3 -> mort (règle classique du jeu)
      dead: false,
      adrenaline: 0, // Points d'Adrénaline (PA) -> niveau de danger personnel
      equipment: [],
      actionsLeft: maxActionsForAdrenaline(0),
      zombieKills: 0,
    })),
    zombies: [], // { id, type, position }
    decks: {
      equipmentDeck: createEquipmentDeck(),
      discardEquipment: [],
    },
  };
}
