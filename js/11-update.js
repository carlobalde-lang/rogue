// ============================================================
// GAME LOOP UPDATES (split by subsystem)
// ============================================================

// --- Player movement, regen, camera, flow-field refresh ---
function updatePlayer(dt, dtSec) {
  const g = game;
  const p = g.player;

  let mx = 0, my = 0;
  // Keyboard
  if (g.input.up) my -= 1;
  if (g.input.down) my += 1;
  if (g.input.left) mx -= 1;
  if (g.input.right) mx += 1;
  // Touch joystick
  const joy = g.joystick;
  if (joy.active) {
    mx += joy.dx;
    my += joy.dy;
  }
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    if (len > 0.01) {
      mx /= len; my /= len;
      // Move per-axis and back off the failed axis -> wall sliding
      const stepX = mx * p.speed * dtSec;
      const stepY = my * p.speed * dtSec;
      const nx = p.x + stepX;
      if (!circleBlocked(nx, p.y, p.radius)) p.x = nx;
      const ny = p.y + stepY;
      if (!circleBlocked(p.x, ny, p.radius)) p.y = ny;
      p.facingAngle = Math.atan2(my, mx);
    }
  }

  // --- Flow field recompute (only when player moves to a new tile) ---
  const pTileX = Math.floor(p.x / TILE);
  const pTileY = Math.floor(p.y / TILE);
  if (pTileX !== ffCX || pTileY !== ffCY) {
    updateFlowField(p.x, p.y);
  }
  p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  p.hp = Math.min(p.maxHp, p.hp + p.regen * dtSec);

  // Camera
  g.camera.x = lerp(g.camera.x, p.x - VIEW_W / 2, 0.08);
  g.camera.y = lerp(g.camera.y, p.y - VIEW_H / 2, 0.08);
}

// --- Wave / elite / boss spawning timers ---
function updateSpawning(dt) {
  const g = game;

  g.waveTimer -= dt;
  if (g.waveTimer <= 0) {
    spawnWave();
    g.waveTimer = Math.max(800, 3000 - g.difficultyMult * 200) * (g.dev.waveIntervalMult || 1);
  }

  g.eliteTimer -= dt;
  if (g.eliteTimer <= 0) {
    const eliteCount = 1 + Math.floor(g.difficultyMult / 8);
    for (let i = 0; i < eliteCount; i++) spawnEnemy('elite');
    g.eliteTimer = Math.max(5000, 20000 - g.difficultyMult * 800) * (g.dev.eliteIntervalMult || 1);
  }

  g.bossTimer -= dt;
  if (g.bossTimer <= 0) {
    spawnEnemy('boss');
    spawnParticles(g.player.x, g.player.y, '#f0f', 30, 8);
    g.bossTimer = Math.max(90000, 180000 - g.difficultyMult * 3000) * (g.dev.bossIntervalMult || 1);
  }
}

