// ============================================================
// DAMAGE SYSTEM, XP GEMS, PARTICLES & EFFECTS
// ============================================================
const MAX_XP_GEMS = 350;   // cap so the merge loop stays cheap
const MAGNET_LIFE_MS = 25000;   // magnets vanish after 25s if untouched

// Randomly drop an XP-magnet pickup. Its touch effect is handled in
// updatePickups (attracts every XP gem on the map toward the player).
// Magnets only drop when there's a meaningful pile of XP stranded out of
// the player's pickup range — otherwise the map gets no magnets at all.
function maybeDropMagnet(x, y, chance) {
  const g = game;
  if (g.pickups.some(pk => pk.type === 'magnet')) return;   // one at a time
  const p = g.player;
  const pr = p.pickupRange;
  let farXp = 0;
  for (const pk of g.pickups) {
    if (pk.type !== 'xp') continue;
    const dx = pk.x - p.x, dy = pk.y - p.y;
    if (dx * dx + dy * dy > pr * pr) farXp += pk.xp;
  }
  const minFar = Math.max(25, Math.ceil(p.xpToLevel * 0.5));
  if (farXp < minFar) return;
  // The more stranded XP, the higher the drop chance (up to baseChance)
  const fill = Math.min(1, farXp / (p.xpToLevel * 2));
  if (Math.random() >= chance * (0.25 + 0.75 * fill)) return;
  g.pickups.push({
    x, y, type: 'magnet', radius: 13,
    color: '#ff5566', life: MAGNET_LIFE_MS, magnetSpeed: 0
  });
}

// ============================================================
// BIOME ELITE BONUSES
// ============================================================
// When an elite or warden is slain, it may grant a small random stat bonus on
// top of the existing essence payouts. This keeps elite encounters rewarding
// beyond the generic gem haul.
const ELITE_BONUSES = [
  { label: 'DMG +4%',     apply: p => { p.dmgMult *= 1.04; } },
  { label: 'AREA +5%',    apply: p => { p.areaMult *= 1.05; } },
  { label: 'SPD +4%',     apply: p => { p.speed *= 1.04; } },
  { label: 'COOLDOWN -3%',apply: p => { p.cdMult *= 0.97; } },
  { label: 'PICKUP +25',  apply: p => { p.pickupRange += 25; } },
  { label: 'REGEN +0.2',  apply: p => { p.regen += 0.2; } }
];

function applyEliteBonus(e) {
  const b = ELITE_BONUSES[Math.floor(Math.random() * ELITE_BONUSES.length)];
  b.apply(game.player);
  spawnFloatingText(e.x, e.y - e.radius - 22, '⬆ ' + b.label, '#ffd24d');
  spawnParticles(e.x, e.y - 6, '#ffd24d', 8, 3);
}

// Drop a Umbra Shards pickup (meta currency). Only elites, wardens and bosses
// pay these out, so upgrades stay scarce.
// Frost Nova / cold sources: temporarly reduce an enemy's move speed to
// the strongest slow applied so far; a fresh weaker slow never overwrites.
function applySlow(e, factor, durMs) {
  if (e.slowFactor !== undefined && factor >= e.slowFactor && e.slowT > 0) return;
  e.slowFactor = factor;
  e.slowT = Math.max(e.slowT || 0, durMs);
}

function dropEssence(x, y, amount) {
  const g = game;
  g.pickups.push({
    x, y, amount, type: 'essence',
    radius: Math.min(12, 4 + Math.sqrt(amount) * 0.9), color: '#c86bff',
    life: Infinity, magnetSpeed: 0
  });
}

