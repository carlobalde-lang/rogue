const assert = require('assert');
const path = require('path');
const { chromium } = (() => {
  try { return require('playwright'); }
  catch { return require(path.join(require('os').homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')); }
})();
const root = path.resolve(__dirname, '..');
require('fs').mkdirSync(path.join(root, 'artifacts'), { recursive: true });
(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true, deviceScaleFactor: 2});
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('file:///' + root.replace(/\\/g, '/') + '/index.html');
    await page.click('#start-btn'); await page.waitForFunction(() => game && game.running);
    const result = await page.evaluate(() => {
      const assert = (v, message) => { if (!v) throw Error(message); };
      assert(IS_MOBILE, 'Expected touch/mobile mode');
      game.paused = true; game.dev.godMode = true;
      const centre = chestPos('west');
      let lane = null;
      for (let yy = -16; yy <= 16 && !lane; yy++) for (let xx = -16; xx <= 16 && !lane; xx++) {
        const x = centre.x + xx * TILE, y = centre.y + yy * TILE;
        let free = true;
        for (let i = 0; i <= 12; i++) if (circleBlocked(x + i * TILE, y, 14) || ownHazardAt(x + i * TILE, y) !== HAZARD_NONE) { free = false; break; }
        if (free) lane = {x, y};
      }
      assert(lane, 'No open grass lane found');
      const p = game.player; p.x = lane.x; p.y = lane.y; p.velX = 180; p.velY = 0;
      game.camera.x = p.x - VIEW_W / 2; game.camera.y = p.y - VIEW_H / 2;
      const originalStamp = trampleStamp; let stamps = 0;
      trampleStamp = (...args) => { stamps++; return originalStamp(...args); };
      try {
        GFX.level = 0; applyGfxLevel();
        for (let i = 0; i < 120; i++) { p.x += 3; updateMobileGrassTrail(p, 1000 / 60); }
        assert(stamps > 0 && stamps <= 60, 'Mobile stamps should be bounded');
        assert(trampleTiles.size > 0, 'Mobile trail missing');
        const beforeIdle = stamps; p.velX = 0;
        for (let i = 0; i < 120; i++) updateMobileGrassTrail(p, 1000 / 60);
        assert(stamps === beforeIdle, 'Stationary player should not stamp');
        p.velX = 180; GFX.level = 3; applyGfxLevel();
        for (let i = 0; i < 120; i++) { p.x += 3; updateMobileGrassTrail(p, 1000 / 60); }
        assert(stamps === beforeIdle, 'Minimal quality should skip stamping');
        assert(mobileGrassInterval() === 120, 'Low quality interval mismatch');
        GFX.level = 0; applyGfxLevel(); p.x = lane.x + 180; p.y = lane.y;
        game._rpPx = p.x; game._rpPy = p.y;
        game.camera.x = p.x - VIEW_W / 2; game.camera.y = p.y - VIEW_H / 2;
        game._rpCamX = game.camera.x; game._rpCamY = game.camera.y;
        render();
        if (WG.ok) {
          const gl = WG.gl, sub = gl.texSubImage2D.bind(gl), image = gl.texImage2D.bind(gl);
          assert(gl.getUniform(WG.prog, WG.loc.u_gpStr) > 0, 'Persistent mobile trail must have nonzero shader strength without live pushes');
          const savedMask = [...trampleTiles.entries()];
          const pixels = () => {
            drawGrassWind(game.camera.x, game.camera.y, VIEW_W, VIEW_H, game.time);
            const data = new Uint8Array(WG.canvas.width * WG.canvas.height * 4);
            gl.readPixels(0, 0, WG.canvas.width, WG.canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
            return data;
          };
          trampleTiles.clear(); trampleRev++; WG.trample.key = '';
          const unflattened = pixels();
          for (const [key, value] of savedMask) trampleTiles.set(key, value);
          trampleRev++; WG.trample.key = '';
          const flattened = pixels();
          assert(flattened.some((value, i) => value !== unflattened[i]), 'Mobile footprints must visibly change the rendered grass');
          let uploads = 0, allocations = 0;
          gl.texSubImage2D = (...args) => { uploads++; return sub(...args); };
          gl.texImage2D = (...args) => { allocations++; return image(...args); };
          try {
            for (let i = 0; i < 60; i++) { game.time += 1000 / 60; trampleRev++; drawGrassWind(game.camera.x, game.camera.y, VIEW_W, VIEW_H, game.time); }
            assert(uploads > 0 && uploads <= 13, 'GPU uploads should be throttled');
            assert(allocations === 0, 'GPU texture must be reused');
          } finally { gl.texSubImage2D = sub; gl.texImage2D = image; }
        }
        const saved = [...trampleTiles.entries()];
        for (let i = 0; i < 800; i++) getTrampleTile(10000 + i, 10000);
        assert(trampleTiles.size === 512, 'Mobile cache must be capped');
        trampleTiles.clear(); for (const [key, value] of saved) trampleTiles.set(key, value);
        trampleRev++; if (WG.trample) WG.trample.key = '';
        render(); updateUI();
        return {mobile: IS_MOBILE, stampsOverTwoSeconds: beforeIdle, maxTiles: TRAMPLE_TILE_LR, webgl: WG.ok};
      } finally { trampleStamp = originalStamp; }
    });
    await page.screenshot({path: path.join(root, 'artifacts/mobile-grass-trail.png')});
    // Exercise the Canvas fallback using the same persisted footprint mask.
    await page.evaluate(() => { const ok = WG.ok; try { WG.ok = false; render(); } finally { WG.ok = ok; } });
    await page.evaluate(() => { startGame(); if (trampleTiles.size !== 0) throw Error('Trail leaked into new run'); });
    assert.deepStrictEqual(errors, []);
    console.log(JSON.stringify({...result, errors, status:'passed'}, null, 2));
  } finally { await browser.close(); }
})().catch(e => {console.error(e); process.exit(1);});
