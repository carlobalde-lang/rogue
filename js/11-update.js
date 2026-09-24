// ============================================================
// GAME LOOP UPDATES (split by subsystem)
// ============================================================

// --- Player movement, regen, camera, flow-field refresh ---
// Slow factor applied to the player by each terrain hazard type
const HAZARD_FACTOR = {
  [HAZARD_ICE]: 1.5, [HAZARD_SNOW]: 0.82, [HAZARD_LAVA]: 0.55,
  [HAZARD_SWAMP]: 0.72, [HAZARD_WATER]: 0.70
};

// ============================================================
// BIOME AMBIENT WEATHER
// ============================================================
// Extreme climates periodically unleash their weather for a burst:
//   Frozen Grass (north) -> FREEZE: cold wind, white-blue streaks
//   Desert (south)       -> SANDSTORM: blinding sand drops visibility
// While a storm rages the wave cadence speeds up (more pressure).
const STORM_DEFS = {
  north: {
    name: 'FREEZE', color: '#9fd7ff', streak: 'rgba(190,225,255,0.55)',
    particle: '#cfe9ff', dur: 12000, interval: 42000, windA: Math.PI / 3,
    drops: 62, speed: [220, 420], dropLen: [18, 30]
  },
  south: {
    name: 'SANDSTORM', color: '#ffd080', streak: 'rgba(255,205,130,0.50)',
    particle: '#ffc860', dur: 12000, interval: 45000, windA: -Math.PI * 0.04,
    drops: 160, speed: [320, 460], dropLen: [8, 14]
  }
};
const STORM_FIRST_MS = 30000;   // opening half-minute is always calm

// Taiga (northeast) gusts: a cold wind randomly sweeps through and shoves the
// player for a moment. Direction favours the prevailing wind with jitter.
const GUST_DEFS = {
  northeast: {
    interval: [9000, 14000], hold: 1100, strength: 0.11, baseA: -Math.PI * 0.35
  }
};
const GUST_FIRST_MS = 8000;

function updateStorm(dt, dtSec) {
  const g = game;
  if (!g.stormCd) g.stormCd = STORM_FIRST_MS;

  if (g.storm) {
    const s = g.storm;
    const def = STORM_DEFS[s.id];
    s.t += dt;
    // Streak particles drift with the wind for visibility
    s.pT = (s.pT || 0) - dt;
    if (s.pT <= 0) {
      s.pT = 55;
      if (g.particles.length < GFX.particleCap) {
        const a = def.windA;
        g.particles.push({
          x: g.player.x + rand(-VIEW_W * 0.75, VIEW_W * 0.75),
          y: g.player.y + rand(-VIEW_H * 0.75, VIEW_H * 0.75),
          vx: Math.cos(a) * rand(140, 300), vy: Math.sin(a) * rand(140, 300),
          radius: rand(1, 2.6), color: def.particle,
          life: 1500, maxLife: 1500, maxLifeT: 1500, type: 'dot'
        });
      }
    }
    if (s.t >= s.dur) {
      g.storm = null;
      g.stormCd = def.interval;
      spawnFloatingText(g.player.x, g.player.y - 40, 'skies clear', '#cfd8e6');
    }
    return;
  }

  g.stormCd -= dt;
  if (g.stormCd <= 0) {
    const def = STORM_DEFS[playerBiome()];
    if (def) {
      g.storm = { id: playerBiome(), t: 0, dur: def.dur, pT: 0 };
      Sound.play('storm');
      spawnFloatingText(g.player.x, g.player.y - 48, def.name + '!', def.color);
      spawnParticles(g.player.x, g.player.y - 20, def.color, 18, 5);
    } else {
      g.stormCd = 500;   // not in a stormy biome yet: poll quietly
    }
  }
}

function updateGusts(dt, dtSec) {
  const g = game;
  if (g.gust && g.gust.t > 0) {
    const gu = g.gust;
    gu.t -= dt;
    // Wind streak particles while the gust blows
    gu.pT = (gu.pT || 0) - dt;
    if (gu.pT <= 0) {
      gu.pT = 90;
      if (g.particles.length < GFX.particleCap) {
        g.particles.push({
          x: g.player.x + rand(-VIEW_W * 0.7, VIEW_W * 0.7),
          y: g.player.y + rand(-VIEW_H * 0.7, VIEW_H * 0.7),
          vx: Math.cos(gu.a) * rand(200, 420), vy: Math.sin(gu.a) * rand(200, 420),
          radius: rand(1, 2), color: 'rgba(218,235,255,0.75)',
          life: 900, maxLife: 900, maxLifeT: 900, type: 'dot'
        });
      }
    }
    if (gu.t <= 0) g.gust = null;
    return;
  }
  const def = GUST_DEFS[playerBiome()];
  if (!def) { g.gustTimer = 400; return; }
  if (!g.gustTimer) g.gustTimer = GUST_FIRST_MS;
  g.gustTimer -= dt;
  if (g.gustTimer <= 0) {
    g.gust = {
      a: def.baseA + rand(-0.9, 0.9),
      t: def.hold, hold: def.hold, strength: def.strength, pT: 0
    };
    g.gustTimer = rand(def.interval[0], def.interval[1]);
    if (Math.random() < 0.3) {
      spawnFloatingText(g.player.x, g.player.y - 32, 'WIND', '#cfe4ff');
    }
    Sound.play('gust');
  }
}

