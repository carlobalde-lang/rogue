// ============================================================
// GAME STATE
// ============================================================
let game = null;

function createGameState() {
  return {
    running: false, paused: false, gameOver: false, manualPause: false,
    time: 0, lastTime: 0, dt: 0,
    kills: 0, totalEnemiesSpawned: 0,
    camera: { x: 0, y: 0 },
    player: {
      x: 0, y: 0, radius: 14,
      hp: 100, maxHp: 100,
      speed: 180,
      xp: 0, xpToLevel: 10, level: 1,
      dmgMult: 1, areaMult: 1, cdMult: 1,
      armor: 0, pickupRange: 110, regen: 0, soulHarvest: 0,
      vamp: 0, thorns: 0, luck: 0, duplicate: 0, revives: 0, cdrKillLvl: 0,
      weapons: [],
      passives: [],
      invulnTimer: 0,
      facingAngle: 0,
      renderAngle: 0,
      cape: null,
      animTime: 0,
      attackPulse: 0,
      velX: 0, velY: 0,
      _stepT: 0
    },
    enemies: [],
    projectiles: [],
    pickups: [],
    xpMagnetTimer: 0,
    clouds: [],
    turrets: [],
    rifts: [],
    castProjectiles: [],
    particles: [],
    floatingTexts: [],
    lightningEffects: [],
    input: { up: false, down: false, left: false, right: false },
    waveTimer: 0,
    eliteTimer: 0,
    wardenTimer: 0,
    bossTimer: 0,
    difficultyMult: 1,
    enemyGrid: new SpatialGrid(100),
    pickupGrid: new SpatialGrid(80),
    groundTiles: [],
    levelUpPending: false,
    pendingLevelUps: 0,
    levelUpChoices: null,
    selectedChoice: 0,
    joystick: { active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0, maxRadius: 55 },
    // Dev-tweakable modifiers (edited live from the dev panel)
    dev: {
      timeScale: 1,
      enemyHpMult: 1,
      enemySpeedMult: 1,
      enemyDmgMult: 1,
      xpMult: 1,
      godMode: false,
      enemyCap: 800,
      difficultyOverride: 0,   // 0 = auto (computed), >0 = forced value
      waveIntervalMult: 1,
      eliteIntervalMult: 1,
      bossIntervalMult: 1
    }
  };
}