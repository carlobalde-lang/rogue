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
}