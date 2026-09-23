// ============================================================
// RUN LOG — balance/difficulty telemetry exporter
// ============================================================
// At the end of a run (game over) this module compiles everything the game
// observed during the match into a single JSON file and downloads it as
// runlog-<timestamp>.json. It is NOT a gameplay feature: it exists so the
// difficulty curves (hp, damage, spawn pacing) can be tuned from real runs.
//
// Instrumentation hooks (all no-op when no run is active):
//   runLog.begin()                     -> start a fresh capture (from startGame)
//   runLog.setSource(id)               -> attribute subsequent hits to an origin
//   runLog.onDamageDealt(dmg, src)     -> player landed damage on an enemy
//   runLog.onShieldBlock(dmg)          -> damage eaten by an enemy front-shield
//   runLog.onSpawn(kind, hp, dmg)      -> an enemy of `kind` entered the field
//   runLog.onKill(kind, ttk, dmgUsed)  -> an enemy died (ttk in ms since spawn)
//   runLog.onDamageTaken(dmg, src, kd) -> the player was hit (src + enemy kind)
//   runLog.tick(dt)                    -> per-sim-step window counters
//   runLog.finish(reason)              -> build + save the JSON (game over)
//
// Every 10 s a timeline row is flattened so difficulty over time (dm, spawn
// pressure, player DPS in that window) can be plotted without sampling spam.
// ============================================================
(function () {
  'use strict';

  const WINDOW = 10000;        // 10 s buckets for the timeline / DPS curve

  let active = false;
  let currentSrc = null;       // attribution origin set around damage blocks
  let runStart = 0;            // game.time of run begin (ms)
  let winStart = 0;            // game.time marking the start of the current window
  const samples = [];          // flattened 10 s timeline rows

  // ---- cumulative totals (reset at begin) ----
  let totalDmg = 0, totalHits = 0, totalShield = 0;
  let totalTaken = 0;
  let peakAlive = 0;
  let lowHpTime = 0;           // ms the player spent under 25% HP
  let minHpFrac = 1;
  const dmgBySrc = {};         // src -> { total, hits, dpsSum } (dpsSum from windows)
  const dmgOutBuckets = [];    // per window bucket: { startT, dmg, hits }
  const takenBySrc = {};       // src -> { total, hits, byKind: {} }
  const spawns = {};           // kind -> aggregate spawn stats
  const kills = {};            // kind -> aggregate death stats

  // ---- current 10 s window accumulators ----
  let wDmg = 0, wHits = 0, wTaken = 0, wXp = 0;
  let wWave = 0, wElite = 0, wBoss = 0, wWarden = 0;
  let wSpawned = 0, wKilled = 0;

  // ---- xp tracking (accumulate XP even through level-ups) ----
  let prevXp = 0, prevLvl = 1, prevXpToLevel = 10;

  function begin() {
    const g = game;
    if (!g) return;
    active = true;
    currentSrc = null;
    runStart = g.time;
    winStart = g.time;
    samples.length = 0;
    totalDmg = 0; totalHits = 0; totalShield = 0; totalTaken = 0;
    peakAlive = 0; lowHpTime = 0; minHpFrac = 1;
    for (const k of Object.keys(dmgBySrc)) delete dmgBySrc[k];
    dmgOutBuckets.length = 0;
    for (const k of Object.keys(takenBySrc)) delete takenBySrc[k];
    for (const k of Object.keys(spawns)) delete spawns[k];
    for (const k of Object.keys(kills)) delete kills[k];
    wDmg = 0; wHits = 0; wTaken = 0; wXp = 0;
    wWave = 0; wElite = 0; wBoss = 0; wWarden = 0; wSpawned = 0; wKilled = 0;
    const p = g.player;
    prevXp = p.xp; prevLvl = p.level; prevXpToLevel = p.xpToLevel;
  }

  function setSource(id) { currentSrc = id; }

  function bump(obj, key, field, v) {
    const b = obj[key] || (obj[key] = {});
    b[field] = (b[field] || 0) + v;
    return b;
  }

  function onDamageDealt(dmg, src) {
    if (!active || dmg <= 0) return;
    const s = src || currentSrc || 'other';
    totalDmg += dmg; totalHits++;
    wDmg += dmg; wHits++;
    const b = bump(dmgBySrc, s, 'total', dmg);
    b.hits = (b.hits || 0) + 1;
  }

  function onShieldBlock(dmg) {
    if (!active) return;
    totalShield += dmg;
  }

  function onSpawn(kind, hp, dmg) {
    if (!active) return;
    const k = kind || 'unknown';
    const s = spawns[k] || (spawns[k] = { spawned: 0, killed: 0, hpMin: Infinity, hpMax: 0, hpSum: 0, dmgMin: Infinity, dmgMax: 0, dmgSum: 0 });
    s.spawned++;
    if (hp < s.hpMin) s.hpMin = hp;
    if (hp > s.hpMax) s.hpMax = hp;
    s.hpSum += hp;
    if (dmg < s.dmgMin) s.dmgMin = dmg;
    if (dmg > s.dmgMax) s.dmgMax = dmg;
    s.dmgSum += dmg;
    wSpawned++;
  }

  function onKill(kind, ttk, dmgUsed) {
    if (!active) return;
    const k = kind || 'unknown';
    const kd = kills[k] || (kills[k] = { killed: 0, ttkMin: Infinity, ttkMax: 0, ttkSum: 0, ttkN: 0, dmgUsedMin: Infinity, dmgUsedMax: 0, dmgUsedSum: 0, dmgUsedN: 0 });
    kd.killed++;
    if (ttk >= 0) {
      if (ttk < kd.ttkMin) kd.ttkMin = ttk;
      if (ttk > kd.ttkMax) kd.ttkMax = ttk;
      kd.ttkSum += ttk; kd.ttkN++;
    }
    if (dmgUsed >= 0) {
      if (dmgUsed < kd.dmgUsedMin) kd.dmgUsedMin = dmgUsed;
      if (dmgUsed > kd.dmgUsedMax) kd.dmgUsedMax = dmgUsed;
      kd.dmgUsedSum += dmgUsed; kd.dmgUsedN++;
    }
    wKilled++;
  }

  function onDamageTaken(dmg, src, srcKind) {
    if (!active || dmg <= 0) return;
    const s = src || 'other';
    totalTaken += dmg;
    wTaken += dmg;
    const b = takenBySrc[s] || (takenBySrc[s] = { total: 0, hits: 0, byKind: {} });
    b.total += dmg; b.hits++;
    if (srcKind) bump(b.byKind, srcKind, 'total', dmg);
    const g = game;
    if (g && g.player) {
      const frac = g.player.hp / Math.max(1, g.player.maxHp);
      if (frac < minHpFrac) minHpFrac = frac;
    }
  }

  // Called once per simulation step, after all subsystems ran.
  function tick(dt) {
    if (!active) return;
    const g = game;
    const p = g.player;
    if (!g || !p) return;

    const alive = g.enemies.length;
    if (alive > peakAlive) peakAlive = alive;

    // Track time spent below 25% HP (gates the "always almost dead" reads)
    const frac = p.hp / Math.max(1, p.maxHp);
    if (frac < 0.25) lowHpTime += dt;

    // XP accumulated regardless of level-up resets
    const dxp = (p.level - prevLvl) * prevXpToLevel + (p.xp - prevXp);
    if (dxp > 0) wXp += dxp;
    prevXp = p.xp; prevLvl = p.level; prevXpToLevel = p.xpToLevel;

    if (g.time - winStart >= WINDOW) {
      flattenWindow(g);
      winStart += WINDOW;
    }
  }

  function flattenWindow(g) {
    const dur = Math.max(1, WINDOW / 1000);
    const row = {
      t: Math.round(winStart / 1000),
      dm: round2(g.difficultyMult),
      level: g.player.level,
      hpFrac: round2(g.player.hp / Math.max(1, g.player.maxHp)),
      alive: g.enemies.length,
      dps: round2(wDmg / dur),
      dmgTaken: Math.round(wTaken),
      xp: Math.round(wXp),
      spawned: wSpawned,
      killed: wKilled,
      waves: wWave,
      elites: wElite,
      wardens: wWarden,
      bosses: wBoss
    };
    // keep a per-window DPS bucket for the max/p95 summaries
    dmgOutBuckets.push({ startT: winStart, dmg: wDmg, hits: wHits });
    samples.push(row);
    wDmg = 0; wHits = 0; wTaken = 0; wXp = 0;
    wWave = 0; wElite = 0; wBoss = 0; wWarden = 0; wSpawned = 0; wKilled = 0;
  }

  function round2(v) { return Math.round(v * 100) / 100; }

  // ---- aggregates: min/avg/max over a per-kind collector ----
  function statKey(o, min, sum, n, max) {
    if (!o || !n) return null;
    return { min: round2(o[min] === Infinity ? 0 : o[min]), avg: round2(o[sum] / o[n]), max: round2(o[max]) };
  }

  function summarizeEnemies() {
    const out = {};
    for (const kind of Object.keys(spawns)) {
      const s = spawns[kind];
      const k = kills[kind] || {};
      const ttk = statKey(k, 'ttkMin', 'ttkSum', 'ttkN', 'ttkMax');
      const dmgUsed = statKey(k, 'dmgUsedMin', 'dmgUsedSum', 'dmgUsedN', 'dmgUsedMax');
      const hpd = dmgUsed ? { min: round2(dmgUsed.min), avg: round2(dmgUsed.avg), max: round2(dmgUsed.max) } : null;
      out[kind] = {
        spawned: s.spawned,
        killed: k.killed || 0,
        hp: { min: round2(s.hpMin), avg: round2(s.hpSum / s.spawned), max: round2(s.hpMax) },
        damage: { min: round2(s.dmgMin), avg: round2(s.dmgSum / s.spawned), max: round2(s.dmgMax) },
        ttk: ttk ? { min: Math.round(ttk.min), avg: Math.round(ttk.avg), max: Math.round(ttk.max) } : null,
        dmgToKill: hpd
      };
    }
    return out;
  }

  function summarizeTaken() {
    const out = {};
    for (const src of Object.keys(takenBySrc)) {
      const b = takenBySrc[src];
      out[src] = { total: Math.round(b.total), hits: b.hits, byKind: {} };
      for (const k of Object.keys(b.byKind)) {
        out[src].byKind[k] = Math.round(b.byKind[k].total);
      }
    }
    return out;
  }

  function dpsStats() {
    if (dmgOutBuckets.length === 0) return { avg: 0, max: 0, p95: 0 };
    const dps = dmgOutBuckets.map(b => b.dmg / (WINDOW / 1000)).sort((a, b) => a - b);
    const sum = dps.reduce((a, b) => a + b, 0);
    const avg = sum / dps.length;
    const idx95 = Math.max(0, Math.min(dps.length - 1, Math.ceil(dps.length * 0.95) - 1));
    return { avg: round2(avg), max: round2(dps[dps.length - 1]), p95: round2(dps[idx95]) };
  }

  function finalPlayerSnapshot() {
    const p = game.player;
    const passives = {};
    for (const nm of p.passives) passives[nm] = (passives[nm] || 0) + 1;
    return {
      level: p.level,
      maxHp: Math.round(p.maxHp),
      dmgMult: round2(p.dmgMult),
      areaMult: round2(p.areaMult),
      cdMult: round2(p.cdMult),
      armor: p.armor,
      regen: p.regen,
      vamp: p.vamp,
      thorns: p.thorns,
      luck: p.luck,
      pickupRange: Math.round(p.pickupRange),
      weapons: p.weapons.map(w => ({ id: w.id, level: w.level })),
      passives: passives
    };
  }

  function build(reason) {
    const g = game;
    const p = g.player;
    const timeSec = g.time / 1000;
    const diff = { mult: round2(g.difficultyMult) };
    if (typeof difficultyDef === 'function') { const d = difficultyDef(); diff.label = d.label; diff.scale = d.scale; }
    return {
      meta: {
        version: 1,
        date: new Date().toISOString(),
        reason: reason,
        durationSec: Math.round(timeSec),
        duration: formatTime(g.time),
        kills: g.kills,
        enemiesSpawned: g.totalEnemiesSpawned,
        level: p.level,
        difficulty: diff,
        difficultyOverride: g.dev.difficultyOverride
      },
      summary: {
        totalDamage: Math.round(totalDmg),
        hits: totalHits,
        avgHit: round2(totalHits ? totalDmg / totalHits : 0),
        shieldAbsorbed: Math.round(totalShield),
        dps: dpsStats(),
        damageTaken: Math.round(totalTaken),
        bySource: summarizeTaken(),
        peakEnemiesAlive: peakAlive,
        minHpFrac: round2(minHpFrac),
        lowHpSeconds: Math.round(lowHpTime / 1000),
        avgAlive: round2(samples.length ? samples.reduce((a, r) => a + r.alive, 0) / samples.length : 0)
      },
      damageByWeapon: Object.keys(dmgBySrc).map(src => ({
        src: src,
        total: Math.round(dmgBySrc[src].total),
        hits: dmgBySrc[src].hits || 0,
        share: round2(totalDmg ? dmgBySrc[src].total / totalDmg : 0)
      })).sort((a, b) => b.total - a.total),
      enemies: summarizeEnemies(),
      player: finalPlayerSnapshot(),
      recipes: Object.keys(g.recipesTriggered || {}),
      timeline: samples
    };
  }

  // same save flow as the speed logger: native dialog when a gesture exists,
  // otherwise a plain auto-download.
  function stamp() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      '_' + p(d.getHours()) + '-' + p(d.getMinutes()) + '-' + p(d.getSeconds());
  }
  function fileName() { return 'runlog-' + stamp() + '.json'; }

  async function save(text) {
    if (window.showSaveFilePicker && window.__runlogGesture) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName(),
          types: [{ description: 'Run log', accept: { 'application/json': ['.json'] } }]
        });
        const w = await handle.createWritable();
        await w.write(text);
        await w.close();
        return;
      } catch (e) { /* fall back to download */ }
    }
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function finish(reason) {
    if (!active || !game || !game.player) return;
    // Dump the partial window still in flight before compiling.
    if (game.time - winStart > 1) flattenWindow(game);
    const data = build(reason || 'death');
    active = false;
    window.__runlogGesture = false;   // consume any stale gesture flag
    save(JSON.stringify(data, null, 2));
  }

  // Spawn-type counters per window (wired into updateSpawning).
  function addSpawnType(type, n) {
    if (!active) return;
    const c = n || 1;
    if (type === 'wave') wWave += c;
    else if (type === 'elite') wElite += c;
    else if (type === 'warden') wWarden += c;
    else if (type === 'boss') wBoss += c;
  }

  window.runLog = {
    begin: begin,
    setSource: setSource,
    onDamageDealt: onDamageDealt,
    onShieldBlock: onShieldBlock,
    onSpawn: onSpawn,
    onKill: onKill,
    onDamageTaken: onDamageTaken,
    addSpawnType: addSpawnType,
    tick: tick,
    finish: finish
  };
  Object.defineProperty(window.runLog, 'currentSrc', { get: () => currentSrc, set: v => { currentSrc = v; } });
})();