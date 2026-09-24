// ============================================================
// MAIN LOOP, INPUT & GAME INITIALIZATION
// ============================================================
let lastFrameTime = 0;
let fpsFrames = 0;
let fpsLast = performance.now();

// ============================================================
// FIXED-TIMESTEP SIMULATION
// ============================================================
// Movement is dt-multiplied everywhere (`stepX = mx * mvSpd * dtSec`). With a
// raw variable dt that tracks the jittery rAF cadence, every frame whose bake
// takes a few extra ms made the player travel farther in that one frame — the
// world kept visibly speeding up and slowing down even at high average FPS.
//
// So the simulation advances in exact 8.33 ms steps gathered in an accumulator:
// the game world ALWAYS runs at a constant 120 steps/sec regardless of frame
// timing, while rendering still happens on every rAF (input stays responsive).
// A slow frame just catches up several fixed steps in a row — the on-screen
// distance per rendered frame stays uniform, so speed never pulses with the
// per-frame jitter. The step guard drops the backlog after a big hitch (tab
// switch) instead of freezing the frame.
const SIM_STEP = 1000 / 120;       // ~8.333 ms per simulation step (default)
const SIM_MAX_STEPS = 16;          // hard cap on catch-up steps per frame
const SIM_ACC_MAX = 240;           // accumulator clamp (prevents spiral)
let simAcc = 0;

// Per-run sim rate override (dev-menu "Sim Hz"): lets the 120Hz fixed step be
// lowered (e.g. 60Hz halves the whole sim CPU cost) without a rebuild. Default
// 120Hz keeps the shipped behaviour exactly as before.
function simStepMs() {
  const hz = game && game.dev && game.dev.simHz > 0 ? game.dev.simHz : 120;
  return 1000 / hz;
}

// Shared stats mirror for the speed logger (20-speedlog.js): the main loop
// writes steps/alpha here every rendered frame.
window.__simStats = window.__simStats || { steps: 0, alpha: 0 };

function gameLoop(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const raw = Math.min(Math.max(timestamp - lastFrameTime, 0), SIM_MAX_STEPS * SIM_STEP);
  lastFrameTime = timestamp;

  if (game && game.running) {
    simAcc = Math.min(simAcc + raw, SIM_ACC_MAX);
    const stepMs = simStepMs();
    let steps = 0;
    if (!game.paused && !game.gameOver) {
      while (simAcc >= stepMs && steps < SIM_MAX_STEPS) {
        // Snapshot camera + player BEFORE the step so the renderer can
        // interpolate between "just finished" and "about to happen" and render
        // fully continuous motion even between sim steps (needed so 120Hz steps
        // stay perfectly smooth on 144Hz/90Hz/240Hz displays, where a raw
        // 0/1/2-step alternation shows up as speed pulsing).
        const g = game;
        g._rpCamX = g.camera.x; g._rpCamY = g.camera.y;
        g._rpPx = g.player.x; g._rpPy = g.player.y;
        update(stepMs);
        simAcc -= stepMs;
        steps++;
      }
      if (steps >= SIM_MAX_STEPS) simAcc = 0;   // drop backlog after a heavy hitch
      game.renderAlpha = simAcc / stepMs;       // fraction of the next step elapsed
    } else {
      simAcc = 0;                               // paused / game over: discard captured time
      if (game) game.renderAlpha = 0;
    }
    // Mirror per-frame sim stats for the speed logger (20-speedlog.js)
    if (window.__simStats) {
      window.__simStats.steps = steps;
      window.__simStats.alpha = (game && game.renderAlpha) || 0;
    }
    render();
    updateUI();
    if (window.__speedLogTick) window.__speedLogTick();
  } else {
    simAcc = 0;
  }

  // FPS counter
  fpsFrames++;
  const now2 = performance.now();
  if (now2 - fpsLast >= 500) {
    const fpsEl = document.getElementById('fps');
    const fpsNow = fpsFrames * 1000 / (now2 - fpsLast);
    if (fpsEl) fpsEl.textContent = Math.round(fpsNow) + ' FPS';
    // Feed the adaptive quality system only during live gameplay;
    // idle screens always report a healthy frame rate.
    if (game && game.running) gfxQualityTick(fpsNow);
    else gfxQualityTick(120);
    fpsFrames = 0;
    fpsLast = now2;
  }

  requestAnimationFrame(gameLoop);
}

