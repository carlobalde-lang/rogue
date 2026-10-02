const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { chromium } = require(path.join(require('os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = path.resolve(__dirname, '..'), baselinePath = path.join(root, 'tools/fixtures/combat-tuning-before.json');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/'));
    await page.click('#start-btn'); await page.waitForFunction(() => game && game.running);
    const result = await page.evaluate(() => {
      game.running = false; Sound.stopMusic(); Sound.play = () => {};
      const p = game.player; p.dmgMult = 1.3; p.cdMult = p.areaMult = 1;
      const weapons = [];
      for (const id of Object.keys(WEAPON_DEFS)) for (const level of [1, 6, 12]) weapons.push({ id, level, ...getWeaponStats({ id, level }) });
      const enemies = [];
      for (const dm of [1, 10, 25]) for (const [id, def] of Object.entries(ENEMY_DEFS)) enemies.push({ id, dm, hp: def.hp(dm) });
      game.difficultyMult = 10; game.enemies = [];
      spawnEnemy('normal'); const normal = game.enemies[0];
      spawnGuardian('north'); const guardian = game.enemies.find(e => e.isGuardian);
      const parentHP = ENEMY_DEFS.splitter.hp(10); const start = game.enemies.length;
      spawnSplitlings(p.x + 100, p.y + 100, parentHP, 3);
      const splitlings = game.enemies.slice(start).map(e => e.maxHp);
      return { weapons, enemies, normalHP: normal.maxHp, guardianHP: guardian.maxHp, splitlings, parentHP };
    });
    assert.deepEqual(errors, []);
    if (process.argv.includes('--capture')) {
      fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
      fs.writeFileSync(baselinePath, JSON.stringify(result, null, 2)); console.log('Captured previous weapon damage and enemy HP.');
    } else {
      const before = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      for (let i = 0; i < result.weapons.length; i++) {
        const now = result.weapons[i], old = before.weapons[i];
        assert.ok(Math.abs(now.dmg - old.dmg * 0.8) < 1e-8, now.id);
        for (const key of ['rate', 'count', 'speed', 'area']) assert.equal(now[key], old[key], now.id + ':' + key);
      }
      for (let i = 0; i < result.enemies.length; i++) assert.ok(Math.abs(result.enemies[i].hp - before.enemies[i].hp * 1.3) < 1e-8, result.enemies[i].id);
      assert.ok(Math.abs(result.normalHP - before.normalHP * 1.3) < 1e-8);
      assert.ok(Math.abs(result.guardianHP - Math.ceil((before.guardianHP / 1.25) * 1.3 * 1.25)) <= 1);
      for (const hp of result.splitlings) assert.equal(hp, Math.floor(result.parentHP / 2));
      fs.writeFileSync(path.join(root, 'artifacts/combat-tuning-after.json'), JSON.stringify(result, null, 2));
      console.log(JSON.stringify({ weaponChecks: result.weapons.length, enemyHPChecks: result.enemies.length, guardianHP: result.guardianHP, splitlings: result.splitlings, errors, status: 'passed' }));
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
