// ============================================================
// DEV MENU — data-driven panel exposing game internals
// Toggle with the ⚙ button or F2 key.
// ============================================================
(() => {
  const panel = document.getElementById('dev-panel');
  const fieldsBox = document.getElementById('dev-fields');
  const actionsBox = document.getElementById('dev-actions');
  const closeBtn = document.getElementById('dev-close');
  const devBtn = document.getElementById('dev-btn');

  // --- Helper: read nested property by dot-path ---
  function getByPath(obj, path) {
    return path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
  }
  function setByPath(obj, path, val) {
    const keys = path.split('.');
    const last = keys.pop();
    const ref = keys.reduce((o, k) => { if (o[k] == null) o[k] = {}; return o[k]; }, obj);
    ref[last] = val;
  }

  // --- Field definitions (section → [{label, path, min, max, step}] ) ---
  const SECTIONS = [
    { title: 'Player', fields: [
      { label: 'Move Speed',    path: 'player.speed',       min: 10, max: 800,  step: 5 },
      { label: 'Max HP',        path: 'player.maxHp',       min: 1,  max: 5000, step: 10 },
      { label: 'Armor',         path: 'player.armor',       min: 0,  max: 50,   step: 1 },
      { label: 'Dmg Mult',      path: 'player.dmgMult',     min: 0,  max: 20,   step: 0.1 },
      { label: 'Area Mult',     path: 'player.areaMult',    min: 0,  max: 10,   step: 0.1 },
      { label: 'Cooldown Mult', path: 'player.cdMult',      min: 0,  max: 5,    step: 0.05 },
      { label: 'Pickup Range',  path: 'player.pickupRange', min: 10, max: 400,  step: 5 },
      { label: 'Regen /s',      path: 'player.regen',       min: 0,  max: 20,   step: 0.1 },
      { label: 'Radius',        path: 'player.radius',      min: 4,  max: 50,   step: 1 },
      { label: 'XP',            path: 'player.xp',          min: 0,  max: 99999,step: 10 },
      { label: 'Level',         path: 'player.level',       min: 1,  max: 200,  step: 1 },
    ]},
    { title: 'Modifiers', fields: [
      { label: 'Time Scale',      path: 'dev.timeScale',          min: 0.05, max: 5,    step: 0.05 },
      { label: 'Enemy HP x',      path: 'dev.enemyHpMult',        min: 0,    max: 50,   step: 0.1 },
      { label: 'Enemy Speed x',   path: 'dev.enemySpeedMult',     min: 0,    max: 10,   step: 0.1 },
      { label: 'Enemy Dmg x',     path: 'dev.enemyDmgMult',       min: 0,    max: 20,   step: 0.1 },
      { label: 'XP Gain x',       path: 'dev.xpMult',             min: 0,    max: 50,   step: 0.1 },
      { label: 'Wave Interval x', path: 'dev.waveIntervalMult',   min: 0,    max: 10,   step: 0.1 },
      { label: 'Elite Interv. x', path: 'dev.eliteIntervalMult',  min: 0,    max: 10,   step: 0.1 },
      { label: 'Boss Interv. x',  path: 'dev.bossIntervalMult',   min: 0,    max: 10,   step: 0.1 },
      { label: 'Enemy Cap',       path: 'dev.enemyCap',           min: 10,   max: 3000, step: 10 },
      { label: 'Diff Override',   path: 'dev.difficultyOverride', min: 0,    max: 200,  step: 1, note: '0 = auto' },
      { label: 'Sim Hz',          path: 'dev.simHz',              min: 30,   max: 240,  step: 15,  note: 'default 60' },
    ]},
  ];

  const CHECKBOXES = [
    { label: 'God Mode (no damage)', path: 'dev.godMode' },
  ];

  const ACTION_GROUPS = [
    { title: 'Run', actions: [
      { label: 'Full Heal',   fn: g => { g.player.hp = g.player.maxHp; } },
      { label: '+500 XP',     fn: g => gainXp(500) },
      { label: '+Level',      fn: g => gainXp(g.player.xpToLevel) },
      { label: 'Spawn Wave',  fn: g => spawnWave() },
      { label: 'Spawn Elite', fn: g => spawnEnemy('elite') },
      { label: 'Spawn Boss',  fn: g => spawnEnemy('boss') },
      { label: 'Kill All',    fn: g => { g.enemies.forEach(e => killEnemy(e)); } },
      { label: 'Reset Dev',   fn: () => resetFields() },
    ]},
    { title: 'World', actions: BIOME_IDS.map(id => ({
      label: 'To ' + BIOME_DEFS[id].name,
      // Teleport a couple of tiles away from the chest point, on a safe floor
      // tile, so you land "near the centre" without triggering the chest
      // (it needs a 600ms hold, but a 1-tile step would start it).
      fn: g => {
        const c = chestPos(id);
        const offs = [
          [c.x - TILE, c.y - TILE], [c.x + TILE, c.y - TILE],
          [c.x - TILE, c.y + TILE], [c.x + TILE, c.y + TILE],
          [c.x - 2 * TILE, c.y], [c.x + 2 * TILE, c.y],
          [c.x, c.y - 2 * TILE], [c.x, c.y + 2 * TILE],
          [c.x, c.y],
        ];
        const pick = offs.find(([x, y]) =>
          getTile(x, y) === T_FLOOR && tileHazardAt(x, y) === HAZARD_NONE) || offs[offs.length - 1];
        g.player.x = pick[0];
        g.player.y = pick[1];
      },
    }))},
    { title: 'Meta', actions: [
      { label: '+100 Umbra Shards', requires: 'any', fn: () => {
          meta.essence += 100; saveMeta(); refreshMetaUI(); updateMetaStarts();
      }},
      { label: '+1000 Umbra Shards', requires: 'any', fn: () => {
          meta.essence += 1000; saveMeta(); refreshMetaUI(); updateMetaStarts();
      }},
      { label: 'Unlock All Weapons', requires: 'any', fn: () => {
          META_START_WEAPONS.forEach(w => { if (meta.weapons.indexOf(w.id) === -1) meta.weapons.push(w.id); });
          chestWeapons().forEach(cw => { if (meta.weapons.indexOf(cw.weapon) === -1) meta.weapons.push(cw.weapon); });
          saveMeta(); refreshMetaUI(); updateMetaStarts();
      }},
      { label: 'Unlock All Characters', requires: 'any', fn: () => {
          META_CHARS.forEach(c => {
            if (meta.characters.indexOf(c.id) === -1) {
              meta.characters.push(c.id);
              if (!meta.charStarts[c.id]) meta.charStarts[c.id] = c.startWeapon;
            }
          });
          meta.charStarts[meta.selectedChar] = meta.charStarts[meta.selectedChar] || metaChar(meta.selectedChar).startWeapon;
          saveMeta(); refreshMetaUI(); updateMetaStarts();
      }},
      { label: 'Reset All Stats', requires: 'any', fn: () => {
          if (!confirm('Reset ALL progress?\nThis wipes unlocks, Umbra Shards and the best-runs leaderboard.')) return;
          try { localStorage.removeItem(META_KEY); } catch (e) {}
          try { localStorage.removeItem(BEST_RUNS_KEY); } catch (e) {}
          loadMeta(); refreshMetaUI(); updateMetaStarts(); renderBestRuns();
      }},
    ]},
  ];

  // --- Build DOM ---
  const sliders = [];       // { el, path, valEl }
  const checkboxes = [];    // { el, path }

  for (const sec of SECTIONS) {
    const title = document.createElement('div');
    title.className = 'dev-section';
    title.textContent = sec.title;
    fieldsBox.appendChild(title);

    for (const f of sec.fields) {
      const row = document.createElement('div');
      row.className = 'dev-row';

      const lbl = document.createElement('label');
      lbl.textContent = f.label;
      row.appendChild(lbl);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = f.min;
      slider.max = f.max;
      slider.step = f.step;
      slider.style.flex = '1';
      row.appendChild(slider);

      const val = document.createElement('span');
      val.className = 'dev-val';
      val.style.width = '42px';
      row.appendChild(val);

      if (f.note) {
        const note = document.createElement('span');
        note.style.cssText = 'font-size:10px;color:#666';
        note.textContent = f.note;
        row.appendChild(note);
      }

      fieldsBox.appendChild(row);

      const entry = { el: slider, path: f.path, valEl: val, min: f.min };
      sliders.push(entry);

      slider.addEventListener('input', () => {
        if (!game) return;
        const v = parseFloat(slider.value);
        setByPath(game, f.path, v);
        val.textContent = f.path === 'dev.difficultyOverride' && v === 0 ? 'auto' : v;
      });
    }
  }

  for (const cb of CHECKBOXES) {
    const row = document.createElement('div');
    row.className = 'dev-row dev-check';
    const lbl = document.createElement('label');
    const inp = document.createElement('input');
    inp.type = 'checkbox';
    lbl.appendChild(inp);
    lbl.appendChild(document.createTextNode(' ' + cb.label));
    row.appendChild(lbl);
    fieldsBox.appendChild(row);
    checkboxes.push({ el: inp, path: cb.path });
    inp.addEventListener('change', () => {
      if (!game) return;
      setByPath(game, cb.path, inp.checked);
    });
  }

  for (const group of ACTION_GROUPS) {
    const header = document.createElement('div');
    header.className = 'dev-section';
    header.textContent = group.title;
    actionsBox.appendChild(header);
    for (const act of group.actions) {
      const btn = document.createElement('button');
      btn.textContent = act.label;
      btn.addEventListener('click', () => {
        if (act.requires !== 'any' && !game) return;
        act.fn(game);
        syncAll();
      });
      actionsBox.appendChild(btn);
    }
  }

  // --- Sync current values into the UI ---
  function syncAll() {
    if (!game) {
      sliders.forEach(s => { s.el.disabled = true; s.valEl.textContent = '--'; });
      checkboxes.forEach(c => { c.el.disabled = true; c.el.checked = false; });
      return;
    }
    for (const s of sliders) {
      s.el.disabled = false;
      const v = getByPath(game, s.path);
      if (v != null) {
        s.el.value = v;
        s.valEl.textContent = s.path === 'dev.difficultyOverride' && v === 0 ? 'auto' : v;
      }
    }
    for (const c of checkboxes) {
      c.el.disabled = false;
      c.el.checked = !!getByPath(game, c.path);
    }
  }

  function resetFields() {
    if (!game) return;
    game.dev.timeScale = 1;
    game.dev.enemyHpMult = 1;
    game.dev.enemySpeedMult = 1;
    game.dev.enemyDmgMult = 1;
    game.dev.xpMult = 1;
    game.dev.godMode = false;
    game.dev.enemyCap = 800;
    game.dev.difficultyOverride = 0;
    game.dev.waveIntervalMult = 1;
    game.dev.eliteIntervalMult = 1;
    game.dev.bossIntervalMult = 1;
    syncAll();
  }

  // --- Toggle panel ---
  function open()  { syncAll(); panel.classList.add('open'); }
  function close() { panel.classList.remove('open'); }
  function toggle() { panel.classList.contains('open') ? close() : open(); }

  devBtn.addEventListener('click', toggle);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.code === 'F2') { toggle(); e.preventDefault(); }
  });

  // Re-sync every second while open (game values change behind our back)
  setInterval(() => { if (panel.classList.contains('open') && game) syncAll(); }, 1000);
})();