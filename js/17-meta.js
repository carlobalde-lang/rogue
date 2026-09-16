// ============================================================
// META PROGRESSION: THE HUB
// Permanent upgrades, unlockable characters and starting weapons
// bought with Umbra Shards earned from runs (stored in localStorage).
// ============================================================
const META_KEY = 'shadow.meta.v2';

// --- Unlockable characters — new characters go here ---
// mods: speed/dmg are multipliers, maxHp/armor are flat adds.
const META_CHARS = [
  {
    id: 'aeloria', name: 'Aeloria', icon: '🔮',
    desc: 'Arcane apprentice. A balanced all-rounder.',
    startWeapon: 'magicBolt',
    mods: {},
    palette: { d1: '#17255c', d2: '#20357d', m: '#315dcc', l: '#4e82ed' }
  },
  {
    id: 'rael', name: 'Rael', icon: '🔥',
    desc: 'Pyromancer. Hits harder, has less health.',
    startWeapon: 'fireBlast', cost: 120,
    mods: { maxHp: -10, dmgMult: 1.10 },
    palette: { d1: '#4a1020', d2: '#7d2035', m: '#cc3144', l: '#ed5a6b' }
  },
  {
    id: 'briga', name: 'Briga', icon: '🛡️',
    desc: 'Sentinel. Tanky and armored, slightly slow.',
    startWeapon: 'holyShield', cost: 140,
    mods: { maxHp: 20, armor: 2, speed: 0.88 },
    palette: { d1: '#2a3a4a', d2: '#304355', m: '#55758f', l: '#7ca7c9' }
  },
  {
    id: 'nyx', name: 'Nyx', icon: '🗡️',
    desc: 'Shadowblade. Fast and deadly, a frail glass cannon.',
    startWeapon: 'chainSaw', cost: 160,
    mods: { maxHp: -15, speed: 1.15, dmgMult: 1.05 },
    palette: { d1: '#2a1a4a', d2: '#3d2057', m: '#7d31cc', l: '#a25aed' }
  }
];

// --- Permanent upgrades — new upgrades go here ---
const META_UPGRADES = [
  { id: 'vitality', name: 'Vitality', icon: '❤️', max: 5, base: 40, growth: 1.6,
    desc: l => `+10 Max HP per level (currently +${10 * l})`,
    apply: p => { p.maxHp += 10; } },
  { id: 'swiftness', name: 'Swiftness', icon: '👟', max: 5, base: 50, growth: 1.6,
    desc: l => `+5% move speed per level (currently +${Math.round((Math.pow(1.05, l) - 1) * 100)}%)`,
    apply: p => { p.speed *= 1.05; } },
  { id: 'might', name: 'Might', icon: '⚔️', max: 5, base: 60, growth: 1.6,
    desc: l => `+6% damage per level (currently +${Math.round((Math.pow(1.06, l) - 1) * 100)}%)`,
    apply: p => { p.dmgMult *= 1.06; } },
  { id: 'regen', name: 'Regen', icon: '💚', max: 5, base: 45, growth: 1.6,
    desc: l => `+0.15 HP/s per level (currently +${(0.15 * l).toFixed(2)})`,
    apply: p => { p.regen += 0.15; } },
  { id: 'magnet', name: 'Magnetism', icon: '🧲', max: 4, base: 40, growth: 1.6,
    desc: l => `+12% pickup range per level`,
    apply: p => { p.pickupRange *= 1.12; } },
  { id: 'armor', name: 'Iron Skin', icon: '🪖', max: 4, base: 80, growth: 1.7,
    desc: l => `+1 Armor per level`,
    apply: p => { p.armor += 1; } },
  { id: 'haste', name: 'Haste', icon: '⏱️', max: 4, base: 70, growth: 1.6,
    desc: l => `-4% cooldowns per level`,
    apply: p => { p.cdMult *= 0.96; } },
  { id: 'greed', name: 'Greed', icon: '💰', max: 3, base: 100, growth: 1.7,
    desc: l => `+25% Umbra Shards banked each run (currently +${25 * l}%)`,
    apply: p => {} },
  { id: 'bloodpact', name: 'Blood Pact', icon: '🩹', max: 5, base: 55, growth: 1.6,
    desc: l => `Start runs with +5% lifesteal per level (currently +${5 * l}%)`,
    apply: p => { p.vamp = (p.vamp || 0) + 0.05; } },
  { id: 'fortune', name: 'Fortune', icon: '🍀', max: 4, base: 65, growth: 1.6,
    desc: l => `Start runs with +8% Luck per level (extra gems, better drops; currently +${Math.round(0.08 * l * 100)}%)`,
    apply: p => { p.luck = (p.luck || 0) + 0.08; } },
  { id: 'twin', name: 'Twin Munitions', icon: '🔀', max: 3, base: 70, growth: 1.65,
    desc: l => `Start runs with +10% duplicate-chance per level (currently +${10 * l}%)`,
    apply: p => { p.duplicate = (p.duplicate || 0) + 0.10; } },
  { id: 'aegis', name: 'Aegis', icon: '💠', max: 2, base: 90, growth: 1.7,
    desc: l => `Start runs with 1 revive per level (currently ${l})`,
    apply: p => { p.revives = (p.revives || 0) + 1; } },
  { id: 'ledger', name: "Banker's Ledger", icon: '📒', max: 5, base: 60, growth: 1.6,
    desc: l => `+25% Umbra Shards from elite/warden drops per level (currently +${Math.round((Math.pow(1.25, l) - 1) * 100)}%)`,
    apply: p => { p.essenceMult = (p.essenceMult || 1) * 1.25; } }
];

