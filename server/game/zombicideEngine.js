/**
 * Moteur de Jeu Complet - Zombicide Web (2e Édition)
 * Gère le niveau 1, les actions, le spawn et le comportement de tous les zombies.
 */

// --- 1. CONFIGURATION DU BESTIAIRE (ZOMBIES) ---
const ZOMBIE_TYPES = {
  WALKER: { name: 'Walker', actions: 1, damage: 1, health: 1, xp: 1, targetPriority: 3 },
  RUNNER: { name: 'Runner', actions: 2, damage: 1, health: 1, xp: 1, targetPriority: 3 },
  FATTY: { name: 'Fatty', actions: 1, damage: 1, health: 1, xp: 1, targetPriority: 2, absorbsShots: true },
  ABOMINATION: { name: 'Abomination', actions: 1, damage: 3, health: 3, xp: 5, targetPriority: 1, invulnerableToNormal: true }
};

// --- 2. CONFIGURATION DU NIVEAU 1 : "Premier Sang" ---
const mission1 = {
  id: 1,
  name: "Niveau 1 : Premier Sang",
  description: "Frayez-vous un chemin à travers les rues infestées, trouvez les indices et rejoignez la zone d'extraction.",
  gridSize: { width: 12, height: 6 }, // 2 tuiles côte à côte (6x6 chacune)
  spawns: [
    { id: 'spawn_north', x: 0, y: 0, type: 'blue' },
    { id: 'spawn_south', x: 11, y: 5, type: 'red' }
  ],
  doors: [
    { id: 'door_1', x: 5, y: 2, isOpen: false }, // Porte menant à un bâtiment
    { id: 'door_2', x: 8, y: 4, isOpen: false }
  ],
  objectives: [
    { id: 'obj_1', x: 2, y: 1, collected: false, xp: 5 },
    { id: 'obj_2', x: 9, y: 3, collected: false, xp: 5 }
  ],
  extractionZone: { x: 11, y: 5 }
};

// --- 3. ÉTAT GLOBAL DU JEU ---
class ZombicideGame {
  constructor(mission) {
    this.mission = mission;
    this.turn = 1;
    this.phase = 'PLAYER_PHASE'; // 'PLAYER_PHASE', 'ZOMBIE_PHASE', 'SPAWN_PHASE'
    
    // Survivants sur la map
    this.survivors = [
      { id: 'survivor_1', name: 'Ned', x: 0, y: 5, actionsLeft: 3, hp: 3, adrenaline: 0, level: 'BLUE', inventory: ['Pan', 'Pistol'] }
    ];

    // Liste des zombies actifs
    this.zombies = [];
  }

  // --- LOGIQUE DES ZOMBIES (ACTIVATION & MOUVEMENT) ---
  /**
   * Active tous les zombies du plateau selon les règles de la 2e édition :
   * - Si un survivant est dans la même zone ou en Ligne de Vue, ils attaquent ou foncent.
   * - Sinon, ils se dirigent vers la zone la plus bruyante.
   */
  activateZombies() {
    console.log("--- DÉBUT DE LA PHASE DES ZOMBIES ---");
    
    this.zombies.forEach(zombie => {
      const typeConfig = ZOMBIE_TYPES[zombie.type];
      let actionsLeft = typeConfig.actions;

      while (actionsLeft > 0) {
        // 1. Vérifier si un survivant est dans la même zone (Combat immédiat)
        const targetInSameZone = this.survivors.find(s => s.x === zombie.x && s.y === zombie.y);
        
        if (targetInSameZone) {
          this.inflictDamage(targetInSameZone, typeConfig.damage);
          break; // Le zombie a consommé son action pour attaquer
        } else {
          // 2. Mouvement vers la cible la plus proche / bruyante
          this.moveZombieTowardsTarget(zombie);
        }
        actionsLeft--;
      }
    });
  }