function updatePlayer(dt, dtSec) {
  const g = game;
  const p = g.player;

  // Footing: terrain under the player slows movement (ice slips, snow and
  // water bog you down, lava burns while you wade through it).
  const haz = tileHazardAt(p.x, p.y);
  p._hazF = HAZARD_FACTOR[haz] || 1;
  p._haz = haz;

  // Ice sliding: track momentum while on ice so the player glides in their
  // current direction with reduced turning ability.
  const onIce = haz === HAZARD_ICE;
  if (!p._iceSlideAngle) p._iceSlideAngle = null;
  if (!p._iceSlideSpeed) p._iceSlideSpeed = 0;

  // Taiga wind gusts: an impulse in px per ms that decays over the gust.
  const gust = g.gust;
  if (gust && gust.t > 0) {
    const decay = clamp(gust.t / gust.hold, 0, 1);
    const mag = gust.strength * decay;
    p._gustVX = Math.cos(gust.a) * mag;
    p._gustVY = Math.sin(gust.a) * mag;
  } else {
    p._gustVX = 0;
    p._gustVY = 0;
  }

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

  // On ice: blend input toward the slide direction (limited turning)
  if (onIce && (mx !== 0 || my !== 0)) {
    const inputAngle = Math.atan2(my, mx);
    if (p._iceSlideAngle === null) {
      // First frame on ice: start sliding in the input direction
      p._iceSlideAngle = inputAngle;
      p._iceSlideSpeed = p.speed;
    } else {
      // Already sliding: allow only 15% of normal turning per frame
      const inputTurn = wrapAngle(inputAngle - p._iceSlideAngle);
      p._iceSlideAngle += inputTurn * 0.15;
      // Blend speed toward input (gradual acceleration)
      p._iceSlideSpeed = lerp(p._iceSlideSpeed, p.speed, 0.05);
    }
    mx = Math.cos(p._iceSlideAngle);
    my = Math.sin(p._iceSlideAngle);
  } else if (!onIce) {
    // Leaving ice: gradually lose slide
    if (p._iceSlideAngle !== null) {
      p._iceSlideSpeed *= 0.85;
      if (p._iceSlideSpeed < 5) {
        p._iceSlideAngle = null;
        p._iceSlideSpeed = 0;
      }
    }
  } else {
    // On ice but no input: keep sliding in current direction
    if (p._iceSlideAngle !== null) {
      mx = Math.cos(p._iceSlideAngle);
      my = Math.sin(p._iceSlideAngle);
    }
  }
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    if (len > 0.01) {
      mx /= len; my /= len;
      // Momentum: moving straight >1s builds a streak (damage + speed bonus,
      // scales with the number of Momentum pickups you own).
      p.momentumActive = false;
      if (p.momentum > 0) {
        const mA = Math.atan2(my, mx);
        if (p.straightDir === null || Math.abs(wrapAngle(mA - p.straightDir)) < 0.4) {
          p.straightT = (p.straightT || 0) + dt;
        } else {
          p.straightT = dt;
        }
        p.straightDir = mA;
        p.momentumActive = p.straightT > 1000;
      }
      const mvSpd = onIce && p._iceSlideAngle !== null
        ? p._iceSlideSpeed * p._hazF
        : p.speed * p._hazF * (p.momentumActive ? 1 + (p.momentum || 0) * 0.06 : 1);
      // Move per-axis and back off the failed axis -> wall sliding
      const stepX = mx * mvSpd * dtSec;
      const stepY = my * mvSpd * dtSec;
      const nx = p.x + stepX;
      if (!circleBlocked(nx, p.y, p.radius)) p.x = nx;
      const ny = p.y + stepY;
      if (!circleBlocked(p.x, ny, p.radius)) p.y = ny;
      // Instant logical heading (for gameplay), but the rendered body turns
      // quickly and smoothly toward it instead of snapping around.
      p.facingAngle = Math.atan2(my, mx);
      const diff = Math.atan2(
        Math.sin(p.facingAngle - p.renderAngle),
        Math.cos(p.facingAngle - p.renderAngle)
      );
      p.renderAngle += diff * Math.min(1, dtSec * 20);
    } else {
      p.momentumActive = false;
      p.straightT = 0;
    }
  } else {
    p.momentumActive = false;
    p.straightT = 0;
  }

  // Wind gust displacement (player-scale, slowed a touch so it never overrides
  // walking completely). Applied after input so gusts buffet you as you move.
  if (p._gustVX || p._gustVY) {
    const gx = p.x + p._gustVX * dt;
    if (!circleBlocked(gx, p.y, p.radius)) p.x = gx;
    const gy = p.y + p._gustVY * dt;
    if (!circleBlocked(p.x, gy, p.radius)) p.y = gy;
  }

  // --- Animation state ---
  p.animTime += dt;
  const pvx = p.x - (p._prevPX != null ? p._prevPX : p.x);
  const pvy = p.y - (p._prevPY != null ? p._prevPY : p.y);
  p._prevPX = p.x; p._prevPY = p.y;
  const lerpV = Math.min(1, dtSec * 14);
  p.velX = lerp(p.velX, pvx / Math.max(0.001, dtSec), lerpV);
  p.velY = lerp(p.velY, pvy / Math.max(0.001, dtSec), lerpV);
  p.attackPulse = Math.max(0, p.attackPulse - dtSec * 5);

  // --- Footstep dust puffs while moving fast ---
  const spd = Math.hypot(p.velX, p.velY);
  if (spd > 60 && playerBiome() === BIOME_CORE) {
    p._stepT += dtSec * (0.4 + spd / 140);
    if (p._stepT > 1) {
      p._stepT = 0;
      if (game.particles.length < GFX.particleCap) {
        game.particles.push({
          x: p.x + rand(-3, 3), y: p.y + rand(-3, 3),
          vx: rand(-10, 10), vy: rand(-10, 10),
          radius: rand(1.2, 2.6), color: 'rgba(130,140,155,0.30)',
          life: 280, maxLife: 280, type: 'dot'
        });
      }
    }
  }

  // --- Dynamic cape (verlet chain trailing the player's back) ---
  updateCape(dtSec);

  // --- Reactive grass trail: while the player walks, drop soft "pushes" onto
  // the ground at their feet (position + walk direction + force). Each push
  // decays exponentially, so the grass bends along the player's path and slowly
  // springs back to the wind motion after they pass. Skipped on mobile: the
  // push/trample effect is tuned for mouse+keyboard and eats GPU on phones. ---
  if (!IS_MOBILE) {
    if (!game.grassPushes) game.grassPushes = [];
    const gP = game.grassPushes;
    const gspd = Math.hypot(p.velX, p.velY);
    if (gspd > 90) {
      const pf = Math.min(1, gspd / 240);
      // Lead: place the push ~2 sprite diameters AHEAD of the player so the
      // grass already bends as you step onto it, not a beat later. One push per
      // sim frame keeps the reaction instant (no interval gating).
      const lead = 40;
      gP.push({
        x: p.x + (p.velX / gspd) * lead, y: p.y + (p.velY / gspd) * lead,
        z: (p.velX / gspd) * pf,
        w: (p.velY / gspd) * pf
      });
      if (gP.length > 60) gP.shift();
      // Persistent trample: the walked line stays flattened forever (directional
      // soft mask), stamped under the feet - the path never springs back.
      trampleStamp(p.x, p.y, p.velX / gspd, p.velY / gspd, pf);
    }
    const gDec = Math.exp(-dt / 800);
    for (let i = gP.length - 1; i >= 0; i--) {
      gP[i].z *= gDec; gP[i].w *= gDec;
      if (Math.abs(gP[i].z) + Math.abs(gP[i].w) < 0.02) gP.splice(i, 1);
    }
  }

  // --- Flow field recompute (only when the player is 2+ tiles from the
  // field's origin, or has left its range). Recomputing on every single tile
  // crossing fired a 7225-cell BFS ~7 times per second while walking; keeping
  // BFS spikes 2 tiles apart is invisible to pathing and much smoother. ---
  const pTileX = Math.floor(p.x / TILE);
  const pTileY = Math.floor(p.y / TILE);
  if (Math.abs(pTileX - ffCX) > 1 || Math.abs(pTileY - ffCY) > 1 || !inFlowRange(pTileX, pTileY)) {
    updateFlowField(p.x, p.y);
  }
  p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt * 0.0035);   // ~285ms fade
  p.hurtShake = Math.max(0, p.hurtShake - dt * 0.002);
  p.hp = Math.min(p.maxHp, p.hp + p.regen * dtSec);

  // --- Lava burn: standing in a lava tile ticks damage on its own clock ---
  // (deliberately separate from damagePlayer's i-frame timer so enemies can
  // still hit you while you wade through it)
  if (p._haz === HAZARD_LAVA) {
    p.lavaT = (p.lavaT || 0) - dt;
    if (p.lavaT <= 0) {
      p.lavaT = 400;
      if (!game.dev.godMode) {
        p.hp -= 1;
        if (window.runLog) runLog.onDamageTaken(1, 'lava');
        spawnFloatingText(p.x, p.y - 10, -1, '#ff9a4a');
        spawnParticles(p.x, p.y, '#ff7a2a', 4, 2);
        resolvePlayerDeath();
      }
    }
  } else {
    p.lavaT = 0;
  }

  // Camera
  g.camera.x = lerp(g.camera.x, p.x - VIEW_W / 2, 0.08);
  g.camera.y = lerp(g.camera.y, p.y - VIEW_H / 2, 0.08);
}

