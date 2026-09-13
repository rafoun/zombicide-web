import { startingPositions } from "./board.js";
import { createEquipmentDeck, createZombieDeck, maxActionsForAdrenaline, EQUIPMENT_CARDS } from "./decks.js";
import { getScenario } from "./scenarios.js";
import { CHARACTERS, CHARACTERS_BY_ID } from "./characters.js";

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
    characters: players.map((p, i) => {
      // Personnage choisi en salon ; à défaut (jamais censé arriver), on
      // distribue les 6 Survivants à tour de rôle.
      const characterId = p.characterId && CHARACTERS_BY_ID[p.characterId]
        ? p.characterId
        : CHARACTERS[i % CHARACTERS.length].id;
      const def = CHARACTERS_BY_ID[characterId];

      // Traits de départ ("Starts with...") définis par la Compétence Bleue
      // du Survivant (livret p. 66) : appliqués une fois, à la création.
      const equipment = [];
      if (def.skills.blue.id === "starts_crowbar") {
        equipment.push({ ...EQUIPMENT_CARDS.find((c) => c.id === "crowbar") });
      }
      const startingAdrenaline = def.skills.blue.id === "starts_2ap" ? 2 : 0;

      return {
        playerId: p.socketId,
        name: def.name,
        playerName: p.name, // nom du joueur humain (affiché en petit, ex. dans le salon)
        characterId,
        skillTree: def.skills, // {blue,yellow,orange,red} — pour l'affichage côté client
        position: positions[i],
        wounds: 0, // 0,1,2 -> blessé ; 3 -> mort (règle classique du jeu)
        dead: false,
        adrenaline: startingAdrenaline, // Points d'Adrénaline (PA) -> niveau de danger personnel
        equipment,
        actionsLeft: maxActionsForAdrenaline(startingAdrenaline),
        searchedThisTurn: false, // une seule Fouille par tour, même gratuite (livret p. 19)
        improvisedUsedThisTurn: false, // Compétence Improvised weapon: Melee (Chloé)
        toughUsedThisPhase: false, // Compétence Tough (Marco)
        escalationStreak: 0, // Compétence Escalation: Melee (Diego)
        zombieKills: 0,
        objectives: 0,
      };
    }),
    zombies: [], // { id, type, position }
    decks: {
      equipmentDeck: createEquipmentDeck(),
      discardEquipment: [],
      zombieDeck: createZombieDeck(),
      zombieDiscard: [],
    },
  };
}
