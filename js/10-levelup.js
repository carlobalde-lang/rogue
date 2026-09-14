// ============================================================
// LEVEL UP SYSTEM
// ============================================================
// --- Weapon + passive RECIPES ---
// Carrying a paired weapon & passive in the same run triggers a one-time
// synergy bonus (recipesTriggered keeps each recipe one-shot per run).
const RECIPES = [
  { id: 'stormcaller',  weapon: 'lightning',  passive: 'cooldown',  name: 'Stormcaller', desc: '+25% Damage',
    apply: p => { p.dmgMult *= 1.25; } },
  { id: 'inferno',      weapon: 'fireBlast',  passive: 'growth',    name: 'Inferno', desc: '+30% Area',
    apply: p => { p.areaMult *= 1.3; } },
  { id: 'winterguard',  weapon: 'frostNova',  passive: 'armor',     name: 'Winter Guard', desc: '+1 Armor, +15% Max HP',
    apply: p => { p.armor += 1; p.maxHp = Math.round(p.maxHp * 1.15); } },
  { id: 'souldrinker',  weapon: 'bloodScythe', passive: 'vampirism', name: 'Soul Drinker', desc: '+15% Life Steal',
    apply: p => { p.vamp = (p.vamp || 0) + 0.15; } },
  { id: 'aegis',        weapon: 'holyShield', passive: 'magnet',    name: 'Aegis', desc: '+60% Pickup Range',
    apply: p => { p.pickupRange *= 1.6; } },
  { id: 'zephyr',       weapon: 'boomerang',  passive: 'speed',     name: 'Zephyr', desc: '+15% Move Speed',
    apply: p => { p.speed *= 1.15; } },
  { id: 'bloom',        weapon: 'poisonCloud', passive: 'regen',    name: 'Bloom', desc: '+0.8 HP/s',
    apply: p => { p.regen += 0.8; } },
  { id: 'aberrance',    weapon: 'voidRift',   passive: 'luck',      name: 'Aberrance', desc: '+12% Luck',
    apply: p => { p.luck = (p.luck || 0) + 0.12; } },
  { id: 'spikedjaw',    weapon: 'chainSaw',   passive: 'thorns',    name: 'Spiked', desc: '+80% Thorns',
    apply: p => { p.thorns = (p.thorns || 0) + 0.8; } },
  { id: 'bastion',      weapon: 'turret',     passive: 'duplicator', name: 'Bastion', desc: '+20% Duplicate',
    apply: p => { p.duplicate = (p.duplicate || 0) + 0.2; } },
  { id: 'mysticgaze',   weapon: 'holyCross',  passive: 'damage',    name: 'Mystic Gaze', desc: '+20% Damage',
    apply: p => { p.dmgMult *= 1.2; } },
  { id: 'scourge',      weapon: 'mirrorShard', passive: 'soulHarvest', name: 'Scourge', desc: 'Kills explode harder (+24% chance)',
    apply: p => { p.soulHarvest = (p.soulHarvest || 0) + 0.24; } }
];

function checkRecipes() {
  const g = game;
  const p = g.player;
  for (const r of RECIPES) {
    if (g.recipesTriggered[r.id]) continue;
    const hasW = !!p.weapons.some(w => w.id === r.weapon);
    const hasP = !!p.passives.includes(r.passive);
    if (hasW && hasP) {
      g.recipesTriggered[r.id] = true;
      r.apply(p);
      Sound.play('recipe');
      spawnFloatingText(p.x, p.y - 46, r.name + '!', '#ffd24d');
      spawnFloatingText(p.x, p.y - 32, r.desc, '#ffe9a8');
      spawnParticles(p.x, p.y - 10, '#ffd24d', 22, 6);
    }
  }
}

function gainXp(amount) {
  const p = game.player;
  p.xp += amount * (game.dev?.xpMult || 1);
  while (p.xp >= p.xpToLevel) {
    p.xp -= p.xpToLevel;
    p.level++;
    p.xpToLevel = Math.floor(10 + p.level * 5 + p.level * p.level * 0.5);
    game.pendingLevelUps++;
    if (!game.levelUpPending) showLevelUp();
  }
}