// --- Dynamic cape: verlet cloth grid that billows like a flag ---
// A trapezoid of points pinned along its narrow "neck" edge to the player's
// back; the free (tail) edge widens and waves under wind + flutter.
// The neck anchor never sweeps around the body: it sticks to the back of the
// DOMINANT axis (like the sprite's 4-dir facing), so walking diagonally doesn't
// make the collar rotate — only the free cloth keeps following the continuous
// render angle and billows smoothly.
function capeNeckAnchor(p) {
  const spd = Math.hypot(p.velX, p.velY);
  let dx = p.velX, dy = p.velY;
  if (spd <= 0.4) { dx = Math.cos(p.renderAngle); dy = Math.sin(p.renderAngle); }
  let face;                                            // cardinal FACE direction
  if (Math.abs(dx) > Math.abs(dy)) face = dx > 0 ? 0 : Math.PI;
  else face = dy > 0 ? Math.PI / 2 : -Math.PI / 2;
  const back = face + Math.PI;
  const capeFront = Math.sin(p.renderAngle) < -0.5;
  const neckR = (capeFront ? -0.4 : 0.45) * p.radius;
  return {
    neckX: p.x + Math.cos(back) * neckR,
    neckY: p.y + Math.sin(back) * neckR,
    back,
    perp: back + Math.PI / 2,
    capeFront
  };
}

function initCape() {
  const p = game.player;
  const L = 3;                  // segments neck -> tail (compact cape)
  const W = 5;                  // segments across the cloth
  const SEG_L = 6.5;            // px per length segment
  const NECK_W = 10;            // attachment width (narrow, on the back)
  const TAIL_W = 46;            // free-edge width (widens outward)
  const backAng = p.renderAngle + Math.PI;
  const perp = backAng + Math.PI / 2;
  const neck = capeNeckAnchor(p);
  const neckX = neck.neckX;
  const neckY = neck.neckY;

  const grid = [];
  for (let j = 0; j < W; j++) {
    const col = [];
    for (let i = 0; i < L; i++) {
      const frac = i / (L - 1);
      const halfW = NECK_W * 0.5 + (TAIL_W * 0.5 - NECK_W * 0.5) * frac;
      const wf = j / (W - 1) - 0.5;
      const x = neckX + Math.cos(backAng) * (i * SEG_L) + Math.cos(perp) * (halfW * wf * 2);
      const y = neckY + Math.sin(backAng) * (i * SEG_L) + Math.sin(perp) * (halfW * wf * 2);
      col.push({ x, y, px: x, py: y, i, j });
    }
    grid.push(col);
  }

  // Pre-compute rest distances (along length, across width, diagonal) from the
  // initial trapezoid layout so the cloth keeps its taper and shear stiffness.
  for (let j = 0; j < W; j++) {
    for (let i = 0; i < L; i++) {
      const a = grid[j][i];
      if (i + 1 < L) a.restL = dist(a, grid[j][i + 1]);
      if (j + 1 < W) a.restW = dist(a, grid[j + 1][i]);
      if (j + 1 < W && i + 1 < L) a.restD = dist(a, grid[j + 1][i + 1]);
    }
  }

  p.cape = { grid, L, W, SEG_L, NECK_W, TAIL_W };
}

function solveCape(a, b, rest) {
  const dx = a.x - b.x, dy = a.y - b.y;
  const d = Math.hypot(dx, dy) || 0.001;
  const diff = (d - rest) / d;
  a.x -= dx * diff * 0.5;
  a.y -= dy * diff * 0.5;
  b.x += dx * diff * 0.5;
  b.y += dy * diff * 0.5;
}

function updateCape(dtSec) {
  if (!GFX.cape) return;
  const p = game.player;
  if (!p.cape) initCape();
  const cap = p.cape;
  const { grid, W, L, NECK_W, TAIL_W, SEG_L } = cap;
  const backAng = p.renderAngle + Math.PI;
  const perp = backAng + Math.PI / 2;
  const neck = capeNeckAnchor(p);
  const neckX = neck.neckX;
  const neckY = neck.neckY;
  const capeFront = neck.capeFront;
  const perpQ = neck.perp;             // quantized: collar spread never rotates

  // Pin the whole neck column to the player's back along the CARDINAL axis, so
  // diagonal movement keeps the collar glued in place
  for (let j = 0; j < W; j++) {
    const wf = j / (W - 1) - 0.5;
    const x = neckX + Math.cos(perpQ) * (NECK_W * wf);
    const y = neckY + Math.sin(perpQ) * (NECK_W * wf);
    const pt = grid[j][0];
    pt.x = x; pt.y = y; pt.px = x; pt.py = y;
  }

  // How fast the player moves FORWARD (dot of velocity with facing direction).
  // Wind always blows toward the back of the body, so reversing the player
  // never flips the cape into them — it simply stops blowing and a spring
  // restores the cloth to a clean flag shape behind the back.
  const vx0 = p.x - (p._capePrevX != null ? p._capePrevX : p.x);
  const vy0 = p.y - (p._capePrevY != null ? p._capePrevY : p.y);
  p._capePrevX = p.x; p._capePrevY = p.y;
  const dot = vx0 * Math.cos(p.renderAngle) + vy0 * Math.sin(p.renderAngle);
  const windMag = 0.14 + clamp(dot / 4, -1, 1) * 0.30;
  const windX = Math.cos(backAng) * windMag;
  const windY = Math.sin(backAng) * windMag;
  const tNow = game.time;

  // Verlet integrate (skip pinned neck row)
  const spf = dtSec * 1.6;                    // very light guide toward ideal shape
  for (let j = 0; j < W; j++) {
    for (let i = 1; i < L; i++) {
      const pt = grid[j][i];
      const frac = i / (L - 1);
      // Ideal rest position: clean flag shape behind the player's back
      const halfW = NECK_W * 0.5 + (TAIL_W * 0.5 - NECK_W * 0.5) * frac;
      const wf = j / (W - 1) - 0.5;
      const idealX = neckX + Math.cos(backAng) * (i * SEG_L) + Math.cos(perp) * (halfW * wf * 2);
      const idealY = neckY + Math.sin(backAng) * (i * SEG_L) + Math.sin(perp) * (halfW * wf * 2);
      // Strong momentum lets it dash back and sway; the guide just keeps it
      // ballparked. Folds are prevented by clampBehind() below, not by pinning.
      const ff = (pt.x - pt.px) * 0.88;
      const fy = (pt.y - pt.py) * 0.88;
      pt.px = pt.x; pt.py = pt.y;
      pt.x = pt.x + (idealX - pt.x) * spf + ff;
      pt.y = pt.y + (idealY - pt.y) * spf + fy;
      // base wind (stronger toward the tail) + travelling sin flutter
      const k = 2.0 * dtSec;
      const flut = Math.sin(tNow * 0.045 + i * 0.9 + j * 0.35);
      const amp = (0.8 + 2.2 * frac);
      pt.x += (windX * (0.25 + 0.75 * frac)
        + Math.cos(perp) * flut * amp) * k;
      pt.y += (windY * (0.25 + 0.75 * frac)
        + Math.sin(perp) * flut * amp) * k;
    }
  }

  // Distance constraints (3 passes) keep it cloth-like, not a rubber sheet
  for (let iter = 0; iter < 2; iter++) {
    for (let j = 0; j < W; j++) {
      for (let i = 1; i < L; i++) {
        const a = grid[j][i];
        const prev = grid[j][i - 1];
        solveCape(a, prev, prev.restL);
        if (j > 0) solveCape(a, grid[j - 1][i], grid[j - 1][i].restW);
        if (j > 0 && i > 0) solveCape(a, grid[j - 1][i - 1], grid[j - 1][i - 1].restD);
      }
    }
  }

  // Softness with hard limits — every free point may sway inside a lane around
  // its own rest spot (generous along the wind, narrow across it). It can never
  // drift far enough to cross a neighbouring segment or wrap round the body.
  const r = p.radius;
  const ax = Math.cos(backAng), ay = Math.sin(backAng);
  const ux = Math.cos(perp), uy = Math.sin(perp);
  const maxLongS = SEG_L * 2.2;             // how far it may dash back / stretch
  const maxLag = -SEG_L * 0.35;             // rows may lag a little, never bunch/reverse
  for (let j = 0; j < W; j++) {
    for (let i = 1; i < L; i++) {
      const pt = grid[j][i];
      const frac = i / (L - 1);
      const halfW = NECK_W * 0.5 + (TAIL_W * 0.5 - NECK_W * 0.5) * frac;
      const wf = j / (W - 1) - 0.5;
      const rx = neckX + ax * (i * SEG_L) + ux * (halfW * wf * 2);
      const ry = neckY + ay * (i * SEG_L) + uy * (halfW * wf * 2);
      const maxCross = Math.max(7, SEG_L * 1.0 * (0.5 + frac));
      const lon = (pt.x - rx) * ax + (pt.y - ry) * ay;
      const crs = (pt.x - rx) * ux + (pt.y - ry) * uy;
      const clon = clamp(lon, maxLag, maxLongS);
      const ccrs = clamp(crs, -maxCross, maxCross);
      pt.x = rx + ax * clon + ux * ccrs;
      pt.y = ry + ay * clon + uy * ccrs;
      // keep it floating off the body hitbox (in back view the cape rests over
      // the body like a cloak, so it must NOT be pushed out of the hitbox)
      const dx = pt.x - p.x, dy = pt.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (!capeFront && d2 < r * r) {
        const d = Math.sqrt(d2) || 1;
        const push = (r - d) * 1.3;
        pt.x += (dx / d) * push; pt.y += (dy / d) * push;
      }
    }
  }
}

