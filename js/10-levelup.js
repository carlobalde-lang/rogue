// ============================================================
// LEVEL UP SYSTEM
// ============================================================
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
    const card = document.createElement('div');
    card.className = 'choice-card' + (i === 0 ? ' selected' : '');
    card.dataset.index = i;
    card.innerHTML = `
      <div class="choice-icon">${c.icon}</div>
      <div class="choice-name">${c.name}</div>
      <div class="choice-desc">${c.desc}</div>
      ${c.levelText ? `<div class="choice-level">${c.levelText}</div>` : ''}
    `;
    card.addEventListener('click', () => confirmChoice(i));
    container.appendChild(card);
  }
  document.getElementById('levelup-screen').style.display = 'flex';
  Sound.play('levelup');
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

  // Existing weapon upgrades
  for (const w of p.weapons) {
    if (w.level < 8) {
      const def = WEAPON_DEFS[w.id];
      pool.push({
        icon: def.icon, name: def.name,
        desc: def.upgradeDesc(w.level + 1),
        levelText: `Level ${w.level} → ${w.level + 1}`,
        apply: () => { w.level++; }
      });
    }
  }

  // New weapons
  const owned = new Set(p.weapons.map(w => w.id));
  for (const [id, def] of Object.entries(WEAPON_DEFS)) {
    if (!owned.has(id) && p.weapons.length < 6) {
      pool.push({
        icon: def.icon, name: def.name,
        desc: def.desc + ' (NEW)',
        levelText: 'New Weapon!',
        apply: () => { p.weapons.push({ id, level: 1, lastFired: 0 }); }
      });
    }
  }

  // Passives
  const passiveKeys = Object.keys(PASSIVE_DEFS);
  for (const key of passiveKeys) {
    const def = PASSIVE_DEFS[key];
    pool.push({
      key, passive: true, icon: def.icon, name: def.name,
      desc: def.desc,
      levelText: 'Passive',
      apply: () => { def.apply(p); p.passives.push(def.name); }
    });
  }

  // Shuffle and pick 3
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
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