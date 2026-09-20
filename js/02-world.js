// ============================================================
// PROCEDURAL WORLD / TILEMAP / CHUNK RENDERING
// ============================================================
const TILE = 32;              // tile size in px
const CHUNK = 16;             // tiles per chunk side
const CHUNK_PX = TILE * CHUNK; // 512 px per chunk
const T_FLOOR = 0;
const T_WALL = 1;
// Canyon cliffs: passable by the player (kiting), but the enemy flow field
// treats them as unwalkable, so they become narrow-channel choke points.
const T_CLIFF = 2;
// Big biome trees: impassable groves that replace the stone structures in the
// tree biomes. Rendered as forest floor with a dense canopy drawn over them.
const T_TREE = 3;
// Prairie thickets: impassable blocks of very tall grass that replace the stone
// structures in the prairie. Baked like floor but fully covered by tall grass.
const T_TALLGRASS = 4;

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

// ============================================================
// BIOME-SPECIFIC STRUCTURE SHAPES
// ============================================================
// Ogni biome usa una silhouette differente: le strutture restano
// compatibili con la griglia/collisioni ma non sono più semplici
// rettangoli identici.
function buildBiomeStructure(tiles, bx, by, w, h, biome, rand) {

  const wall = (x, y) => {
    if (x >= 0 && x < CHUNK && y >= 0 && y < CHUNK) {
      tiles[y * CHUNK + x] = T_WALL;
    }
  };

  const floor = (x, y) => {
    if (x >= 0 && x < CHUNK && y >= 0 && y < CHUNK) {
      tiles[y * CHUNK + x] = T_FLOOR;
    }
  };

  if (biome === 'north') {
    // Base irregular mass
    for (let y = by; y < by + h; y++) {
      for (let x = bx; x < bx + w; x++) {
        const edge = x === bx || x === bx + w - 1 || y === by || y === by + h - 1;
        if (!edge) continue;
        if (rand() > 0.18) wall(x, y);
      }
    }
    // Ice teeth
    if (w >= 4) {
      floor(bx + 1, by);
      floor(bx + w - 2, by);
    }
    if (h >= 4) {
      floor(bx, by + h - 2);
      floor(bx + w - 1, by + 1);
    }
    return;
  }

  if (biome === 'northeast') {
    // Horizontal logs
    for (let y = by; y < by + h; y++) {
      if (y % 2 === by % 2) {
        for (let x = bx; x < bx + w; x++) wall(x, y);
      }
    }
    // Vertical corner posts
    for (let y = by; y < by + h; y++) {
      wall(bx, y);
      wall(bx + w - 1, y);
    }
    // Entrance
    floor(bx + Math.floor(w / 2), by + h - 1);
    // Small side opening
    if (h >= 5) floor(bx, by + Math.floor(h / 2));
    return;
  }

  if (biome === 'east') {
    // Thick outer walls
    for (let x = bx; x < bx + w; x++) {
      wall(x, by);
      wall(x, by + h - 1);
    }
    for (let y = by; y < by + h; y++) {
      wall(bx, y);
      wall(bx + w - 1, y);
    }
    // Cut corners -> adobe erosion
    floor(bx, by);
    floor(bx + w - 1, by);
    floor(bx, by + h - 1);
    floor(bx + w - 1, by + h - 1);
    // Inner courtyard
    if (w >= 5 && h >= 5) {
      floor(bx + 2, by + 2);
      // Entrance corridor
      floor(bx + Math.floor(w / 2), by + h - 1);
    }
    return;
  }

  if (biome === 'southeast') {
    // Irregular rock mass
    for (let y = by; y < by + h; y++) {
      for (let x = bx; x < bx + w; x++) {
        const nx = (x - bx) / Math.max(1, w - 1);
        const ny = (y - by) / Math.max(1, h - 1);
        const edgeNoise = Math.sin(nx * 7.3 + ny * 2.1) * 0.18 + Math.cos(ny * 6.1) * 0.12;
        const edge = nx < 0.18 || nx > 0.82 || ny < 0.16 || ny > 0.84;
        if (edge && rand() + edgeNoise > 0.25) wall(x, y);
      }
    }
    // Central fissure
    if (w >= 5 && h >= 5) {
      const fx = bx + Math.floor(w * 0.55);
      for (let y = by + 1; y < by + h - 1; y++) {
        if (rand() > 0.15) floor(fx, y);
      }
    }
    return;
  }

  if (biome === 'south') {
    // Two separated basalt masses
    const split = bx + Math.floor(w / 2);
    for (let y = by; y < by + h; y++) {
      for (let x = bx; x < bx + w; x++) {
        if (Math.abs(x - split) <= 0) { floor(x, y); continue; }
        const edge = x === bx || x === bx + w - 1 || y === by || y === by + h - 1;
        if (edge || rand() > 0.62) wall(x, y);
      }
    }
    // Lava fissure widened randomly
    if (w >= 5) {
      for (let y = by + 1; y < by + h - 1; y++) {
        floor(split, y);
        if (rand() > 0.65) floor(split - 1, y);
      }
    }
    return;
  }

  if (biome === 'southwest') {
    // Rounded rectangle
    for (let y = by; y < by + h; y++) {
      for (let x = bx; x < bx + w; x++) {
        const dx = Math.abs(x - (bx + (w - 1) / 2)) / Math.max(1, w / 2);
        const dy = Math.abs(y - (by + (h - 1) / 2)) / Math.max(1, h / 2);
        if (dx + dy > 1.25) continue;
        if (dx + dy > 0.75) wall(x, y);
      }
    }
    // Open entrance
    floor(bx + Math.floor(w / 2), by + h - 1);
    return;
  }

  if (biome === 'west') {
    // Broken stone perimeter
    for (let x = bx; x < bx + w; x++) {
      if (rand() > 0.25) wall(x, by);
      if (rand() > 0.35) wall(x, by + h - 1);
    }
    for (let y = by + 1; y < by + h - 1; y++) {
      if (rand() > 0.25) wall(bx, y);
      if (rand() > 0.35) wall(bx + w - 1, y);
    }
    // A few internal stone pillars
    if (w >= 5 && h >= 5) {
      if (rand() > 0.35) wall(bx + 1, by + 1);
      if (rand() > 0.45) wall(bx + w - 2, by + h - 2);
    }
    return;
  }

  if (biome === 'northwest') {
    // Organic irregular island
    for (let y = by; y < by + h; y++) {
      for (let x = bx; x < bx + w; x++) {
        const dx = Math.abs(x - (bx + (w - 1) / 2));
        const dy = Math.abs(y - (by + (h - 1) / 2));
        const limit = (w + h) * 0.42 + Math.sin(x * 2.4 + y) * 0.8;
        if (dx + dy < limit) wall(x, y);
      }
    }
    // Mud opening / water channel
    if (w >= 5) {
      floor(bx + 1, by + 1);
      floor(bx + 2, by + 1);
    }
    // Broken edge
    if (rand() > 0.4) floor(bx + w - 1, by + Math.floor(h / 2));
    return;
  }

  // CORE — RUINS keeps the original rectangular architecture.
}

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

    // Determine which biome owns the structure: the center is used so a
    // structure does not change architecture halfway through when it happens
    // to sit near a biome border.
    const sbx = bx + w * 0.5;
    const sby = by + h * 0.5;
    const swx = cx * CHUNK_PX + sbx * TILE;
    const swy = cy * CHUNK_PX + sby * TILE;
    const structureBiome = owningBiomeAt(swx, swy);

    // The desert and frozen grass are open basins: no constructed walls.
    if (structureBiome === 'south' || structureBiome === 'north') continue;
    // Tree biomes have no stone buildings either: organic groves of huge
    // impassable trees take their place (carved below, like lava pools).
    if (TREE_BIOMES[structureBiome]) continue;
    // The prairie is open grassland too: impassable tall-grass thickets take
    // the place of buildings (carved below, like the tree groves).
    if (structureBiome === 'southwest') continue;
    // The canyon has no buildings either: carved pit lanes replace them.
    if (structureBiome === 'southeast') continue;
    // The savanna has no stone buildings either: single giant baobab trees
    // replace the adobe compounds (carved below).
    if (structureBiome === 'east') continue;

    if (structureBiome === BIOME_CORE) {
      // Classic Ruins architecture
      for (let y = by; y < by + h && y < CHUNK; y++)
        for (let x = bx; x < bx + w && x < CHUNK; x++)
          tiles[y * CHUNK + x] = T_WALL;
    } else {
      // Biome-specific architecture
      buildBiomeStructure(tiles, bx, by, w, h, structureBiome, rand);
    }

    // Only Ruins get the classic interior-room treatment.  Climate biomes
    // keep their own architectural silhouette.
    if (structureBiome === BIOME_CORE && rand() < 0.35 && w >= 4 && h >= 4) {
      for (let y = by + 1; y < by + h - 1 && y < CHUNK; y++) {
        for (let x = bx + 1; x < bx + w - 1 && x < CHUNK; x++) {
          tiles[y * CHUNK + x] = T_FLOOR;
        }

        const side = Math.floor(rand() * 4);
        const d1 = 1 + Math.floor(rand() * (w - 2));
        const d2 = 1 + Math.floor(rand() * (h - 2));
        if (side === 0) {
          tiles[by * CHUNK + bx + Math.min(d1, w - 1)] = T_FLOOR;
        } else if (side === 1) {
          tiles[(by + Math.min(d2, h - 1)) * CHUNK + bx + w - 1] = T_FLOOR;
        } else if (side === 2) {
          tiles[(by + h - 1) * CHUNK + bx + Math.min(d1, w - 1)] = T_FLOOR;
        } else {
          tiles[(by + Math.min(d2, h - 1)) * CHUNK + bx] = T_FLOOR;
        }
      }
    }
  }

  // Canyon cliffs: carve unwalkable pits into the southeast wedge. Done on
  // floor tiles only (never through structures), from the world-aligned macro
  // grid so neighbouring chunks always agree on cliff tiles. Core is spared.
  for (let ty = 0; ty < CHUNK; ty++) {
    for (let tx = 0; tx < CHUNK; tx++) {
      if (tiles[ty * CHUNK + tx] !== T_FLOOR) continue;
      const wx = cx * CHUNK_PX + tx * TILE + TILE * 0.5;
      const wy = cy * CHUNK_PX + ty * TILE + TILE * 0.5;
      if (owningBiomeAt(wx, wy) !== 'southeast') continue;
      const mx = Math.floor(wx / TILE / POOL_CELL);
      const my = Math.floor(wy / TILE / POOL_CELL);
      let cliff = false;
      for (let ay = my - 2; ay <= my + 2 && !cliff; ay++) {
        for (let ax = mx - 2; ax <= mx + 2; ax++) {
          if (cliffShapeAt(ax, ay, wx, wy)) { cliff = true; break; }
        }
      }
      if (cliff) tiles[ty * CHUNK + tx] = T_CLIFF;
    }
  }

  // Big-tree groves in the tree biomes + tall-grass thickets in the prairie +
  // single giant baobabs in the savanna: organic pools of impassable terrain
  // (exactly the lava/ice pool shape logic) carved over floor tiles only, from
  // the world-aligned macro grid so neighbouring chunks always agree. Groves
  // never overwrite structures.
  for (let ty = 0; ty < CHUNK; ty++) {
    for (let tx = 0; tx < CHUNK; tx++) {
      if (tiles[ty * CHUNK + tx] !== T_FLOOR) continue;
      const wx = cx * CHUNK_PX + tx * TILE + TILE * 0.5;
      const wy = cy * CHUNK_PX + ty * TILE + TILE * 0.5;
      const bm = owningBiomeAt(wx, wy);
      let shape = null, shapeCfg = null, groveTile = T_TREE;
      if (TREE_BIOMES[bm]) {
        shape = groveShapeAt;
        shapeCfg = {
          chance: GROVE_CHANCE[bm] || 0.1, cell: GROVE_CELL,
          minR: GROVE_MIN_R[bm] || 1.5, maxR: GROVE_MAX_R[bm] || 4.0
        };
      } else if (bm === 'southwest') {
        shape = groveShapeAt;
        shapeCfg = {
          chance: PRAIRIE_GROVE_CHANCE, cell: PRAIRIE_GROVE_CELL,
          minR: PRAIRIE_GROVE_MIN_R, maxR: PRAIRIE_GROVE_MAX_R
        };
        groveTile = T_TALLGRASS;
      } else if (bm === 'east') {
        // Savanna baobabs (see baobabAnchor/baobabShapeAt).
        shape = baobabShapeAt;
      }
      if (!shape) continue;
      const cell = shapeCfg ? shapeCfg.cell : BAOBAB_CELL;
      const mx = Math.floor(wx / TILE / cell);
      const my = Math.floor(wy / TILE / cell);
      let grove = false;
      for (let ay = my - 2; ay <= my + 2 && !grove; ay++) {
        for (let ax = mx - 2; ax <= mx + 2; ax++) {
          if (shape(ax, ay, wx, wy, shapeCfg)) { grove = true; break; }
        }
      }
      if (grove) tiles[ty * CHUNK + tx] = groveTile;
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
// BIOMES — EIGHT CLIMATE WEDGES AROUND A NEUTRAL CORE
// ============================================================
// The endless world is divided into 8 wedge sectors pointing at the compass
// points (45° each), all sharing the origin. Around the origin there is a
// neutral "Ruins" core; from BIOME_RADIUS_CORE to BIOME_RADIUS_FULL the wedge
// of the direction you walk in gradually takes over, so after ~2 minutes of
// straight walking you are fully inside that climate. Sectors blend softly
// with their angular neighbours, and the transition is continuous — there
// are never hard seams, just a slow "mixing" of tile styles.
//
//   N  Frozen Grass   NE Taiga        E Savanna        SE Canyon
//   S  Desert/Lava    SW Prairie      W Forest         NW Swamp

const HAZARD_NONE = 0;
const HAZARD_ICE = 1;
const HAZARD_SNOW = 2;
const HAZARD_LAVA = 3;
const HAZARD_SWAMP = 4;
const HAZARD_WATER = 5;

// Desert lava pools: each macro-cell may host an organic pool of variable
// size and shape that freely crosses macro-cell and chunk boundaries, so lava
// forms big irregular lakes — never monotonous rows of tiles.
const POOL_CELL = 8;              // macro-cell (tiles) for desert lava pool anchors
const POOL_CHANCE = 0.09;         // share of macro cells that host a pool
const POOL_MIN_R = 1.0;           // smallest pool radius (tiles)
const POOL_MAX_R = 3.0;           // largest pool radius (tiles)

// Frozen grass ice pools: same organic shape logic as lava, but with ice.
const ICE_POOL_CHANCE = 0.08;     // slightly fewer pools than desert
const ICE_POOL_MIN_R = 1.2;       // smallest ice pool radius (tiles)
const ICE_POOL_MAX_R = 3.5;       // largest ice pool radius (tiles)

// Water pools in the prairie + murky pools in the swamp: they spawn exactly
// like the ice pools (big organic macro-cell lakes instead of scattered
// puddles) and slow the player. Swamps get the biggest, most frequent pools.
const WATER_POOL_CHANCE = 0.08;   // prairie lakes: halved count, still big
const WATER_POOL_MIN_R = 2.0;
const WATER_POOL_MAX_R = 5.0;
const SWAMP_POOL_CHANCE = 0.24;   // swamps are the wettest wedge of all
const SWAMP_POOL_MIN_R = 2.8;
const SWAMP_POOL_MAX_R = 6.8;

// Taiga frozen sheets (northeast): the old snow hazard was a scatter of tiny
// pale ellipses (read as "water mirrors"); now it's ~90% fewer tiles in rare
// HUGE blocky slabs of compacted snow/frozen ponds.
const SNOW_POOL_CHANCE = 0.02;
const SNOW_POOL_MIN_R = 6;
const SNOW_POOL_MAX_R = 16;

// Canyon cliffs: non-lethal pits carved into the southeast wedge. The player
// can run across them, but the enemy flow field treats them as unwalkable, so
// they funnel hordes through the lanes in between (kiting corridors).
const CLIFF_CHANCE = 0.16;        // share of macro cells that host a cliff
const CLIFF_MIN_R = 3.0;          // smallest cliff radius (tiles)
const CLIFF_MAX_R = 6.5;          // largest cliff radius (tiles)

// Big-tree groves in the tree biomes: the organic pool/ice shape logic above,
// tuned per biome — the forest is the most tree-dense climate of all.
const TREE_BIOMES = { west: 1, northeast: 1, northwest: 1 };
const GROVE_CELL = 12;            // macro-cell (tiles) anchoring grove blobs
const GROVE_CHANCE = { west: 0.30, northeast: 0.16, northwest: 0.16 };
const GROVE_MIN_R =   { west: 2.0, northeast: 1.6, northwest: 1.6 };
const GROVE_MAX_R =   { west: 5.5, northeast: 4.0, northwest: 4.5 };
// Share of floor tiles in the shed line around a grove that carry a small
// canopy tree, so big-tree blocks fade out through a ragged ring instead of
// an abrupt edge.
const GROVE_RING =   { west: 0.55, northeast: 0.40, northwest: 0.45 };

// Prairie tall-grass thickets: the exact same organic grove/blob logic as the
// big-tree groves above, but anchored on their own macro grid/seeds and stamped
// as impassable T_TALLGRASS. Bigger and sparser than the forest groves so the
// prairie stays a wide open kiting basin with a few dense hedge blocks.
const PRAIRIE_GROVE_CELL = 12;
const PRAIRIE_GROVE_CHANCE = 0.22;   // share of macro cells hosting a thicket
const PRAIRIE_GROVE_MIN_R = 2.6;     // smallest thicket radius (tiles)
const PRAIRIE_GROVE_MAX_R = 6.5;     // largest thicket radius (tiles)

// Savanna baobabs (east wedge): the adobe structures are replaced by single
// giant baobab trees. Each macro cell may host ONE tree — an anchor trunk tile
// (always present) plus a soft organic canopy footprint of impassable T_TREE
// tiles. Cells are small and sparse so the trees stand alone with wide kiting
// lanes kept open between them.
const BAOBAB_CELL = 10;
const BAOBAB_CHANCE = 0.16;
const BAOBAB_MIN_R = 1.4;
const BAOBAB_MAX_R = 2.6;

// Deterministic per-cell baobab: returns the anchor (trunk) tile + world centre
// pixels, or null when the cell hosts no tree. The anchor tile always carries
// the trunk so every baobab is a single connected blob with a guaranteed core.
function baobabAnchor(mx, my) {
  if (seed2(mx * 113 + 3, my * 89 + 7) >= BAOBAB_CHANCE) return null;
  const offX = 2.0 + seed2(mx * 113 + 9, my * 89 + 13) * (BAOBAB_CELL - 4.0);
  const offY = 2.0 + seed2(mx * 113 + 15, my * 89 + 17) * (BAOBAB_CELL - 4.0);
  return {
    tx: Math.floor(mx * BAOBAB_CELL + offX),
    ty: Math.floor(my * BAOBAB_CELL + offY),
    wx: (mx * BAOBAB_CELL + offX) * TILE,
    wy: (my * BAOBAB_CELL + offY) * TILE
  };
}

// Inclusive test for a world tile centre (wx,wy): inside the baobab footprint
// (anchored trunk tile + organic canopy body).
function baobabShapeAt(mx, my, wx, wy) {
  const a = baobabAnchor(mx, my);
  if (!a) return false;
  if (Math.floor(wx / TILE) === a.tx && Math.floor(wy / TILE) === a.ty) return true;
  const R = BAOBAB_MIN_R + seed2(mx * 113 + 5, my * 89 + 11) * (BAOBAB_MAX_R - BAOBAB_MIN_R);
  return organicPoolBody(mx, my, wx, wy, R, a.wx, a.wy, 113);
}

const BIOME_CORE = 'core';
const BIOME_IDS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

const BIOME_RADIUS_CORE = 8000;      // ~45s of walking: fully neutral ruins
const BIOME_RADIUS_FULL = 30000;     // ~3min: the chosen climate is pure
const BIOME_SECTOR_POWER = 8;        // cos(angle)^P cos falloff → soft blend

const BIOME_DEFS = {
  core: {
    name: 'Ruins',            color: '#8a90a6',
    floor: [24, 28, 36], floorVar: 14, wall: [82, 82, 86],
    enemy: null
  },
  north: {
    name: 'Frozen Grass',     color: '#9fd8ff',
    floor: [30, 38, 56], floorVar: 10, wall: [96, 108, 128],
    hazard: null,
    prop:   { type: 'icegrass', density: 0.30 },
    enemy: 'frostling',
    weapon: 'frostNova',
    ambient: { tint: [92, 126, 186], strength: 0.10 }
  },
  northeast: {
    name: 'Taiga',            color: '#7fd6c8',
    floor: [26, 46, 48], floorVar: 8, wall: [46, 70, 74],
    hazard: { type: HAZARD_SNOW, density: 0.12 },
    prop:   { type: 'pine', density: 0.42 },
    enemy: 'pinewraith',
    weapon: 'mirrorShard',
    ambient: { tint: [64, 108, 172], strength: 0.10 }
  },
  east: {
    name: 'Savanna',          color: '#ffd98a',
    floor: [52, 42, 26], floorVar: 12, wall: [120, 92, 52],
    hazard: null,
    prop:   { type: 'savgrass', density: 0.34 },
    enemy: 'dunerunner',
    weapon: 'boomerang',
    ambient: { tint: [255, 178, 70], strength: 0.08 }
  },
  southeast: {
    name: 'Canyon',           color: '#ff9a6a',
    floor: [54, 30, 24], floorVar: 10, wall: [104, 54, 40],
    hazard: null,
    prop:   { type: 'canyonrock', density: 0.26 },
    enemy: 'canyongolem',
    weapon: 'turret',
    ambient: { tint: [252, 122, 46], strength: 0.10 }
  },
  south: {
    name: 'Desert',           color: '#ffb84d',
    floor: [60, 46, 22], floorVar: 12, wall: [130, 96, 48],
    hazard: { type: HAZARD_LAVA, density: 0.06 },
    prop:   { type: 'cactus', density: 0.00 },   // obstacles replaced by lava pools
    enemy: 'scorcher',
    weapon: 'voidRift',
    ambient: { tint: [255, 84, 18], strength: 0.10 }
  },
  southwest: {
    name: 'Prairie',          color: '#b9e06a',
    floor: [48, 50, 24], floorVar: 10, wall: [112, 96, 60],
    hazard: { type: HAZARD_WATER, density: 0.07 },
    prop:   { type: 'tallgrass', density: 0.30 },
    enemy: 'riverwisp',
    weapon: 'bloodScythe',
    ambient: { tint: [200, 178, 64], strength: 0.06 }
  },
  west: {
    name: 'Forest',           color: '#5fbf6a',
    floor: [22, 42, 26], floorVar: 8, wall: [60, 86, 54],
    hazard: null,
    prop:   { type: 'tree', density: 0.48 },
    enemy: 'dryadseer',
    weapon: 'whipChain',
    ambient: { tint: [56, 118, 70], strength: 0.10 }
  },
  northwest: {
    name: 'Swamp',            color: '#9fc06a',
    floor: [34, 40, 20], floorVar: 9, wall: [66, 70, 40],
    hazard: { type: HAZARD_SWAMP, density: 0.10 },
    prop:   { type: 'swamptree', density: 0.36 },
    enemy: 'boghaunt',
    weapon: 'poisonCloud',
    ambient: { tint: [112, 142, 58], strength: 0.12 }
  }
};

// Per-biome climate temperature (0 = frozen, 1 = scorched). Every climate
// biome bakes a continuous grass mat; its density and blade height follow this
// value — peak growth near temperate (0.6), sparse and short in the cold, thin
// and dry in the heat.
const BIOME_TEMP = {
  north: 0.05, northeast: 0.20, northwest: 0.55, west: 0.60,
  southwest: 0.70, east: 0.80, southeast: 0.90, south: 1.00
};

// Grass mat colour per biome (the "grass prop" types below). The desert
// (south) has no grass at all.
const BIOME_GRASS = {
  north: 'icegrass', northeast: 'icegrass', northwest: 'swampgrass',
  west: 'thickgrass', southwest: 'tallgrass', east: 'savgrass',
  southeast: 'canyongrass'
};

// Prop types that are pure grass: never scattered as single plants anymore,
// exclusive stamped as a continuous mat via stampBiomeGrass.
const GRASS_PROPS = {
  icegrass: 1, savgrass: 1, tallgrass: 1, thickgrass: 1,
  swampgrass: 1, canyongrass: 1, drygrass: 1, prairiegrass: 1
};

// Temperature -> mat density: densest in the temperate wet band, thinning out
// toward both the frozen and the scorched extremes.
function grassDensity(temp) {
  return Math.min(0.92, Math.max(0.32, 0.92 - Math.abs(temp - 0.6) * 1.05));
}

// Temperature -> mat blade-length multiplier: tall in temperate, short in the
// cold and in the heat.
function grassHeight(temp) {
  return Math.min(1.35, Math.max(0.70, 1.35 - Math.abs(temp - 0.6) * 1.3));
}

// Slow smoothstep: 0 at BIOME_RADIUS_CORE, 1 at/after BIOME_RADIUS_FULL
function biomeIntensity(r) {
  if (r <= BIOME_RADIUS_CORE) return 0;
  const t = clamp((r - BIOME_RADIUS_CORE) / (BIOME_RADIUS_FULL - BIOME_RADIUS_CORE), 0, 1);
  return t * t * (3 - 2 * t);
}

// Weighted biome map at a world point. `core` appears until the climate fully
// settles, so the spawn area stays neutral and every departure is a gradient.
function biomeWeightsAt(px, py) {
  const r = Math.hypot(px, py);
  const i = biomeIntensity(r);
  if (i <= 0) return { core: 1 };
  const a = Math.atan2(py, px);
  const map = {};
  if (i < 1) map.core = 1 - i;
  for (let k = 0; k < 8; k++) {
    const ca = -Math.PI / 2 + k * Math.PI / 4;   // north = -90° (screen up)
    const d = wrapAngle(a - ca);
    const w = Math.pow(Math.max(0, Math.cos(d)), BIOME_SECTOR_POWER);
    if (w > 0.03) map[BIOME_IDS[k]] = i * w;
  }
  let sum = 0;
  for (const k in map) sum += map[k];
  const out = {};
  for (const k in map) out[k] = map[k] / sum;
  return out;
}

// Deterministic dominant biome id for a world point (seed-picked from the
// weighted map → boundary tiles "mixing" between the two neighbouring biomes).
function owningBiomeAt(px, py) {
  const pr = Math.hypot(px, py);
  const r = seed2(Math.floor(px / TILE), Math.floor(py / TILE));

  // Heart purity: inside the solid heart disc the sector is fully dominant.
  // In the feather ring the heart is a probabilistic mix with the sector
  // weights — the same blending the sectors use against each other — so the
  // ring reads as a grainier, melted biome boundary and not a colour fade.
  if (pr >= BIOME_RADIUS_CORE && pr <= BIOME_RADIUS_FULL) {
    const hf = heartFeatherAt(px, py);
    if (hf) {
      if (hf.t === 0) return hf.id;
      if (hf.t < 1) {
        const map = biomeWeightsAt(px, py);
        const keys = new Set([hf.id]);
        for (const k in map) keys.add(k);
        let acc = 0;
        for (const k of keys) {
          acc += (1 - hf.t) * (k === hf.id ? 1 : 0) + hf.t * (map[k] || 0);
          if (r < acc) return k;
        }
        return BIOME_CORE;
      }
    }
  }

  const map = biomeWeightsAt(px, py);
  let acc = 0;
  for (const k in map) {
    acc += map[k];
    if (r < acc || map[k] === 1) return k;
  }
  return BIOME_CORE;
}

// Continuous per-biome blend weights (NOT a probabilistic per-tile pick).
// owningBiomeAt() above chooses one "winning" biome per tile (grainy mix at
// the boundary); this instead returns the full weighted mix so colors can be
// faded smoothly, giving a soft gradient across the heart-circle edge and
// across sector borders instead of a hard-edged "pure" disc.
function biomeBlendWeightsAt(px, py) {
  const pr = Math.hypot(px, py);
  if (pr >= BIOME_RADIUS_CORE && pr <= BIOME_RADIUS_FULL) {
    const hf = heartFeatherAt(px, py);
    if (hf) {
      if (hf.t <= 0) return { [hf.id]: 1 };
      const map = biomeWeightsAt(px, py);
      const out = {};
      for (const k in map) out[k] = hf.t * map[k];
      out[hf.id] = (out[hf.id] || 0) + (1 - hf.t);
      return out;
    }
  }
  return biomeWeightsAt(px, py);
}

// Weighted average of a BIOME_DEFS[...][key] color array ('floor' or 'wall')
// across a set of blend weights.
function blendBiomeColor(weights, key) {
  let r = 0, g = 0, b = 0;
  for (const k in weights) {
    const def = BIOME_DEFS[k] || BIOME_DEFS.core;
    const col = def[key];
    if (!col) continue;
    const w = weights[k];
    r += col[0] * w; g += col[1] * w; b += col[2] * w;
  }
  return [r, g, b];
}

function biomeNameAt(px, py) {
  return BIOME_DEFS[owningBiomeAt(px, py)].name;
}

// Biome felt by the player right now (used for enemy spawns / HUD).
function playerBiome() {
  if (!game || !game.player) return BIOME_CORE;
  return owningBiomeAt(game.player.x, game.player.y);
}

// Shared organic lake body: the lava/cliff rounded-square blended with angular
// wobble, sampled on tile centres so water mirrors stay fully-filled slabs of
// tiles (never a wobbling circle of fragments) but never read as big squares.
// `hx` is a per-biome seed basis so no two hazard types mirror each other.
// `R` comes in tiles, `cxW/cyW` in world px, `wx/wy` is the tile centre.
function organicPoolBody(mx, my, wx, wy, R, cxW, cyW, hx) {
  const u = (wx - cxW) / (R * TILE);
  const v = (wy - cyW) / (R * TILE);
  const d = Math.hypot(u, v);
  if (d >= 2.4) return false;
  const sq = 0.30 + seed2(mx * hx + 21, my * hx + 23) * 0.70;
  const theta = Math.atan2(wy - cyW, wx - cxW);
  const wob =
    0.16 * Math.sin(theta * 3 + seed2(mx * hx + 27, my * hx + 29) * 9) +
    0.10 * Math.sin(theta * 5 + seed2(mx * hx + 31, my * hx + 37) * 13) +
    0.14 * Math.sin(theta * 2 + seed2(mx * hx + 33, my * hx + 41) * 7);
  const ca = Math.abs(Math.cos(theta)), sa = Math.abs(Math.sin(theta));
  const radial = (1 - sq) + sq * Math.max(ca, sa);
  return d <= (1 + wob) * radial;
}

// Deterministic lava pool shape anchored on a macro-cell: an organic rounded
// square (circle↔box blend with angular wobble) of any size up to POOL_MAX_R
// tiles radius, crossing macro-cell and chunk boundaries freely so pools from
// neighbour anchors merge into large irregular lakes. Fully deterministic:
// siblings chunks always agree on which world tile is lava.
function poolShapeAt(mx, my, wx, wy) {
  if (seed2(mx * 911 + 3, my * 733 + 7) >= POOL_CHANCE) return false;
  const R = POOL_MIN_R + seed2(mx * 911 + 5, my * 733 + 11) * (POOL_MAX_R - POOL_MIN_R);
  const offX = 2.2 + seed2(mx * 911 + 9, my * 733 + 13) * (POOL_CELL - 4.4);
  const offY = 2.2 + seed2(mx * 911 + 15, my * 733 + 17) * (POOL_CELL - 4.4);
  const cxW = mx * POOL_CELL * TILE + offX * TILE;
  const cyW = my * POOL_CELL * TILE + offY * TILE;
  const u = (wx - cxW) / (R * TILE);
  const v = (wy - cyW) / (R * TILE);
  const d = Math.hypot(u, v);
  if (d >= 2.4) return false;
  const sq = 0.30 + seed2(mx * 911 + 21, my * 733 + 23) * 0.70;
  const theta = Math.atan2(wy - cyW, wx - cxW);
  const wob =
    0.16 * Math.sin(theta * 3 + seed2(mx * 911 + 27, my * 733 + 29) * 9) +
    0.10 * Math.sin(theta * 5 + seed2(mx * 911 + 31, my * 733 + 37) * 13) +
    0.14 * Math.sin(theta * 2 + seed2(mx * 911 + 33, my * 733 + 41) * 7);
  const ca = Math.abs(Math.cos(theta)), sa = Math.abs(Math.sin(theta));
  const radial = (1 - sq) + sq * Math.max(ca, sa);
  return d <= (1 + wob) * radial;
}

// Ice pools for frozen grass: identical organic shape logic to lava pools but
// driven by the ICE_POOL_* constants and independent seeds so the two hazard
// types never overlap patterns.
function icePoolShapeAt(mx, my, wx, wy) {
  if (seed2(mx * 571 + 3, my * 419 + 7) >= ICE_POOL_CHANCE) return false;
  const R = ICE_POOL_MIN_R + seed2(mx * 571 + 5, my * 419 + 11) * (ICE_POOL_MAX_R - ICE_POOL_MIN_R);
  const offX = 2.2 + seed2(mx * 571 + 9, my * 419 + 13) * (POOL_CELL - 4.4);
  const offY = 2.2 + seed2(mx * 571 + 15, my * 419 + 17) * (POOL_CELL - 4.4);
  const cxW = mx * POOL_CELL * TILE + offX * TILE;
  const cyW = my * POOL_CELL * TILE + offY * TILE;
  // Organic lake body (see organicPoolBody): frozen sheets follow the
  // lava/cliff rounded-shape-with-wobble test instead of a chamfered square.
  return organicPoolBody(mx, my, wx, wy, R, cxW, cyW, 571);
}

// Canyon cliff blobs: same macro-cell shape logic as lava/ice, but carved into
// the terrain as unwalkable pits. Bigger and fewer than the hazard pools so the
// wedge gets broad kiting plates separated by lanes instead of a needle maze.
function cliffShapeAt(mx, my, wx, wy) {
  if (seed2(mx * 313 + 3, my * 229 + 7) >= CLIFF_CHANCE) return false;
  const R = CLIFF_MIN_R + seed2(mx * 313 + 5, my * 229 + 11) * (CLIFF_MAX_R - CLIFF_MIN_R);
  const offX = 2.6 + seed2(mx * 313 + 9, my * 229 + 13) * (POOL_CELL - 5.2);
  const offY = 2.6 + seed2(mx * 313 + 15, my * 229 + 17) * (POOL_CELL - 5.2);
  const cxW = mx * POOL_CELL * TILE + offX * TILE;
  const cyW = my * POOL_CELL * TILE + offY * TILE;
  const u = (wx - cxW) / (R * TILE);
  const v = (wy - cyW) / (R * TILE);
  const d = Math.hypot(u, v);
  if (d >= 2.6) return false;
  const sq = 0.25 + seed2(mx * 313 + 21, my * 229 + 23) * 0.55;
  const theta = Math.atan2(wy - cyW, wx - cxW);
  const wob =
    0.22 * Math.sin(theta * 3 + seed2(mx * 313 + 27, my * 229 + 29) * 9) +
    0.16 * Math.sin(theta * 5 + seed2(mx * 313 + 31, my * 229 + 37) * 13) +
    0.18 * Math.sin(theta * 2 + seed2(mx * 313 + 33, my * 229 + 41) * 6);
  const ca = Math.abs(Math.cos(theta)), sa = Math.abs(Math.sin(theta));
  const radial = (1 - sq) + sq * Math.max(ca, sa);
  return d <= (1 + wob) * radial;
}

// Grove/thicket blob: the same organic pool shape as lava/ice/cliffs, driven
// by a cfg {chance,minR,maxR,cell} so trees and prairie thickets each sit on
// their own macro grid and never mirror any hazard pattern. Fully
// deterministic — sibling chunks always agree on which floor tiles are trees.
function groveShapeAt(mx, my, wx, wy, cfg) {
  if (seed2(mx * 701 + 3, my * 613 + 7) >= cfg.chance) return false;
  const R = cfg.minR + seed2(mx * 701 + 5, my * 613 + 11) * (cfg.maxR - cfg.minR);
  const offX = 2.0 + seed2(mx * 701 + 9, my * 613 + 13) * (cfg.cell - 4.0);
  const offY = 2.0 + seed2(mx * 701 + 15, my * 613 + 17) * (cfg.cell - 4.0);
  const cxW = mx * cfg.cell * TILE + offX * TILE;
  const cyW = my * cfg.cell * TILE + offY * TILE;
  const u = (wx - cxW) / (R * TILE);
  const v = (wy - cyW) / (R * TILE);
  const d = Math.hypot(u, v);
  if (d >= 2.5) return false;
  const sq = 0.30 + seed2(mx * 701 + 21, my * 613 + 23) * 0.70;
  const theta = Math.atan2(wy - cyW, wx - cxW);
  const wob =
    0.16 * Math.sin(theta * 3 + seed2(mx * 701 + 27, my * 613 + 29) * 9) +
    0.10 * Math.sin(theta * 5 + seed2(mx * 701 + 31, my * 613 + 37) * 13) +
    0.14 * Math.sin(theta * 2 + seed2(mx * 701 + 33, my * 613 + 41) * 7);
  const ca = Math.abs(Math.cos(theta)), sa = Math.abs(Math.sin(theta));
  const radial = (1 - sq) + sq * Math.max(ca, sa);
  return d <= (1 + wob) * radial;
}

// Water pools in the prairie (southwest): the same organic pool shape logic as
// lava/ice, but on its own macro grid + seeds so the lakes never mirror any
// hazard pattern. Open lakes instead of isolated puddles.
function waterPoolShapeAt(mx, my, wx, wy) {
  if (seed2(mx * 877 + 3, my * 503 + 7) >= WATER_POOL_CHANCE) return false;
  const R = WATER_POOL_MIN_R + seed2(mx * 877 + 5, my * 503 + 11) * (WATER_POOL_MAX_R - WATER_POOL_MIN_R);
  const offX = 2.2 + seed2(mx * 877 + 9, my * 503 + 13) * (POOL_CELL - 4.4);
  const offY = 2.2 + seed2(mx * 877 + 15, my * 503 + 17) * (POOL_CELL - 4.4);
  const cxW = mx * POOL_CELL * TILE + offX * TILE;
  const cyW = my * POOL_CELL * TILE + offY * TILE;
  // Organic lake body (see organicPoolBody): prairie lakes get the lava-style
  // rounded wobble so they stop reading as big squares.
  return organicPoolBody(mx, my, wx, wy, R, cxW, cyW, 877);
}

// Swamp pools (northwest): the wettest wedge gets the biggest, most frequent
// organic pools of murky water.
function swampPoolShapeAt(mx, my, wx, wy) {
  if (seed2(mx * 677 + 3, my * 937 + 7) >= SWAMP_POOL_CHANCE) return false;
  const R = SWAMP_POOL_MIN_R + seed2(mx * 677 + 5, my * 937 + 11) * (SWAMP_POOL_MAX_R - SWAMP_POOL_MIN_R);
  const offX = 2.0 + seed2(mx * 677 + 9, my * 937 + 13) * (POOL_CELL - 4.0);
  const offY = 2.0 + seed2(mx * 677 + 15, my * 937 + 17) * (POOL_CELL - 4.0);
  const cxW = mx * POOL_CELL * TILE + offX * TILE;
  const cyW = my * POOL_CELL * TILE + offY * TILE;
  // Organic lake body (see organicPoolBody): swamp murk gets the same rounded
  // wobble, big but never square.
  return organicPoolBody(mx, my, wx, wy, R, cxW, cyW, 677);
}

// Taiga frozen sheets: organic macro-cell lakes like the water pools, but with
// its own seeds and a much rarer / much larger footprint.
function snowPoolShapeAt(mx, my, wx, wy) {
  if (seed2(mx * 149 + 3, my * 107 + 7) >= SNOW_POOL_CHANCE) return false;
  const R = SNOW_POOL_MIN_R + seed2(mx * 149 + 5, my * 107 + 11) * (SNOW_POOL_MAX_R - SNOW_POOL_MIN_R);
  const offX = 2.2 + seed2(mx * 149 + 9, my * 107 + 13) * (POOL_CELL - 4.4);
  const offY = 2.2 + seed2(mx * 149 + 15, my * 107 + 17) * (POOL_CELL - 4.4);
  const cxW = mx * POOL_CELL * TILE + offX * TILE;
  const cyW = my * POOL_CELL * TILE + offY * TILE;
  // Organic lake body (see organicPoolBody): taiga sheets keep their huge
  // footprint but get lava-style irregular shores.
  return organicPoolBody(mx, my, wx, wy, R, cxW, cyW, 149);
}

// Swamp mist: soft seeded patches of fog in the northwestern wedge. Returns
// density 0..1 (thicker = fogger) for a world point. Deterministic and cheap —
// only a handful of macro cells get probed per call.
const SWAMP_FOG_CELL = 14;   // macro cell (tiles) anchoring fog blobs
function swampFogAt(wx, wy) {
  const CELL = SWAMP_FOG_CELL * TILE;
  const mx = Math.floor(wx / CELL);
  const my = Math.floor(wy / CELL);
  let dens = 0;
  for (let ay = my - 2; ay <= my + 2; ay++) {
    for (let ax = mx - 2; ax <= mx + 2; ax++) {
      if (seed2(ax * 977 + 11, ay * 433 + 7) > 0.45) continue;
      const oX = (3 + seed2(ax * 977 + 3, ay * 433 + 1) * 8) * TILE;
      const oY = (3 + seed2(ax * 977 + 13, ay * 433 + 17) * 8) * TILE;
      const fx = ax * CELL + oX, fy = ay * CELL + oY;
      const R = (5 + seed2(ax * 977 + 5, ay * 433 + 11) * 5) * TILE;
      const d = Math.hypot(wx - fx, wy - fy);
      if (d < R) dens = Math.max(dens, 1 - d / R);
    }
  }
  return dens;
}

// Per-chunk authoritative hazard bitmap (0 = safe). Desert(south) uses lava
// pools and frozen grass(north) uses ice pools, both from the world-aligned
// macro-cell grid so two neighbouring chunks always agree on hazard tiles.
const hazardMapCache = new Map();
function chunkHazardMap(cx, cy) {
  const key = cx + ',' + cy;
  let map2 = hazardMapCache.get(key);
  if (map2) return map2;
  ensureChunk(cx, cy);
  const tiles = chunkMap.get(key);
  map2 = new Uint8Array(CHUNK * CHUNK);

  // Lava pools in the desert (south biome)
  for (let ty = 0; ty < CHUNK; ty++) {
    for (let tx = 0; tx < CHUNK; tx++) {
      if (tiles[ty * CHUNK + tx] !== T_FLOOR) continue;
      const wx = cx * CHUNK_PX + tx * TILE + TILE * 0.5;
      const wy = cy * CHUNK_PX + ty * TILE + TILE * 0.5;
      if (owningBiomeAt(wx, wy) !== 'south') continue;
      const mx = Math.floor(wx / TILE / POOL_CELL);
      const my = Math.floor(wy / TILE / POOL_CELL);
      let lava = false;
      for (let ay = my - 2; ay <= my + 2 && !lava; ay++) {
        for (let ax = mx - 2; ax <= mx + 2; ax++) {
          if (poolShapeAt(ax, ay, wx, wy)) { lava = true; break; }
        }
      }
      if (lava) map2[ty * CHUNK + tx] = HAZARD_LAVA;
    }
  }

  // Ice pools in frozen grass (north biome) — same organic shape logic
  for (let ty = 0; ty < CHUNK; ty++) {
    for (let tx = 0; tx < CHUNK; tx++) {
      if (map2[ty * CHUNK + tx] !== HAZARD_NONE) continue;
      if (tiles[ty * CHUNK + tx] !== T_FLOOR) continue;
      const wx = cx * CHUNK_PX + tx * TILE + TILE * 0.5;
      const wy = cy * CHUNK_PX + ty * TILE + TILE * 0.5;
      if (owningBiomeAt(wx, wy) !== 'north') continue;
      const mx = Math.floor(wx / TILE / POOL_CELL);
      const my = Math.floor(wy / TILE / POOL_CELL);
      let ice = false;
      for (let ay = my - 2; ay <= my + 2 && !ice; ay++) {
        for (let ax = mx - 2; ax <= mx + 2; ax++) {
          if (icePoolShapeAt(ax, ay, wx, wy)) { ice = true; break; }
        }
      }
      if (ice) map2[ty * CHUNK + tx] = HAZARD_ICE;
    }
  }

  // Water pools in the prairie (southwest): organic lakes that slow the player.
  for (let ty = 0; ty < CHUNK; ty++) {
    for (let tx = 0; tx < CHUNK; tx++) {
      if (map2[ty * CHUNK + tx] !== HAZARD_NONE) continue;
      if (tiles[ty * CHUNK + tx] !== T_FLOOR) continue;
      const wx = cx * CHUNK_PX + tx * TILE + TILE * 0.5;
      const wy = cy * CHUNK_PX + ty * TILE + TILE * 0.5;
      if (owningBiomeAt(wx, wy) !== 'southwest') continue;
      const mx = Math.floor(wx / TILE / POOL_CELL);
      const my = Math.floor(wy / TILE / POOL_CELL);
      let water = false;
      for (let ay = my - 2; ay <= my + 2 && !water; ay++) {
        for (let ax = mx - 2; ax <= mx + 2; ax++) {
          if (waterPoolShapeAt(ax, ay, wx, wy)) { water = true; break; }
        }
      }
      if (water) map2[ty * CHUNK + tx] = HAZARD_WATER;
    }
  }

  // Murky pools in the swamp (northwest): the biggest, wettest lakes of all.
  for (let ty = 0; ty < CHUNK; ty++) {
    for (let tx = 0; tx < CHUNK; tx++) {
      if (map2[ty * CHUNK + tx] !== HAZARD_NONE) continue;
      if (tiles[ty * CHUNK + tx] !== T_FLOOR) continue;
      const wx = cx * CHUNK_PX + tx * TILE + TILE * 0.5;
      const wy = cy * CHUNK_PX + ty * TILE + TILE * 0.5;
      if (owningBiomeAt(wx, wy) !== 'northwest') continue;
      const mx = Math.floor(wx / TILE / POOL_CELL);
      const my = Math.floor(wy / TILE / POOL_CELL);
      let murk = false;
      for (let ay = my - 2; ay <= my + 2 && !murk; ay++) {
        for (let ax = mx - 2; ax <= mx + 2; ax++) {
          if (swampPoolShapeAt(ax, ay, wx, wy)) { murk = true; break; }
        }
      }
      if (murk) map2[ty * CHUNK + tx] = HAZARD_SWAMP;
    }
  }

  // Taiga frozen sheets (northeast): rare huge blocky slabs instead of the
  // old tiny snow-ellipse scatter.
  for (let ty = 0; ty < CHUNK; ty++) {
    for (let tx = 0; tx < CHUNK; tx++) {
      if (map2[ty * CHUNK + tx] !== HAZARD_NONE) continue;
      if (tiles[ty * CHUNK + tx] !== T_FLOOR) continue;
      const wx = cx * CHUNK_PX + tx * TILE + TILE * 0.5;
      const wy = cy * CHUNK_PX + ty * TILE + TILE * 0.5;
      if (owningBiomeAt(wx, wy) !== 'northeast') continue;
      const mx = Math.floor(wx / TILE / POOL_CELL);
      const my = Math.floor(wy / TILE / POOL_CELL);
      let snow = false;
      for (let ay = my - 2; ay <= my + 2 && !snow; ay++) {
        for (let ax = mx - 2; ax <= mx + 2; ax++) {
          if (snowPoolShapeAt(ax, ay, wx, wy)) { snow = true; break; }
        }
      }
      if (snow) map2[ty * CHUNK + tx] = HAZARD_SNOW;
    }
  }

  // Left-over scatter hazards from biome definitions
  for (let ty = 0; ty < CHUNK; ty++) {
    for (let tx = 0; tx < CHUNK; tx++) {
      if (map2[ty * CHUNK + tx] !== HAZARD_NONE) continue;
      if (tiles[ty * CHUNK + tx] !== T_FLOOR) continue;
      const wx = cx * CHUNK_PX + tx * TILE + TILE * 0.5;
      const wy = cy * CHUNK_PX + ty * TILE + TILE * 0.5;
      const bm = owningBiomeAt(wx, wy);
      const def = BIOME_DEFS[bm];
      if (!def.hazard || bm === 'south' || bm === 'north' || bm === 'southwest' || bm === 'northwest' || bm === 'northeast') continue;
      const r = seed2(tx * 7 + 131, ty * 5 + 47);
      if (r < def.hazard.density) map2[ty * CHUNK + tx] = def.hazard.type;
    }
  }

  hazardMapCache.set(key, map2);
  if (hazardMapCache.size > 300) {
    const keys = [...hazardMapCache.keys()];
    for (let i = 0; i < keys.length - 200; i++) hazardMapCache.delete(keys[i]);
  }
  return map2;
}

function tileHazardAt(px, py) {
  if (getTile(px, py) === T_WALL) return HAZARD_NONE;
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  const cx2 = Math.floor(tx / CHUNK), cy2 = Math.floor(ty / CHUNK);
  const map2 = chunkHazardMap(cx2, cy2);
  return map2[(ty - cy2 * CHUNK) * CHUNK + (tx - cx2 * CHUNK)];
}

// Cached lava tiles per chunk (warm glow for the lighting pass).
const lavaCache = new Map();
function getChunkLavas(cx, cy) {
  const key = cx + ',' + cy;
  let list = lavaCache.get(key);
  if (list) return list;
  const map2 = chunkHazardMap(cx, cy);
  list = [];
  for (let ty = 1; ty < CHUNK - 1; ty++) {
    for (let tx = 1; tx < CHUNK - 1; tx++) {
      if (map2[ty * CHUNK + tx] !== HAZARD_LAVA) continue;
      list.push({
        x: cx * CHUNK_PX + tx * TILE + TILE * 0.5,
        y: cy * CHUNK_PX + ty * TILE + TILE * 0.5,
        ph: (tx * 17 + ty * 29) % 97
      });
    }
  }
  lavaCache.set(key, list);
  if (lavaCache.size > 300) {
    const keys = [...lavaCache.keys()];
    for (let i = 0; i < keys.length - 200; i++) lavaCache.delete(keys[i]);
  }
  return list;
}

// All animated hazards (lava / swamp / ice / snow / water) per chunk, so the
// render pass only needs cheap lookups each frame.
const hazardCache = new Map();
function getChunkHazards(cx, cy) {
  const key = cx + ',' + cy;
  let list = hazardCache.get(key);
  if (list) return list;
  const map2 = chunkHazardMap(cx, cy);
  list = [];
  for (let ty = 1; ty < CHUNK - 1; ty++) {
    for (let tx = 1; tx < CHUNK - 1; tx++) {
      const h = map2[ty * CHUNK + tx];
      if (h === HAZARD_NONE) continue;
      list.push({
        x: cx * CHUNK_PX + tx * TILE + TILE * 0.5,
        y: cy * CHUNK_PX + ty * TILE + TILE * 0.5,
        type: h,
        ph: (tx * 17 + ty * 29) % 97
      });
    }
  }
  hazardCache.set(key, list);
  if (hazardCache.size > 300) {
    const keys = [...hazardCache.keys()];
    for (let i = 0; i < keys.length - 200; i++) hazardCache.delete(keys[i]);
  }
  return list;
}

// Biome enemy for spawn pools (dominant biome under the player).
const BIOME_ENEMY = {
  north: 'frostling', northeast: 'pinewraith', east: 'dunerunner',
  southeast: 'canyongolem', south: 'scorcher', southwest: 'riverwisp',
  west: 'dryadseer', northwest: 'boghaunt'
};

// ============================================================
// BIOME TREASURE CHESTS
// ============================================================
// Each climate wedge hides one chest at the "heart" of its sector (the
// straight path along the sector's central angle). Stepping on it for a
// moment opens it and grants the biome's signature weapon — permanently
// unlocking it for every character and every run.
const BIOME_PURITY_R = 4375;         // solid heart disc radius around each biome heart
const BIOME_FEATHER_W = 1500;        // soft feather ring outside the disc
// The biome hearts sit one full disc radius further out than the chest ring,
// so the whole disc (not just its centre) stands clear of the core climate.
const BIOME_CHEST_RADIUS = 19000 + BIOME_PURITY_R;

// Inside the disc the sector is fully pure (owningBiomeAt), while the ring is
// a *visual* device: heartFeatherAt() lets floor renderers blend the heart
// palette toward the two adjacent sectors so the edge dissolves smoothly
// instead of a razor-sharp circle.
function heartFeatherAt(px, py) {
  for (const h of _SECTOR_HEART) {
    const d = Math.hypot(px - h.x, py - h.y);
    if (d >= BIOME_PURITY_R + BIOME_FEATHER_W) continue;
    return { id: h.id, t: d <= BIOME_PURITY_R ? 0 : (d - BIOME_PURITY_R) / BIOME_FEATHER_W };
  }
  return null;
}

// Precomputed sector heart positions (where each biome statue lives) so the
// purity check inside owningBiomeAt avoids per-tile trig.
const _SECTOR_HEART = [];
for (let _k = 0; _k < 8; _k++) {
  const _a = -Math.PI / 2 + _k * Math.PI / 4;
  _SECTOR_HEART.push({
    x: Math.cos(_a) * BIOME_CHEST_RADIUS,
    y: Math.sin(_a) * BIOME_CHEST_RADIUS,
    id: BIOME_IDS[_k]
  });
}

const BIOME_CHEST_OPEN_MS = 600;     // hold time to open

const chestCache = new Map();
function chestPos(biomeId) {
  if (chestCache.has(biomeId)) return chestCache.get(biomeId);
  const k = BIOME_IDS.indexOf(biomeId);
  const ca = -Math.PI / 2 + k * Math.PI / 4;   // same sector centers as the wedges
  const cx = Math.cos(ca) * BIOME_CHEST_RADIUS;
  const cy = Math.sin(ca) * BIOME_CHEST_RADIUS;
  // Snap onto a floor tile (spiral search) so the chest is always reachable
  // even if the exact center landed inside a ruin wall.
  let best = null;
  outer:
  for (let rad = 0; rad <= 12; rad++) {
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (Math.abs(dx) !== rad && Math.abs(dy) !== rad) continue;
        const wx = Math.round(cx / TILE) * TILE + TILE * 0.5 + dx * TILE;
        const wy = Math.round(cy / TILE) * TILE + TILE * 0.5 + dy * TILE;
        if (getTile(wx, wy) === T_WALL || getTile(wx, wy) === T_CLIFF || getTile(wx, wy) === T_TREE || getTile(wx, wy) === T_TALLGRASS) continue;
        if (tileHazardAt(wx, wy) !== HAZARD_NONE) continue;
        best = { x: wx, y: wy };
        break outer;
      }
    }
  }
  if (!best) best = { x: cx, y: cy };
  chestCache.set(biomeId, best);
  return best;
}

