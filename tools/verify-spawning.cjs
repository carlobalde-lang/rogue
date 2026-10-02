const assert = require('assert/strict'), path = require('path');
const { chromium } = require(path.join(require('os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
    await page.click('#start-btn');
    await page.waitForFunction(() => game && game.running);
    const result = await page.evaluate(() => {
      game.running = false; Sound.stopMusic();
      const originalSpawn = spawnEnemy;
      const delivered = [];
      spawnEnemy = type => { delivered.push(type); game.enemies.push({}); };
      game.enemies = []; game.dev.enemyCap = 800; resetSpawnQueue();
      for (let i = 0; i < 15; i++) queueSpawnEnemy('test-' + i);
      drainSpawnQueue(); const first = delivered.length;
      drainSpawnQueue(); drainSpawnQueue();
      const order = delivered.slice();
      resetSpawnQueue(); game.enemies = []; game.dev.enemyCap = 10;
      for (let i = 0; i < 100; i++) queueSpawnEnemy('bounded');
      const pending = _spawnTail - _spawnHead;
      drainSpawnQueue(); drainSpawnQueue(); const capped = game.enemies.length;
      spawnEnemy = originalSpawn; resetSpawnQueue();
      const scales = DIFFICULTIES.map(d => d.scale);
      return { first, order, pending, capped, scales };
    });
    assert.equal(result.first, 6);
    assert.deepEqual(result.order, Array.from({ length: 15 }, (_, i) => 'test-' + i));
    assert.equal(result.pending, 10); assert.equal(result.capped, 10);
    assert.deepEqual(result.scales, [0.8, 1.25, 1.65, 2.15]);
    console.log('Spawn queue order, six-per-frame delivery, bounded backlog, cap and all difficulty scales: passed.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
