// ============================================================
// ENEMY GENERATION & PROJECTILES
// ============================================================

// Pending enemy spawns, drained a few per frame from updateEnemies().
// Horde waves historically spawned 50-70 enemies in one burst, which on an
// already tight frame budget read as a ~1s downhill that recovered once the
// extras were integrated. Staggering the drain smooths that hitch away.
const SPAWN_PER_FRAME = 6;
let _spawnQ = [], _spawnHead = 0, _spawnTail = 0;
function queueSpawnEnemy(type, bias) {
  if (_spawnHead >= _spawnTail) { _spawnHead = 0; _spawnTail = 0; }
  // Keep pending work bounded even when the enemy cap is reached.
  if (_spawnTail - _spawnHead >= Math.max(0, game.dev.enemyCap - game.enemies.length)) return;
  _spawnQ[_spawnTail++] = { type, bias };
}
function resetSpawnQueue() { _spawnHead = 0; _spawnTail = 0; _spawnQ.length = 0; }
function drainSpawnQueue() {
  if (_spawnHead >= _spawnTail) { _spawnHead = 0; _spawnTail = 0; return; }
  const cap = game.dev.enemyCap;
  for (let k = 0; k < SPAWN_PER_FRAME && _spawnHead < _spawnTail; k++) {
    if (game.enemies.length >= cap) { _spawnHead = 0; _spawnTail = 0; return; }
    const s = _spawnQ[_spawnHead++];
    spawnEnemy(s.type, s.bias);
  }
  if (_spawnHead >= _spawnTail) { _spawnHead = 0; _spawnTail = 0; }
}

// Find a candidate enemy spawn point on a ring around the player, nudged
// out of walls. Distance is randomized too, so hordes don't pop on a fixed
// ring. `bias` (optional) pins the direction to a broad arc centered at
// bias.a with half-width bias.spread, so waves sweep in from a random side
// instead of always pouring out of the four cardinal corridors.
// Returns {x, y}.
function findEnemySpawnPos(bias) {
  const g = game;
  const p = g.player;
  const angle = bias
    ? bias.a + rand(-bias.spread, bias.spread)
    : rand(0, PI2);
  // Follow the viewport edge with a stable minimum combat radius.
  const dx = Math.cos(angle), dy = Math.sin(angle), cam = g.camera;
  const edgeX = dx > 0 ? cam.x + VIEW_W - p.x : p.x - cam.x;
  const edgeY = dy > 0 ? cam.y + VIEW_H - p.y : p.y - cam.y;
  const edge = Math.min(Math.max(0, edgeX) / Math.max(0.000001, Math.abs(dx)),
    Math.max(0, edgeY) / Math.max(0.000001, Math.abs(dy)));
  const spawnDist = Math.max(700, edge + 80) + rand(0, 280);
  let x = p.x + Math.cos(angle) * spawnDist;
  let y = p.y + Math.sin(angle) * spawnDist;

  // Search outward so clearing an obstacle never moves the spawn on screen.
  // Nudge spawn point along the ray away from the player until it's not in a wall
  // or inside one of the big impassable tree groves.
  if (getTile(x, y) === T_WALL || getTile(x, y) === T_TREE || getTile(x, y) === T_TALLGRASS || getTile(x, y) === T_CLIFF) {
    const outA = angle;
    for (let step = 1; step <= 20; step++) {
      const sx = x + Math.cos(outA) * TILE * step;
      const sy = y + Math.sin(outA) * TILE * step;
      if (getTile(sx, sy) === T_FLOOR) { x = sx; y = sy; break; }
    }
  }
  return { x, y };
}

// Enclose off-screen spawns, wall searches, and camera lag.
function enemyRecycleDistance() {
  const p = game.player, cam = game.camera;
  const lag = Math.hypot(cam.x + VIEW_W * 0.5 - p.x, cam.y + VIEW_H * 0.5 - p.y);
  return Math.max(2600, Math.hypot(VIEW_W, VIEW_H) * 0.5 + lag + 1100);
}