// Weapons that can be chosen as your starting weapon in the hub.
// 'magicBolt' is the free default; the rest must be unlocked.
// NOTE: the 8 biome weapons (frostNova, mirrorShard, boomerang, turret,
// voidRift, bloodScythe, whipChain, poisonCloud) are NOT listed here — they
// are only earned by opening the chest at the heart of their biome.
const META_START_WEAPONS = [
  { id: 'magicBolt', cost: 0 },
  { id: 'holyShield', cost: 110 },
  { id: 'fireBlast', cost: 110 },
  { id: 'lightning', cost: 130 },
  { id: 'chainSaw', cost: 150 },
  { id: 'holyCross', cost: 90 },
  { id: 'familiar', cost: 150 }
];

// --- Difficulty presets — "normal" is the reference balance ---
// scale multiplies the whole difficulty curve (time ramp + level term):
// hordes, elite/warden/boss timers and enemy stats all shift with it.
const DIFFICULTIES = [
  { id: 'easy',      name: 'FACILE',     label: 'Facile',    scale: 0.55, desc: 'Fog is thinner: fewer and softer enemies, slower timers. Best for learning builds.' },
  { id: 'normal',    name: 'NORMALE',    label: 'Normale',   scale: 0.80, desc: 'The reference balance: the standard pace and threat curve.' },
  { id: 'hard',      name: 'DIFFICILE',  label: 'Difficile', scale: 1.10, desc: 'Thicker hordes, beefier elites, wardens and bosses arrive sooner.' },
  { id: 'nightmare', name: 'INCUBO',     label: 'Incubo',    scale: 1.50, desc: 'Maximum pressure from minute one. For upgraded builds only.' }
];

function difficultyDef() {
  return DIFFICULTIES.find(d => d.id === (meta && meta.difficulty)) || DIFFICULTIES[1];
}
function difficultyScale() { return difficultyDef().scale; }
function difficultyLabel() { return difficultyDef().label; }

// --- Wallet state (do not touch directly, use the helpers) ---
let meta = null;

function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      meta = JSON.parse(raw);
      meta.essence = isFinite(meta.essence) ? Math.max(0, Math.floor(meta.essence)) : 0;
      // Clamp upgrade levels to the current definitions so a rebalance never
      // leaves an over-leveled (or negative) stack in a save file.
      const rawUpg = meta.upgrades || {};
      const clean = {};
      for (const def of META_UPGRADES) {
        const v = rawUpg[def.id];
        if (typeof v === 'number' && isFinite(v) && v > 0) clean[def.id] = Math.min(def.max, Math.floor(v));
      }
      meta.upgrades = clean;
      meta.characters = Array.isArray(meta.characters) ? meta.characters : ['aeloria'];
      meta.weapons = Array.isArray(meta.weapons) ? meta.weapons : ['magicBolt'];
