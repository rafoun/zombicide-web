import { canMove, getDoorBetween, straightLineTargets } from "./board.js";
import { shuffle, maxActionsForAdrenaline } from "./decks.js";
import { spawnZombies, activateZombies, ZOMBIE_TYPES } from "./zombies.js";
import { checkGameEnd } from "./scenarios.js";

export function applyAction(state, playerSocketId, action) {
  if (state.phase === "game_over") return { ok: false, error: "La partie est terminée." };

  const currentPlayerId = state.turnOrder[state.currentTurnIndex];
  if (state.phase !== "player_turn") return { ok: false, error: "Ce n'est pas le tour des joueurs." };
  if (playerSocketId !== currentPlayerId) return { ok: false, error: "Ce n'est pas ton tour." };

  let result;
  if (action.type === "move") result = handleMove(state, playerSocketId, action);
  else if (action.type === "end_turn") result = handleEndTurn(state);
  else if (action.type === "search") result = handleSearch(state, playerSocketId);
  else if (action.type === "attack") result = handleAttack(state, playerSocketId, action);
  else if (action.type === "force_door") result = handleForceDoor(state, playerSocketId, action);
  else if (action.type === "use_item") result = handleUseItem(state, playerSocketId, action);
  else return { ok: false, error: `Action inconnue : ${action.type}` };

  if (result.ok) {
    const outcome = checkGameEnd(state);
    if (outcome) {
      state.phase = "game_over";
      state.gameOver = outcome;
      result.events = [...(result.events || []), outcome.reason];
    }
  }

  return result;
}

function getCharacter(state, playerSocketId) {
  return state.characters.find((c) => c.playerId === playerSocketId);
}

function handleMove(state, playerSocketId, action) {
  const character = getCharacter(state, playerSocketId);
  if (!character || character.dead) return { ok: false, error: "Personnage indisponible." };
  if (character.actionsLeft <= 0) return { ok: false, error: "Plus d'actions ce tour-ci." };

  const target = { x: action.x, y: action.y };
  if (!canMove(state.board, character.position, target)) {
    return { ok: false, error: "Déplacement invalide (mur ou case non adjacente)." };
  }

  character.position = target;
  character.actionsLeft -= 1;

  const events = [];
  const cell = state.board.cells.find((c) => c.x === target.x && c.y === target.y);
  if (cell?.objective) {
    character.adrenaline += 5;
    character.objectives = (character.objectives || 0) + 1;
    events.push(`${character.name} récupère un Objectif (+5 PA).`);
    cell.objective = null;
  }

  return { ok: true, state, events };
}

function handleSearch(state, playerSocketId) {
  const character = getCharacter(state, playerSocketId);
  if (!character || character.dead) return { ok: false, error: "Personnage indisponible." };
  if (character.actionsLeft <= 0) return { ok: false, error: "Plus d'actions ce tour-ci." };

  // TODO: restreindre aux zones "bâtiment" une fois les tuiles enrichies (règle officielle).
  if (state.decks.equipmentDeck.length === 0) {
    if (state.decks.discardEquipment.length === 0) {
      return { ok: false, error: "Plus aucune carte équipement disponible." };
    }
    state.decks.equipmentDeck = shuffle(state.decks.discardEquipment);
    state.decks.discardEquipment = [];
  }

  const card = state.decks.equipmentDeck.pop();
  character.equipment.push(card);
  character.actionsLeft -= 1;
  return { ok: true, state };
}

// Le Survivor force une porte verrouillée avec son Pied de biche (livret
// p. 19 : "No roll is required"). L'Action ne fait qu'ouvrir la porte, il
// faut ensuite une Action de Déplacement séparée pour la franchir.
function handleForceDoor(state, playerSocketId, action) {
  const character = getCharacter(state, playerSocketId);
  if (!character || character.dead) return { ok: false, error: "Personnage indisponible." };
  if (character.actionsLeft <= 0) return { ok: false, error: "Plus d'actions ce tour-ci." };

  const target = { x: action.x, y: action.y };
  const door = getDoorBetween(state.board, character.position, target);
  if (!door) return { ok: false, error: "Pas de porte ici." };
  if (!door.locked) return { ok: false, error: "Cette porte n'est pas verrouillée." };

  const hasCrowbar = character.equipment.some((e) => e.effect === "open_door");
  if (!hasCrowbar) return { ok: false, error: "Il te faut un Pied de biche pour forcer une porte verrouillée." };

  door.locked = false;
  character.actionsLeft -= 1;
  return { ok: true, state, events: [`${character.name} force une porte verrouillée avec son Pied de biche.`] };
}

