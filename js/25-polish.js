// Combat identity, weapon evolutions and exploration contracts.
const EVOLUTIONS = {
  stormcaller: 'Forked lightning jumps to two additional enemies',
  inferno: 'Explosions leave a burning ground trail',
  winterguard: 'Frost pulses create three orbiting ice shards',
  souldrinker: 'Scythe strikes leave a lingering crimson trail',
  aegis: 'Orbiting shields repel enemies on contact',
  zephyr: 'Returning blades fly farther and pierce crowds',
  bloom: 'Poison gardens slow enemies inside them',
  aberrance: 'Rifts erupt when they collapse',
  spikedjaw: 'Saw teeth knock enemies away from the ring',
  bastion: 'Turrets fire a three-shot fan',
  mysticgaze: 'Stars pierce deeper through the horde',
  scourge: 'Mirror shards ricochet farther and more often'
};
// Grass retains the original hexadecimal palettes shared by Canvas and WebGL.
for (const r of RECIPES) r.desc += ' · ' + EVOLUTIONS[r.id];

function evolved(id) { return !!(game && game.recipesTriggered[id]); }

function repelEnemy(e, x, y, distance) {
  if (e.dead || e.type === 'boss' || e.type === 'warden') return;
  const a = Math.atan2(e.y - y, e.x - x);
  const nx = e.x + Math.cos(a) * distance, ny = e.y + Math.sin(a) * distance;
  if (!circleBlocked(nx, ny, Math.max(3, e.radius * 0.4))) { e.x = nx; e.y = ny; }
}

function addEvolutionZone(x, y, radius, damage, color, source) {
  const zones = game.evolutionZones;
  if (zones.length >= 12) zones.shift();
  zones.push({ x, y, radius, damage, color, source, life: 1800, maxLife: 1800, tick: 0 });
}

function updateEvolutionZones(dt) {
  const g = game, p = g.player;
  for (let i = g.evolutionZones.length - 1; i >= 0; i--) {
    const z = g.evolutionZones[i];
    z.life -= dt;
    if (z.life <= 0) { g.evolutionZones.splice(i, 1); continue; }
    z.tick -= dt;
    if (z.tick > 0) continue;
    z.tick = 450;
    for (const e of g.enemyGrid.query(z.x, z.y, z.radius + 30)) {
      if (!e.dead && dist(z, e) <= z.radius + e.radius)
        damageEnemy(e, z.damage, z.x, z.y, true, z.source);
    }
  }
  if (evolved('winterguard')) {
    const w = p.weapons.find(w => w.id === 'frostNova');
    if (!w) return;
    g.iceShardTick = (g.iceShardTick || 0) - dt;
    if (g.iceShardTick <= 0) {
      g.iceShardTick = 300;
      const dmg = getWeaponStats(w).dmg * 0.3;
      for (let i = 0; i < 3; i++) {
        const a = g.time * 0.002 + i * PI2 / 3;
        const pos = { x: p.x + Math.cos(a) * 48, y: p.y + Math.sin(a) * 48 };
        for (const e of g.enemyGrid.query(pos.x, pos.y, 35)) {
          if (!e.dead && dist(pos, e) < e.radius + 10) {
            damageEnemy(e, dmg, pos.x, pos.y, true, 'frostNova'); applySlow(e, 0.55, 700);
          }
        }
      }
    }
  }
}

function explorationTarget() {
  const p = game.player;
  if (game.guardian) return game.guardian.biomeId;
  let best = null, distance = Infinity;
  for (const id of BIOME_IDS) {
    if (!BIOME_DEFS[id].weapon || heartCleared(id)) continue;
    const d = dist(p, chestPos(id));
    if (d < distance) { best = id; distance = d; }
  }
  return best;
}

