// Cartes équipement, inspirées des cartes de base de Zombicide 2e édition.
// accuracy = valeur minimale sur un dé pour toucher (2+ minimum dans le vrai jeu).
// dice = nombre de dés lancés. damage = dégâts par touche (doit atteindre le
// seuil d'élimination du type de zombie visé, voir game/zombies.js).

// mode: "melee" ou "ranged" — détermine si l'Ordre de Priorité des cibles et
// le Tir Ami (règle du livret, p. 27-28) s'appliquent à cette arme.
export const EQUIPMENT_CARDS = [
  { id: "pistol", name: "Pistolet", type: "weapon", mode: "ranged", dice: 1, accuracy: 4, damage: 1, range: [0, 2],
    description: "Arme de poing fiable. Discrète mais peu puissante." },
  { id: "pistol_2", name: "Pistolet", type: "weapon", mode: "ranged", dice: 1, accuracy: 4, damage: 1, range: [0, 2],
    description: "Arme de poing fiable. Discrète mais peu puissante." },
  { id: "shotgun", name: "Fusil à pompe", type: "weapon", mode: "ranged", dice: 3, accuracy: 3, damage: 1, range: [0, 1],
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

// Paquet de cartes Zombies (p. 25 du livret) : à chaque Manche, on pioche
// UNE carte par Zone de Spawn active (pas toute une table d'un coup), et la
// carte indique combien de Zombies apparaissent selon le Niveau de Danger le
// plus haut parmi les Survivants. Exemple donné tel quel par le livret pour
// le Marcheur : Bleu 1 / Jaune 2 / Orange 4 / Rouge 6 Marcheurs (p. 25).
// Le contenu exact des 40 cartes physiques (Coureur/Brute/Abomination) n'est
// pas imprimé dans les règles (c'est sur les cartes elles-mêmes) : on
// reconstruit un paquet dans le même esprit et à peu près dans les mêmes
// proportions que les figurines fournies avec la boîte (40 Marcheurs,
// 16 Coureurs, 16 Brutes, 4 Abominations, p. 3).
export const ZOMBIE_CARD_COUNTS = {
  walker: { blue: 1, yellow: 2, orange: 4, red: 6 },
  runner: { blue: 0, yellow: 1, orange: 2, red: 3 },
  brute: { blue: 0, yellow: 0, orange: 1, red: 2 },
};

export function createZombieDeck() {
  const cards = [];
  for (let i = 0; i < 12; i++) cards.push({ type: "walker", counts: ZOMBIE_CARD_COUNTS.walker });
  for (let i = 0; i < 4; i++) cards.push({ type: "runner", counts: ZOMBIE_CARD_COUNTS.runner });
  for (let i = 0; i < 3; i++) cards.push({ type: "brute", counts: ZOMBIE_CARD_COUNTS.brute });
  // Carte Abomination : pas de table par Niveau de Danger (p. 17) — elle fait
  // toujours apparaître 1 Abomination, ou donne une Activation
  // supplémentaire à celle déjà présente s'il y en a déjà une sur le plateau.
  cards.push({ type: "abomination" });
  return shuffle(cards);
}

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