function showLevelUp() {
  if (game.pendingLevelUps <= 0) { game.levelUpPending = false; return; }

  // Keep all AUTO checkboxes in sync with the per-run preference
  syncAutoLevelUpBoxes();

  // AUTO mode: resolve immediately without pausing the run.
  if (getAutoLevelUp()) {
    game.levelUpPending = false;
    autoResolveLevelUps();
    return;
  }

  game.levelUpPending = true;
  game.paused = true;
  game.input.up = false;
  game.input.down = false;
  game.input.left = false;
  game.input.right = false;
  game.joystick.active = false;
  game.joystick.dx = 0;
  game.joystick.dy = 0;

  const choices = generateChoices();
  game.levelUpChoices = choices;
  game.selectedChoice = 0;

  const container = document.getElementById('choices');
  container.innerHTML = '';
  for (let i = 0; i < choices.length; i++) {
    const c = choices[i];
    const isPassive = !!c.passive;
    const rd = RARITY_DEFS[c.rarity] || RARITY_DEFS.common;
    const card = document.createElement('div');
    card.className = 'choice-card rarity-' + c.rarity +
      (i === 0 ? ' selected' : '') +
      (isPassive ? ' choice-passive' : ' choice-weapon');
    card.dataset.index = i;
    card.innerHTML = `
      <div class="choice-badge" style="background:${rd.color}">${rd.label}</div>
      <div class="choice-icon">${pixelIconHTML(c.passive ? 'p' : 'w', c.key || c.name, 46)}</div>
      <div class="choice-name">${c.name}</div>
      <div class="choice-tier" style="color:${rd.color}">${rd.name}</div>
      <div class="choice-desc">${c.desc}</div>
      ${c.levelText ? `<div class="choice-level">${c.levelText}</div>` : ''}
    `;
    card.addEventListener('click', () => confirmChoice(i));
    container.appendChild(card);
  }
  document.getElementById('levelup-screen').style.display = 'flex';
  Sound.play('levelup');
}

// Pick the best option for AUTO mode: upgrading an owned weapon beats
// taking a new one, which beats grabbing a passive. Within the same class the
// rarer (and thus stronger) card wins, weighted by its drop odds.
function autoPick(choices) {
  if (!choices || choices.length === 0) return null;
  let best = Infinity;
  for (const c of choices) {
    const r = c.autoRank !== undefined ? c.autoRank : 2;
    if (r < best) best = r;
  }
  const top = choices.filter(c => (c.autoRank !== undefined ? c.autoRank : 2) === best);
  if (top.length === 1) return top[0];
  const weights = top.map(c => (RARITY_DEFS[c.rarity] || RARITY_DEFS.common).weight);
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < top.length; i++) {
    r -= weights[i];
    if (r <= 0) return top[i];
  }
  return top[top.length - 1];
}

// Resolve every pending level-up at once, never pausing the run. The chosen
// item flashes above the player so the automatic pick stays visible.
function autoResolveLevelUps() {
  let resolved = 0;
  let lastPick = null;
  while (game.pendingLevelUps > 0) {
    const choices = generateChoices();
    if (!choices.length) { game.pendingLevelUps = 0; break; }
    const pick = autoPick(choices);
    if (!pick) { game.pendingLevelUps = 0; break; }
    pick.apply();
    game.pendingLevelUps--;
    resolved++;
    lastPick = pick;
  }
  const p = game.player;
  if (resolved > 0 && p) {
    const rCol = lastPick && RARITY_DEFS[lastPick.rarity] ? RARITY_DEFS[lastPick.rarity].color : '#ffd700';
    spawnFloatingText(p.x, p.y - 34,
      lastPick ? 'AUTO · ' + lastPick.icon + ' ' + lastPick.name : 'AUTO ×' + resolved,
      rCol);
  }
  game.levelUpPending = false;
  game.paused = false;
  const scr = document.getElementById('levelup-screen');
  if (scr) scr.style.display = 'none';
}