// --- Wave / elite / boss spawning timers ---
function updateSpawning(dt) {
  const g = game;
  // Storms whip the horde up: while one rages, waves come ~45% faster.
  const stormMult = g.storm ? 0.55 : 1;

  g.waveTimer -= dt;
  if (g.waveTimer <= 0) {
    spawnWave();
    if (window.runLog) runLog.addSpawnType('wave');
    g.waveTimer = Math.max(800, 3000 - g.difficultyMult * 200) * (g.dev.waveIntervalMult || 1) * stormMult;
  }

  g.eliteTimer -= dt;
  if (g.eliteTimer <= 0) {
    const eliteCount = 1 + Math.floor(g.difficultyMult / 8);
    for (let i = 0; i < eliteCount; i++) spawnEnemy('elite');
    if (window.runLog) runLog.addSpawnType('elite', eliteCount);
    g.eliteTimer = Math.max(5000, 20000 - g.difficultyMult * 800) * (g.dev.eliteIntervalMult || 1);
  }

  // Warden: a mid-tier mini-boss, more frequent than a full boss. Difficulty
  // 12 is roughly the mid-run mark where the pacing needs a bigger threat.
  g.wardenTimer -= dt;
  if (g.difficultyMult >= 12 && g.wardenTimer <= 0) {
    spawnEnemy('warden');
    if (window.runLog) runLog.addSpawnType('warden');
    spawnParticles(g.player.x, g.player.y, '#fa0', 20, 7);
    g.wardenTimer = Math.max(30000, 90000 - g.difficultyMult * 1500) * (g.dev.eliteIntervalMult || 1);
  }

  g.bossTimer -= dt;
  if (g.bossTimer <= 0) {
    spawnEnemy('boss');
    if (window.runLog) runLog.addSpawnType('boss');
    spawnParticles(g.player.x, g.player.y, '#f0f', 30, 8);
    g.bossTimer = Math.max(90000, 180000 - g.difficultyMult * 3000) * (g.dev.bossIntervalMult || 1);
  }
}

