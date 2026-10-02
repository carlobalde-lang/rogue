// Condensed darkness: a solid ink heart, drifting smoke and unstable silhouettes.
// Animation frames are baked lazily at a shared size, independent of enemy HP,
// radius and heading. Swarms reuse the same bounded set of pixel sprites.
const SHADOW_FRAMES = 10;
const SHADOW_SPAN = 192;
const SHADOW_RADIUS = 32;
const SHADOW_PROFILES = {
  normal:      { width: .78, height: 1.0, arms: 2, eyes: 2 },
  swarmling:   { width: .58, height: .62, arms: 3, eyes: 1, ragged: true },
  runner:      { width: 1.1, height: .50, arms: 2, eyes: 1, dart: true },
  brute:       { width: 1.12, height: .92, arms: 2, eyes: 2, heavy: true },
  shielded:    { width: .86, height: 1.05, arms: 2, eyes: 2, layered: true },
  splitter:    { width: .64, height: .87, arms: 3, eyes: 2, split: true },
  caster:      { width: .65, height: 1.15, arms: 2, eyes: 1, hood: true },
  leecher:     { width: .75, height: 1.12, arms: 3, eyes: 2, maw: true },
  frostling:   { width: .74, height: 1.03, arms: 2, eyes: 2, shards: true },
  pinewraith:  { width: .46, height: 1.42, arms: 3, eyes: 2, branches: true },
  dunerunner:  { width: 1.18, height: .48, arms: 3, eyes: 1, dart: true },
  canyongolem: { width: 1.13, height: 1.03, arms: 2, eyes: 2, heavy: true, fissures: true },
  scorcher:    { width: .67, height: 1.14, arms: 2, eyes: 1, hood: true, fissures: true },
  riverwisp:   { width: .57, height: 1.12, arms: 3, eyes: 2, flowing: true },
  dryadseer:   { width: .64, height: 1.13, arms: 3, eyes: 1, hood: true, branches: true },
  boghaunt:    { width: 1.02, height: .96, arms: 4, eyes: 2, maw: true },
  elite:      { width: .94, height: 1.12, arms: 2, eyes: 2, horns: 2, layered: true },
  warden:     { width: 1.10, height: 1.18, arms: 3, eyes: 2, horns: 4, heavy: true },
  boss:       { width: 1.12, height: 1.30, arms: 4, eyes: 2, horns: 3, sovereign: true },
  guardian:   { width: 1.08, height: 1.25, arms: 4, eyes: 3, horns: 5, sovereign: true }
};

// Subtle per-archetype undertones; generated once in the shared sprite cache.
const SHADOW_TINTS = {
  normal: '#77619b', swarmling: '#5856bd', runner: '#ae454e',
  brute: '#38754f', shielded: '#4d668c', splitter: '#797043',
  caster: '#b24bb4', leecher: '#923e68', frostling: '#49a1c6',
  pinewraith: '#319b78', dunerunner: '#a37949', canyongolem: '#916052',
  scorcher: '#ac583b', riverwisp: '#447f8b', dryadseer: '#8b9237',
  boghaunt: '#8c6f32', elite: '#6849b6', warden: '#7c677e',
  boss: '#ae3745', guardian: '#897451'
};

function shadowAccent(hex, kind) {
  const source = /^#[0-9a-f]{6}$/i.test(hex || '') ? hexRgb(hex) : [154, 126, 194];
  const tint = hexRgb(SHADOW_TINTS[kind] || SHADOW_TINTS.normal);
  const shade = (scale, base) => 'rgb(' + tint.map(v => Math.round(v * scale + base)).join(',') + ')';
  // Nearly black bodies, slightly coloured folds, and a pale supernatural gaze.
  return {
    ink: shade(.19, 5), fold: shade(.30, 10), limb: shade(.23, 7), plate: shade(.32, 12),
    eyes: 'rgb(' + tint.map((v, i) => Math.round(v * .65 + source[i] * .12 + 75)).join(',') + ')',
    rim: shade(.35, 24), vein: shade(.40, 26)
  };
}

