const WG = {
  ok: false,
  canvas: null,
  gl: null,
  ext: null,
  prog: null,
  quad: null,
  loc: null,
  cols: null,
  dcols: null,
  buckets: [],
  dbuckets: [],
  glbuf: [],
  dglbuf: [],
  bakes: 0,
  hits: 0,
  empty: new Set(),
  emptyLR: 30000,
  gp: new Float32Array(40 * 4),
  nobake: null,
  last: null
};

function wgParseHex(hex) {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255
  ];
}

function wgInit() {
  try {
    const c = document.createElement('canvas');
    c.width = Math.max(1, canvas.width);
    c.height = Math.max(1, canvas.height);
    const gl = c.getContext('webgl', {
      alpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true
    });
    if (!gl) return;
    const ext = gl.getExtension('ANGLE_instanced_arrays');
    if (!ext) return;

    const vsSrc = [
      'precision highp float;',
      'attribute vec2 a_quad;',
      'attribute vec2 a_root;',
      'attribute vec2 a_size;',
      'uniform vec2 u_cam;',
      'uniform vec2 u_res;',
      'uniform float u_scale;',
      'uniform float u_time;',
      'uniform float u_glintPx;',
      'uniform float u_width;',
      'uniform vec2 u_windDir;',
      'uniform float u_windSpeed;',
      'uniform vec4 u_gp[40];',
      'uniform int u_gpCount;',
      'uniform float u_gpInvR2;',
      'uniform float u_gpStr;',
      'uniform sampler2D u_trampleTex;',
      'uniform vec2 u_trampleOrigin;',
      'uniform vec2 u_trampleSize;',
      'uniform float u_trampleStr;',
      'varying float v_lit;',
      'void main() {',
      '  float gh = a_size.x, le = a_size.y;',
      '  float wx = a_root.x, wy = a_root.y;',
      '  float ps = wx * 0.998 + wy * 0.063;',
      '  float pp = wy * 0.998 - wx * 0.063;',
      '  float wave = sin(ps * 0.0030 - u_time * 0.00075);',
      '  float ripp = sin(ps * 0.0058 - u_time * 0.00030 + sin(pp * 0.0055) * 1.7) * 0.5;',
      '  float sway = cos(ps * 0.0014 - u_time * 0.00018 + pp * 0.002) * 0.6;',
      '  float osc = wave * 0.50 + ripp * 0.34 + sway * 0.16;',
      '  float bend = clamp(0.55 + osc * 0.45, 0.0, 1.0);',
      '  float lit = smoothstep(0.45, 0.75, bend);',
      '  float gust = 0.8 + 0.2 * clamp(u_windSpeed, 0.4, 1.6);',
      '  float k = bend * 0.6 * (1.0 + lit * 1.6) * gust;',
      '  float fold = 1.0 - bend * 0.2;',
      '  v_lit = lit;',
      '  float ls = sqrt(u_windDir.x * u_windDir.x + u_windDir.y * u_windDir.y) + 1e-6;',
      '  float lx = u_windDir.x / ls, ly = u_windDir.y / ls;',
      '  float h = a_quad.y;',
      '  float tipX = a_root.x + (le + k * gh) * lx;',
      '  float tipY = a_root.y - gh * fold + (le + k * gh) * ly;',
      '  vec2 psx = vec2(0.0);',
      '  for (int i = 0; i < 40; i++) {',
      '    if (i >= u_gpCount) break;',
      '    vec2 d = a_root.xy - u_gp[i].xy;',
      '    float w = exp(-dot(d, d) * u_gpInvR2);',
      '    psx += u_gp[i].zw * w;',
      '  }',
      // Persistent trample mask: bilinear-sampled walk path. R holds the flatten
      // amount, G/B the direction scaled by it, so 2*G/B - R decodes to
      // amount * direction and blends smoothly across the path edge.
      '  vec4 tr = texture2D(u_trampleTex, (a_root.xy - u_trampleOrigin) / u_trampleSize);',
      '  psx += (tr.gb * 2.0 - vec2(tr.r)) * u_trampleStr;',
      '  float gpm = length(psx);',
      '  float bv0x = tipX - a_root.x, bv0y = tipY - a_root.y;',
      '  float len0 = sqrt(bv0x * bv0x + bv0y * bv0y);',
      '  tipX += psx.x * gh * u_gpStr;',
      '  tipY += psx.y * gh * u_gpStr - gpm * gh * 0.08;',
      '  float bv1x = tipX - a_root.x, bv1y = tipY - a_root.y;',
      '  float len1 = sqrt(bv1x * bv1x + bv1y * bv1y);',
      '  if (len1 > len0 && len0 > 0.5) { tipX = a_root.x + bv1x * len0 / len1; tipY = a_root.y + bv1y * len0 / len1; }',
      '  float px = mix(a_root.x, tipX, h * h);',
      '  float py = mix(a_root.y, tipY, h);',
      '  vec2 pos = vec2(px, py);',
      '  vec2 dev = (pos - u_cam) * u_scale;',
      '  dev.x += (a_quad.x - 0.5) * u_scale * (3.0 - 2.0 * h * h) * (1.0 + 0.25 * v_lit) * u_width;',
      '  gl_Position = vec4(dev.x / u_res.x * 2.0 - 1.0, 1.0 - dev.y / u_res.y * 2.0, 0.0, 1.0);',
      '}'
    ].join('\n');
    const fsSrc = [
      'precision mediump float;',
      'uniform vec3 u_light;',
      'uniform vec3 u_glint;',
      'varying float v_lit;',
      'void main() { gl_FragColor = vec4(mix(u_light, u_glint, v_lit * 0.55), 1.0); }'
    ].join('\n');

    function shader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    }
    const vs = shader(gl.VERTEX_SHADER, vsSrc);
    const fs = shader(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);

    WG.canvas = c;
    WG.gl = gl;
    WG.ext = ext;
    WG.prog = prog;
    WG.quad = quad;
    WG.loc = {
      a_quad: gl.getAttribLocation(prog, 'a_quad'),
      a_root: gl.getAttribLocation(prog, 'a_root'),
      a_size: gl.getAttribLocation(prog, 'a_size'),
      u_cam: gl.getUniformLocation(prog, 'u_cam'),
      u_res: gl.getUniformLocation(prog, 'u_res'),
      u_scale: gl.getUniformLocation(prog, 'u_scale'),
      u_time: gl.getUniformLocation(prog, 'u_time'),
      u_glintPx: gl.getUniformLocation(prog, 'u_glintPx'),
      u_width: gl.getUniformLocation(prog, 'u_width'),
      u_windDir: gl.getUniformLocation(prog, 'u_windDir'),
      u_windSpeed: gl.getUniformLocation(prog, 'u_windSpeed'),
      u_gp: gl.getUniformLocation(prog, 'u_gp'),
      u_gpCount: gl.getUniformLocation(prog, 'u_gpCount'),
      u_gpInvR2: gl.getUniformLocation(prog, 'u_gpInvR2'),
      u_gpStr: gl.getUniformLocation(prog, 'u_gpStr'),
      u_trampleTex: gl.getUniformLocation(prog, 'u_trampleTex'),
      u_trampleOrigin: gl.getUniformLocation(prog, 'u_trampleOrigin'),
      u_trampleSize: gl.getUniformLocation(prog, 'u_trampleSize'),
      u_trampleStr: gl.getUniformLocation(prog, 'u_trampleStr'),
      u_light: gl.getUniformLocation(prog, 'u_light'),
      u_glint: gl.getUniformLocation(prog, 'u_glint')
    };
    WG.cols = GRASS_WIND_TYPES.map(function (ty) {
      return [wgParseHex(ty.light), wgParseHex(ty.glint)];
    });
    WG.dcols = GRASS_WIND_TYPES.map(function (ty) {
      return [wgParseHex(ty.dark), wgParseHex(ty.dark)];
    });
    WG.wind = GRASS_WIND_TYPES.map(function (ty) {
      return ty.wind || [1, 0, 1];
    });
    // Trample texture: the persistent walk mask lives in a master canvas that
    // is rebuilt from trampleTiles (13-render.js) and uploaded here. One texel
    // equals TRAMPLE_CELL world px, so the shader samples it per blade root.
    const trampleTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, trampleTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    WG.trampleTex = trampleTex;
    WG.trample = { cv: null, ctx: null, cols: 0, rows: 0, ox: 0, oy: 0, key: '', needUpload: false, lastRev: -1 };
    WG.ok = true;
  } catch (e) {
    WG.ok = false;
  }
}
wgInit();

