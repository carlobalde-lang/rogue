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
        break;
      }
      case 'holyShield': {
        // Handled in update via orbit
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