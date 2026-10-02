const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { chromium } = require(path.join(require('os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('file:///' + root.replace(/\\/g, '/') + '/index.html');
    await page.click('#start-btn');
    await page.waitForFunction(() => game && game.running);
    const results = await page.evaluate(() => {
      game.running = false;
      Sound.stopMusic();
      Sound.play = () => {};
      window.runLog = null;
      const p = game.player;
      p.hp = 50; p.maxHp = 100; p.vamp = 0.1; p.momentumActive = false;
      damageEnemy({ x: p.x + 100, y: p.y, hp: 1, radius: 8, xp: 1, type: 'normal' }, 100);
      const overkill = { enemyHP: 1, damage: 100, vampirism: 0.1, healing: p.hp - 50 };
      showLevelUp = () => {};
      function reset() { p.level = 1; p.xp = 9; p.xpToLevel = 10; p.hp = 80; p.maxHp = 100; game.pendingLevelUps = 0; }
      reset(); gainXp(5);
      const normalLevel = { level: p.level, hp: p.hp, maxHp: p.maxHp };
      reset(); killEnemy({ x: p.x + 100, y: p.y, hp: 0, radius: 8, xp: 10, type: 'boss' });
      const bossLevel = { level: p.level, hp: p.hp, maxHp: p.maxHp };
      return { overkill, normalLevel, bossLevel };
    });
    assert.ok(Math.abs(results.overkill.healing - 0.1) < 0.000001);
    assert.deepEqual(results.bossLevel, results.normalLevel);
    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
    fs.writeFileSync(path.join(root, 'artifacts/balance-edge-cases.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
