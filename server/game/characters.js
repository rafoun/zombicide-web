// 6 Survivants jouables, avec de vraies Compétences du catalogue officiel
// (livret p. 63-66) assignées par palier de Niveau de Danger (Bleu/Jaune/
// Orange/Rouge, comme les vraies fiches Survivant). Les noms des Survivants
// et l'association précise Survivant <-> Compétence sont un choix de notre
// cru : le livret ne détaille que le catalogue générique des Compétences,
// pas la fiche de chaque Survivant nommé (ça, c'est sur les cartes
// physiques de la boîte).

import { dangerLevelForAdrenaline } from "./decks.js";

export const CHARACTERS = [
  {
    id: "marco",
    name: "Marco",
    tagline: "Le costaud",
    skills: {
      blue: { id: "super_strength", name: "Super strength", description: "Ses armes de mêlée infligent toujours 3 Dégâts." },
      yellow: { id: "tough", name: "Tough", description: "Ignore la 1ère blessure infligée par les zombies à chaque manche." },
      orange: { id: "reaper_melee", name: "Reaper: Melee", description: "En mêlée, 1 touche élimine gratuitement un zombie identique de plus dans la zone." },
      red: { id: "regeneration", name: "Regeneration", description: "Toutes ses blessures sont soignées à la fin de chaque manche." },
    },
  },
  {
    id: "sofia",
    name: "Sofia",
    tagline: "La tireuse d'élite",
    skills: {
      blue: { id: "steady_hand", name: "Steady hand", description: "Personne ne peut être touché par son propre Tir Ami." },
      yellow: { id: "sniper", name: "Sniper", description: "Choisit librement ses cibles à distance ; jamais de Tir Ami." },
      orange: { id: "roll6_plus_die_ranged", name: "Roll 6: +1 die (Ranged)", description: "Chaque 6 obtenu à distance ajoute un dé supplémentaire." },
      red: { id: "reaper_ranged", name: "Reaper: Ranged", description: "À distance, 1 touche élimine gratuitement un zombie identique de plus dans la zone." },
    },
  },
  {
    id: "tania",
    name: "Tania",
    tagline: "L'éclaireuse",
    skills: {
      blue: { id: "scavenger", name: "Scavenger", description: "Peut Fouiller en rue comme en bâtiment." },
      yellow: { id: "search_2_cards", name: "Search: 2 cards", description: "Pioche 2 cartes équipement à chaque Fouille." },
      orange: { id: "jump", name: "Jump", description: "1 Action : se déplace de 2 zones d'un coup (ignore les zombies sur le chemin, pas les murs/portes)." },
      red: { id: "hold_your_nose", name: "Hold your nose", description: "Pioche une carte équipement chaque fois qu'elle élimine le dernier zombie d'une zone." },
    },
  },
  {
    id: "ben",
    name: "Ben",
    tagline: "Le soutien",
    skills: {
      blue: { id: "low_profile", name: "Low profile", description: "Jamais touché par le Tir Ami." },
      yellow: { id: "medic", name: "Medic", description: "À la fin de chaque manche, lui et les Survivants de sa zone soignent 1 blessure chacun (+1 PA par blessure soignée)." },
      orange: { id: "break_in", name: "Break-in", description: "Force n'importe quelle porte verrouillée sans Pied de biche." },
      red: { id: "lucky", name: "Lucky", description: "Relance automatiquement tous ses dés si son attaque n'a fait aucune touche." },
    },
  },
  {
    id: "diego",
    name: "Diego",
    tagline: "Le vétéran",
    skills: {
      blue: { id: "starts_2ap", name: "Starts with 2 AP", description: "Commence la partie avec 2 Points d'Adrénaline." },
      yellow: { id: "escalation_melee", name: "Escalation: Melee", description: "Chaque Attaque de mêlée consécutive ajoute 1 dé de plus (perdu en changeant de type d'Action)." },
      orange: { id: "dreadnought_walker", name: "Dreadnought: Walker", description: "Ignore les blessures infligées par les Marcheurs." },
      red: { id: "full_auto", name: "Full auto", description: "À distance, son nombre de dés devient le nombre de zombies dans la zone visée." },
    },
  },
  {
    id: "chloe",
    name: "Chloé",
    tagline: "La cheffe d'équipe",
    skills: {
      blue: { id: "starts_crowbar", name: "Starts with a Crowbar", description: "Commence la partie avec un Pied de biche dans son inventaire." },
      yellow: { id: "search_more_than_once", name: "Can Search more than once", description: "Peut Fouiller plusieurs fois par tour (1 Action à chaque fois)." },
      orange: { id: "improvised_melee", name: "Improvised weapon: Melee", description: "1 fois par tour, Attaque de mêlée gratuite (Dés 1, Précision 4+, Dégâts 1)." },
      red: { id: "regeneration_chloe", name: "Regeneration", description: "Toutes ses blessures sont soignées à la fin de chaque manche." },
    },
  },
];

export const CHARACTERS_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

const TIER_ORDER = ["blue", "yellow", "orange", "red"];

// Compétences actives d'un Survivant : cumulatives, selon son Niveau de
// Danger actuel (comme les vraies fiches — on ne "remplace" jamais une
// Compétence acquise, on en gagne une nouvelle en plus).
export function activeSkillIds(character) {
  const def = CHARACTERS_BY_ID[character.characterId];
  if (!def) return [];
  const level = dangerLevelForAdrenaline(character.adrenaline);
  const idx = TIER_ORDER.indexOf(level);
  return TIER_ORDER.slice(0, idx + 1).map((tier) => def.skills[tier].id);
}

export function hasSkill(character, skillId) {
  return activeSkillIds(character).includes(skillId);
}
