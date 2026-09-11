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
      spawnFloatingText(e.x, e.y - e.radius - 5, Math.floor(dmg), '#6cf');
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
  spawnFloatingText(e.x, e.y - e.radius - 5, Math.floor(dmg), '#ff0');
  if (!silentHit) Sound.play('hit');

  // Leecher: heals for a portion of the damage it survives
  if (e.kind === 'leecher' && e.hp > 0 && dmg > 0) {
    const heal = Math.min(e.maxHp - e.hp, dmg * 0.30);
    if (heal > 0) {
      e.hp += heal;
      spawnParticles(e.x, e.y, '#7f4', 3, 2);
    }
  }

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

  // Splitter: on death it splits into two Shadowlings with half HP
  if (e.kind === 'splitter') {
    spawnSplitlings(e.x, e.y, e.maxHp, e.xp);
  }

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
    // Boss always drops a magnet
    maybeDropMagnet(e.x, e.y, 1);
    spawnParticles(e.x, e.y, '#f0f', 30, 8);
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
    const nearby = g.enemyGrid.query(e.x, e.y, explosionRadius);
    for (const ae of nearby) {
      if (ae !== e && !ae.dead && dist(e, ae) < explosionRadius) {
        // Only continue the chain if the victim is still within range
        // of the chain origin, and stamp the origin onto it.
        if (dist(ae, { x: originX, y: originY }) <= chainRadius) {
          ae.soulChained = true;
          ae.soulOriginX = originX;
          ae.soulOriginY = originY;
          damageEnemy(ae, explosionDmg);
        }
      }
    }
    g.particles.push({
      x: e.x, y: e.y, radius: explosionRadius,
      color: 'rgba(150,0,200,0.4)', life: 350, maxLife: 350,
      type: 'shockwave'
    });
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
    const nb = g.enemyGrid.query(p.x, p.y, p.radius + 28);
    let targets = 0;
    for (const e of nb) {
      if (!e.dead && dist(p, e) < p.radius + e.radius + 24) targets++;
    }
    if (targets > 0) {
      const each = actualDmg * p.thorns / Math.min(targets, 6);
      for (const e of nb) {
        if (e.dead || dist(p, e) >= p.radius + e.radius + 24) continue;
        damageEnemy(e, each, e.x, e.y);
      }
      spawnParticles(p.x, p.y, '#7f4', Math.min(targets * 2, 10), 4);
    }
  }

  if (p.hp <= 0) {
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
}

// ============================================================
// PARTICLES & EFFECTS
// ============================================================
function spawnParticles(x, y, color, count, maxSpeed) {
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