// All biome weapons (locked behind chests) and lookup helpers.
function chestWeapons() {
  return BIOME_IDS
    .filter(id => !!BIOME_DEFS[id].weapon)
    .map(id => ({ biome: id, weapon: BIOME_DEFS[id].weapon, biomeName: BIOME_DEFS[id].name }));
}
function biomeOfChestWeapon(weaponId) {
  return BIOME_IDS.find(id => BIOME_DEFS[id].weapon === weaponId) || null;
}
function isChestWeapon(id) { return biomeOfChestWeapon(id) !== null; }

// Permanent unlock helper (safe when meta isn't loaded yet).
function unlockChestWeapon(weaponId) {
  if (typeof metaWeaponUnlocked === 'function' && typeof meta !== 'undefined' && meta && !metaWeaponUnlocked(weaponId)) {
    meta.weapons.push(weaponId);
    if (typeof saveMeta === 'function') saveMeta();
    return true;
  }
  return false;
}

// ============================================================
// CHUNK RENDERING (baked offscreen canvases)
// ============================================================
const chunkCanvasCache = new Map();

// World-space center of a tile for biome lookups
function tileWorldCenter(cx, cy, lx, ly) {
  return [cx * CHUNK_PX + lx * TILE + TILE * 0.5, cy * CHUNK_PX + ly * TILE + TILE * 0.5];
}