// Utilisation d'un objet non-arme de l'inventaire (pour l'instant, seule la
// Trousse de secours a un effet : soigne 1 blessure, à usage unique).
function handleUseItem(state, playerSocketId, action) {
  const character = getCharacter(state, playerSocketId);
  if (!character || character.dead) return { ok: false, error: "Personnage indisponible." };
  if (character.actionsLeft <= 0) return { ok: false, error: "Plus d'actions ce tour-ci." };

  const itemIndex = character.equipment.findIndex((e) => e.id === action.itemId);
  if (itemIndex === -1) return { ok: false, error: "Cet objet n'est pas dans ton inventaire." };
  const item = character.equipment[itemIndex];

  if (item.effect === "heal") {
    if (character.wounds <= 0) return { ok: false, error: "Aucune blessure à soigner." };
    character.wounds -= 1;
    character.equipment.splice(itemIndex, 1); // à usage unique, consommée
    character.actionsLeft -= 1;
    return { ok: true, state, events: [`${character.name} utilise une Trousse de secours (-1 blessure).`] };
  }

  return { ok: false, error: "Cet objet ne peut pas être utilisé directement." };
}

// Ordre de priorité des cibles (règle du Tir à distance uniquement, p. 27) :
// 1) Brute/Abomination  2) Marcheur  3) Coureur
const TARGETING_PRIORITY = ["brute", "abomination", "walker", "runner"];

// Répartit `hitCount` touches parmi les zombies présents en tuant en priorité
// les types que l'arme peut effectivement achever. Utilisé aussi bien pour la
// mêlée (le joueur choisit librement -> on maximise le nombre de kills) que
// pour le tir à distance (l'Ordre de Priorité est imposé par la règle).
function assignHits(zombiesHere, damage, hitCount, order) {
  let remainingHits = hitCount;
  const killedIds = [];
  for (const zombieType of order) {
    if (remainingHits <= 0) break;
    const stats = ZOMBIE_TYPES[zombieType];
    if (damage < stats.killDamage) continue; // arme trop faible pour ce type

    const targets = zombiesHere.filter((z) => z.type === zombieType && !killedIds.includes(z.id));
    for (const target of targets) {
      if (remainingHits <= 0) break;
      killedIds.push(target.id);
      remainingHits -= 1;
    }
  }
  return killedIds;
}

function woundCharacter(character, amount, events, reason) {
  character.wounds += amount;
  if (character.wounds >= 3 && !character.dead) {
    character.dead = true;
    events.push(`${character.name} est mort (${reason}).`);
  } else {
    events.push(`${character.name} est blessé par ${reason} (${character.wounds}/3 blessures).`);
  }
}