function wgGrow(gi, need) {
  let b = WG.buckets[gi];
  if (!b) b = WG.buckets[gi] = { f32: new Float32Array(4096 * 4), n: 0 };
  if (need * 4 > b.f32.length) {
    let cap = b.f32.length / 4;
    while (cap < need) cap *= 2;
    const nf = new Float32Array(cap * 4);
    nf.set(b.f32);
    b.f32 = nf;
  }
  return b;
}

function wgRender(cx, cy, w, h, t) {
  const gl = WG.gl, c = WG.canvas, L = WG.loc;
  const _t0 = performance.now();
  if (c.width !== canvas.width || c.height !== canvas.height) {
    c.width = canvas.width;
    c.height = canvas.height;
  }
  gl.viewport(0, 0, c.width, c.height);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(WG.prog);
  const _t1 = performance.now();

  const firstTx = Math.floor(cx / TILE) - 1, firstTy = Math.floor(cy / TILE) - 1;
  const lastTx = Math.floor((cx + w) / TILE) + 1, lastTy = Math.floor((cy + h) / TILE) + 1;
  for (let i = 0; i < WG.buckets.length; i++) {
    if (WG.buckets[i]) WG.buckets[i].n = 0;
    if (WG.dbuckets[i]) WG.dbuckets[i].n = 0;
  }
  const _g0 = performance.now();

  for (let ty = firstTy; ty <= lastTy; ty++) {
    for (let tx = firstTx; tx <= lastTx; tx++) {
      if (GFX.level >= 2 && ((tx + ty) & 1)) continue;
      const key = tx + ',' + ty;
      let ent = grassLightCache.get(key);
      if (ent === undefined) {
        if (WG.empty.has(key)) continue;
        ent = bakeGrassLight(tx, ty);
        WG.bakes++;
        if (ent) {
          grassLightCache.set(key, ent);
          if (grassLightCache.size > GRASS_WIND_LR) {
            grassLightCache.delete(grassLightCache.keys().next().value);
          }
        } else {
          WG.empty.add(key);
          if (WG.empty.size > WG.emptyLR) {
            WG.empty.delete(WG.empty.keys().next().value);
          }
        }
      } else {
        WG.hits++;
      }
      if (!ent) continue;
      const blades = ent.d.length / 4;
      const dblades = ent.dd.length / 4;
      const b = wgGrow(ent.gi, (WG.buckets[ent.gi] ? WG.buckets[ent.gi].n : 0) + blades);
      const db = wgGrow(ent.gi, (WG.dbuckets[ent.gi] ? WG.dbuckets[ent.gi].n : 0) + dblades);
      const f = b.f32;
      const df = db.f32;
      const d = ent.d;
      const dd = ent.dd;
      const bx = tx * TILE, by = ty * TILE;
      let o = b.n * 4;
      for (let j = 0; j < d.length; j += 4) {
        f[o] = bx + d[j];
        f[o + 1] = by + d[j + 1];
        f[o + 2] = d[j + 2];
        f[o + 3] = d[j + 3];
        o += 4;
      }
      b.n += blades;
      let oo = db.n * 4;
      for (let j = 0; j < dd.length; j += 4) {
        df[oo] = bx + dd[j];
        df[oo + 1] = by + dd[j + 1];
        df[oo + 2] = dd[j + 2];
        df[oo + 3] = dd[j + 3];
        oo += 4;
      }
      db.n += dblades;
    }
  }
  const _g1 = performance.now();
  const _t2 = performance.now();

  gl.bindBuffer(gl.ARRAY_BUFFER, WG.quad);
  gl.enableVertexAttribArray(L.a_quad);
  gl.vertexAttribPointer(L.a_quad, 2, gl.FLOAT, false, 0, 0);
  WG.ext.vertexAttribDivisorANGLE(L.a_quad, 0);

  gl.uniform2f(L.u_cam, cx, cy);
  gl.uniform2f(L.u_res, c.width, c.height);
  gl.uniform1f(L.u_scale, DPR * GFX.pixelScale);
  gl.uniform1f(L.u_time, t);
  gl.uniform1f(L.u_glintPx, GRASS_GLINT_PX);
  const gP = typeof game !== 'undefined' && game && game.grassPushes ? game.grassPushes : null;
  if (gP && gP.length) {
    const n = Math.min(gP.length, 40);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      WG.gp[o] = gP[i].x; WG.gp[o + 1] = gP[i].y;
      WG.gp[o + 2] = gP[i].z; WG.gp[o + 3] = gP[i].w;
    }
    for (let i = n * 4; i < WG.gp.length; i++) WG.gp[i] = 0;
    gl.uniform1f(L.u_gpInvR2, 1 / (GRASS_PUSH_R * GRASS_PUSH_R));
    gl.uniform1f(L.u_gpStr, GRASS_PUSH_STR);
    gl.uniform1i(L.u_gpCount, n);
    gl.uniform4fv(L.u_gp, WG.gp.subarray(0, 40 * 4));
  } else {
    gl.uniform1i(L.u_gpCount, 0);
  }

  // Persistent trample: a master canvas covering the viewport (tile-aligned so
  // the window only scrolls in whole tiles) is built from the shared
  // trampleTiles cache; it's re-uploaded when it scrolls or a new footprint
  // landed. The vertex shader samples it per blade root.
  const TR_S = 16;
  const tcols = Math.ceil((w + TR_S * 2) / TRAMPLE_CELL) + 1;
  const trows = Math.ceil((h + TR_S * 2) / TRAMPLE_CELL) + 1;
  let tb = WG.trample;
  if (!tb.cv || tb.cols !== tcols || tb.rows !== trows) {
    tb.cols = tcols; tb.rows = trows;
    tb.cv = document.createElement('canvas');
    tb.cv.width = tcols; tb.cv.height = trows;
    tb.ctx = tb.cv.getContext('2d');
    tb.key = '';
  }
  const mox = Math.floor((cx - TR_S) / TILE) * TILE;
  const moy = Math.floor((cy - TR_S) / TILE) * TILE;
  tb.ox = mox; tb.oy = moy;
  const wkey = mox + ',' + moy;
  if (wkey !== tb.key || trampleRev !== tb.lastRev) {
    const tctx = tb.ctx;
    if (wkey !== tb.key) {
      tb.key = wkey;
      tctx.clearRect(0, 0, tcols, trows);
    }
    const t0x = Math.floor(mox / TILE), t0y = Math.floor(moy / TILE);
    const tCX = (tcols * TRAMPLE_CELL) / TILE, tCY = (trows * TRAMPLE_CELL) / TILE;
    for (let ty = t0y; ty < t0y + tCY + 1; ty++) {
      for (let tx = t0x; tx < t0x + tCX + 1; tx++) {
        const t = trampleTiles.get(tx + ',' + ty);
        if (!t) continue;
        tctx.putImageData(new ImageData(t, TRAMPLE_A, TRAMPLE_A),
          (tx * TILE - mox) / TRAMPLE_CELL, (ty * TILE - moy) / TRAMPLE_CELL);
      }
    }
    tb.lastRev = trampleRev;
    tb.needUpload = true;
  }
  if (tb.needUpload) {
    gl.bindTexture(gl.TEXTURE_2D, WG.trampleTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tb.cv);
    tb.needUpload = false;
  }
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, WG.trampleTex);
  gl.uniform1i(L.u_trampleTex, 0);
  gl.uniform2f(L.u_trampleOrigin, mox, moy);
  gl.uniform2f(L.u_trampleSize, tcols * TRAMPLE_CELL, trows * TRAMPLE_CELL);
  gl.uniform1f(L.u_trampleStr, GRASS_TRAMPLE_STR);

  for (let gi = 0; gi < WG.dbuckets.length; gi++) {
    const db = WG.dbuckets[gi];
    if (!db || !db.n) continue;
    let gb = WG.dglbuf[gi];
    if (!gb) gb = WG.dglbuf[gi] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gb);
    gl.bufferData(gl.ARRAY_BUFFER, db.f32.subarray(0, db.n * 4), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(L.a_root);
    gl.vertexAttribPointer(L.a_root, 2, gl.FLOAT, false, 16, 0);
    WG.ext.vertexAttribDivisorANGLE(L.a_root, 1);
    gl.enableVertexAttribArray(L.a_size);
    gl.vertexAttribPointer(L.a_size, 2, gl.FLOAT, false, 16, 8);
    WG.ext.vertexAttribDivisorANGLE(L.a_size, 1);
    gl.uniform3fv(L.u_light, WG.dcols[gi][0]);
    gl.uniform3fv(L.u_glint, WG.dcols[gi][1]);
    gl.uniform1f(L.u_width, GRASS_WIND_TYPES[gi].dw || 2);
    const wind = WG.wind[gi] || [1, 0, 1];
    gl.uniform2f(L.u_windDir, wind[0], wind[1]);
    gl.uniform1f(L.u_windSpeed, wind[2]);
    WG.ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, db.n);
  }

  for (let gi = 0; gi < WG.buckets.length; gi++) {
    const b = WG.buckets[gi];
    if (!b || !b.n) continue;
    let gb = WG.glbuf[gi];
    if (!gb) gb = WG.glbuf[gi] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gb);
    gl.bufferData(gl.ARRAY_BUFFER, b.f32.subarray(0, b.n * 4), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(L.a_root);
    gl.vertexAttribPointer(L.a_root, 2, gl.FLOAT, false, 16, 0);
    WG.ext.vertexAttribDivisorANGLE(L.a_root, 1);
    gl.enableVertexAttribArray(L.a_size);
    gl.vertexAttribPointer(L.a_size, 2, gl.FLOAT, false, 16, 8);
    WG.ext.vertexAttribDivisorANGLE(L.a_size, 1);
    gl.uniform1f(L.u_width, 1);
    gl.uniform3fv(L.u_light, WG.cols[gi][0]);
    gl.uniform3fv(L.u_glint, WG.cols[gi][1]);
    const wind = WG.wind[gi] || [1, 0, 1];
    gl.uniform2f(L.u_windDir, wind[0], wind[1]);
    gl.uniform1f(L.u_windSpeed, wind[2]);
    WG.ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, b.n);
  }
  const _t3 = performance.now();
  WG.ms = { setup: _t1 - _t0, fill: _t2 - _t1, draw: _t3 - _t2 };
}
