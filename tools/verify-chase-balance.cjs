const assert = require('assert/strict'), path = require('path');
const { chromium } = require(path.join(require('os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
    await page.click('#start-btn'); await page.waitForFunction(() => game && game.running);
    const result = await page.evaluate(() => {
      game.running = false; Sound.stopMusic(); Sound.play = () => {}; window.runLog = null;
      const p = game.player;
      p.hp = 1; p.maxHp = 100; p.vamp = 1; p.regen = 0; p.momentumActive = false;
      delete p.vampHealBudget;
      const target = { x: p.x + 100, y: p.y, hp: 100000, radius: 8 };
      for (let i = 0; i < 100; i++) damageEnemy(target, 100, undefined, undefined, true);
      const firstBurst = p.hp - 1;
      updatePlayer(1000, 1); const before = p.hp;
      for (let i = 0; i < 100; i++) damageEnemy(target, 100, undefined, undefined, true);
      const secondBurst = p.hp - before;
      const realEnsure = ensureChunk;
      ensureChunk = () => new Uint8Array(CHUNK * CHUNK);
      p.x = p.y = TILE / 2; updateFlowField(p.x, p.y);
      const reachable = ffCost.reduce((n, cost) => n + (cost < MAX_COST), 0);
      const point = { x: TILE * 9.3, y: TILE * 3.7 };
      const direct = { ...flowDirectionAt(point.x, point.y) };
      const directError = Math.abs(direct.dx * (p.y - point.y) - direct.dy * (p.x - point.x));
      ensureChunk = (cx, cy) => {
        const tiles = new Uint8Array(CHUNK * CHUNK);
        for (let y = 0; y < CHUNK; y++) for (let x = 0; x < CHUNK; x++) {
          const tx = cx * CHUNK + x, ty = cy * CHUNK + y;
          if (tx === 4 && ty >= -30 && ty <= 30 && ty !== 10) tiles[y * CHUNK + x] = T_WALL;
        }
        return tiles;
      };
      updateFlowField(p.x, p.y);
      const detour = { ...flowDirectionAt(point.x, point.y) };
      const blockedVisible = ffVisible[flowIndex(Math.floor(point.x / TILE), Math.floor(point.y / TILE))];
      ensureChunk = realEnsure;
      const map = BIOME_IDS.map(id => ({ id, name: BIOME_DEFS[id].name, ...chestPos(id) }));
      const stats = DIFFICULTIES.map(d => {
        const dm = (1 + 5 * (0.95 + 5 / 9) + 19 * 0.12) * d.scale;
        return { mode: d.id, scale: d.scale, hp: ENEMY_DEFS.normal.hp(dm), damage: ENEMY_DEFS.normal.damage(dm), waveInterval: Math.max(1100, 3000 - dm * 100) * .85 };
      });
      // Verify the orientation uses actual movement, even after the target turns.
      circleBlocked = () => false; tileHazardAt = () => null; ffReady = false;
      resetSpawnQueue(); game.dev.godMode = true;
      const angles = [];
      for (const kind of ['runner', 'dunerunner']) {
        const e = { kind, type: 'normal', x: 220, y: 160, radius: 7, hp: 100, speed: 100, damage: 1, faceA: 0 };
        game.enemies = [e]; updateEnemies(16.6667, 1 / 60);
        angles.push({ kind, error: Math.abs(e.faceA - Math.atan2(e.y - e.prevY, e.x - e.prevX)) });
      }
      return { firstBurst, secondBurst, reachable, directError, blockedVisible, detour, map, stats, angles };
    });
    assert.equal(result.firstBurst, 2.5); assert.equal(result.secondBurst, 2.5);
    assert.equal(result.reachable, 85 * 85); assert.ok(result.directError < 0.000001);
    assert.equal(result.blockedVisible, 0); assert.ok(result.detour.cost < 0x7fffffff);
    assert.ok(Math.abs(result.detour.dx) + Math.abs(result.detour.dy) > 0);
    assert.ok(result.map.find(b => b.id === 'north').y < 0);
    assert.ok(result.map.find(b => b.id === 'northeast').y < 0);
    assert.ok(result.map.find(b => b.id === 'south').y > 0);
    for (let i = 1; i < result.stats.length; i++) {
      assert.ok(result.stats[i].hp > result.stats[i - 1].hp);
      assert.ok(result.stats[i].damage > result.stats[i - 1].damage);
      assert.ok(result.stats[i].waveInterval <= result.stats[i - 1].waveInterval);
    }
    for (const a of result.angles) assert.ok(a.error < 0.000001, JSON.stringify(a));
    assert.deepEqual(errors, []); console.log(JSON.stringify({ ...result, errors, status: 'passed' }, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
