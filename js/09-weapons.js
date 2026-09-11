// ============================================================
// WEAPON SYSTEM
// ============================================================
function getWeaponStats(weapon) {
  const def = WEAPON_DEFS[weapon.id];
  const lvl = weapon.level;
  const g = game.player;
  switch (weapon.id) {
    case 'magicBolt':
      return {
        dmg: (def.baseDmg + 2 * (lvl - 1)) * g.dmgMult,
        speed: def.baseSpeed + lvl * 0.3,
        rate: def.baseRate * g.cdMult * Math.pow(0.92, lvl - 1),
        count: def.baseCount + Math.floor((lvl - 1) / 3),
        area: 0
      };
    case 'holyShield':
      return {
        dmg: (def.baseDmg + 3 * (lvl - 1)) * g.dmgMult,
        speed: 0, rate: 0,
        count: def.baseCount + (lvl - 1),
        area: (def.baseArea + 10 * (lvl - 1)) * g.areaMult
      };
    case 'lightning':
      return {
        dmg: (def.baseDmg + 4 * (lvl - 1)) * g.dmgMult,
        speed: 0,
        rate: def.baseRate * g.cdMult * Math.pow(0.93, lvl - 1),
        count: def.baseCount + Math.floor((lvl - 1) / 2),
        area: 0
      };
    case 'fireBlast':
      return {
        dmg: (def.baseDmg + 1 * (lvl - 1)) * g.dmgMult,
        speed: 0,
        rate: def.baseRate * g.cdMult * Math.pow(0.94, lvl - 1),
        count: 1,
        area: (def.baseArea + 15 * (lvl - 1)) * g.areaMult
      };
    case 'holyCross':
      return {
        dmg: (def.baseDmg + 2 * (lvl - 1)) * g.dmgMult,
        speed: def.baseSpeed + lvl * 0.2,
        rate: def.baseRate * g.cdMult * Math.pow(0.93, lvl - 1),
        count: def.baseCount + lvl - 1,
        area: 0
      };
    case 'chainSaw':
      return {
        dmg: (def.baseDmg + 2 * (lvl - 1)) * g.dmgMult,
        speed: 0, rate: 0, count: 1,
        area: (def.baseArea + 6 * (lvl - 1)) * g.areaMult
      };
    case 'poisonCloud':
      return {
        dmg: (def.baseDmg + 2 * (lvl - 1)) * g.dmgMult,
        speed: 0,
        rate: def.baseRate * g.cdMult * Math.pow(0.93, lvl - 1),
        count: 1,
        area: (def.baseArea + 10 * (lvl - 1)) * g.areaMult
      };
    case 'boomerang':
      return {
        dmg: (def.baseDmg + 3 * (lvl - 1)) * g.dmgMult,
        speed: def.baseSpeed + lvl * 0.3,
        rate: def.baseRate * g.cdMult * Math.pow(0.93, lvl - 1),
        count: Math.min(4, lvl),
        area: 0
      };
    case 'turret':
      return {
        dmg: (def.baseDmg + 2 * (lvl - 1)) * g.dmgMult,
        speed: 0, rate: 0,
        count: lvl,             // how many turrets may coexist
        area: 0
      };
    case 'voidRift':
      return {
        dmg: def.baseDmg * g.dmgMult,
        speed: 0,
        rate: def.baseRate * g.cdMult * Math.pow(0.85, lvl - 1),
        count: 1,
        area: (def.baseArea + 15 * (lvl - 1)) * g.areaMult
      };
  }
}

