const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
require('fs').mkdirSync(path.join(root, 'artifacts'), { recursive: true });
const { chromium } = (() => {
  try { return require('playwright'); }
  catch { return require(path.join(require('os').homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')); }
})();

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('file:///' + root.replace(/\\/g, '/') + '/index.html');
  await page.screenshot({ path: path.join(root, 'artifacts/menu.png') });
  await page.click('#start-btn');
  await page.waitForFunction(() => game && game.running, { timeout: 60000 });
  await page.evaluate(() => { game.dev.godMode = true; setAutoLevelUp(true); });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(root, 'artifacts/ruins.png') });
  const results = await page.evaluate(() => {
    const assert = (v, message) => { if (!v) throw new Error(message); };
    for (const grass of GRASS_WIND_TYPES) {
      for (const key of ['dark', 'light', 'glint'])
        assert(/^#[0-9a-f]{6}$/i.test(grass[key]), 'Grass colour must stay hexadecimal: ' + grass.id + '.' + key);
    }
    if (WG.ok) for (let i = 0; i < GRASS_WIND_TYPES.length; i++) {
      const grass = GRASS_WIND_TYPES[i];
      const expected = [wgParseHex(grass.light), wgParseHex(grass.glint)];
      for (let j = 0; j < 2; j++) for (let k = 0; k < 3; k++)
        assert(Math.abs(WG.cols[i][j][k] - expected[j][k]) < 1e-6, 'WebGL grass colour mismatch');
    }
    const weights = luck => { const w = rarityWeights(luck), total = w.reduce((s, v) => s + v.weight, 0); return w.map(v => v.weight / total); };
    const base = weights(0), lucky = weights(1);
    assert(Math.abs(base[0] - 0.52) < 1e-9, 'Base rarity changed');
    assert(lucky[3] > base[3] && lucky[0] < base[0], 'Luck must improve rarity');
    assert(JSON.stringify(weights(100)) === JSON.stringify(lucky), 'Luck must be bounded');
    const p = game.player;
    p.weapons = Object.keys(WEAPON_DEFS).map(id => ({ id, level: 3, lastFired: -10000 }));
    p.passives = Object.values(PASSIVE_DEFS).map(def => def.name);
    checkRecipes();
    assert(Object.keys(game.recipesTriggered).length === RECIPES.length, 'Recipes missing');
    assert(p.weapons.filter(w => w.evolution).length === RECIPES.length, 'Evolution labels missing');
    p.level = 30; update(16);
    const expected = (1 + (game.time / 60000) * (0.95 + (game.time / 60000) / 9) + 29 * 0.12) * difficultyScale();
    assert(Math.abs(game.difficultyMult - expected) < 1e-8, 'Difficulty mismatch');
    const id = BIOME_IDS.find(id => BIOME_DEFS[id].weapon);
    game.explorationTarget = id;
    game.routeEvents[id] = { x: p.x, y: p.y, progress: 5600, done: false };
    game.time = Math.max(game.time, 21000);
    const shards = game.essenceCollected;
    updateExploration(400); updateExploration(400);
    assert(game.essenceCollected === shards + 8, 'Shrine must reward exactly once');
    for (let level = 0; level < 4; level++) { GFX.level = level; applyGfxLevel(); render(); }
    GFX.level = 0; applyGfxLevel();
    return { recipes: Object.keys(game.recipesTriggered).length, baseLegendary: base[3], luckyLegendary: lucky[3], shrineReward: game.essenceCollected - shards };
  });
  await page.waitForTimeout(1500);
  const mechanics = await page.evaluate(() => {
    const assert = (v, message) => { if (!v) throw new Error(message); };
    const g = game, p = g.player;
    const originalDamage = damageEnemy, originalProjectile = createProjectile;
    const hits = [], shots = [];
    damageEnemy = (e, dmg) => { hits.push({ e, dmg }); };
    createProjectile = (...args) => { shots.push(args); };
    try {
      g.enemies = [30, 70, 110, 140].map((x, i) => ({ x: p.x + x, y: p.y, radius: 12, hp: 1000, maxHp: 1000, type: 'normal', kind: 'normal', _id: i + 1 }));
      g.enemyGrid.clear(); for (const e of g.enemies) g.enemyGrid.insert(e);
      const fire = id => { p.weapons = [{ id, level: 1, lastFired: -10000 }]; fireWeapons(); };
      fire('lightning'); assert(g.lightningEffects.some(e => e.x1 !== p.x), 'Lightning must branch from an enemy');
      fire('fireBlast'); assert(g.evolutionZones.some(z => z.source === 'fireBlast'), 'Inferno trail missing');
      fire('bloodScythe'); assert(g.evolutionZones.some(z => z.source === 'bloodScythe'), 'Scythe trail missing');
      fire('boomerang'); assert(shots.at(-1).at(-1).maxOut === 265 * 1.4, 'Zephyr range missing');
      fire('holyCross'); assert(shots.at(-1)[8] === 8, 'Star piercing missing');
      fire('mirrorShard'); assert(shots.at(-1).at(-1).bounces === 6 && shots.at(-1).at(-1).bounceRange === 300, 'Mirror evolution missing');
      g.turrets = [{ x: p.x, y: p.y, aim: 0, life: 1000, maxLife: 1000, rate: 700, fireTimer: 0, dmg: 12 }];
      const before = shots.length; updateTurrets(16, .016); assert(shots.length === before + 3, 'Turret fan missing');
      g.clouds = [{ x: p.x, y: p.y, radius: 180, dmg: 4, life: 1000, maxLife: 1000, tickTimer: 0 }];
      updateClouds(16, .016); assert(g.enemies[0].slowT > 0, 'Poison slow missing');
      g.rifts = [{ x: p.x, y: p.y, radius: 180, dmg: 4, life: 1, tickTimer: 0 }];
      updateRifts(16, .016); assert(g.evolutionZones.some(z => z.source === 'voidRift'), 'Rift collapse missing');
      p.weapons = [{ id: 'frostNova', level: 1, lastFired: 0 }];
      const e = g.enemies[0]; e.x = p.x + Math.cos(g.time * .002) * 48; e.y = p.y + Math.sin(g.time * .002) * 48;
      g.enemyGrid.clear(); for (const enemy of g.enemies) g.enemyGrid.insert(enemy);
      g.iceShardTick = 0; const previousHits = hits.length; updateEvolutionZones(16);
      assert(hits.length > previousHits && e.slowT > 0, 'Ice shards must hit');
      return { weaponBehaviorChecks: 9 };
    } finally { damageEnemy = originalDamage; createProjectile = originalProjectile; }
  });
  await page.evaluate(() => {
    game.enemies = []; game.enemyGrid.clear(); game.player.weapons = [];
    for (const id of ['magicBolt', 'holyShield', 'lightning', 'fireBlast', 'frostNova', 'bloodScythe']) {
      const r = RECIPES.find(r => r.weapon === id);
      game.player.weapons.push({ id, level: 3, lastFired: -10000, evolution: r && r.name });
    }
  });
  await page.screenshot({ path: path.join(root, 'artifacts/evolutions.png') });
  // Traverse each biome and draw its trees, weather, hostile shots and spells.
  for (const id of await page.evaluate(() => BIOME_IDS)) {
    await page.evaluate(id => {
      const pos = chestPos(id); game.player.x = pos.x; game.player.y = pos.y;
      game.camera.x = pos.x - VIEW_W / 2; game.camera.y = pos.y - VIEW_H / 2;
      game._rpCamX = game.camera.x; game._rpCamY = game.camera.y;
      for (const kind of ['caster', 'runner', 'brute', 'shielded', 'boss']) spawnEnemy(kind);
      for (let i = 0; i < 15; i++) update(1000 / 60);
      render(); updateUI();
    }, id);
    await page.waitForTimeout(100);
  }
  await page.evaluate(() => {
    const pos = chestPos('west');
    let chosen = null;
    for (let yy = Math.floor(pos.y / CHUNK_PX) - 3; yy <= Math.floor(pos.y / CHUNK_PX) + 3 && !chosen; yy++)
      for (let xx = Math.floor(pos.x / CHUNK_PX) - 3; xx <= Math.floor(pos.x / CHUNK_PX) + 3 && !chosen; xx++)
        for (const t of getChunkTrees(xx, yy))
          if (!circleBlocked(t.x, t.y + 35, 14)) { chosen = t; break; }
    if (chosen) { game.player.x = chosen.x; game.player.y = chosen.y + 35; }
    game.camera.x = game.player.x - VIEW_W / 2; game.camera.y = game.player.y - VIEW_H / 2;
    game._rpCamX = game.camera.x; game._rpCamY = game.camera.y;
    game._rpPx = game.player.x; game._rpPy = game.player.y;
    game.enemies = []; game.enemyGrid.clear();
    for (const [i, kind] of ['normal', 'runner', 'brute', 'shielded', 'caster', 'boss', 'warden'].entries()) {
      spawnEnemy(kind); const e = game.enemies.at(-1);
      e.x = game.player.x + Math.cos(i * PI2 / 7) * 160;
      e.y = game.player.y + Math.sin(i * PI2 / 7) * 100; e.prevX = e.x; e.prevY = e.y;
    }
    game.castProjectiles.push({ x: game.player.x + 90, y: game.player.y - 40, prevX: game.player.x + 90, prevY: game.player.y - 40, radius: 5, life: 2000, maxLife: 2000, vx: -1, vy: 0, color: '#a52e49' });
    game.paused = true;
    for (let level = 0; level < 4; level++) { shadowSpriteCache.clear(); GFX.level = level; applyGfxLevel(); render(); }
    GFX.level = 0; applyGfxLevel(); render(); updateUI();
  });
  await page.screenshot({ path: path.join(root, 'artifacts/forest.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(root, 'artifacts/mobile.png') });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(root, 'artifacts/mobile-landscape.png') });
  assert.deepStrictEqual(errors, [], 'Browser errors');
  console.log(JSON.stringify({ ...results, ...mechanics, browserErrors: errors, status: 'passed' }, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