// Biome floor base [r,g,b] flattened with per-tile variance + speckles
function floorStyle(px, py) {
  const weights = biomeBlendWeightsAt(px, py);
  const [fr, fg, fb] = blendBiomeColor(weights, 'floor');
  // Variance/noise amount still follows the dominant biome so the grain
  // texture doesn't itself get muddy at borders — only the base tone blends.
  const bm = owningBiomeAt(px, py);
  const def = BIOME_DEFS[bm] || BIOME_DEFS.core;
  const r = seed2(Math.floor(px / TILE), Math.floor(py / TILE));
  const j = Math.floor(r * def.floorVar);
  return [fr + j, fg + (j >> 1), fb + (j >> 1)];
}

// Ambient light tint baked into the terrain: cold wedges look moon-washed,
// hot wedges sun-drenched, and the neutral core keeps its own palette.
function applyAmbient(c, px, py, bm, weights) {
  weights = weights || biomeBlendWeightsAt(px, py);
  let tr = 0, tg = 0, tb = 0, ts = 0;
  for (const k in weights) {
    const def = BIOME_DEFS[k];
    if (!def || !def.ambient || def.ambient.strength <= 0) continue;
    const a = def.ambient, w = weights[k];
    tr += a.tint[0] * w; tg += a.tint[1] * w; tb += a.tint[2] * w;
    ts += a.strength * w;
  }
  if (ts <= 0.002) return;
  c.fillStyle = `rgba(${tr | 0},${tg | 0},${tb | 0},${ts})`;
  c.fillRect(px, py, TILE, TILE);
}

