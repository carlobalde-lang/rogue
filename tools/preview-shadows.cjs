const path = require('path');
const assert = require('assert');
const { chromium } = (() => {
  try { return require('playwright'); }
  catch { return require(path.join(require('os').homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')); }
})();
const root = path.resolve(__dirname, '..');
require('fs').mkdirSync(path.join(root, 'artifacts'), { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 930 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('file:///' + root.replace(/\\/g, '/') + '/index.html');
    const report = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.id = 'shadow-roster';
      canvas.width = 1200; canvas.height = 930;
      canvas.style.cssText = 'position:fixed;inset:0;z-index:10000;width:1200px;height:930px';
      document.body.appendChild(canvas); const c = canvas.getContext('2d');
      c.fillStyle = '#101420'; c.fillRect(0, 0, 1200, 930);
      c.fillStyle = '#e3d1ab'; c.font = 'bold 24px Segoe UI'; c.fillText('SHADOW SURVIVORS · LIVING SHADOWS', 28, 38);
      c.fillStyle = '#a7a1b7'; c.font = '13px Segoe UI'; c.fillText('Condensed darkness · restless silhouettes · smoke and a pale gaze', 28, 62);
      const kinds = Object.keys(SHADOW_PROFILES), hashes = new Set();
      for (let i = 0; i < kinds.length; i++) {
        const kind = kinds[i], def = ENEMY_DEFS[kind] || ENEMY_DEFS.boss;
        const x = i % 5 * 240 + 120, y = Math.floor(i / 5) * 208 + 182;
        c.fillStyle = '#171d2a'; c.fillRect(x - 112, y - 99, 224, 196);
        c.fillStyle = '#1d2930'; c.fillRect(x - 112, y + 18, 224, 42);
        const e = { kind, type: def.category, isGuardian: kind === 'guardian', faceA: 0, radius: 39, fireT: 800 };
        const palette = { glint: kind === 'guardian' ? '#ffc857' : def.glint };
        drawShadowBody(c, e, x, y, 39, 220, i * .4, palette);
        c.fillStyle = '#dfd5c6'; c.textAlign = 'center'; c.font = 'bold 13px Segoe UI';
        c.fillText(kind === 'guardian' ? 'HEART GUARDIAN' : def.name.toUpperCase(), x, y + 79);
        c.fillStyle = '#8d92a9'; c.font = '11px Segoe UI'; c.fillText(kind, x, y + 94);
        const first = bakeLivingShadow(kind, 0, palette.glint).toDataURL();
        const next = bakeLivingShadow(kind, 3, palette.glint).toDataURL();
        if (first === next) throw Error('Static animation: ' + kind);
        hashes.add(first);
      }
      if (hashes.size !== kinds.length) throw Error('Duplicate silhouettes');
      // Every quality level retains the same silhouette and animation.
      const outputs = [];
      for (let level = 0; level < 4; level++) {
        GFX.level = level; applyGfxLevel();
        const cv = document.createElement('canvas'); cv.width = cv.height = 200;
        drawShadowBody(cv.getContext('2d'), {kind:'boss', type:'boss'}, 100, 100, 35, 330, 0, {glint:'#8b91a8'});
        outputs.push(cv.toDataURL());
      }
      if (!outputs.every(v => v === outputs[0])) throw Error('Quality changed silhouette');
      return { archetypes: kinds.length, animated: hashes.size, qualityLevels: outputs.length };
    });
    await page.locator('#shadow-roster').screenshot({ path: path.join(root, 'artifacts/living-shadows.png') });
    assert.deepStrictEqual(errors, []);
    console.log(JSON.stringify({ ...report, errors, status: 'passed' }, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
