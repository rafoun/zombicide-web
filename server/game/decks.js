// Liste simplifiée des cartes équipement de base de Zombicide (édition originale).
// On pourra enrichir plus tard avec les effets précis (dégâts, portée, munitions...).

export const EQUIPMENT_CARDS = [
  { id: "pistol", name: "Pistolet", type: "weapon", range: "1", dice: 1, damage: 1, description: "Arme de poing fiable. Discrète mais peu puissante." },
  { id: "pistol_2", name: "Pistolet", type: "weapon", range: "1", dice: 1, damage: 1, description: "Arme de poing fiable. Discrète mais peu puissante." },
  { id: "shotgun", name: "Fusil à pompe", type: "weapon", range: "1-2", dice: 3, damage: 1, description: "Dévastateur à courte portée, touche plusieurs cibles proches." },
  { id: "sledgehammer", name: "Masse", type: "weapon", range: "0", dice: 1, damage: 3, description: "Lourde et lente, mais un seul coup peut suffire." },
  { id: "katana", name: "Katana", type: "weapon", range: "0", dice: 3, damage: 1, description: "Lame silencieuse, rapide, idéale contre les hordes." },
  { id: "fire_axe", name: "Hache de pompier", type: "weapon", range: "0", dice: 2, damage: 2, description: "Polyvalente : dégâts solides en mêlée." },
  { id: "molotov", name: "Cocktail Molotov", type: "weapon", range: "1-3", dice: 1, damage: 3, description: "Enflamme une zone entière. À utiliser avec prudence." },
  { id: "first_aid_kit", name: "Trousse de secours", type: "item", effect: "heal", description: "Soigne une blessure. À garder pour les coups durs." },
  { id: "crowbar", name: "Pied de biche", type: "item", effect: "open_door", description: "Force les portes bloquées sans faire de bruit inutile." },
  { id: "ammo", name: "Munitions", type: "item", effect: "reload", description: "Recharge une arme à feu à sec." },
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
