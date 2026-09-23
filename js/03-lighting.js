// ============================================================
// TORCHES & DYNAMIC LIGHTING
// ============================================================
const torchCache = new Map();

// Drop the torch layout (and the world-space visibility paths cached on each
// torch) so a fresh world seed rebuilds them from the new tiles.
function clearTorchCache() {
  torchCache.clear();
}

// Every chunk gets a deterministic set of torches on floor tiles that
// line a wall, so the lighting is stable across frames. Placement avoids
// the old random scatter: candidates are accepted with a dart-throwing
// pass that enforces a minimum spacing, so torches read as evenly spaced
// wall sconces instead of accidental clusters.
function getChunkTorches(cx, cy) {
  const key = cx + ',' + cy;
  let list = torchCache.get(key);
  if (list) return list;
  ensureChunk(cx, cy);
  const tiles = chunkMap.get(key);
  const cands = [];
  for (let ty = 1; ty < CHUNK - 1; ty++) {
    for (let tx = 1; tx < CHUNK - 1; tx++) {
      if (tiles[ty * CHUNK + tx] !== T_FLOOR) continue;
      const nearWall =
        tiles[(ty - 1) * CHUNK + tx] === T_WALL || tiles[(ty - 1) * CHUNK + tx] === T_TREE || tiles[(ty - 1) * CHUNK + tx] === T_TALLGRASS || tiles[(ty - 1) * CHUNK + tx] === T_CLIFF ||
        tiles[(ty + 1) * CHUNK + tx] === T_WALL || tiles[(ty + 1) * CHUNK + tx] === T_TREE || tiles[(ty + 1) * CHUNK + tx] === T_TALLGRASS || tiles[(ty + 1) * CHUNK + tx] === T_CLIFF ||
        tiles[ty * CHUNK + tx - 1] === T_WALL || tiles[ty * CHUNK + tx - 1] === T_TREE || tiles[ty * CHUNK + tx - 1] === T_TALLGRASS || tiles[ty * CHUNK + tx - 1] === T_CLIFF ||
        tiles[ty * CHUNK + tx + 1] === T_WALL || tiles[ty * CHUNK + tx + 1] === T_TREE || tiles[ty * CHUNK + tx + 1] === T_TALLGRASS || tiles[ty * CHUNK + tx + 1] === T_CLIFF;
      if (!nearWall) continue;
      // Torches exist only on Ruins tiles, and only inside the true core
      // disc: a hard r <= BIOME_RADIUS_CORE test. Beyond that radius the
      // smoothstep blend keeps reporting isolated `core` pockets inside the
      // climate wedges, and a torch must never sit on one of those.
      const tx2 = cx * CHUNK_PX + tx * TILE + TILE * 0.5;
      const ty2 = cy * CHUNK_PX + ty * TILE + TILE * 0.5;
      if (Math.hypot(tx2, ty2) > BIOME_RADIUS_CORE) continue;
      cands.push({
        tx, ty,
        r: seed2(cx * CHUNK + tx, cy * CHUNK + ty)
      });
    }
  }
  // Sort by seed so the spread is stable across frames; then greedily keep
  // torches that are far enough apart for a natural, uncluttered rhythm.
  cands.sort((a, b) => a.r - b.r);
  const MIN_SPACING = 3.5 * TILE;        // min distance between torches
  const MIN_SPACING2 = MIN_SPACING * MIN_SPACING;
  const kept = [];
  for (const c of cands) {
    if (c.r > 0.12) continue;            // density: ~1 in 8 wall tiles
    let tooClose = false;
    for (const t of kept) {
      const dx = (c.tx - t.tx) * TILE;
      const dy = (c.ty - t.ty) * TILE;
      if (dx * dx + dy * dy < MIN_SPACING2) { tooClose = true; break; }
    }
    if (tooClose) continue;
    kept.push({ tx: c.tx, ty: c.ty, ph: Math.floor(c.r * 1000) + (cx * 7 + cy * 13) % 97 });
  }
  list = kept.map(t => ({
    x: cx * CHUNK_PX + t.tx * TILE + TILE * 0.5,
    y: cy * CHUNK_PX + t.ty * TILE + TILE * 0.5,
    ph: t.ph
  }));
  torchCache.set(key, list);
  if (torchCache.size > 300) {
    const keys = [...torchCache.keys()];
    for (let i = 0; i < keys.length - 200; i++) torchCache.delete(keys[i]);
  }
  return list;
}

