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
      game.running = false; Sound.stopMusic(); Sound.play = () => {}; window.runLog = null;
      const p = game.player;
      const card = (key, passive = true, rarity = 'common') => ({ key, passive, rarity });
      p.weapons = [{ id: 'magicBolt', level: 1 }]; p.passives = [];
      p.hp = p.maxHp = 100; p.vamp = 0; p.regen = 0; p.revives = 0;
      const recovery = autoPick([card('magicBolt', false, 'epic'), card('vampirism')]).key;
      p.hp = 20;
      const crisis = autoPick([card('glassCannon', true, 'legendary'), card('maxHp')]).key;
      p.hp = 100; p.vamp = 0.3; p.regen = 1;
      p.weapons = [{ id: 'lightning', level: 1 }, { id: 'magicBolt', level: 1 }, { id: 'holyCross', level: 1 }];
      const synergy = autoPick([card('magicBolt', false), card('cooldown')]).key;
      game.recipesTriggered.stormcaller = true;
      const completedSynergy = autoPick([card('magicBolt', false), card('cooldown')]).key;
      const spawns = [];
      for (const [width, height] of [[390, 844], [1280, 800], [3440, 1440], [5120, 1440]]) {
        VIEW_W = width; VIEW_H = height;
        for (const lag of [0, 180]) {
          game.camera.x = p.x - width / 2 + lag;
          game.camera.y = p.y - height / 2 - lag;
          let visible = 0, recycled = 0, nearest = Infinity;
          for (let i = 0; i < 360; i++) {
            const pos = findEnemySpawnPos({ a: i * PI2 / 360, spread: 0 });
            const d = Math.hypot(pos.x - p.x, pos.y - p.y);
            if (pos.x >= game.camera.x && pos.x <= game.camera.x + width && pos.y >= game.camera.y && pos.y <= game.camera.y + height) visible++;
            if (d >= enemyRecycleDistance()) recycled++;
            nearest = Math.min(nearest, d);
          }
          spawns.push({ width, height, lag, visible, recycled, nearest });
        }
      }
      return { recovery, crisis, synergy, completedSynergy, spawns };
    });
    assert.equal(result.recovery, 'vampirism');
    assert.equal(result.crisis, 'maxHp');
    assert.equal(result.synergy, 'cooldown');
    assert.equal(result.completedSynergy, 'magicBolt');
    for (const s of result.spawns) { assert.equal(s.visible, 0); assert.equal(s.recycled, 0); assert.ok(s.nearest >= 699); }
    console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
