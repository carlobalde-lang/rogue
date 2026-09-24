// ============================================================
// GAME STATE
// ============================================================
let game = null;

function createGameState() {
  return {
    running: false, paused: false, gameOver: false, manualPause: false,
    time: 0, lastTime: 0, dt: 0,
    kills: 0, essenceCollected: 0, totalEnemiesSpawned: 0,
    camera: { x: 0, y: 0 },
    player: {
      x: 0, y: 0, radius: 14,
      hp: 100, maxHp: 100,
      speed: 180,
      xp: 0, xpToLevel: 10, level: 1,
      dmgMult: 1, areaMult: 1, cdMult: 1,
      armor: 0, pickupRange: 110, regen: 0, soulHarvest: 0,
      vamp: 0, thorns: 0, luck: 0, duplicate: 0, revives: 0, cdrKillLvl: 0,
      overload: 0, scavenger: 0, momentum: 0,
      essenceMult: 1,
      straightT: 0, straightDir: null, momentumActive: false,
      weapons: [],
      passives: [],
      invulnTimer: 0,
      hurtFlash: 0,       // red damage vignette intensity, decays toward 0
      hurtShake: 0,       // camera shake magnitude after a hit, decays toward 0
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
    // Biome treasure chests: openedChests marks the ones looted this run,
    // chestProgress holds the current open-hold timer while standing on one.
    openedChests: {},
    chestProgress: {},
    // Biome ambient weather + wind systems
    storm: null,          // active storm event { id, t, dur, pT }
    stormCd: 0,           // ms until the next storm can start
    gust: null,           // taiga wind gust { a, t, hold, strength }
    gustTimer: 0,
    // Biome heart guardians & warp portal network
    guardian: null,       // active guardian fight { biomeId, spawnT }
    heartTimers: {},      // per-biome guardian countdowns, ms left before wake (30s each)
    warpCharges: {},      // ms spent standing on each cleared heart portal
    warpArmed: {},        // per-portal: true only after stepping off and back on
    warpOpen: false,
    recipesTriggered: {}, // recipe id -> true (one-shot per run)
    discoveredBiomes: [], // biome ids explored this run (minimap)
    bossBarId: null,      // enemy ref id while its HP bar is huge
    recipeTimer: 0,
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
      bossIntervalMult: 1,
      simHz: 60               // fixed-sim Hz (60 default: smoother catch-up; dev only)
    }
  };
}