// --- Hazard decor: ground-level puddles / ice / lava / snow ---

// Organic mirror surface shared by every water mirror (prairie, swamp, frozen
// sheets): no horizontal stripes — depth patches, pockets, reflection
// fragments and a one-pixel glint, all varied per tile. Colors are per biome.
function drawMirrorSurface(c, px, py, r, deep, body, patch, pocket, organic, refl, glint) {
  const v = ((r * 17 + 7) % 7);
  c.fillStyle = deep;
  c.fillRect(px, py, TILE, TILE);
  c.fillStyle = body;
  c.fillRect(px, py, TILE, TILE);
  c.fillStyle = patch;
  c.fillRect(px + 3 + (v % 5), py + 4 + ((v * 3) % 5), 9, 6);
  c.fillRect(px + 17 - (v % 4), py + 18 + ((v * 2) % 4), 8, 5);
  c.fillStyle = pocket;
  c.fillRect(px + 11 + ((v * 4) % 7), py + 11, 7, 5);
  c.fillStyle = organic;
  c.fillRect(px + 2 + ((v * 5) % 12), py + 25, 6, 2);
  c.fillRect(px + 21 - ((v * 3) % 8), py + 7 + (v % 4), 5, 2);
  c.fillStyle = refl;
  c.fillRect(px + 5 + ((v * 7) % 14), py + 9 + (v % 5), 3, 1);
  c.fillRect(px + 18 - ((v * 4) % 9), py + 22, 4, 1);
  c.fillStyle = glint;
  if ((v & 1) === 0) {
    c.fillRect(px + 10 + ((v * 3) % 13), py + 16 + (v % 7), 2, 1);
  }
}