// Migration: characters unlocked before the "signature weapon bonus" was
      // added should retroactively unlock their default weapon in the choice.
      for (const c of META_CHARS) {
        if (meta.characters.indexOf(c.id) !== -1 &&
            META_START_WEAPONS.some(w => w.id === c.startWeapon) &&
            meta.weapons.indexOf(c.startWeapon) === -1) {
          meta.weapons.push(c.startWeapon);
        }
      }
      // Per-character starting weapon memory: each unlocked character keeps its
      // own equipped weapon. Missing/invalid entries fall back to the
      // character's signature weapon.
      if (!meta.charStarts || typeof meta.charStarts !== 'object') meta.charStarts = {};
      for (const c of META_CHARS) {
        const cur = meta.charStarts[c.id];
        if (meta.characters.indexOf(c.id) === -1) continue;
        if (!cur || !WEAPON_DEFS[cur] || !metaWeaponUnlocked(cur)) {
          if (META_START_WEAPONS.some(w => w.id === c.startWeapon) && metaWeaponUnlocked(c.startWeapon)) {
            meta.charStarts[c.id] = c.startWeapon;
          }
        }
      }
      const validW = new Set(Object.keys(WEAPON_DEFS));
      const validP = new Set(Object.keys(PASSIVE_DEFS));
      meta.bannedWeapons = Array.isArray(meta.bannedWeapons) ? meta.bannedWeapons.filter(id => validW.has(id)) : [];
      meta.bannedPassives = Array.isArray(meta.bannedPassives) ? meta.bannedPassives.filter(id => validP.has(id)) : [];
      meta.selectedChar = META_CHARS.some(c => c.id === meta.selectedChar) ? meta.selectedChar : 'aeloria';
      meta.startWeapon = META_START_WEAPONS.some(w => w.id === meta.startWeapon) ? meta.startWeapon : 'magicBolt';
      meta.difficulty = DIFFICULTIES.some(d => d.id === meta.difficulty) ? meta.difficulty : 'normal';
      return;
    }
  } catch (e) {}
  meta = {
    essence: 0,                // upgrades are funded purely by elite/warden/boss drops
    upgrades: {},
    characters: ['aeloria'],
    weapons: ['magicBolt'],
    charStarts: { aeloria: 'magicBolt' },
    bannedWeapons: [],
    bannedPassives: [],
    selectedChar: 'aeloria',
    startWeapon: 'magicBolt',
    difficulty: 'normal',
    hearts: []                 // biome ids whose heart guardians were slain (persisted warp network)
  };
  saveMeta();
}

function saveMeta() {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {}
}