function confirmChoice(index) {
  const choices = game.levelUpChoices;
  if (!choices || index < 0 || index >= choices.length) return;
  choices[index].apply();
  Sound.play('select');
  game.pendingLevelUps--;
  game.levelUpChoices = null;
  if (game.pendingLevelUps > 0) {
    document.getElementById('levelup-screen').style.display = 'none';
    setTimeout(() => showLevelUp(), 100);
  } else {
    game.levelUpPending = false;
    game.paused = false;
    game.levelUpChoices = null;
    game.input.up = false;
    game.input.down = false;
    game.input.left = false;
    game.input.right = false;
    game.joystick.active = false;
    game.joystick.dx = 0;
    game.joystick.dy = 0;
    document.getElementById('levelup-screen').style.display = 'none';
  }
}

function updateChoiceSelection() {
  const cards = document.querySelectorAll('.choice-card');
  cards.forEach((card, i) => {
    card.classList.toggle('selected', i === game.selectedChoice);
  });
}

function generateChoices() {
  const p = game.player;
  const pool = [];

  // Ban list from the pre-run menu: excluded items never enter the pool.
  const bannedW = new Set(typeof metaBannedWeapons === 'function' ? metaBannedWeapons() : []);
  const bannedP = new Set(typeof metaBannedPassives === 'function' ? metaBannedPassives() : []);

  // Existing weapon upgrades (rarer cards jump more levels; no level cap)
  for (const w of p.weapons) {
    if (!bannedW.has(w.id)) {
      const def = WEAPON_DEFS[w.id];
      const rk = rollRarityKey();
      const rd = RARITY_DEFS[rk];
      const toLvl = w.level + 1 + rd.bonus;
      pool.push({
        key: w.id, icon: def.icon, name: def.name, rarity: rk,
        desc: def.upgradeDesc(toLvl),
        levelText: `Level ${w.level} → ${toLvl} · ${rd.name}`,
        autoRank: 0,
        apply: () => { w.level = Math.max(w.level, toLvl); }
      });
    }
  }

  // New weapons (rarer cards start at a higher level). Biome treasure weapons
  // only enter the pool once their chest has been opened (permanent unlock).
  const owned = new Set(p.weapons.map(w => w.id));
  for (const [id, def] of Object.entries(WEAPON_DEFS)) {
    if (!owned.has(id) && p.weapons.length < 6 && !bannedW.has(id) &&
        (!isChestWeapon(id) || metaWeaponUnlocked(id))) {
      const rk = rollRarityKey();
      const rd = RARITY_DEFS[rk];
      const startLvl = 1 + rd.bonus;
      pool.push({
        key: id, icon: def.icon, name: def.name, rarity: rk,
        desc: def.desc + (startLvl > 1 ? ` · starts at level ${startLvl}` : ' (NEW)'),
        levelText: `New Weapon · ${rd.name}`,
        autoRank: 1,
        apply: () => { p.weapons.push({ id, level: startLvl, lastFired: 0 }); }
      });
    }
  }

  // Passives (rarity-weighted: rare passives like Revive appear less often;
  // epic/legendary versions take effect multiple times)
  const passiveKeys = Object.keys(PASSIVE_DEFS);
  for (const key of passiveKeys) {
    const def = PASSIVE_DEFS[key];
    if (bannedP.has(key)) continue;
    if (def.max !== undefined) {
      const ownedCount = p.passives.filter(n => n === def.name).length;
      if (ownedCount >= def.max) continue;
    }
    const rk = rollRarityKey();
    const rd = RARITY_DEFS[rk];
    const stacks = rd.stacks;
    pool.push({
      key, passive: true, icon: def.icon, name: def.name, rarity: rk,
      desc: def.desc + (stacks > 1 ? ` — applies ×${stacks}` : ''),
      levelText: rd.name,
      weight: def.weight || 1,
      autoRank: 2,
      apply: () => {
        for (let s = 0; s < stacks; s++) { def.apply(p); p.passives.push(def.name); }
      }
    });
  }

  // Weighted shuffle and pick 3 (higher weight => more likely to surface)
  for (const item of pool) item._rk = -Math.log(1 - Math.random()) / (item.weight || 1);
  pool.sort((a, b) => a._rk - b._rk);
  return pool.slice(0, 3);
}