function drawHazardTile(c, px, py, type, r) {
  if (type === HAZARD_ICE) {
    // Northern frozen sheet: pale blue mirror, same organic layout.
    drawMirrorSurface(c, px, py, r,
      '#2a3a52', '#4a7a9a',
      'rgba(130,180,220,0.16)', 'rgba(20,60,95,0.14)',
      'rgba(150,210,240,0.10)', 'rgba(200,235,250,0.22)',
      'rgba(240,252,255,0.28)');
  } else if (type === HAZARD_SNOW) {
    // Taiga frozen lake: frosted white-blue slab, same organic layout.
    drawMirrorSurface(c, px, py, r,
      '#6a7f96', '#93adc8',
      'rgba(210,230,250,0.16)', 'rgba(70,90,120,0.15)',
      'rgba(240,248,255,0.12)', 'rgba(235,248,255,0.24)',
      'rgba(250,255,255,0.30)');
  } else if (type === HAZARD_LAVA) {
    // Full-pool lava: the whole tile is molten so adjacent pool tiles read as
    // one continuous pond instead of isolated red circles.
    c.fillStyle = '#3a1206';                 // charred crust rim
    c.fillRect(px, py, TILE, TILE);
    c.fillStyle = '#c62a09';                 // molten body (shy of the rim)
    c.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
    c.fillStyle = '#e95f14';                 // burning swirl band
    c.fillRect(px + 3 + (r * 6 | 0), py + 5 + (r * 4 | 0), TILE - 8 - (r * 8 | 0), 4);
    c.fillStyle = '#ff9340';                 // hotter streak
    c.fillRect(px + 5 + (r * 9 | 0), py + 16 + (r * 3 | 0), 11 + (r * 4 | 0), 3);
    c.fillStyle = '#ffd27a';                 // molten highlight
    c.fillRect(px + 10 + (r * 8 | 0), py + 21, 6, 2);
    c.fillStyle = 'rgba(15,5,2,0.5)';        // floating crust flakes
    c.fillRect(px + 6 + (r * 4 | 0), py + 10 + (r * 6 | 0), 3, 2);
    c.fillRect(px + 21 - (r * 5 | 0), py + 24 - (r * 6 | 0), 4, 2);
  } else if (type === HAZARD_SWAMP) {
    // Swamp mirror: murky green, same organic layout (no stripes).
    drawMirrorSurface(c, px, py, r,
      '#1f2414', '#33401c',
      'rgba(100,140,50,0.16)', 'rgba(20,35,15,0.14)',
      'rgba(120,150,70,0.10)', 'rgba(170,195,100,0.20)',
      'rgba(210,225,140,0.22)');
  } else if (type === HAZARD_WATER) {
    // Prairie lake: deep blue, same organic layout.
    drawMirrorSurface(c, px, py, r,
      '#17475a', '#24657a',
      'rgba(70,145,163,0.16)', 'rgba(15,65,82,0.14)',
      'rgba(110,180,190,0.10)', 'rgba(185,225,230,0.24)',
      'rgba(225,245,245,0.28)');
  }
}

