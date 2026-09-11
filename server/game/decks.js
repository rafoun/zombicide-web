// Cartes équipement, inspirées des cartes de base de Zombicide 2e édition.
// accuracy = valeur minimale sur un dé pour toucher (2+ minimum dans le vrai jeu).
// dice = nombre de dés lancés. damage = dégâts par touche (doit atteindre le
// seuil d'élimination du type de zombie visé, voir game/zombies.js).

// mode: "melee" ou "ranged" — détermine si l'Ordre de Priorité des cibles et
// le Tir Ami (règle du livret, p. 27-28) s'appliquent à cette arme.
export const EQUIPMENT_CARDS = [
  { id: "pistol", name: "Pistolet", type: "weapon", mode: "ranged", dice: 1, accuracy: 4, damage: 1,
    description: "Arme de poing fiable. Discrète mais peu puissante." },
  { id: "pistol_2", name: "Pistolet", type: "weapon", mode: "ranged", dice: 1, accuracy: 4, damage: 1,
    description: "Arme de poing fiable. Discrète mais peu puissante." },
  { id: "shotgun", name: "Fusil à pompe", type: "weapon", mode: "ranged", dice: 3, accuracy: 3, damage: 1,
    description: "Dévastateur à courte portée, touche plusieurs cibles proches." },
  { id: "sledgehammer", name: "Masse", type: "weapon", mode: "melee", dice: 1, accuracy: 4, damage: 3,
    description: "Lourde et lente, mais un seul coup peut suffire — même contre une Abomination." },
  { id: "katana", name: "Katana", type: "weapon", mode: "melee", dice: 3, accuracy: 2, damage: 1,
    description: "Lame silencieuse, rapide, idéale contre les hordes de Marcheurs." },
  { id: "fire_axe", name: "Hache de pompier", type: "weapon", mode: "melee", dice: 2, accuracy: 3, damage: 2,
    description: "Polyvalente : assez puissante pour tuer une Brute." },
  { id: "first_aid_kit", name: "Trousse de secours", type: "item", effect: "heal",
    description: "Soigne une blessure. À garder pour les coups durs." },
  { id: "crowbar", name: "Pied de biche", type: "item", effect: "open_door",
    description: "Force les portes bloquées sans faire de bruit inutile." },
];

export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createEquipmentDeck() {
  return shuffle(EQUIPMENT_CARDS.map((card) => ({ ...card })));
}

// Table de spawn simplifiée par niveau de danger (bleu/jaune/orange/rouge),
// inspirée des vraies cartes zombies qui font apparaître plus (et de plus
// dangereux) zombies au fil de la partie.
export const SPAWN_TABLE = {
  blue: [{ type: "walker", count: 1 }],
  yellow: [{ type: "walker", count: 2 }, { type: "runner", count: 1 }],
  orange: [{ type: "walker", count: 4 }, { type: "runner", count: 1 }, { type: "brute", count: 1 }],
  red: [
    { type: "walker", count: 6 },
    { type: "runner", count: 2 },
    { type: "brute", count: 2 },
    { type: "abomination", count: 1 },
  ],
};

// Seuils de Points d'Adrénaline pour passer au niveau de danger suivant
// (repris tels quels du livret de règles).
export const DANGER_THRESHOLDS = { blue: 0, yellow: 7, orange: 19, red: 43 };

export function dangerLevelForAdrenaline(adrenaline) {
  if (adrenaline >= DANGER_THRESHOLDS.red) return "red";
  if (adrenaline >= DANGER_THRESHOLDS.orange) return "orange";
  if (adrenaline >= DANGER_THRESHOLDS.yellow) return "yellow";
  return "blue";
}

export function maxActionsForAdrenaline(adrenaline) {
  // Le vrai jeu accorde une 4e Action au niveau Jaune (7 PA).
  return adrenaline >= DANGER_THRESHOLDS.yellow ? 4 : 3;
}
