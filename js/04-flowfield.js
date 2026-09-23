// ============================================================
// FLOW FIELD PATHFINDING (for enemy wall avoidance)
// ============================================================
const FF_RAD = 42;                 // tiles radius around the player
const FF_DIM = FF_RAD * 2 + 1;     // 85
const FF_SIZE = FF_DIM * FF_DIM;
const MAX_COST = 0x7fffffff;
let ffCost = new Int32Array(FF_SIZE);
let ffDX = new Int8Array(FF_SIZE);
let ffDY = new Int8Array(FF_SIZE);
let ffQueue = new Int32Array(FF_SIZE);
let ffWalkable = new Uint8Array(FF_SIZE);   // per-recompute walkability snapshot
let ffCX = 0;                      // player tile coords used for the field
let ffCY = 0;
let ffReady = false;

function flowIndex(tx, ty) {
  return (ty - ffCY + FF_RAD) * FF_DIM + (tx - ffCX + FF_RAD);
}
function inFlowRange(tx, ty) {
  return tx - ffCX >= -FF_RAD && tx - ffCX <= FF_RAD &&
         ty - ffCY >= -FF_RAD && ty - ffCY <= FF_RAD;
}

// Multi-source BFS over tiles centered on the player's tile.
// Produces, for every walkable cell, the direction toward the cell
// with the lowest cost (the player). Enemies then read these directions.
function updateFlowField(px, py) {
  ffCX = Math.floor(px / TILE);
  ffCY = Math.floor(py / TILE);

  // Make sure the area is generated before pathing into it
  {
    const ccx = Math.floor(ffCX / CHUNK);
    const ccy = Math.floor(ffCY / CHUNK);
    const span = Math.ceil((FF_RAD + 2) / CHUNK);
    for (let dy = -span; dy <= span; dy++)
      for (let dx = -span; dx <= span; dx++)
        ensureChunk(ccx + dx, ccy + dy);
  }

  // Snapshot tile walkability into a flat buffer once, then read plain array
  // indices inside the two BFS passes. Reading through isWalkableTile there
  // re-did a chunk Map lookup per neighbour (~60k Map.gets per recompute) —
  // that was a 15-30ms stall every ~350ms of walking (BFS fires every 2 tiles).
  const wMinX = ffCX - FF_RAD, wMinY = ffCY - FF_RAD;
  for (let ly = 0; ly < FF_DIM; ly++) {
    const wy = wMinY + ly;
    const cy = Math.floor(wy / CHUNK);
    const ry = wy - cy * CHUNK;
    let cx = Math.floor(wMinX / CHUNK);
    let tiles = ensureChunk(cx, cy);
    for (let lx = 0; lx < FF_DIM; lx++) {
      const wx = wMinX + lx;
      const ncx = Math.floor(wx / CHUNK);
      if (ncx !== cx && lx > 0) { cx = ncx; tiles = ensureChunk(cx, cy); }
      ffWalkable[ly * FF_DIM + lx] =
        tiles[ry * CHUNK + (wx - cx * CHUNK)] === T_FLOOR ? 1 : 0;
    }
  }
  const alive = ffWalkable;

  ffCost.fill(MAX_COST);
  const start = flowIndex(ffCX, ffCY);
  ffCost[start] = 0;

  // BFS queue with 8 directions (orthogonal cost 10, diagonal 14).
  // Diagonal moves are only allowed when BOTH adjacent orthogonal tiles
  // are walkable, so enemies never corner-cut into walls and get stuck.
  const ndx = [1, 0, -1, 0, 1, 1, -1, -1];
  const ndy = [0, 1, 0, -1, 1, -1, 1, -1];
  const ncost = [10, 10, 10, 10, 14, 14, 14, 14];

  let head = 0, tail = 0;
  ffQueue[tail++] = start;
  while (head < tail) {
    const idx = ffQueue[head++];
    const c = ffCost[idx];
    const cx0 = (idx % FF_DIM) - FF_RAD + ffCX;
    const cy0 = ((idx / FF_DIM) | 0) - FF_RAD + ffCY;
    for (let i = 0; i < 8; i++) {
      const ddx = ndx[i], ddy = ndy[i];
      if (cx0 + ddx < ffCX - FF_RAD || cx0 + ddx > ffCX + FF_RAD ||
          cy0 + ddy < ffCY - FF_RAD || cy0 + ddy > ffCY + FF_RAD) continue;
      if (i >= 4 && (!alive[idx + ddx] || !alive[idx + ddy * FF_DIM])) continue;
      const ni = idx + ddx + ddy * FF_DIM;
      if (alive[ni] && ffCost[ni] > c + ncost[i]) {
        ffCost[ni] = c + ncost[i];
        if (tail < FF_SIZE) ffQueue[tail++] = ni;
      }
    }
  }

  // Back-propagate best direction for each walkable cell
  ffDX.fill(0);
  ffDY.fill(0);
  for (let i = 0; i < FF_SIZE; i++) {
    const c = ffCost[i];
    if (c === MAX_COST || c === 0) continue;
    const cx0 = (i % FF_DIM) - FF_RAD + ffCX;
    const cy0 = ((i / FF_DIM) | 0) - FF_RAD + ffCY;
    let best = c, bestDX = 0, bestDY = 0;
    for (let k = 0; k < 8; k++) {
      const ddx = ndx[k], ddy = ndy[k];
      if (cx0 + ddx < ffCX - FF_RAD || cx0 + ddx > ffCX + FF_RAD ||
          cy0 + ddy < ffCY - FF_RAD || cy0 + ddy > ffCY + FF_RAD) continue;
      if (k >= 4 && (!alive[i + ddx] || !alive[i + ddy * FF_DIM])) continue;
      const ni = i + ddx + ddy * FF_DIM;
      if (alive[ni] && ffCost[ni] < best) { best = ffCost[ni]; bestDX = ddx; bestDY = ddy; }
    }
    ffDX[i] = bestDX;
    ffDY[i] = bestDY;
  }
  ffReady = true;
}

// Reused result object: callers read .dx/.dy/.cost immediately after the
// call, so we never need to allocate a fresh object per enemy per frame.
const _ffDir = { dx: 0, dy: 0, cost: 0 };
function flowDirectionAt(px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (!inFlowRange(tx, ty)) return null;
  const idx = flowIndex(tx, ty);
  if (ffCost[idx] === MAX_COST) return null;
  _ffDir.dx = ffDX[idx];
  _ffDir.dy = ffDY[idx];
  _ffDir.cost = ffCost[idx];
  return _ffDir;
}