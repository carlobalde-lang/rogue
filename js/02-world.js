// ============================================================
// PROCEDURAL WORLD / TILEMAP / CHUNK RENDERING
// ============================================================
const TILE = 32;              // tile size in px
const CHUNK = 16;             // tiles per chunk side
const CHUNK_PX = TILE * CHUNK; // 512 px per chunk
const T_FLOOR = 0;
const T_WALL = 1;

// Deterministic hash for a world cell -> [0,1)
function seed2(x, y) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263;
  h = (h ^ (h >> 13)) >>> 0;
  h = (h * 1274126177) >>> 0;
  h = (h ^ (h >> 16)) >>> 0;
  return h / 4294967295;
}

// Seeded PRNG for a given chunk (stable across sessions)
function chunkRng(cx, cy) {
  let s = (seed2(cx, cy) * 4294967295) >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Cache of generated chunk tile grids: "cx,cy" -> Uint8Array
const chunkMap = new Map();

function ensureChunk(cx, cy) {
  const key = cx + ',' + cy;
  let tiles = chunkMap.get(key);
  if (tiles) return tiles;

  tiles = new Uint8Array(CHUNK * CHUNK);
  const rand = chunkRng(cx, cy);
  const isSpawn = (cx === 0 && cy === 0);

  // Number of buildings per chunk. Spawn chunk gets two small blocks
  // pushed to the far corners so the center stays open.
  const bCount = isSpawn ? 2 : 1 + Math.floor(rand() * 4);

  for (let b = 0; b < bCount; b++) {
    const w = 3 + Math.floor(rand() * 4); // 3..6 tiles wide
    const h = 3 + Math.floor(rand() * 4); // 3..6 tiles tall
    let bx, by;
    if (isSpawn) {
      // Force blocks away from the chunk center (spawn point is 8,8)
      bx = b === 0 ? 1 : CHUNK - w - 1;
      by = b === 0 ? 1 : CHUNK - h - 1;
      if (bx < 1) bx = 1;
      if (by < 1) by = 1;
    } else {
      // Try up to 8 placement spots. Buildings must stay 2 tiles away from
      // other buildings AND from chunk borders so every corridor is wide
      // enough for big enemies (>= 2 tiles) and chunks always connect.
      let placed = false;
      for (let attempt = 0; attempt < 10 && !placed; attempt++) {
        bx = 1 + Math.floor(rand() * (CHUNK - w - 2));
        by = 1 + Math.floor(rand() * (CHUNK - h - 2));
        // Check the area expanded by TWO walkable tiles on every side so
        // corridors between buildings are always >= 2 tiles (fits big foes).
        let clear = true;
        const x0 = Math.max(0, bx - 2), y0 = Math.max(0, by - 2);
        const x1 = Math.min(CHUNK - 1, bx + w + 2), y1 = Math.min(CHUNK - 1, by + h + 2);
        for (let y = y0; y <= y1 && clear; y++)
          for (let x = x0; x <= x1 && clear; x++)
            if (tiles[y * CHUNK + x] === T_WALL) clear = false;
        if (clear) { placed = true; }
      }
      if (!placed) { continue; } // no room: skip this building
    }

    // Solid wall block
    for (let y = by; y < by + h && y < CHUNK; y++)
      for (let x = bx; x < bx + w && x < CHUNK; x++)
        tiles[y * CHUNK + x] = T_WALL;

    // ~35% chance: carve a room inside with one door opening
    if (rand() < 0.35 && w >= 4 && h >= 4) {
      for (let y = by + 1; y < by + h - 1 && y < CHUNK; y++)
        for (let x = bx + 1; x < bx + w - 1 && x < CHUNK; x++)
          tiles[y * CHUNK + x] = T_FLOOR;
      const side = Math.floor(rand() * 4);
      const d1 = 1 + Math.floor(rand() * (w - 2));
      const d2 = 1 + Math.floor(rand() * (h - 2));
      if (side === 0)      tiles[by * CHUNK + bx + Math.min(d1, w - 1)] = T_FLOOR;
      else if (side === 1) tiles[(by + Math.min(d2, h - 1)) * CHUNK + bx + w - 1] = T_FLOOR;
      else if (side === 2) tiles[(by + h - 1) * CHUNK + bx + Math.min(d1, w - 1)] = T_FLOOR;
      else                 tiles[(by + Math.min(d2, h - 1)) * CHUNK + bx] = T_FLOOR;
    }
  }

  chunkMap.set(key, tiles);
  return tiles;
}

// Make sure the chunks needed to cover a world-pixel point are generated
function ensureChunksNear(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  const r = Math.ceil(VIEW_W / CHUNK_PX) + Math.ceil(VIEW_H / CHUNK_PX) + 2;
  const ccx = Math.floor(tx / CHUNK);
  const ccy = Math.floor(ty / CHUNK);
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      ensureChunk(ccx + dx, ccy + dy);
}

// World-pixel -> tile type (0 floor / 1 wall). Chunks generate on demand.
function getTile(px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  const cx = Math.floor(tx / CHUNK);
  const cy = Math.floor(ty / CHUNK);
  const tiles = ensureChunk(cx, cy);
  return tiles[(ty - cy * CHUNK) * CHUNK + (tx - cx * CHUNK)];
}

// Tile-center walkability check (for pathfinding)
function isWalkableTile(tx, ty) {
  const cx = Math.floor(tx / CHUNK);
  const cy = Math.floor(ty / CHUNK);
  const tiles = ensureChunk(cx, cy);
  return tiles[(ty - cy * CHUNK) * CHUNK + (tx - cx * CHUNK)] === T_FLOOR;
}

// ============================================================
// CHUNK RENDERING (baked offscreen canvases)
// ============================================================
const chunkCanvasCache = new Map();

function drawFloorTile(c, px, py, lx, ly, cx, cy) {
  const r = seed2(cx * CHUNK + lx, cy * CHUNK + ly);
  const base = 24 + Math.floor(r * 14);
  c.fillStyle = `rgb(${base},${base + 3},${base + 6})`;
  c.fillRect(px, py, TILE, TILE);
  // subtle stone speckles
  if (r > 0.82) {
    c.fillStyle = 'rgba(0,0,0,0.10)';
    c.fillRect(px + (lx * 7 + cy) % 18, py + (ly * 11 + cx) % 18, 4, 3);
  } else if (r < 0.05) {
    c.fillStyle = 'rgba(80,60,255,0.06)';
    c.fillRect(px + 6, py + 6, 6, 6);
  }
}

function drawWallTile(c, px, py, lx, ly, cx, cy) {
  const r = seed2(cx * CHUNK + lx, cy * CHUNK + ly);
  const l = 82 + Math.floor(r * 28);
  c.fillStyle = `rgb(${l},${l - 8},${l - 16})`;
  c.fillRect(px, py, TILE, TILE);
  // top bevel
  c.fillStyle = 'rgba(255,255,255,0.14)';
  c.fillRect(px, py, TILE, 3);
  // left bevel
  c.fillRect(px, py, 3, TILE);
  // bottom/right shadow
  c.fillStyle = 'rgba(0,0,0,0.28)';
  c.fillRect(px, py + TILE - 5, TILE, 5);
  c.fillRect(px + TILE - 5, py, 5, TILE);
  // block seams
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 1;
  c.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
}

function getChunkCanvas(cx, cy) {
  const key = cx + ',' + cy;
  let cv = chunkCanvasCache.get(key);
  if (cv) {
    // simple LRU touch: move to front is costly, keep insertion order & cap later
    return cv;
  }

  ensureChunk(cx, cy);
  // Bake at DPR resolution so terrain stays crisp on high-DPI displays;
  // the render transform scales it back down to world pixels.
  cv = document.createElement('canvas');
  cv.width = Math.round(CHUNK_PX * DPR);
  cv.height = Math.round(CHUNK_PX * DPR);
  const c = cv.getContext('2d');
  c.scale(DPR, DPR);
  for (let ly = 0; ly < CHUNK; ly++) {
    for (let lx = 0; lx < CHUNK; lx++) {
      const t = getTile(cx * CHUNK_PX + lx * TILE, cy * CHUNK_PX + ly * TILE);
      const px = lx * TILE, py = ly * TILE;
      if (t === T_WALL) drawWallTile(c, px, py, lx, ly, cx, cy);
      else drawFloorTile(c, px, py, lx, ly, cx, cy);
    }
  }
  chunkCanvasCache.set(key, cv);

  // Keep the canvas cache bounded
  if (chunkCanvasCache.size > 300) {
    const keys = [...chunkCanvasCache.keys()];
    for (let i = 0; i < keys.length - 200; i++) chunkCanvasCache.delete(keys[i]);
  }
  return cv;
}