function dropXpGem(x, y, xp, color) {
  const g = game;
  // Count existing XP gems; if we're at the cap, feed the XP into the
  // nearest existing gem instead of creating a new one.
  let count = 0, nearest = null, bestD = Infinity;
  for (const pk of g.pickups) {
    if (pk.type !== 'xp') continue;
    count++;
    const d = (pk.x - x) * (pk.x - x) + (pk.y - y) * (pk.y - y);
    if (d < bestD) { bestD = d; nearest = pk; }
  }
  if (count >= MAX_XP_GEMS && nearest) {
    nearest.xp += xp;
    nearest.radius = Math.min(14, 5 + Math.sqrt(nearest.xp / 3));
    nearest.color = color;
    return;
  }
  g.pickups.push({
    x, y, xp, type: 'xp',
    radius: Math.min(14, 5 + Math.sqrt(xp / 3)), color,
    life: Infinity, magnetSpeed: 0
  });
}

function damageEnemy(e, dmg, srcX, srcY, silentHit) {
  if (e.dead) return;
  const g = game;
  const p = g.player;
  // Per-hit damage numbers are hidden only on a struggling frame rate,
  // so they never add load when they'd cost frames, but always show in
  // regular fights (crowded or not) as long as FPS stays healthy.
  const crowdNoNumbers = typeof GFX === 'object' && GFX.fps < 35;

  // Momentum: a straight-line streak grants bonus damage (stacks per pickup)
  if (p.momentumActive && p.momentum > 0) {
    dmg *= 1 + p.momentum * 0.12;
  }

  // Shielded "front shield": while the shield is up, hits that come from
  // within the enemy's front arc are fully absorbed. The rest (flanks/back)
  // go straight through. src defaults to the player (the usual threat).
  if (e.shield > 0) {
    const fx = srcX !== undefined ? srcX : p.x;
    const fy = srcY !== undefined ? srcY : p.y;
    const da = Math.atan2(fy - e.y, fx - e.x);
    let diff = da - (e.faceA !== undefined ? e.faceA : 0);
    while (diff > Math.PI) diff -= PI2;
    while (diff < -Math.PI) diff += PI2;
    if (Math.abs(diff) < Math.PI * 0.19) {          // ~34° front arc
      e.shield -= dmg;
      e.flashTimer = 100;
      if (!crowdNoNumbers) spawnFloatingText(e.x, e.y - e.radius - 5, Math.floor(dmg), '#6cf');
      if (e.shield <= 0) {
        e.shield = 0;
        spawnParticles(e.x, e.y, '#4af', 12, 6);
        spawnFloatingText(e.x, e.y - e.radius - 14, 'SHIELD DOWN!', '#4af');
        Sound.play('shieldBreak');
      } else {
        Sound.play('shieldHit');
      }
      return;                                       // damage fully absorbed
    }
  }

  e.hp -= dmg;
  e.flashTimer = 100;
  if (!crowdNoNumbers) spawnFloatingText(e.x, e.y - e.radius - 5, Math.floor(dmg), '#ff0');
  if (!silentHit) Sound.play('hit');

  // Per-type behavior after taking damage (e.g. Leecher self-heal).
  const def = e.def;
  if (def && def.onHit) def.onHit(e, dmg);

  // Vampirism: a % of damage dealt is returned to the player as HP
  if (p.vamp > 0 && dmg > 0) {
    p.hp = Math.min(p.maxHp, p.hp + dmg * p.vamp);
  }

  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  const g = game;
  const p = g.player;
  e.dead = true;
  g.kills++;
  Sound.play(e.type === 'boss' ? 'dieBoss' : (e.type === 'elite' || e.type === 'warden') ? 'dieElite' : 'die');

  // Per-type behavior on death (e.g. Splitter spawns two Shadowlings).
  const def = e.def;
  if (def && def.onDeath) def.onDeath(e);

  // Boss: guaranteed level-up + bonus XP
  if (e.type === 'boss') {
    p.xp += Math.ceil(p.xpToLevel * 0.5);
    while (p.xp >= p.xpToLevel) {
      p.xp -= p.xpToLevel;
      p.level++;
      p.xpToLevel = Math.floor(10 + p.level * 5 + p.level * p.level * 0.5);
      game.pendingLevelUps++;
      if (!game.levelUpPending) showLevelUp();
    }
    // Boss also drops some gems for flavor
    for (let i = 0; i < 10; i++) {
      dropXpGem(e.x + rand(-20, 20), e.y + rand(-20, 20), Math.ceil(e.xp / 10), '#f0f');
    }
    // Boss pays out Umbra Shards
    for (let i = 0; i < 8; i++) {
      dropEssence(e.x + rand(-20, 20), e.y + rand(-20, 20), 6);
    }
    // Boss always drops a magnet
    maybeDropMagnet(e.x, e.y, 1);
    spawnParticles(e.x, e.y, '#f0f', 30, 8);
    // A slain WEDGE GUARDIAN purifies its biome heart: buying a portal & directly
    // granting the biome weapon (no RNG).
    if (e.isGuardian) {
      completeHeart(e.biomeId);
    }
    return;
  }

  // Drop XP gems (Luck adds a bonus gem; elite 5, warden 3, others 1)
  let gemCount = e.type === 'elite' ? 5 : e.type === 'warden' ? 3 : 1;
  if (p.luck > 0 && Math.random() < p.luck) gemCount++;
  const xpEach = Math.ceil(e.xp / gemCount);
  const gemColor = e.type === 'elite' ? '#fa0' : e.type === 'warden' ? '#af6' : '#4af';
  for (let i = 0; i < gemCount; i++) {
    dropXpGem(e.x + rand(-15, 15), e.y + rand(-15, 15), xpEach, gemColor);
  }

  // Umbra Shards: only elites and wardens pay out (boss handled above).
// Banker's Ledger boosts the per-drop haul of these payouts.
  const em = (p.essenceMult || 1);
  if (e.type === 'elite') {
    for (let i = 0; i < 3; i++) dropEssence(e.x + rand(-15, 15), e.y + rand(-15, 15), Math.max(1, Math.round(3 * em)));
  } else if (e.type === 'warden') {
    for (let i = 0; i < 3; i++) dropEssence(e.x + rand(-15, 15), e.y + rand(-15, 15), Math.max(1, Math.round(2 * em)));
  } else if (e.type === 'normal') {
    // Scavenger: normal enemies dribble Shards; odds scale with Luck
    if (p.scavenger > 0) {
      const chance = Math.min(0.05, 0.012 + 0.01 * p.scavenger) * (1 + (p.luck || 0) * 3);
      if (Math.random() < chance) dropEssence(e.x, e.y, 1);
    }
  }

  // Biome elites: a random stat bonus rolls when slain (x3 essence is already
  // handled above; this is the extra "aggiornamento casuale").
  if (e.type === 'elite' || e.type === 'warden') {
    applyEliteBonus(e);
  }

  // Drop XP magnets (Luck boosts the odds). Bosses always, wardens often,
  // elites sometimes, normal mobs rarely.
  const luckMult = 1 + (p.luck || 0) * 1.5;
  if (e.type === 'elite') maybeDropMagnet(e.x, e.y, 0.18 * luckMult);
  else if (e.type === 'warden') maybeDropMagnet(e.x, e.y, 0.5 * luckMult);
  else maybeDropMagnet(e.x, e.y, Math.min(0.05, 0.012 + g.difficultyMult * 0.004) * luckMult);

  // Rush: every kill trims the current cooldown of every weapon
  if (p.cdrKillLvl > 0) {
    const cut = 250 * p.cdrKillLvl;
    for (const w of p.weapons) {
      w.lastFired -= cut;
      if (w.lastFired < 0) w.lastFired = 0;
    }
  }

  spawnParticles(e.x, e.y, e.color, 8, 4);

  // Soul Harvest: chance to explode on kill. The chain only spreads among
  // enemies within a radius of the ORIGINAL explosion, so it can't ride
  // across the whole map kill-to-kill.
  if (p.soulHarvest > 0 && Math.random() < p.soulHarvest) {
    const explosionRadius = 55 * p.areaMult;
    const explosionDmg = (4 + p.level) * p.dmgMult;
    // Chain origin: if this kill is part of a chain, use the chain's
    // start point; otherwise this kill starts a fresh chain.
    let originX = e.x, originY = e.y;
    if (e.soulChained) { originX = e.soulOriginX; originY = e.soulOriginY; }
    const chainRadius = explosionRadius * 2.2;
    if (dist(e, { x: originX, y: originY }) > chainRadius) {
      originX = e.x; originY = e.y; // too far: break and restart the chain
    }
    const nearby = [];
    g.enemyGrid.queryEach(e.x, e.y, explosionRadius, ae => {
      if (ae !== e && !ae.dead && dist(e, ae) < explosionRadius) nearby.push(ae);
    });
    for (const ae of nearby) {
      // Only continue the chain if the victim is still within range
      // of the chain origin, and stamp the origin onto it.
      if (dist(ae, { x: originX, y: originY }) <= chainRadius) {
        ae.soulChained = true;
        ae.soulOriginX = originX;
        ae.soulOriginY = originY;
        damageEnemy(ae, explosionDmg);
      }
    }
    if (GFX.shockwaves) {
      g.particles.push({
        x: e.x, y: e.y, radius: explosionRadius,
        color: 'rgba(150,0,200,0.4)', life: 350, maxLife: 350,
        type: 'shockwave'
      });
    }
    spawnParticles(e.x, e.y, '#a0f', 10, 5);
  }
}

