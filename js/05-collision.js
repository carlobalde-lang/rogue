// ============================================================
// CIRCLE VS TILE COLLISION
// ============================================================
function circleBlocked(x, y, r) {
  const minX = Math.floor((x - r) / TILE);
  const maxX = Math.floor((x + r) / TILE);
  const minY = Math.floor((y - r) / TILE);
  const maxY = Math.floor((y + r) / TILE);
  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      if (getTile(tx * TILE + TILE * 0.5, ty * TILE + TILE * 0.5) !== T_WALL) continue;
      const x0 = tx * TILE, x1 = x0 + TILE;
      const y0 = ty * TILE, y1 = y0 + TILE;
      const cx = clamp(x, x0, x1);
      const cy = clamp(y, y0, y1);
      const ddx = x - cx, ddy = y - cy;
      if (ddx * ddx + ddy * ddy < r * r) return true;
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