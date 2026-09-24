// ============================================================
// BIOME AMBIENT DETAILS — small animated life in each biome
// Pure decoration: deterministic per world cell (seed2-style
// hashing rewound with WORLD_SEED), cheap per frame, no entities
// and no collision. Each visible cell spawns at most one motif.
//
// Active biomes: core (dust motes near torches) and northeast (pine
// needles + a little snow). Savanna / canyon / desert / swamp / frozen
// grass have no ambient effects. Forest keeps firefly swarms (long dark
// stretches between brief blinks) and violet insects crossing the screen
// on long, slow paths; prairie has its own slower butterflies in three
// color variants.
// ============================================================

const AMB_CELL = 150;            // world px per ambient grid cell

// Deterministic hash for a grid cell + salt -> [0,1). Mixed with the
// run seed (WORLD_SEED) so a new run reshuffles the ambient layout too.
function _ambH(gx, gy, salt) {
  let v = (gx | 0) * 374761393 + (gy | 0) * 668265263 + (WORLD_SEED | 0) * 9749 + (salt | 0) * 40503;
  v = (v ^ (v >> 13)) >>> 0;
  v = (v * 1274126177) >>> 0;
  v = (v ^ (v >> 16)) >>> 0;
  return v / 4294967295;
}

// Palette per motif.
const AMB_COL = {
  butterflyF: '#caa8ff',
  leaf:       '#7ac978',
  seed:       '#f0f3ec',
  needle:     '#5e7a4e',
  snow:       '#eef4ff',
  sparkle:    '#dff3ff',
  mote:       '#b8bcc8',
  butterflyP: '#ffd98a',
  // Prairie butterflies: three distinct color variants (gold, orange, cream).
  butterfliesPrairie: ['#ffd98a', '#ffab5e', '#fff4d0'],
  firefly:    { main: '#ffe9a0', glow: '#ffd76a' }
};

// Motif families per biome (weighted roll picks at most one per cell).
// `cat` drives the shared motion loop:
//   orbit   — hovers around its anchor
//   fall    — falls through a vertical band, respawns at the top
//   rise    — floats up through a band, fades at both ends
//   drift   — crosses the cell in one direction
const AMB_TYPES = {
  northeast: [{ id: 'needle',    p: 0.70, cat: 'fall' }, { id: 'snow',    p: 0.25, cat: 'fall' }],
  west:      [{ id: 'firefly',   p: 0.04, cat: 'cluster' }]
};

function _ambDrawGlow(x, y, r, color, a, blur) {
  if (!GFX.glow) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, PI2);
  ctx.fill();
  ctx.restore();
}

// --- generic motion loops (screen-space coords after the cell translate) --

function _ambOrbit(px, py, ph, sp, s, amp, dx, dy) {
  return [
    px + Math.sin(t * 0.003 * sp + ph) * amp * dx,
    py + Math.cos(t * 0.0026 * sp + ph * 1.3) * amp * dy + Math.sin(t * 0.006 + ph) * 3
  ];
}

function _ambFall(px, py, ph, sp) {
  const band = AMB_CELL * 2.6;
  const cyc = ((t * sp * 0.05) + ph) % 1;
  const y = (py + band * 0.5) - cyc * band;
  const x = px + Math.sin(cyc * 3 + ph + t * 0.001) * 14;
  const a = Math.min(1, cyc * 7) * Math.min(1, (1 - cyc) * 7) * 0.9;
  return [x, y, a, cyc];
}

function _ambRise(px, py, ph, sp) {
  const band = AMB_CELL * 2.2;
  const cyc = ((t * sp * 0.02) + ph) % 1;
  const y = (py - band * 0.5) + cyc * band;
  const x = px + Math.sin(cyc * 2.5 + ph) * 12;
  const a = Math.min(1, cyc * 6) * Math.min(1, (1 - cyc) * 6) * 0.85;
  return [x, y, a, cyc];
}

function _ambDrift(px, py, ph, sp) {
  const band = AMB_CELL * 2.2;
  const cyc = ((t * sp * 0.028) + ph) % 1;
  const x = (px - band * 0.5) + cyc * band + Math.sin(cyc * 4 + ph) * 8;
  const y = py + Math.sin(cyc * 3.2 + ph) * 14;
  const a = Math.min(1, cyc * 6) * Math.min(1, (1 - cyc) * 6) * 0.9;
  return [x, y, a, cyc];
}

