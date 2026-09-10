import { createStarterBoard, startingPositions } from "./board.js";

export function createInitialGameState(players) {
  const board = createStarterBoard();
  const positions = startingPositions(players.length);

  return {
    round: 1,
    phase: "player_turn", // "player_turn" | "zombie_turn" (le tour zombie viendra plus tard)
    board,
    turnOrder: players.map((p) => p.socketId),
    currentTurnIndex: 0,
    characters: players.map((p, i) => ({
      playerId: p.socketId,
      name: p.name,
      characterId: p.characterId,
      position: positions[i],
      woundLevel: "blue", // couleurs Zombicide : blue -> yellow -> orange -> red -> dead
      skills: [],
      equipment: [],
      actionsLeft: 3,
    })),
    zombies: [], // { id, type: "walker"|"runner"|"fatty"|"abomination", position, ... }
    decks: {
      zombieDeck: [], // pioche zombie par niveau de danger (blue/yellow/orange/red)
      equipmentDeck: [],
      discardZombie: [],
      discardEquipment: [],
    },
    dangerLevel: "blue",
    objective: null, // condition de victoire du scénario choisi
  };
}