// Proactive corner avoidance: if the desired heading hits a wall within the
// look-ahead, deflect the steering along the wall tangent that heads toward
// the lowest flow cost, so enemies round corners instead of jamming into
// their vertices. Returns a {dx, dy} unit vector.
function deflectSteering(e, vx, vy, hitR) {
  const look = hitR + 8;
  if (!circleBlocked(e.x + vx * look, e.y + vy * look, hitR)) return { dx: vx, dy: vy };
  const baseA = Math.atan2(vy, vx);
  const offs = [Math.PI * 0.5, -Math.PI * 0.5, 0.7, -0.7, 1.0, -1.0, Math.PI * 0.25, -Math.PI * 0.25];
  let best = null;
  let bestCost = Infinity;
  let fallback = null;
  for (const off of offs) {
    const a = baseA + off;
    const tx = e.x + Math.cos(a) * look;
    const ty = e.y + Math.sin(a) * look;
    if (circleBlocked(tx, ty, hitR)) continue;
    if (!fallback) fallback = { dx: Math.cos(a), dy: Math.sin(a) };
    const f2 = flowDirectionAt(tx, ty);
    const cost = (f2 && f2.cost < MAX_COST) ? f2.cost : Infinity;
    if (cost < bestCost) { bestCost = cost; best = { dx: Math.cos(a), dy: Math.sin(a) }; }
  }
  if (best) return best;
  if (fallback) return fallback;
  return { dx: vx, dy: vy };
}

// --- AUTO power-up: a PER-RUN preference ---
// Always off when a run starts (resetAutoLevelUp()); toggled live from the
// level-up screen and from the pause menu, and never persisted to the hub.
let autoLevelUpEnabled = false;

function getAutoLevelUp() { return autoLevelUpEnabled; }

function setAutoLevelUp(v) {
  autoLevelUpEnabled = !!v;
  syncAutoLevelUpBoxes();
  return autoLevelUpEnabled;
}

function resetAutoLevelUp() { autoLevelUpEnabled = false; }

// Mirrors the current flag onto every AUTO checkbox (level-up screen + pause).
function syncAutoLevelUpBoxes() {
  for (const id of ['auto-levelup', 'pause-auto-levelup']) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.checked !== autoLevelUpEnabled) el.checked = autoLevelUpEnabled;
    const lbl = el.closest('label');
    if (lbl) lbl.classList.toggle('checked', autoLevelUpEnabled);
  }
}

// --- AUTO power-up: one-shot wiring of the level-up screen checkbox ---
// Ticking it on mid-screen resolves the current pending level-ups so the
// game resumes immediately; from then on no level-up ever pauses the run.
(function initAutoLevelUpToggle() {
  const autoBox = document.getElementById('auto-levelup');
  if (!autoBox) return;
  autoBox.addEventListener('change', () => {
    const lbl = autoBox.closest('label');
    if (lbl) lbl.classList.toggle('checked', autoBox.checked);
    setAutoLevelUp(!!autoBox.checked);
    if (autoBox.checked && game && game.pendingLevelUps > 0) autoResolveLevelUps();
  });
})();

// The same toggle lives in the pause menu, so it can be turned off mid-run
// without ever opening a level-up screen.
(function initPauseAutoLevelToggle() {
  const pauseBox = document.getElementById('pause-auto-levelup');
  if (!pauseBox) return;
  pauseBox.addEventListener('change', () => {
    const lbl = pauseBox.closest('label');
    if (lbl) lbl.classList.toggle('checked', pauseBox.checked);
    setAutoLevelUp(!!pauseBox.checked);
    if (pauseBox.checked && game && game.pendingLevelUps > 0) autoResolveLevelUps();
  });
})();