// Ruins dust motes: very slow, aimless drifting in torch light. The motion
// is a sum of several slow sines with unrelated frequencies and a long
// baseline, so each mote wanders freely instead of cycling in lockstep.
// Amplitudes are large (long travel) but the time factor stays tiny, so the
// wandering is slow; sizes are small so the dust reads as fine grit.
function _ambMoteMove(px, py, ph, salt) {
  const q = t * 0.00035;
  const x = px + Math.sin(q * 0.7 + ph * 3) * 64 * (0.6 + salt) + Math.sin(q * 0.23 + ph * 5.7) * 46;
  const y = py + Math.cos(q * 0.5 + ph * 2.1) * 44 + Math.sin(q * 0.31 + ph * 4.3) * 36;
  return [x, y];
}

// Ruins dust motes cluster around each torch: deterministic per torch cell,
// drawn only while the player is close enough to see the light.
const AMB_DUST_MAX_R = 300;          // max player->torch distance to show dust
const AMB_DUST_FADE_IN = 120;        // distance where the fade-in completes
function _ambRuinsDust(cx, cy, w, h) {
  if (GFX.level >= 3) return;
  const p = game && game.player;
  if (!p) return;
  if (Math.hypot(p.x, p.y) > BIOME_RADIUS_CORE + 500) return;
  const firstCx = Math.floor(cx / CHUNK_PX) - 1, lastCx = Math.floor((cx + w) / CHUNK_PX) + 1;
  const firstCy = Math.floor(cy / CHUNK_PX) - 1, lastCy = Math.floor((cy + h) / CHUNK_PX) + 1;
  for (let ccy = firstCy; ccy <= lastCy; ccy++) {
    for (let ccx = firstCx; ccx <= lastCx; ccx++) {
      const torches = (typeof getChunkTorches === 'function') ? getChunkTorches(ccx, ccy) : [];
      for (let i = 0; i < torches.length; i++) {
        const tx = torches[i].x, ty = torches[i].y;
        const d = Math.hypot(tx - p.x, ty - p.y);
        if (d > AMB_DUST_MAX_R) continue;
        const fade = clamp(1 - (d - AMB_DUST_FADE_IN) / (AMB_DUST_MAX_R - AMB_DUST_FADE_IN), 0, 1);
        const n = 5 + _ambH(ccx, ccy, 100 + i * 3) * 7 | 0;
        for (let k = 0; k < n; k++) {
          const hh = _ambH(ccx, ccy, 200 + i * 5 + k);
          const ang = hh * PI2;
          const rr = 14 + hh * 52;
          const px = tx + Math.cos(ang) * rr;
          const py = ty + Math.sin(ang) * rr * 0.8;
          const mv = _ambMoteMove(px, py, hh * 9, hh);
          const sx = mv[0] - cx, sy = mv[1] - cy;
          if (sx < -30 || sx > w + 30 || sy < -30 || sy > h + 30) continue;
          ctx.save();
          ctx.globalAlpha = fade * 0.55 * (0.7 + 0.3 * Math.sin(t * 0.003 + hh * 9));
          ctx.fillStyle = AMB_COL.mote;
          ctx.beginPath();
          ctx.arc(sx, sy, 0.8 * (0.9 + hh * 0.5), 0, PI2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }
}

// --- individual motifs -------------------------------------------------

// Forest insects and prairie butterflies: a few bugs that are NOT glued to the
// camera. Each one is anchored to a fixed world cell (like the other ambient
// motifs) and rides a slow, large ellipse around it, so it drifts in and out
// of the viewport using its own world-space path instead of following the
// player. They are only hidden while off-screen, and each one is rotated to
// face its direction of travel.
function _ambFlutterBugs(cx, cy, w, h, biome, count, palette, speedMul) {
  const x0 = Math.floor(cx / AMB_CELL) - 1, x1 = Math.floor((cx + w) / AMB_CELL) + 1;
  const y0 = Math.floor(cy / AMB_CELL) - 1, y1 = Math.floor((cy + h) / AMB_CELL) + 1;
  const biomeSalt = biome.charCodeAt(0) + biome.length * 7;
  const dProb = 0.08;
  let spawned = 0;
  for (let gy = y0; gy <= y1 && spawned < count; gy++) {
    for (let gx = x0; gx <= x1 && spawned < count; gx++) {
      if (_ambH(gx, gy, 400 + biomeSalt) > dProb) continue;
      const h0 = _ambH(gx, gy, 401);
      const h1 = _ambH(gx, gy, 402);
      const h2 = _ambH(gx, gy, 403);
      // world-anchored ellipse center (fixed cell, NOT camera center)
      const ax = gx * AMB_CELL + AMB_CELL * 0.5;
      const ay = gy * AMB_CELL + AMB_CELL * 0.5;
      const rr = AMB_CELL * (1.7 + h0 * 3.0);        // 255..705px radius
      const speed = (0.09 + h1 * 0.06) * speedMul;   // arc speed, px per ms
      const ang0 = h2 * PI2;
      // position at time tau (main ellipse + slight wobble)
      const wX = (tau) => ax + Math.cos(tau * speed / rr + ang0) * rr + Math.sin(tau * 0.00021 + h2 * 6.5) * 55;
      const wY = (tau) => ay + Math.sin(tau * speed / rr + ang0) * rr * 0.75 + Math.cos(tau * 0.00017 + h1 * 8.3) * 42;
      const wx = wX(t), wy = wY(t);
      if (owningBiomeAt(wx, wy) !== biome) continue;
      const sx = wx - cx, sy = wy - cy;
      if (sx < -70 || sx > w + 70 || sy < -70 || sy > h + 70) continue;
      // heading from the finite difference over a small step; the butterfly's
      // "forward" axis is its local -Y, so rot points it along the travel dir
      const dt = 25;
      const vx = wX(t + dt) - wx, vy = wY(t + dt) - wy;
      const rot = Math.atan2(vx, -vy);
      // alpha fades while crossing the screen edges
      const edgeA = clamp(Math.min(sx / 46, (w - sx) / 46, sy / 46, (h - sy) / 46), 0, 1);
      const gA = Math.min(0.9, edgeA * 1.2);
      const col = palette[(h1 * palette.length) | 0];
      ctx.save();
      ctx.globalAlpha = gA;
      _ambButterfly(sx, sy, h2 * 9, speedMul, 0.9, col, rot);
      ctx.restore();
      spawned++;
    }
  }
}
const AMB_FOREST_BUGS = 5;
const AMB_PRAIRIE_BUGS = 5;

function _ambButterfly(px, py, ph, sp, s, col, rot) {
  const flap = Math.sin(t * 0.028 + ph);
  const x = px + Math.sin(t * 0.004 + ph) * 20 * sp;
  const y = py + Math.sin(t * 0.006 + ph) * 2 + Math.cos(t * 0.005 + ph) * 6;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot || 0) + Math.sin(t * 0.004 + ph * 0.7) * 0.15);
  const w = 3 * s * (0.45 + 0.55 * Math.abs(flap));
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(-1.2 * s, -2.4 * s, w, 2.2 * s, -0.5 - flap * 0.4, 0, PI2);
  ctx.ellipse(2.2 * s, -2.4 * s, w, 2.2 * s, 0.5 + flap * 0.4, 0, PI2);
  ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#2a2a30';
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.7 * s, 2.2 * s, 0, 0, PI2);
  ctx.fill();
  ctx.restore();
}

function _ambLeaf(x, y, a, cyc, ph, s) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.rotate(cyc * 3 + ph + Math.sin(t * 0.002 + ph) * 0.5);
  ctx.fillStyle = AMB_COL.leaf;
  ctx.beginPath();
  ctx.ellipse(0, 0, 3 * s, 1.6 * s, 0, 0, PI2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,240,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-2 * s, 0);
  ctx.lineTo(2 * s, 0);
  ctx.stroke();
  ctx.restore();
}