function fireWeapons() {
  const g = game;
  const p = g.player;
  const now = g.time;

  for (const w of p.weapons) {
    const stats = getWeaponStats(w);
    w.stats = stats;

    // Stellar fires one star per sub-interval, each shot in a fresh
    // direction (rotating the firing angle by a fixed step every time)
    // instead of a burst all at once.
    if (w.id === 'holyCross') {
      w.lastFired = now;
      const STEP_ANGLE = Math.PI / 18;               // +10 degrees per shot
      const step = Math.max(4, (stats.rate || 1) / stats.count);
      if (w.subT === undefined) { w.subT = 0; w.spin = rand(0, PI2); }
      if (w.subT <= now) {
        const a = w.spin;
        w.spin = (w.spin + STEP_ANGLE) % PI2;
        createProjectile(
          p.x + Math.cos(a) * 10, p.y + Math.sin(a) * 10,
          Math.cos(a) * stats.speed, Math.sin(a) * stats.speed,
          stats.dmg, 7, '#aef3ff', 2500, 3, 0, 'cross', true
        );
        Sound.play('shootAlt');
        p.attackPulse = 1;
        w.subT += step;
      }
      if (w.subT < now) w.subT = now;
      continue;
    }

    if (now - w.lastFired < (w.stats?.rate || 0)) continue;

    switch (w.id) {
      case 'magicBolt': {
        w.lastFired = now;
        const nearby = g.enemyGrid.query(p.x, p.y, 600);
        if (nearby.length === 0) break;
        // Lead shots based on enemy velocity: aim where the enemy will be
        const boltPps = stats.speed * 60;          // projectile px/s
        const scored = nearby.map(tgt => {
          const d = dist(p, tgt);
          const t = d / boltPps;
          const px2 = tgt.x + (tgt.vx || 0) * t;
          const py2 = tgt.y + (tgt.vy || 0) * t;
          return { tgt, px: px2, py: py2, d: dist(p, { x: px2, y: py2 }) };
        });
        scored.sort((a, b) => a.d - b.d);
        for (let i = 0; i < stats.count && i < scored.length; i++) {
          const { px, py } = scored[i];
          const a = Math.atan2(py - p.y, px - p.x);
          createProjectile(
            p.x + Math.cos(a) * 15, p.y + Math.sin(a) * 15,
            Math.cos(a) * stats.speed, Math.sin(a) * stats.speed,
            stats.dmg, 5, '#7ec8ff', 2000, 0, 0, 'bolt', true
          );
        }
        Sound.play('shoot');
        p.attackPulse = 1;
        break;
      }
      case 'lightning': {
        w.lastFired = now;
        const nearby = g.enemyGrid.query(p.x, p.y, 500);
        if (nearby.length === 0) break;
        nearby.sort((a, b) => dist(p, a) - dist(p, b));
        for (let i = 0; i < stats.count && i < nearby.length; i++) {
          const target = nearby[i];
          damageEnemy(target, stats.dmg);
          g.lightningEffects.push({
            x1: p.x, y1: p.y, x2: target.x, y2: target.y,
            life: 150, maxLife: 150, color: '#ff0'
          });
          spawnParticles(target.x, target.y, '#ff0', 5, 3);
        }
        Sound.play('lightning');
        p.attackPulse = 1;
        break;
      }
      case 'fireBlast': {
        w.lastFired = now;
        const nearby = g.enemyGrid.query(p.x, p.y, stats.area);
        for (const e of nearby) {
          if (dist(p, e) <= stats.area) {
            damageEnemy(e, stats.dmg);
          }
        }
        spawnParticles(p.x, p.y, '#f80', 20, 6);
        spawnParticles(p.x, p.y, '#ff0', 15, 8);
        g.particles.push({
          x: p.x, y: p.y, radius: stats.area,
          color: 'rgba(255,120,0,0.3)', life: 300, maxLife: 300,
          type: 'shockwave'
        });
        Sound.play('blast');
        p.attackPulse = 1;
        break;
      }
      case 'holyShield': {
        // Handled in update via orbit
        break;
      }
      case 'chainSaw': {
        // Continuous saw: enemies take damage only when touching the ring
        // itself (the spinning blade) or the protruding spikes.
        const ringR = stats.area;
        const spikeLen = 16;          // how far the teeth stick out
        const bandHalf = 7;           // half-thickness of the blade band
        const teeth = 18;
        const sawSpin = now * 0.02;   // must match the render rotation speed
        const nearby = g.enemyGrid.query(p.x, p.y, ringR + spikeLen + 24);
        if (!w.hitCooldown) w.hitCooldown = {};
        for (const e of nearby) {
          if (e.dead) continue;
          const d = dist(p, e);
          let hit = false;
          // Blade band: the enemy's body overlaps the thin spinning ring
          if (Math.abs(d - ringR) <= bandHalf + e.radius) {
            hit = true;
          } else if (d <= ringR + spikeLen + e.radius) {
            // Spike tips: enemy must also be in the angular wedge of a tooth
            const ang = Math.atan2(e.y - p.y, e.x - p.x);
            const rel = ((ang - sawSpin) % PI2 + PI2) % PI2;
            const diff = Math.abs(rel - Math.round(rel / (PI2 / teeth)) * (PI2 / teeth));
            if (diff < 0.16 && d > ringR - bandHalf) hit = true;
          }
          if (!hit) continue;
          const eid = e._id || (e._id = Math.random());
          if (!w.hitCooldown[eid] || now - w.hitCooldown[eid] > 120) {
            w.hitCooldown[eid] = now;
            damageEnemy(e, stats.dmg, p.x, p.y, true);   // silent: saw plays its own hit sound
            Sound.play('sawHit');
          }
        }
        break;
      }
      case 'poisonCloud': {
        w.lastFired = now;
        if (g.clouds.length >= 8) g.clouds.shift();
        g.clouds.push({
          x: p.x, y: p.y,
          radius: stats.area,
          dmg: stats.dmg,
          life: 4500, maxLife: 4500, tickTimer: 0
        });
        Sound.play('shootAlt');
        p.attackPulse = 1;
        break;
      }
      case 'boomerang': {
        w.lastFired = now;
        const nbx = g.enemyGrid.query(p.x, p.y, 600);
        let ta = p.facingAngle || 0;
        if (nbx.length) {
          nbx.sort((a, b) => dist(p, a) - dist(p, b));
          ta = angleTo(p, nbx[0]);
        }
        for (let i = 0; i < stats.count; i++) {
          const a = ta + (i - (stats.count - 1) / 2) * 0.35;
          createProjectile(
            p.x + Math.cos(a) * 12, p.y + Math.sin(a) * 12,
            Math.cos(a) * stats.speed, Math.sin(a) * stats.speed,
            stats.dmg, 6, '#7fde7f', 3500, 99, 0, 'circle', true,
            { boomerang: true, maxOut: 240 + w.level * 25 }
          );
        }
        Sound.play('shoot');
        p.attackPulse = 1;
        break;
      }
      case 'turret': {
        w.lastFired = now;
        if (g.turrets.length < stats.count) {
          g.turrets.push({
            x: p.x, y: p.y,
            dmg: stats.dmg, rate: 700,
            life: 8000, maxLife: 8000, fireTimer: 0, aim: rand(0, PI2)
          });
        }
        p.attackPulse = 1;
        break;
      }
      case 'voidRift': {
        w.lastFired = now;
        g.rifts.push({
          x: p.x, y: p.y,
          radius: stats.area,
          dmg: stats.dmg,
          life: 2200, maxLife: 2200, tickTimer: 0
        });
        Sound.play('blast');
        p.attackPulse = 1;
        break;
      }
    }
  }
}