// ============================================================
// INPUT HANDLING
// ============================================================
document.addEventListener('keydown', e => {
  if (!game) return;

  // Level-up screen navigation
  if (game.levelUpPending && game.levelUpChoices) {
    const count = game.levelUpChoices.length;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
      game.selectedChoice = (game.selectedChoice - 1 + count) % count;
      updateChoiceSelection();
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      game.selectedChoice = (game.selectedChoice + 1) % count;
      updateChoiceSelection();
      e.preventDefault();
      return;
    }
    if (e.code === 'Space' || e.code === 'Enter') {
      confirmChoice(game.selectedChoice);
      e.preventDefault();
      return;
    }
    // Block all other keys during level-up
    e.preventDefault();
    return;
  }

  // Warp menu: Esc/P cancels it (the menu owns the pause state)
  if (game.warpOpen) {
    if (e.code === 'KeyP' || e.code === 'Escape') {
      closeWarpMenu(true);
      e.preventDefault();
      return;
    }
    e.preventDefault();
    return;
  }

  // Pause / resume with P or Escape
  if (e.code === 'KeyP' || e.code === 'Escape') {
    togglePause();
    e.preventDefault();
    return;
  }

  // Player movement (only when not paused)
  if (!game.paused) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    game.input.up = true; break;
      case 'KeyS': case 'ArrowDown':  game.input.down = true; break;
      case 'KeyA': case 'ArrowLeft':  game.input.left = true; break;
      case 'KeyD': case 'ArrowRight': game.input.right = true; break;
    }
  }
});

document.addEventListener('keyup', e => {
  if (!game) return;
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    game.input.up = false; break;
    case 'KeyS': case 'ArrowDown':  game.input.down = false; break;
    case 'KeyA': case 'ArrowLeft':  game.input.left = false; break;
    case 'KeyD': case 'ArrowRight': game.input.right = false; break;
  }
});

// Prevent scrolling with arrow keys
window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
});

// ============================================================
// GAME INITIALIZATION
// ============================================================
// Pre-run loading screen: START (or restart / hub PLAY) shows the loading
// overlay and pre-bakes every chunk canvas around the run's fixed spawn, a few
// per tick so the browser keeps painting the progress bar. Only when the whole
// opening ring is streamed does the actual run begin (startGame), so the first
// seconds never hitch on a terrain bake. The ruins heart is always chunk (0,0);
// world tile (8,8) in that chunk is the spawn — see doWarpToSpawn().
let prewarmKeys = null;
let prewarmIdx = 0;
let loadingActive = false;

function beginRun() {
  if (loadingActive) return;
  loadingActive = true;

  // Brand-new map every run: reroll the world seed and drop the old terrain
  // caches BEFORE the prewarm bake streams the opening chunks.
  if (typeof rerollWorldSeed === 'function') rerollWorldSeed();

  const spawnX = 8 * TILE + TILE / 2, spawnY = 8 * TILE + TILE / 2;
  const pcx = Math.floor(spawnX / CHUNK_PX), pcy = Math.floor(spawnY / CHUNK_PX);
  const rMax = (Math.max(Math.ceil(VIEW_W / CHUNK_PX), Math.ceil(VIEW_H / CHUNK_PX)) >> 1) + 3;
  prewarmKeys = prewarmChunkList(pcx, pcy, rMax);
  prewarmIdx = 0;

  // Swap the start screen for the loading overlay immediately.
  const loadEl = document.getElementById('loading-screen');
  document.getElementById('start-screen').style.display = 'none';
  const fillEl = document.getElementById('loading-fill');
  const pctEl = document.getElementById('loading-pct');
  loadEl.style.display = 'flex';
  if (fillEl) fillEl.style.width = '0%';
  if (pctEl) pctEl.textContent = '0%';

  setTimeout(prewarmTick, 16);
}