// Each route offers one optional timed shrine. Progress and rewards are per run.
function updateExploration(dt) {
  const g = game, p = g.player;
  const target = explorationTarget();
  g.explorationTarget = target;
  if (!target || g.time < 20000) return;
  if (!g.routeEvents[target]) {
    const heart = chestPos(target), start = { x: TILE * 8.5, y: TILE * 8.5 };
    const mid = { x: (heart.x + start.x) / 2, y: (heart.y + start.y) / 2 };
    let spot = null;
    for (let ring = 0; ring <= 6 && !spot; ring++) {
      for (let k = 0; k < 8; k++) {
        const x = mid.x + Math.cos(k * PI2 / 8) * ring * TILE;
        const y = mid.y + Math.sin(k * PI2 / 8) * ring * TILE;
        if (!circleBlocked(x, y, 32) && ownHazardAt(x, y) === HAZARD_NONE) { spot = { x, y }; break; }
      }
    }
    g.routeEvents[target] = spot ? { ...spot, progress: 0, done: false } : { done: true };
  }
  for (const [id, event] of Object.entries(g.routeEvents)) {
    if (event.done) continue;
    if (dist(p, event) <= 68) event.progress = Math.min(6000, event.progress + dt);
    // Leaving the shrine pauses progress, so dodging never loses the reward.
    if (event.progress < 6000) continue;
    event.done = true;
    g.essenceCollected += 8;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.15);
    gainXp(Math.min(30, p.xpToLevel * 0.2));
    Sound.play('recipe');
    spawnFloatingText(event.x, event.y - 40, 'SHRINE RESTORED · +8 SHARDS', '#ffd24d');
  }
}

function drawExploration(cx, cy, w, h) {
  for (const event of Object.values(game.routeEvents)) {
    if (event.done) continue;
    const x = event.x - cx, y = event.y - cy;
    if (x < -80 || y < -80 || x > w + 80 || y > h + 80) continue;
    ctx.save();
    ctx.strokeStyle = '#dac18b'; ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(x) - 15, Math.round(y) - 15, 30, 30);
    ctx.fillStyle = '#18242c'; ctx.fillRect(Math.round(x) - 9, Math.round(y) - 9, 18, 18);
    ctx.fillStyle = '#d9c596'; ctx.fillRect(Math.round(x) - 3, Math.round(y) - 6, 6, 12);
    ctx.beginPath(); ctx.arc(x, y, 42, -Math.PI / 2, -Math.PI / 2 + PI2 * event.progress / 6000); ctx.stroke();
    ctx.font = 'bold 11px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillStyle = '#fff0c7'; ctx.fillText('RESTORE · 6s', x, y - 52);
    ctx.fillText('+8 SHARDS · HEAL · XP', x, y + 62);
    ctx.restore();
  }
}

function updateObjectiveUI() {
  const el = document.getElementById('exploration-objective');
  if (!el) return;
  const g = game, id = g.explorationTarget;
  if (!id) { el.textContent = 'HEARTS PURIFIED · Survive the shadowlands'; return; }
  const def = BIOME_DEFS[id], remaining = Math.ceil((g.heartTimers[id] ?? HEART_WAKE_MS) / 1000);
  const reward = WEAPON_DEFS[def.weapon].name;
  const event = Object.values(g.routeEvents).find(e => !e.done && dist(g.player, e) <= 90);
  el.textContent = event ? 'RESTORE SHRINE · ' + Math.ceil((6000 - event.progress) / 1000) + 's · +8 shards + heal'
    : g.guardian ? 'DEFEAT ' + def.name.toUpperCase() + ' GUARDIAN · Unlock ' + reward
    : 'PURIFY ' + def.name.toUpperCase() + ' · ' + Math.round(dist(g.player, chestPos(id)) / TILE) + ' tiles · ' + reward
      + (remaining < 30 ? ' · Awakening ' + remaining + 's' : '');
}

// Shared bounded cache used by the living-shadow animation renderer.
const shadowSpriteCache = new Map();

