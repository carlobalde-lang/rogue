// Pixel-styled icons: the original emoji glyphs (kept in each def's `icon`
// field) are rasterized onto a small offscreen canvas and scaled DOWN with
// nearest-neighbor sampling, then posterized like the PixelIt effect, so they
// render as chunky, flat-color pixel art. No frame, no background, no assets.
//
// Usage:
//   pixelIconHTML('w', weaponId, sizePx)  // weapons  (size gets doubled)
//   pixelIconHTML('p', passiveId, sizePx) // passives
//   pixelIconHTML('c', charId,   sizePx)  // characters
//   pixelIconHTML('u', upgradeId,sizePx)  // meta upgrades
// Returns an <img> (data-URL) styled with .pix-ico.

(function () {
  const CACHE = {};
  const S = 24;

  // The original emoji lives in the defs' `icon` fields, so we never
  // duplicate the glyph list here.
  function emojiFor(kind, id) {
    if (kind === 'w') return WEAPON_DEFS[id] && WEAPON_DEFS[id].icon;
    if (kind === 'p') return PASSIVE_DEFS[id] && PASSIVE_DEFS[id].icon;
    if (kind === 'u') {
      const u = META_UPGRADES.find(x => x.id === id);
      return u && u.icon;
    }
    if (kind === 'c') {
      const c = META_CHARS.find(x => x.id === id);
      return c && c.icon;
    }
    return null;
  }

  const px = document.createElement('canvas');
  px.width = S; px.height = S;
  const g = px.getContext('2d', { willReadFrequently: true });
  const src = document.createElement('canvas');
  src.width = 96; src.height = 96;
  const sc = src.getContext('2d');

  // PixelIt-style posterize: clamp every channel to `levels` flat bands so
  // the emoji's gradients collapse into a chunky, retro palette.
  function posterize(data, levels) {
    const step = 256 / levels;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.floor(data[i] / step) * step);
      data[i + 1] = Math.min(255, Math.floor(data[i + 1] / step) * step);
      data[i + 2] = Math.min(255, Math.floor(data[i + 2] / step) * step);
    }
  }

  function renderIcon(kind, id) {
    // Rasterize the emoji at hi-res first...
    sc.clearRect(0, 0, 96, 96);
    sc.font = '64px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    sc.textAlign = 'center';
    sc.textBaseline = 'middle';
    sc.fillText(emojiFor(kind, id) || '❔', 48, 50);

    // ...downscale it nearest-neighbour onto the small grid, then flatten the
    // color bands so the glyph looks like hand-made pixel art.
    g.clearRect(0, 0, S, S);
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, 96, 96, 0, 0, S, S);
    const img = g.getImageData(0, 0, S, S);
    posterize(img.data, 6);
    g.putImageData(img, 0, 0);
    return px.toDataURL();
  }

  // Tiny 5x7 pixel font for the title banner. Rows stored as 5-bit numbers
  // (bit 4 = leftmost pixel). Covers the letters used by "SHADOW SURVIVORS".
  const PIX_FONT = {
    A: [14, 17, 17, 31, 17, 17, 17],
    B: [30, 17, 17, 30, 17, 17, 30],
    C: [15, 16, 16, 16, 16, 16, 15],
    D: [30, 17, 17, 17, 17, 17, 30],
    E: [31, 16, 16, 30, 16, 16, 31],
    F: [31, 16, 16, 30, 16, 16, 16],
    H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14],
    O: [14, 17, 17, 17, 17, 17, 14],
    R: [30, 17, 17, 30, 20, 18, 17],
    S: [15, 16, 16, 14, 1, 1, 30],
    U: [17, 17, 17, 17, 17, 17, 14],
    V: [17, 17, 17, 17, 17, 10, 4],
    W: [17, 17, 17, 21, 21, 21, 10]
  };

  function pixelTitleCanvas(text) {
    const L = 6, H = 7;
    const t = text.toUpperCase();
    const cv = document.createElement('canvas');
    cv.width = t.length * L - 1;
    cv.height = H;
    const g = cv.getContext('2d');
    const rows = [];
    for (let ci = 0; ci < t.length; ci++) {
      const glyph = PIX_FONT[t[ci]];
      for (let r = 0; r < H; r++) {
        const row = (glyph && glyph[r]) || 0;
        for (let b = 0; b < 5; b++) {
          if (row & (16 >> b)) rows.push([ci * L + b, r]);
        }
      }
    }
    g.fillStyle = '#4d3507';
    for (let i = 0; i < rows.length; i++) g.fillRect(rows[i][0] + 1, rows[i][1] + 1, 1, 1);
    g.fillStyle = '#ffd700';
    for (let i = 0; i < rows.length; i++) g.fillRect(rows[i][0], rows[i][1], 1, 1);
    return cv;
  }

  window.pixelTitleHTML = function (text) {
    const cv = pixelTitleCanvas(text);
    return '<img class="pix-title" src="' + cv.toDataURL() + '" alt="' + text + '">';
  };

  // Replace the text-based start title with the pixel-art banner. The element
  // already exists because the script tags sit at the end of the body.
  function wirePixelTitle() {
    const el = document.getElementById('start-title');
    if (el && !el.dataset.pixdone) {
      el.dataset.pixdone = '1';
      el.innerHTML = pixelTitleHTML('SHADOW SURVIVORS');
    }
  }

  // Run right away (script tags are at the end of <body>) or after DOM ready.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wirePixelTitle);
  } else {
    wirePixelTitle();
  }

  function dataUrl(kind, id) {
    const key = kind + ':' + id;
    if (!CACHE[key]) CACHE[key] = renderIcon(kind, id);
    return CACHE[key];
  }

  window.pixelIconHTML = function (kind, id, size) {
    const s = Math.max(10, (size || 28) * 2);
    return '<img class="pix-ico" src="' + dataUrl(kind, id) + '" width="' + s + '" height="' + s + '" alt="">';
  };

  // Copy for canvas rendering (floating statue icons and the like). Cached
  // once per icon; an unloaded image renders nothing, so drawing is guarded.
  const IMG_CACHE = {};
  window.pixelIconImage = function (kind, id) {
    const key = kind + ':' + id;
    if (!IMG_CACHE[key]) {
      const img = new Image();
      img.src = dataUrl(kind, id);
      IMG_CACHE[key] = img;
    }
    return IMG_CACHE[key];
  };
})();