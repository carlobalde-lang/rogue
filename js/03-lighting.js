// ============================================================
// TORCHES & DYNAMIC LIGHTING
// ============================================================
const torchCache = new Map();

// Every chunk gets a deterministic set of torches on floor tiles that
// line a wall, so the lighting is stable across frames.
function getChunkTorches(cx, cy) {
  const key = cx + ',' + cy;
  let list = torchCache.get(key);
  if (list) return list;
  ensureChunk(cx, cy);
  const tiles = chunkMap.get(key);
  list = [];
  for (let ty = 1; ty < CHUNK - 1; ty++) {
    for (let tx = 1; tx < CHUNK - 1; tx++) {
      if (tiles[ty * CHUNK + tx] !== T_FLOOR) continue;
      const nearWall =
        tiles[(ty - 1) * CHUNK + tx] === T_WALL ||
        tiles[(ty + 1) * CHUNK + tx] === T_WALL ||
        tiles[ty * CHUNK + tx - 1] === T_WALL ||
        tiles[ty * CHUNK + tx + 1] === T_WALL;
      if (!nearWall) continue;
      const r = seed2(cx * CHUNK + tx, cy * CHUNK + ty);
      if (r < 0.07) {
        list.push({
          x: cx * CHUNK_PX + tx * TILE + TILE * 0.5,
          y: cy * CHUNK_PX + ty * TILE + TILE * 0.5,
          ph: Math.floor(r * 1000) + (cx * 7 + cy * 13) % 97
        });
      }
    }
  }
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
function torchVisPath(t, radius, cx, cy) {
  if (t._vp && t._vpCx === cx && t._vpCy === cy) return t._vp;
  t._vp = buildLightPath(t.x, t.y, radius, 40, 10, cx, cy);
  t._vpCx = cx; t._vpCy = cy;
  return t._vp;
}

// Draw torch posts + animated flames + warm floor glow, at ground level.
function drawTorches(cx, cy, w, h) {
  const g = game;
  const firstCx = Math.floor(cx / CHUNK_PX) - 1;
  const firstCy = Math.floor(cy / CHUNK_PX) - 1;
  const lastCx = Math.floor((cx + w) / CHUNK_PX) + 1;
  const lastCy = Math.floor((cy + h) / CHUNK_PX) + 1;

  // Warm light pools on the floor (additive) before anything else on top,
  // clipped to ray-cast visibility so walls block the tint
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
        const grd = ctx.createRadialGradient(sx, sy, 4, sx, sy, R);
        grd.addColorStop(0, 'rgba(255,150,40,0.20)');
        grd.addColorStop(0.6, 'rgba(255,110,20,0.08)');
        grd.addColorStop(1, 'rgba(255,90,10,0)');
        ctx.save();
        ctx.clip(path);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(sx, sy, R, 0, PI2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  // Torch posts + flickering flames (ground level so units walk over them)
  for (let ccy = firstCy; ccy <= lastCy; ccy++) {
    for (let ccx = firstCx; ccx <= lastCx; ccx++) {
      const list = getChunkTorches(ccx, ccy);
      for (const t of list) {
        const sx = t.x - cx, sy = t.y - cy;
        if (sx < -30 || sx > w + 30 || sy < -30 || sy > h + 30) continue;
        const f = torchFlicker(g.time + t.ph);
        // Wood post + base
        ctx.fillStyle = 'rgba(20,15,10,0.55)';
        ctx.beginPath();
        ctx.arc(sx, sy + 6, 6, 0, PI2);
        ctx.fill();
        ctx.fillStyle = '#6b4a26';
        ctx.fillRect(sx - 2.5, sy - 2, 5, 9);
        ctx.fillStyle = 'rgba(255,220,160,0.25)';
        ctx.fillRect(sx - 2, sy - 2, 1.5, 9);

        // Flame: layered soft blobs with an inward flicker
        const flR = 6.5 * f;
        const grd = ctx.createRadialGradient(sx, sy - 3, 1, sx, sy - 3, flR * 2.6);
        grd.addColorStop(0, `rgba(255,240,180,${0.85 * f})`);
        grd.addColorStop(0.35, `rgba(255,170,50,${0.65 * f})`);
        grd.addColorStop(1, 'rgba(255,90,10,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(sx, sy - 3, flR * 2.6, 0, PI2);
        ctx.fill();
        // Bright core
        ctx.fillStyle = `rgba(255,255,220,${0.9 * f})`;
        ctx.beginPath();
        ctx.arc(sx, sy - 3 + f * 0.8, flR * 0.55, 0, PI2);
        ctx.fill();
        // Rising spark
        const spA = g.time * 0.02 + t.ph;
        ctx.fillStyle = 'rgba(255,210,120,0.5)';
        ctx.beginPath();
        ctx.arc(sx + Math.sin(spA) * 3, sy - 8 - (g.time * 12 + t.ph) % 14, 1.4, 0, PI2);
        ctx.fill();
      }
    }
  }
}

let lightCanvas = null;
let lightCtx = null;

function drawLightHole(L, x, y, r, strength) {
  const grd = L.createRadialGradient(x, y, r * 0.12, x, y, r);
  grd.addColorStop(0, `rgba(0,0,0,${strength})`);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  L.fillStyle = grd;
  L.beginPath();
  L.arc(x, y, r, 0, PI2);
  L.fill();
}

// Mini ray tracing: cast `rays` rays from a light at world (wx, wy) out to
// `radius`. Each ray stops at the first wall tile, so walls block light and
// throw true shadows (light can't bleed through a building). Returns the
// visibility outline as a Path2D in screen space for clipping the light.
function buildLightPath(wx, wy, radius, rays, step, cx, cy) {
  const path = new Path2D();
  const segs = Math.max(1, Math.ceil(radius / step));
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * PI2;
    const dx = Math.cos(a), dy = Math.sin(a);
    let rr = radius;
    for (let s = 1; s <= segs; s++) {
      const px2 = wx + dx * s * step;
      const py2 = wy + dy * s * step;
      if (getTile(px2, py2) === T_WALL) {
        rr = (s - 1) * step + step * 0.5;
        break;
      }
    }
    const sx = wx + dx * rr - cx;
    const sy = wy + dy * rr - cy;
    if (i === 0) path.moveTo(sx, sy);
    else path.lineTo(sx, sy);
  }
  path.closePath();
  return path;
}

// Ambient darkness overlay; torches and the player cut light holes shaped
// by ray-cast visibility, so solid tiles block the light and throw shadows.
function drawLighting(cx, cy, w, h) {
  const g = game;
  if (!lightCanvas) { lightCanvas = document.createElement('canvas'); lightCtx = lightCanvas.getContext('2d'); }
  const wantW = Math.round(w * DPR), wantH = Math.round(h * DPR);
  if (lightCanvas.width !== wantW || lightCanvas.height !== wantH) {
    lightCanvas.width = wantW; lightCanvas.height = wantH;
  }
  const L = lightCtx;
  L.setTransform(DPR, 0, 0, DPR, 0, 0);
  L.globalCompositeOperation = 'source-over';
  L.clearRect(0, 0, w, h);
  L.fillStyle = 'rgba(6,8,16,0.55)';
  L.fillRect(0, 0, w, h);

  L.globalCompositeOperation = 'destination-out';

  // Player light: a soft lantern glow that follows the player but casts no
  // hard shadows, so every visible shadow edge is anchored to torch/wall
  // geometry instead of moving with the viewpoint.
  const pxp = g.player.x - cx, pyp = g.player.y - cy;
  const pR = Math.max(w, h) * 0.3;
  {
    L.save();
    L.beginPath();
    L.arc(pxp, pyp, pR, 0, PI2);
    L.clip();
    drawLightHole(L, pxp, pyp, pR, 0.8);
    L.restore();
  }

  // Torch lights, each clipped to its own visibility polygon
  const firstCx = Math.floor(cx / CHUNK_PX) - 1;
  const firstCy = Math.floor(cy / CHUNK_PX) - 1;
  const lastCx = Math.floor((cx + w) / CHUNK_PX) + 1;
  const lastCy = Math.floor((cy + h) / CHUNK_PX) + 1;
  for (let ccy = firstCy; ccy <= lastCy; ccy++) {
    for (let ccx = firstCx; ccx <= lastCx; ccx++) {
      const list = getChunkTorches(ccx, ccy);
      for (const t of list) {
        const sx = t.x - cx, sy = t.y - cy;
        if (sx < -80 || sx > w + 80 || sy < -80 || sy > h + 80) continue;
        const f = torchFlicker(g.time + t.ph);
        const r = TORCH_LIGHT_R * f;
        const path = torchVisPath(t, TORCH_LIGHT_R, cx, cy);
        L.save();
        L.clip(path);
        drawLightHole(L, sx, sy, r, 0.55 * f + 0.15);
        L.restore();
        // Un-clipped self-light halo around the flame itself: a torch is its
        // own light source, so it must never be swallowed by the shadow of a
        // neighbouring torch or a wall it sits against.
        drawLightHole(L, sx, sy, TORCH_LIGHT_R * 0.45 * f, 0.9);
      }
    }
  }

  ctx.drawImage(lightCanvas, 0, 0, w, h);
}