// --- Enemy movement (flow-field steering, wall sliding, contact) ---
function updateEnemies(dt, dtSec) {
  drainSpawnQueue();   // trickle pending wave spawns in instead of one burst
  const g = game;
  const p = g.player;

  for (let i = g.enemies.length - 1; i >= 0; i--) {
    const e = g.enemies[i];

    if (e.dead) { g.enemies.splice(i, 1); continue; }

    // Never visibly despawn enemies: if one drifts too far (large screens
    // can show the old 2000px removal radius), teleport it back to the
    // spawn ring instead of removing it.
    if (dist2(e, p) > 2600 * 2600) {
      const pos = findEnemySpawnPos();
      e.x = pos.x; e.y = pos.y;
      e.vx = 0; e.vy = 0;
      e.prevX = e.x; e.prevY = e.y;   // keep render interpolation from streaking
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

    // --- Caster AI: keeps distance, holds position in a band, fires bolts ---
    if (e.kind === 'caster') {
      const dP2 = dist2(e, p);
      if (dP2 > 320 * 320) {
        // chase (keep current steering)
      } else if (dP2 < 130 * 130) {
        vx = -vx; vy = -vy;              // retreat
      } else {
        vx = 0; vy = 0;                  // hold and shoot
      }
      e.fireT -= dt;
      if (e.fireT <= 0) {
        e.fireT = e.fireRate || 1800;
        const fa = angleTo(e, p);
        g.castProjectiles.push({
          x: e.x + Math.cos(fa) * (e.radius + 8),
          y: e.y + Math.sin(fa) * (e.radius + 8),
          vx: Math.cos(fa) * 130, vy: Math.sin(fa) * 130,
          dmg: e.damage, radius: 5,
          srcKind: e.kind,
          color: e.glint || '#B83DDB',
          dark: e.core || '#5B1F91',
          head: 'rgb(' + (e.aura || [241, 155, 255]).join(',') + ')',
          ph: rand(0, PI2),
          life: 2500, maxLife: 2500, prevX: e.x, prevY: e.y
        });
        Sound.play('shootAlt');
      }
    }

    // Shielded fronts: always turn its shield toward the player
    if (e.kind === 'shielded') e.faceA = angleTo(e, p);

    // --- Per-kind ambient behaviours: visual life plus a little combat flair ---
    // A shared `fxT` timer gates cheap one-dot particle bursts.
    if (typeof e.fxT !== 'number') e.fxT = 0;
    e.fxT -= dt;

    // Splitter: trembles harder as it nears death (bursts on killing blow)
    if (e.kind === 'splitter') {
      const trem = Math.max(0, 1 - e.hp / (e.maxHp || 1));
      if (trem > 0.55) {
        const jA = rand(0, PI2);
        const jAmp = (trem - 0.55) * 2.0 * e.radius * 0.09;
        e.x += Math.cos(jA) * jAmp;
        e.y += Math.sin(jA) * jAmp;
      }
    }

    // Brute: a slow "gulp" beat — the body swells, then belches a puff of shadow
    if (e.kind === 'brute') {
      if (typeof e.gulp !== 'number') e.gulp = 0;
      if (typeof e.gulpT !== 'number') e.gulpT = rand(600, 1600);
      e.gulpT -= dt;
      e.gulp = Math.max(0, e.gulp - dt / 260);
      if (e.gulpT <= 0) {
        e.gulpT = 1400 + rand(0, 900);
        e.gulp = 1;
        if (GFX.enemyFx) spawnParticles(e.x, e.y + e.radius * 0.2, e.body, 4, 26);
      }
    }

    // Leecher: below 30% HP it enters a crimson frenzy and lurches faster
    if (e.kind === 'leecher') {
      const low = e.hp < e.maxHp * 0.3;
      e.spdMult = low ? 1.22 : 1;
      if (low && e.fxT <= 0) {
        e.fxT = 170;
        const fa = (e.faceA != null ? e.faceA : angleTo(e, p)) + rand(-0.5, 0.5);
        spawnParticles(e.x + Math.cos(fa) * e.radius, e.y + Math.sin(fa) * e.radius, '#C43D58', 1, 9);
      }
    }

    // Frostling: sheds sparkling frost
    if (e.kind === 'frostling' && e.fxT <= 0) {
      e.fxT = 360 + rand(0, 320);
      if (GFX.enemyFx) spawnParticles(e.x, e.y, '#B5FFFF', 1, 12);
    }

    // Scorcher: spits embers as it hunts
    if (e.kind === 'scorcher' && e.fxT <= 0) {
      e.fxT = 200 + rand(0, 200);
      if (GFX.enemyFx) spawnParticles(e.x + rand(-e.radius, e.radius) * 0.8, e.y - e.radius * 0.4, '#FF8A70', 1, 10);
    }

    // River Wisp: drips water as it drifts
    if (e.kind === 'riverwisp' && e.fxT <= 0) {
      e.fxT = 300 + rand(0, 260);
      if (GFX.enemyFx) spawnParticles(e.x, e.y, '#B5FFFF', 1, 6);
    }

    // Pine Wraith: shadow needles drip downward
    if (e.kind === 'pinewraith' && e.fxT <= 0) {
      e.fxT = 480 + rand(0, 380);
      if (GFX.enemyFx) spawnParticles(e.x, e.y - e.radius * 1.4, e.body, 1, 9);
    }

    // Bog Haunt: buboes pop lazily
    if (e.kind === 'boghaunt' && e.fxT <= 0) {
      e.fxT = 420 + rand(0, 300);
      if (GFX.enemyFx) spawnParticles(e.x, e.y, '#D2F56C', 1, 7);
    }

    // Cold: timer counts down; when it expires the speed penalty lifts.
    if (e.slowT > 0) {
      e.slowT -= dt;
      if (e.slowT <= 0) e.slowFactor = 1;
    }
    // Terrain footing, same as the player: snow/swamp/water/lava pools slow
    // enemies down (ice never speeds them up). Lava additionally burns on its
    // own tick clock, routing through damageEnemy so drops/kills still work.
    const eHaz = tileHazardAt(e.x, e.y);
    const eHazF = Math.min(HAZARD_FACTOR[eHaz] || 1, 1);
    if (eHaz === HAZARD_LAVA) {
      e._lavaT = (e._lavaT || 0) - dt;
      if (e._lavaT <= 0) {
        e._lavaT = 400;
        if (!e.dead) damageEnemy(e, 1, undefined, undefined, undefined, 'lava');
        spawnParticles(e.x, e.y - e.radius * 0.5, '#ff7a2a', 3, 4);
      }
    } else {
      e._lavaT = 0;
    }
    // Move with substep per-axis wall sliding: small substeps let enemies
    // naturally round convex corners by sliding along one axis, then
    // transitioning when the wall ends.
    const spd = e.speed * (e.slowFactor && e.slowFactor < 1 ? e.slowFactor : 1) * (e.spdMult || 1) * eHazF * dtSec;
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
    const contactR = e.radius + p.radius;
    if (dist2(e, p) < contactR * contactR) {
      damagePlayer(e.damage, 'contact', e.kind);
    }
  }

  // --- Rebuild spatial grid (after removing dead enemies) ---
  g.enemyGrid.clear();
  for (const e of g.enemies) g.enemyGrid.insert(e);

  // Separation + stuck-resolution are full O(n·k) passes over the swarm that
  // only nudge entities by a few px — 120Hz iterations are invisible, so run
  // them on alternating sim steps (60Hz) to halve the cost in dense crowds.
  g._sepClock = (g._sepClock | 0) + 1;
  if ((g._sepClock & 1) === 0) {

    // --- Enemy separation: push overlapping enemies apart so they don't
    // clump into a jammed blob that gets stuck at walls and door gaps ---
    for (let si = 0; si < g.enemies.length; si++) {
      const a = g.enemies[si];
      if (a.dead) continue;
      g.enemyGrid.queryEach(a.x, a.y, a.radius * 2, b => {
        if (b === a || b.dead) return;
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
      });
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
}

// --- Enemy projectiles: caster bolts, slow and dodgeable ---
function updateEnemyProjectiles(dt, dtSec) {
  const g = game;
  const p = g.player;
  for (let i = g.castProjectiles.length - 1; i >= 0; i--) {
    const cp = g.castProjectiles[i];
    const nx = cp.x + cp.vx * dtSec;
    const ny = cp.y + cp.vy * dtSec;
    // Swept wall collision: bolts die on contact with walls and never pass
    // through them (unlike the player's projectiles, which are free to fly).
    if (segmentBlocked(cp.x, cp.y, nx, ny, Math.max(1, cp.radius * 0.5))) {
      g.castProjectiles.splice(i, 1);
      continue;
    }
    cp.prevX = cp.x; cp.prevY = cp.y;
    cp.x = nx; cp.y = ny;
    cp.life -= dt;
    if (cp.life <= 0) { g.castProjectiles.splice(i, 1); continue; }
    if (dist(cp, p) < cp.radius + p.radius) {
      g.castProjectiles.splice(i, 1);
      damagePlayer(cp.dmg, 'projectile', cp.srcKind);
      continue;
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

    // Duplicator follow-up copy: it sits still for a beat, then fires in quick
    // sequence behind the first projectile (no collisions while delayed).
    if (pr.delay > 0) { pr.delay -= dt; continue; }

    // Boomerangs fly out straight, then home back to the player
    if (pr.boomerang) {
      pr.outDist += Math.hypot(pr.vx, pr.vy) * dtSec * 60;
      if (!pr.returning && pr.outDist >= pr.maxOut) {
        pr.returning = true;
        pr.hitEnemies.clear();              // hit again on the return leg
      }
      if (pr.returning) {
        const ra = angleTo(pr, p);
        pr.vx = lerp(pr.vx, Math.cos(ra) * 11, 3 * dtSec);
        pr.vy = lerp(pr.vy, Math.sin(ra) * 11, 3 * dtSec);
        if (dist(pr, p) < 18) { g.projectiles.splice(i, 1); continue; }
      }
    }

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
    let stopped = false;
    g.enemyGrid.queryEach(pr.x, pr.y, pr.radius + 20, e => {
      if (stopped) return;
      if (pr.hitEnemies.has(e)) return;
      if (dist(pr, e) < e.radius + pr.radius) {
        damageEnemy(e, pr.dmg, undefined, undefined, undefined, pr.src || 'projectile');
        pr.hitEnemies.add(e);
        if (pr.areaEffect > 0) {
          g.enemyGrid.queryEach(pr.x, pr.y, pr.areaEffect * p.areaMult, ae => {
            if (ae !== e && dist(pr, ae) < pr.areaEffect * p.areaMult) {
              damageEnemy(ae, pr.dmg * 0.5, undefined, undefined, undefined, pr.src || 'projectile');
            }
          });
        }
        // Mirror Shard: ricochet to the nearest new enemy, else expire
        if (pr.bounces > 0) {
          let next = null, nextD = Infinity;
          const spd = Math.hypot(pr.vx, pr.vy);
          g.enemyGrid.queryEach(pr.x, pr.y, pr.bounceRange, e2 => {
            if (e2 === e || e2.dead || pr.hitEnemies.has(e2)) return;
            const d2 = (e2.x - pr.x) * (e2.x - pr.x) + (e2.y - pr.y) * (e2.y - pr.y);
            if (d2 < nextD) { nextD = d2; next = e2; }
          });
          if (next) {
            const ba = angleTo(pr, next);
            pr.vx = Math.cos(ba) * spd * 0.95;
            pr.vy = Math.sin(ba) * spd * 0.95;
            pr.bounces--;
            pr.life = Math.min(pr.life, 2000);
            // Sparkle at the ricochet point so each chain-link pops out
            const prCol = pr.color || '#bcd0ff';
            const tint = pr.hitEnemies && pr.hitEnemies.size % 3 === 0 ? '#ffd176' : prCol;
            spawnParticles(pr.x, pr.y, tint, 3, 2.5);
          } else if (pr.pierce <= 0) {
            g.projectiles.splice(i, 1); stopped = true; return;
          } else {
            pr.pierce--;
          }
        } else if (pr.pierce <= 0) {
          g.projectiles.splice(i, 1); stopped = true; return;
        } else {
          pr.pierce--;
        }
      }
    });
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
const MAGNET_ACTIVE_MS = 4000;   // how long a touched magnet pulls all XP

// Touch effect of a magnet pickup: for a few seconds every XP gem on the
// whole map is pulled toward the player, no matter the distance.
function activateXpMagnet() {
  const g = game;
  const p = g.player;
  g.xpMagnetTimer = MAGNET_ACTIVE_MS;
  spawnFloatingText(p.x, p.y - 34, 'MAGNET!', '#ff6a7a');
  spawnParticles(p.x, p.y, '#ff5566', 14, 6);
  Sound.play('magnet');
}

function updatePickups(dt, dtSec) {
  const g = game;
  const p = g.player;

  const magnetOn = g.xpMagnetTimer > 0;
  if (magnetOn) g.xpMagnetTimer -= dt;

  g.pickupGrid.clear();
  for (const pk of g.pickups) g.pickupGrid.insert(pk);

  for (let i = g.pickups.length - 1; i >= 0; i--) {
    const pk = g.pickups[i];
    // XP gems and Umbra Shards never despawn; other pickups keep their life timer
    if (pk.type !== 'xp' && pk.type !== 'essence') {
      pk.life -= dt;
      if (pk.life <= 0) { g.pickups.splice(i, 1); continue; }
    }

    const d = dist(pk, p);
    // While a magnet is active every XP gem is pulled from anywhere; the
    // pull is much stronger, so gems streak across the map.
    const globalPull = magnetOn && (pk.type === 'xp' || pk.type === 'essence');
    if (globalPull || d < p.pickupRange) {
      const acc = globalPull ? 1400 : 500;
      const cap = globalPull ? 1600 : 600;
      pk.magnetSpeed = Math.min(pk.magnetSpeed + acc * dtSec, cap);
      const a = angleTo(pk, p);
      pk.x += Math.cos(a) * pk.magnetSpeed * dtSec;
      pk.y += Math.sin(a) * pk.magnetSpeed * dtSec;
    }
    if (d < p.radius + pk.radius) {
      if (pk.type === 'magnet') {
        activateXpMagnet();
        g.pickups.splice(i, 1);
        continue;
      }
      if (pk.type === 'essence') {
        g.essenceCollected += pk.amount;
        Sound.play('gem');
        g.pickups.splice(i, 1);
        continue;
      }
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
// ============================================================
// BIOME HEART GUARDIANS & WARP PORTALS
// ============================================================
// Each biome's treasure statue is SEALED behind a Guardian that only wakes up
// once the run has opened (~75s in). Walking near a sealed heart awakens its
// Guardian; killing it purifies the heart — the weapon is granted directly and
// unlocked permanently (no chest RNG), and the statue becomes a warp portal.
//
// Cleared hearts form a permanent warp network (persisted in meta), so future
// runs can fast-travel between every heart you've ever purified.
const HEART_WAKE_MS = 30000;      // guardian wakes after 30s of the player staying nearby
const HEART_AWAKEN_RANGE = 950;   // player proximity that wakes the guardian
const HEART_COUNT_RANGE = 600;    // inside this radius the countdown runs; beyond it it resets
const WARP_CHARGE_MS = 900;       // hold-to-warp on a cleared portal

// A heart is usable as a portal if it was cleared this run OR in any past run.
function heartCleared(id) {
  return !!game.openedChests[id] ||
    (typeof metaHeartCleared === 'function' && metaHeartCleared(id));
}

// Spawns the biome Guardian at the heart: a beefed-up boss in a steel/gold
// palette that drops a guaranteed weapon grant when slain.
function spawnGuardian(biomeId) {
  const g = game;
  const def = ENEMY_DEFS.boss;
  const dm = g.difficultyMult;
  const pos = chestPos(biomeId);
  const radius = def.radius(dm) * 1.15;
  const hp = Math.ceil(def.hp(dm) * 1.25);
  const gd = {
    x: pos.x, y: pos.y, radius,
    hp, maxHp: hp,
    speed: def.speed(dm) * 0.92,
    damage: def.damage(dm),
    xp: typeof def.xp === 'function' ? def.xp(dm) : def.xp,
    color: '#FFC857',
    type: 'boss',
    kind: 'guardian',
    name: 'WEDGE GUARDIAN',
    def,
    deep: '#08090D',
    body: '#1B1D27', core: '#414354', glint: '#FFC857',
    aura: [255, 200, 87], auraAlpha: 0.3, auraScale: 2.6,
    flashTimer: 0,
    vx: 0, vy: 0, ph: rand(0, PI2),
    isGuardian: true, biomeId
  };
  // Dev multipliers keep parity with other enemies
  const dev = game.dev;
  gd.hp *= (dev.enemyHpMult || 1); gd.maxHp = gd.hp;
  gd.speed *= (dev.enemySpeedMult || 1);
  gd.damage *= (dev.enemyDmgMult || 1);
  g.enemies.push(gd);
  g.totalEnemiesSpawned++;
  Sound.play('bossWarn');
}

function completeHeart(biomeId) {
  const g = game;
  const def = BIOME_DEFS[biomeId];
  if (!def.weapon) return;
  if (g.openedChests[biomeId]) return;
  g.openedChests[biomeId] = true;
  if (typeof markHeartCleared === 'function') markHeartCleared(biomeId);
  const pos = chestPos(biomeId);
  spawnParticles(pos.x, pos.y, '#b07cff', 40, 8);
  spawnParticles(pos.x, pos.y, '#ffd24d', 24, 6);
  spawnFloatingText(pos.x, pos.y - 40, 'HEART PURIFIED', '#d9a7ff');
  openChest(biomeId, def.weapon);
  g.guardian = null;
  Sound.play('portal');
}

// Standing on a heart: sealed statues wait for their Guardian, cleared portals
// charge up the warp network.
function updateHearts(dt) {
  const g = game;
  const p = g.player;
  for (const id of BIOME_IDS) {
    const bdef = BIOME_DEFS[id];
    if (!bdef.weapon) continue;
    const pos = chestPos(id);
    const d = Math.hypot(pos.x - p.x, pos.y - p.y);

    if (!heartCleared(id)) {
      // Per-biome guardian countdown: every heart owns a separate 30s timer
      // that only runs while the player stays within 600px of the statue.
      // Walking further than that stops AND resets it, so nothing charges in
      // the background while you roam the rest of the world.
      if (g.heartTimers[id] == null) g.heartTimers[id] = HEART_WAKE_MS;
      if (d <= HEART_COUNT_RANGE && !g.guardian) {
        g.heartTimers[id] = Math.max(0, g.heartTimers[id] - dt);
      } else if (d > HEART_COUNT_RANGE) {
        g.heartTimers[id] = HEART_WAKE_MS;
      }
      if (g.heartTimers[id] > 0) continue;             // still sealed
      if (g.guardian) continue;                        // one fight at a time
      if (d < HEART_AWAKEN_RANGE) {
        g.guardian = { biomeId: id, spawnT: g.time };
        spawnGuardian(id);
        spawnFloatingText(pos.x, pos.y - 60, 'GUARDIAN AWAKENED', '#d9a7ff');
        spawnParticles(pos.x, pos.y - 20, '#b07cff', 30, 8);
      }
      continue;
    }

    // Cleared portal: standing on it charges the warp menu.
    if (d < 40) {
      // A ring only charges while "armed" - i.e. after the player has stepped
      // OFF *this* portal and walked back on top. A cancel or a warp therefore
      // never makes the menu explode back open while you still stand on it.
      if (g.warpArmed[id]) {
        g.warpCharges[id] = (g.warpCharges[id] || 0) + dt;
        if (g.warpCharges[id] >= WARP_CHARGE_MS && !g.warpOpen) openWarpMenu();
      }
    } else if (g.warpCharges[id]) {
      g.warpCharges[id] = Math.max(0, g.warpCharges[id] - dt * 3);
    }
    // Stepped well clear of the ring: this portal is re-armed, so the menu may
    // open again the next time the player stands on it.
    if (d >= 90) g.warpArmed[id] = true;
  }

  // RUINS SPAWN ring: the starting heart is BIOME_CORE which has no weapon, so
  // the cleared-heart loop above never arms it. Once any warp is unlocked the
  // spawn becomes its own real portal: stand on it (after stepping off) to
  // re-open the menu, exactly like the weapon hearts. It keeps its own arm
  // flag (g.warpArmed.spawn) so the far-away biome hearts can't re-arm it.
  let anyWarpUnlocked = false;
  for (const sid of BIOME_IDS) {
    if (BIOME_DEFS[sid].weapon && heartCleared(sid)) { anyWarpUnlocked = true; break; }
  }
  if (anyWarpUnlocked) {
    const spX = 8 * TILE + TILE / 2, spY = 8 * TILE + TILE / 2 ;
    const dSp = Math.hypot(g.player.x - spX, g.player.y - spY);
    if (dSp < 40) {
      if (g.warpArmed.spawn) {
        g.warpCharges.spawn = (g.warpCharges.spawn || 0) + dt;
        if (g.warpCharges.spawn >= WARP_CHARGE_MS && !g.warpOpen) openWarpMenu();
      }
    } else if (g.warpCharges.spawn) {
      g.warpCharges.spawn = Math.max(0, g.warpCharges.spawn - dt * 3);
    }
    if (dSp >= 90) g.warpArmed.spawn = true;
  }
}

function openWarpMenu() {
  const g = game;
  if (g.warpOpen) return;
  const menu = document.getElementById('warp-menu');
  if (!menu) return;
  const list = document.getElementById('warp-list');
  list.innerHTML = '';
  const here = owningBiomeAt(g.player.x, g.player.y);
  let n = 0;
  let anyWarp = 0;
  for (const id of BIOME_IDS) {
    if (!BIOME_DEFS[id].weapon || !heartCleared(id)) continue;
    anyWarp++;
    if (id === here) continue;                              // never warp to where you stand
    n++;
    const btn = document.createElement('button');
    btn.className = 'warp-btn';
    btn.innerHTML = `${metaEsc(BIOME_DEFS[id].name)}`;
    btn.addEventListener('click', () => doWarp(id));
    list.appendChild(btn);
  }
  if (anyWarp > 0 && here !== BIOME_CORE) {                   // first warp unlocks
    n++;                                                      // the spawn warp —
    const spawnBtn = document.createElement('button');         // but never one back
    spawnBtn.className = 'warp-btn warp-spawn-btn';            // to where you stand.
    spawnBtn.innerHTML = '&#127968; RUINS SPAWN';
    spawnBtn.addEventListener('click', () => doWarpToSpawn());
    list.prepend(spawnBtn);
  }
  document.getElementById('warp-hint').textContent =
    n > 1
      ? 'Warp to a cleared heart - or return to the ruins spawn.'
      : 'First warp unlocked: you can now return to the ruin spawn.';
  // NOTE — do NOT re-assign warp-list.innerHTML here. `list` IS warp-list, so
  // its children (buttons created with addEventListener above) are already live
  // in the DOM; round-tripping them through innerHTML would destroy every
  // button and drop all their click listeners — which is exactly what made the
  // visible RUINS SPAWN button look "dead" even though clicks reached it. Only
  // if the list stayed empty do we inject a non-interactive placeholder.
  if (!list.children.length) {
    const none = document.createElement('div');
    none.className = 'warp-none';
    none.textContent = 'No warps available yet.';
    list.appendChild(none);
  }
  g.warpOpen = true;
  g.manualPause = true;
  g.paused = true;
  menu.style.display = 'flex';
  Sound.play('portal');
}

function closeWarpMenu(abort) {
  const g = game;
  const menu = document.getElementById('warp-menu');
  if (menu) menu.style.display = 'none';
  g.warpOpen = false;
  // Disarm every portal: a ring may only charge again after the player steps
  // well clear of THAT portal (>=90px) and walks back on top of it. This is
  // what makes both CANCEL and a successful warp feel stable instead of the
  // menu snapping open again while you still stand on the heart.
  g.warpArmed = {};
  // Forget every charge too: a stale full charge would re-open the menu on the
  // very first frame after any portal is re-armed.
  g.warpCharges = {};
  if (abort) {
    g.warpCloseT = g.time;
    g.manualPause = false;
    g.paused = false;
  }
}

function doWarp(biomeId) {
  const g = game;
  const p = g.player;
  const pos = chestPos(biomeId);
  p.x = pos.x; p.y = pos.y;
  g.camera.x = p.x - VIEW_W / 2;
  g.camera.y = p.y - VIEW_H / 2;
  updateFlowField(p.x, p.y);
  spawnParticles(p.x, p.y, '#d9a7ff', 34, 7);
  spawnParticles(p.x, p.y, '#ffd24d', 16, 5);
  spawnFloatingText(p.x, p.y - 30, BIOME_DEFS[biomeId].name, '#d9a7ff');
  closeWarpMenu(false);
  g.manualPause = false;
  g.paused = false;
  Sound.play('portal');
}

// Untracked return ticket: warp straight back to the ruins spawn (the chunk-0
// heart at world tile 8,8). It is always listed once ANY warp is unlocked, so
// you are never stranded far from home after your first purification. Clearing
// the current chunk's charge here keeps the portal trigger from instantly
// re-opening the menu if you happen to stand on the ruins heart.
function doWarpToSpawn() {
  const g = game;
  const p = g.player;
  // World tile (8,8) in chunk 0 is the ruins heart: this run's spawn point.
  const sx = 8 * TILE + TILE / 2;
  const sy = 8 * TILE + TILE / 2;
  p.x = sx; p.y = sy;
  g.camera.x = p.x - VIEW_W / 2;
  g.camera.y = p.y - VIEW_H / 2;
  updateFlowField(p.x, p.y);
  spawnParticles(p.x, p.y, '#d9a7ff', 34, 7);
  spawnParticles(p.x, p.y, '#ffd24d', 16, 5);
  spawnFloatingText(p.x, p.y - 30, 'RUINS SPAWN', '#d9a7ff');
  closeWarpMenu(false);
  g.manualPause = false;
  g.paused = false;
  Sound.play('portal');
}

// Delegated, capture-phase handler for the RUINS SPAWN button. It runs BEFORE
// the button's own listener: if the click lands on .warp-spawn-btn we take
// over, mark it handled so nothing else double-fires, and warp. This keeps the
// spawn warp reliable no matter how many times the button is rebuilt (each
// rebuild would otherwise orphan the listener bound to the old node).
const warpListRoot = document.getElementById('warp-list');
if (warpListRoot) {
  warpListRoot.addEventListener('click', function (ev) {
    const btn = ev.target && ev.target.closest ? ev.target.closest('.warp-spawn-btn') : null;
    if (!btn) return;
    ev.stopImmediatePropagation();
    ev.preventDefault();
    doWarpToSpawn();
  }, true); // capture: prima di ogni altro listener sul bottone/clone
}

// Minimap bookkeeping: remember every biome wedge the player ever enters this
// run so the minimap can reveal its name and heart.
function updateDiscoveries() {
  const g = game;
  const b = playerBiome();
  if (b !== BIOME_CORE && !g.discoveredBiomes.includes(b)) g.discoveredBiomes.push(b);
}

function openChest(biomeId, weaponId) {
  const g = game;
  const p = g.player;
  const pos = chestPos(biomeId);
  const def = WEAPON_DEFS[weaponId];
  if (!def) return;
  const freshlyUnlocked = unlockChestWeapon(weaponId);

  // Grant to the current run: level it up if already owned, add it otherwise.
  // A full loadout (level-up picker caps at 6) still accepts up to 8; beyond
  // that the new weapon replaces the weakest slot so it never goes to waste.
  const owned = p.weapons.find(w => w.id === weaponId);
  let grantedText = 'Equipped!';
  if (owned) {
    owned.level += 1;
    grantedText = `Level ${owned.level}`;
  } else if (p.weapons.length < 8) {
    p.weapons.push({ id: weaponId, level: 1, lastFired: 0 });
  } else {
    let lowest = p.weapons[0];
    for (const w of p.weapons) if (w.level < lowest.level) lowest = w;
    const li = p.weapons.indexOf(lowest);
    p.weapons.splice(li, 1, { id: weaponId, level: Math.max(1, lowest.level), lastFired: 0 });
    grantedText = `Replaces ${WEAPON_DEFS[lowest.id].name}`;
  }

  spawnParticles(pos.x, pos.y, '#ffd24d', 26, 6);
  spawnParticles(pos.x, pos.y, def.color, 14, 5);
  spawnFloatingText(pos.x, pos.y - 26, def.name, def.color);
  spawnFloatingText(pos.x, pos.y - 12,
    (freshlyUnlocked ? 'Unlocked! ' : '') + grantedText, freshlyUnlocked ? '#ffd24d' : '#fff');
  Sound.play('levelup');
  Sound.play('gem');
}

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
  // Time term flattened from run-log telemetry: the old 1 + T*(1 + T/5)
  // (T = minutes) drove dm past ~17 by minute 8 on Normal while weapon DPS
  // still scales roughly linearly, turning every run into a pure attrition
  // wall. Gentler start + a later, softer spike:
  //   1 min ~1.8   8 min ~11   15 min ~22   20 min ~30
  const minutes = g.time / 60000;
  const timeTerm = 1 + minutes * (0.75 + minutes / 12);
  g.difficultyMult = (g.dev.difficultyOverride > 0)
    ? g.dev.difficultyOverride
    : (timeTerm + lvlTerm) * (typeof difficultyScale === 'function' ? difficultyScale() : 1);

  updatePlayer(dt, dtSec);
  updateHearts(dt);
  updateStorm(dt, dtSec);
  updateGusts(dt, dtSec);
  updateSpawning(dt);
  updateEnemies(dt, dtSec);
  fireWeapons();
  updateShieldOrbit();
  updateProjectiles(dt, dtSec);
  updateEnemyProjectiles(dt, dtSec);
  updateClouds(dt, dtSec);
  updateFamiliar(dt);
  updateTurrets(dt, dtSec);
  updateRifts(dt, dtSec);
  updateXpClustering(dtSec);
  updatePickups(dt, dtSec);
  updateEffects(dt, dtSec);

  // Cheap periodic systems: recipe discovery + minimap discoveries
  g.recipeTimer = (g.recipeTimer || 0) - dt;
  if (g.recipeTimer <= 0) {
    g.recipeTimer = 400;
    if (typeof checkRecipes === 'function') checkRecipes();
    updateDiscoveries();
  }

  // Cap arrays for performance (particle cap scales down with quality)
  if (g.particles.length > GFX.particleCap) g.particles.splice(0, g.particles.length - GFX.particleCap);
  if (g.enemies.length > g.dev.enemyCap) {
    // Cull the FARTHEST enemies, never the ones close to the player. The old
    // per-frame sort of the whole array cost ~n·log n hypot() calls; this
    // incremental pass swap-removes distant enemies (the ones the 2600px
    // teleporter would recycle anyway) in O(n) until back under cap, spread
    // over consecutive frames so an overshoot never stalls one frame.
    const over = g.enemies.length - g.dev.enemyCap;
    const budget = Math.min(over, 24);
    const far2 = 2100 * 2100;
    let removed = 0;
    for (let i = 0; i < g.enemies.length && removed < budget; ) {
      const e = g.enemies[i];
      if (e.dead) { i++; continue; }
      const dx = e.x - g.player.x, dy = e.y - g.player.y;
      if (dx * dx + dy * dy > far2) {
        g.enemies[i] = g.enemies[g.enemies.length - 1];
        g.enemies.pop();
        removed++;
      } else i++;
    }
    if (removed < over && g.enemies.length > g.dev.enemyCap) {
      // No far victims left (all within 2100px): clip the tail, it saturates
      // the ring anyway.
      g.enemies.splice(g.dev.enemyCap);
    }
  }
  if (g.projectiles.length > 300) g.projectiles.splice(0, g.projectiles.length - 300);

  // Balance telemetry: accumulate window stats for the run log (no-op when idle)
  if (window.runLog) runLog.tick(dt);
}