function _ambSeed(x, y, a, cyc, s) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.strokeStyle = AMB_COL.seed;
  ctx.lineWidth = 1;
  for (let k = 0; k < 3; k++) {
    const ga = cyc * 2 + k * 2.1;
    const l = (6 + k * 1.8) * s;
    ctx.globalAlpha = a * (0.75 + 0.25 * Math.sin(ga * 3 + t * 0.003));
    ctx.beginPath();
    ctx.moveTo(Math.cos(ga) * l * 0.15, Math.sin(ga) * l * 0.15);
    ctx.quadraticCurveTo(Math.cos(ga) * l * 0.7, Math.sin(ga) * l * 0.7, Math.cos(ga) * l, Math.sin(ga) * l);
    ctx.stroke();
  }
  ctx.globalAlpha = a;
  ctx.fillStyle = AMB_COL.seed;
  ctx.beginPath();
  ctx.arc(0, 0, 1 * s, 0, PI2);
  ctx.fill();
  ctx.restore();
}

function _ambNeedle(x, y, a, cyc, ph, s) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.rotate(0.6 + Math.sin(cyc * 4 + ph) * 0.4);
  ctx.strokeStyle = AMB_COL.needle;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-4.4 * s, 0);
  ctx.lineTo(4.4 * s, 0);
  ctx.stroke();
  ctx.restore();
}