// --- Enemy movement (flow-field steering, wall sliding, contact) ---
function updateEnemies(dt, dtSec) {
  const g = game;
  const p = g.player;

  for (let i = g.enemies.length - 1; i >= 0; i--) {
    const e = g.enemies[i];

    if (e.dead) { g.enemies.splice(i, 1); continue; }

    // Never visibly despawn enemies: if one drifts too far (large screens
    // can show the old 2000px removal radius), teleport it back to the
    // spawn ring instead of removing it.
    if (dist(e, p) > 2600) {
      const pos = findEnemySpawnPos();
      e.x = pos.x; e.y = pos.y;
      e.vx = 0; e.vy = 0;
      continue;
    }

    e.flashTimer = Math.max(0, e.flashTimer - dt);

    // --- Steering: flow-field path around walls. Always prefer the flow
    // field (it converges on the player's cell, so it stays correct even
    // when close); direct chase is only a fallback for unreachable cells.
    let vx, vy;
    const fdir = ffReady ? flowDirectionAt(e.x, e.y) : null;
    if (fdir && (fdir.dx !== 0 || fdir.dy !== 0) && fdir.cost < MAX_COST) {
      const fl = Math.hypot(fdir.dx, fdir.dy);
      vx = fdir.dx / fl;
      vy = fdir.dy / fl;
    } else {
      const a = angleTo(e, p);
      vx = Math.cos(a);
      vy = Math.sin(a);
    }

    // Move with substep per-axis wall sliding: small substeps let enemies
    // naturally round convex corners by sliding along one axis, then
    // transitioning when the wall ends.
    const spd = e.speed * dtSec;
    // Pathing radius shrinks with size so big enemies can still squeeze
    // through 1-tile doorways; collision is approximate, not visual.
    const hitR = Math.max(3, Math.min(e.radius * 0.4, 10));
    // Deflect steering around 90-degree corners BEFORE moving.
    const defl = deflectSteering(e, vx, vy, hitR);
    vx = defl.dx; vy = defl.dy;
    e.prevX = e.x; e.prevY = e.y;
    const substeps = Math.max(2, Math.ceil(spd / 8));
    const subSpd = spd / substeps;
    for (let s = 0; s < substeps; s++) {
      // While slide memory is active, keep rounding the corner along the
      // same tangent instead of being re-pushed into the vertex every step
      let mvx = vx, mvy = vy;
      if (e._slideN > 0) {
        e._slideN--;
        mvx = Math.cos(e._slideA);
        mvy = Math.sin(e._slideA);
      }
      const sx = e.x + mvx * subSpd;
      const sy = e.y + mvy * subSpd;
      const sBlockedX = circleBlocked(sx, e.y, hitR);
      const sBlockedY = circleBlocked(e.x, sy, hitR);
      if (!sBlockedX) e.x = sx;
      if (!sBlockedY) e.y = sy;
      // A fully jammed substep = a hard corner. Try the remembered slide
      // direction first, then both wall tangents, then a widening fan so the
      // enemy hugs the wall instead of vibrating against the corner point.
      if (sBlockedX && sBlockedY) {
        const baseA = Math.atan2(vy, vx);
        const cands = [];
        if (e._slideA !== undefined) cands.push(e._slideA);
        cands.push(baseA + Math.PI * 0.5, baseA - Math.PI * 0.5);
        for (const off of [0.25, -0.25, 0.6, -0.6, 1.0, -1.0, Math.PI / 3, -Math.PI / 3]) cands.push(baseA + off);
        let emerged = false;
        for (let k = 0; k < cands.length && !emerged; k++) {
          const a = cands[k];
          const fx = e.x + Math.cos(a) * subSpd * 1.5;
          const fy = e.y + Math.sin(a) * subSpd * 1.5;
          if (!circleBlocked(fx, fy, hitR)) {
            e.x = fx; e.y = fy;
            e._slideA = a;
            e._slideN = substeps - s - 1;
            emerged = true;
          }
        }
        if (!emerged) {
          const rx = e.x - mvx * subSpd;
          const ry = e.y - mvy * subSpd;
          if (!circleBlocked(rx, ry, hitR)) { e.x = rx; e.y = ry; }
          e._slideN = 0;
        }
      }
    }

    // Track velocity (smoothed) for predictive aiming
    if (e.prevX !== undefined) {
      const evx = (e.x - e.prevX) / dtSec;
      const evy = (e.y - e.prevY) / dtSec;
      e.vx = (e.vx || 0) * 0.6 + evx * 0.4;
      e.vy = (e.vy || 0) * 0.6 + evy * 0.4;
    }

    // Contact damage
    if (dist(e, p) < e.radius + p.radius) {
      damagePlayer(e.damage);
    }
  }

  // --- Rebuild spatial grid (after removing dead enemies) ---
  g.enemyGrid.clear();
  for (const e of g.enemies) g.enemyGrid.insert(e);

  // --- Enemy separation: push overlapping enemies apart so they don't
  // clump into a jammed blob that gets stuck at walls and door gaps ---
  for (let si = 0; si < g.enemies.length; si++) {
    const a = g.enemies[si];
    if (a.dead) continue;
    const nb = g.enemyGrid.query(a.x, a.y, a.radius * 2);
    for (const b of nb) {
      if (b === a || b.dead) continue;
      const ddx = a.x - b.x;
      const ddy = a.y - b.y;
      const d2 = ddx * ddx + ddy * ddy;
      const min = a.radius + b.radius;
      if (d2 < min * min && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const push = (min - d) * 0.5;
        const ux = ddx / d, uy = ddy / d;
        const ax2 = a.x + ux * push, ay2 = a.y + uy * push;
        const bx2 = b.x - ux * push, by2 = b.y - uy * push;
        // Apply push only if it doesn't shove anyone into a wall
        if (!circleBlocked(ax2, ay2, a.radius * 0.4)) { a.x = ax2; a.y = ay2; }
        if (!circleBlocked(bx2, by2, b.radius * 0.4)) { b.x = bx2; b.y = by2; }
      }
    }
  }

  // --- Resolve enemies stuck inside walls (separation can push them in) ---
  for (let i = 0; i < g.enemies.length; i++) {
    const e = g.enemies[i];
    if (e.dead) continue;
    const hr = Math.max(3, Math.min(e.radius * 0.4, 10));
    if (!circleBlocked(e.x, e.y, hr)) continue;
    // Probe outward until the enemy's collision circle is clear
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * PI2;
      const tx2 = e.x + Math.cos(a) * 6;
      const ty2 = e.y + Math.sin(a) * 6;
      if (!circleBlocked(tx2, ty2, hr)) { e.x = tx2; e.y = ty2; break; }
    }
  }
}

