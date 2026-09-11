// ============================================================
// UI UPDATE & OVERLAYS
// ============================================================
function updateUI() {
  const g = game;
  const p = g.player;
  document.getElementById('timer').textContent = formatTime(g.time);
  document.getElementById('kills').textContent = `Kills: ${g.kills}`;
  document.getElementById('level-display').textContent = `LVL ${p.level}`;

  const hpPct = (p.hp / p.maxHp * 100) + '%';
  document.getElementById('hp-bar').style.width = hpPct;
  document.getElementById('hp-text').textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;

  const xpPct = (p.xp / p.xpToLevel * 100) + '%';
  document.getElementById('xp-bar').style.width = xpPct;
  document.getElementById('xp-text').textContent = `${p.xp}/${p.xpToLevel}`;

  // Weapon icons
  const wi = document.getElementById('weapon-icons');
  if (wi.children.length !== p.weapons.length) {
    wi.innerHTML = '';
    for (const w of p.weapons) {
      const div = document.createElement('div');
      div.className = 'weapon-icon';
      div.innerHTML = `${WEAPON_DEFS[w.id].icon}<div class="weapon-level">${w.level}</div>`;
      wi.appendChild(div);
    }
  } else {
    const icons = wi.children;
    for (let i = 0; i < p.weapons.length; i++) {
      icons[i].querySelector('.weapon-level').textContent = p.weapons[i].level;
    }
  }
}

// ============================================================
// GAME OVER / PAUSE
// ============================================================
function populatePausePanel() {
  if (!game) return;
  const p = game.player;

  // --- Weapons ---
  const wHtml = [];
  for (const w of p.weapons) {
    const def = WEAPON_DEFS[w.id];
    const nm = def ? def.icon + ' ' + escapeHtml(def.name) : w.id;
    wHtml.push(
      `<div class="pause-entry"><span class="pe-name">${nm}</span>` +
      `<span class="pe-value">Lv.${w.level}</span></div>`
    );
  }
  if (p.weapons.length === 0) wHtml.push('<div class="pause-entry"><span class="pe-name">No weapons</span></div>');

  // --- Passives (aggregate duplicates into stacks) ---
  const pCount = {};
  for (const nm of p.passives) pCount[nm] = (pCount[nm] || 0) + 1;
  const pHtml = Object.entries(pCount).map(([nm, n]) =>
    `<div class="pause-entry"><span class="pe-name">${escapeHtml(nm)}</span>` +
    `<span class="pe-value">${n > 1 ? 'x' + n : ''}</span></div>`
  );
  if (Object.keys(pCount).length === 0) pHtml.push('<div class="pause-entry"><span class="pe-name">No passives</span></div>');

  // --- Stats ---
  const s = [
    ['HP', `${Math.ceil(p.hp)}/${p.maxHp}`],
    ['Level', p.level],
    ['Damage', (p.dmgMult * 100).toFixed(0) + '%'],
    ['Move Speed', p.speed.toFixed(0)],
    ['Area', (p.areaMult * 100).toFixed(0) + '%'],
    ['Cooldown', (p.cdMult * 100).toFixed(0) + '%'],
    ['Armor', p.armor],
    ['Pickup Range', p.pickupRange.toFixed(0)],
    ['Regen', p.regen.toFixed(1) + '/s'],
    ['Soul Harvest', (p.soulHarvest * 100).toFixed(0) + '%'],
  ];
  const sHtml = s.map(([k, v]) =>
    `<div class="pause-entry"><span class="pe-name">${k}</span>` +
    `<span class="pe-value">${escapeHtml(v)}</span></div>`
  ).join('');

  document.getElementById('pause-weapons').innerHTML =
    `<h3>WEAPONS</h3>${wHtml.join('')}<h3>PASSIVES</h3>${pHtml.join('')}`;
  document.getElementById('pause-stats').innerHTML = `<h3>STATS</h3>${sHtml}`;
}

function togglePause() {
  if (!game || !game.running || game.gameOver || game.levelUpPending) return;
  game.manualPause = !game.manualPause;
  game.paused = game.manualPause;
  if (game.manualPause) {
    game.input.up = false;
    game.input.down = false;
    game.input.left = false;
    game.input.right = false;
    game.joystick.active = false;
    game.joystick.dx = 0;
    game.joystick.dy = 0;
    populatePausePanel();
    document.getElementById('pause-screen').style.display = 'flex';
    Sound.play('pause');
  } else {
    document.getElementById('pause-screen').style.display = 'none';
    Sound.play('unpause');
  }
}

function endGame() {
  game.gameOver = true;
  game.running = false;
  game.manualPause = false;
  game.paused = false;
  document.getElementById('pause-screen').style.display = 'none';
  document.getElementById('pause-btn').style.display = 'none';
  document.getElementById('gameover-stats').innerHTML =
    `Time Survived: <span style="color:#ffd700">${formatTime(game.time)}</span><br>` +
    `Enemies Killed: <span style="color:#f44">${game.kills}</span><br>` +
    `Level Reached: <span style="color:#4cf">${game.player.level}</span>`;
  document.getElementById('game-over-screen').style.display = 'flex';
  Sound.stopMusic();
  Sound.play('gameover');
}