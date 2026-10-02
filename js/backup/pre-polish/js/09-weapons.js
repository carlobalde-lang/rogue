// ============================================================
// WEAPON SYSTEM
// ============================================================
// Area scaling with diminishing returns: the areaMult stat (Growth, Inferno,
// biome elite bonuses) still helps, but can't inflate weapon radii into
// screen-wide blobs. At 506% area the multiplier is ~2.62x instead of 5.06x.
function effectiveArea(baseArea) {
  const am = game.player.areaMult;
  return baseArea * (1 + 0.4 * (am - 1));
}

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
        area: effectiveArea(def.baseArea + 10 * (lvl - 1))
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
        area: effectiveArea(def.baseArea + 15 * (lvl - 1))
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
        area: effectiveArea(def.baseArea + 6 * (lvl - 1))
      };
    case 'poisonCloud':
      return {
        dmg: (def.baseDmg + 2 * (lvl - 1)) * g.dmgMult,
        speed: 0,
        rate: def.baseRate * g.cdMult * Math.pow(0.93, lvl - 1),
        count: 1,
        area: effectiveArea(def.baseArea + 10 * (lvl - 1))
      };
    case 'boomerang':
      return {
        dmg: (def.baseDmg + 3 * (lvl - 1)) * g.dmgMult,
        speed: def.baseSpeed + lvl * 0.3,
        rate: def.baseRate * g.cdMult * Math.pow(0.93, lvl - 1),
        count: 1 + Math.floor((lvl - 1) / 3),   // grows slowly, no hard cap
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
        area: effectiveArea(def.baseArea + 15 * (lvl - 1))
      };
    case 'frostNova':
      return {
        dmg: (def.baseDmg + 2 * (lvl - 1)) * g.dmgMult,
        speed: 0,
        rate: def.baseRate * g.cdMult * Math.pow(0.94, lvl - 1),
        count: 1,
        area: effectiveArea(def.baseArea + 18 * (lvl - 1))
      };
    case 'bloodScythe':
      return {
        dmg: (def.baseDmg + 3 * (lvl - 1)) * g.dmgMult,
        speed: 0,
        rate: def.baseRate * g.cdMult * Math.pow(0.93, lvl - 1),
        count: 1,
        area: effectiveArea(def.baseArea + 15 * (lvl - 1))
      };
    case 'familiar':
      return {
        dmg: (def.baseDmg + 1 * (lvl - 1)) * g.dmgMult,
        speed: 0,
        rate: def.baseRate * g.cdMult * Math.pow(0.92, lvl - 1),
        count: 1 + Math.floor((lvl - 1) / 3),   // orbiting drones, slow growth
        area: 0
      };
    case 'whipChain':
      return {
        dmg: (def.baseDmg + 3 * (lvl - 1)) * g.dmgMult,
        speed: 0,
        rate: def.baseRate * g.cdMult * Math.pow(0.92, lvl - 1),
        count: 1,
        area: effectiveArea(def.baseArea + 15 * (lvl - 1))
      };
    case 'mirrorShard':
      return {
        dmg: (def.baseDmg + 2 * (lvl - 1)) * g.dmgMult,
        speed: def.baseSpeed + lvl * 0.2,
        rate: def.baseRate * g.cdMult * Math.pow(0.93, lvl - 1),
        count: def.baseCount + Math.floor((lvl - 1) / 2),
        area: 0
      };
  }
}

// Where the staff's crystal tip sits, in WORLD coords — mirrors renderPlayer's
// side-flip (staff swaps side when facing LEFT) so projectiles really come out
// of the cane. `alongA` nudges the spawn a few px along the shot for a clean exit.
function staffTipPos(p, alongA) {
  let side = 1;
  const spd = Math.hypot(p.velX, p.velY);
  let dx = p.velX, dy = p.velY;
  if (spd <= 0.4) { dx = Math.cos(p.renderAngle); dy = Math.sin(p.renderAngle); }
  if (Math.abs(dx) > Math.abs(dy) && dx < 0) side = -1;
  const tipX = p.x + side * 17;
  const tipY = p.y - 20;
  return {
    x: tipX + Math.cos(alongA) * 5,
    y: tipY + Math.sin(alongA) * 5
  };
}