  moveZombieTowardsTarget(zombie) {
    // Logique simplifiée de déplacement de case en case vers le survivant le plus proche
    const target = this.survivors[0]; // Simplification pour l'exemple
    if (zombie.x < target.x) zombie.x++;
    else if (zombie.x > target.x) zombie.x--;
    
    if (zombie.y < target.y) zombie.y++;
    else if (zombie.y > target.y) zombie.y--;

    console.log(`Le ${zombie.type} se déplace vers (${zombie.x}, ${zombie.y})`);
  }

  inflictDamage(survivor, amount) {
    survivor.hp -= amount;
    console.log(`⚠️ ${survivor.name} subit ${amount} dégât(s) ! PV restants : ${survivor.hp}`);
    if (survivor.hp <= 0) {
      console.log(`💀 ${survivor.name} est mort !`);
    }
  }

  // --- GESTION DU COMBAT ET DE L'ABOMINATION ---
  resolveCombat(survivor, targetZombie, weapon) {
    console.log(`${survivor.name} attaque un ${targetZombie.type} avec ${weapon.name}`);

    // Cas particulier de l'Abomination
    if (targetZombie.type === 'ABOMINATION') {
      if (weapon.name === 'Molotov') {
        console.log(`🔥 L'Abomination est incinérée par le Cocktail Molotov ! Elle meurt instantanément.`);
        this.removeZombie(targetZombie);
        survivor.adrenaline += ZOMBIE_TYPES.ABOMINATION.xp;
        this.updateSurvivorLevel(survivor);
        return true;
      } else {
        console.log(`🛡️ L'attaque échoue ! L'Abomination est insensible aux armes normales.`);
        return false;
      }
    }

    // Destruction classique pour Walker, Runner, Fatty
    if (weapon.damage >= ZOMBIE_TYPES[targetZombie.type].health) {
      console.log(`🎯 ${targetZombie.type} éliminé !`);
      this.removeZombie(targetZombie);
      survivor.adrenaline += ZOMBIE_TYPES[targetZombie.type].xp;
      this.updateSurvivorLevel(survivor);
      return true;
    } else {
      console.log(`❌ Pas assez de dégâts pour tuer le ${targetZombie.type}.`);
      return false;
    }
  }

  removeZombie(zombie) {
    this.zombies = this.zombies.filter(z => z !== zombie);
  }

  updateSurvivorLevel(survivor) {
    if (survivor.adrenaline >= 43) survivor.level = 'RED';
    else if (survivor.adrenaline >= 19) survivor.level = 'ORANGE';
    else if (survivor.adrenaline >= 7) survivor.level = 'YELLOW';
    console.log(`${survivor.name} passe au niveau de danger : ${survivor.level} (${survivor.adrenaline} XP)`);
  }

  // --- SPAWN DES ZOMBIES (Phase de Fin de Tour) ---
  spawnZombies() {
    console.log("--- PHASE DE SPAWN ---");
    this.mission.spawns.forEach(spawnPoint => {
      // Génération d'un Walker par défaut sur chaque point de spawn pour l'exemple
      const newZombie = { id: Math.random(), type: 'WALKER', x: spawnPoint.x, y: spawnPoint.y };
      this.zombies.push(newZombie);
      console.log(`🧟 Un ${newZombie.type} apparaît au point de spawn (${spawnPoint.x}, ${spawnPoint.y})`);
    });
  }
}

// --- EXEMPLE D'UTILISATION ---
const game = new ZombicideGame(mission1);
console.log(`Lancement du jeu : ${game.mission.name}`);

// Simulation d'un spawn et d'un combat contre une Abomination
game.spawnZombies();
game.zombies.push({ id: 99, type: 'ABOMINATION', x: 0, y: 5 }); // Ajout d'une Abomination sur le joueur

// Test d'une arme classique (Échoue)
game.resolveCombat(game.survivors[0], game.zombies.find(z => z.type === 'ABOMINATION'), { name: 'Pistol', damage: 1 });

// Test du Cocktail Molotov (Succès)
game.resolveCombat(game.survivors[0], game.zombies.find(z => z.type === 'ABOMINATION'), { name: 'Molotov', damage: 3 });