function _ambSnow(x, y, a, cyc, s) {
  const wob = 1 + 0.25 * Math.sin(cyc * 5 + t * 0.004);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = AMB_COL.snow;
  ctx.beginPath();
  ctx.arc(x, y, 1.3 * s * wob, 0, PI2);
  ctx.fill();
  ctx.restore();
}

function _ambSparkle(x, y, ph, s) {
  const puls = Math.sin(t * 0.003 + ph);
  const a = Math.max(0, puls) * puls;
  _ambDrawGlow(x, y, 1.5 * s * (0.6 + a), AMB_COL.sparkle, 0.35 + 0.4 * a, 6);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = AMB_COL.sparkle;
  ctx.lineWidth = 1;
  const g = 2.6 * s * (0.6 + a);
  ctx.beginPath();
  ctx.moveTo(x - g, y); ctx.lineTo(x + g, y);
  ctx.moveTo(x, y - g); ctx.lineTo(x, y + g);
  ctx.stroke();
  ctx.restore();
}

// Firefly swarms: a cluster of 3-5 flies orbiting the same drifting center,
// so the forest has a few dense, live blobs instead of uniform dots. Each
// swarm spends most of its time completely dark, blinking on briefly and
// predictably from its hash, then vanishing for a long stretch again.
function _ambFireflySwarm(cxo, cyo, gx, gy, vw, vh, camX, camY) {
  const hp = _ambH(gx, gy, 55);
  const onPeriod = 2600 + hp * 3200;          // visible for ~2.6..5.8s
  const offPeriod = 9000 + _ambH(gx, gy, 56) * 9000; // hidden for ~9..18s
  const period = onPeriod + offPeriod;
  const cyc = (t + hp * period) % period;
  let gate = 0;
  if (cyc < onPeriod) {
    // smooth fade in/out at the blink's edges
    const k = cyc / onPeriod;
    gate = Math.sin(Math.PI * k) < 0.12 ? Math.sin(Math.PI * k) * 8 : 1;
    gate = Math.min(1, Math.max(0, gate));
  }
  if (gate <= 0.02) return;
  const n = 2 + (_ambH(gx, gy, 50) * 2) | 0;
  const cdx = Math.sin(t * 0.0006 + _ambH(gx, gy, 51) * 9) * 14;
  const cdy = Math.cos(t * 0.0005 + _ambH(gx, gy, 52) * 7) * 10;
  for (let i = 0; i < n; i++) {
    const h = _ambH(gx, gy, 60 + i);
    const a = h * PI2;
    const rr = 6 + h * 34;
    const fpx = cxo + cdx + Math.cos(a) * rr;
    const fpy = cyo + cdy + Math.sin(a) * rr * 0.8;
    const fph = h * 9;
    const fs = 0.9 + _ambH(gx, gy, 70 + i) * 0.5;
    const fx = fpx + Math.sin(t * 0.0008 + fph) * 4;
    const fy = fpy + Math.cos(t * 0.0006 + fph * 1.3) * 4;
    const sx = fx - camX, sy = fy - camY;
    if (sx < -40 || sx > vw + 40 || sy < -40 || sy > vh + 40) continue;
    if (sx < 0 || sx > vw || sy < 0 || sy > vh) continue;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.004 + fph);
    _ambDrawGlow(sx, sy, (1.5 + fs) * (0.6 + pulse * 0.5), AMB_COL.firefly.glow, (0.4 + 0.35 * pulse) * gate, 7 + 6 * fs);
    ctx.save();
    ctx.globalAlpha = (0.55 + 0.45 * pulse) * gate;
    ctx.fillStyle = AMB_COL.firefly.main;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.1 * fs, 0, PI2);
    ctx.fill();
    ctx.restore();
  }
}