// --- Decorative props (non-colliding scenery, kept inside their tile) ---
function drawPropTile(c, type, px, py, r, hgt) {
  const bx = px + 16;
  const by = py + TILE;
  const vs = 0.6 + r * 0.8;      // size variation from the tile seed
  const vx = (r - 0.5) * 4;      // small horizontal jitter
  if (hgt === undefined) hgt = 1; // temperature growth multiplier (grass mats)
  // Per-blade hash: decorrelates the clump geometry from the tile grid so the
  // grass mat never lines up in rows across neighbouring tiles.
  const rh = (k) => {
    const v = Math.sin(r * 43758.5453 + k * 12.9898) * 43758.5453;
    return v - Math.floor(v);
  };
  // Full-tile grass mat: roots scattered across the tile HEIGHT (never pinned
  // to the bottom edge) so the mat never forms periodic horizontal lines at
  // tile boundaries, and blades spill over the neighbours as a continuous mat.
  const grassMat = (dark, light, base, vari, lean, nDark, nLight, sw) => {
    c.strokeStyle = dark;
    c.lineWidth = sw || 2;
    c.beginPath();
    for (let i = 0; i < (nDark || 12); i++) {
      const gx = bx + (rh(i + 1) - 0.5) * 34;
      const grt = py + rh(i + 47) * TILE;
      const gh = (base + rh(i + 20) * vari) * vs * hgt;
      c.moveTo(gx, grt); c.lineTo(gx + (rh(i + 31) - 0.5) * lean, grt - gh);
    }
    c.stroke();
    c.strokeStyle = light;
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < (nLight || 10); i++) {
      const gx = bx + (rh(i + 41) - 0.5) * 34;
      const grt = py + rh(i + 59) * TILE;
      const gh = (base * 0.72 + rh(i + 53) * vari) * vs * hgt;
      c.moveTo(gx, grt); c.lineTo(gx + (rh(i + 67) - 0.5) * lean * 0.7, grt - gh);
    }
    c.stroke();
  };
  if (type === 'icegrass') {            // frozen grass: short, sparse, icy blue
    grassMat('#6f93b8', '#c2ddf5', 15, 10, 5);
  } else if (type === 'savgrass') {     // savanna: warm dry yellow-green
    grassMat('#7a5a20', '#a37a2c', 18, 12, 6);
  } else if (type === 'tallgrass') {    // prairie open-ground grass
    grassMat('#4c5a1e', '#74902c', 20, 14, 7);
  } else if (type === 'thickgrass') {   // dense forest undergrowth
    grassMat('#2e5a22', '#4a8530', 24, 14, 6, 14, 11);
  } else if (type === 'swampgrass') {   // murky swamp reeds
    grassMat('#3a4020', '#50591f', 26, 14, 7, 14, 11);
  } else if (type === 'canyongrass') {  // canyon: scarce dry tufts, never a mat
    const cl = 1 + (rh(3) > 0.62 ? 1 : 0);   // 1-2 isolated clumps per tile
    for (let k = 0; k < cl; k++) {
      const cxx = bx + (rh(4 + k * 5) - 0.5) * 22;
      const cyy = py + 7 + rh(8 + k * 7) * (TILE - 14);
      c.strokeStyle = '#7a5738';
      c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i < 4; i++) {
        const gx = cxx + (rh(11 + i + k * 13) - 0.5) * 10;
        const gh = 7 + rh(19 + i + k * 17) * 6;
        c.moveTo(gx, cyy); c.lineTo(gx + (rh(29 + i + k * 9) - 0.5) * 4, cyy - gh);
      }
      c.stroke();
      c.strokeStyle = '#a57950';
      c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i < 3; i++) {
        const gx = cxx + (rh(37 + i + k * 23) - 0.5) * 8;
        c.moveTo(gx, cyy); c.lineTo(gx + (rh(43 + i + k * 31) - 0.5) * 5, cyy - (5 + rh(47 + i + k * 11) * 4));
      }
      c.stroke();
    }
  } else if (type === 'drygrass') {     // desert: thin pale scruff
    grassMat('#a07a3a', '#cfa65c', 12, 8, 4);
  } else if (type === 'prairiegrass') { // impassable thicket: twice as thick as any grass mat
    grassMat('#3a5420', '#5f7f2e', 42, 18, 10, 36, 28, 3);
  } else if (type === 'tree') {                     // FOREST TREE - TOP DOWN
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.fillRect(bx - 12, by - 7, 24, 8);
    c.fillRect(bx - 8, by - 10, 16, 10);

    c.fillStyle = '#24170e';
    c.fillRect(bx - 3, by - 9, 6, 9);
    c.fillStyle = '#3b2614';
    c.fillRect(bx - 1, by - 8, 2, 7);

    c.fillStyle = '#102d19';
    c.fillRect(bx - 13, by - 22, 26, 14);
    c.fillRect(bx - 9, by - 27, 18, 23);
    c.fillRect(bx - 5, by - 30, 10, 27);

    c.fillStyle = '#16381f';
    c.fillRect(bx - 10, by - 24, 20, 16);
    c.fillRect(bx - 7, by - 27, 14, 20);
    c.fillRect(bx - 12, by - 19, 24, 9);

    c.fillStyle = '#1d4a28';
    c.fillRect(bx - 7, by - 25, 7, 7);
    c.fillRect(bx + 1, by - 23, 7, 8);
    c.fillRect(bx - 10, by - 17, 7, 6);
    c.fillRect(bx + 5, by - 16, 6, 5);

    c.fillStyle = '#2f7a3a';
    c.fillRect(bx - 5, by - 27, 4, 3);
    c.fillRect(bx + 2, by - 24, 3, 3);
    c.fillRect(bx - 8, by - 19, 3, 2);
  } else if (type === 'pine') {              // PINE - TOP DOWN
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.fillRect(bx - 12, by - 6, 24, 7);
    c.fillRect(bx - 8, by - 9, 16, 8);

    c.fillStyle = '#352110';
    c.fillRect(bx - 3, by - 8, 6, 8);

    c.fillStyle = '#10363a';
    c.fillRect(bx - 12, by - 20, 24, 13);
    c.fillRect(bx - 9, by - 25, 18, 18);
    c.fillRect(bx - 5, by - 29, 10, 22);

    c.fillStyle = '#17424a';
    c.fillRect(bx - 9, by - 22, 18, 13);
    c.fillRect(bx - 7, by - 26, 14, 15);
    c.fillRect(bx - 3, by - 29, 6, 19);

    c.fillStyle = '#205257';
    c.fillRect(bx - 6, by - 24, 6, 6);
    c.fillRect(bx + 1, by - 21, 6, 7);
    c.fillRect(bx - 9, by - 16, 7, 5);
    c.fillRect(bx + 4, by - 15, 6, 5);

    c.fillStyle = 'rgba(220,240,255,0.75)';
    c.fillRect(bx - 3, by - 28, 5, 3);
    c.fillRect(bx - 7, by - 23, 4, 2);
    c.fillRect(bx + 3, by - 19, 4, 2);
  } else if (type === 'swamptree') {         // SWAMP TREE - TOP DOWN
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(bx - 13, by - 7, 26, 8);
    c.fillRect(bx - 9, by - 11, 18, 10);

    c.fillStyle = '#241c10';
    c.fillRect(bx - 3, by - 11, 6, 11);
    c.fillRect(bx - 7, by - 7, 4, 6);
    c.fillRect(bx + 3, by - 10, 4, 9);

    c.fillStyle = '#252d12';
    c.fillRect(bx - 13, by - 21, 26, 13);
    c.fillRect(bx - 10, by - 26, 20, 19);
    c.fillRect(bx - 5, by - 29, 10, 22);

    c.fillStyle = '#2f3616';
    c.fillRect(bx - 9, by - 23, 18, 14);
    c.fillRect(bx - 6, by - 27, 12, 17);
    c.fillRect(bx - 12, by - 18, 7, 7);
    c.fillRect(bx + 5, by - 19, 8, 8);

    c.fillStyle = '#42491e';
    c.fillRect(bx - 7, by - 24, 6, 5);
    c.fillRect(bx + 1, by - 22, 6, 6);
    c.fillRect(bx - 9, by - 17, 5, 4);

    c.fillStyle = '#1a1408';
    c.fillRect(bx - 10, by - 13, 4, 4);
    c.fillRect(bx + 6, by - 14, 5, 5);
  } else if (type === 'cactus') {            // desert saguaro
    c.fillStyle = '#1e3a1c';
    c.fillRect(bx - 3, by - 18, 6, 18);
    c.fillStyle = '#2c5628';
    c.fillRect(bx - 8, by - 10, 5, 4);
    c.fillRect(bx + 3, by - 9, 5, 3);
    c.fillStyle = '#3a6e35';
    c.fillRect(bx - 6, by - 11, 3, 1);
    c.fillRect(bx + 5, by - 9, 1, 1);
  } else if (type === 'baobab') {           // BAOBAB - TOP DOWN (giant savanna tree)
    c.fillStyle = 'rgba(0,0,0,0.22)';       // fat cast shadow ring
    c.fillRect(bx - 14, by - 8, 28, 9);
    c.fillRect(bx - 9, by - 12, 18, 11);
    c.fillStyle = '#3d2b15';                // thick water-storing bole
    c.beginPath();
    c.ellipse(bx, by - 3, 6, 4.5, 0, 0, 7);
    c.fill();
    c.fillStyle = '#5c4426';
    c.beginPath();
    c.ellipse(bx - 1, by - 4, 3.5, 2.5, 0, 0, 7);
    c.fill();
    c.fillStyle = '#284018';                // flat-topped irregular crown
    c.beginPath();
    c.arc(bx - 7, by - 17, 11, 0, 7);
    c.arc(bx + 7, by - 16, 12, 0, 7);
    c.arc(bx, by - 23, 9, 0, 7);
    c.fill();
    c.fillStyle = '#335522';
    c.beginPath();
    c.arc(bx - 6, by - 15, 8, 0, 7);
    c.arc(bx + 6, by - 15, 9, 0, 7);
    c.fill();
    c.fillStyle = '#3f6b2a';
    c.beginPath();
    c.arc(bx - 3, by - 19, 5, 0, 7);
    c.arc(bx + 3, by - 18, 5, 0, 7);
    c.fill();
  } else if (type === 'canyonrock') {        // small scattered scree / boulder
    const rk = 0.38 + r * 0.55;              // much smaller + varied rock size
    const ox = (r - 0.5) * 8;
    c.fillStyle = '#3a2a1e';
    c.beginPath();
    c.moveTo(bx - 8 * rk + ox, by); c.lineTo(bx - 9 * rk + ox, by - 8 * rk);
    c.lineTo(bx - 4 * rk + ox, by - 13 * rk); c.lineTo(bx + 3 * rk + ox, by - 12 * rk);
    c.lineTo(bx + 9 * rk + ox, by - 7 * rk); c.lineTo(bx + 8 * rk + ox, by);
    c.closePath(); c.fill();
    c.fillStyle = '#5c4230';
    c.beginPath();
    c.moveTo(bx - 6 * rk + ox, by); c.lineTo(bx - 5 * rk + ox, by - 7 * rk);
    c.lineTo(bx + ox, by - 10 * rk); c.lineTo(bx + 5 * rk + ox, by - 6 * rk);
    c.closePath(); c.fill();
    if (r > 0.6) {                           // occasional pebble cluster
      c.fillStyle = '#2c2015';
      c.beginPath();
      c.arc(bx - 10 * rk + 2, by - 3, 2.2 * rk, 0, 7);
      c.arc(bx + 7 * rk + 3, by - 2, 1.6 * rk, 0, 7);
      c.fill();
    }
  }
}

// Prop types that are full canopy trees: they're lifted out of the baked floor
// tile and drawn in a dedicated world-space pass so they can grow big (2-3x the
// player) and vary in size without clipping at chunk seams or under neighbour
// floors.
const BIOME_TREES = { tree: 1, pine: 1, swamptree: 1, cactus: 1, baobab: 1 };

const treeSpriteCache = new Map();
const treeCache = new Map();

// Pre-render one scaled tree silhouette into a small canvas (quantized scale,
// so the same bush-height class is shared by all trees of that size). The
// anchor: drawPropTile called with px=-16,py=0 fixes the base at (0,TILE) in
// local space, which the caller maps onto the world root point of the tree.
function bigTreeSprite(type, s) {
  const key = type + ':' + (Math.round(s * 10) / 10).toFixed(1);
  let spr = treeSpriteCache.get(key);
  if (spr) return spr;
  const k = parseFloat(key.slice(key.indexOf(':') + 1));
  const cw = Math.ceil(27 * k) + 6;
  const ch = Math.ceil(32 * k) + 6;
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const c = cv.getContext('2d');
  c.save();
  c.translate(3 + 13.5 * k, ch - 3 - 32 * k);
  c.scale(k, k);
  drawPropTile(c, type, -16, 0, 0);
  c.restore();
  cv._ox = 3 + 13.5 * k;    // canvas coords of the tree base
  cv._oy = ch - 3;
  treeSpriteCache.set(key, cv);
  if (treeSpriteCache.size > 120) {
    const keys = [...treeSpriteCache.keys()];
    for (let i = 0; i < keys.length - 80; i++) treeSpriteCache.delete(keys[i]);
  }
  return cv;
}

// Deterministic per-chunk list of big trees: always-present trees inside the
// impassable groves (T_TREE tiles) plus a ragged ring of small trees on the
// shed tiles RIGHT NEXT to a grove — no free-standing canopies in the open
// clearings, which read as thick grass instead. Grove tiles carry a denser,
// larger tree cluster; the ring trees are small and vary a lot in scale.
function getChunkTrees(cx, cy) {
  const key = cx + ',' + cy;
  let list = treeCache.get(key);
  if (list) return list;
  ensureChunk(cx, cy);
  const tiles = chunkMap.get(key);
  list = [];
  const nearGrove = (wx, wy) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (getTile(wx + dx * TILE + TILE * 0.5, wy + dy * TILE + TILE * 0.5) === T_TREE) return true;
      }
    }
    return false;
  };
  for (let ty = 0; ty < CHUNK; ty++) {
    for (let tx = 0; tx < CHUNK; tx++) {
      const t = tiles[ty * CHUNK + tx];
      if (t !== T_FLOOR && t !== T_TREE) continue;
      const wx = cx * CHUNK_PX + tx * TILE;
      const wy = cy * CHUNK_PX + ty * TILE;
      const def = BIOME_DEFS[owningBiomeAt(wx, wy)];
      if (!def || !def.prop) continue;
      if (ownHazardAt(wx, wy) !== HAZARD_NONE) continue;
      if (t === T_TREE && owningBiomeAt(wx + TILE * 0.5, wy + TILE * 0.5) === 'east') {
        // Savanna baobab: only the anchor tile of the hosting macro cell draws
        // the single giant tree — the rest of the footprint stays impassable
        // but is covered by that one canopy, so a baobab reads as one tree,
        // not a grove cluster.
        const wxC = wx + TILE * 0.5, wyC = wy + TILE * 0.5;
        const cmx = Math.floor(wxC / TILE / BAOBAB_CELL);
        const cmy = Math.floor(wyC / TILE / BAOBAB_CELL);
        let anchor = null;
        for (let by = cmy - 2; by <= cmy + 2 && !anchor; by++) {
          for (let bx = cmx - 2; bx <= cmx + 2; bx++) {
            if (baobabShapeAt(bx, by, wxC, wyC)) { anchor = baobabAnchor(bx, by); break; }
          }
        }
        if (anchor && cx * CHUNK + tx === anchor.tx && cy * CHUNK + ty === anchor.ty) {
          const sg = seed2(anchor.tx * 13 + 1, anchor.ty * 29 + 5);
          list.push({ type: 'baobab', x: anchor.wx, y: anchor.wy, s: 4.6 + sg * 1.6 });
        }
        continue;
      }
      if (t === T_TREE) {
        // Grove tile: always carries a big tree (denser + bigger than decor).
        // Groves can bleed across the biome wedge edge, so fall back to the
        // generic tree whenever the local prop isn't a canopy type.
        const pType = BIOME_TREES[def.prop.type] ? def.prop.type : 'tree';
        const sg = seed2(cx * CHUNK + tx * 13 + 1, cy * CHUNK + ty * 29 + 5);
        list.push({ type: pType, x: wx + TILE * 0.5, y: wy + TILE, s: 2.4 + sg * 1.6 });
        continue;
      }
      // Clearings stay open (thick grass only): a small tree grows here only
      // when this floor tile touches a grove, and only with ring probability,
      // so the big blocks fade out through a natural ragged skirt.
      if (!BIOME_TREES[def.prop.type]) continue;
      if (!nearGrove(wx + TILE * 0.5, wy + TILE * 0.5)) continue;
      const bm = owningBiomeAt(wx, wy);
      const rg = seed2(cx * CHUNK + tx * 23 + 5, cy * CHUNK + ty * 19 + 9);
      if (rg >= (GROVE_RING[bm] || 0.5)) continue;
      const sg = seed2(cx * CHUNK + tx * 13 + 1, cy * CHUNK + ty * 29 + 5);
      list.push({
        type: def.prop.type,
        x: wx + TILE * 0.5,
        y: wy + TILE,
        s: 0.5 + sg * 1.0
      });
    }
  }
  treeCache.set(key, list);
  if (treeCache.size > 300) {
    const keys = [...treeCache.keys()];
    for (let i = 0; i < keys.length - 200; i++) treeCache.delete(keys[i]);
  }
  return list;
}