function shadowShape(c, profile, phase, offset = 0) {
  const R = SHADOW_RADIUS, w = R * profile.width, h = R * profile.height;
  const points = [], n = profile.ragged ? 20 : 28;
  for (let i = 0; i < n; i++) {
    const a = i * PI2 / n;
    const sx = Math.cos(a), sy = Math.sin(a);
    const wobble = 1 + .07 * Math.sin(i * 2.13 + phase) + .035 * Math.cos(i * 3.1 - phase);
    // A pointed hood and shoulders pour down into a torn, asymmetric hem.
    let taper = sy < -.45 ? .55 : sy > .25 ? .8 : 1;
    if (profile.heavy) taper = sy < -.7 ? .65 : 1;
    let x = sx * w * taper * wobble + offset;
    let y = sy * h * wobble;
    if (sy > .3) y += (i % 3 === 0 ? 10 : -2) + Math.sin(phase + i) * 3;
    if (profile.hood && sy < -.5) y -= (1 - Math.abs(sx)) * 9;
    if (profile.dart) { x = sx * w * (sx > 0 ? 1.18 : 1); y = sy * h * (sx > .4 ? .5 : 1); }
    if (profile.flowing) x += Math.sin(sy * 3 + phase) * 7;
    if (profile.heavy) { x = Math.round(x / 4) * 4; y = Math.round(y / 4) * 4; }
    points.push([x, y]);
  }
  c.beginPath(); c.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) c.lineTo(...points[i]);
  c.closePath();
  return points;
}

function shadowFilament(c, x, y, side, phase, length, colour, thickness) {
  // Separate tapering segments let the end dissolve instead of looking like a limb.
  for (let k = 0; k < 3; k++) {
    const start = k / 3, end = (k + 1) / 3;
    const at = t => [x + side * length * t + Math.sin(phase + t * 4) * 5 * t,
      y + length * .65 * t + Math.sin(phase * 1.3 + t * 3) * 7 * t];
    const a = at(start), b = at(end);
    c.globalAlpha = .85 - k * .23; c.strokeStyle = colour; c.lineWidth = thickness * (1 - k * .28);
    c.beginPath(); c.moveTo(...a); c.quadraticCurveTo((a[0] + b[0]) / 2 + side * 3, a[1], ...b); c.stroke();
  }
  c.globalAlpha = 1;
}