// ============================================================
// SHIELD ORBIT UPDATE
// ============================================================
function updateShieldOrbit() {
  const g = game;
  const p = g.player;
  for (const w of p.weapons) {
    if (w.id !== 'holyShield') continue;
    const stats = getWeaponStats(w);
    w.stats = stats;
    const baseAngle = g.time * 0.003;
    for (let i = 0; i < stats.count; i++) {
      const a = baseAngle + (PI2 / stats.count) * i;
      const ox = p.x + Math.cos(a) * stats.area;
      const oy = p.y + Math.sin(a) * stats.area;
      const nearby = g.enemyGrid.query(ox, oy, 30);
      for (const e of nearby) {
        if (dist({ x: ox, y: oy }, e) < e.radius + 15) {
          if (!w.hitCooldown) w.hitCooldown = {};
          const eid = e._id || (e._id = Math.random());
          if (!w.hitCooldown[eid] || g.time - w.hitCooldown[eid] > 300) {
            damageEnemy(e, stats.dmg);
            w.hitCooldown[eid] = g.time;
            spawnParticles(ox, oy, '#ffa', 3, 2);
            Sound.play('shieldHit');
          }
        }
      }
      // Draw handled in render
      if (!w.orbs) w.orbs = [];
      w.orbs[i] = { x: ox, y: oy };
    }
  }
}