// Spawn a specific enemy type. `type` is a key in ENEMY_DEFS.
// `bias` (optional) aims the spawn toward a random arc (see findEnemySpawnPos).
function spawnEnemy(type, bias) {
  const g = game;
  const p = g.player;
  const def = ENEMY_DEFS[type];
  if (!def) return;

  const dm = g.difficultyMult;
  const pos = findEnemySpawnPos(bias);
  let { x, y } = pos;

  // Enemy size tuning: normals (everything smaller than elites) are drawn
  // double-size, elites are +15%. Wardens/bosses stay as authored.
  const sizeScale = def.category === 'elite' ? 1.15 : (def.category === 'normal' ? 2 : 1);
  const radius = def.radius(dm) * sizeScale;
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
    def,
    // Visual palette for the materialized-shadow renderer
    deep: def.deep,
    body: def.body, core: def.core, glint: def.glint,
    aura: def.aura, auraAlpha: def.auraAlpha, auraScale: def.auraScale,
    flashTimer: 0,
    _bornT: g.time
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
  if (window.runLog) runLog.onSpawn(type, base.hp, base.damage);
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
  const radius = def.radius(dm) * 0.8 * 2;   // shadowlings are normals: double-size
  for (let side = -1; side <= 1; side += 2) {
    const sx = x + side * 13, sy = y + rand(-8, 8);
    g.enemies.push({
      x: sx, y: sy, radius, hp, maxHp: hp,
      speed: def.speed(dm), damage: def.damage(dm),
      xp: Math.max(1, Math.ceil(xp / 2)),
      color: def.color, type: 'normal', name: 'Shadowling',
      kind: 'shadowling',
      deep: def.deep,
      body: def.body, core: def.core, glint: def.glint,
      aura: def.aura, auraAlpha: def.auraAlpha, auraScale: def.auraScale,
      vx: 0, vy: 0, ph: rand(0, PI2), flashTimer: 0,
      _bornT: g.time
    });
    if (window.runLog) runLog.onSpawn('shadowling', hp, def.damage(dm));
    g.totalEnemiesSpawned++;
  }
}

// A swarm of tiny, chunky pressure enemies (queued: drains over a few frames)
function spawnSwarmlings() {
  const n = 8 + randInt(0, 4) + Math.min(12, Math.floor(game.difficultyMult * 0.5));
  for (let i = 0; i < n; i++) queueSpawnEnemy('swarmling');
}

// Pick which "little guy" types show up in a regular wave, based on
// current difficulty. Elites/Bosses are timed events, not in pools.
// While the player is inside a climate wedge, that biome's exclusive enemy
// can join in too — so every sector of the ring has its own identity.
function pickWaveType() {
  const dm = game.difficultyMult;
  const bonus = BIOME_ENEMY[playerBiome()];
  if (bonus && dm >= 2 && Math.random() < 0.30) return bonus;
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
  // The working queue now delivers the entire wave, so use bounded growth.
  const count = Math.min(64, Math.floor(7 + dm * 1.4 + Math.sqrt(Math.max(0, dm)) * 2));
  // Each wave sweeps in from a random broad front, so pressure never locks
  // onto the north/south/east/west approach lines.
  const bias = { a: rand(0, PI2), spread: rand(1.1, 2.2) };
  for (let i = 0; i < count; i++) queueSpawnEnemy(pickWaveType(), bias);
}

// ============================================================
// PROJECTILE CREATION
// ============================================================
function createProjectile(x, y, vx, vy, dmg, radius, color, life, pierce, areaEffect, shape, trail, opts) {
  const projSrc = (opts && opts.src) || (window.runLog && runLog.currentSrc) || 'projectile';
  game.projectiles.push({
    x, y, vx, vy, dmg, radius: radius || 4, color: color || '#ff0',
    prevX: x, prevY: y,
    life: life || 1500, maxLife: life || 1500,
    pierce: pierce || 0, areaEffect: areaEffect || 0,
    shape: shape || 'circle',
    trail: trail || false,
    src: projSrc,
    rot: Math.atan2(vy, vx),
    trailTimer: 0,
    hitEnemies: new Set(),
    boomerang: !!(opts && opts.boomerang),
    maxOut: (opts && opts.maxOut) || 0,
    outDist: 0, returning: false,
    bounces: (opts && opts.bounces) || 0,
    bounceRange: (opts && opts.bounceRange) || 120,
    delay: 0
  });

  // Duplicator: the shot is echoed by follow-up copies that hold at the muzzle
  // for a beat and then fire in quick succession along the SAME heading, so a
  // proc reads as a short burst down one line (distinct from Overload's flat
  // attack-speed boost). Each echo trails the original and is weaker. The
  // update loop freezes a projectile while `delay` ticks down, and the renderer
  // skips it, so the echoes stay invisible until they fire.
  const pl = game.player;
  if (pl && pl.duplicate && Math.random() < pl.duplicate) {
    const ECHOES = 2;    // follow-up shots per proc
    const GAP = 70;      // ms between the original and each echo
    const a = Math.atan2(vy, vx);
    for (let s = 1; s <= ECHOES; s++) {
      game.projectiles.push({
        x, y, vx, vy,
        dmg: dmg * 0.65, radius: (radius || 4) * 0.85, color: color || '#ff0',
        prevX: x, prevY: y,
        life: life || 1500, maxLife: life || 1500,
        pierce: pierce || 0, areaEffect: areaEffect || 0,
        shape: shape || 'circle', trail: trail || false,
        src: projSrc,
        rot: a, trailTimer: 0,
        hitEnemies: new Set(),
        boomerang: !!(opts && opts.boomerang),
        maxOut: (opts && opts.maxOut) || 0,
        outDist: 0, returning: false,
        bounces: (opts && opts.bounces) || 0,
        bounceRange: (opts && opts.bounceRange) || 120,
        delay: GAP * s
      });
    }
  }
}