// --- dispatch -----------------------------------------------------------

let t = 0;

function drawAmbientDetails(cx, cy, w, h) {
  t = (typeof game !== 'undefined' && game) ? game.time : 0;
  _ambRuinsDust(cx, cy, w, h);
  const scale = GFX.level >= 3 ? 0.4 : GFX.level === 2 ? 0.7 : 1;
  const x0 = Math.floor(cx / AMB_CELL) - 1, x1 = Math.floor((cx + w) / AMB_CELL) + 1;
  const y0 = Math.floor(cy / AMB_CELL) - 1, y1 = Math.floor((cy + h) / AMB_CELL) + 1;
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      const r0 = _ambH(gx, gy, 2);
      if (r0 > 0.72 * scale) continue;
      const wx = gx * AMB_CELL + AMB_CELL * 0.5;
      const wy = gy * AMB_CELL + AMB_CELL * 0.5;
      const bm = owningBiomeAt(wx, wy);
      const cfg = AMB_TYPES[bm];
      if (!cfg) continue;
      const totalP = cfg.reduce((s, ty) => s + ty.p, 0);
      const pick = _ambH(gx, gy, 3) * totalP;
      let acc = 0, ty = cfg[0];
      for (let i = 0; i < cfg.length; i++) {
        acc += cfg[i].p;
        if (pick < acc || i === cfg.length - 1) { ty = cfg[i]; break; }
      }
      const h1 = _ambH(gx, gy, 4), h2 = _ambH(gx, gy, 5), h3 = _ambH(gx, gy, 6);
      const ph = h1 * PI2;
      const sp = 0.6 + h3 * 1.2;
      const s = 0.9 + h2 * 0.7;
      const px = wx + (h1 - 0.5) * AMB_CELL * 0.6;
      const py = wy + (h2 - 0.45) * AMB_CELL * 0.6;

      if (ty.id === 'firefly') {
        _ambFireflySwarm(px, py, gx, gy, w, h, cx, cy);
        continue;
      }

      let x = px, y = py, a = 1, cyc = 0;
      switch (ty.cat) {
        case 'fall': { const v = _ambFall(px, py, ph, sp); x = v[0]; y = v[1]; a = v[2]; cyc = v[3]; break; }
        case 'rise': { const v = _ambRise(px, py, ph, sp); x = v[0]; y = v[1]; a = v[2]; cyc = v[3]; break; }
        case 'drift': { const v = _ambDrift(px, py, ph, sp); x = v[0]; y = v[1]; a = v[2]; cyc = v[3]; break; }
        case 'orbit': { const v = _ambOrbit(px, py, ph, sp, s, 10 + h3 * 26, 1, 0.8); x = v[0]; y = v[1]; break; }
      }
      const sx = x - cx, sy = y - cy;
      if (sx < -60 || sx > w + 60 || sy < -80 || sy > h + 80) continue;
      if (a <= 0.02) continue;
      switch (ty.id) {
        case 'needle': _ambNeedle(sx, sy, a, cyc, ph, s); break;
        case 'snow': _ambSnow(sx, sy, a, cyc, s); break;
      }
    }
  }
  // Forest insects and prairie butterflies ride their own long, non-grid
  // paths across the screen (prairie ones move slower).
  _ambFlutterBugs(cx, cy, w, h, 'west', AMB_FOREST_BUGS, [AMB_COL.butterflyF], 0.65);
  _ambFlutterBugs(cx, cy, w, h, 'southwest', AMB_PRAIRIE_BUGS, AMB_COL.butterfliesPrairie, 0.4);
}