function damagePlayer(dmg) {
  const g = game;
  const p = g.player;
  if (p.invulnTimer > 0 || g.dev.godMode) return;
  const actualDmg = Math.max(1, dmg - p.armor);
  p.hp -= actualDmg;
  p.invulnTimer = 500;
  spawnFloatingText(p.x, p.y - 30, Math.floor(actualDmg), '#f44');
  spawnParticles(p.x, p.y, '#f44', 6, 3);
  Sound.play('hurt');

  // Thorns: reflect a portion of the damage to enemies in contact
  if (p.thorns > 0 && actualDmg > 0) {
    const rad = p.radius + 28;
    let targets = 0;
    g.enemyGrid.queryEach(p.x, p.y, rad, e => {
      if (!e.dead && dist(p, e) < p.radius + e.radius + 24) targets++;
    });
    if (targets > 0) {
      const each = actualDmg * p.thorns / Math.min(targets, 6);
      g.enemyGrid.queryEach(p.x, p.y, rad, e => {
        if (e.dead || dist(p, e) >= p.radius + e.radius + 24) return;
        damageEnemy(e, each, e.x, e.y);
      });
      spawnParticles(p.x, p.y, '#7f4', Math.min(targets * 2, 10), 4);
    }
  }

  if (p.hp <= 0) resolvePlayerDeath();
}