// --- Projectiles: move, trail, hit detection ---
function updateProjectiles(dt, dtSec) {
  const g = game;
  const p = g.player;

  for (let i = g.projectiles.length - 1; i >= 0; i--) {
    const pr = g.projectiles[i];
    pr.prevX = pr.x;
    pr.prevY = pr.y;
    pr.x += pr.vx * dtSec * 60;
    pr.y += pr.vy * dtSec * 60;
    pr.rot = Math.atan2(pr.vy, pr.vx);
    pr.life -= dt;
    if (pr.life <= 0) { g.projectiles.splice(i, 1); continue; }

    // Emit trail particles
    if (pr.trail) {
      pr.trailTimer -= dt;
      if (pr.trailTimer <= 0) {
        pr.trailTimer = 40;
        g.particles.push({
          x: pr.x, y: pr.y,
          vx: rand(-10, 10), vy: rand(-10, 10),
          radius: pr.radius * 0.8, color: pr.color,
          life: 250, maxLife: 250, type: 'dot'
        });
      }
    }

    // Hit enemies
    const nearby = g.enemyGrid.query(pr.x, pr.y, pr.radius + 20);
    for (const e of nearby) {
      if (pr.hitEnemies.has(e)) continue;
      if (dist(pr, e) < e.radius + pr.radius) {
        damageEnemy(e, pr.dmg);
        pr.hitEnemies.add(e);
        if (pr.areaEffect > 0) {
          const affected = g.enemyGrid.query(pr.x, pr.y, pr.areaEffect * p.areaMult);
          for (const ae of affected) {
            if (ae !== e && dist(pr, ae) < pr.areaEffect * p.areaMult) {
              damageEnemy(ae, pr.dmg * 0.5);
            }
          }
        }
        if (pr.pierce <= 0) { g.projectiles.splice(i, 1); break; }
        pr.pierce--;
      }
    }
  }
}

// --- XP gem clustering: small gems are pulled toward & merged into big ones ---
function updateXpClustering(dtSec) {
  const g = game;
  if (g.pickups.length <= 1) return;
  const dead = new Set();
  for (let i = 0; i < g.pickups.length; i++) {
    const a = g.pickups[i];
    if (a.type !== 'xp' || dead.has(a)) continue;
    for (let j = i + 1; j < g.pickups.length; j++) {
      const b = g.pickups[j];
      if (b.type !== 'xp' || dead.has(b)) continue;
      const dd = dist(a, b);
      if (dd < (a.radius + b.radius) * 1.6 + 10) {
        // merge the smaller into the bigger gem
        const big = a.xp >= b.xp ? a : b;
        const small = big === a ? b : a;
        big.xp += small.xp;
        big.radius = Math.min(14, 5 + Math.sqrt(big.xp / 3));
        // Blend toward dominant colour
        if (small.xp > big.xp * 2) big.color = small.color;
        dead.add(small);
      } else if (dd < 130) {
        // Pull the smaller gem toward the bigger one so they eventually meet
        const big = a.xp >= b.xp ? a : b;
        const small = big === a ? b : a;
        const ang = angleTo(small, big);
        const pull = Math.min(90 * dtSec, dd * 0.15);
        // Avoid pulling gems into walls
        const nx = small.x + Math.cos(ang) * pull;
        const ny = small.y + Math.sin(ang) * pull;
        if (getTile(nx, ny) !== T_WALL) { small.x = nx; small.y = ny; }
      }
    }
  }
  if (dead.size > 0) g.pickups = g.pickups.filter(pk => !dead.has(pk));
}