function metaChar(id) { return META_CHARS.find(c => c.id === id); }
function metaUpgrade(id) { return META_UPGRADES.find(u => u.id === id); }
function metaEsc(t) { return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function metaCost(def, lvl) { return Math.round(def.base * Math.pow(def.growth, lvl)); }

function metaCharacterUnlocked(id) { return meta.characters.indexOf(id) !== -1; }
function metaWeaponUnlocked(id) { return meta.weapons.indexOf(id) !== -1; }
function metaUpgradeLevel(id) { return meta.upgrades[id] || 0; }
function metaHeartCleared(id) { return Array.isArray(meta.hearts) && meta.hearts.indexOf(id) !== -1; }
function markHeartCleared(id) {
  if (!Array.isArray(meta.hearts)) meta.hearts = [];
  if (meta.hearts.indexOf(id) === -1) { meta.hearts.push(id); saveMeta(); }
}

// --- Ban list: items excluded from level-up choices for the next run ---
// Persistent in meta so a "one weapon only" setup sticks across sessions,
// but trivially removable from the hub.
function metaBannedWeapons() { return Array.isArray(meta && meta.bannedWeapons) ? meta.bannedWeapons : []; }
function metaBannedPassives() { return Array.isArray(meta && meta.bannedPassives) ? meta.bannedPassives : []; }
function weaponBanned(id) { return metaBannedWeapons().indexOf(id) !== -1; }
function passiveBanned(id) { return metaBannedPassives().indexOf(id) !== -1; }

// Weapons that can never be banned: only the start weapon currently equipped
// for the run. A character's signature weapon is a regular level-up choice,
// so it keeps being bannable like every other weapon in the pool.
function protectedWeaponIds() {
  return new Set([getStartWeapon()]);
}

function toggleWeaponBan(id) {
  if (!meta || !WEAPON_DEFS[id]) return;
  if (protectedWeaponIds().has(id) || !metaWeaponUnlocked(id)) { Sound.play('hit'); return; }
  const arr = metaBannedWeapons();
  const i = arr.indexOf(id);
  if (i !== -1) arr.splice(i, 1); else arr.push(id);
  saveMeta();
  Sound.play('select');
  refreshMetaUI();
}

function togglePassiveBan(id) {
  if (!meta || !PASSIVE_DEFS[id]) return;
  const arr = metaBannedPassives();
  const i = arr.indexOf(id);
  if (i !== -1) arr.splice(i, 1); else arr.push(id);
  saveMeta();
  Sound.play('select');
  refreshMetaUI();
}

function clearBans() {
  if (!meta) return;
  meta.bannedWeapons = [];
  meta.bannedPassives = [];
  saveMeta();
  Sound.play('select');
  refreshMetaUI();
}

function getStartWeapon() {
  if (!meta) return 'magicBolt';
  // The run weapon is the currently selected character's own chosen weapon.
  const w = meta.charStarts && meta.charStarts[meta.selectedChar];
  if (w && metaWeaponUnlocked(w) && WEAPON_DEFS[w]) return w;
  const sig = metaChar(meta.selectedChar);
  return (sig && sig.startWeapon) || meta.startWeapon || 'magicBolt';
}

// --- Buying / selecting ---
function buyMetaUpgrade(id) {
  const def = metaUpgrade(id);
  const lvl = metaUpgradeLevel(id);
  if (!def || lvl >= def.max) return;
  const cost = metaCost(def, lvl);
  if (meta.essence < cost) { Sound.play('hit'); return; }
  meta.essence -= cost;
  meta.upgrades[id] = lvl + 1;
  saveMeta();
  Sound.play('gem');
  refreshMetaUI();
}

function unlockMetaCharacter(id) {
  const c = metaChar(id);
  if (!c || metaCharacterUnlocked(id)) return;
  if (meta.essence < c.cost) { Sound.play('hit'); return; }
  meta.essence -= c.cost;
  meta.characters.push(id);
  meta.selectedChar = id;
  // Unlocking a character also unlocks its signature weapon in the WEAPON
  // CHOICE list, so its default loadout is never paywalled twice.
  if (META_START_WEAPONS.some(w => w.id === c.startWeapon)) {
    if (!metaWeaponUnlocked(c.startWeapon)) meta.weapons.push(c.startWeapon);
    // ...and the character's default weapon becomes its remembered start.
    meta.charStarts[id] = c.startWeapon;
  }
  saveMeta();
  Sound.play('levelup');
  refreshMetaUI();
}

function selectMetaCharacter(id) {
  if (!metaCharacterUnlocked(id)) return;
  meta.selectedChar = id;
  saveMeta();
  Sound.play('select');
  refreshMetaUI();
}

function unlockStartWeapon(id) {
  const w = META_START_WEAPONS.find(x => x.id === id);
  if (!w || metaWeaponUnlocked(id)) return;
  if (w.cost > 0 && meta.essence < w.cost) { Sound.play('hit'); return; }
  meta.essence -= w.cost;
  meta.weapons.push(id);
  // Equipping is per-character: only the currently selected character changes.
  meta.charStarts[meta.selectedChar] = id;
  saveMeta();
  Sound.play('levelup');
  refreshMetaUI();
}

function selectStartWeapon(id) {
  if (!metaWeaponUnlocked(id)) return;
  // Equipping is per-character: only the currently selected character changes.
  meta.charStarts[meta.selectedChar] = id;
  saveMeta();
  Sound.play('select');
  refreshMetaUI();
}

// --- Run integration ---
// Called from startGame() AFTER createGameState().
function applyMetaToRun(p) {
  if (!meta) return;
  const c = metaChar(meta.selectedChar) || META_CHARS[0];
  p.charId = c.id;
  if (c.mods.speed) p.speed *= c.mods.speed;
  if (c.mods.dmgMult) p.dmgMult *= c.mods.dmgMult;
  if (c.mods.maxHp) p.maxHp += c.mods.maxHp;
  if (c.mods.armor) p.armor += c.mods.armor;
  p.palette = c.palette;

  for (const def of META_UPGRADES) {
    const lvl = metaUpgradeLevel(def.id);
    for (let n = 0; n < lvl; n++) def.apply(p);
  }
  p.hp = p.maxHp;   // start every run at full health
}

// Called from endGame() to bank the Umbra Shards picked up during the run.
// The currency now only comes from elite/warden/boss drops, not from a
// score-based end-of-run grant.
function grantRunRewards() {
  if (!meta || !game) return 0;
  const greedLvl = metaUpgradeLevel('greed');
  const mult = 1 + greedLvl * 0.25;
  const banked = Math.floor((game.essenceCollected || 0) * mult);
  if (banked > 0) {
    meta.essence += banked;
    saveMeta();
  }
  return banked;
}

// --- Hub UI ---
let hubTab = 'char';

function openHub(tab) {
  hubTab = tab || 'char';
  document.querySelectorAll('.hub-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === hubTab));
  document.getElementById('hub-screen').style.display = 'flex';
  document.getElementById('hub-wallet').textContent = `💠 Umbra Shards: ${meta.essence}`;
  // Never stack the hub on top of a lingering game-over overlay.
  const go = document.getElementById('game-over-screen');
  if (go) go.style.display = 'none';
  updateMetaStarts();   // keep the start screen pill/summary fresh
  renderHubView();
}

function closeHub() {
  document.getElementById('hub-screen').style.display = 'none';
  // The hub can be reached from the start menu, the game-over screen and a
  // paused run, so closing it must always land back on the main menu —
  // never on a blank screen.
  const ss = document.getElementById('start-screen');
  if (ss) ss.style.display = 'flex';
  updateMetaStarts();
}

function refreshMetaUI() {
  document.getElementById('hub-wallet').textContent = `💠 Umbra Shards: ${meta.essence}`;
  renderHubView();
  updateMetaStarts();
}

function renderHubView() {
  const el = document.getElementById('hub-view');
  if (hubTab === 'char') renderHubChars();
  else if (hubTab === 'upg') renderHubUpgrades();
  else if (hubTab === 'ban') renderHubBans();
  else renderHubWeapons();
}

function renderHubChars() {
  const el = document.getElementById('hub-view');
  el.innerHTML = META_CHARS.map(c => {
    const unlocked = metaCharacterUnlocked(c.id);
    const selected = meta.selectedChar === c.id;
    const sigW = WEAPON_DEFS[c.startWeapon];
    const charStart = (meta.charStarts && meta.charStarts[c.id]) || c.startWeapon;
    const runW = WEAPON_DEFS[charStart];
    return `<div class="hub-card ${unlocked ? (selected ? 'selected' : '') : 'locked'}">
      <div class="hub-icon">${pixelIconHTML('c', c.id, 36)}</div>
      <div class="hub-name">${metaEsc(c.name)}</div>
      <div class="hub-desc">${metaEsc(c.desc)}<br><span class="hub-sig">Start weapon: ${metaEsc(sigW ? sigW.name : '—')}</span></div>
      <div class="hub-meta">Selected: ${pixelIconHTML('w', charStart, 20)} ${runW ? metaEsc(runW.name) : '—'}</div>
      <div class="hub-actions-inline">
        ${unlocked
          ? `<button class="hub-btn ${selected ? 'equipped' : 'owned'}" data-a="selectChar" data-id="${c.id}">${selected ? 'SELECTED' : 'SELECT'}</button>`
          : `<button class="hub-btn buy" data-a="unlockChar" data-id="${c.id}">💠 ${c.cost} — UNLOCK</button>`}
        <button class="hub-btn weps" data-a="openWpn">🎒 WEAPON CHOICE</button>
      </div>
    </div>`;
  }).join('');
}

function renderHubUpgrades() {
  const el = document.getElementById('hub-view');
  el.innerHTML = META_UPGRADES.map(u => {
    const lvl = metaUpgradeLevel(u.id);
    const maxed = lvl >= u.max;
    const cost = metaCost(u, lvl);
    return `<div class="hub-card ${maxed ? '' : 'locked'}">
      <div class="hub-icon">${pixelIconHTML('u', u.id, 36)}</div>
      <div class="hub-name">${metaEsc(u.name)}</div>
      <div class="hub-desc">${metaEsc(u.desc(lvl))}</div>
      <div class="hub-level">LVL ${lvl}/${u.max}</div>
      ${maxed
        ? `<button class="hub-btn maxed" disabled>MAXED</button>`
        : `<button class="hub-btn buy" data-a="buyUpg" data-id="${u.id}">💠 ${cost} — UPGRADE</button>`}
    </div>`;
  }).join('');
}

function renderHubWeapons() {
  const el = document.getElementById('hub-view');
  const shopCards = META_START_WEAPONS.map(w => {
    const def = WEAPON_DEFS[w.id];
    const unlocked = metaWeaponUnlocked(w.id);
    const equipped = getStartWeapon() === w.id;
    return `<div class="hub-card ${unlocked ? (equipped ? 'selected' : '') : 'locked'}">
      <div class="hub-icon">${pixelIconHTML('w', w.id, 36)}</div>
      <div class="hub-name">${metaEsc(def.name)}</div>
      <div class="hub-desc">${metaEsc(def.desc)}</div>
      <div class="hub-actions-inline">
        ${unlocked
          ? `<button class="hub-btn ${equipped ? 'equipped' : 'owned'}" data-a="selectWpn" data-id="${w.id}">${equipped ? 'EQUIPPED' : 'EQUIP'}</button>`
          : `<button class="hub-btn buy" data-a="unlockWpn" data-id="${w.id}">💠 ${w.cost} — UNLOCK</button>`}
      </div>
    </div>`;
  }).join('');
  // The 8 biome weapons: never purchasable. Sealed ones show where each is
  // hidden (the chest at the heart of its climate wedge); found ones can be
  // equipped like any other discovered weapon.
  const chestCards = chestWeapons().map(cw => {
    const def = WEAPON_DEFS[cw.weapon];
    const unlocked = metaWeaponUnlocked(cw.weapon);
    const equipped = getStartWeapon() === cw.weapon;
    return `<div class="hub-card ${unlocked ? (equipped ? 'selected' : '') : 'locked'}">
      <div class="hub-icon">${pixelIconHTML('w', cw.weapon, 36)}</div>
      <div class="hub-name">${metaEsc(def.name)}</div>
      <div class="hub-desc">${metaEsc(def.desc)}</div>
      ${unlocked
        ? `<div class="hub-meta">Found in ${metaEsc(cw.biomeName)}</div>
           <div class="hub-actions-inline">
             <button class="hub-btn ${equipped ? 'equipped' : 'owned'}" data-a="selectWpn" data-id="${cw.weapon}">${equipped ? 'EQUIPPED' : 'EQUIP'}</button>
           </div>`
        : `<div class="hub-meta" style="color:#ffd24d;">🔒 Sealed statue — ${metaEsc(cw.biomeName)}</div>
           <div class="hub-meta">Found at the heart of the ${metaEsc(cw.biomeName)}.</div>`}
    </div>`;
  }).join('');
  el.innerHTML = `
    <div class="wpn-grid">
      ${shopCards}
      ${chestCards ? `<div class="wpn-divider">BIOME TREASURES</div>` : ''}
      ${chestCards}
    </div>
    <div class="wpn-tools">
      <button class="hub-btn weps" data-a="backToChars">◀ BACK TO CHARACTERS</button>
    </div>`;
}

function renderHubBans() {
  const el = document.getElementById('hub-view');
  // The character's signature weapon and the equipped start weapon can never
  // be banned; silently drop them from any stale ban list entry as well.
  const prot = protectedWeaponIds();
  // Locked (never-discovered) weapons can't be banned either: they never show
  // up in level-up rolls, and un-discovering them is impossible, so silently
  // drop stale ban entries for them too.
  const scrubbed = metaBannedWeapons().filter(id => !prot.has(id) && metaWeaponUnlocked(id));
  if (scrubbed.length !== metaBannedWeapons().length) {
    meta.bannedWeapons = scrubbed;
    saveMeta();
  }
  const weaponChips = Object.keys(WEAPON_DEFS).map(id => {
    const def = WEAPON_DEFS[id];
    const unlocked = metaWeaponUnlocked(id);
    const banned = weaponBanned(id);
    if (!unlocked) {
      return `<button class="ban-chip locked" data-id="${id}" title="Bundle this weapon only after you find it."><span class="ban-name">${pixelIconHTML('w', id, 20)} ${metaEsc(def.name)}</span><span class="ban-tag">LOCKED</span></button>`;
    }
    if (prot.has(id)) {
      return `<button class="ban-chip locked" data-id="${id}" title="You can't ban this weapon — it is your starting loadout"><span class="ban-name">${pixelIconHTML('w', id, 20)} ${metaEsc(def.name)}</span><span class="ban-tag">EQUIPPED</span></button>`;
    }
    return `<button class="ban-chip ${banned ? 'banned' : ''}" data-ban="w" data-id="${id}">${pixelIconHTML('w', id, 20)} ${metaEsc(def.name)}</button>`;
  }).join('');
  const passiveChips = Object.keys(PASSIVE_DEFS).map(id => {
    const def = PASSIVE_DEFS[id];
    const banned = passiveBanned(id);
    return `<button class="ban-chip ${banned ? 'banned' : ''}" data-ban="p" data-id="${id}">${pixelIconHTML('p', id, 20)} ${metaEsc(def.name)}</button>`;
  }).join('');
  const wCount = metaBannedWeapons().length;
  const pCount = metaBannedPassives().length;
  const unlockedW = Object.keys(WEAPON_DEFS).filter(id => metaWeaponUnlocked(id)).length;
  const allBanned = wCount === unlockedW && unlockedW > 0 ? 'WEAPONS' : null;
  const pAllBanned = pCount === Object.keys(PASSIVE_DEFS).length ? 'PASSIVES' : null;
  const warn = (allBanned || pAllBanned) ? `<div class="ban-warn">⚠ Configure this run thoughtfully — ${[allBanned, pAllBanned].filter(Boolean).join(' and ')} are all banned.</div>` : '';
  el.innerHTML = `
    <div class="ban-box">
      <div class="ban-title">WEAPONS (${wCount}/${unlockedW} banned)</div>
      <div class="ban-grid">${weaponChips}</div>
    </div>
    <div class="ban-box">
      <div class="ban-title">PASSIVES (${pCount}/${Object.keys(PASSIVE_DEFS).length} banned)</div>
      <div class="ban-grid">${passiveChips}</div>
    </div>
    ${warn}
    <div class="ban-actions">
      <button class="hub-btn" data-a="clearBans">♻ CLEAR ALL BANS</button>
      <div class="ban-hint">Banned items never show up in level-up choices. Locked weapons can't be banned until you find them (grayed out). Your equipped start weapon can't be banned. Ban everything else you own for a one-weapon challenge run!</div>
    </div>`;
}

function updateMetaStarts() {
  if (!meta) return;
  const c = metaChar(meta.selectedChar);
  const w = WEAPON_DEFS[getStartWeapon()];
  const pill = document.getElementById('essence-pill');
  if (pill) pill.textContent = `💠 Umbra Shards: ${meta.essence}`;
  const sum = document.getElementById('hub-summary');
  if (sum && c) {
    const bCount = metaBannedWeapons().length + metaBannedPassives().length;
    sum.textContent = `Character: ${c.name} ${c.icon}  •  Starting weapon: ${w ? w.icon + ' ' + w.name : getStartWeapon()}  •  Difficulty: ${difficultyDef().name}${bCount > 0 ? '  •  Bans: ' + bCount : ''}`;
  }
  renderDifficultySelect();
}

function renderDifficultySelect() {
  const row = document.getElementById('diff-row');
  if (!row) return;
  row.innerHTML = DIFFICULTIES.map(d =>
    `<button class="diff-btn ${d.id === difficultyDef().id ? 'active' : ''}" data-id="${d.id}">${d.name}</button>`
  ).join('');
  const desc = document.getElementById('diff-desc');
  if (desc) desc.textContent = difficultyDef().desc;
}

// --- Wiring ---
let initMetaDone = false;
function initMeta() {
  if (initMetaDone) return;
  initMetaDone = true;
  loadMeta();
  const hub = document.getElementById('hub-screen');
  if (!hub) return;

  document.getElementById('hub-tabs').addEventListener('click', e => {
    const b = e.target.closest('.hub-tab');
    if (!b) return;
    hubTab = b.dataset.tab;
    document.querySelectorAll('.hub-tab').forEach(x => x.classList.toggle('active', x.dataset.tab === hubTab));
    renderHubView();
  });

  document.getElementById('hub-view').addEventListener('click', e => {
    const chip = e.target.closest('.ban-chip');
    if (chip) {
      if (chip.dataset.ban === 'w') toggleWeaponBan(chip.dataset.id);
      else if (chip.dataset.ban === 'p') togglePassiveBan(chip.dataset.id);
      return;
    }
    const b = e.target.closest('.hub-btn');
    if (!b || b.disabled || b.classList.contains('maxed') || b.classList.contains('equipped')) return;
    const id = b.dataset.id;
    if (b.dataset.a === 'buyUpg') buyMetaUpgrade(id);
    else if (b.dataset.a === 'unlockChar') unlockMetaCharacter(id);
    else if (b.dataset.a === 'selectChar') selectMetaCharacter(id);
    else if (b.dataset.a === 'unlockWpn') unlockStartWeapon(id);
    else if (b.dataset.a === 'selectWpn') selectStartWeapon(id);
    else if (b.dataset.a === 'openWpn') { hubTab = 'wpn'; renderHubView(); }
    else if (b.dataset.a === 'backToChars') { hubTab = 'char'; renderHubView(); }
    else if (b.dataset.a === 'clearBans') clearBans();
  });

  document.getElementById('hub-close').addEventListener('click', closeHub);
  document.getElementById('hub-play').addEventListener('click', () => {
    closeHub();
    if (typeof startGame === 'function') startGame();
  });
  document.getElementById('hub-btn').addEventListener('click', () => openHub('char'));
  const go = document.getElementById('hub-btn-go');
  if (go) go.addEventListener('click', () => openHub('char'));
  const menuGo = document.getElementById('menu-btn-go');
  if (menuGo) menuGo.addEventListener('click', () => {
    if (typeof returnToMenu === 'function') returnToMenu();
  });

  // Difficulty selector on the start screen
  const diffRow = document.getElementById('diff-row');
  if (diffRow) diffRow.addEventListener('click', e => {
    const b = e.target.closest('.diff-btn');
    if (!b) return;
    meta.difficulty = b.dataset.id;
    saveMeta();
    renderDifficultySelect();
    updateMetaStarts();
  });

  updateMetaStarts();
}

document.addEventListener('DOMContentLoaded', initMeta);
if (document.readyState === 'complete' || document.readyState === 'interactive') initMeta();