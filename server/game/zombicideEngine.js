const ZOMBIE_TYPES = {
  WALKER: { name: 'Walker', actions: 1, damage: 1, health: 1, xp: 1, targetPriority: 3 },
  RUNNER: { name: 'Runner', actions: 2, damage: 1, health: 1, xp: 1, targetPriority: 3 },
  FATTY: { name: 'Fatty', actions: 1, damage: 1, health: 1, xp: 1, targetPriority: 2, absorbsShots: true },
  ABOMINATION: { name: 'Abomination', actions: 1, damage: 3, health: 3, xp: 5, targetPriority: 1, invulnerableToNormal: true }
};

const mission1 = {
  id: 1,
  name: "Niveau 1 : Premier Sang",
  gridSize: { width: 12, height: 6 },
  spawns: [
    { id: 'spawn_north', x: 0, y: 0, type: 'blue' },
    { id: 'spawn_south', x: 11, y: 5, type: 'red' }
  ]
};

class ZombicideGame {
  constructor() {
    this.mission = mission1;
    this.survivors = [{ id: 'survivor_1', name: 'Ned', x: 0, y: 5, actionsLeft: 3, hp: 3, adrenaline: 0, level: 'BLUE' }];
    this.zombies = [];
  }

  getState() {
    return {
      mission: this.mission,
      survivors: this.survivors,
      zombies: this.zombies
    };
  }
}

module.exports = ZombicideGame;