function torchFlicker(t) {
  // Slow, gentle breathing: low-frequency sines with small amplitude so the
  // fire sways softly instead of strobe-flickering.
  return 0.94 +
         0.045 * Math.sin(t * 0.0028) +
         0.025 * Math.sin(t * 0.0063 + 1.2) +
         0.012 * Math.sin(t * 0.011 + 2.4);
}

const TORCH_LIGHT_R = 170;   // max ray-cast radius for torch visibility

// Cached visibility polygon per torch (keyed by camera), so the warm floor
// glow and the darkness hole reuse the same ray-cast outline each frame.
// The ray-casting itself is done ONCE per torch in world space (the tile
// world is static for a run); every frame just re-shifts that cached outline
// by the camera instead of casting 40 rays per torch again.
function torchVisWorld(t, radius) {
  if (!t._vpW) {
    const pts = buildLightPathWorld(t.x, t.y, radius, 40, 10);
    const path = new Path2D();
    for (let i = 0; i < pts.length; i += 2) {
      if (i === 0) path.moveTo(pts[i], pts[i + 1]);
      else path.lineTo(pts[i], pts[i + 1]);
    }
    path.closePath();
    t._vpW = path;
  }
  return t._vpW;
}
function torchVisPath(t, radius, cx, cy) {
  if (t._vp && t._vpCx === cx && t._vpCy === cy) return t._vp;
  t._vp = new Path2D();
  t._vp.addPath(torchVisWorld(t, radius), new DOMMatrix().translate(-cx, -cy));
  t._vpCx = cx; t._vpCy = cy;
  return t._vp;
}

// Cached light sprites: pre-rendered radial falloff canvases re-blitted and
// scaled to the current radius, so per-frame createRadialGradient churn in
// the torch/lava/flame/hole passes is zero.
const _LTR_SPR = Object.create(null);
function _lspr(key, size, stops) {
  let can = _LTR_SPR[key];
  if (can) return can;
  can = document.createElement('canvas');
  can.width = can.height = size;
  const c = can.getContext('2d');
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  _LTR_SPR[key] = can;
  return can;
}

// Flame atlas: the wood post + flickering flame + bright core baked once
// into N sway frames (flicker sampled at N phases), so drawing a torch is a
// single drawImage from a looping frame instead of ~6 path ops per torch.
const _TORCH_FLAME_N = 5;
let _torchFlameAtlas = null;
function torchFlameAtlas() {
  if (_torchFlameAtlas) return _torchFlameAtlas;
  const W = 36, H = 52, ax = 18, ay = 26;
  const atlas = document.createElement('canvas');
  atlas.width = W;
  atlas.height = H * _TORCH_FLAME_N;
  const c = atlas.getContext('2d');
  for (let k = 0; k < _TORCH_FLAME_N; k++) {
    const off = k * H;
    c.save();
    c.translate(0, off);
    const f = 0.94 +
      0.045 * Math.sin(k * 0.9) +
      0.025 * Math.sin(k * 1.8 + 1.2) +
      0.012 * Math.sin(k * 2.7 + 2.4);
    // Wood post + base
    c.fillStyle = 'rgba(20,15,10,0.55)';
    c.beginPath();
    c.arc(ax, ay + 6, 6, 0, PI2);
    c.fill();
    c.fillStyle = '#6b4a26';
    c.fillRect(ax - 2.5, ay - 2, 5, 9);
    c.fillStyle = 'rgba(255,220,160,0.25)';
    c.fillRect(ax - 2, ay - 2, 1.5, 9);
    // Flame: layered soft blob, flicker-baked into this loop frame
    const flR = 6.5 * f;
    const flD = flR * 2.6 * 2;
    c.globalAlpha = f;
    c.drawImage(_lspr('flame', 32, [['0', 'rgba(255,240,180,0.85)'], ['0.35', 'rgba(255,170,50,0.65)'], ['1', 'rgba(255,90,10,0)']]),
      ax - flD / 2, ay - 3 - flD / 2, flD, flD);
    c.globalAlpha = 1;
    // Bright core
    c.fillStyle = `rgba(255,255,220,${0.9 * f})`;
    c.beginPath();
    c.arc(ax, ay - 3 + f * 0.8, flR * 0.55, 0, PI2);
    c.fill();
    c.restore();
  }
  atlas._W = W; atlas._H = H; atlas._ax = ax; atlas._ay = ay;
  _torchFlameAtlas = atlas;
  return atlas;
}

