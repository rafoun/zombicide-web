import { canMove, getDoorBetween, zonesInRange, getCell } from "./board.js";
import { shuffle, maxActionsForAdrenaline } from "./decks.js";
import { spawnZombies, activateZombies, ZOMBIE_TYPES } from "./zombies.js";
import { checkGameEnd } from "./scenarios.js";
import { hasSkill } from "./characters.js";

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
  else if (action.type === "jump") result = handleJump(state, playerSocketId, action);
  else if (action.type === "improvised_melee") result = handleImprovisedMelee(state, playerSocketId);
  else return { ok: false, error: `Action inconnue : ${action.type}` };

  // L'Escalation (Diego) ne s'accumule que sur des Attaques de mêlée
  // consécutives : toute autre Action fait retomber le compteur à 0.
  if (result.ok && action.type !== "attack") {
    const character = getCharacter(state, playerSocketId);
    if (character) character.escalationStreak = 0;
  }

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

  // La Fouille (livret p. 19) : seulement dans une zone "bâtiment" (sauf
  // Scavenger, Tania), seulement s'il n'y a aucun zombie dans la zone, et une
  // seule fois par tour (sauf Can Search more than once, Chloé).
  const cell = getCell(state.board, character.position.x, character.position.y);
  if (!cell?.building && !hasSkill(character, "scavenger")) {
    return { ok: false, error: "Tu ne peux fouiller que dans un bâtiment." };
  }
  if (character.searchedThisTurn && !hasSkill(character, "search_more_than_once")) {
    return { ok: false, error: "Une seule Fouille par tour." };
  }
  const zombiesHere = state.zombies.some((z) => z.position.x === character.position.x && z.position.y === character.position.y);
  if (zombiesHere) return { ok: false, error: "Impossible de fouiller : il y a des zombies dans cette zone." };

  const drawCount = hasSkill(character, "search_2_cards") ? 2 : 1;
  for (let i = 0; i < drawCount; i++) {
    if (state.decks.equipmentDeck.length === 0) {
      if (state.decks.discardEquipment.length === 0) break; // plus aucune carte nulle part
      state.decks.equipmentDeck = shuffle(state.decks.discardEquipment);
      state.decks.discardEquipment = [];
    }
    character.equipment.push(state.decks.equipmentDeck.pop());
  }

  character.actionsLeft -= 1;
  character.searchedThisTurn = true;
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

  const hasCrowbar = character.equipment.some((e) => e.effect === "open_door") || hasSkill(character, "break_in");
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

// Jump (Tania) : 1 Action pour se déplacer de 2 zones d'un coup. On ignore
// les zombies sur le chemin (comme l'indique la Compétence) mais pas les
// murs ni les portes verrouillées, donc on réutilise le même calcul
// d'atteignabilité que la Portée des armes à distance.
function handleJump(state, playerSocketId, action) {
  const character = getCharacter(state, playerSocketId);
  if (!character || character.dead) return { ok: false, error: "Personnage indisponible." };
  if (character.actionsLeft <= 0) return { ok: false, error: "Plus d'actions ce tour-ci." };
  if (!hasSkill(character, "jump")) return { ok: false, error: "Ce Survivant n'a pas la Compétence Jump." };

  const target = { x: action.x, y: action.y };
  const reachable = zonesInRange(state.board, character.position, 2).find((t) => t.x === target.x && t.y === target.y);
  if (!reachable || reachable.distance !== 2) {
    return { ok: false, error: "Jump ne peut se faire que vers une zone à exactement 2 zones de distance." };
  }

  character.position = target;
  character.actionsLeft -= 1;

  const events = [`${character.name} bondit de 2 zones (Jump).`];
  const cell = state.board.cells.find((c) => c.x === target.x && c.y === target.y);
  if (cell?.objective) {
    character.adrenaline += 5;
    character.objectives = (character.objectives || 0) + 1;
    events.push(`${character.name} récupère un Objectif (+5 PA).`);
    cell.objective = null;
  }

  return { ok: true, state, events };
}

