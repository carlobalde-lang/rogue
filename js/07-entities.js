// ============================================================
// ENEMY GENERATION & PROJECTILES
// ============================================================

// Find a candidate enemy spawn point on a ring around the player, nudged
// out of walls. Returns {x, y}.
function findEnemySpawnPos() {
  const g = game;
  const p = g.player;
  const angle = rand(0, PI2);
  const spawnDist = Math.max(VIEW_W, VIEW_H) * 0.55 + 50;
  let x = p.x + Math.cos(angle) * spawnDist;
  let y = p.y + Math.sin(angle) * spawnDist;

  // Nudge spawn point along the ray toward the player until it's not in a wall
  if (getTile(x, y) === T_WALL) {
    const outA = angleTo({ x, y }, p);
    for (let step = 1; step <= 20; step++) {
      const sx = x + Math.cos(outA) * TILE * step;
      const sy = y + Math.sin(outA) * TILE * step;
      if (getTile(sx, sy) === T_FLOOR) { x = sx; y = sy; break; }
    }
  }
  return { x, y };
}

// Spawn a specific enemy type. `type` is a key in ENEMY_DEFS.
function spawnEnemy(type) {
  const g = game;
  const p = g.player;
  const def = ENEMY_DEFS[type];
  if (!def) return;

  const dm = g.difficultyMult;
  const pos = findEnemySpawnPos();
  let { x, y } = pos;

  const radius = def.radius(dm);
  const hp = def.hp(dm);

  const base = {
    x, y, radius,
    hp, maxHp: hp,
    speed: def.speed(dm),
    damage: def.damage(dm),
    xp: typeof def.xp === 'function' ? def.xp(dm) : def.xp,
    color: def.color,
    type: def.category,
    kind: type,
    name: def.name,
    // Visual palette for the shadow-blob renderer
    body: def.body, core: def.core, glint: def.glint,
    aura: def.aura, auraAlpha: def.auraAlpha, auraScale: def.auraScale,
    flashTimer: 0
  };

  // Specialized per-type fields
  if (def.shield !== undefined) { base.shield = typeof def.shield === 'function' ? def.shield(dm) : def.shield; base.maxShield = base.shield; }
  if (def.fireRate !== undefined) base.fireRate = typeof def.fireRate === 'function' ? def.fireRate(dm) : def.fireRate;
  base.faceA = angleTo(base, p);
  base.fireT = rand(0, 1200);

  // Dev multipliers
  const dev = game.dev;
  base.hp *= (dev.enemyHpMult || 1);
  base.maxHp = base.hp;
  base.speed *= (dev.enemySpeedMult || 1);
  base.damage *= (dev.enemyDmgMult || 1);

  // Push spawn point toward the player until the full body is out of walls
  if (circleBlocked(x, y, radius)) {
    const outA = angleTo({ x, y }, p);
    for (let step = 1; step <= 24; step++) {
      const sx = x + Math.cos(outA) * TILE * step;
      const sy = y + Math.sin(outA) * TILE * step;
      if (!circleBlocked(sx, sy, radius)) { x = sx; y = sy; break; }
    }
  }
  base.x = x; base.y = y;
  base.vx = 0; base.vy = 0;
  base.ph = rand(0, PI2);
  g.enemies.push(base);
  g.totalEnemiesSpawned++;
  if (def.category === 'boss') Sound.play('bossWarn');
  else if (def.category === 'elite' || def.category === 'warden') Sound.play('eliteWarn');
}

// Splitter death: bursts into two Shadowlings with half HP each
function spawnSplitlings(x, y, maxHp, xp) {
  const g = game;
  const def = ENEMY_DEFS.normal;
  const dm = g.difficultyMult;
  const hp = Math.max(1, Math.floor(maxHp / 2));
  const radius = def.radius(dm) * 0.8;
  for (let side = -1; side <= 1; side += 2) {
    const sx = x + side * 13, sy = y + rand(-8, 8);
    g.enemies.push({
      x: sx, y: sy, radius, hp, maxHp: hp,
      speed: def.speed(dm), damage: def.damage(dm),
      xp: Math.max(1, Math.ceil(xp / 2)),
      color: def.color, type: 'normal', name: 'Shadowling',
      body: def.body, core: def.core, glint: def.glint,
      aura: def.aura, auraAlpha: def.auraAlpha, auraScale: def.auraScale,
      vx: 0, vy: 0, ph: rand(0, PI2), flashTimer: 0
    });
    g.totalEnemiesSpawned++;
  }
}

// A swarm of tiny, chunky pressure enemies
function spawnSwarmlings() {
  const g = game;
  const n = 5 + randInt(0, 3);
  for (let i = 0; i < n; i++) spawnEnemy('swarmling');
}

// Pick which "little guy" types show up in a regular wave, based on
// current difficulty. Elites/Bosses are timed events, not in pools.
function pickWaveType() {
  const dm = game.difficultyMult;
  for (const entry of WAVE_POOL) {
    if (dm >= entry.minDiff && Math.random() < entry.chance) return entry.type;
  }
  return 'normal';
}

function spawnWave() {
  const g = game;
  const dm = g.difficultyMult;
  // Swarm waves: a burst of Swarmlings for AoE pressure
  if (dm >= 3 && Math.random() < 0.15) {
    spawnSwarmlings();
    return;
  }
  const count = Math.floor(5 + dm * 4 + dm * dm * 0.3);
  for (let i = 0; i < count; i++) spawnEnemy(pickWaveType());
}

// ============================================================
// PROJECTILE CREATION
// ============================================================
function createProjectile(x, y, vx, vy, dmg, radius, color, life, pierce, areaEffect, shape, trail, opts) {
  game.projectiles.push({
    x, y, vx, vy, dmg, radius: radius || 4, color: color || '#ff0',
    prevX: x, prevY: y,
    life: life || 1500, maxLife: life || 1500,
    pierce: pierce || 0, areaEffect: areaEffect || 0,
    shape: shape || 'circle',
    trail: trail || false,
    rot: Math.atan2(vy, vx),
    trailTimer: 0,
    hitEnemies: new Set(),
    boomerang: !!(opts && opts.boomerang),
    maxOut: (opts && opts.maxOut) || 0,
    outDist: 0, returning: false
  });

  // Duplicator: chance the same projectile fires a second, slightly offset copy
  const pl = game.player;
  if (pl && pl.duplicate && Math.random() < pl.duplicate) {
    const baseA = Math.atan2(vy, vx) + (Math.random() < 0.5 ? -1 : 1) * 0.09;
    const spd = Math.hypot(vx, vy);
    game.projectiles.push({
      x, y, vx: Math.cos(baseA) * spd, vy: Math.sin(baseA) * spd,
      dmg, radius: (radius || 4) * 0.9, color: color || '#ff0',
      prevX: x, prevY: y,
      life: life || 1500, maxLife: life || 1500,
      pierce: pierce || 0, areaEffect: areaEffect || 0,
      shape: shape || 'circle', trail: trail || false,
      rot: baseA, trailTimer: 0,
      hitEnemies: new Set(),
      boomerang: !!(opts && opts.boomerang),
      maxOut: (opts && opts.maxOut) || 0,
      outDist: 0, returning: false
    });
  }
}