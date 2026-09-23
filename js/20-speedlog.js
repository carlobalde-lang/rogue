// ============================================================
// SPEED LOGGER — capture the PLAYER'S REAL movement speed
// ============================================================
// Press F3 (or use the DEV menu) to start a capture; press F3 again to stop.
// The file is saved only WHEN THE CAPTURE ENDS (manual stop or after
// SPEEDLOG_SECONDS), never at start.
//
// For every rendered frame the logger records:
//   frameMs   real wall-clock time of the frame
//   steps     fixed-timestep sim steps finished that frame (0, 1, 2, ...)
//   alpha     render interpolation fraction (simAcc / SIM_STEP)
//   simPx     px the SIM moved the player this frame
//   rendPx    px actually PAINTED this frame (via lerp(_rp, x, alpha))
//   simSpeed  sim px/s  = simPx / (frameMs/1000)
//   rendSpeed rendered px/s = rendPx / (frameMs/1000)
//   expSpeed  speed the player SHOULD have (speed, hazard, momentum)
// A ragged rendSpeed (or a big gap between simSpeed and rendSpeed) with a
// healthy expSpeed is exactly what a "stuttery" walk looks like in numbers.
//
// Where does the log land at STOP time?
//  - If the stop happened from a user gesture (F3 / button) Chromium can show
//    a native save dialog; otherwise it falls back to a plain download.
// ============================================================
(function () {
  const SPEEDLOG_SECONDS = 25;

  let active = false;
  let startAt = 0;
  let lastTs = 0;
  let lastRendered = null;      // last frame's interpolated screen position
  let lastSim = null;           // last frame's sim position
  let finishedByGesture = false;
  const parts = [];             // header + tab-separated rows
  let rowStart = 0;             // index where data rows begin

  function stamp() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      '_' + p(d.getHours()) + '-' + p(d.getMinutes()) + '-' + p(d.getSeconds());
  }
  function fileName() { return 'speedlog-' + stamp() + '.txt'; }

  // Rendered player position after interpolation — same formula as the
  // renderer uses (lerp(_rpPx, player.x, renderAlpha)).
  function renderedPos() {
    const g = game;
    const p = g.player;
    const a = (window.__simStats && window.__simStats.alpha) || 0;
    return {
      x: isFinite(g._rpPx) ? g._rpPx + (p.x - g._rpPx) * a : p.x,
      y: isFinite(g._rpPy) ? g._rpPy + (p.y - g._rpPy) * a : p.y
    };
  }

  // ------------- HUD indicator -------------
  let hud = null;
  function hudEl() {
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'speedlog-hud';
      hud.style.cssText = 'position:fixed;top:8px;right:8px;z-index:950;' +
        'background:rgba(0,0,0,0.8);color:#0f8;font:12px monospace;' +
        'padding:6px 10px;border:1px solid #0f8;border-radius:6px;display:none;';
      document.body.appendChild(hud);
    }
    return hud;
  }
  function updateHud() {
    const el = hudEl();
    if (!active) { el.style.display = 'none'; return; }
    const t = performance.now() - startAt;
    const left = Math.max(0, SPEEDLOG_SECONDS * 1000 - t);
    el.style.display = 'block';
    el.textContent = '⏺ speedlog ' + (left / 1000).toFixed(1) + 's';
  }
  let hudTimer = null;

  // ------------- writing -------------
  function push(line) { parts.push(line); }

  // ------------- save (only at stop) -------------
  async function save(text) {
    if (window.showSaveFilePicker && finishedByGesture) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName(),
          types: [{ description: 'Text log', accept: { 'text/plain': ['.txt'] } }]
        });
        const w = await handle.createWritable();
        await w.write(text);
        await w.close();
        return;
      } catch (e) {
        // cancelled / no gesture: fall back to download below
      }
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ------------- capture -------------
  function start() {
    if (active) return;
    active = true;
    startAt = performance.now();
    lastTs = 0; lastRendered = null; lastSim = null;
    finishedByGesture = false;
    parts.length = 0;
    rowStart = 0;

    push('SHADOW SURVIVORS - PLAYER SPEED LOG');
    push('captured : ' + stamp());
    push('SIM_STEP : ' + SIM_STEP + ' ms  (120 steps/s fixed timestep)');
    push('window   : ' + VIEW_W + 'x' + VIEW_H + '  DPR=' + DPR.toFixed(2));
    if (game && game.player) push('playerSpeed at start : ' + game.player.speed + ' px/s');
    else push('playerSpeed at start : (logger started outside a run; speed is per-row)');
    push('columns : tMs | frameMs | steps | alpha | simPx | rendPx | simSpeed | rendSpeed | expSpeed');
    push('');
    rowStart = parts.length;

    updateHud();
    hudTimer = setInterval(updateHud, 250);
  }

  function stop() {
    if (!active) return;
    active = false;
    clearInterval(hudTimer);
    updateHud();

    // Summary stats, computed over "moving" rows (the player actually moved).
    const data = [];
    for (let i = rowStart; i < parts.length; i++) {
      const f = parts[i].split('\t').map(Number);
      if (f.length >= 9 && f[4] > 0.5) data.push(f);
    }
    push('');
    push('== SUMMARY ==');
    push('frames logged : ' + (parts.length - rowStart) + '  (moving frames: ' + data.length + ')');
    if (data.length) {
      const stepHist = { 0: 0, 1: 0, 2: 0, more: 0 };
      let simSum = 0, simMin = Infinity, simMax = -Infinity;
      let renSum = 0, renMin = Infinity, renMax = -Infinity;
      let alphaSum = 0, frameSum = 0;
      for (const f of data) {
        const s = f[2];
        if (s > 2) stepHist.more++; else stepHist[s] = (stepHist[s] || 0) + 1;
        simSum += f[6]; simMin = Math.min(simMin, f[6]); simMax = Math.max(simMax, f[6]);
        renSum += f[7]; renMin = Math.min(renMin, f[7]); renMax = Math.max(renMax, f[7]);
        alphaSum += f[3]; frameSum += f[1];
      }
      const n = data.length;
      const simAvg = simSum / n, renAvg = renSum / n;
      let simVar = 0, renVar = 0;
      for (const f of data) {
        simVar += (f[6] - simAvg) * (f[6] - simAvg);
        renVar += (f[7] - renAvg) * (f[7] - renAvg);
      }
      push('sim px/s   : min=' + simMin.toFixed(1) + ' avg=' + simAvg.toFixed(1) +
        ' max=' + simMax.toFixed(1) + '  stdev=' + Math.sqrt(simVar / n).toFixed(1));
      push('rend px/s  : min=' + renMin.toFixed(1) + ' avg=' + renAvg.toFixed(1) +
        ' max=' + renMax.toFixed(1) + '  stdev=' + Math.sqrt(renVar / n).toFixed(1));
      push('alpha      : avg=' + (alphaSum / n).toFixed(3));
      push('frame ms   : avg=' + (frameSum / n).toFixed(2));
      push('steps/frame: 0=' + stepHist[0] + ' 1=' + stepHist[1] + ' 2=' + stepHist[2] +
        ' >2=' + stepHist.more);
    } else {
      push('(no movement captured - the player never moved more than 0.5px/frame)');
    }

    save(parts.join('\n'));
  }

  // ------------- per-frame sampling (called from gameLoop) -------------
  // Exposed on window so 14-main can call it without a hard dependency.
  let autoStopGuard = false;
  window.speedLog = {
    active: () => active,
    start,
    stop: () => { finishedByGesture = true; stop(); }
  };
  window.__speedLogTick = function () {
    if (!active) return;
    const g = game;
    if (!g || !g.running || g.paused || g.gameOver) { lastTs = performance.now(); return; }

    const now = performance.now();
    const frameMs = lastTs ? now - lastTs : 1000 / 120;
    lastTs = now;
    const st = window.__simStats || { steps: 0, alpha: 0 };
    const p = g.player;

    const rp = renderedPos();
    const sp = { x: p.x, y: p.y };
    const rendDist = lastRendered ? Math.hypot(rp.x - lastRendered.x, rp.y - lastRendered.y) : 0;
    const simDist = lastSim ? Math.hypot(sp.x - lastSim.x, sp.y - lastSim.y) : 0;
    lastRendered = rp; lastSim = sp;

    const mom = (p.momentumActive && p.momentum > 0) ? 1 + p.momentum * 0.06 : 1;
    const expSpeed = p.speed * (p._hazF || 1) * mom;

    push([
      (now - startAt).toFixed(1),
      frameMs.toFixed(2),
      st.steps,
      st.alpha.toFixed(3),
      simDist.toFixed(3),
      rendDist.toFixed(3),
      (frameMs > 0 ? simDist / (frameMs / 1000) : 0).toFixed(1),
      (frameMs > 0 ? rendDist / (frameMs / 1000) : 0).toFixed(1),
      expSpeed.toFixed(1)
    ].join('\t'));

    if (now - startAt >= SPEEDLOG_SECONDS * 1000) {
      if (!autoStopGuard) { autoStopGuard = true; stop(); }
    }
  };

  // ------------- wiring -------------
  document.addEventListener('keydown', e => {
    if (e.code === 'F3') {
      e.preventDefault();
      if (active) stop();
      else { autoStopGuard = false; start(); }
    }
  });

  // DEV menu section
  const box = document.getElementById('dev-actions');
  if (box) {
    const h = document.createElement('div');
    h.className = 'dev-section';
    h.textContent = 'Speed Log (F3)';
    box.appendChild(h);
    const b1 = document.createElement('button');
    b1.textContent = '▶ Start ' + SPEEDLOG_SECONDS + 's';
    b1.addEventListener('click', () => { autoStopGuard = false; start(); });
    const b2 = document.createElement('button');
    b2.textContent = '⏹ Stop & Save';
    b2.addEventListener('click', () => { finishedByGesture = true; stop(); });
    box.appendChild(b1);
    box.appendChild(b2);
  }
})();