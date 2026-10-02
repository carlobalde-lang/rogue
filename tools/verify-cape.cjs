const assert = require('assert/strict'), path = require('path');
const { chromium } = require(path.join(require('os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
    await page.click('#start-btn'); await page.waitForFunction(() => game && game.running);
    const result = await page.evaluate(() => {
      game.running = false; Sound.stopMusic(); GFX.cape = true;
      const p = game.player; let collarError = 0, maxRadius = 0;
      for (const hz of [60, 120]) {
        p.cape = null; delete p._capeFace;
        for (let step = 0; step < hz * 12; step++) {
          const a = Math.floor(step / (hz * 1.5)) * Math.PI / 4;
          p.renderAngle = a; p.velX = Math.cos(a) * 180; p.velY = Math.sin(a) * 180;
          p.x += p.velX / hz; p.y += p.velY / hz; game.time += 1000 / hz;
          updateCape(1 / hz);
          const neck = capeNeckAnchor(p);
          for (let j = 0; j < p.cape.W; j++) {
            const pt = p.cape.grid[j][0], wf = j / (p.cape.W - 1) - 0.5;
            collarError = Math.max(collarError, Math.hypot(pt.x - neck.neckX - Math.cos(neck.perp) * p.cape.NECK_W * wf,
              pt.y - neck.neckY - Math.sin(neck.perp) * p.cape.NECK_W * wf));
            for (const point of p.cape.grid[j]) maxRadius = Math.max(maxRadius, Math.hypot(point.x - p.x, point.y - p.y));
          }
        }
      }
      p.renderAngle = Math.PI / 4; delete p._capeFace;
      let switches = 0, previous;
      for (let i = 0; i < 120; i++) {
        p.velX = 100 + (i % 2 ? 0.01 : -0.01); p.velY = 100;
        const face = capeNeckAnchor(p).back;
        if (previous !== undefined && face !== previous) switches++;
        previous = face;
      }
      let drawn;
      drawCapeCloth = drawCapeRibbon = (cx, cy, cap) => { drawn = cap; };
      game.renderAlpha = 0.5; drawCape(0, 0);
      const source = p.cape.grid[0][0], rendered = drawn.grid[0][0];
      const interpolationError = Math.abs(rendered.x - (source.x + source.renderPrevX) / 2)
        + Math.abs(rendered.y - (source.y + source.renderPrevY) / 2);
      return { collarError, maxRadius, diagonalSwitches: switches, interpolationError };
    });
    assert.ok(result.collarError < 0.000001); assert.ok(Number.isFinite(result.maxRadius) && result.maxRadius < 100);
    assert.equal(result.diagonalSwitches, 0); assert.ok(result.interpolationError < 0.000001);
    assert.deepEqual(errors, []); console.log(JSON.stringify({ ...result, errors, status: 'passed' }, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
