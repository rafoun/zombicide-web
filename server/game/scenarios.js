// Scénarios jouables, inspirés de vraies missions du livret (p. 35 et
// suivantes) mais adaptés à ce qu'on sait faire pour l'instant (pas de
// voitures, pas d'Armes Épiques séparées, pas de cartes Nourriture).

import { createBoardCrossroads, createBoardMall, createBoardHighway, createBoardM0, createBoardM7, createBoardM4, createBoardM6 } from "./board.js";
import { dangerLevelForAdrenaline } from "./decks.js";

export const SCENARIOS = [
  {
    id: "crossroads",
    name: "Le carrefour",
    difficulty: "Facile",
    time: "30 min",
    flavor:
      "Un simple carrefour, quatre bâtiments à fouiller. Récupérez ce qu'il y a " +
      "à prendre et filez avant que ça ne dégénère. Inspiré de la mission " +
      "d'initiation « Zombicide Life » (M0).",
    boardFactory: createBoardCrossroads,
    objective: "collect_and_exit",
    specialRules: [
      "Récupérez les 3 Objectifs dispersés dans les bâtiments (chacun donne 5 PA).",
      "Puis amenez tous les Survivants vivants sur une case Sortie.",
      "Une des portes est verrouillée : il existe toujours un autre chemin.",
    ],
  },
  {
    id: "mall",
    name: "Panique au centre commercial",
    difficulty: "Difficile",
    time: "60 min",
    flavor:
      "Le centre commercial est infesté, mais c'est aussi le meilleur arsenal " +
      "du coin. Armez toute l'équipe avant de foncer vers la sortie. Inspiré " +
      "de la mission « Big W » (M5).",
    boardFactory: createBoardMall,
    objective: "arm_and_exit",
    specialRules: [
      "Toutes les portes du magasin sont ouvertes (pas de clé nécessaire).",
      "Chaque Survivant vivant doit avoir une arme en main.",
      "Puis amenez tous les Survivants vivants sur une case Sortie.",
    ],
  },
  {
    id: "highway",
    name: "La nuit la plus longue",
    difficulty: "Moyen",
    time: "45 min",
    flavor:
      "Pas d'objectif à récupérer cette fois : juste tenir la position sur " +
      "cette avenue à découvert, en encaissant vague après vague. Inspiré de " +
      "l'esprit survie de « The 24hrs Race of Zombicity » (M3).",
    boardFactory: createBoardHighway,
    objective: "reach_danger_level",
    objectiveGoal: { dangerLevel: "red" },
    specialRules: [
      "Pas de Sortie obligatoire : la partie se gagne sur place.",
      "Amenez au moins un Survivant au Niveau de Danger Rouge (43 PA) pour gagner.",
      "Beaucoup de zones de spawn sur les deux bords de l'avenue : ça va chauffer.",
    ],
  },
  {
    id: "m0",
    name: "M0 — Zombicide Life (Tutoriel)",
    difficulty: "Facile",
    time: "30 min",
    flavor:
      "La vraie mission d'initiation du livret (p. 36) : une petite maison à " +
      "deux pièces et un entrepôt de l'autre côté de la rue. De quoi apprendre " +
      "les bases avant de foncer vers la Sortie.",
    boardFactory: createBoardM0,
    objective: "collect_and_exit",
    specialRules: [
      "Pas d'Objectif à récupérer ici : filez simplement vers la Sortie une fois prêts.",
      "Plateau reconstitué à partir des tuiles 1V et 3V du livret.",
    ],
  },
  {
    id: "m7",
    name: "M7 — Grindhouse",
    difficulty: "Difficile",
    time: "45 min",
    flavor:
      "Un pâté de maisons en croix (tuiles 6V, 4V, 3V, 8V) où il faut " +
      "récupérer les 4 Objectifs avant d'atteindre la Sortie centrale.",
    boardFactory: createBoardM7,
    objective: "collect_and_exit",
    specialRules: [
      "Récupérez les 4 Objectifs (un par bâtiment), puis rejoignez la Sortie.",
      "Version adaptée : la règle originale des zones de bruit permanent (perte de partie) n'est pas implémentée.",
    ],
  },
  {
    id: "m4",
    name: "M4 — Drive-by Shooting",
    difficulty: "Moyen",
    time: "90 min",
    flavor:
      "Trois bâtiments à sécuriser le long d'un grand axe commerçant (tuiles " +
      "5R, 7R, 6V, 8V), avant de filer par le côté opposé au point de départ.",
    boardFactory: createBoardM4,
    objective: "collect_and_exit",
    specialRules: [
      "Récupérez les 3 Objectifs, puis rejoignez la Sortie.",
      "Version adaptée : pas de voitures ni d'Armes Épiques séparées dans ce moteur de jeu.",
    ],
  },
  {
    id: "m6",
    name: "M6 — The Escape",
    difficulty: "Difficile",
    time: "90 min",
    flavor:
      "Un supermarché tentaculaire (tuiles 5R, 9R, 6V, 8V) à piller des deux " +
      "côtés d'une large avenue, avant de remonter vers la Sortie au nord.",
    boardFactory: createBoardM6,
    objective: "collect_and_exit",
    specialRules: [
      "Récupérez les 3 Objectifs, puis rejoignez la Sortie.",
      "Version adaptée : pas de voitures ni de cartes Nourriture dans ce moteur de jeu.",
    ],
  },
];

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
}

export function scenarioSummaries() {
  return SCENARIOS.map(({ id, name, difficulty, time, flavor, specialRules }) => ({
    id, name, difficulty, time, flavor, specialRules,
  }));
}

// Compte les Objectifs encore présents sur le plateau (donc pas déjà pris).
function objectivesRemaining(board) {
  return board.cells.filter((c) => c.objective).length;
}

const DANGER_ORDER = ["blue", "yellow", "orange", "red"];

// Vérifie l'état de la partie après chaque action ou phase zombie. Renvoie
// { result: "won"|"lost", reason } ou null si la partie continue.
export function checkGameEnd(state) {
  const alive = state.characters.filter((c) => !c.dead);
  if (alive.length === 0) {
    return { result: "lost", reason: "Tous les Survivants sont morts." };
  }

  const scenario = getScenario(state.scenarioId);
  const totalObjectives = state.totalObjectives ?? 0;
  const allOnExit = alive.every((c) => {
    const cell = state.board.cells.find((cell) => cell.x === c.position.x && cell.y === c.position.y);
    return cell?.isExit;
  });

  if (scenario.objective === "collect_and_exit") {
    const remaining = objectivesRemaining(state.board);
    if (remaining === 0 && allOnExit) {
      return { result: "won", reason: "Tous les Objectifs récupérés, équipe exfiltrée !" };
    }
    return null;
  }

  if (scenario.objective === "arm_and_exit") {
    const allArmed = alive.every((c) => c.equipment.some((e) => e.type === "weapon"));
    if (allArmed && allOnExit) {
      return { result: "won", reason: "Toute l'équipe est armée et a atteint la Sortie !" };
    }
    return null;
  }

  if (scenario.objective === "reach_danger_level") {
    const goal = scenario.objectiveGoal?.dangerLevel || "red";
    const reached = alive.some(
      (c) => DANGER_ORDER.indexOf(dangerLevelForAdrenaline(c.adrenaline)) >= DANGER_ORDER.indexOf(goal)
    );
    if (reached) {
      return { result: "won", reason: "Un Survivant a atteint le Niveau de Danger Rouge !" };
    }
    return null;
  }

  return null;
}