// Pre-rendered sway loops for the big-canopy sprites: each scaled tree gets a
// stack of frames that already contain its low-sun ground shadow plus the
// canopy leaning over a full sway cycle, so drawing one tree is a single
// looping drawImage instead of a shadow path + save/translate/rotate/restore
// per tree per frame. Animation "plays" by advancing the frame index.
const TREE_SWAY_N = 16;
const treeLoopCache = new Map();
function treeLoopFrames(type, s) {
  const key = type + ':' + (Math.round(s * 10) / 10).toFixed(1);
  let loop = treeLoopCache.get(key);
  if (loop) return loop;
  const spr = bigTreeSprite(type, s);
  const k = parseFloat(key.slice(key.indexOf(':') + 1));
  const swayA = 0.010 + k * 0.002;
  // Shadow: long shade cast down-right from the trunk base (SY is the base).
  const shL = 34 + k * 16, shDr = Math.round(shL * 0.45), shW = 5 + k * 5;
  // Pad each frame so the whole shadow fits (it reaches shL-9 below the base)
  // plus the sway slack of the rotated canopy corners.
  const padL = Math.max(shW, 2);
  const padR = shW + shDr + 2;
  const topPad = Math.max(9, Math.ceil(swayA * spr.height) + 2);
  const botPad = shL + 2;
  const W = spr.width + padL + padR;
  const H = spr.height + topPad + botPad;
  const dx = padL + spr._ox, dy = topPad + spr._oy;   // world root inside a frame
  const frames = [];
  for (let n = 0; n < TREE_SWAY_N; n++) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.fillStyle = 'rgba(8,10,14,0.34)';
    c.beginPath();
    c.moveTo(dx - shW, dy - 9);
    c.lineTo(dx - shW + shDr, dy + shL - 9);
    c.lineTo(dx + shW + shDr, dy + shL - 9);
    c.lineTo(dx + shW, dy - 9);
    c.closePath();
    c.fill();
    // Canopy leaning over its sway phase, pivoting around the trunk base.
    c.translate(dx, dy);
    c.rotate(Math.sin(n / TREE_SWAY_N * PI2) * swayA);
    c.drawImage(spr, -spr._ox, -spr._oy);
    frames.push(cv);
  }
  loop = { frames, _dx: dx, _dy: dy, _N: TREE_SWAY_N };
  treeLoopCache.set(key, loop);
  if (treeLoopCache.size > 160) {
    const keys = [...treeLoopCache.keys()];
    for (let i = 0; i < keys.length - 100; i++) treeLoopCache.delete(keys[i]);
  }
  return loop;
}

// World-space canopy pass: big trees drawn over the terrain, hazards and
// torches, under every entity, with hard pixel edges.
function drawTrees(cx, cy, w, h) {
  const firstCx = Math.floor(cx / CHUNK_PX) - 1;
  const firstCy = Math.floor(cy / CHUNK_PX) - 1;
  const lastCx = Math.floor((cx + w) / CHUNK_PX) + 1;
  const lastCy = Math.floor((cy + h) / CHUNK_PX) + 1;
  const fStep = TREE_SWAY_N * 0.00065 / PI2;   // frame advance per game-time ms
  ctx.imageSmoothingEnabled = false;
  for (let ccy = firstCy; ccy <= lastCy; ccy++) {
    for (let ccx = firstCx; ccx <= lastCx; ccx++) {
      const list = getChunkTrees(ccx, ccy);
      for (const t of list) {
        const sx = t.x - cx, sy = t.y - cy;
        if (sx < -140 || sx > w + 140 || sy < -200 || sy > h + 60) continue;
        // Deterministic per-tree phase so a grove never sways in unison;
        // wind sway now plays as a loop through the pre-rendered frames.
        const ph0 = (((t.x % 977) * 137) + ((t.y % 971) * 61)) % 628;
        const loop = treeLoopFrames(t.type, t.s);
        const frame = ((Math.floor(game.time * fStep + ph0 * 0.04) % loop._N) + loop._N) % loop._N;
        ctx.drawImage(loop.frames[frame], sx - loop._dx, sy - loop._dy);
      }
    }
  }
  ctx.imageSmoothingEnabled = true;
}

// Grass mat for one tile: every climate biome bakes a continuous mat (never a
// single decorative plant) so blade geometry stays in sync between the tile
// pass and the chunk-edge overflow stamping below. Density and blade height
// follow the biome temperature; colour follows the biome. Impassable prairie
// thickets (T_TALLGRASS) bake a dense, very tall patch instead of the open mat.
function stampBiomeGrass(c, lx, ly, cx, cy, ox, oy) {
  const px = lx * TILE + (ox || 0);
  const py = ly * TILE + (oy || 0);
  const wx = cx * CHUNK_PX + lx * TILE;
  const wy = cy * CHUNK_PX + ly * TILE;
  const tt = getTile(wx + TILE * 0.5, wy + TILE * 0.5);
  if (tt !== T_FLOOR && tt !== T_TREE && tt !== T_TALLGRASS) return;
  if (ownHazardAt(wx, wy) !== HAZARD_NONE) return;
  const gr = seed2(cx * CHUNK + lx * 57 + 3, cy * CHUNK + ly * 41 + 11);
  if (tt === T_TALLGRASS) {
    drawPropTile(c, 'prairiegrass', px, py, gr);
    return;
  }
  const gtype = BIOME_GRASS[owningBiomeAt(wx, wy)];
  if (!gtype) return;
  const temp = BIOME_TEMP[owningBiomeAt(wx, wy)] || 0.6;
  // The canyon keeps its grass down to scarce dry clumps (never a continuous
  // mat), so the rock lanes read as skeleton terrain.
  const dens = temp === 0.9 ? 0.07 : grassDensity(temp);
  if (gr >= dens) return;
  drawPropTile(c, gtype, px, py, gr, temp === 0.9 ? 1 : grassHeight(temp));
}

// Low-sun shadow cast by one solid tile (wall / tree / thicket): a long shade
// stretching down-right over the baked floor. Also stamped from the border
// tiles of the upstream chunks so the shadows never break at chunk seams.
function stampShadow(c, lx, ly, cx, cy, ox, oy) {
  const px = lx * TILE + (ox || 0);
  const py = ly * TILE + (oy || 0);
  const t = getTile(cx * CHUNK_PX + lx * TILE + TILE * 0.5, cy * CHUNK_PX + ly * TILE + TILE * 0.5);
  if (t !== T_WALL && t !== T_TREE && t !== T_TALLGRASS && t !== T_CLIFF) return;
  // The Ruins core keeps a flat, torch-lit look: no long low-sun cast shadows.
  const wsx = cx * CHUNK_PX + px;
  const wsy = cy * CHUNK_PX + py;
  if (owningBiomeAt(wsx, wsy) === BIOME_CORE) return;
  const LEN = 40, DR = Math.round(LEN * 0.45), TOP = 4;
  const x0 = px + 3, x1 = px + 29;
  const y0 = py + TOP, y1 = py + TOP + LEN;
  // main shade body
  c.fillStyle = 'rgba(8,10,14,0.30)';
  c.beginPath();
  c.moveTo(x0, y0); c.lineTo(x0 + DR, y1);
  c.lineTo(x1 + DR, y1); c.lineTo(x1, y0);
  c.closePath(); c.fill();
  // longer, weaker tail for the low-sun streak
  c.fillStyle = 'rgba(8,10,14,0.16)';
  c.beginPath();
  c.moveTo(x1, y0); c.lineTo(x1 + DR, y1);
  c.lineTo(x1 + DR + 2, y1 + 8); c.lineTo(x1 + 2, y0 + 8);
  c.closePath(); c.fill();
}

function drawFloorTile(c, px, py, lx, ly, cx, cy) {
  const [wx, wy] = tileWorldCenter(cx, cy, lx, ly);
  const bm = owningBiomeAt(wx, wy);
  const r = seed2(cx * CHUNK + lx, cy * CHUNK + ly);
  const [br, bg, bb] = floorStyle(wx, wy);
  c.fillStyle = `rgb(${br},${bg},${bb})`;
  c.fillRect(px, py, TILE, TILE);
  const dark = 'rgba(0,0,0,0.12)';
  if (r > 0.82) {
    c.fillStyle = dark;
    c.fillRect(px + (lx * 7 + cy) % 18, py + (ly * 11 + cx) % 18, 4, 3);
  }
  // Climate accents: small ground details that make each wedge read at a glance
  const def = BIOME_DEFS[bm] || BIOME_DEFS.core;
  if (bm === BIOME_CORE) {
    if (r > 0.8) {
      c.fillStyle = 'rgba(0,0,0,0.18)';   // cracked ruin slabs
      c.fillRect(px + 2, py + 14, 8, 2);
      c.fillRect(px + 18, py + 8, 2, 8);
    }
  } else {
    switch (bm) {
      case 'north':                        // frost drifts
        if (r > 0.7) {
          c.fillStyle = 'rgba(255,255,255,0.10)';
          c.fillRect(px + 6, py + 24, 16, 2);
          c.fillRect(px + 10, py + 27, 8, 1);
        }
        break;
      case 'northeast':                    // fallen pine needles
        if (r > 0.8) {
          c.fillStyle = 'rgba(30,50,40,0.25)';
          c.fillRect(px + 4, py + 10, 6, 1);
          c.fillRect(px + 16, py + 18, 5, 1);
        }
        break;
      case 'east':                         // sun-dried scrub
        if (r > 0.78) {
          c.fillStyle = 'rgba(110,80,30,0.28)';
          c.fillRect(px + 8, py + 12, 8, 1);
          c.fillRect(px + 10, py + 15, 4, 1);
        }
        break;
      case 'southeast':                    // scree pebbles
        if (r > 0.82) {
          c.fillStyle = 'rgba(70,50,36,0.30)';
          c.fillRect(px + 6, py + 10, 4, 3);
          c.fillRect(px + 20, py + 20, 3, 2);
        }
        break;
      case 'south':                        // cracked dry earth
        if (r > 0.68) {
          c.strokeStyle = 'rgba(90,40,10,0.30)';
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(px + 8, py + 8); c.lineTo(px + 14, py + 16); c.lineTo(px + 9, py + 24);
          c.stroke();
        }
        break;
      case 'southwest':                    // wild flowers
        if (r > 0.85) {
          c.fillStyle = 'rgba(255,220,120,0.55)';
          c.fillRect(px + 10 + (r * 8 | 0), py + 8, 2, 2);
          c.fillRect(px + 4 + (r * 6 | 0), py + 20, 2, 2);
        }
        break;
      case 'west':                         // leaf litter
        if (r > 0.8) {
          c.fillStyle = 'rgba(40,70,40,0.30)';
          c.fillRect(px + 6, py + 18 + (r * 6 | 0), 5, 2);
          c.fillRect(px + 18, py + 10, 4, 2);
        }
        break;
      case 'northwest':                    // mud ripples
        if (r > 0.76) {
          c.fillStyle = 'rgba(30,40,20,0.25)';
          c.fillRect(px + 4, py + 12, 10, 2);
          c.fillRect(px + 8, py + 16, 8, 1);
        }
        break;
      default: break;
    }
  }

  applyAmbient(c, px, py, bm, biomeBlendWeightsAt(wx, wy));

  // Hazard surface (pool-based maps decide south lava & north ice)
  const haz = ownHazardAt(wx, wy);
  if (haz !== HAZARD_NONE) drawHazardTile(c, px, py, haz, r);

  // Grass mat always bakes below the props (colour/density follow the biome
  // temperature). Only real objects (scree rocks) scatter as small ground
  // props; canopy trees are handled by the world-space pass
  // (getChunkTrees/drawTrees).
  stampBiomeGrass(c, lx, ly, cx, cy, 0, 0);
  if (def.prop && !haz && !GRASS_PROPS[def.prop.type] && !BIOME_TREES[def.prop.type]) {
    const pr = seed2(cx * CHUNK + lx * 31 + 7, cy * CHUNK + ly * 17 + 3);
    if (pr < def.prop.density) drawPropTile(c, def.prop.type, px, py, pr);
  }
}