// --- Pickups: magnet attraction + collection ---
function updatePickups(dt, dtSec) {
  const g = game;
  const p = g.player;

  g.pickupGrid.clear();
  for (const pk of g.pickups) g.pickupGrid.insert(pk);

  for (let i = g.pickups.length - 1; i >= 0; i--) {
    const pk = g.pickups[i];
    // XP gems never despawn; other pickups keep their life timer
    if (pk.type !== 'xp') {
      pk.life -= dt;
      if (pk.life <= 0) { g.pickups.splice(i, 1); continue; }
    }

    const d = dist(pk, p);
    if (d < p.pickupRange) {
      pk.magnetSpeed = Math.min(pk.magnetSpeed + 500 * dtSec, 600);
      const a = angleTo(pk, p);
      pk.x += Math.cos(a) * pk.magnetSpeed * dtSec;
      pk.y += Math.sin(a) * pk.magnetSpeed * dtSec;
    }
    if (d < p.radius + pk.radius) {
      gainXp(pk.xp);
      Sound.play(pk.type === 'xp' ? 'gem' : 'select');
      g.pickups.splice(i, 1);
    }
  }
}

// --- Particles, floating text, lightning feedback ---
function updateEffects(dt, dtSec) {
  const g = game;

  for (let i = g.particles.length - 1; i >= 0; i--) {
    const pt = g.particles[i];
    pt.life -= dt;
    if (pt.life <= 0) { g.particles.splice(i, 1); continue; }
    if (pt.type === 'dot') {
      pt.x += (pt.vx || 0) * dtSec;
      pt.y += (pt.vy || 0) * dtSec;
      pt.vx *= 0.95;
      pt.vy *= 0.95;
    }
  }

  for (let i = g.floatingTexts.length - 1; i >= 0; i--) {
    const ft = g.floatingTexts[i];
    ft.life -= dt;
    ft.y += ft.vy * dtSec;
    if (ft.life <= 0) g.floatingTexts.splice(i, 1);
  }

  for (let i = g.lightningEffects.length - 1; i >= 0; i--) {
    g.lightningEffects[i].life -= dt;
    if (g.lightningEffects[i].life <= 0) g.lightningEffects.splice(i, 1);
  }
}

// ============================================================
// MAIN UPDATE
// ============================================================
function update(dt) {
  const g = game;
  if (!g.running || g.paused || g.gameOver) return;

  dt *= g.dev.timeScale || 1;
  const dtSec = dt / 1000;
  g.time += dt;

  const lvl = g.player.level;
  // Base difficulty: time-based + linear level scaling (0.15/level).
  // After level 15 the level term accelerates quadratically, making the
  // horde reliably tougher in the late game.
  const lvlTerm = lvl <= 15 ? lvl * 0.15 : 15 * 0.15 + (lvl - 15) * (lvl - 15) * 0.25;
  g.difficultyMult = (g.dev.difficultyOverride > 0)
    ? g.dev.difficultyOverride
    : 1 + (g.time / 60000) * (1 + g.time / 300000) + lvlTerm;

  updatePlayer(dt, dtSec);
  updateSpawning(dt);
  updateEnemies(dt, dtSec);
  fireWeapons();
  updateShieldOrbit();
  updateProjectiles(dt, dtSec);
  updateXpClustering(dtSec);
  updatePickups(dt, dtSec);
  updateEffects(dt, dtSec);

  // Cap arrays for performance
  if (g.particles.length > 500) g.particles.splice(0, g.particles.length - 500);
  if (g.enemies.length > g.dev.enemyCap) {
    // Cull the FARTHEST enemies, never the ones close to the player —
    // sort nearest-first, then the tail (farthest) gets removed.
    g.enemies.sort((a, b) => dist(a, g.player) - dist(b, g.player));
    g.enemies.splice(g.dev.enemyCap);
  }
  if (g.projectiles.length > 300) g.projectiles.splice(0, g.projectiles.length - 300);
}