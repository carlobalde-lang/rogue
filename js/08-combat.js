// ============================================================
// DAMAGE SYSTEM, XP GEMS, PARTICLES & EFFECTS
// ============================================================
const MAX_XP_GEMS = 350;   // cap so the merge loop stays cheap

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

function damageEnemy(e, dmg) {
  if (e.dead) return;
  e.hp -= dmg;
  e.flashTimer = 100;
  spawnFloatingText(e.x, e.y - e.radius - 5, Math.floor(dmg), '#ff0');
  Sound.play('hit');
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  const g = game;
  const p = g.player;
  e.dead = true;
  g.kills++;
  Sound.play(e.type === 'boss' ? 'dieBoss' : e.type === 'elite' ? 'dieElite' : 'die');

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
    spawnParticles(e.x, e.y, '#f0f', 30, 8);
    return;
  }

  // Drop XP gems
  const gemCount = e.type === 'elite' ? 5 : 1;
  const xpEach = Math.ceil(e.xp / gemCount);
  for (let i = 0; i < gemCount; i++) {
    dropXpGem(e.x + rand(-15, 15), e.y + rand(-15, 15), xpEach,
              e.type === 'elite' ? '#fa0' : '#4af');
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
  if (p.hp <= 0) {
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