// Draw torch posts + animated flames + warm floor glow, at ground level.
function drawTorches(cx, cy, w, h) {
  const g = game;
  if (GFX.fire === 0) return;
  const firstCx = Math.floor(cx / CHUNK_PX) - 1;
  const firstCy = Math.floor(cy / CHUNK_PX) - 1;
  const lastCx = Math.floor((cx + w) / CHUNK_PX) + 1;
  const lastCy = Math.floor((cy + h) / CHUNK_PX) + 1;

  // Warm light pools on the floor (additive) before anything else on top,
  // clipped to ray-cast visibility so walls block the tint.
  // Skipped at reduced quality (GFX.fire < 2) to save the expensive per-torch
  // visibility paths and clips.
  if (GFX.fire >= 2) {
    ctx.globalCompositeOperation = 'lighter';
    for (let ccy = firstCy; ccy <= lastCy; ccy++) {
      for (let ccx = firstCx; ccx <= lastCx; ccx++) {
        const list = getChunkTorches(ccx, ccy);
        for (const t of list) {
          const sx = t.x - cx, sy = t.y - cy;
          if (sx < -80 || sx > w + 80 || sy < -80 || sy > h + 80) continue;
          const f = torchFlicker(g.time + t.ph);
          const R = 110 * f + 30;
          const path = torchVisPath(t, TORCH_LIGHT_R, cx, cy);
          ctx.save();
          ctx.clip(path);
          ctx.drawImage(
            _lspr('warm', 32, [['0', 'rgba(255,150,40,0.20)'], ['0.6', 'rgba(255,110,20,0.08)'], ['1', 'rgba(255,90,10,0)']]),
            sx - R, sy - R, R * 2, R * 2);
          ctx.restore();
        }
      }
    }
    // Lava pools self-illuminate: a steady, slowly undulating heat glow that
    // reads even at reduced quality (no ray-cast clipping needed).
    for (let ccy = firstCy; ccy <= lastCy; ccy++) {
      for (let ccx = firstCx; ccx <= lastCx; ccx++) {
        const list = getChunkLavas(ccx, ccy);
        for (const t of list) {
          const sx = t.x - cx, sy = t.y - cy;
          if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) continue;
          const f = 0.85 + 0.12 * Math.sin(g.time * 0.003 + t.ph);
          const R = 46 + 8 * f;
          ctx.globalAlpha = f;
          ctx.drawImage(
            _lspr('lava', 32, [['0', 'rgba(255,110,20,0.18)'], ['1', 'rgba(255,80,10,0)']]),
            sx - R, sy - R, R * 2, R * 2);
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // Torch posts + flickering flames (ground level so units walk over them).
  // The post + flame + core are one atlas: a single looping drawImage.
  const fat = torchFlameAtlas();
  const fn = _TORCH_FLAME_N;
  for (let ccy = firstCy; ccy <= lastCy; ccy++) {
    for (let ccx = firstCx; ccx <= lastCx; ccx++) {
      const list = getChunkTorches(ccx, ccy);
      for (const t of list) {
        const sx = t.x - cx, sy = t.y - cy;
        if (sx < -30 || sx > w + 30 || sy < -30 || sy > h + 30) continue;
        const idx = (Math.floor(g.time * 0.0011 + t.ph * 0.0010) % fn + fn) % fn;
        ctx.drawImage(fat, 0, idx * fat._H, fat._W, fat._H, sx - fat._ax, sy - fat._ay, fat._W, fat._H);
        // Rising spark (every torch; a per-torch random vanish height a bit higher
        // than before, and only ~a quarter of each cycle is visible so on
        // average a quarter as many sparks are on screen at once). Drifts up
        // slowly and sways gently instead of dashing.
        const spH = 30 + (t.ph % 36);                     // random fade-out height (30..65px)
        const rise = (g.time * 0.03 + t.ph) % (spH * 2);
        if (rise < spH) {
          const spA = g.time * 0.0005 + t.ph;
          const swayX =
            Math.sin(spA * 2.3 + (t.ph % 7)) * 3 +
            Math.sin(spA * 1.1 + (t.ph % 13) * 1.7) * 5 +
            Math.sin(spA * 0.6 + (t.ph % 11) * 2.3) * 8;
          const tw = 0.5 + 0.5 * Math.sin(spA * 5 + t.ph); // fade near the top
          ctx.globalAlpha = 0.5 * tw;
          ctx.fillStyle = 'rgba(255,210,120,1)';
          ctx.beginPath();
          ctx.arc(sx + swayX, sy - 8 - rise, 1.4, 0, PI2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
  }
}

let lightCanvas = null;
let lightCtx = null;

// Per-biome ambient darkness: the leftover shade that fills every tile the
// player's light and the torches don't reach. Cold wedges drown in blue
// moon-shadow, hot desert wedges stay shallow and ember-warm, and the core
// keeps the original neutral gloom that the torches are built to fight.
const BIOME_DARK = {
  core:       [6, 8, 16],
  north:      [12, 22, 56],
  northeast:  [10, 20, 50],
  east:       [46, 28, 8],
  southeast:  [48, 18, 8],
  south:      [52, 12, 4],
  southwest:  [26, 34, 12],
  west:       [12, 24, 16],
  northwest:  [26, 34, 12]
};
const BIOME_DARK_ALPHA = {
  core: 0.55, north: 0.62, northeast: 0.62,
  east: 0.42, southeast: 0.40, south: 0.36,
  southwest: 0.46, west: 0.52, northwest: 0.54
};
// Blend the per-biome darkness into one continuous colour by weighing every
// biome in the weight map at the player's feet. Using weights (not the discrete
// owningBiomeAt) means walking across a boundary shades smoothly: the darkness
// no longer snaps between two entirely different tints when a tile flips.
function biomeDarkColors() {
  const p = game && game.player;
  const map = p ? biomeWeightsAt(p.x, p.y) : { core: 1 };
  let r = 0, g = 0, b = 0, a = 0, sum = 0;
  for (const k in map) {
    const w = map[k];
    const c = BIOME_DARK[k] || BIOME_DARK.core;
    const d = BIOME_DARK_ALPHA[k] != null ? BIOME_DARK_ALPHA[k] : BIOME_DARK_ALPHA.core;
    r += c[0] * w; g += c[1] * w; b += c[2] * w; a += d * w; sum += w;
  }
  if (sum > 0) { r /= sum; g /= sum; b /= sum; a /= sum; }
  // Floats on purpose: the display colour is tweened from these (see
  // smoothBiomeDark) and only rounded when it becomes a paint string, so the
  // cross-biome blend glides instead of hopping through integer bands.
  return { r, g, b, a };
}
function biomeDarkColor() {
  const c = biomeDarkColors();
  return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${c.a.toFixed(3)})`;
}

// Smoothed ambient darkness: the baked lighting canvas can only refresh its
// world-anchored layer every LIGHT_RES of camera travel, so filling it with
// the live biome colour snapped the whole-screen tint at every 256px block
// crossed (exactly when a biome boundary is being walked over). Instead the
// display colour eases toward the blended target every frame, giving a smooth
// tween between biome light moods. Both lighting paths sample through here.
let _sCur = { r: 6, g: 8, b: 16, a: 0.55 };
let _sLast = 0;
function smoothBiomeDark() {
  const now = performance.now();
  const t = biomeDarkColors();
  const k = 1 - Math.exp(-(_sLast ? now - _sLast : 16) / 900);   // ~0.9s fade
  _sLast = now;
  _sCur.r += (t.r - _sCur.r) * k;
  _sCur.g += (t.g - _sCur.g) * k;
  _sCur.b += (t.b - _sCur.b) * k;
  _sCur.a += (t.a - _sCur.a) * k;
  return _sCur;
}
function smoothBiomeDarkColor() {
  const c = smoothBiomeDark();
  return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${c.a.toFixed(3)})`;
}

// Continuous ambient wash: the tint and strength of the sun/moon overlay are
// blended the same way, so the light mood glides between biomes instead of
// jumping. Returns null where no biome has an ambient tint.
function ambientTintBlend() {
  const p = game && game.player;
  const map = p ? biomeWeightsAt(p.x, p.y) : { core: 1 };
  let r = 0, g = 0, b = 0, st = 0, sum = 0;
  for (const k in map) {
    const def = BIOME_DEFS[k];
    if (!def || !def.ambient) continue;
    const w = map[k];
    r += def.ambient.tint[0] * w;
    g += def.ambient.tint[1] * w;
    b += def.ambient.tint[2] * w;
    st += def.ambient.strength * w;
    sum += w;
  }
  if (!sum) return null;
  return { r: r / sum, g: g / sum, b: b / sum, strength: st / sum };
}

function drawLightHole(L, x, y, r, strength) {
  L.globalAlpha = strength;
  L.drawImage(_lspr('hole', 32, [['0.12', 'rgba(0,0,0,1)'], ['1', 'rgba(0,0,0,0)']]), x - r, y - r, r * 2, r * 2);
  L.globalAlpha = 1;
}

// Mini ray tracing: cast `rays` rays from a light at world (wx, wy) out to
// `radius`. Each ray stops at the first wall tile, so walls block light and
// throw true shadows (light can't bleed through a building). Returns the
// outline vertices in WORLD coordinates; the caller shifts them onto screen.
function buildLightPathWorld(wx, wy, radius, rays, step) {
  const pts = [];
  const segs = Math.max(1, Math.ceil(radius / step));
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * PI2;
    const dx = Math.cos(a), dy = Math.sin(a);
    let rr = radius;
    for (let s = 1; s <= segs; s++) {
      const px2 = wx + dx * s * step;
      const py2 = wy + dy * s * step;
      if (getTile(px2, py2) === T_WALL || getTile(px2, py2) === T_TREE || getTile(px2, py2) === T_TALLGRASS || getTile(px2, py2) === T_CLIFF) {
        rr = (s - 1) * step + step * 0.5;
        break;
      }
    }
    pts.push(wx + dx * rr, wy + dy * rr);
  }
  return pts;
}
function buildLightPath(wx, wy, radius, rays, step, cx, cy) {
  const pts = buildLightPathWorld(wx, wy, radius, rays, step);
  const path = new Path2D();
  for (let i = 0; i < pts.length; i += 2) {
    if (i === 0) path.moveTo(pts[i] - cx, pts[i + 1] - cy);
    else path.lineTo(pts[i] - cx, pts[i + 1] - cy);
  }
  path.closePath();
  return path;
}

// Ambient darkness overlay; torches and the player cut light holes shaped
// by ray-cast visibility, so solid tiles block the light and throw shadows.
// The world is static, so the ENTIRE static layer — ambient fill, every
// torch/lava hole — is pre-rendered to a world-anchored canvas once per
// LIGHT_RES of camera travel. Each frame just blits the right sub-rect
// (camera sub-block offset) and punches the player's moving light hole.
// LIGHT_RES = 256px (8 tiles): rebuilding on every 32px tile crossing meant a
// full-screen DPR canvas realloc + ray-cast of every on-screen torch ~7 times
// per second while walking — a visible judder even at 60+ FPS. With the
// 256px-skirted window below, a rebuild only happens every 256px of camera
// travel (~once per second at dash speed, way less while walking).
const LIGHT_RES = 8 * TILE;
let _lightStatic = null;
let _lsCtx = null;
let _ltx = -Infinity, _lty = -Infinity, _lw = 0, _lh = 0, _lm = -1;

function _buildLightStatic(ax, ay, w, h) {
  // ax/ay: world pixel anchor (a multiple of LIGHT_RES) of the window that is
  // being baked. The canvas covers the visible rect plus a LIGHT_RES skirt on
  // every side, so torch light always reaches the screen edges and the blit
  // sub-rect (offset in [LIGHT_RES, 2·LIGHT_RES)) never goes out of bounds.
  const bx = ax - LIGHT_RES, by = ay - LIGHT_RES;
  const bw = w + 2 * LIGHT_RES, bh = h + 2 * LIGHT_RES;
  if (!_lightStatic) { _lightStatic = document.createElement('canvas'); _lsCtx = _lightStatic.getContext('2d'); }
  const sw = Math.round(bw * DPR), sh = Math.round(bh * DPR);
  // Only reallocate when the window size really changes (window resize); the
  // old "width = sw" on every tile crossing re-zeroed a multi-MB buffer and
  // compounded the judder. clearRect below is much cheaper.
  if (_lightStatic.width !== sw || _lightStatic.height !== sh) {
    _lightStatic.width = sw; _lightStatic.height = sh;
  }
  const S = _lsCtx;
  S.setTransform(DPR, 0, 0, DPR, 0, 0);
  S.globalCompositeOperation = 'source-over';
  S.clearRect(0, 0, bw, bh);
  // Pure black silhouette: the biome tint is no longer baked here — it changes
  // every frame (smoothed) and is applied in drawLighting, while this layer
  // only records WHERE darkness must live (and its torch/lava light holes).
  S.fillStyle = '#000';
  S.fillRect(0, 0, bw, bh);

  S.globalCompositeOperation = 'destination-out';
  const g = game;
  const firstCx = Math.floor(bx / CHUNK_PX) - 1;
  const firstCy = Math.floor(by / CHUNK_PX) - 1;
  const lastCx = Math.floor((bx + bw) / CHUNK_PX) + 1;
  const lastCy = Math.floor((by + bh) / CHUNK_PX) + 1;

  // Torch holes (ray-cast at full quality, plain circles at reduced quality)
  for (let ccy = firstCy; ccy <= lastCy; ccy++) {
    for (let ccx = firstCx; ccx <= lastCx; ccx++) {
      const list = getChunkTorches(ccx, ccy);
      for (const t of list) {
        const sx = t.x - bx, sy = t.y - by;
        if (sx < -80 || sx > bw + 80 || sy < -80 || sy > bh + 80) continue;
        const f = torchFlicker(g.time + t.ph);
        const r = TORCH_LIGHT_R * f;
        if (GFX.lightMode === 1) {
          drawLightHole(S, sx, sy, r, 0.55 * f + 0.15);
          drawLightHole(S, sx, sy, TORCH_LIGHT_R * 0.45 * f, 0.9);
          continue;
        }
        S.save();
        S.translate(-bx, -by);
        S.clip(torchVisWorld(t, TORCH_LIGHT_R));
        S.translate(bx, by);
        drawLightHole(S, sx, sy, r, 0.55 * f + 0.15);
        S.restore();
        drawLightHole(S, sx, sy, TORCH_LIGHT_R * 0.45 * f, 0.9);
      }
    }
  }

  // Lava pools carve a small constant glow through the darkness.
  for (let ccy = firstCy; ccy <= lastCy; ccy++) {
    for (let ccx = firstCx; ccx <= lastCx; ccx++) {
      const list = getChunkLavas(ccx, ccy);
      for (const t of list) {
        const sx = t.x - bx, sy = t.y - by;
        if (sx < -60 || sx > bw + 60 || sy < -60 || sy > bh + 60) continue;
        drawLightHole(S, sx, sy, 34, 0.55);
      }
    }
  }
  S.globalCompositeOperation = 'source-over';
  S.globalAlpha = 1;
}

function drawLighting(cx, cy, w, h) {
  const g = game;
  if (!lightCanvas) { lightCanvas = document.createElement('canvas'); lightCtx = lightCanvas.getContext('2d'); }
  const wantW = Math.round(w * DPR), wantH = Math.round(h * DPR);
  if (lightCanvas.width !== wantW || lightCanvas.height !== wantH) {
    lightCanvas.width = wantW; lightCanvas.height = wantH;
  }
  // Rebuild the static layer once per LIGHT_RES block of camera travel, not
  // per tile (was _ltx = floor(cx/TILE): rebuilt every 32px while walking).
  const ax = Math.floor(cx / LIGHT_RES) * LIGHT_RES, ay = Math.floor(cy / LIGHT_RES) * LIGHT_RES;
  if (_ltx !== ax || _lty !== ay || _lw !== wantW || _lh !== wantH || _lm !== GFX.lightMode) {
    _buildLightStatic(ax, ay, w, h);
    _ltx = ax; _lty = ay; _lw = wantW; _lh = wantH; _lm = GFX.lightMode;
  }
  // Camera offset into the baked window — the skirt puts it in
  // [LIGHT_RES, 2·LIGHT_RES), well inside the canvas.
  const dx = cx - (ax - LIGHT_RES), dy = cy - (ay - LIGHT_RES);

  const L = lightCtx;
  L.setTransform(DPR, 0, 0, DPR, 0, 0);
  L.globalCompositeOperation = 'source-over';
  L.clearRect(0, 0, w, h);
  // Per-frame biome tint: eased toward the weight-blended target, so crossing
  // into a new biome fades the whole screen between the two light moods.
  const dc = smoothBiomeDark();
  L.fillStyle = `rgba(${Math.round(dc.r)},${Math.round(dc.g)},${Math.round(dc.b)},${dc.a.toFixed(3)})`;
  L.fillRect(0, 0, w, h);

  // Player light: a soft lantern glow that follows the player but casts no
  // hard shadows, so every visible shadow edge is anchored to torch/wall
  // geometry instead of moving with the viewpoint. The bubble shrinks and
  // fades in bright sunlit wedges so it doesn't read as a torch light outside
  // the Ruins; it widens again where the ambient gets moon-dark. This is the
  // only hole that moves every frame, so it is the only one drawn per-frame.
  const pxp = g.player.x - cx, pyp = g.player.y - cy;
  const need = clamp((dc.a - 0.25) / 0.4, 0.15, 1);
  const pR = Math.max(w, h) * (0.18 + 0.16 * need);
  {
    L.save();
    L.beginPath();
    L.arc(pxp, pyp, pR, 0, PI2);
    L.clip();
    L.globalCompositeOperation = 'destination-out';
    drawLightHole(L, pxp, pyp, pR, 0.75 * need + 0.1);
    L.restore();
  }

  // Re-apply the baked silhouette (torch/lava holes) as an alpha mask: the
  // composite keeps the tinted fill only where the silhouette is opaque.
  L.globalCompositeOperation = 'destination-in';
  L.drawImage(_lightStatic,
    Math.round(dx * DPR), Math.round(dy * DPR), Math.round(w * DPR), Math.round(h * DPR),
    0, 0, w, h);

  ctx.drawImage(lightCanvas, 0, 0, w, h);
}