// ============================================================
// NEW WEAPON SUBSYSTEMS (clouds, turrets, rifts)
// ============================================================

// --- Poison clouds: stationary DoT zones ---
function updateClouds(dt, dtSec) {
  const g = game;
  for (let i = g.clouds.length - 1; i >= 0; i--) {
    const c = g.clouds[i];
    c.life -= dt;
    if (c.life <= 0) { g.clouds.splice(i, 1); continue; }
    c.tickTimer -= dt;
    if (c.tickTimer <= 0) {
      c.tickTimer = 500;
      const nb = g.enemyGrid.query(c.x, c.y, c.radius + 20);
      for (const e of nb) {
        if (e.dead || dist(c, e) > c.radius + e.radius) continue;
        damageEnemy(e, c.dmg, c.x, c.y);
      }
    }
  }
}

// --- Turrets: deployable auto-firing defenses ---
function updateTurrets(dt, dtSec) {
  const g = game;
  for (let i = g.turrets.length - 1; i >= 0; i--) {
    const t = g.turrets[i];
    t.life -= dt;
    if (t.life <= 0) { g.turrets.splice(i, 1); continue; }
    const nb = g.enemyGrid.query(t.x, t.y, 400);
    let target = null, best = Infinity;
    for (const e of nb) {
      if (e.dead) continue;
      const d = dist(t, e);
      if (d < best) { best = d; target = e; }
    }
    if (target) {
      t.aim += wrapAngle(angleTo(t, target) - t.aim) * 0.3;
      t.fireTimer -= dt;
      if (t.fireTimer <= 0) {
        t.fireTimer = t.rate;
        const a = t.aim + rand(-0.06, 0.06);
        createProjectile(t.x, t.y, Math.cos(a) * 7, Math.sin(a) * 7,
          t.dmg, 4, '#ffc078', 1600, 0, 0, 'circle', false);
        Sound.play('shootAlt');
      }
    }
  }
}

// --- Void rifts: pull enemies toward their core while draining them ---
function updateRifts(dt, dtSec) {
  const g = game;
  for (let i = g.rifts.length - 1; i >= 0; i--) {
    const r = g.rifts[i];
    r.life -= dt;
    if (r.life <= 0) { g.rifts.splice(i, 1); continue; }
    const nb = g.enemyGrid.query(r.x, r.y, r.radius + 40);
    for (const e of nb) {
      if (e.dead) continue;
      const d = dist(r, e);
      if (d > r.radius + e.radius) continue;
      const a = angleTo(e, r);
      const falloff = 1 - d / (r.radius + 40);
      const pull = 150 * dtSec * (0.4 + 0.6 * falloff);
      const nx = e.x + Math.cos(a) * pull;
      const ny = e.y + Math.sin(a) * pull;
      if (!circleBlocked(nx, ny, Math.max(3, e.radius * 0.4))) { e.x = nx; e.y = ny; }
    }
    r.tickTimer -= dt;
    if (r.tickTimer <= 0) {
      r.tickTimer = 400;
      for (const e of nb) {
        if (e.dead || dist(r, e) > r.radius + e.radius) continue;
        damageEnemy(e, r.dmg * 1.5, r.x, r.y);
      }
    }
  }
}