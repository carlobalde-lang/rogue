// ============================================================
// CIRCLE VS TILE COLLISION
// ============================================================
// Tree trunks are drawn much narrower than their 32px tile (the canopy trees
// are 2-3x bigger but the solid wood is a slim trunk at the tile centre), so
// tree tiles collide with a CIRCLE around the trunk instead of the full-tile
// square. You can now graze a treeline or slip past a trunk the way you'd walk
// around a real tree instead of being stopped by an invisible square around it.
// Savanna baobabs have a thick water-storing bole, so their trunk hitbox is
// much fatter.
const TREE_HIT_R = 11;
const BAOBAB_HIT_R = 26;

function circleBlocked(x, y, r) {
  const minX = Math.floor((x - r) / TILE);
  const maxX = Math.floor((x + r) / TILE);
  const minY = Math.floor((y - r) / TILE);
  const maxY = Math.floor((y + r) / TILE);
  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      const x0 = tx * TILE, y0 = ty * TILE;
      const tt = getTile(x0 + TILE * 0.5, y0 + TILE * 0.5);
      if (tt !== T_WALL && tt !== T_TREE && tt !== T_TALLGRASS && tt !== T_CLIFF) continue;
      if (tt === T_TREE) {
        const tr = owningBiomeAt(x0 + TILE * 0.5, y0 + TILE * 0.5) === 'east' ? BAOBAB_HIT_R : TREE_HIT_R;
        const ddx = x - (x0 + TILE * 0.5), ddy = y - (y0 + TILE * 0.5);
        const rr = r + tr;
        if (ddx * ddx + ddy * ddy < rr * rr) return true;
      } else {
        const x1 = x0 + TILE;
        const y1 = y0 + TILE;
        const cx = clamp(x, x0, x1);
        const cy = clamp(y, y0, y1);
        const ddx = x - cx, ddy = y - cy;
        if (ddx * ddx + ddy * ddy < r * r) return true;
      }
    }
  }
  return false;
}

// Swept check: sample the path between two points so fast projectiles can't
// skip over (or through) a wall tile between frames.
function segmentBlocked(x0, y0, x1, y1, r) {
  const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4));
  for (let s = 1; s <= steps; s++) {
    const f = s / steps;
    if (circleBlocked(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, r)) return true;
  }
  return false;
}

// ============================================================
// SPATIAL GRID FOR COLLISION OPTIMIZATION
// ============================================================
class SpatialGrid {
  constructor(cellSize) { this.cellSize = cellSize; this.cells = new Map(); }
  clear() { this.cells.clear(); }
  key(cx, cy) { return cx * 10000 + cy; }
  insert(entity) {
    const cx = Math.floor(entity.x / this.cellSize);
    const cy = Math.floor(entity.y / this.cellSize);
    const k = this.key(cx, cy);
    if (!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k).push(entity);
  }
  query(x, y, radius) {
    const results = [];
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.cells.get(this.key(cx, cy));
        if (cell) results.push(...cell);
      }
    }
    return results;
  }
  // Allocation-free variant: calls `cb(entity)` for every match instead of
  // building a results array. Use this in per-frame / per-hit hot loops
  // (thorns, explosions, separation) to keep GC pressure low.
  queryEach(x, y, radius, cb) {
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.cells.get(this.key(cx, cy));
        if (!cell) continue;
        for (const entity of cell) cb(entity);
      }
    }
  }
}