function bakeLivingShadow(kind, frame, accent) {
  const p = SHADOW_PROFILES[kind] || SHADOW_PROFILES.normal;
  const phase = frame / SHADOW_FRAMES * PI2, R = SHADOW_RADIUS;
  const cv = document.createElement('canvas'); cv.width = cv.height = SHADOW_SPAN / 2;
  const c = cv.getContext('2d'); c.scale(.5, .5); c.translate(SHADOW_SPAN / 2, SHADOW_SPAN / 2);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const colour = shadowAccent(accent, kind);

  // The dark puddle binds the apparition to the world without a circular aura.
  c.fillStyle = 'rgba(3,4,10,.3)'; c.beginPath(); c.ellipse(0, R * .87, R * p.width * 1.12, 7, 0, 0, PI2); c.fill();
  // A few offset translucent silhouettes create a smoky edge at every quality.
  for (let i = 2; i >= 0; i--) {
    c.save(); c.translate(Math.sin(phase + i * 2) * (3 + i), Math.cos(phase + i) * 3);
    c.scale(1.06 + i * .025, 1.035 + i * .02);
    shadowShape(c, p, phase + i * .24);
    c.fillStyle = colour.rim; c.globalAlpha = .09 + i * .025; c.fill(); c.restore();
  }

  // Long ragged wisps, rather than feet or solid arms.
  for (let i = 0; i < p.arms; i++) {
    const side = i % 2 ? 1 : -1, y = -R * .28 + Math.floor(i / 2) * 12;
    shadowFilament(c, side * R * p.width * .74, y, side, phase + i * 1.6,
      p.sovereign ? 31 + i * 4 : 18 + i * 3, colour.limb, p.heavy ? 9 : 6);
    shadowFilament(c, side * R * p.width * .74, y - 2, side, phase + i * 1.6,
      p.sovereign ? 31 + i * 4 : 18 + i * 3, colour.rim, 2);
  }

  const body = offset => {
    shadowShape(c, p, phase, offset);
    c.fillStyle = colour.ink; c.fill();
    c.strokeStyle = colour.rim; c.lineWidth = 2.2; c.stroke();
    c.save(); c.clip();
    // Sheets of darkness fold around a dense, nearly black heart.
    c.fillStyle = colour.fold;
    c.beginPath(); c.moveTo(offset - R * p.width, -R * .8);
    c.quadraticCurveTo(offset + 10 + Math.sin(phase) * 4, -R * .25, offset - R * .45, R * 1.3);
    c.lineTo(offset - R * 1.3, R * 1.3); c.closePath(); c.fill();
    c.strokeStyle = colour.vein; c.lineWidth = 2; c.globalAlpha = .5;
    c.beginPath(); c.moveTo(offset - R * p.width * .66, -R * .5);
    c.quadraticCurveTo(offset - 7, -9, offset - 11 + Math.sin(phase) * 4, R * .65); c.stroke();
    c.globalAlpha = 1;
    if (p.layered || p.heavy) {
      c.strokeStyle = colour.plate; c.lineWidth = p.heavy ? 5 : 3;
      for (let i = 0; i < 2; i++) {
        c.beginPath(); c.moveTo(offset - R * .8, -R * .25 + i * 9);
        c.lineTo(offset, -R * .02 + i * 9); c.lineTo(offset + R * .8, -R * .25 + i * 9); c.stroke();
      }
    }
    if (p.fissures) {
      c.strokeStyle = colour.vein; c.lineWidth = 2;
      c.beginPath(); c.moveTo(offset + 7, -R * .35); c.lineTo(offset + 2, -3);
      c.lineTo(offset + 11, 4); c.lineTo(offset + 4, R * .7); c.stroke();
    }
    if (p.maw) {
      c.fillStyle = '#02030a'; c.beginPath(); c.ellipse(offset + 2, 10, 8, 13 + Math.sin(phase) * 2, .15, 0, PI2); c.fill();
      c.strokeStyle = colour.vein; c.lineWidth = 1.5; c.stroke();
    }
    c.restore();
  };
  if (p.split) { body(-12); body(12); } else body(0);

  // Horns and branches are stretched darkness, never metal or bone.
  if (p.horns) for (let i = 0; i < p.horns; i++) {
    const x = (i - (p.horns - 1) / 2) * (p.sovereign ? 13 : 15);
    const top = -R * p.height;
    const tip = top - 11 - (i % 2 ? 1 : 9) + Math.sin(phase + i) * 2;
    c.fillStyle = colour.ink; c.strokeStyle = colour.rim; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x - 7, top + 17); c.quadraticCurveTo(x - 8, top - 3, x + Math.sin(phase + i) * 4, tip);
    c.quadraticCurveTo(x + 6, top + 2, x + 7, top + 17); c.closePath(); c.fill(); c.stroke();
  }
  if (p.branches || p.shards) for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const x = side * R * p.width * .55, y = -R * .3 - i * 9;
      c.strokeStyle = colour.rim; c.lineWidth = p.shards ? 3 : 2;
      c.beginPath(); c.moveTo(x, y + 10); c.lineTo(x + side * (10 - i * 2), y - 2);
      c.lineTo(x + side * (8 - i), y - 12 + Math.sin(phase + i) * 3); c.stroke();
    }
  }

  // Uneven pinpricks, a single slit or three eyes: life inside an opaque void.
  const gaze = offset => {
    const y = p.dart ? -3 : -R * .38;
    const blink = frame === 7 ? .5 : 1;
    for (let i = 0; i < p.eyes; i++) {
      const x = offset + (i - (p.eyes - 1) / 2) * 11 + (p.dart ? R * .55 : 0);
      c.fillStyle = colour.vein; c.globalAlpha = .55; c.fillRect(x - 5, y - 3, 10, 6);
      c.globalAlpha = 1; c.fillStyle = colour.eyes;
      c.fillRect(x - 3, y - 1 + (i % 2), p.eyes === 1 ? 7 : 5, 3 * blink);
      c.fillStyle = '#f0edf5'; c.fillRect(x - 1, y, 2, blink);
    }
  };
  if (p.split) { gaze(-12); gaze(12); } else gaze(0);

  // Shed motes rise and rejoin the body; baked rather than new game particles.
  for (let i = 0; i < (p.sovereign ? 10 : 5); i++) {
    const a = i * 2.4 + phase * .22;
    const x = Math.cos(a) * R * (p.width + .3), y = Math.sin(a) * R * p.height - Math.sin(phase + i) * 6;
    c.globalAlpha = .25 + .15 * Math.sin(phase + i); c.fillStyle = colour.rim;
    c.fillRect(x, y, i % 2 ? 2 : 3, 3 + i % 3);
  }
  c.globalAlpha = 1;
  return cv;
}

