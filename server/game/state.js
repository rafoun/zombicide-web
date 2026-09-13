import { startingPositions } from "./board.js";
import { createEquipmentDeck, createZombieDeck, maxActionsForAdrenaline } from "./decks.js";
import { getScenario } from "./scenarios.js";

export function createInitialGameState(players, scenarioId) {
  const scenario = getScenario(scenarioId);
  const board = scenario.boardFactory();
  const positions = startingPositions(board, players.length);

  return {
    round: 1,
    phase: "player_turn",
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    scenarioObjective: scenario.objective,
    gameOver: null,
    totalObjectives: board.cells.filter((c) => c.objective).length,
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
      searchedThisTurn: false, // une seule Fouille par tour, même gratuite (livret p. 19)
      zombieKills: 0,
      objectives: 0,
    })),
    zombies: [], // { id, type, position }
    decks: {
      equipmentDeck: createEquipmentDeck(),
      discardEquipment: [],
      zombieDeck: createZombieDeck(),
      zombieDiscard: [],
    },
  };
}
