// ============================================================
// ADAPTIVE GRAPHICS QUALITY
// Watches the running FPS and progressively disables the most
// expensive visual effects (glow, dynamic lighting, flames, cape
// simulation, particles…) whenever the frame rate stays below
// 30 FPS, restoring them as soon as performance recovers.
// ============================================================
const GFX_LEVELS = 4;                     // 0 = max quality … 3 = minimal

//   level | what gets cut back
//   ------+--------------------------------------------------
//    0    | everything (full quality)
//    1    | radial-gradient glows off, simpler torch lighting
//    2    | dynamic lighting, flames, cape sim, compass,
//         |   shockwaves and fancy enemy shapes off
//    3    | low-resolution rendering + almost no particles
const GFX = {
  level: 0,
  fps: 60,

  // Derived quality flags (refreshed by applyGfxLevel)
  glow: true,        // radial-gradient glow effects
  lightMode: 2,      // 2 = ray-cast lighting, 1 = plain circles, 0 = off
  fire: 2,           // 2 = flames + warm pools, 1 = flames only, 0 = off
  cape: true,        // dynamic billowing cape (simulation + render)
  compass: true,     // corner biome compass
  shockwaves: true,  // gradient shockwave particles
  enemyFx: true,     // wobbly blobs / auras / crowns vs plain circles
  particleCap: 500,
  pixelScale: 1,     // render resolution multiplier (<1 = blurry but fast)

  // Internal hysteresis state
  _samples: [],
  _low: 0,
  _high: 0
};

// FPS ceilings that must be UNDER to step DOWN a level, and FPS floors that
// must be OVER to step back UP. The two windows reject flicker.
const GFX_LOW  = [0, 30, 25, 20];
const GFX_HIGH = [30, 45, 40, 35];

function applyGfxLevel() {
  const lvl = GFX.level;
  GFX.glow       = lvl < 1;
  GFX.lightMode  = lvl >= 2 ? 0 : (lvl === 1 ? 1 : 2);
  GFX.fire       = lvl >= 2 ? 0 : (lvl === 1 ? 1 : 2);
  GFX.cape       = lvl < 2;
GFX.compass   = lvl < 2;
  GFX.shockwaves = lvl < 2;
  GFX.enemyFx    = lvl < 2;
  GFX.particleCap  = [500, 300, 150, 60][lvl];
  GFX.pixelScale   = lvl < 3 ? 1 : 0.66;
}

// Feed it the measured FPS every ~0.5s while the game is running.
function gfxQualityTick(fps) {
  if (!(fps >= 0)) return;
  GFX._samples.push(fps);
  if (GFX._samples.length > 6) GFX._samples.shift();
  const avg = GFX._samples.reduce((s, v) => s + v, 0) / GFX._samples.length;
  GFX.fps = avg;

  // Step down only after ~1.5s of sustained low FPS, back up only after ~3s
  // of stable recovery — no quality flicker during momentary dips.
  if (avg < GFX_LOW[GFX.level + 1]) { GFX._low++; GFX._high = 0; }
  else if (avg > GFX_HIGH[GFX.level]) { GFX._high++; GFX._low = 0; }
  else { GFX._low = 0; GFX._high = 0; }

  if (GFX._low >= 3 && GFX.level < GFX_LEVELS - 1) {
    GFX.level++;
    applyGfxLevel();
  } else if (GFX._high >= 6 && GFX.level > 0) {
    GFX.level--;
    applyGfxLevel();
  }
}

// Caps particle spawning while the game is under pressure.
function gfxCanSpawnParticles() {
  return !!(game && game.particles.length < GFX.particleCap);
}

// Back to full quality at the start of a new run.
function resetGfx() {
  GFX.level = 0;
  GFX._samples = [];
  GFX._low = 0;
  GFX._high = 0;
  applyGfxLevel();
}

applyGfxLevel();