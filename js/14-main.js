// ============================================================
// MAIN LOOP, INPUT & GAME INITIALIZATION
// ============================================================
let lastFrameTime = 0;
let fpsFrames = 0;
let fpsLast = performance.now();

function gameLoop(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const dt = Math.min(timestamp - lastFrameTime, 50); // cap at 50ms to prevent spiral
  lastFrameTime = timestamp;

  if (game && game.running) {
    update(dt);
    render();
    updateUI();
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
function startGame() {
  game = createGameState();
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

  // Initialize flow field + world around the player
  ffCX = 999999; ffCY = 999999;   // force recomputation on first update
  updateFlowField(game.player.x, game.player.y);

  lastFrameTime = 0;
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

canvas.addEventListener('touchstart', e => {
  if (!game || !game.running || game.paused || game.gameOver) return;
  e.preventDefault();
  const touch = e.changedTouches[0];
  game.joystick.active = true;
  game.joystick.id = touch.identifier;
  game.joystick.baseX = touch.clientX;
  game.joystick.baseY = touch.clientY;
  game.joystick.dx = 0;
  game.joystick.dy = 0;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
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
  if (!game || !game.joystick.active) return;
  for (const touch of e.changedTouches) {
    if (touch.identifier !== game.joystick.id) continue;
    game.joystick.active = false;
    game.joystick.dx = 0;
    game.joystick.dy = 0;
    break;
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

// Start / restart buttons
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

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