function drawWallTile(c, px, py, lx, ly, cx, cy) {
  const [wx, wy] = tileWorldCenter(cx, cy, lx, ly);
  const bm = owningBiomeAt(wx, wy);
  const def = BIOME_DEFS[bm] || BIOME_DEFS.core;
  const r = seed2(cx * CHUNK + lx, cy * CHUNK + ly);
  const wallWeights = biomeBlendWeightsAt(wx, wy);
  const wcol = blendBiomeColor(wallWeights, 'wall');
  const l = 1 + (r * 24 | 0);
  c.fillStyle = `rgb(${Math.min(255, wcol[0] + l)},${Math.min(255, wcol[1] + l - 4)},${Math.min(255, wcol[2] + l - 8)})`;
  c.fillRect(px, py, TILE, TILE);

  // Neutral core keeps the classic broken-masonry ruin look.
  if (bm === BIOME_CORE) {
    c.fillStyle = 'rgba(255,255,255,0.14)';
    c.fillRect(px, py, TILE, 3);
    c.fillRect(px, py, 3, TILE);
    c.fillStyle = 'rgba(0,0,0,0.30)';
    c.fillRect(px, py + TILE - 12, TILE, 12);
    c.fillRect(px + TILE - 5, py, 5, TILE);
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 1;
    c.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
    if (r > 0.8) {                        // collapsed / chipped bricks
      c.fillStyle = 'rgba(0,0,0,0.30)';
      c.fillRect(px + 6 + (r * 14 | 0), py + 18 + (r * 8 | 0), 7, 5);
    }
    return;
  }

  // Shared shading for all climate walls: low sun — a long soft shadow climbing
  // the lower face of the tile, with only a thin top-light band left.
  const shGrad = c.createLinearGradient(px, py + 6, px, py + TILE);
  shGrad.addColorStop(0, 'rgba(0,0,0,0.05)');
  shGrad.addColorStop(0.55, 'rgba(0,0,0,0.10)');
  shGrad.addColorStop(1, 'rgba(0,0,0,0.38)');
  c.fillStyle = shGrad;
  c.fillRect(px, py + 6, TILE, TILE - 6);
  c.fillStyle = 'rgba(255,255,255,0.06)';
  c.fillRect(px, py, TILE, 1);

  if (bm === 'north') {                   // snowbank / ice massif
    c.fillStyle = 'rgba(205,222,240,0.55)';
    c.fillRect(px, py, TILE, TILE - 8);
    c.fillStyle = 'rgba(245,250,255,0.85)';
    c.beginPath();
    c.moveTo(px, py + 6); c.lineTo(px + 10, py); c.lineTo(px + 24, py + 3); c.lineTo(px + TILE, py + 7);
    c.lineTo(px + TILE, py + 12); c.lineTo(px, py + 12); c.closePath(); c.fill();
    c.fillStyle = 'rgba(140,180,215,0.35)';      // packed drifts
    c.beginPath(); c.ellipse(px + 14, py + 22, 7 + r * 3, 3, r, 0, PI2); c.fill();
    c.beginPath(); c.ellipse(px + 24, py + 26, 5, 2.5, -r, 0, PI2); c.fill();
  } else if (bm === 'northeast') {        // log-cabin palisade
    for (let i = 0; i < 3; i++) {
      const y0 = py + i * 10;
      c.fillStyle = `rgb(${(46 - (i % 2) * 14)},${(70 - (i % 2) * 12)},${(74 - (i % 2) * 10)})`;
      c.fillRect(px, y0, TILE, 9);
      c.fillStyle = 'rgba(255,230,190,0.18)';
      c.fillRect(px, y0, TILE, 2);
      c.fillStyle = 'rgba(0,0,0,0.30)';
      c.fillRect(px, y0 + 8, TILE, 1);
      c.fillStyle = 'rgba(0,0,0,0.25)';          // vertical plank seams
      c.fillRect(px + 7, y0, 1, 9);
      c.fillRect(px + 22, y0, 1, 9);
    }
    if (r > 0.6) {                                // bark knot
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.beginPath(); c.ellipse(px + 15 + (r * 6 | 0), py + 16, 2.5, 4, 0, 0, PI2); c.fill();
    }
  } else if (bm === 'east') {             // sun-baked adobe
    c.fillStyle = 'rgba(255,235,200,0.25)';
    c.fillRect(px, py, TILE, 4);
    c.fillStyle = 'rgba(90,60,26,0.35)';
    c.fillRect(px, py + 9, TILE, 2);
    c.fillRect(px, py + 21, TILE, 2);
    c.strokeStyle = 'rgba(255,245,220,0.18)';
    c.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const y0 = py + 2 + i * 10;
      c.beginPath();
      c.moveTo(px + (i % 2 ? 0 : 8), y0);
      c.lineTo(px + (i % 2 ? 24 : 32), y0);
      c.stroke();
    }
    if (r > 0.45) {                               // dried cracks
      c.strokeStyle = 'rgba(60,35,12,0.40)';
      c.beginPath();
      c.moveTo(px + (r * 12 | 0) + 4, py + 6);
      c.lineTo(px + (r * 12 | 0) + 8, py + 14);
      c.lineTo(px + (r * 12 | 0) + 5, py + 24);
      c.stroke();
    }
  } else if (bm === 'southeast') {        // canyon strata
    for (let i = 0; i < 5; i++) {
      const y0 = py + i * 6;
      c.fillStyle = i % 2 ? `rgba(255,230,210,${[0.05, 0.12, 0, 0.08, 0.16][i]})` : `rgba(0,0,0,${[0.05, 0.12, 0, 0.08, 0.16][i]})`;
      c.fillRect(px, y0, TILE, 6);
    }
    c.fillStyle = 'rgba(255,235,215,0.20)';       // jagged cap
    c.beginPath();
    c.moveTo(px, py + 4);
    c.lineTo(px + 7, py + 1);
    c.lineTo(px + 13, py + 4);
    c.lineTo(px + 20, py + 1);
    c.lineTo(px + 27, py + 3);
    c.lineTo(px + TILE, py + 1);
    c.lineTo(px + TILE, py + 6);
    c.lineTo(px, py + 6);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(20,8,4,0.35)';          // strata seams
    c.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      c.beginPath();
      c.moveTo(px + (i * 5 % 11), py + i * 6);
      c.lineTo(px + (i * 5 % 11) + 9, py + i * 6);
      c.stroke();
    }
  } else if (bm === 'south') {            // basalt columns + lava veins
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(px + 8, py, 1, TILE);
    c.fillRect(px + 20, py, 1, TILE);
    c.fillStyle = 'rgba(255,255,255,0.06)';
    c.fillRect(px + 1, py + 1, 7, 2);
    c.fillRect(px + 10, py + 1, 9, 2);
    c.fillRect(px + 22, py + 1, 9, 2);
    c.fillStyle = 'rgba(255,80,20,0.55)';         // molten cracks
    c.fillRect(px + 4 + (r * 16 | 0), py + 8, 2, 2);
    c.fillRect(px + 2 + (r * 12 | 0), py + 18, 2, 6);
    c.fillRect(px + 22 + (r * 4 | 0), py + 14, 2, 3);
  } else if (bm === 'southwest') {        // stacked sod mounds
    c.fillStyle = 'rgba(60,80,36,0.35)';
    c.beginPath();
    c.moveTo(px, py + 10); c.lineTo(px + 4, py + 4); c.lineTo(px + 12, py + 1);
    c.lineTo(px + 22, py + 3); c.lineTo(px + 28, py + 8); c.lineTo(px + TILE, py + 10);
    c.lineTo(px + TILE, py + 16); c.lineTo(px, py + 16); c.closePath(); c.fill();
    c.fillStyle = 'rgba(20,28,12,0.40)';
    c.fillRect(px, py + 18, TILE, 3);
    c.fillRect(px, py + 27, TILE, 3);
    c.strokeStyle = 'rgba(110,140,70,0.40)';
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(px + 3 + i * 8, py + 3 + (i % 2) * 2);
      c.lineTo(px + 1 + i * 8, py + 10);
      c.stroke();
    }
  } else if (bm === 'west') {             // mossy stone + hanging vines
    c.fillStyle = 'rgba(40,90,50,0.40)';
    c.beginPath();
    c.moveTo(px, py); c.lineTo(px + 8, py + 2); c.lineTo(px + 14, py);
    c.lineTo(px + 24, py + 3); c.lineTo(px + TILE, py); c.lineTo(px + TILE, py + 9);
    c.lineTo(px + 24, py + 7);
    c.lineTo(px + 8, py + 6);
    c.lineTo(px, py + 8); c.closePath(); c.fill();
    if (r > 0.3) {
      c.fillStyle = 'rgba(24,60,34,0.50)';
      c.beginPath();
      c.ellipse(px + 3 + (r * 8 | 0), py + 20 + (r * 8 | 0), 3, 2, r, 0, PI2); c.fill();
    }
    c.strokeStyle = 'rgba(28,66,38,0.55)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(px + 6, py + 4); c.lineTo(px + 6, py + 26);
    c.moveTo(px + 20, py + 3); c.lineTo(px + 20, py + 20);
    c.stroke();
    c.fillStyle = 'rgba(70,130,80,0.60)';         // leaves
    c.fillRect(px + 6, py + 12, 3, 2);
    c.fillRect(px + 20, py + 10, 2, 3);
  } else if (bm === 'northwest') {        // rotting peat bank
    c.fillStyle = 'rgba(25,22,10,0.50)';
    c.fillRect(px, py + TILE - 7, TILE - (r * 12 | 0), 6);
    c.strokeStyle = 'rgba(15,12,4,0.50)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(px, py + 10); c.lineTo(px + 10, py + 8); c.lineTo(px + 22, py + 11); c.lineTo(px + TILE, py + 9);
    c.stroke();
    c.fillStyle = 'rgba(160,180,90,0.18)';        // slime sheen
    c.beginPath();
    c.moveTo(px + 4, py + 20); c.lineTo(px + 12, py + 18); c.lineTo(px + 8, py + 26); c.closePath(); c.fill();
    for (let i = 0; i < 2; i++) {                 // fungus clusters
      c.fillStyle = 'rgba(210,215,170,0.50)';
      c.fillRect(px + 4 + (r * 8 | 0) + i * 12, py + 14 + (r * 6 | 0), 3, 3);
      c.fillStyle = 'rgba(120,130,90,0.40)';
      c.fillRect(px + 5 + (r * 8 | 0) + i * 12, py + 17 + (r * 6 | 0), 3, 2);
    }
  }

  applyAmbient(c, px, py, bm, wallWeights);
}

// Canyon cliff tile: a dark abyss with jagged light rim — passable by the
// player but visually reads as a gap. Rendered directly onto the baked chunk
// canvas so no per-frame cost.
function drawCliffTile(c, px, py, lx, ly, cx, cy) {
  const r = seed2(cx * CHUNK + lx, cy * CHUNK + ly);
  c.fillStyle = '#080604';           // deep darkness
  c.fillRect(px, py, TILE, TILE);
  c.fillStyle = '#141210';           // inner shade
  c.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
  // jagged top rim (catches light from above)
  c.fillStyle = 'rgba(160,130,100,0.45)';
  c.beginPath();
  c.moveTo(px, py + 5 + (r * 3 | 0));
  c.lineTo(px + 7, py + 1 + (r * 4 | 0));
  c.lineTo(px + 14, py + 4 + (r * 2 | 0));
  c.lineTo(px + 22, py + 1 + (r * 4 | 0));
  c.lineTo(px + TILE, py + 6 + (r * 3 | 0));
  c.lineTo(px + TILE, py + 10);
  c.lineTo(px, py + 10);
  c.closePath();
  c.fill();
  // left/right undercut shadows
  c.fillStyle = 'rgba(0,0,0,0.40)';
  c.fillRect(px, py + 10, 3, TILE - 16);
  c.fillRect(px + TILE - 3, py + 10, 3, TILE - 16);
  // faint streak (depth hint)
  c.fillStyle = 'rgba(80,65,50,0.25)';
  c.fillRect(px + 6 + (r * 8 | 0), py + 18 + (r * 4 | 0), 10, 2);
}

// Hazard id for a floor tile center (used while baking)
function ownHazardAt(wx, wy) {
  const tx = Math.floor(wx / TILE);
  const ty = Math.floor(wy / TILE);
  const cx2 = Math.floor(tx / CHUNK), cy2 = Math.floor(ty / CHUNK);
  const map2 = chunkHazardMap(cx2, cy2);
  return map2[(ty - cy2 * CHUNK) * CHUNK + (tx - cx2 * CHUNK)];
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
      else if (t === T_CLIFF) drawCliffTile(c, px, py, lx, ly, cx, cy);
      else drawFloorTile(c, px, py, lx, ly, cx, cy);
    }
  }
  // Grass blades root anywhere on a floor tile and grow upward, so they cross
  // chunk seams and would be clipped at the canvas edge (horizontal or vertical
  // line every 512px). Stamp the border tiles of the chunk below and of the
  // chunk to the right into this canvas; their own canvas still draws the rest,
  // so the mat joins seamlessly.
  for (let ex = 0; ex < 2; ex++) {
    for (let lx = 0; lx < CHUNK; lx++) stampBiomeGrass(c, lx, ex, cx, cy + 1, 0, CHUNK_PX);
    for (let ly = 0; ly < CHUNK; ly++) stampBiomeGrass(c, ex, ly, cx + 1, cy, CHUNK_PX, 0);
  }
  // Low-sun shadows: solid tiles cast long shadows down-right over the floor.
  // The border tiles of the upstream chunks (above / left / up-left) are
  // stamped too, so a shadow that crosses a chunk edge appears in whichever
  // canvas covers it — the same guaranteed coverage as the grass overflow.
  for (let ly = 0; ly < CHUNK; ly++)
    for (let lx = 0; lx < CHUNK; lx++) stampShadow(c, lx, ly, cx, cy, 0, 0);
  for (let my = 13; my < CHUNK; my++)
    for (let lx = 0; lx < CHUNK; lx++) stampShadow(c, lx, my, cx, cy - 1, 0, -CHUNK_PX);
  for (let mx = 13; mx < CHUNK; mx++)
    for (let ly = 0; ly < CHUNK; ly++) stampShadow(c, mx, ly, cx - 1, cy, -CHUNK_PX, 0);
  for (let mx = 13; mx < CHUNK; mx++)
    for (let my = 13; my < CHUNK; my++) stampShadow(c, mx, my, cx - 1, cy - 1, -CHUNK_PX, -CHUNK_PX);
  chunkCanvasCache.set(key, cv);

  // Keep the canvas cache bounded
  if (chunkCanvasCache.size > 300) {
    const keys = [...chunkCanvasCache.keys()];
    for (let i = 0; i < keys.length - 200; i++) chunkCanvasCache.delete(keys[i]);
  }
  return cv;
}

// Bake at most one uncached chunk canvas per frame, scanning ring-outward from
// the player's chunk. running getChunkCanvas inside the render loop was a
// per-frame spike the first time each 512px chunk entered view (4-6 fresh
// chunks back-to-back stuttered on lower-end GPUs). Spreading one bake per
// frame keeps terrain streaming smooth while the visible loop below still
// calls getChunkCanvas (which just returns the cache) for any chunk that
// slipped through.
function preBakeChunks(px, py) {
  const pcx = Math.floor(px / CHUNK_PX), pcy = Math.floor(py / CHUNK_PX);
  const rMax = (Math.max(Math.ceil(VIEW_W / CHUNK_PX), Math.ceil(VIEW_H / CHUNK_PX)) >> 1) + 2;
  let best = null, bestD = Infinity;
  for (let dy = -rMax; dy <= rMax; dy++) {
    for (let dx = -rMax; dx <= rMax; dx++) {
      const key = (pcx + dx) + ',' + (pcy + dy);
      if (chunkMap.has(key) && !chunkCanvasCache.has(key)) {
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = key; }
      }
    }
  }
  if (best) {
    const i = best.indexOf(',');
    getChunkCanvas(parseInt(best.slice(0, i), 10), parseInt(best.slice(i + 1), 10));
  }
}