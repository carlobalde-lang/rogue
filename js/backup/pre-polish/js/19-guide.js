// ============================================================
// GUIDE SCREEN
// Lists everything the game explains: how to play, weapons,
// passives, synergy recipes, enemies & bosses and biomes.
// ============================================================
(function () {
  const GUIDE_TABS = [
    { id: 'overview', label: '📖 OVERVIEW' },
    { id: 'weapons',  label: '🗡️ WEAPONS' },
    { id: 'passives', label: '✨ PASSIVES' },
    { id: 'recipes',  label: '🧪 RECIPES' },
    { id: 'enemies',  label: '👹 ENEMIES & BOSSES' },
    { id: 'biomes',   label: '🌍 BIOMES' },
  ];
  const CAT_LABEL = { normal: 'BASIC', elite: 'ELITE', warden: 'WARDEN', boss: 'BOSS' };
  const CAT_COLOR = { normal: '#9aa0b6', elite: '#ff8c1a', warden: '#ffb347', boss: '#e14dff' };

  const ENEMY_BLURBS = {
    normal: 'The classic shadow grunt — a fast, simple chaser.',
    swarmling: 'Tiny and weak, but they come in floods.',
    runner: 'Darts toward you faster than most weapons can track.',
    brute: 'Slow, thick-skinned and hits hard.',
    shielded: 'Backed by a shield, so burst through it.',
    splitter: 'Splits into two half-HP Shadowlings when killed.',
    caster: 'Keeps its distance and lobs projectiles.',
    leecher: 'Steals health back from the damage it survives.',
    frostling: 'A snowy scout of the Frozen Grass.',
    pinewraith: 'Quick wraith of the Taiga that rushes between the trees.',
    dunerunner: 'Fast skitterer native to the Savanna.',
    canyongolem: 'Slow, heavy stone brute of the Canyon.',
    scorcher: 'Scorched caster of the Desert that spits fire.',
    riverwisp: 'Healing mist of the Prairie.',
    dryadseer: 'Nature caster of the Forest that fires bolts.',
    boghaunt: 'Rotting haunt of the Swamp that clings to life.',
    elite: 'A champion-grade threat with a thick HP pool.',
    warden: 'A mid-tier mini-boss that drops Umbra Shards.',
    boss: 'A full boss that warps the whole battle around it.',
  };

  let guideTab = 'overview';

  // --- Card helpers ---
  function fmtStats(def) {
    const parts = [];
    if (def.baseDmg) parts.push(def.baseDmg + ' DMG');
    if (def.baseCount > 1) parts.push('x' + def.baseCount);
    if (def.baseArea > 0) parts.push(def.baseArea + ' area');
    if (def.baseRate > 0) parts.push((def.baseRate / 1000).toFixed(1) + 's');
    return parts.join(' · ');
  }

  function enemyStatsLine(def) {
    const dm = 20;
    const hp = def.hp ? Math.round(def.hp(dm)) : 0;
    const dmg = def.damage ? Math.round(def.damage(dm)) : 0;
    const spd = def.speed ? Math.round(def.speed(dm)) : 0;
    const xp = typeof def.xp === 'function' ? def.xp(dm) : def.xp;
    return 'HP ≈' + hp + ' · DMG ≈' + dmg + ' · SPD ≈' + spd + ' · XP ' + xp;
  }

  // --- Tab renderers ---
  function renderOverview(el) {
    const howto = [
      'Move with <b>WASD</b> or the <b>arrow keys</b> (or drag on mobile).',
      'Your weapons fire <b>automatically</b> — focus on dodging and positioning.',
      'Killed enemies drop <b>XP gems</b>. Level up to pick a new weapon, passive or upgrade.',
      'Carry a paired <b>weapon + passive</b> to unlock a <b>Recipe</b>: a one-time synergy bonus.',
      '<b>Elites, Wardens and Bosses</b> drop <b>💠 Umbra Shards</b> — the HUB currency.',
      'Each <b>biome</b> hides a sealed heart. Slay its Guardian to open the treasure chest (a unique weapon) and unlock the <b>Warp</b> network.',
      'Extreme biomes brew <b>storms</b> (FREEZE / SANDSTORM) that turn up the pressure.',
      'Dying banks what you earned into the HUB. <b>Every run builds a stronger survivor.</b>',
    ];
    const rarityLegend = Object.keys(RARITY_DEFS).map(k => {
      const rd = RARITY_DEFS[k];
      return '<span style="margin-right:14px;color:' + rd.color + ';font-weight:bold;text-shadow:0 0 6px ' + rd.color + '">■ ' + escapeHtml(rd.name) + '</span>';
    }).join('');
    const isUnlocked = (typeof metaCharacterUnlocked === 'function' && typeof meta !== 'undefined' && meta) ? metaCharacterUnlocked : () => true;
    const charCards = META_CHARS.map(c => {
      const sw = WEAPON_DEFS[c.startWeapon];
      return '<div class="hub-card">' +
        '<div class="gd-icon">' + pixelIconHTML('c', c.id, 34) + '</div>' +
        '<div class="gd-name">' + escapeHtml(c.name) + '</div>' +
        '<div class="gd-note">' + escapeHtml(c.desc) + '</div>' +
        '<div class="gd-stat">Sig. weapon: ' + (sw ? escapeHtml(sw.name) : '—') +
          (isUnlocked(c.id) ? '' : ' · Unlock ' + c.cost + '💠') + '</div>' +
      '</div>';
    }).join('');
    const diffCards = DIFFICULTIES.map(d =>
      '<div class="hub-card">' +
        '<div class="gd-icon"><span class="gd-swatch" style="background:hsl(' + (d.scale * 140).toFixed(0) + ',70%,50%)"></span></div>' +
        '<div class="gd-name">' + escapeHtml(d.name) + '</div>' +
        '<div class="gd-note">' + escapeHtml(d.desc) + '</div>' +
        '<div class="gd-stat">Scale ×' + d.scale.toFixed(2) + '</div>' +
      '</div>'
    ).join('');
    el.innerHTML =
      '<div class="hub-card full">' +
        '<div class="gd-name">How to play</div>' +
        '<ul class="gd-howto">' + howto.map(h => '<li>' + h + '</li>').join('') + '</ul>' +
        '<div style="color:#aaa;font-size:12px;margin-top:8px;letter-spacing:1px">RARITIES: ' + rarityLegend + '</div>' +
      '</div>' +
      '<div class="wpn-divider" style="width:100%">CHARACTERS</div>' + charCards +
      '<div class="wpn-divider" style="width:100%">DIFFICULTIES</div>' + diffCards;
  }

  function renderWeapons(el) {
    const chests = (typeof chestWeapons === 'function') ? chestWeapons() : [];
    const cards = Object.keys(WEAPON_DEFS).map(id => {
      const def = WEAPON_DEFS[id];
      const hit = chests.find(c => c.weapon === id);
      const origin = hit ? hit.biomeName : null;
      return '<div class="hub-card' + (origin ? ' wide' : '') + '">' +
        '<div class="gd-icon">' + pixelIconHTML('w', id, 36) + '</div>' +
        '<div class="gd-name">' + escapeHtml(def.name) + '</div>' +
        '<div class="gd-note">' + escapeHtml(def.desc) + '</div>' +
        '<div class="gd-stat">' + fmtStats(def) + '</div>' +
        (origin ? '<div class="gd-note" style="color:#ffd24d">💎 Treasure of ' + escapeHtml(origin) + '</div>' : '') +
      '</div>';
    }).join('');
    el.innerHTML = '<div class="wpn-divider" style="width:100%">ALL WEAPONS</div>' + cards;
  }

  function renderPassives(el) {
    const cards = Object.keys(PASSIVE_DEFS).map(id => {
      const def = PASSIVE_DEFS[id];
      return '<div class="hub-card">' +
        '<div class="gd-icon">' + pixelIconHTML('p', id, 36) + '</div>' +
        '<div class="gd-name">' + escapeHtml(def.name) + '</div>' +
        '<div class="gd-note">' + escapeHtml(def.desc) + '</div>' +
        (def.max ? '<div class="gd-note" style="color:#ffd24d">⚠ Up to ' + def.max + ' copies</div>' : '') +
        (def.weight && def.weight < 1 ? '<div class="gd-note" style="color:#43a6f5">★ Rarer roll (low drop odds)</div>' : '') +
      '</div>';
    }).join('');
    el.innerHTML = '<div class="wpn-divider" style="width:100%">ALL PASSIVES</div>' + cards;
  }

  function renderRecipes(el) {
    const cards = RECIPES.map(r => {
      const wd = WEAPON_DEFS[r.weapon];
      const pd = PASSIVE_DEFS[r.passive];
      return '<div class="hub-card wide">' +
        '<div class="gd-icon">' + pixelIconHTML('w', r.weapon, 28) + ' <span class="plus">+</span> ' + pixelIconHTML('p', r.passive, 28) + '</div>' +
        '<div class="gd-name">' + escapeHtml(r.name) + '</div>' +
        '<div class="gd-recipe">' +
          (wd ? escapeHtml(wd.icon) + ' ' + escapeHtml(wd.name) : escapeHtml(r.weapon)) +
          ' <span class="eq">⇢</span> ' +
          (pd ? escapeHtml(pd.icon) + ' ' + escapeHtml(pd.name) : escapeHtml(r.passive)) +
        '</div>' +
        '<div class="gd-note">Bonus: <b style="color:#ffe9a8">' + escapeHtml(r.desc) + '</b></div>' +
        '<div class="gd-note" style="color:#8a8aa0;margin-top:6px">Triggered once per run the moment you own both items.</div>' +
      '</div>';
    }).join('');
    el.innerHTML = '<div class="wpn-divider" style="width:100%">SYNERGY RECIPES</div>' + cards;
  }

  function renderEnemies(el) {
    const cards = [
      '<div class="hub-card wide">' +
        '<div class="gd-icon"><span class="gd-swatch" style="background:#c9a34d"></span></div>' +
        '<div class="gd-name">Guardian of the Heart</div>' +
        '<div class="gd-tag" style="background:#8a6d1a">BIOME BOSS</div>' +
        '<div class="gd-note">Sleeps at every biome heart. Stand on a heart to wake it after 30 seconds, then slay it to open the sealed treasure chest (a biome weapon) and activate the Warp portal back to the hub.</div>' +
      '</div>'
    ];
    for (const id of Object.keys(ENEMY_DEFS)) {
      const def = ENEMY_DEFS[id];
      const specials = [];
      if (def.fireRate) specials.push('Shoots ranged projectiles');
      if (def.shield) specials.push('Carries a shield');
      if (def.onDeath) specials.push('Splits into two on death');
      if (def.onHit) specials.push('Heals from damage it survives');
      const note = [ENEMY_BLURBS[id], specials.join(' • ')].filter(Boolean).join(' ');
      cards.push(
        '<div class="hub-card">' +
          '<div class="gd-icon"><span class="gd-swatch" style="background:' + def.body + '"></span></div>' +
          '<div class="gd-name">' + escapeHtml(def.name) + '</div>' +
          '<div class="gd-tag" style="background:' + (CAT_COLOR[def.category] || '#9aa0b6') + '">' + (CAT_LABEL[def.category] || 'BASIC') + '</div>' +
          (note ? '<div class="gd-note">' + escapeHtml(note) + '</div>' : '') +
          '<div class="gd-stat">' + enemyStatsLine(def) + '</div>' +
        '</div>'
      );
    }
    el.innerHTML = '<div class="wpn-divider" style="width:100%">EVERYTHING THAT HUNTS YOU</div>' + cards.join('');
  }

  function renderBiomes(el) {
    const cards = [];
    const add = (id, def) => {
      const enemy = def.enemy ? (ENEMY_DEFS[def.enemy] || null) : null;
      const weapon = def.weapon ? (WEAPON_DEFS[def.weapon] || null) : null;
      const storm = (typeof STORM_DEFS !== 'undefined') && STORM_DEFS[id] ? STORM_DEFS[id].name : null;
      let inner = '<div class="gd-note">' +
        (enemy ? 'Enemies: <b>' + escapeHtml(enemy.name) + '</b>' : 'Safe starting ruins — your spawn point') +
        '</div>';
      if (weapon) inner += '<div class="gd-note">Treasure: ' + pixelIconHTML('w', def.weapon, 20) + ' <b>' + escapeHtml(weapon.name) + '</b></div>';
      if (def.enemy) inner += '<div class="gd-note" style="color:#8a8aa0">A Guardian sleeps at the heart here. Slay it to open the sealed chest and unlock Warp.</div>';
      if (storm) inner += '<div class="gd-note" style="color:#9fd7ff">Weather: <b>' + escapeHtml(storm) + '</b> after the first calm stretch.</div>';
      cards.push(
        '<div class="hub-card">' +
          '<div class="gd-icon"><span class="gd-swatch" style="background:' + def.color + '"></span></div>' +
          '<div class="gd-name">' + escapeHtml(def.name) + '</div>' +
          inner +
        '</div>'
      );
    };
    add('core', BIOME_DEFS.core);
    for (const id of BIOME_IDS) add(id, BIOME_DEFS[id]);
    el.innerHTML = '<div class="wpn-divider" style="width:100%">THE SHADOWLANDS</div>' + cards.join('');
  }

  // --- Screen plumbing ---
  function renderGuideTabs() {
    const tabs = document.getElementById('guide-tabs');
    if (!tabs) return;
    tabs.innerHTML = GUIDE_TABS.map(t =>
      '<button class="hub-tab' + (t.id === guideTab ? ' active' : '') + '" data-tab="' + t.id + '">' + t.label + '</button>'
    ).join('');
  }

  function renderGuideView() {
    const el = document.getElementById('guide-view');
    if (!el) return;
    if (guideTab === 'weapons') renderWeapons(el);
    else if (guideTab === 'passives') renderPassives(el);
    else if (guideTab === 'recipes') renderRecipes(el);
    else if (guideTab === 'enemies') renderEnemies(el);
    else if (guideTab === 'biomes') renderBiomes(el);
    else renderOverview(el);
  }

  function openGuide(tab) {
    guideTab = tab || 'overview';
    renderGuideTabs();
    renderGuideView();
    const scr = document.getElementById('guide-screen');
    if (scr) scr.style.display = 'flex';
  }

  function closeGuide() {
    const scr = document.getElementById('guide-screen');
    if (scr) scr.style.display = 'none';
    // Coming back from the hub keeps the hub open; otherwise show the menu.
    const hub = document.getElementById('hub-screen');
    if (!hub || hub.style.display !== 'flex') {
      const ss = document.getElementById('start-screen');
      if (ss) ss.style.display = 'flex';
    }
  }

  // --- Wiring ---
  function initGuide() {
    const gb = document.getElementById('guide-btn');
    if (gb) gb.addEventListener('click', () => openGuide('overview'));
    const hb = document.getElementById('hub-guide');
    if (hb) hb.addEventListener('click', () => openGuide('overview'));
    const gc = document.getElementById('guide-close');
    if (gc) gc.addEventListener('click', closeGuide);
    const tabs = document.getElementById('guide-tabs');
    if (tabs) {
      tabs.addEventListener('click', e => {
        const b = e.target.closest('.hub-tab');
        if (!b) return;
        guideTab = b.dataset.tab;
        renderGuideTabs();
        renderGuideView();
      });
    }
    document.addEventListener('keydown', e => {
      const scr = document.getElementById('guide-screen');
      if (scr && scr.style.display === 'flex' && (e.code === 'Escape')) {
        closeGuide();
        e.preventDefault();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initGuide);
  if (document.readyState === 'complete' || document.readyState === 'interactive') initGuide();

  window.openGuide = openGuide;
  window.closeGuide = closeGuide;
})();