function drawEvolutionZones(cx, cy) {
  ctx.save();
  for (const z of game.evolutionZones) {
    ctx.strokeStyle = z.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.55 * z.life / z.maxLife;
    ctx.beginPath(); ctx.arc(z.x - cx, z.y - cy, z.radius, 0, PI2); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = i * PI2 / 6 + game.time * 0.001;
      ctx.fillStyle = z.color;
      ctx.fillRect(Math.round(z.x - cx + Math.cos(a) * z.radius * 0.65), Math.round(z.y - cy + Math.sin(a) * z.radius * 0.65), 3, 3);
    }
  }
  if (evolved('winterguard')) {
    ctx.globalAlpha = 1; ctx.fillStyle = '#bdefff'; ctx.strokeStyle = '#305e83';
    for (let i = 0; i < 3; i++) {
      const a = game.time * 0.002 + i * PI2 / 3;
      const x = game.player.x - cx + Math.cos(a) * 48, y = game.player.y - cy + Math.sin(a) * 48;
      ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 5, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
}

// Cached trees are sliced into a planted trunk/shadow and a depth-sorted crown.
let visibleTreeLayers = [];
drawTrees = function(cx, cy, w, h) {
  visibleTreeLayers = [];
  // Test the player distance once per enemy, rather than once per crown.
  const player = game.player;
  const nearbyEnemies = game.enemies.filter(e => !e.dead && dist2(e, player) < 320 * 320);
  let nearLeft = Infinity, nearTop = Infinity, nearRight = -Infinity, nearBottom = -Infinity;
  for (const e of nearbyEnemies) {
    nearLeft = Math.min(nearLeft, e.x - cx - e.radius);
    nearRight = Math.max(nearRight, e.x - cx + e.radius);
    nearTop = Math.min(nearTop, e.y - cy - e.radius);
    nearBottom = Math.max(nearBottom, e.y - cy + e.radius);
  }
  const step = TREE_SWAY_N * 0.00065 / PI2;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  for (let yy = Math.floor(cy / CHUNK_PX) - 1; yy <= Math.floor((cy + h) / CHUNK_PX) + 1; yy++) {
    for (let xx = Math.floor(cx / CHUNK_PX) - 1; xx <= Math.floor((cx + w) / CHUNK_PX) + 1; xx++) {
      for (const tree of getChunkTrees(xx, yy)) {
        const x = tree.x - cx, y = tree.y - cy;
        if (x < -140 || x > w + 140 || y < -200 || y > h + 60) continue;
        const phase = (((tree.x % 977) * 137) + ((tree.y % 971) * 61)) % 628;
        const loop = treeLoopFrames(tree.type, tree.s);
        const frame = ((Math.floor(game.time * step + phase * 0.04) % loop._N) + loop._N) % loop._N;
        const image = loop.frames[frame], cut = Math.max(1, Math.floor(loop._dy - 12 * tree.s));
        const layer = { image, cut, x: Math.round(x - loop._dx), y: Math.round(y - loop._dy), rootY: tree.y };
        ctx.drawImage(image, 0, cut, image.width, image.height - cut,
          layer.x, layer.y + cut, image.width, image.height - cut);
        const px = game.player.x - cx, py = game.player.y - cy;
        layer.fade = px > layer.x - 16 && px < layer.x + image.width + 16
          && py > layer.y - 20 && py < layer.y + cut + 20;
        if (!layer.fade && layer.x < nearRight && layer.x + image.width > nearLeft
          && layer.y < nearBottom && layer.y + cut > nearTop) layer.fade = nearbyEnemies.some(e => e.x - cx > layer.x - e.radius
          && e.x - cx < layer.x + image.width + e.radius
          && e.y - cy > layer.y - e.radius && e.y - cy < layer.y + cut + e.radius);
        visibleTreeLayers.push(layer);
      }
    }
  }
  ctx.restore();
};

function drawTreeCanopy(tree) {
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = tree.fade ? 0.28 : 1;
  ctx.drawImage(tree.image, 0, 0, tree.image.width, tree.cut,
    tree.x, tree.y, tree.image.width, tree.cut);
  ctx.restore();
}

document.addEventListener('keydown', event => {
  if (event.code === 'F4') { event.preventDefault(); document.body.classList.toggle('show-diagnostics'); }
});

let previousViewWidth = VIEW_W, previousViewHeight = VIEW_H;
window.addEventListener('resize', () => {
  if (game && game.running) {
    const dx = (previousViewWidth - VIEW_W) / 2, dy = (previousViewHeight - VIEW_H) / 2;
    game.camera.x += dx; game.camera.y += dy;
    if (typeof game._rpCamX === 'number') game._rpCamX += dx;
    if (typeof game._rpCamY === 'number') game._rpCamY += dy;
  }
  previousViewWidth = VIEW_W; previousViewHeight = VIEW_H;
});

function drawHostileSignals(cx, cy, w, h) {
  ctx.save(); ctx.lineWidth = 2;
  for (const cp of game.castProjectiles) {
    const x = cp.x - cx, y = cp.y - cy;
    if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
    const r = cp.radius + 4;
    ctx.strokeStyle = '#ffe1be'; ctx.fillStyle = '#a52e49';
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