function fireWeapons() {
  const g = game;
  const p = g.player;
  const now = g.time;

  for (const w of p.weapons) {
    const stats = getWeaponStats(w);
    w.stats = stats;
    if (window.runLog) runLog.setSource(w.id);

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
        const tip = staffTipPos(p, a);
        createProjectile(
          tip.x, tip.y,
          Math.cos(a) * stats.speed, Math.sin(a) * stats.speed,
          stats.dmg, 7, '#aef3ff', 2500, 3, 0, 'cross', true
        );
        Sound.play('shootAlt');
        p.attackPulse = 1;
        w.subT += step;
      }
      if (w.subT < now) w.subT = now + step;   // never == now, or the next frame re-fires
      continue;
    }

    // Overload: cooldown weapons charge faster — each stack grants a flat +25%
    // attack speed (shorter reload, no burst or catch-up penalty).
    const rateNow = (stats.rate > 0 && p.overload > 0) ? stats.rate / (1 + p.overload * 0.25) : (stats.rate || 0);
    if (now - w.lastFired < rateNow) continue;

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
          // Aim straight from the staff tip (not the body centre) to the
          // predicted point, so the dart leaves the cane on-target.
          const a0 = Math.atan2(py - p.y, px - p.x);
          const boltTip = staffTipPos(p, a0);
          const a = Math.atan2(py - boltTip.y, px - boltTip.x);
          createProjectile(
            boltTip.x, boltTip.y,
            Math.cos(a) * stats.speed, Math.sin(a) * stats.speed,
            stats.dmg, 5, '#9cffc8', 2000, 0, 0, 'bolt', true
          );
          spawnParticles(boltTip.x, boltTip.y, '#c6ffe2', 3, 2.5);
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
        if (GFX.shockwaves) {
        g.particles.push({
          x: p.x, y: p.y, radius: stats.area,
          color: 'rgba(255,120,0,0.3)', life: 300, maxLife: 300,
          type: 'shockwave'
        });
      }
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
          src: (window.runLog && runLog.currentSrc) || 'poisonCloud',
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
          // Aim from the staff tip to the target so the arc leaves on-target.
          const t0 = nbx[0];
          const a0 = angleTo(p, t0);
          const boomAnchor = staffTipPos(p, a0);
          ta = angleTo(boomAnchor, t0);
        }
        for (let i = 0; i < stats.count; i++) {
          const a = ta + (i - (stats.count - 1) / 2) * 0.35;
          const boomTip = staffTipPos(p, a);
          createProjectile(
            boomTip.x, boomTip.y,
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
          // Place each turret away from the player and away from the others so
          // they never stack on top of each other while standing still.
          let tx = p.x, ty = p.y;
          for (let k = 0; k < 10; k++) {
            const a = rand(0, PI2);
            const d = rand(30, 60);
            const cx2 = p.x + Math.cos(a) * d;
            const cy2 = p.y + Math.sin(a) * d;
            const stacked = g.turrets.some(t => dist(t, { x: cx2, y: cy2 }) < 26);
            if (!stacked && getTile(cx2, cy2) !== T_WALL) { tx = cx2; ty = cy2; break; }
          }
          g.turrets.push({
            x: tx, y: ty,
            dmg: stats.dmg, rate: 700,
            src: (window.runLog && runLog.currentSrc) || 'turret',
            life: 8000, maxLife: 8000, fireTimer: 0, aim: rand(0, PI2)
          });
        }
        p.attackPulse = 1;
        break;
      }
      case 'voidRift': {
        w.lastFired = now;
        // Always open BEHIND the player, so its pull drags enemies away from
        // the front instead of hauling the horde toward them.
        let placed = false;
        const back = p.renderAngle + Math.PI;
        for (let k = 0; k < 6; k++) {
          const a = back + rand(-0.35, 0.35);
          const d = rand(115, 175);
          const rx = p.x + Math.cos(a) * d;
          const ry = p.y + Math.sin(a) * d;
          if (getTile(rx, ry) === T_WALL) continue;
          g.rifts.push({
            x: rx, y: ry,
            radius: stats.area,
            dmg: stats.dmg,
            src: (window.runLog && runLog.currentSrc) || 'voidRift',
            life: 2200, maxLife: 2200, tickTimer: 0
          });
          placed = true;
          break;
        }
        // Tight corner: fall back to any free spot near the player so the
        // rift still fires rather than silently doing nothing.
        if (!placed) {
          for (let k = 0; k < 12; k++) {
            const a = rand(0, PI2);
            const d = rand(70, 110);
            const rx = p.x + Math.cos(a) * d;
            const ry = p.y + Math.sin(a) * d;
            if (getTile(rx, ry) === T_WALL) continue;
            g.rifts.push({
              x: rx, y: ry,
              radius: stats.area,
              dmg: stats.dmg,
              src: (window.runLog && runLog.currentSrc) || 'voidRift',
              life: 2200, maxLife: 2200, tickTimer: 0
            });
            break;
          }
        }
        Sound.play('blast');
        p.attackPulse = 1;
        break;
      }
      case 'frostNova': {
        w.lastFired = now;
        const fnb = g.enemyGrid.query(p.x, p.y, stats.area);
        for (const e of fnb) {
          if (e.dead || dist(p, e) > stats.area + e.radius) continue;
          damageEnemy(e, stats.dmg, p.x, p.y);
          applySlow(e, 0.6, 1600);       // slows, does not impede pathing
        }
        spawnParticles(p.x, p.y, '#8ff', 14, 5);
        spawnParticles(p.x, p.y, '#dff', 8, 6);
        g.particles.push({
          x: p.x, y: p.y, radius: stats.area,
          color: 'rgba(120,220,255,0.35)', life: 380, maxLife: 380,
          type: 'nova'
        });
        Sound.play('blast');
        p.attackPulse = 1;
        break;
      }
      case 'bloodScythe': {
        w.lastFired = now;
        const ta = p.facingAngle || p.renderAngle;
        const arcHalf = 1.15;                 // ~66° arc in front
        const reach = stats.area;
        const missing = 1 - Math.min(1, p.hp / Math.max(1, p.maxHp));
        const bonus = 1 + missing * 1.5;      // up to 2.5x at 1 HP
        const scc = g.enemyGrid.query(p.x, p.y, reach + 30);
        const struck = [];
        for (const e of scc) {
          if (e.dead) continue;
          const d = dist(p, e);
          if (d > reach + e.radius) continue;
          const ang = Math.atan2(e.y - p.y, e.x - p.x);
          if (Math.abs(wrapAngle(ang - ta)) > arcHalf) continue;
          damageEnemy(e, stats.dmg * bonus, p.x, p.y);
          struck.push(e);
        }
        // Crimson slash arc sweeping in front of the player
        g.particles.push({
          x: p.x, y: p.y, radius: Math.max(20, reach),
          a0: ta - arcHalf, a1: ta + arcHalf,
          color: '#f66', life: 190, maxLife: 190, type: 'arc'
        });
        // Blood spray where the edge actually connected
        if (struck.length) {
          const spray = struck.length <= 4 ? struck : struck.slice(0, 4);
          for (const se of spray) spawnParticles(se.x, se.y, '#ff5d64', 4, 3);
        }
        if (struck.length > 0) Sound.play('sawHit'); else Sound.play('shoot');
        p.attackPulse = 1;
        break;
      }
      case 'familiar': {
        // Handled in update via orbiting drones
        break;
      }
      case 'whipChain': {
        w.lastFired = now;
        const wta = p.facingAngle || p.renderAngle;
        const reach = stats.area;
        const halfW = 26;                     // lash thickness
        const tipX = p.x + Math.cos(wta) * reach;
        const tipY = p.y + Math.sin(wta) * reach;
        const whb = g.enemyGrid.query(p.x, p.y, reach + halfW);
        for (const e of whb) {
          if (e.dead) continue;
          const d = dist(p, e);
          if (d > reach + e.radius + halfW) continue;
          const proj = (e.x - p.x) * Math.cos(wta) + (e.y - p.y) * Math.sin(wta);
          if (proj < -e.radius) continue;
          const px = p.x + Math.cos(wta) * proj;
          const py = p.y + Math.sin(wta) * proj;
          if (dist({ x: px, y: py }, e) > halfW + e.radius) continue;
          damageEnemy(e, stats.dmg, p.x, p.y);
        }
        g.particles.push({
          x: p.x, y: p.y, tx: tipX, ty: tipY,
          life: 180, maxLife: 180, color: '#ffd176', type: 'whip'
        });
        spawnParticles(tipX, tipY, '#ffd176', 6, 4);
        Sound.play('shoot');
        p.attackPulse = 1;
        break;
      }
      case 'mirrorShard': {
        w.lastFired = now;
        // Only living enemies make a worthy glass target — corpses would
        // swallow the first hit and make the shard look broken.
        const nearby = g.enemyGrid.query(p.x, p.y, 500).filter(e => !e.dead);
        if (nearby.length === 0) break;
        nearby.sort((a, b) => dist(p, a) - dist(p, b));
        const bounces = 3 + Math.floor(w.level / 3);   // slow, unbounded growth
        for (let i = 0; i < stats.count && i < nearby.length; i++) {
          const t = nearby[i];
          // Aim from the staff tip to the target so the first glass flight is
          // true; the ricochet then takes care of the cluster.
          const a0 = angleTo(p, t);
          const shardTip = staffTipPos(p, a0);
          const a = angleTo(shardTip, t);
          createProjectile(
            shardTip.x, shardTip.y,
            Math.cos(a) * stats.speed, Math.sin(a) * stats.speed,
            stats.dmg, 7, '#bcd0ff', 2600, 0, 0, 'shard', true,
            { bounces: bounces, bounceRange: 200 }
          );
          spawnParticles(shardTip.x, shardTip.y, '#bcd0ff', 5, 3.5);
        }
        Sound.play('shoot');
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
    if (window.runLog) runLog.setSource(w.id);
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
// FAMILIAR: autonomous drones that hunt the enemies nearest to the player
// and hover above them while firing.
// ============================================================
function updateFamiliar(dt) {
  const g = game;
  const p = g.player;
  for (const w of p.weapons) {
    if (w.id !== 'familiar') continue;
    const stats = getWeaponStats(w);
    w.stats = stats;
    if (window.runLog) runLog.setSource(w.id);
    if (!w.drones) w.drones = [];

    // Snapshot the enemies nearest to the PLAYER (drones share this pool and
    // spread across it by index instead of each scanning its own radius).
    const cands = [];
    g.enemyGrid.queryEach(p.x, p.y, 520, e => { if (!e.dead) cands.push(e); });
    cands.sort((a, b) => dist(p, a) - dist(p, b));

    for (let i = 0; i < stats.count; i++) {
      const dr = w.drones[i] || (w.drones[i] = { fireT: rand(0, 1600), aim: 0 });
      const tgt = cands.length ? cands[i % cands.length] : null;
      let tx, ty;
      if (tgt) {
        // Chase and hover over the boss of the target, gently bobbing so the
        // drones don't just stack in a single point.
        const hover = tgt.radius + 26 + Math.sin(g.time * 0.004 + i * 2.3) * 6;
        tx = tgt.x + Math.cos(g.time * 0.003 + i * 2.7) * 10;
        ty = tgt.y - hover;
      } else {
        // No enemies in sight: escort the player in a compact cluster above
        // the shoulder rather than orbiting away from the fight.
        tx = p.x + Math.cos(g.time * 0.0011 + i * 2.1) * 36;
        ty = p.y - 58 + Math.sin(g.time * 0.0011 + i * 2.1) * 8;
      }
      if (dr.x === undefined) { dr.x = tx; dr.y = ty; }   // no teleport on spawn
      const k = Math.min(1, dt * 0.004);                   // smooth fly-over
      dr.x = lerp(dr.x, tx, k);
      dr.y = lerp(dr.y, ty, k);

      if (tgt) {
        dr.aim += wrapAngle(angleTo(dr, tgt) - dr.aim) * 0.3;
        dr.fireT -= dt;
        if (dr.fireT <= 0) {
          dr.fireT = stats.rate;
          const fa = dr.aim + rand(-0.05, 0.05);
          createProjectile(dr.x, dr.y, Math.cos(fa) * 6.5, Math.sin(fa) * 6.5,
            stats.dmg, 3.5, '#6ff', 1500, 0, 0, 'circle', true);
          Sound.play('shootAlt');
        }
      }
    }
    if (w.drones.length > stats.count) w.drones = w.drones.slice(0, stats.count);
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
        damageEnemy(e, c.dmg, c.x, c.y, undefined, c.src || 'poisonCloud');
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
          t.dmg, 4, '#ffc078', 1600, 0, 0, 'circle', false,
          { src: t.src || 'turret' });
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
        damageEnemy(e, r.dmg * 1.5, r.x, r.y, undefined, r.src || 'voidRift');
      }
    }
  }
}