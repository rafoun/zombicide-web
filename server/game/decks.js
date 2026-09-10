// Liste simplifiée des cartes équipement de base de Zombicide (édition originale).
// On pourra enrichir plus tard avec les effets précis (dégâts, portée, munitions...).

export const EQUIPMENT_CARDS = [
  { id: "pistol", name: "Pistolet", type: "weapon", range: "1", dice: 1, damage: 1 },
  { id: "pistol_2", name: "Pistolet", type: "weapon", range: "1", dice: 1, damage: 1 },
  { id: "shotgun", name: "Fusil à pompe", type: "weapon", range: "1-2", dice: 3, damage: 1 },
  { id: "sledgehammer", name: "Masse", type: "weapon", range: "0", dice: 1, damage: 3 },
  { id: "katana", name: "Katana", type: "weapon", range: "0", dice: 3, damage: 1 },
  { id: "fire_axe", name: "Hache de pompier", type: "weapon", range: "0", dice: 2, damage: 2 },
  { id: "molotov", name: "Cocktail Molotov", type: "weapon", range: "1-3", dice: 1, damage: 3 },
  { id: "first_aid_kit", name: "Trousse de secours", type: "item", effect: "heal" },
  { id: "crowbar", name: "Pied de biche", type: "item", effect: "open_door" },
  { id: "ammo", name: "Munitions", type: "item", effect: "reload" },
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