function handleAttack(state, playerSocketId, action) {
  const character = getCharacter(state, playerSocketId);
  if (!character || character.dead) return { ok: false, error: "Personnage indisponible." };
  if (character.actionsLeft <= 0) return { ok: false, error: "Plus d'actions ce tour-ci." };

  // Le joueur choisit son arme s'il en a plusieurs (action.weaponId). Sans
  // précision, ou si le Survivant n'a aucune arme, il attaque à mains nues.
  const weapons = character.equipment.filter((e) => e.type === "weapon");
  let weapon = null;
  if (action.weaponId) {
    weapon = weapons.find((w) => w.id === action.weaponId);
    if (!weapon) return { ok: false, error: "Cette arme n'est pas dans ton inventaire." };
  } else {
    weapon = weapons[0] || null;
  }

  const mode = weapon ? weapon.mode : "melee"; // à mains nues = corps à corps

  // Le corps à corps (et les mains nues) ne vise toujours que sa propre zone
  // (pas de Portée). Le tir à distance vise la zone choisie par le joueur,
  // à condition qu'elle soit dans la Portée de l'arme et en Ligne de Vue
  // (livret p. 21). Sans zone précisée, on retombe sur sa propre zone
  // (compatible avec les armes de Portée 0-x).
  let target = { x: character.position.x, y: character.position.y };
  if (mode === "ranged" && action.target) {
    target = { x: action.target.x, y: action.target.y };
    const [minRange, maxRange] = weapon.range || [0, 0];
    const sameZone = target.x === character.position.x && target.y === character.position.y;
    if (sameZone) {
      if (minRange > 0) return { ok: false, error: "Cette arme ne peut pas tirer dans sa propre zone (Portée minimum non nulle)." };
    } else {
      const reachable = straightLineTargets(state.board, character.position, maxRange)
        .find((t) => t.x === target.x && t.y === target.y);
      if (!reachable || reachable.distance < minRange) {
        return { ok: false, error: "Cette zone est hors de portée ou hors de vue." };
      }
    }
  }

  const zombiesHere = state.zombies.filter((z) => z.position.x === target.x && z.position.y === target.y);
  if (zombiesHere.length === 0) return { ok: false, error: "Aucun zombie dans la zone visée." };

  const dice = weapon ? weapon.dice : 1;
  const accuracy = weapon ? weapon.accuracy : 4;
  const damage = weapon ? weapon.damage : 1;

  let hits = 0;
  let misses = 0;
  for (let i = 0; i < dice; i++) {
    if (Math.floor(Math.random() * 6) + 1 >= accuracy) hits += 1;
    else misses += 1;
  }

  character.actionsLeft -= 1;
  const events = [];

  // Tir Ami (règle p. 28) : uniquement pour le tir à distance. Chaque dé raté
  // touche automatiquement un Survivant présent dans la ZONE VISÉE (jamais
  // l'attaquant lui-même), pour le Dégât de l'arme — même si cette zone
  // n'est pas celle du tireur.
  if (mode === "ranged" && misses > 0) {
    for (let i = 0; i < misses; i++) {
      const bystanders = state.characters.filter(
        (c) => !c.dead && c.playerId !== playerSocketId && c.position.x === target.x && c.position.y === target.y
      );
      if (bystanders.length === 0) break; // plus personne à toucher dans la zone visée
      const victim = bystanders[Math.floor(Math.random() * bystanders.length)];
      woundCharacter(victim, damage, events, `un tir ami de ${character.name}`);
    }
  }

  if (hits === 0) {
    events.unshift(`${character.name} a raté son attaque.`);
    return { ok: true, state, events };
  }

  // Ordre d'attribution des touches : imposé (Priorité) en tir à distance,
  // libre (on maximise les kills) en corps à corps — la règle p. 27 précise
  // que l'Ordre de Priorité des cibles ne s'applique pas à la mêlée.
  const killedIds = assignHits(zombiesHere, damage, hits, TARGETING_PRIORITY);

  for (const id of killedIds) {
    const zombie = zombiesHere.find((z) => z.id === id);
    const stats = ZOMBIE_TYPES[zombie.type];
    character.adrenaline += stats.adrenaline;
    character.zombieKills += 1;
  }

  if (killedIds.length > 0) {
    state.zombies = state.zombies.filter((z) => !killedIds.includes(z.id));
    events.unshift(`${character.name} élimine ${killedIds.length} zombie(s) !`);
  } else {
    events.unshift(`${character.name} touche mais son arme est trop faible pour ces zombies.`);
  }

  return { ok: true, state, events };
}

// Prochain personnage vivant à partir de `fromIndex` (inclus) dans l'ordre du
// tour. -1 si personne n'est vivant jusqu'à la fin de la liste.
function nextAliveIndex(state, fromIndex) {
  let i = fromIndex;
  while (i < state.characters.length && state.characters[i].dead) i++;
  return i < state.characters.length ? i : -1;
}

function handleEndTurn(state) {
  const character = state.characters[state.currentTurnIndex];
  character.actionsLeft = 0;

  // On ne donne jamais la main à un personnage mort : sinon plus personne ne
  // peut cliquer "Terminer mon tour" et la partie reste bloquée.
  const nextIndex = nextAliveIndex(state, state.currentTurnIndex + 1);
  if (nextIndex !== -1) {
    state.currentTurnIndex = nextIndex;
    const next = state.characters[nextIndex];
    next.actionsLeft = maxActionsForAdrenaline(next.adrenaline);
    return { ok: true, state };
  }

  // Plus personne de vivant après nous dans l'ordre : fin de manche.
  state.phase = "zombie_turn";
  const spawnEvents = spawnZombies(state);
  const activationEvents = activateZombies(state);
  state.phase = "player_turn";
  state.round += 1;

  const firstIndex = nextAliveIndex(state, 0);
  if (firstIndex !== -1) {
    state.currentTurnIndex = firstIndex;
    const first = state.characters[firstIndex];
    first.actionsLeft = maxActionsForAdrenaline(first.adrenaline);
  }

  return { ok: true, state, events: [...spawnEvents, ...activationEvents] };
}