// Shared death resolution (enemy damage and terrain lava both route here).
function resolvePlayerDeath() {
  const p = game.player;
  if (p.hp > 0) return;
  // Revive: one-time resurrection at 60% HP (max 2 charges)
  if (p.revives > 0) {
    p.revives--;
    p.hp = Math.max(1, Math.ceil(p.maxHp * 0.6));
    p.invulnTimer = 2000;
    spawnFloatingText(p.x, p.y - 34, 'REVIVE!', '#f6f');
    spawnParticles(p.x, p.y, '#f6f', 24, 8);
    Sound.play('levelup');
    return;
  }
  p.hp = 0;
  endGame();
}

// ============================================================
// PARTICLES & EFFECTS
// ============================================================
function spawnParticles(x, y, color, count, maxSpeed) {
  if (!gfxCanSpawnParticles()) return;
  for (let i = 0; i < count; i++) {
    const a = rand(0, PI2);
    const s = rand(20, maxSpeed * 40);
    game.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      radius: rand(1.5, 3.5), color, life: rand(200, 500),
      maxLife: 500, type: 'dot'
    });
  }
}

function spawnFloatingText(x, y, value, color) {
  game.floatingTexts.push({
    x, y, text: String(value), color,
    life: 800, maxLife: 800, vy: -60
  });
}