function prewarmTick() {
  const total = prewarmKeys.length;
  const n = Math.min(total, prewarmIdx + 3);   // ~3 chunk bakes per tick
  for (; prewarmIdx < n; prewarmIdx++) {
    const key = prewarmKeys[prewarmIdx];
    const i = key.indexOf(',');
    getChunkCanvas(parseInt(key.slice(0, i), 10), parseInt(key.slice(i + 1), 10));
  }

  const fillEl = document.getElementById('loading-fill');
  const pctEl = document.getElementById('loading-pct');
  const pct = total ? Math.round(prewarmIdx / total * 100) : 100;
  if (fillEl) fillEl.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';

  if (prewarmIdx < total) { setTimeout(prewarmTick, 0); return; }

  document.getElementById('loading-screen').style.display = 'none';
  loadingActive = false;
  startGame();
}

function startGame() {
  game = createGameState();
  if (typeof resetSpawnQueue === 'function') resetSpawnQueue();   // no leftover horde at run start
  // World tile (8,8) in chunk 0 is the ruins heart: this run's spawn point
  // (same spot doWarpToSpawn() returns to). Start standing right on it.
  game.player.x = 8 * TILE + TILE / 2;
  game.player.y = 8 * TILE + TILE / 2;
  game.camera.x = game.player.x - VIEW_W / 2;
  game.camera.y = game.player.y - VIEW_H / 2;
  game.running = true;
  resetGfx();   // start every run at full quality
  // AUTO power-ups are a per-run preference: always off at the start.
  if (typeof resetAutoLevelUp === 'function') resetAutoLevelUp();
  applyMetaToRun(game.player);   // permanent upgrades + chosen character
  game.bossTimer = 180000;
  game.eliteTimer = 20000;
  game.waveTimer = 1000;

  // Give starting weapon
  game.player.weapons.push({ id: getStartWeapon(), level: 1, lastFired: 0 });

  // Start balance/difficulty telemetry capture for this run
  if (window.runLog) runLog.begin();

  // Initialize flow field + world around the player
  ffCX = 999999; ffCY = 999999;   // force recomputation on first update
  updateFlowField(game.player.x, game.player.y);

  lastFrameTime = 0;
  simAcc = 0;
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('game-over-screen').style.display = 'none';
  document.getElementById('levelup-screen').style.display = 'none';
  document.getElementById('pause-screen').style.display = 'none';
  document.getElementById('warp-menu').style.display = 'none';
  document.getElementById('pause-btn').style.display = 'block';
  Sound.play('start');
  Sound.startMusic();
}

// ============================================================
// VOLUME SETTINGS (start & pause screens, synced)
// ============================================================
function syncVolumeControls(slider) {
  const v = +slider.value;
  const kind = slider.dataset.vol;
  if (kind === 'music') Sound.setMusicVolume(v / 100);
  else if (kind === 'sfx') Sound.setSfxVolume(v / 100);
  // Keep the matching sliders/labels on both screens in sync
  document.querySelectorAll('.vol-slider[data-vol="' + kind + '"]').forEach(o => {
    if (o === slider) return;
    o.value = slider.value;
  });
  document.querySelectorAll('.vol-value[data-vol-label="' + kind + '"]').forEach(o => {
    o.textContent = v + '%';
  });
}

function initVolumeControls() {
  document.querySelectorAll('.vol-slider').forEach(slider => {
    const kind = slider.dataset.vol;
    const initial = Math.round(100 * (kind === 'music' ? Sound.musicVolume : Sound.sfxVolume));
    slider.value = initial;
    syncVolumeControls(slider);
    slider.addEventListener('input', () => syncVolumeControls(slider));
  });
}

// ============================================================
// TOUCH / MOBILE JOYSTICK
// ============================================================
const JOY_DEADZONE = 12;