drawShadowBody = function(context, enemy, x, y, radius, time, phase, palette) {
  const kind = enemy.isGuardian ? 'guardian' : enemy.type === 'boss' ? 'boss'
    : enemy.type === 'warden' ? 'warden' : (enemy.kind || 'normal');
  const profile = SHADOW_PROFILES[kind] || SHADOW_PROFILES.normal;
  const frame = ((Math.floor(time / 110 + (phase || 0) * 1.7) % SHADOW_FRAMES) + SHADOW_FRAMES) % SHADOW_FRAMES;
  const accent = palette.glint || '#a28bbd';
  const key = kind + ':' + accent;
  let frames = shadowSpriteCache.get(key);
  if (!frames) {
    frames = []; shadowSpriteCache.set(key, frames);
    if (shadowSpriteCache.size > 48) shadowSpriteCache.delete(shadowSpriteCache.keys().next().value);
  }
  if (!frames[frame]) frames[frame] = bakeLivingShadow(kind, frame, accent);
  const scale = radius / SHADOW_RADIUS, span = SHADOW_SPAN * scale;
  context.save(); context.imageSmoothingEnabled = false; context.translate(Math.round(x), Math.round(y));
  if (profile.dart) context.rotate(enemy.faceA ?? (game && game.player ? angleTo(enemy, game.player) : 0));
  context.drawImage(frames[frame], -span / 2, -span / 2, span, span);
  if (enemy.flashTimer > 0) {
    if (!frames.hit) frames.hit = [];
    if (!frames.hit[frame]) {
      const hit = document.createElement('canvas'); hit.width = hit.height = SHADOW_SPAN / 2;
      const c = hit.getContext('2d'); c.drawImage(frames[frame], 0, 0);
      c.globalCompositeOperation = 'source-in'; c.fillStyle = '#ece0ff'; c.fillRect(0, 0, hit.width, hit.height);
      frames.hit[frame] = hit;
    }
    context.globalAlpha *= .55 * clamp(enemy.flashTimer / 100, 0, 1);
    context.drawImage(frames.hit[frame], -span / 2, -span / 2, span, span);
  }
  context.restore();
  if ((enemy.kind === 'caster' || enemy.fireRate) && enemy.fireT < 420) {
    context.save(); context.strokeStyle = '#ffad8f'; context.lineWidth = 2;
    context.beginPath(); context.moveTo(x, y - radius - 12); context.lineTo(x + 5, y - radius - 6);
    context.lineTo(x, y - radius); context.lineTo(x - 5, y - radius - 6); context.closePath(); context.stroke(); context.restore();
  }
};