// Improvised weapon: Melee (Chloé) : 1 fois par tour, Attaque de mêlée
// gratuite (ne consomme pas d'Action), avec des caractéristiques fixes.
function handleImprovisedMelee(state, playerSocketId) {
  const character = getCharacter(state, playerSocketId);
  if (!character || character.dead) return { ok: false, error: "Personnage indisponible." };
  if (!hasSkill(character, "improvised_melee")) return { ok: false, error: "Ce Survivant n'a pas cette Compétence." };
  if (character.improvisedUsedThisTurn) return { ok: false, error: "Déjà utilisée ce tour-ci." };

  const zombiesHere = state.zombies.filter(
    (z) => z.position.x === character.position.x && z.position.y === character.position.y
  );
  if (zombiesHere.length === 0) return { ok: false, error: "Aucun zombie dans ta zone." };

  const dice = 1, accuracy = 4, damage = 1;
  const rolls = [];
  let hits = 0, misses = 0;
  for (let i = 0; i < dice; i++) {
    const roll = Math.floor(Math.random() * 6) + 1;
    rolls.push(roll);
    if (roll >= accuracy) hits += 1;
    else misses += 1;
  }

  character.improvisedUsedThisTurn = true;
  const events = [];
  const diceResult = { rolls, accuracy, hits, misses, weaponName: "Arme de fortune" };

  if (hits === 0) {
    events.unshift(`${character.name} rate son Attaque de fortune.`);
    return { ok: true, state, events, diceResult };
  }

  const killedIds = assignHits(zombiesHere, damage, hits, TARGETING_PRIORITY);
  for (const id of killedIds) {
    const zombie = zombiesHere.find((z) => z.id === id);
    const stats = ZOMBIE_TYPES[zombie.type];
    character.adrenaline += stats.adrenaline;
    character.zombieKills += 1;
  }
  if (killedIds.length > 0) {
    state.zombies = state.zombies.filter((z) => !killedIds.includes(z.id));
    events.unshift(`${character.name} élimine ${killedIds.length} zombie(s) avec une arme de fortune !`);
  } else {
    events.unshift(`${character.name} touche mais trop faiblement.`);
  }

  return { ok: true, state, events, diceResult };
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
      const reachable = zonesInRange(state.board, character.position, maxRange)
        .find((t) => t.x === target.x && t.y === target.y);
      if (!reachable || reachable.distance < minRange) {
        return { ok: false, error: "Cette zone est hors de portée ou hors de vue." };
      }
    }
  }

  const zombiesHere = state.zombies.filter((z) => z.position.x === target.x && z.position.y === target.y);
  if (zombiesHere.length === 0) return { ok: false, error: "Aucun zombie dans la zone visée." };

  let dice = weapon ? weapon.dice : 1;
  const accuracy = weapon ? weapon.accuracy : 4;
  let damage = weapon ? weapon.damage : 1;

  // Super strength (Marco) : ses armes de mêlée infligent toujours 3 Dégâts.
  if (mode === "melee" && hasSkill(character, "super_strength")) damage = Math.max(damage, 3);

  // Full auto (Diego) : à distance, le nombre de dés devient le nombre de
  // zombies présents dans la zone visée.
  if (mode === "ranged" && hasSkill(character, "full_auto")) dice = zombiesHere.length;

  // Escalation: Melee (Diego) : chaque Attaque de mêlée consécutive ajoute
  // 1 dé de plus (le compteur est remis à 0 par toute autre Action, gérée
  // dans applyAction, et par une Attaque à distance ci-dessous).
  if (mode === "melee" && hasSkill(character, "escalation_melee")) {
    dice += character.escalationStreak;
    character.escalationStreak += 1;
  } else {
    character.escalationStreak = 0;
  }

  function rollDice(count) {
    const rolls = [];
    let h = 0, m = 0;
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * 6) + 1;
      rolls.push(roll);
      if (roll >= accuracy) h += 1;
      else m += 1;
    }
    return { rolls, h, m };
  }

  let { rolls, h: hits, m: misses } = rollDice(dice);

  // Roll 6: +1 die (Ranged) (Sofia) : chaque 6 obtenu ajoute un dé de plus,
  // en chaîne (un 6 sur ce dé bonus en ajoute encore un).
  if (mode === "ranged" && hasSkill(character, "roll6_plus_die_ranged")) {
    let sixes = rolls.filter((r) => r === 6).length;
    while (sixes > 0) {
      const bonus = rollDice(sixes);
      rolls = [...rolls, ...bonus.rolls];
      hits += bonus.h;
      misses += bonus.m;
      sixes = bonus.rolls.filter((r) => r === 6).length;
    }
  }

  // Lucky (Ben) : relance tout le jet si l'Attaque ne fait aucune touche.
  if (hits === 0 && hasSkill(character, "lucky")) {
    const retry = rollDice(rolls.length);
    rolls = retry.rolls;
    hits = retry.h;
    misses = retry.m;
  }

  character.actionsLeft -= 1;
  const events = [];

  // Tir Ami (règle p. 28) : uniquement pour le tir à distance, et seulement
  // si le tireur n'a ni Steady hand ni Sniper (les deux l'annulent). Chaque
  // dé raté touche un Survivant de la ZONE VISÉE (jamais l'attaquant, jamais
  // un Survivant avec Low profile).
  const friendlyFireImmune = hasSkill(character, "steady_hand") || hasSkill(character, "sniper");
  if (mode === "ranged" && misses > 0 && !friendlyFireImmune) {
    for (let i = 0; i < misses; i++) {
      const bystanders = state.characters.filter(
        (c) => !c.dead && c.playerId !== playerSocketId && c.position.x === target.x && c.position.y === target.y
          && !hasSkill(c, "low_profile")
      );
      if (bystanders.length === 0) break; // plus personne à toucher dans la zone visée
      const victim = bystanders[Math.floor(Math.random() * bystanders.length)];
      woundCharacter(victim, damage, events, `un tir ami de ${character.name}`);
    }
  }

  const diceResult = { rolls, accuracy, hits, misses, weaponName: weapon?.name || "Mains nues" };

  if (hits === 0) {
    events.unshift(`${character.name} a raté son attaque.`);
    return { ok: true, state, events, diceResult };
  }

  // Ordre d'attribution des touches : imposé (Priorité) en tir à distance,
  // libre (on maximise les kills) en corps à corps — la règle p. 27 précise
  // que l'Ordre de Priorité des cibles ne s'applique pas à la mêlée.
  const killedIds = assignHits(zombiesHere, damage, hits, TARGETING_PRIORITY);

  // Reaper: Melee / Reaper: Ranged (Marco / Sofia) : 1 touche élimine
  // gratuitement un zombie identique supplémentaire dans la même zone.
  const reaperSkill = mode === "melee" ? "reaper_melee" : "reaper_ranged";
  if (killedIds.length > 0 && hasSkill(character, reaperSkill)) {
    const killedType = zombiesHere.find((z) => z.id === killedIds[0])?.type;
    const bonusTarget = zombiesHere.find((z) => z.type === killedType && !killedIds.includes(z.id));
    if (bonusTarget) {
      killedIds.push(bonusTarget.id);
      events.push(`${character.name} enchaîne sur un zombie identique grâce à Reaper.`);
    }
  }

  for (const id of killedIds) {
    const zombie = zombiesHere.find((z) => z.id === id);
    const stats = ZOMBIE_TYPES[zombie.type];
    character.adrenaline += stats.adrenaline;
    character.zombieKills += 1;
  }

  if (killedIds.length > 0) {
    state.zombies = state.zombies.filter((z) => !killedIds.includes(z.id));
    events.unshift(`${character.name} élimine ${killedIds.length} zombie(s) !`);

    // Hold your nose (Tania) : pioche une carte équipement si la zone visée
    // vient d'être totalement nettoyée (pas une Fouille : marche n'importe
    // où, plusieurs fois par tour).
    const zoneNowEmpty = !state.zombies.some((z) => z.position.x === target.x && z.position.y === target.y);
    if (zoneNowEmpty && hasSkill(character, "hold_your_nose")) {
      if (state.decks.equipmentDeck.length === 0 && state.decks.discardEquipment.length > 0) {
        state.decks.equipmentDeck = shuffle(state.decks.discardEquipment);
        state.decks.discardEquipment = [];
      }
      if (state.decks.equipmentDeck.length > 0) {
        character.equipment.push(state.decks.equipmentDeck.pop());
        events.push(`${character.name} fouille les corps (Hold your nose) et récupère une carte équipement.`);
      }
    }
  } else {
    events.unshift(`${character.name} touche mais son arme est trop faible pour ces zombies.`);
  }

  return { ok: true, state, events, diceResult };
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
    next.searchedThisTurn = false;
    next.improvisedUsedThisTurn = false;
    return { ok: true, state };
  }

  // Plus personne de vivant après nous dans l'ordre : fin de manche.
  state.phase = "zombie_turn";
  const spawnSteps = spawnZombies(state);
  const activationSteps = activateZombies(state);

  // Effets de "End Phase" (livret) : Regeneration soigne tout, Medic soigne
  // le Survivant et tout le monde dans sa zone (+1 PA par blessure soignée).
  const endPhaseEvents = [];
  for (const c of state.characters) {
    if (c.dead) continue;
    if (hasSkill(c, "medic")) {
      const inZone = state.characters.filter((other) => !other.dead && other.wounds > 0
        && other.position.x === c.position.x && other.position.y === c.position.y);
      for (const wounded of inZone) {
        wounded.wounds -= 1;
        c.adrenaline += 1;
        endPhaseEvents.push(`${c.name} soigne ${wounded.name} (Medic).`);
      }
    }
  }
  for (const c of state.characters) {
    if (!c.dead && c.wounds > 0 && hasSkill(c, "regeneration")) {
      c.wounds = 0;
      endPhaseEvents.push(`${c.name} se régénère entièrement (Regeneration).`);
    }
    c.toughUsedThisPhase = false; // Tough peut de nouveau ignorer 1 blessure à la prochaine manche
  }

  state.phase = "player_turn";
  state.round += 1;

  const firstIndex = nextAliveIndex(state, 0);
  if (firstIndex !== -1) {
    state.currentTurnIndex = firstIndex;
    const first = state.characters[firstIndex];
    first.actionsLeft = maxActionsForAdrenaline(first.adrenaline);
    first.searchedThisTurn = false;
    first.improvisedUsedThisTurn = false;
  }

  const zombiePhaseSteps = [...spawnSteps, ...activationSteps];
  return {
    ok: true,
    state,
    events: [...zombiePhaseSteps.map((s) => s.message), ...endPhaseEvents],
    zombiePhase: zombiePhaseSteps, // pour que le client rejoue chaque étape une par une
  };
}