// Tracks fingers currently on screen, so the joystick can be re-linked after a
// pause (the browser keeps firing touchmove, but the joystick went inactive).
const heldTouches = new Map();

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  heldTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
  if (!game || !game.running || game.paused || game.gameOver) return;
  game.joystick.active = true;
  game.joystick.id = touch.identifier;
  game.joystick.baseX = touch.clientX;
  game.joystick.baseY = touch.clientY;
  game.joystick.dx = 0;
  game.joystick.dy = 0;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  for (const touch of e.changedTouches) {
    const h = heldTouches.get(touch.identifier);
    if (h) { h.x = touch.clientX; h.y = touch.clientY; }
  }
  if (!game || !game.joystick.active) return;
  e.preventDefault();
  for (const touch of e.changedTouches) {
    if (touch.identifier !== game.joystick.id) continue;
    let ddx = touch.clientX - game.joystick.baseX;
    let ddy = touch.clientY - game.joystick.baseY;
    const d = Math.hypot(ddx, ddy);
    if (d < JOY_DEADZONE) {
      game.joystick.dx = 0;
      game.joystick.dy = 0;
    } else {
      const max = game.joystick.maxRadius;
      const clampD = Math.min(d, max);
      game.joystick.dx = ddx / d * (clampD / max);
      game.joystick.dy = ddy / d * (clampD / max);
    }
    break;
  }
}, { passive: false });

function endTouch(e) {
  for (const touch of e.changedTouches) {
    heldTouches.delete(touch.identifier);
    if (!game || !game.joystick.active || touch.identifier !== game.joystick.id) continue;
    game.joystick.active = false;
    game.joystick.dx = 0;
    game.joystick.dy = 0;
  }
}
canvas.addEventListener('touchend', e => { e.preventDefault(); endTouch(e); }, { passive: false });
canvas.addEventListener('touchcancel', e => { endTouch(e); }, { passive: false });

// ============================================================
// BOOT: wire UI buttons + start render loop
// ============================================================
// Pause / resume buttons
document.getElementById('pause-btn').addEventListener('click', togglePause);
document.getElementById('resume-btn').addEventListener('click', togglePause);
const warpCancelBtn = document.getElementById('warp-cancel');
if (warpCancelBtn) warpCancelBtn.addEventListener('click', () => closeWarpMenu(true));

// Back-to-hub button from the pause menu (two-step confirm)
let hubLeaveArmed = false, hubLeaveTimer = null;
const hubLeaveBtn = document.getElementById('leave-hub-btn');
hubLeaveBtn.addEventListener('click', () => {
  if (!hubLeaveArmed) {
    hubLeaveArmed = true;
    hubLeaveBtn.classList.add('armed');
    hubLeaveBtn.textContent = '⚠ CONFIRM — ABANDON RUN';
    clearTimeout(hubLeaveTimer);
    hubLeaveTimer = setTimeout(() => {
      hubLeaveArmed = false;
      hubLeaveBtn.classList.remove('armed');
      hubLeaveBtn.textContent = '🏠 BACK TO HUB';
    }, 2500);
    return;
  }
  hubLeaveArmed = false;
  clearTimeout(hubLeaveTimer);
  hubLeaveBtn.classList.remove('armed');
  hubLeaveBtn.textContent = '🏠 BACK TO HUB';
  leaveToHub();
});

// Start / restart buttons (both go through the pre-run loading screen)
document.getElementById('start-btn').addEventListener('click', beginRun);
document.getElementById('restart-btn').addEventListener('click', beginRun);

// Volume sliders (start & pause screens)
initVolumeControls();

// Refresh the best-runs leaderboard shown on the start screen
if (typeof renderBestRuns === 'function') renderBestRuns();

// Random slogan on the start screen
const SLOGANS = [
  'Feels like home',
  'All the roguelike clichés all in one game',
  'How long can you survive?',
  'One more run… just one more',
  'Every death is a new build',
  'Get hit, get strong',
  'The shadows are watching',
  '500 shades of magic'
];
const sub = document.getElementById('start-subtitle');
if (sub) sub.textContent = choose(SLOGANS);

// Prevent context menu
canvas.addEventListener('contextmenu', e => e.preventDefault());

// Start render loop
requestAnimationFrame(gameLoop);