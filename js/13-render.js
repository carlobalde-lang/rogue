// ============================================================
// RENDERING
// ============================================================

// Draw a horseshoe XP-magnet pickup: a red U open at the top with silver
// pole caps (mirroring the Magnet/🧲 icon), red glow and orbiting sparks.
function drawMagnetPickup(x, y, t) {
  const pulse = 1 + Math.sin(t * 0.006) * 0.12;
  const r = 10 * pulse;
  // Outer red glow
  if (GFX.glow) {
    const grd = ctx.createRadialGradient(x, y, 2, x, y, 30 * pulse);
    grd.addColorStop(0, 'rgba(255,70,90,0.30)');
    grd.addColorStop(0.5, 'rgba(255,50,70,0.12)');
    grd.addColorStop(1, 'rgba(255,50,70,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, 30 * pulse, 0, PI2);
    ctx.fill();
  }
  // Horseshoe body (a clean U, open at the top, like the Magnet icon)
  const leg = 7 * pulse;
  const top = 10 * pulse;
  const bot = 9 * pulse;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const uPath = () => {
    ctx.beginPath();
    ctx.moveTo(x - leg, y - top);
    ctx.quadraticCurveTo(x - leg, y + bot, x, y + bot);
    ctx.quadraticCurveTo(x + leg, y + bot, x + leg, y - top);
  };
  ctx.strokeStyle = '#a31322';   // dark rim so the U reads off the ground
  ctx.lineWidth = 8;
  uPath();
  ctx.stroke();
  ctx.strokeStyle = '#ff5566';
  ctx.lineWidth = 5;
  uPath();
  ctx.stroke();
  // Silver pole caps at the open tips
  for (const sgn of [-1, 1]) {
    const tx = x + sgn * leg, ty = y - top;
    ctx.fillStyle = '#f4f6f8';
    ctx.beginPath();
    ctx.arc(tx, ty, 3.1, 0, PI2);
    ctx.fill();
    ctx.fillStyle = '#c9d0d8';
    ctx.beginPath();
    ctx.arc(tx + sgn * 0.9, ty, 2.4, 0, PI2);
    ctx.fill();
  }
  // Sparks orbiting the horseshoe
  for (let i = 0; i < 3; i++) {
    const sa = t * 0.004 + i * (PI2 / 3);
    const so = r + 6 + Math.sin(t * 0.008 + i * 2) * 2;
    ctx.fillStyle = `rgba(255,120,140,${0.35 + 0.25 * Math.sin(t * 0.01 + i)})`;
    ctx.beginPath();
    ctx.arc(x + Math.cos(sa) * so, y + Math.sin(sa) * so, 1.2, 0, PI2);
    ctx.fill();
  }
  // Twinkling sparkle at the centre
  ctx.globalAlpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.012));
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y);
  ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
}

// ============================================================
// SHARED DIRECTION
// ============================================================

function getCharacterDirection(pl) {
  const speed = Math.hypot(pl.velX, pl.velY);

  if (speed > 0.4) {
    if (Math.abs(pl.velX) > Math.abs(pl.velY)) {
      return pl.velX > 0 ? 'RIGHT' : 'LEFT';
    } else {
      return pl.velY > 0 ? 'DOWN' : 'UP';
    }
  }

  const a = pl.renderAngle;

  if (Math.abs(Math.cos(a)) > Math.abs(Math.sin(a))) {
    return Math.cos(a) > 0 ? 'RIGHT' : 'LEFT';
  }

  return Math.sin(a) > 0 ? 'DOWN' : 'UP';
}


// ============================================================
// MAGE
// ============================================================

function drawTopDownMage(x, y, pl, time) {

  const moving = Math.hypot(pl.velX, pl.velY) > 0.4;
  const dir = getCharacterDirection(pl);

  const walkFrame = moving ? Math.floor(time / 110) % 4 : 0;
  const step = moving ? [0, -2, 0, 2][walkFrame] : 0;

  const bob = moving
    ? [0, -1, 0, 1][walkFrame]
    : Math.sin(time * 0.003) * 0.35;

  const attack = pl.attackPulse > 0.01;
  const attackFrame = attack
    ? Math.min(3, Math.floor((1 - pl.attackPulse) * 4))
    : 0;

  const px = v => Math.round(v);

  ctx.save();
  ctx.translate(px(x), px(y + bob));
  ctx.imageSmoothingEnabled = false;

  const OUTLINE = '#10152b';
  const PAL = pl.palette || {};

  const BLUE_DARK  = PAL.d1 || '#17255c';
  const BLUE_DEEP  = PAL.d2 || '#20357d';
  const BLUE       = PAL.m  || '#315dcc';
  const BLUE_LIGHT = PAL.l  || '#4e82ed';

  const GOLD_DARK  = '#9b6420';
  const GOLD       = '#dca437';
  const GOLD_LIGHT = '#ffd65c';

  const SKIN      = '#e8ad86';
  const SKIN_DARK = '#a96355';

  const WOOD      = '#70452f';
  const WOOD_LIGHT = '#a06a45';

  const MAGIC_DARK  = '#2186d8';
  const MAGIC       = '#55c9ff';
  const MAGIC_LIGHT = '#d8f8ff';


  // ----------------------------------------------------------
  // SHADOW
  // ----------------------------------------------------------

  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(1, 13, 13 + (moving ? 1 : 0), 5, 0, 0, PI2);
  ctx.fill();


  // ==========================================================
  // DOWN â€” FRONT CASTING POSE
  // ==========================================================

  if (dir === 'DOWN') {

    // Feet
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-9 + step, 8, 5, 7);
    ctx.fillRect(4 - step, 8, 5, 7);

    ctx.fillStyle = BLUE_DARK;
    ctx.fillRect(-8 + step, 9, 4, 5);
    ctx.fillRect(5 - step, 9, 4, 5);


    // Robe
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.moveTo(-11, -4);
    ctx.lineTo(-9, -10);
    ctx.lineTo(-5, -13);
    ctx.lineTo(5, -13);
    ctx.lineTo(10, -9);
    ctx.lineTo(12, -3);
    ctx.lineTo(10, 9);
    ctx.lineTo(6, 13);
    ctx.lineTo(-7, 13);
    ctx.lineTo(-11, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = BLUE_DEEP;
    ctx.beginPath();
    ctx.moveTo(-9, -4);
    ctx.lineTo(-7, -8);
    ctx.lineTo(-3, -11);
    ctx.lineTo(4, -11);
    ctx.lineTo(8, -7);
    ctx.lineTo(9, -2);
    ctx.lineTo(8, 8);
    ctx.lineTo(5, 11);
    ctx.lineTo(-6, 11);
    ctx.lineTo(-9, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = BLUE;
    ctx.fillRect(-6, -8, 5, 17);

    ctx.fillStyle = BLUE_LIGHT;
    ctx.fillRect(-5, -6, 2, 7);


    // Belt
    ctx.fillStyle = GOLD_DARK;
    ctx.fillRect(-7, 8, 14, 3);

    ctx.fillStyle = GOLD;
    ctx.fillRect(-6, 8, 12, 2);

    ctx.fillStyle = GOLD_LIGHT;
    ctx.fillRect(-2, 8, 4, 1);


    // Arms forward
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-12, -3, 5, 8);
    ctx.fillRect(7, -3, 5, 8);

    ctx.fillStyle = BLUE;
    ctx.fillRect(-11, -2, 4, 6);
    ctx.fillRect(7, -2, 4, 6);

    ctx.fillStyle = SKIN;
    ctx.fillRect(-9, 3, 3, 3);
    ctx.fillRect(8, 3, 3, 3);


    // Head
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-7, -13, 14, 10);

    ctx.fillStyle = SKIN;
    ctx.fillRect(-5, -9, 10, 7);
    ctx.fillRect(-4, -2, 8, 3);

    ctx.fillStyle = SKIN_DARK;
    ctx.fillRect(-4, 1, 8, 2);


    // Hat
    ctx.fillStyle = OUTLINE;

    ctx.fillRect(-13, -14, 26, 6);
    ctx.fillRect(-10, -16, 20, 3);

    ctx.beginPath();
    ctx.moveTo(-8, -15);
    ctx.lineTo(-5, -25);
    ctx.lineTo(0, -31);
    ctx.lineTo(6, -27);
    ctx.lineTo(7, -17);
    ctx.lineTo(10, -14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = BLUE_DEEP;

    ctx.beginPath();
    ctx.moveTo(-7, -15);
    ctx.lineTo(-4, -24);
    ctx.lineTo(0, -28);
    ctx.lineTo(5, -25);
    ctx.lineTo(6, -17);
    ctx.lineTo(9, -14);
    ctx.lineTo(-9, -14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = BLUE;
    ctx.fillRect(-5, -22, 4, 7);

    ctx.fillStyle = BLUE_LIGHT;
    ctx.fillRect(-4, -22, 2, 5);

    ctx.fillStyle = GOLD;
    ctx.fillRect(-7, -15, 14, 2);


    // Staff LEFT
    const sx = -15;

    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx, 12);
    ctx.lineTo(sx - 2, -18);
    ctx.stroke();

    ctx.strokeStyle = WOOD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, 12);
    ctx.lineTo(sx - 2, -18);
    ctx.stroke();

    // Crystal
    const cx = sx - 2;
    const cy = -20;

    ctx.fillStyle = MAGIC_DARK;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 5, cy);
    ctx.lineTo(cx, cy + 5);
    ctx.lineTo(cx - 5, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = MAGIC;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx - 4, cy);
    ctx.closePath();
    ctx.fill();
  }


  // ==========================================================
  // UP â€” BACK / CLOAK POSE
  // ==========================================================

  else if (dir === 'UP') {

    // Feet
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-9 - step, 8, 5, 7);
    ctx.fillRect(4 + step, 8, 5, 7);

    ctx.fillStyle = BLUE_DARK;
    ctx.fillRect(-8 - step, 9, 4, 5);
    ctx.fillRect(5 + step, 9, 4, 5);


    // Wide back robe
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.moveTo(-10, -7);
    ctx.lineTo(-7, -12);
    ctx.lineTo(7, -12);
    ctx.lineTo(10, -7);
    ctx.lineTo(11, 9);
    ctx.lineTo(6, 13);
    ctx.lineTo(-7, 13);
    ctx.lineTo(-11, 9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = BLUE_DEEP;
    ctx.beginPath();
    ctx.moveTo(-8, -7);
    ctx.lineTo(-5, -10);
    ctx.lineTo(5, -10);
    ctx.lineTo(8, -7);
    ctx.lineTo(9, 8);
    ctx.lineTo(5, 11);
    ctx.lineTo(-6, 11);
    ctx.lineTo(-9, 8);
    ctx.closePath();
    ctx.fill();

    // Back cloak stripe
    ctx.fillStyle = BLUE;
    ctx.fillRect(-2, -9, 4, 20);

    ctx.fillStyle = BLUE_LIGHT;
    ctx.fillRect(-2, -7, 1, 10);


    // Hood from behind
    ctx.fillStyle = OUTLINE;

    ctx.beginPath();
    ctx.moveTo(-9, -10);
    ctx.lineTo(-8, -20);
    ctx.lineTo(-3, -27);
    ctx.lineTo(3, -27);
    ctx.lineTo(8, -20);
    ctx.lineTo(9, -10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = BLUE_DEEP;

    ctx.beginPath();
    ctx.moveTo(-7, -11);
    ctx.lineTo(-6, -19);
    ctx.lineTo(-2, -24);
    ctx.lineTo(2, -24);
    ctx.lineTo(6, -19);
    ctx.lineTo(7, -11);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = BLUE_LIGHT;
    ctx.fillRect(-5, -19, 2, 7);


    // Staff behind
    const sx = 14;

    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx, 13);
    ctx.lineTo(sx + 3, -18);
    ctx.stroke();

    ctx.strokeStyle = WOOD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, 13);
    ctx.lineTo(sx + 3, -18);
    ctx.stroke();

    const cx = sx + 3;
    const cy = -20;

    ctx.fillStyle = MAGIC;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx - 4, cy);
    ctx.closePath();
    ctx.fill();
  }


  // ==========================================================
  // LEFT â€” SIDE CASTING POSE
  // ==========================================================

  else if (dir === 'LEFT') {

    // Feet staggered
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-8 - step, 8, 6, 6);
    ctx.fillRect(3 + step, 9, 6, 5);

    ctx.fillStyle = BLUE_DARK;
    ctx.fillRect(-7 - step, 9, 5, 4);
    ctx.fillRect(4 + step, 10, 5, 3);


    // Body leaning LEFT
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(-9, -11);
    ctx.lineTo(-3, -13);
    ctx.lineTo(7, -10);
    ctx.lineTo(10, -2);
    ctx.lineTo(7, 10);
    ctx.lineTo(2, 13);
    ctx.lineTo(-7, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = BLUE_DEEP;
    ctx.beginPath();
    ctx.moveTo(-8, -5);
    ctx.lineTo(-7, -9);
    ctx.lineTo(-2, -11);
    ctx.lineTo(5, -9);
    ctx.lineTo(8, -2);
    ctx.lineTo(5, 8);
    ctx.lineTo(1, 11);
    ctx.lineTo(-6, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = BLUE;
    ctx.fillRect(-4, -8, 4, 17);

    ctx.fillStyle = BLUE_LIGHT;
    ctx.fillRect(-4, -6, 2, 7);


    // Arm reaching LEFT
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-13, -5, 6, 8);

    ctx.fillStyle = BLUE;
    ctx.fillRect(-12, -4, 5, 6);

    ctx.fillStyle = SKIN;
    ctx.fillRect(-14, -1, 4, 3);


    // Head shifted LEFT
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-9, -14, 14, 10);

    ctx.fillStyle = SKIN;
    ctx.fillRect(-8, -10, 8, 7);

    // Nose
    ctx.fillRect(-10, -7, 3, 3);

    ctx.fillStyle = SKIN_DARK;
    ctx.fillRect(-7, -2, 6, 2);


    // Hat leaning LEFT
    ctx.fillStyle = OUTLINE;

    ctx.fillRect(-14, -15, 25, 5);

    ctx.beginPath();
    ctx.moveTo(-10, -15);
    ctx.lineTo(-12, -22);
    ctx.lineTo(-8, -28);
    ctx.lineTo(-2, -31);
    ctx.lineTo(3, -27);
    ctx.lineTo(6, -17);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = BLUE_DEEP;

    ctx.beginPath();
    ctx.moveTo(-9, -15);
    ctx.lineTo(-10, -21);
    ctx.lineTo(-7, -26);
    ctx.lineTo(-2, -28);
    ctx.lineTo(2, -25);
    ctx.lineTo(5, -17);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = BLUE_LIGHT;
    ctx.fillRect(-8, -22, 2, 6);


    // Staff FORWARD
    const sx = -14;

    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(sx, 12);
    ctx.lineTo(sx - 7, -19);
    ctx.stroke();

    ctx.strokeStyle = WOOD;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(sx, 12);
    ctx.lineTo(sx - 7, -19);
    ctx.stroke();

    const cx = sx - 7;
    const cy = -21;

    ctx.fillStyle = MAGIC;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 5, cy);
    ctx.lineTo(cx, cy + 5);
    ctx.lineTo(cx - 5, cy);
    ctx.closePath();
    ctx.fill();
  }


  // ==========================================================
  // RIGHT â€” SIDE CASTING POSE
  // ==========================================================

  else {

    // Feet staggered opposite
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-8 + step, 9, 6, 5);
    ctx.fillRect(3 - step, 8, 6, 6);

    ctx.fillStyle = BLUE_DARK;
    ctx.fillRect(-7 + step, 10, 5, 3);
    ctx.fillRect(4 - step, 9, 5, 4);


    // Body leaning RIGHT
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.moveTo(-7, -10);
    ctx.lineTo(3, -13);
    ctx.lineTo(9, -11);
    ctx.lineTo(10, -6);
    ctx.lineTo(12, 0);
    ctx.lineTo(7, 10);
    ctx.lineTo(-2, 13);
    ctx.lineTo(-7, 10);
    ctx.lineTo(-10, -2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = BLUE_DEEP;
    ctx.beginPath();
    ctx.moveTo(-5, -9);
    ctx.lineTo(2, -11);
    ctx.lineTo(7, -9);
    ctx.lineTo(8, -5);
    ctx.lineTo(9, 0);
    ctx.lineTo(5, 8);
    ctx.lineTo(1, 11);
    ctx.lineTo(-6, 8);
    ctx.lineTo(-8, -2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = BLUE;
    ctx.fillRect(0, -8, 4, 17);

    ctx.fillStyle = BLUE_LIGHT;
    ctx.fillRect(2, -6, 2, 7);


    // Arm reaching RIGHT
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(7, -5, 6, 8);

    ctx.fillStyle = BLUE;
    ctx.fillRect(7, -4, 5, 6);

    ctx.fillStyle = SKIN;
    ctx.fillRect(10, -1, 4, 3);


    // Head shifted RIGHT
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-5, -14, 14, 10);

    ctx.fillStyle = SKIN;
    ctx.fillRect(0, -10, 8, 7);

    // Nose
    ctx.fillRect(6, -7, 3, 3);

    ctx.fillStyle = SKIN_DARK;
    ctx.fillRect(1, -2, 6, 2);


    // Hat leaning RIGHT
    ctx.fillStyle = OUTLINE;

    ctx.fillRect(-11, -15, 25, 5);

    ctx.beginPath();
    ctx.moveTo(-6, -17);
    ctx.lineTo(-3, -27);
    ctx.lineTo(2, -31);
    ctx.lineTo(8, -28);
    ctx.lineTo(12, -22);
    ctx.lineTo(10, -15);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = BLUE_DEEP;

    ctx.beginPath();
    ctx.moveTo(-5, -17);
    ctx.lineTo(-2, -26);
    ctx.lineTo(2, -28);
    ctx.lineTo(7, -26);
    ctx.lineTo(10, -21);
    ctx.lineTo(9, -16);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = BLUE_LIGHT;
    ctx.fillRect(4, -23, 2, 6);


    // Staff FORWARD
    const sx = 14;

    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(sx, 12);
    ctx.lineTo(sx + 7, -19);
    ctx.stroke();

    ctx.strokeStyle = WOOD;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(sx, 12);
    ctx.lineTo(sx + 7, -19);
    ctx.stroke();

    const cx = sx + 7;
    const cy = -21;

    ctx.fillStyle = MAGIC;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 5, cy);
    ctx.lineTo(cx, cy + 5);
    ctx.lineTo(cx - 5, cy);
    ctx.closePath();
    ctx.fill();
  }


  // ==========================================================
  // MAGE ATTACK
  // ==========================================================

  if (attack) {

    const k = attackFrame / 3;

    let ax = 0;
    let ay = -20;

    if (dir === 'LEFT') {
      ax = -21;
      ay = -21;
    } else if (dir === 'RIGHT') {
      ax = 21;
      ay = -21;
    } else if (dir === 'UP') {
      ax = 17;
      ay = -20;
    } else {
      ax = -17;
      ay = -20;
    }

    ctx.globalAlpha = 0.35 + k * 0.65;

    ctx.fillStyle = MAGIC_DARK;
    ctx.beginPath();
    ctx.arc(ax, ay, 7 + k * 6, 0, PI2);
    ctx.fill();

    ctx.fillStyle = MAGIC;
    ctx.beginPath();
    ctx.arc(ax, ay, 4 + k * 4, 0, PI2);
    ctx.fill();

    ctx.fillStyle = MAGIC_LIGHT;
    ctx.beginPath();
    ctx.arc(ax - 1, ay - 1, 2, 0, PI2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  ctx.restore();
}


// ============================================================
// RAEL â€” PYROMANCER
// ============================================================

function drawTopDownRael(x, y, pl, time) {

  const moving = Math.hypot(pl.velX, pl.velY) > 0.4;
  const dir = getCharacterDirection(pl);

  const walkFrame = moving ? Math.floor(time / 105) % 4 : 0;
  const step = moving ? [0, -2, 0, 2][walkFrame] : 0;

  const bob = moving
    ? [0, -1, 0, 1][walkFrame]
    : Math.sin(time * 0.003) * 0.35;

  const attack = pl.attackPulse > 0.01;
  const attackFrame = attack
    ? Math.min(3, Math.floor((1 - pl.attackPulse) * 4))
    : 0;

  const px = v => Math.round(v);

  ctx.save();
  ctx.translate(px(x), px(y + bob));
  ctx.imageSmoothingEnabled = false;

  const OUTLINE = '#17121a';
  const PAL = pl.palette || {};

  const RED_DARK  = PAL.d1 || '#641d25';
  const RED_DEEP  = PAL.d2 || '#8f292c';
  const RED       = PAL.m  || '#c63c30';
  const RED_LIGHT = PAL.l  || '#ef6040';

  const FIRE_DARK  = '#b82d18';
  const FIRE        = '#ff612e';
  const FIRE_LIGHT = '#ffd45a';

  const SKIN      = '#e3a17c';
  const SKIN_DARK = '#9d5c4e';

  const WOOD = '#70402b';


  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.44)';
  ctx.beginPath();
  ctx.ellipse(1, 13, 13 + (moving ? 1 : 0), 5, 0, 0, PI2);
  ctx.fill();


  // ==========================================================
  // DOWN â€” AGGRESSIVE FIRE CAST
  // ==========================================================

  if (dir === 'DOWN') {

    // Feet
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-9 + step, 8, 5, 7);
    ctx.fillRect(4 - step, 8, 5, 7);

    ctx.fillStyle = RED_DARK;
    ctx.fillRect(-8 + step, 9, 4, 5);
    ctx.fillRect(5 - step, 9, 4, 5);


    // Robe
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.moveTo(-11, -5);
    ctx.lineTo(-8, -11);
    ctx.lineTo(-4, -14);
    ctx.lineTo(5, -13);
    ctx.lineTo(10, -8);
    ctx.lineTo(12, 0);
    ctx.lineTo(9, 10);
    ctx.lineTo(5, 13);
    ctx.lineTo(-7, 13);
    ctx.lineTo(-11, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = RED_DEEP;
    ctx.beginPath();
    ctx.moveTo(-9, -5);
    ctx.lineTo(-7, -9);
    ctx.lineTo(-3, -12);
    ctx.lineTo(4, -11);
    ctx.lineTo(8, -7);
    ctx.lineTo(9, 0);
    ctx.lineTo(7, 8);
    ctx.lineTo(4, 11);
    ctx.lineTo(-6, 11);
    ctx.lineTo(-9, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = RED;
    ctx.fillRect(-5, -8, 4, 18);

    ctx.fillStyle = RED_LIGHT;
    ctx.fillRect(-4, -6, 2, 8);


    // Fire belt
    ctx.fillStyle = FIRE_DARK;
    ctx.fillRect(-7, 8, 14, 3);

    ctx.fillStyle = FIRE;
    ctx.fillRect(-6, 8, 12, 2);


    // Arms raised
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-12, -5, 5, 8);
    ctx.fillRect(7, -5, 5, 8);

    ctx.fillStyle = RED;
    ctx.fillRect(-11, -4, 4, 6);
    ctx.fillRect(7, -4, 4, 6);

    ctx.fillStyle = SKIN;
    ctx.fillRect(-10, -1, 3, 3);
    ctx.fillRect(9, -1, 3, 3);


    // Head
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-7, -14, 14, 10);

    ctx.fillStyle = SKIN;
    ctx.fillRect(-5, -10, 10, 7);
    ctx.fillRect(-4, -3, 8, 3);


    // Hood
    ctx.fillStyle = OUTLINE;

    ctx.beginPath();
    ctx.moveTo(-10, -13);
    ctx.lineTo(-7, -20);
    ctx.lineTo(-3, -24);
    ctx.lineTo(3, -24);
    ctx.lineTo(8, -20);
    ctx.lineTo(10, -13);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = RED_DEEP;

    ctx.beginPath();
    ctx.moveTo(-8, -14);
    ctx.lineTo(-6, -19);
    ctx.lineTo(-2, -22);
    ctx.lineTo(3, -22);
    ctx.lineTo(6, -19);
    ctx.lineTo(8, -14);
    ctx.closePath();
    ctx.fill();


    // Staff in front
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(13, 12);
    ctx.lineTo(17, -19);
    ctx.stroke();

    ctx.strokeStyle = WOOD;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(13, 12);
    ctx.lineTo(17, -19);
    ctx.stroke();

    // Fire
    ctx.fillStyle = FIRE_DARK;
    ctx.beginPath();
    ctx.moveTo(17, -14);
    ctx.lineTo(11, -18);
    ctx.lineTo(14, -24);
    ctx.lineTo(18, -30);
    ctx.lineTo(20, -23);
    ctx.lineTo(24, -27);
    ctx.lineTo(23, -18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = FIRE;
    ctx.beginPath();
    ctx.moveTo(18, -16);
    ctx.lineTo(15, -20);
    ctx.lineTo(18, -26);
    ctx.lineTo(20, -20);
    ctx.lineTo(22, -23);
    ctx.lineTo(22, -18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = FIRE_LIGHT;
    ctx.fillRect(18, -21, 3, 4);
  }


  // ==========================================================
  // UP â€” FLAME / CLOAK FROM BEHIND
  // ==========================================================

  else if (dir === 'UP') {

    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-9 - step, 8, 5, 7);
    ctx.fillRect(4 + step, 8, 5, 7);

    ctx.fillStyle = RED_DARK;
    ctx.fillRect(-8 - step, 9, 4, 5);
    ctx.fillRect(5 + step, 9, 4, 5);


    // Cloak
    ctx.fillStyle = OUTLINE;

    ctx.beginPath();
    ctx.moveTo(-10, -7);
    ctx.lineTo(-7, -13);
    ctx.lineTo(7, -13);
    ctx.lineTo(10, -7);
    ctx.lineTo(11, 10);
    ctx.lineTo(6, 13);
    ctx.lineTo(-7, 13);
    ctx.lineTo(-11, 9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = RED_DEEP;

    ctx.beginPath();
    ctx.moveTo(-8, -7);
    ctx.lineTo(-5, -11);
    ctx.lineTo(5, -11);
    ctx.lineTo(8, -7);
    ctx.lineTo(9, 9);
    ctx.lineTo(5, 11);
    ctx.lineTo(-6, 11);
    ctx.lineTo(-9, 8);
    ctx.closePath();
    ctx.fill();

    // Central fire rune
    ctx.fillStyle = FIRE;
    ctx.fillRect(-2, -6, 4, 12);

    ctx.fillStyle = FIRE_LIGHT;
    ctx.fillRect(-1, -4, 2, 5);


    // Hood back
    ctx.fillStyle = OUTLINE;

    ctx.beginPath();
    ctx.moveTo(-9, -10);
    ctx.lineTo(-8, -19);
    ctx.lineTo(-3, -26);
    ctx.lineTo(3, -26);
    ctx.lineTo(8, -19);
    ctx.lineTo(9, -10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = RED_DEEP;

    ctx.beginPath();
    ctx.moveTo(-7, -11);
    ctx.lineTo(-6, -18);
    ctx.lineTo(-2, -23);
    ctx.lineTo(2, -23);
    ctx.lineTo(6, -18);
    ctx.lineTo(7, -11);
    ctx.closePath();
    ctx.fill();


    // Staff behind right
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(14, 13);
    ctx.lineTo(18, -20);
    ctx.stroke();

    ctx.strokeStyle = WOOD;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(14, 13);
    ctx.lineTo(18, -20);
    ctx.stroke();

    ctx.fillStyle = FIRE;
    ctx.fillRect(15, -27, 7, 8);

    ctx.fillStyle = FIRE_LIGHT;
    ctx.fillRect(18, -25, 2, 4);
  }


  // ==========================================================
  // LEFT / RIGHT â€” LUNGING FIRE POSES
  // ==========================================================

  else {

    const right = dir === 'RIGHT';
    const s = right ? 1 : -1;

    // Feet
    ctx.fillStyle = OUTLINE;

    if (right) {
      ctx.fillRect(-8 + step, 9, 6, 5);
      ctx.fillRect(3 - step, 7, 6, 6);
    } else {
      ctx.fillRect(-8 - step, 7, 6, 6);
      ctx.fillRect(3 + step, 9, 6, 5);
    }

    ctx.fillStyle = RED_DARK;

    ctx.fillRect(-7 + s * step, 10, 5, 3);
    ctx.fillRect(4 - s * step, 8, 5, 4);


    // Leaning body
    ctx.fillStyle = OUTLINE;

    ctx.beginPath();

    if (right) {
      ctx.moveTo(-7, -10);
      ctx.lineTo(3, -14);
      ctx.lineTo(10, -9);
      ctx.lineTo(12, 0);
      ctx.lineTo(7, 10);
      ctx.lineTo(-2, 13);
      ctx.lineTo(-8, 7);
      ctx.lineTo(-10, -2);
    } else {
      ctx.moveTo(-10, -9);
      ctx.lineTo(-3, -14);
      ctx.lineTo(7, -10);
      ctx.lineTo(10, -2);
      ctx.lineTo(8, 7);
      ctx.lineTo(2, 13);
      ctx.lineTo(-7, 10);
      ctx.lineTo(-12, 0);
    }

    ctx.closePath();
    ctx.fill();


    ctx.fillStyle = RED_DEEP;

    ctx.beginPath();

    if (right) {
      ctx.moveTo(-5, -8);
      ctx.lineTo(3, -11);
      ctx.lineTo(8, -8);
      ctx.lineTo(9, 0);
      ctx.lineTo(5, 8);
      ctx.lineTo(-2, 10);
      ctx.lineTo(-7, 6);
      ctx.lineTo(-8, -2);
    } else {
      ctx.moveTo(-8, -7);
      ctx.lineTo(-3, -11);
      ctx.lineTo(5, -8);
      ctx.lineTo(8, -2);
      ctx.lineTo(6, 7);
      ctx.lineTo(1, 10);
      ctx.lineTo(-6, 7);
      ctx.lineTo(-9, 0);
    }

    ctx.closePath();
    ctx.fill();


    // Fire stripe
    ctx.fillStyle = FIRE;
    ctx.fillRect(-1, -8, 3, 17);


    // Head
    ctx.fillStyle = OUTLINE;

    if (right) {
      ctx.fillRect(-4, -14, 14, 10);

      ctx.fillStyle = SKIN;
      ctx.fillRect(1, -10, 8, 7);
      ctx.fillRect(7, -7, 3, 3);

    } else {
      ctx.fillRect(-10, -14, 14, 10);

      ctx.fillStyle = SKIN;
      ctx.fillRect(-9, -10, 8, 7);
      ctx.fillRect(-10, -7, 3, 3);
    }


    // Hood
    ctx.fillStyle = OUTLINE;

    if (right) {

      ctx.beginPath();
      ctx.moveTo(-8, -13);
      ctx.lineTo(-5, -21);
      ctx.lineTo(0, -26);
      ctx.lineTo(6, -25);
      ctx.lineTo(10, -18);
      ctx.lineTo(11, -13);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = RED_DEEP;

      ctx.beginPath();
      ctx.moveTo(-6, -14);
      ctx.lineTo(-3, -20);
      ctx.lineTo(1, -23);
      ctx.lineTo(5, -22);
      ctx.lineTo(8, -17);
      ctx.lineTo(9, -14);
      ctx.closePath();
      ctx.fill();

    } else {

      ctx.beginPath();
      ctx.moveTo(-11, -13);
      ctx.lineTo(-10, -18);
      ctx.lineTo(-6, -25);
      ctx.lineTo(0, -26);
      ctx.lineTo(5, -21);
      ctx.lineTo(8, -13);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = RED_DEEP;

      ctx.beginPath();
      ctx.moveTo(-9, -14);
      ctx.lineTo(-8, -17);
      ctx.lineTo(-5, -22);
      ctx.lineTo(-1, -23);
      ctx.lineTo(3, -20);
      ctx.lineTo(6, -14);
      ctx.closePath();
      ctx.fill();
    }


    // Forward arm
    ctx.fillStyle = OUTLINE;

    if (right) {
      ctx.fillRect(7, -5, 7, 7);

      ctx.fillStyle = RED;
      ctx.fillRect(8, -4, 6, 5);

    } else {
      ctx.fillRect(-14, -5, 7, 7);

      ctx.fillStyle = RED;
      ctx.fillRect(-14, -4, 6, 5);
    }


    // Staff thrust forward
    const sx = s * 14;

    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(sx * 0.8, 11);
    ctx.lineTo(sx * 1.55, -20);
    ctx.stroke();

    ctx.strokeStyle = WOOD;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(sx * 0.8, 11);
    ctx.lineTo(sx * 1.55, -20);
    ctx.stroke();

    const fx = sx * 1.55;
    const fy = -22;

    ctx.fillStyle = FIRE_DARK;

    ctx.beginPath();
    ctx.moveTo(fx, fy + 6);
    ctx.lineTo(fx - s * 5, fy);
    ctx.lineTo(fx - s * 2, fy - 8);
    ctx.lineTo(fx + s * 1, fy - 13);
    ctx.lineTo(fx + s * 4, fy - 5);
    ctx.lineTo(fx + s * 7, fy - 8);
    ctx.lineTo(fx + s * 6, fy + 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = FIRE;
    ctx.fillRect(fx - 2, fy - 3, 5, 7);

    ctx.fillStyle = FIRE_LIGHT;
    ctx.fillRect(fx - 1, fy - 2, 2, 4);
  }


  // ----------------------------------------------------------
  // RAEL ATTACK
  // ----------------------------------------------------------

  if (attack) {

    const k = attackFrame / 3;

    let fx = 0;
    let fy = -20;

    if (dir === 'LEFT') {
      fx = -23;
      fy = -18;
    } else if (dir === 'RIGHT') {
      fx = 23;
      fy = -18;
    } else if (dir === 'UP') {
      fx = 18;
      fy = -22;
    } else {
      fx = 18;
      fy = -21;
    }

    ctx.globalAlpha = 0.35 + k * 0.65;

    ctx.fillStyle = FIRE_DARK;
    ctx.beginPath();
    ctx.arc(fx, fy, 8 + k * 8, 0, PI2);
    ctx.fill();

    ctx.fillStyle = FIRE;
    ctx.beginPath();
    ctx.arc(fx, fy, 5 + k * 5, 0, PI2);
    ctx.fill();

    ctx.fillStyle = FIRE_LIGHT;
    ctx.beginPath();
    ctx.arc(fx - 2, fy - 2, 2 + k * 2, 0, PI2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  ctx.restore();
}


// ============================================================
// BRIGA â€” SENTINEL
// ============================================================

function drawTopDownBriga(x, y, pl, time) {

  const moving = Math.hypot(pl.velX, pl.velY) > 0.4;
  const dir = getCharacterDirection(pl);

  const walkFrame = moving ? Math.floor(time / 145) % 4 : 0;
  const step = moving ? [0, -2, 0, 2][walkFrame] : 0;

  const bob = moving
    ? [0, -1, 0, 1][walkFrame]
    : Math.sin(time * 0.003) * 0.15;

  const attack = pl.attackPulse > 0.01;
  const attackFrame = attack
    ? Math.min(3, Math.floor((1 - pl.attackPulse) * 4))
    : 0;

  const px = v => Math.round(v);

  ctx.save();
  ctx.translate(px(x), px(y + bob));
  ctx.imageSmoothingEnabled = false;

  const OUTLINE = '#141820';
  const PAL = pl.palette || {};

  const ARMOR_DARK  = PAL.d1 || '#303746';
  const ARMOR_DEEP  = PAL.d2 || '#475365';
  const ARMOR       = PAL.m  || '#697789';
  const ARMOR_LIGHT = PAL.l  || '#aab5c0';

  const GOLD_DARK  = '#70501d';
  const GOLD       = '#b98a2e';
  const GOLD_LIGHT = '#e1bd55';

  const SHIELD_DARK = '#253044';
  const SHIELD      = '#465a78';


  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.50)';
  ctx.beginPath();
  ctx.ellipse(1, 14, 15 + (moving ? 1 : 0), 5, 0, 0, PI2);
  ctx.fill();


  // ==========================================================
  // DOWN â€” SHIELD FRONT
  // ==========================================================

  if (dir === 'DOWN') {

    // Heavy boots
    ctx.fillStyle = OUTLINE;

    ctx.fillRect(-10 + step, 8, 6, 7);
    ctx.fillRect(4 - step, 8, 6, 7);

    ctx.fillStyle = ARMOR_DARK;

    ctx.fillRect(-9 + step, 9, 5, 5);
    ctx.fillRect(5 - step, 9, 5, 5);


    // Huge torso
    ctx.fillStyle = OUTLINE;

    ctx.beginPath();
    ctx.moveTo(-13, -6);
    ctx.lineTo(-11, -11);
    ctx.lineTo(-7, -14);
    ctx.lineTo(7, -14);
    ctx.lineTo(11, -10);
    ctx.lineTo(13, -4);
    ctx.lineTo(12, 9);
    ctx.lineTo(7, 14);
    ctx.lineTo(-8, 14);
    ctx.lineTo(-12, 9);
    ctx.closePath();
    ctx.fill();


    // Armor
    ctx.fillStyle = ARMOR_DEEP;

    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(-7, -11);
    ctx.lineTo(7, -11);
    ctx.lineTo(10, -6);
    ctx.lineTo(9, 8);
    ctx.lineTo(5, 11);
    ctx.lineTo(-6, 11);
    ctx.lineTo(-9, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = ARMOR;
    ctx.fillRect(-5, -9, 5, 19);

    ctx.fillStyle = ARMOR_LIGHT;
    ctx.fillRect(-4, -8, 2, 9);


    // Chest emblem
    ctx.fillStyle = GOLD_DARK;
    ctx.fillRect(-3, -5, 7, 7);

    ctx.fillStyle = GOLD;
    ctx.fillRect(-2, -4, 5, 5);

    ctx.fillStyle = GOLD_LIGHT;
    ctx.fillRect(-1, -3, 3, 2);


    // Shoulders
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-14, -6, 6, 8);
    ctx.fillRect(8, -6, 6, 8);

    ctx.fillStyle = ARMOR;
    ctx.fillRect(-13, -5, 5, 6);
    ctx.fillRect(9, -5, 5, 6);


    // Helmet
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-8, -16, 16, 12);

    ctx.fillStyle = ARMOR_DEEP;
    ctx.fillRect(-6, -14, 12, 9);

    ctx.fillStyle = ARMOR;
    ctx.fillRect(-6, -16, 12, 4);

    ctx.fillStyle = ARMOR_LIGHT;
    ctx.fillRect(-4, -15, 3, 4);


    // Visor
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-6, -8, 12, 4);

    ctx.fillStyle = GOLD_LIGHT;
    ctx.fillRect(-4, -7, 2, 1);
    ctx.fillRect(2, -7, 2, 1);


    // Shield FRONT
    ctx.fillStyle = OUTLINE;

    ctx.beginPath();
    ctx.moveTo(-16, -4);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-5, 4);
    ctx.lineTo(-10, 13);
    ctx.lineTo(-17, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = SHIELD_DARK;

    ctx.beginPath();
    ctx.moveTo(-15, -3);
    ctx.lineTo(-9, -5);
    ctx.lineTo(-7, 4);
    ctx.lineTo(-11, 10);
    ctx.lineTo(-15, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = SHIELD;
    ctx.fillRect(-12, 0, 4, 7);

    ctx.fillStyle = GOLD;
    ctx.fillRect(-11, 2, 2, 5);


    // Sword right
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(17, -10);
    ctx.stroke();

    ctx.strokeStyle = ARMOR_LIGHT;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(17, -10);
    ctx.stroke();
  }


  // ==========================================================
  // UP â€” ARMORED BACK
  // ==========================================================

  else if (dir === 'UP') {

    ctx.fillStyle = OUTLINE;

    ctx.fillRect(-10 - step, 8, 6, 7);
    ctx.fillRect(4 + step, 8, 6, 7);

    ctx.fillStyle = ARMOR_DARK;

    ctx.fillRect(-9 - step, 9, 5, 5);
    ctx.fillRect(5 + step, 9, 5, 5);


    // Wide back
    ctx.fillStyle = OUTLINE;

    ctx.beginPath();
    ctx.moveTo(-13, -7);
    ctx.lineTo(-10, -12);
    ctx.lineTo(10, -12);
    ctx.lineTo(13, -7);
    ctx.lineTo(12, 10);
    ctx.lineTo(7, 14);
    ctx.lineTo(-8, 14);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = ARMOR_DEEP;

    ctx.beginPath();
    ctx.moveTo(-10, -7);
    ctx.lineTo(-7, -10);
    ctx.lineTo(7, -10);
    ctx.lineTo(10, -7);
    ctx.lineTo(9, 9);
    ctx.lineTo(5, 11);
    ctx.lineTo(-6, 11);
    ctx.lineTo(-9, 9);
    ctx.closePath();
    ctx.fill();


    // Back plate
    ctx.fillStyle = ARMOR;
    ctx.fillRect(-5, -8, 10, 17);

    ctx.fillStyle = ARMOR_LIGHT;
    ctx.fillRect(-4, -7, 2, 11);


    // Helmet back
    ctx.fillStyle = OUTLINE;

    ctx.beginPath();
    ctx.moveTo(-9, -9);
    ctx.lineTo(-8, -17);
    ctx.lineTo(-4, -20);
    ctx.lineTo(4, -20);
    ctx.lineTo(8, -17);
    ctx.lineTo(9, -9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = ARMOR_DEEP;

    ctx.beginPath();
    ctx.moveTo(-7, -10);
    ctx.lineTo(-6, -16);
    ctx.lineTo(-3, -18);
    ctx.lineTo(3, -18);
    ctx.lineTo(6, -16);
    ctx.lineTo(7, -10);
    ctx.closePath();
    ctx.fill();


    // Shield on back
    ctx.fillStyle = OUTLINE;

    ctx.beginPath();
    ctx.moveTo(10, -4);
    ctx.lineTo(17, -7);
    ctx.lineTo(19, 5);
    ctx.lineTo(14, 12);
    ctx.lineTo(9, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = SHIELD;
    ctx.fillRect(12, -2, 4, 10);


    // Sword behind
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(-10, 10);
    ctx.lineTo(-17, -11);
    ctx.stroke();

    ctx.strokeStyle = ARMOR_LIGHT;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-10, 10);
    ctx.lineTo(-17, -11);
    ctx.stroke();
  }


  // ==========================================================
  // LEFT / RIGHT â€” SIDE TANK POSES
  // ==========================================================

  else {

    const right = dir === 'RIGHT';
    const s = right ? 1 : -1;

    // Staggered feet
    ctx.fillStyle = OUTLINE;

    if (right) {
      ctx.fillRect(-8 + step, 9, 7, 5);
      ctx.fillRect(3 - step, 7, 7, 7);
    } else {
      ctx.fillRect(-10 - step, 7, 7, 7);
      ctx.fillRect(1 + step, 9, 7, 5);
    }

    ctx.fillStyle = ARMOR_DARK;
    ctx.fillRect(-7 + s * step, 10, 5, 3);
    ctx.fillRect(4 - s * step, 8, 5, 5);


    // Side body
    ctx.fillStyle = OUTLINE;

    ctx.beginPath();

    if (right) {
      ctx.moveTo(-7, -11);
      ctx.lineTo(4, -14);
      ctx.lineTo(10, -8);
      ctx.lineTo(12, 2);
      ctx.lineTo(8, 11);
      ctx.lineTo(-3, 13);
      ctx.lineTo(-9, 7);
      ctx.lineTo(-10, -3);
    } else {
      ctx.moveTo(-10, -8);
      ctx.lineTo(-4, -14);
      ctx.lineTo(7, -11);
      ctx.lineTo(10, -3);
      ctx.lineTo(9, 7);
      ctx.lineTo(3, 13);
      ctx.lineTo(-8, 11);
      ctx.lineTo(-12, 2);
    }

    ctx.closePath();
    ctx.fill();


    ctx.fillStyle = ARMOR_DEEP;

    ctx.beginPath();

    if (right) {
      ctx.moveTo(-5, -9);
      ctx.lineTo(3, -11);
      ctx.lineTo(7, -7);
      ctx.lineTo(9, 1);
      ctx.lineTo(6, 8);
      ctx.lineTo(-2, 10);
      ctx.lineTo(-7, 6);
      ctx.lineTo(-8, -2);
    } else {
      ctx.moveTo(-8, -6);
      ctx.lineTo(-4, -11);
      ctx.lineTo(4, -9);
      ctx.lineTo(8, -2);
      ctx.lineTo(6, 7);
      ctx.lineTo(1, 10);
      ctx.lineTo(-6, 8);
      ctx.lineTo(-9, 1);
    }

    ctx.closePath();
    ctx.fill();


    // Side armor highlight
    ctx.fillStyle = ARMOR;
    ctx.fillRect(right ? 1 : -4, -8, 4, 17);

    ctx.fillStyle = ARMOR_LIGHT;
    ctx.fillRect(right ? 2 : -3, -7, 2, 8);


    // Head / helmet
    ctx.fillStyle = OUTLINE;

    if (right) {
      ctx.fillRect(-4, -15, 14, 11);

      ctx.fillStyle = ARMOR_DEEP;
      ctx.fillRect(0, -13, 9, 7);

      ctx.fillStyle = ARMOR_LIGHT;
      ctx.fillRect(2, -13, 3, 4);

      // visor
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(4, -8, 7, 3);

    } else {
      ctx.fillRect(-10, -15, 14, 11);

      ctx.fillStyle = ARMOR_DEEP;
      ctx.fillRect(-9, -13, 9, 7);

      ctx.fillStyle = ARMOR_LIGHT;
      ctx.fillRect(-7, -13, 3, 4);

      ctx.fillStyle = OUTLINE;
      ctx.fillRect(-11, -8, 7, 3);
    }


    // Front shield
    const shieldX = right ? 15 : -15;

    ctx.fillStyle = OUTLINE;

    ctx.beginPath();
    ctx.moveTo(shieldX - s * 5, -5);
    ctx.lineTo(shieldX + s * 5, -7);
    ctx.lineTo(shieldX + s * 6, 6);
    ctx.lineTo(shieldX, 13);
    ctx.lineTo(shieldX - s * 6, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = SHIELD;

    ctx.beginPath();
    ctx.moveTo(shieldX - s * 4, -4);
    ctx.lineTo(shieldX + s * 4, -5);
    ctx.lineTo(shieldX + s * 5, 5);
    ctx.lineTo(shieldX, 10);
    ctx.lineTo(shieldX - s * 5, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = GOLD;
    ctx.fillRect(shieldX - 1, 0, 2, 7);


    // Sword behind
    const swordX = -s * 12;

    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(swordX, 10);
    ctx.lineTo(swordX - s * 8, -10);
    ctx.stroke();

    ctx.strokeStyle = ARMOR_LIGHT;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(swordX, 10);
    ctx.lineTo(swordX - s * 8, -10);
    ctx.stroke();
  }


  // ----------------------------------------------------------
  // BRIGA ATTACK â€” HEAVY SWING
  // ----------------------------------------------------------

  if (attack) {

    const k = attackFrame / 3;

    ctx.globalAlpha = 0.25 + k * 0.75;
    ctx.strokeStyle = GOLD_LIGHT;
    ctx.lineWidth = 3;

    if (dir === 'DOWN') {

      ctx.beginPath();
      ctx.arc(0, 0, 17 + k * 7, -0.4, 1.8);
      ctx.stroke();

    } else if (dir === 'UP') {

      ctx.beginPath();
      ctx.arc(0, 0, 18 + k * 7, 1.4, 4.2);
      ctx.stroke();

    } else if (dir === 'LEFT') {

      ctx.beginPath();
      ctx.arc(0, 0, 18 + k * 7, 1.8, 4.5);
      ctx.stroke();

    } else {

      ctx.beginPath();
      ctx.arc(0, 0, 18 + k * 7, -1.3, 1.4);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  ctx.restore();
}


// ============================================================
// NIX â€” SHADOWBLADE
// ============================================================

function drawTopDownNix(x, y, pl, time) {

  const moving = Math.hypot(pl.velX, pl.velY) > 0.4;
  const dir = getCharacterDirection(pl);

  const walkFrame = moving ? Math.floor(time / 82) % 4 : 0;
  const step = moving ? [0, -2, 0, 2][walkFrame] : 0;

  const bob = moving
    ? [0, -1, 0, 1][walkFrame]
    : Math.sin(time * 0.004) * 0.4;

  const attack = pl.attackPulse > 0.01;
  const attackFrame = attack
    ? Math.min(3, Math.floor((1 - pl.attackPulse) * 4))
    : 0;

  const px = v => Math.round(v);

  ctx.save();
  ctx.translate(px(x), px(y + bob));
  ctx.imageSmoothingEnabled = false;

  const OUTLINE = '#0c0b15';
  const PAL = pl.palette || {};

  const SHADOW_DARK  = PAL.d1 || '#151225';
  const SHADOW_DEEP  = PAL.d2 || '#24183d';
  const SHADOW       = PAL.m  || '#3b2866';
  const SHADOW_LIGHT = PAL.l  || '#6946a0';

  const PURPLE       = '#9b59e8';
  const PURPLE_LIGHT = '#d7a4ff';

  const SKIN      = '#c88778';
  const SKIN_DARK = '#6d3d55';

  const STEEL      = '#667084';
  const STEEL_LIGHT = '#c4d0df';


  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.beginPath();
  ctx.ellipse(1, 13, 12 + (moving ? 1 : 0), 4, 0, 0, PI2);
  ctx.fill();


  // ==========================================================
  // DOWN â€” LOW TWO-BLADE STANCE
  // ==========================================================

  if (dir === 'DOWN') {

    // Feet wide
    ctx.fillStyle = OUTLINE;

    ctx.fillRect(-9 + step, 8, 5, 7);
    ctx.fillRect(4 - step, 8, 5, 7);

    ctx.fillStyle = SHADOW_DARK;

    ctx.fillRect(-8 + step, 9, 4, 5);
    ctx.fillRect(5 - step, 9, 4, 5);


    // Low body
    ctx.fillStyle = OUTLINE;

    ctx.beginPath();
    ctx.moveTo(-9, -5);
    ctx.lineTo(-7, -11);
    ctx.lineTo(-3, -13);
    ctx.lineTo(4, -13);
    ctx.lineTo(8, -9);
    ctx.lineTo(10, -2);
    ctx.lineTo(8, 9);
    ctx.lineTo(5, 12);
    ctx.lineTo(-5, 12);
    ctx.lineTo(-9, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = SHADOW_DEEP;

    ctx.beginPath();
    ctx.moveTo(-7, -5);
    ctx.lineTo(-5, -9);
    ctx.lineTo(-2, -11);
    ctx.lineTo(3, -11);
    ctx.lineTo(6, -8);
    ctx.lineTo(7, -2);
    ctx.lineTo(6, 8);
    ctx.lineTo(3, 10);
    ctx.lineTo(-4, 10);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = SHADOW;
    ctx.fillRect(-4, -8, 3, 17);

    ctx.fillStyle = SHADOW_LIGHT;
    ctx.fillRect(-3, -7, 1, 7);


    // Sash
    ctx.fillStyle = PURPLE;
    ctx.fillRect(-7, 4, 14, 2);

    ctx.fillRect(2, 5, 3, 7);


    // Arms spread
    ctx.fillStyle = OUTLINE;

    ctx.fillRect(-11, -3, 4, 8);
    ctx.fillRect(7, -3, 4, 8);

    ctx.fillStyle = SHADOW;

    ctx.fillRect(-10, -2, 3, 6);
    ctx.fillRect(7, -2, 3, 6);

    ctx.fillStyle = SKIN;

    ctx.fillRect(-9, 3, 3, 3);
    ctx.fillRect(8, 3, 3, 3);


    // Head
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-7, -14, 14, 10);

    ctx.fillStyle = SKIN_DARK;
    ctx.fillRect(-5, -10, 10, 7);

    ctx.fillStyle = SKIN;
    ctx.fillRect(-3, -8, 7, 4);


    // Mask
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-5, -6, 10, 3);

    ctx.fillStyle = PURPLE_LIGHT;
    ctx.fillRect(-3, -5, 2, 1);
    ctx.fillRect(2, -5, 2, 1);


    // Hood
    ctx.fillStyle = OUTLINE;

    ctx.beginPath();
    ctx.moveTo(-9, -13);
    ctx.lineTo(-7, -19);
    ctx.lineTo(-3, -23);
    ctx.lineTo(3, -23);
    ctx.lineTo(8, -19);
    ctx.lineTo(10, -13);
    ctx.lineTo(6, -10);
    ctx.lineTo(-6, -10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = SHADOW_DEEP;

    ctx.beginPath();
    ctx.moveTo(-7, -13);
    ctx.lineTo(-5, -18);
    ctx.lineTo(-2, -21);
    ctx.lineTo(3, -21);
    ctx.lineTo(6, -18);
    ctx.lineTo(8, -13);
    ctx.lineTo(5, -11);
    ctx.lineTo(-5, -11);
    ctx.closePath();
    ctx.fill();


    // LEFT DAGGER
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(-9, 8);
    ctx.lineTo(-18, -6);
    ctx.stroke();

    ctx.strokeStyle = STEEL_LIGHT;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(-9, 8);
    ctx.lineTo(-18, -6);
    ctx.stroke();


    // RIGHT DAGGER
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(9, 8);
    ctx.lineTo(18, -6);
    ctx.stroke();

    ctx.strokeStyle = STEEL;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(9, 8);
    ctx.lineTo(18, -6);
    ctx.stroke();


    // Guards
    ctx.strokeStyle = PURPLE;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(-8, 3);

    ctx.moveTo(8, 3);
    ctx.lineTo(14, 0);
    ctx.stroke();
  }


  // ==========================================================
  // UP â€” CROUCHED BACK STANCE
  // ==========================================================

  else if (dir === 'UP') {

    // Feet
    ctx.fillStyle = OUTLINE;

    ctx.fillRect(-9 - step, 8, 5, 7);
    ctx.fillRect(4 + step, 8, 5, 7);

    ctx.fillStyle = SHADOW_DARK;

    ctx.fillRect(-8 - step, 9, 4, 5);
    ctx.fillRect(5 + step, 9, 4, 5);


    // Narrow back
    ctx.fillStyle = OUTLINE;

    ctx.beginPath();
    ctx.moveTo(-9, -6);
    ctx.lineTo(-6, -12);
    ctx.lineTo(5, -13);
    ctx.lineTo(9, -8);
    ctx.lineTo(8, 9);
    ctx.lineTo(4, 12);
    ctx.lineTo(-5, 12);
    ctx.lineTo(-9, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = SHADOW_DEEP;

    ctx.beginPath();
    ctx.moveTo(-7, -6);
    ctx.lineTo(-4, -10);
    ctx.lineTo(4, -11);
    ctx.lineTo(7, -7);
    ctx.lineTo(6, 8);
    ctx.lineTo(3, 10);
    ctx.lineTo(-4, 10);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();


    // Purple spine stripe
    ctx.fillStyle = PURPLE;
    ctx.fillRect(-1, -9, 3, 18);


    // Hood from back
    ctx.fillStyle = OUTLINE;

    ctx.beginPath();
    ctx.moveTo(-9, -10);
    ctx.lineTo(-7, -19);
    ctx.lineTo(-3, -24);
    ctx.lineTo(3, -24);
    ctx.lineTo(8, -19);
    ctx.lineTo(9, -10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = SHADOW_DEEP;

    ctx.beginPath();
    ctx.moveTo(-7, -11);
    ctx.lineTo(-5, -18);
    ctx.lineTo(-2, -22);
    ctx.lineTo(2, -22);
    ctx.lineTo(6, -18);
    ctx.lineTo(7, -11);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = SHADOW_LIGHT;
    ctx.fillRect(-5, -18, 2, 7);


    // Daggers raised behind
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(-8, 9);
    ctx.lineTo(-15, -8);

    ctx.moveTo(8, 9);
    ctx.lineTo(15, -8);

    ctx.stroke();

    ctx.strokeStyle = STEEL;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(-8, 9);
    ctx.lineTo(-15, -8);

    ctx.moveTo(8, 9);
    ctx.lineTo(15, -8);

    ctx.stroke();

    // Cross guards
    ctx.strokeStyle = PURPLE;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-15, -1);
    ctx.lineTo(-8, 1);

    ctx.moveTo(8, 1);
    ctx.lineTo(15, -1);
    ctx.stroke();
  }


  // ==========================================================
  // LEFT / RIGHT â€” LUNGING ASSASSIN POSES
  // ==========================================================

  else {

    const right = dir === 'RIGHT';
    const s = right ? 1 : -1;

    // Wide staggered stance
    ctx.fillStyle = OUTLINE;

    if (right) {
      ctx.fillRect(-8 + step, 9, 6, 5);
      ctx.fillRect(3 - step, 7, 6, 7);
    } else {
      ctx.fillRect(-9 - step, 7, 6, 7);
      ctx.fillRect(2 + step, 9, 6, 5);
    }

    ctx.fillStyle = SHADOW_DARK;
    ctx.fillRect(-7 + s * step, 10, 5, 3);
    ctx.fillRect(4 - s * step, 8, 5, 5);


    // Body leaning into attack
    ctx.fillStyle = OUTLINE;

    ctx.beginPath();

    if (right) {
      ctx.moveTo(-8, -7);
      ctx.lineTo(-4, -12);
      ctx.lineTo(5, -13);
      ctx.lineTo(9, -7);
      ctx.lineTo(10, 3);
      ctx.lineTo(5, 10);
      ctx.lineTo(-5, 11);
      ctx.lineTo(-10, 5);
    } else {
      ctx.moveTo(-9, -7);
      ctx.lineTo(-5, -13);
      ctx.lineTo(4, -12);
      ctx.lineTo(8, -7);
      ctx.lineTo(10, 5);
      ctx.lineTo(5, 11);
      ctx.lineTo(-5, 10);
      ctx.lineTo(-10, 3);
    }

    ctx.closePath();
    ctx.fill();


    ctx.fillStyle = SHADOW_DEEP;

    ctx.beginPath();

    if (right) {
      ctx.moveTo(-6, -6);
      ctx.lineTo(-3, -10);
      ctx.lineTo(4, -11);
      ctx.lineTo(7, -6);
      ctx.lineTo(8, 2);
      ctx.lineTo(4, 8);
      ctx.lineTo(-4, 9);
      ctx.lineTo(-8, 4);
    } else {
      ctx.moveTo(-7, -6);
      ctx.lineTo(-4, -11);
      ctx.lineTo(3, -10);
      ctx.lineTo(7, -6);
      ctx.lineTo(8, 4);
      ctx.lineTo(4, 9);
      ctx.lineTo(-4, 8);
      ctx.lineTo(-8, 2);
    }

    ctx.closePath();
    ctx.fill();


    // Sash
    ctx.fillStyle = PURPLE;

    if (right) {
      ctx.fillRect(-1, -8, 3, 16);
    } else {
      ctx.fillRect(-2, -8, 3, 16);
    }


    // --------------------------------------------------------
    // HEAD PROFILE
    // --------------------------------------------------------

    ctx.fillStyle = OUTLINE;

    if (right) {

      ctx.fillRect(-4, -15, 14, 11);

      ctx.fillStyle = SKIN_DARK;
      ctx.fillRect(0, -11, 9, 7);

      ctx.fillStyle = SKIN;
      ctx.fillRect(1, -9, 7, 5);

      // Nose
      ctx.fillRect(7, -7, 3, 3);

      // Mask
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(2, -7, 8, 3);

      // Eye
      ctx.fillStyle = PURPLE_LIGHT;
      ctx.fillRect(6, -6, 2, 1);

    } else {

      ctx.fillRect(-10, -15, 14, 11);

      ctx.fillStyle = SKIN_DARK;
      ctx.fillRect(-9, -11, 9, 7);

      ctx.fillStyle = SKIN;
      ctx.fillRect(-8, -9, 7, 5);

      // Nose
      ctx.fillRect(-10, -7, 3, 3);

      // Mask
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(-10, -7, 8, 3);

      // Eye
      ctx.fillStyle = PURPLE_LIGHT;
      ctx.fillRect(-8, -6, 2, 1);
    }


    // --------------------------------------------------------
    // HOOD â€” DIFFERENT SHAPE PER SIDE
    // --------------------------------------------------------

    ctx.fillStyle = OUTLINE;

    if (right) {

      ctx.beginPath();
      ctx.moveTo(-8, -13);
      ctx.lineTo(-6, -20);
      ctx.lineTo(-1, -25);
      ctx.lineTo(5, -24);
      ctx.lineTo(9, -19);
      ctx.lineTo(11, -13);
      ctx.lineTo(6, -10);
      ctx.lineTo(-5, -10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = SHADOW_DEEP;

      ctx.beginPath();
      ctx.moveTo(-6, -13);
      ctx.lineTo(-4, -19);
      ctx.lineTo(0, -22);
      ctx.lineTo(4, -22);
      ctx.lineTo(7, -18);
      ctx.lineTo(9, -13);
      ctx.lineTo(5, -11);
      ctx.lineTo(-4, -11);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = SHADOW_LIGHT;
      ctx.fillRect(5, -19, 2, 6);

    } else {

      ctx.beginPath();
      ctx.moveTo(-11, -13);
      ctx.lineTo(-9, -19);
      ctx.lineTo(-5, -24);
      ctx.lineTo(1, -25);
      ctx.lineTo(6, -20);
      ctx.lineTo(8, -13);
      ctx.lineTo(5, -10);
      ctx.lineTo(-6, -10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = SHADOW_DEEP;

      ctx.beginPath();
      ctx.moveTo(-9, -13);
      ctx.lineTo(-7, -18);
      ctx.lineTo(-4, -22);
      ctx.lineTo(0, -22);
      ctx.lineTo(4, -19);
      ctx.lineTo(6, -13);
      ctx.lineTo(3, -11);
      ctx.lineTo(-5, -11);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = SHADOW_LIGHT;
      ctx.fillRect(-7, -19, 2, 6);
    }


    // --------------------------------------------------------
    // FRONT DAGGER â€” LONG DIAGONAL
    // --------------------------------------------------------

    const frontX = s * 10;

    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(frontX, 8);
    ctx.lineTo(frontX + s * 12, -9);
    ctx.stroke();

    ctx.strokeStyle = STEEL_LIGHT;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(frontX, 8);
    ctx.lineTo(frontX + s * 12, -9);
    ctx.stroke();


    // --------------------------------------------------------
    // BACK DAGGER â€” OPPOSITE ANGLE
    // --------------------------------------------------------

    const backX = -s * 8;

    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(backX, 8);
    ctx.lineTo(backX - s * 7, -8);
    ctx.stroke();

    ctx.strokeStyle = STEEL;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(backX, 8);
    ctx.lineTo(backX - s * 7, -8);
    ctx.stroke();


    // Guards
    ctx.strokeStyle = PURPLE;
    ctx.lineWidth = 2;

    ctx.beginPath();

    if (right) {
      ctx.moveTo(7, 1);
      ctx.lineTo(14, 3);

      ctx.moveTo(-11, 0);
      ctx.lineTo(-5, 2);
    } else {
      ctx.moveTo(-7, 1);
      ctx.lineTo(-14, 3);

      ctx.moveTo(11, 0);
      ctx.lineTo(5, 2);
    }

    ctx.stroke();
  }


  // ==========================================================
  // NIX ATTACK â€” DOUBLE SLASH
  // ==========================================================

  if (attack) {

    const k = attackFrame / 3;

    ctx.globalAlpha = 0.3 + k * 0.7;

    ctx.strokeStyle = PURPLE_LIGHT;
    ctx.lineWidth = 2;

    if (dir === 'DOWN') {

      ctx.beginPath();
      ctx.arc(0, 0, 15 + k * 9, 0.1, 1.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 15 + k * 9, 1.65, 3.0);
      ctx.stroke();

    } else if (dir === 'UP') {

      ctx.beginPath();
      ctx.arc(0, 0, 15 + k * 9, 3.2, 4.6);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 15 + k * 9, 4.8, 6.1);
      ctx.stroke();

    } else if (dir === 'LEFT') {

      ctx.beginPath();
      ctx.arc(0, 0, 17 + k * 9, 2.1, 4.4);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-5, -3);
      ctx.lineTo(-21 - k * 5, -12);
      ctx.stroke();

    } else {

      ctx.beginPath();
      ctx.arc(0, 0, 17 + k * 9, -1.3, 1.0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(5, -3);
      ctx.lineTo(21 + k * 5, -12);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }


  // Shadow motes
  if (!moving && !attack) {

    for (let i = 0; i < 3; i++) {

      const a = -time * 0.001 + i * 2.1;
      const r = 14 + Math.sin(time * 0.002 + i) * 2;

      const mx = Math.cos(a) * r;
      const my = Math.sin(a) * r * 0.65;

      ctx.globalAlpha =
        0.2 + Math.sin(time * 0.004 + i) * 0.15;

      ctx.fillStyle = PURPLE;

      ctx.fillRect(
        Math.round(mx),
        Math.round(my),
        2,
        2
      );
    }

    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// Continuous overlay animation shared by every water mirror (prairie lake,
// swamp pool, northern ice, taiga snow): a few slow crossing waves computed
// from WORLD coordinates so the effect never restarts at tile boundaries.
// Colors are tuned per biome via the palette map below.
var WATER_PULSE_PAL = {
  [HAZARD_WATER]: { patch: '125,195,205',   rip: '185,225,230', rip2: '210,240,242', glint: '225,248,248', breathe: '145,205,215' },
  [HAZARD_SWAMP]: { patch: '110,155,70',    rip: '165,190,100', rip2: '185,200,115', glint: '210,225,145', breathe: '135,165,85'  },
  [HAZARD_ICE]:   { patch: '140,200,235',   rip: '200,235,250', rip2: '215,242,255', glint: '235,248,255', breathe: '150,205,235' },
  [HAZARD_SNOW]:  { patch: '218,233,248',   rip: '233,244,255', rip2: '240,248,255', glint: '248,252,255', breathe: '213,228,248' }
};

function drawWaterMirrorPulse(sx, sy, hz, t, pal) {
  const wx = hz.x;
  const wy = hz.y;
  const time = t * 0.00032;

  // Several slow waves with different directions/frequencies.
  const w1 = Math.sin(wx * 0.050 + wy * 0.018 + time * 2.0);
  const w2 = Math.sin(wx * 0.027 - wy * 0.041 - time * 1.25);
  const w3 = Math.sin(wx * 0.073 + wy * 0.031 + time * 1.7);

  // Soft moving water patch
  const patch = (w1 + w2) * 0.5;
  if (patch > 0.25) {
    const alpha = 0.025 + (patch - 0.25) * 0.035;
    ctx.fillStyle = `rgba(${pal.patch},${alpha})`;
    ctx.fillRect(sx + 4 + w2 * 2, sy + 5 + w1 * 2, 8, 3);
  }

  // Small irregular ripple
  const ripple = Math.sin(wx * 0.085 + wy * 0.037 - time * 2.8);
  if (ripple > 0.62) {
    const alpha = (ripple - 0.62) * 0.13;
    ctx.fillStyle = `rgba(${pal.rip},${alpha})`;
    ctx.fillRect(sx + 5 + w1 * 2, sy + 11 + w2 * 2, 4 + Math.floor((ripple - 0.62) * 4), 1);
  }

  // Second small ripple
  const ripple2 = Math.sin(wx * 0.041 - wy * 0.067 + time * 1.9);
  if (ripple2 > 0.72) {
    ctx.fillStyle = `rgba(${pal.rip2},${(ripple2 - 0.72) * 0.11})`;
    ctx.fillRect(sx + 18 + w2 * 2, sy + 20 + w1, 3, 1);
  }

  // Moving specular glint (modulo kept in range so negative world coords on
  // the west/north sides never draw off the tile).
  const glint = Math.sin(wx * 0.019 + wy * 0.031 + time * 1.35);
  if (glint > 0.90) {
    ctx.fillStyle = `rgba(${pal.glint},0.20)`;
    const gx = sx + (((wx * 0.13 + t * 0.002) % (TILE - 3)) + (TILE - 3)) % (TILE - 3);
    const gy = sy + (((wy * 0.09 + Math.sin(time + wx) * 3) % (TILE - 2)) + (TILE - 2)) % (TILE - 2);
    ctx.fillRect(gx, gy, 2, 1);
    if (glint > 0.96) ctx.fillRect(gx + 3, gy, 2, 1);
  }

  // Very subtle breathing: almost invisible global shimmer.
  const breathe = 0.5 + 0.5 * Math.sin(wx * 0.018 + wy * 0.014 + time * 0.7);
  if (breathe > 0.78) {
    ctx.fillStyle = `rgba(${pal.breathe},${(breathe - 0.78) * 0.035})`;
    ctx.fillRect(sx + 8, sy + 26, 6, 1);
  }
}

// Animated surface effects on hazard tiles (drawn above the baked floor but
// below units), so lava bubbles and the unified water shimmer feel alive.
function drawTerrainAnimated(cx, cy, w, h) {
  const g = game;
  const firstCx = Math.floor(cx / CHUNK_PX) - 1;
  const firstCy = Math.floor(cy / CHUNK_PX) - 1;
  const lastCx = Math.floor((cx + w) / CHUNK_PX) + 1;
  const lastCy = Math.floor((cy + h) / CHUNK_PX) + 1;
  for (let ccy = firstCy; ccy <= lastCy; ccy++) {
    for (let ccx = firstCx; ccx <= lastCx; ccx++) {
      const list = getChunkHazards(ccx, ccy);
      for (const hz of list) {
        const sx = hz.x - cx, sy = hz.y - cy;
        if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;
        const t = g.time;
        if (hz.type === HAZARD_LAVA) {
          const b1 = (t * 0.02 + hz.ph) % 100;
          ctx.fillStyle = 'rgba(255,170,50,0.55)';
          ctx.beginPath();
          ctx.arc(sx + Math.sin(t * 0.004 + hz.ph) * 5, sy - b1 * 0.06, 2.2, 0, PI2);
          ctx.fill();
          const b2 = (t * 0.013 + hz.ph * 3) % 100;
          ctx.fillStyle = 'rgba(255,120,30,0.4)';
          ctx.beginPath();
          ctx.arc(sx - Math.sin(t * 0.005 + hz.ph * 7) * 4, sy - b2 * 0.07, 1.6, 0, PI2);
          ctx.fill();
        } else if (hz.type === HAZARD_WATER || hz.type === HAZARD_SWAMP ||
                   hz.type === HAZARD_ICE || hz.type === HAZARD_SNOW) {
          // Same continuous world-coord water animation for every mirror,
          // tinted per biome.
          drawWaterMirrorPulse(sx, sy, hz, t, WATER_PULSE_PAL[hz.type] || WATER_PULSE_PAL[HAZARD_WATER]);
        }
      }
    }
  }
}

// Biome treasure chests: a golden chest floats at the heart of each climate
// wedge; the lid lifts open as the player stands on it, and the biome's
// signature weapon glows above as a colored gem.
// Weapon colors may be 3-digit hex shorthand (e.g. '#8ff'); expand them to an
// rgba() string so alpha-aware gradients stay valid.
function hexToRgba(hex, a) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function drawStatues(cx, cy, w, h) {
  const g = game;
  const t = g.time;
  const iconSize = 72;
  for (const id of BIOME_IDS) {
    const def = BIOME_DEFS[id];
    if (!def.weapon) continue;
    const pos = chestPos(id);
    const sx = pos.x - cx, sy = pos.y - cy;
    if (sx < -90 || sx > w + 90 || sy < -110 || sy > h + 90) continue;
    const opened = heartCleared(id);
    const gA = g.guardian && g.guardian.biomeId === id;   // this heart is mid-fight
    const wDef = WEAPON_DEFS[def.weapon];
    const ph = BIOME_IDS.indexOf(id) * 13;

    // Coloured aura in the weapon's own hue so the treasure reads through the
    // darkness; a GUARDIAN-awakened heart glows angry red instead.
    const glowR = opened ? 30 : 42;
    const glow = ctx.createRadialGradient(sx, sy - 8, 2, sx, sy - 8, glowR);
    if (gA) {
      glow.addColorStop(0, 'rgba(255,80,60,0.5)');
    } else {
      glow.addColorStop(0, opened
        ? 'rgba(210,180,255,0.14)'
        : hexToRgba(wDef.color, 0.38 + 0.1 * Math.sin(t * 0.005 + ph)));
    }
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy - 8, glowR, 0, PI2);
    ctx.fill();

    // Dim light beam above a sealed statue — a beacon that reveals the
    // treasure from far away as you explore the wedge.
    if (!opened && !gA) {
      const dp = Math.hypot(pos.x - g.player.x, pos.y - g.player.y);
      if (dp < 1100) {
        const ba = clamp(1.2 - dp / 1100, 0, 1) * 0.3;
        const beamH = 120;
        const beam = ctx.createLinearGradient(sx, sy - 30, sx, sy - 30 - beamH);
        beam.addColorStop(0, hexToRgba(wDef.color, ba));
        beam.addColorStop(1, hexToRgba(wDef.color, 0));
        ctx.fillStyle = beam;
        ctx.fillRect(sx - 2.5, sy - 30 - beamH, 5, beamH);
      }
    }

    // Progressive awaken ring: an arc that fills as THIS heart's own 30s
    // countdown winds down, then pulses "ready" — approach the statue to
    // actually spawn the boss and unlock the weapon. The countdown only runs
    // within 600px of the statue and resets if the player walks farther away.
    if (!opened && !gA) {
      const hpt = (g.heartTimers && g.heartTimers[id] != null)
        ? g.heartTimers[id] : HEART_WAKE_MS;
      const p = clamp(1 - hpt / HEART_WAKE_MS, 0, 1);
      const rr = 46 + Math.sin(t * 0.005 + ph) * 2;
      ctx.strokeStyle = 'rgba(120,220,255,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy - 14, rr, -Math.PI / 2, -Math.PI / 2 + PI2 * p);
      ctx.stroke();
      if (p >= 1) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.008 + ph);
        ctx.strokeStyle = `rgba(120,220,255,${(0.35 + 0.45 * pulse).toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy - 14, rr + 8 + pulse * 5, 0, PI2);
        ctx.stroke();
      }
      // Wake countdown: seconds until this guardian may awaken and you can
      // fight it to unlock the weapon. Ticks from 30 down to "ready".
      ctx.font = 'bold 11px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = p < 1
        ? 'rgba(150,225,255,0.9)'
        : `rgba(120,225,255,${(0.6 + 0.4 * pulse).toFixed(2)})`;
      ctx.fillText(p < 1
        ? Math.max(1, Math.ceil(hpt / 1000)) + 's'
        : '\u2022 READY',
        sx, sy + 40);
    }

    // Ground shadow + pedestal slab anchoring the floating statue
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 6, 22, 6, 0, 0, PI2);
    ctx.fill();
    ctx.fillStyle = opened ? '#2a2320' : '#3d3f4a';
    ctx.fillRect(sx - 14, sy + 2, 28, 4);
    ctx.fillStyle = opened ? '#35302c' : '#565b6b';
    ctx.fillRect(sx - 14, sy + 6, 28, 3);
    ctx.fillStyle = opened ? '#1b1816' : '#22242d';
    ctx.fillRect(sx - 14, sy - 1, 28, 3);

    // Cleared heart: a swirling warp portal instead of the statue.
    if (opened) {
      drawPortal(sx, sy - 14 + Math.sin(t * 0.002 + ph) * 3, t, ph);
      // Charge ring while the player stands on the portal
      const wc = clamp((g.warpCharges[id] || 0) / WARP_CHARGE_MS, 0, 1);
      if (wc > 0 && wc < 1) {
        ctx.strokeStyle = '#ffd24d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx, sy - 14, 42, -Math.PI / 2, -Math.PI / 2 + PI2 * wc);
        ctx.stroke();
      }
      continue;
    }

    // The biome weapon as a big floating pixel-art statue
    const bobY = sy - 18 + Math.sin(t * 0.002 + ph) * 4;
    const tilt = Math.sin(t * 0.0009 + ph) * 0.06;
    const img = pixelIconImage('w', def.weapon);
    ctx.save();
    ctx.translate(sx, bobY);
    ctx.rotate(tilt);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
    } else {
      // Fallback while the pixel icon decodes: a glowing weapon-coloured gem
      ctx.fillStyle = wDef.color;
      ctx.beginPath();
      ctx.moveTo(0, -iconSize * 0.3);
      ctx.lineTo(iconSize * 0.25, 0);
      ctx.lineTo(0, iconSize * 0.3);
      ctx.lineTo(-iconSize * 0.25, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = true;
    ctx.restore();

    // A guardian-marked heart throbs red on its awakened seal
    if (gA) {
      const pr = 30 + Math.sin(t * 0.008 + ph) * 3;
      ctx.strokeStyle = 'rgba(255,80,60,0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy - 14, pr, t * 0.004 + ph, t * 0.004 + ph + PI2);
      ctx.stroke();
    }

    // Idle sparkles on a sealed statue
    if (!gA && Math.sin(t * 0.003 + ph) > 0.45) {
      ctx.fillStyle = 'rgba(255,240,190,0.7)';
      ctx.fillRect(sx + 10 + Math.sin(t * 0.005 + ph * 2) * 5, sy - 26, 2, 2);
    }
  }

  // RUINS SPAWN ring: the starting heart is BIOME_CORE which carries no weapon,
  // so the cleared-weapon loop above never draws a portal on it. Once any warp
  // is unlocked the spawn becomes a real portal too — same ring, same charge
  // arc, standing on it (after stepping off) re-opens the menu.
  let anyWarpR = false;
  for (const sid of BIOME_IDS) {
    if (BIOME_DEFS[sid].weapon && heartCleared(sid)) { anyWarpR = true; break; }
  }
  if (anyWarpR) {
    const spoX = 8 * TILE + TILE / 2, spoY = 8 * TILE + TILE / 2;
    // Convert world -> screen like every other world-space draw: missing this
    // subtraction used to pin the ring to the viewport, so it "followed" the
    // player around the screen instead of sitting on the ruins floor.
    const spsx = spoX - cx, spsy = spoY - cy;
    if (Math.abs(spsx) < w + 90 && Math.abs(spsy) < h + 90) {
      const phS = seed2(8, 8) * PI2;
      // Ground shadow + pedestal slab anchoring the ring to the floor
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.beginPath();
      ctx.ellipse(spsx, spsy + 8, 22, 6, 0, 0, PI2);
      ctx.fill();
      ctx.fillStyle = '#2a2320';
      ctx.fillRect(spsx - 14, spsy + 4, 28, 4);
      ctx.fillStyle = '#35302c';
      ctx.fillRect(spsx - 14, spsy + 8, 28, 3);
      ctx.fillStyle = '#1b1816';
      ctx.fillRect(spsx - 14, spsy + 1, 28, 3);
      // Portal resting on the ground, gentle breathe only
      drawPortal(spsx, spsy + Math.sin(t * 0.002 + phS) * 2, t, phS);
      const wcS = clamp((g.warpCharges.spawn || 0) / WARP_CHARGE_MS, 0, 1);
      if (wcS > 0 && wcS < 1) {
        ctx.strokeStyle = '#ffd24d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(spsx, spsy, 42, -Math.PI / 2, -Math.PI / 2 + PI2 * wcS);
        ctx.stroke();
      }
    }
  }
}

// ============================================================
// SPAWN SIGNPOSTS — wooden signs to the eight biome hearts
// ============================================================
// Eight wooden signs ring the ruins spawn. Each is labelled with a climate and
// points outward along that wedge's sector centre (north = screen up) — the
// heading you follow to reach its heart, where a Guardian sleeps over the
// sealed biome weapon. The arrow turns gold once that heart has been purified.
function drawSpawnSignposts(cx, cy, w, h) {
  const g = game;
  const t = g.time;
  const SX = 8 * TILE + TILE / 2;
  const SY = 8 * TILE + TILE / 2;
  const R = 92;
  const boardH = 16;
  const halfH = boardH / 2;
  for (let k = 0; k < 8; k++) {
    const id = BIOME_IDS[k];
    const def = BIOME_DEFS[id];
    if (!def.weapon) continue;
    const ca = -Math.PI / 2 + k * Math.PI / 4;   // wedge centre angle
    const dx = Math.cos(ca), dy = Math.sin(ca);
    const bx = SX + dx * R - cx;
    const by = SY + dy * R - cy;

    // Board sized to its name: a cleared biome reserves a left-hand zone for
    // the gold check so long names like "FROZEN GRASS" never collide with it.
    ctx.font = 'bold 9px "Segoe UI", sans-serif';
    const name = def.name.toUpperCase();
    const textW = ctx.measureText(name).width;
    const cleared = heartCleared(id);
    const checkZone = cleared ? 14 : 0;
    const boardW = Math.ceil(textW) + checkZone + 12;
    const halfW = boardW / 2;
    const textCx = bx + checkZone / 2;
    if (bx < -boardW || bx > w + boardW || by < -60 || by > h + 60) continue;

    // Ground shadow + post
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(bx, by + halfH + 6, 9, 3.5, 0, 0, PI2);
    ctx.fill();
    ctx.fillStyle = '#33251a';
    ctx.fillRect(bx - 2, by, 4, halfH + 8);
    ctx.fillStyle = '#573d26';
    ctx.fillRect(bx - 1, by, 2, halfH + 8);

    // Board
    ctx.fillStyle = '#3a2a1c';
    ctx.fillRect(bx - halfW - 1, by - halfH - 1, boardW + 2, boardH + 2);
    ctx.fillStyle = '#8a6238';
    ctx.fillRect(bx - halfW, by - halfH, boardW, boardH);
    ctx.fillStyle = 'rgba(255,232,190,0.20)';
    ctx.fillRect(bx - halfW, by - halfH, boardW, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(bx - halfW, by + halfH - 2, boardW, 2);

    // Biome name (with a dark drop shadow for legibility); shifted right to
    // clear the reserved check zone on cleared boards.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#241a10';
    ctx.fillText(name, textCx + 0.5, by + 1.5);
    ctx.fillStyle = '#f3e6c8';
    ctx.fillText(name, textCx, by + 1);

    // Purified biome: a gold check mark on the board's left edge
    if (cleared) {
      const qx = bx - halfW + 9, qy = by + 1;
      ctx.save();
      ctx.strokeStyle = '#ffd24d';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(qx - 3.5, qy);
      ctx.lineTo(qx - 1, qy + 3);
      ctx.lineTo(qx + 4, qy - 3.5);
      ctx.stroke();
      ctx.restore();
    }

    // Outward arrow, tinted with the biome colour (gold once purified)
    const off = (Math.abs(dx) > 0.5 ? halfW : halfH) + 9;
    const ax2 = bx + dx * off, ay2 = by + dy * off;
    ctx.save();
    ctx.translate(ax2, ay2);
    ctx.rotate(ca);
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(t * 0.004 + k * 1.7);
    ctx.fillStyle = cleared ? '#ffd24d' : def.color;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-5, -6.5);
    ctx.lineTo(-5, 6.5);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ============================================================
// BOSS COMPASS — a large corona with edge arrows to the nearest hearts
// ============================================================
// A big translucent corona is drawn around the player, its rim marking the
// eight climate wedges (tinted per biome, dimmed once purified). For the three
// NEAREST hearts still defended by a Guardian an arrow is drawn at the very
// edge of the screen, pointing the way; the closest is the largest and is
// tagged with the biome name and distance in metres (1 tile = 1 m). The rim is
// a fixed compass (north = up); the arrows use the true bearing from the
// player, so they stay correct wherever you wander.
function drawBossCompass(cx, cy, w, h) {
  const g = game;
  const t = g.time;
  const ia = (typeof g.renderAlpha === 'number') ? g.renderAlpha : 0;
  const plx = (typeof g._rpPx === 'number') ? lerp(g._rpPx, g.player.x, ia) : g.player.x;
  const ply = (typeof g._rpPy === 'number') ? lerp(g._rpPy, g.player.y, ia) : g.player.y;
  const px = plx - cx, py = ply - cy;

  // Every wedge heart, then the ones still guarded (closest to the player first).
  const all = [];
  for (let k = 0; k < 8; k++) {
    const id = BIOME_IDS[k];
    const def = BIOME_DEFS[id];
    if (!def.weapon) continue;
    const pos = chestPos(id);
    const dx = pos.x - plx, dy = pos.y - ply;
    all.push({
      id, def,
      sa: -Math.PI / 2 + k * Math.PI / 4,   // fixed compass heading of the wedge
      ca: Math.atan2(dy, dx),               // true bearing from the player
      cleared: heartCleared(id),
      d: Math.hypot(dx, dy)
    });
  }
  const targets = all.filter(e => !e.cleared).sort((a, b) => a.d - b.d);

  const R = Math.min(w, h) * 0.46;         // a big corona, near the screen edge
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.004);

  ctx.save();

  // Corona rim + fixed wedge ticks.
  ctx.globalAlpha = 0.30;
  ctx.strokeStyle = 'rgba(225,228,238,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(px, py, R, 0, PI2); ctx.stroke();
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 3;
  for (const e of all) {
    const c = Math.cos(e.sa), s = Math.sin(e.sa);
    ctx.strokeStyle = e.cleared ? 'rgba(120,122,132,0.5)' : e.def.color;
    ctx.beginPath();
    ctx.moveTo(px + c * (R - 16), py + s * (R - 16));
    ctx.lineTo(px + c * R, py + s * R);
    ctx.stroke();
  }

  // Edge arrows for the nearest guarded hearts (farthest first, closest on top).
  const n = Math.min(3, targets.length);
  for (let i = n - 1; i >= 0; i--) {
    const e = targets[i];
    const dx = Math.cos(e.ca), dy = Math.sin(e.ca);
    const primary = i === 0;
    const L = primary ? 46 : 32;            // arrow length, tip toward the edge
    const W = primary ? 17 : 12;            // arrow half-width

    // Where this bearing meets the screen border (kept a few px inside).
    const inset = 6;
    let tt = Infinity;
    if (dx > 1e-6) tt = Math.min(tt, (w - inset - px) / dx);
    else if (dx < -1e-6) tt = Math.min(tt, (inset - px) / dx);
    if (dy > 1e-6) tt = Math.min(tt, (h - inset - py) / dy);
    else if (dy < -1e-6) tt = Math.min(tt, (inset - py) / dy);
    if (!isFinite(tt) || tt < 0) tt = 0;
    const tipx = px + dx * tt, tipy = py + dy * tt;
    const ax = tipx - dx * L, ay = tipy - dy * L;

    // Guide line from the corona out to the arrow.
    ctx.globalAlpha = primary ? 0.35 : 0.18;
    ctx.strokeStyle = e.def.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + dx * R, py + dy * R);
    ctx.lineTo(ax, ay);
    ctx.stroke();

    // The arrow itself.
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(e.ca);
    ctx.globalAlpha = primary ? (0.7 + 0.3 * pulse) : 0.5;
    ctx.fillStyle = e.def.color;
    ctx.beginPath();
    ctx.moveTo(0, -W);
    ctx.lineTo(L, 0);
    ctx.lineTo(0, W);
    ctx.lineTo(L * 0.4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Nearest-boss readout, just inside its arrow.
    if (primary) {
      const txt = e.def.name.toUpperCase() + '  ' + Math.round(e.d / TILE) + 'm';
      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(txt).width + 16;
      let lx = tipx - dx * (L + 22);
      let ly = tipy - dy * (L + 22);
      lx = Math.max(tw / 2 + 8, Math.min(w - tw / 2 - 8, lx));
      ly = Math.max(12, Math.min(h - 12, ly));
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(10,12,18,0.78)';
      ctx.fillRect(lx - tw / 2, ly - 10, tw, 20);
      ctx.strokeStyle = e.def.color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(lx - tw / 2, ly - 10, tw, 20);
      ctx.fillStyle = e.def.color;
      ctx.fillText(txt, lx, ly + 0.5);
    }
  }

  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Swirling purple-gold warp portal rendered at a cleared heart.
function drawPortal(sx, sy, t, ph) {
  const k = t * 0.003 + ph;
  ctx.save();
  // soft under-glow
  const grd = ctx.createRadialGradient(sx, sy, 2, sx, sy, 54);
  grd.addColorStop(0, 'rgba(180,120,255,0.35)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(sx, sy, 54, 0, PI2);
  ctx.fill();
  // spinning rings (gold + violet counter-rotate)
  for (let ring = 0; ring < 2; ring++) {
    const a = ring === 0 ? k : -k * 1.3;
    ctx.strokeStyle = ring === 0 ? 'rgba(255,210,110,0.65)' : 'rgba(190,120,255,0.5)';
    ctx.lineWidth = ring === 0 ? 3 : 2;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 34 - ring * 6, 26 - ring * 4, a, 0, PI2);
    ctx.stroke();
  }
  // center vortex
  const vg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20);
  vg.addColorStop(0, 'rgba(255,235,170,0.9)');
  vg.addColorStop(0.6, 'rgba(150,90,255,0.45)');
  vg.addColorStop(1, 'rgba(90,40,180,0)');
  ctx.fillStyle = vg;
  ctx.beginPath();
  ctx.arc(sx, sy, 20 + Math.sin(t * 0.006 + ph) * 3, 0, PI2);
  ctx.fill();
  ctx.restore();
}

// ============================================================
// MATERIALIZED SHADOWS — enemy silhouettes (visual system)
// Every enemy is a compact "living shadow": a boiling silhouette whose
// outline shifts, creeps and flickers every frame, plus a per-kind body so
// the roster reads as distinct creatures. Helpers are shared, shapes are not.
// ============================================================

// Detail budget for the current enemy: 2 = full, 1 = trimmed, 0 = cheapest.
// Lowered for tiny/far enemies, huge crowds and reduced graphics quality —
// this is the single biggest per-enemy cost at high difficulty, so it must
// scale down instead of staying fixed while the swarm grows.
let _sdDet = 2;
function _lodN(n) {
  return _sdDet >= 2 ? n : (_sdDet === 1 ? Math.max(5, Math.round(n * 0.72)) : Math.max(4, Math.round(n * 0.5)));
}
function _chaik2(pts) {
  if (!pts || pts.length < 3) return pts;
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
    out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
  }
  return out;
}
function _traceRing(cx, cy, n, radFn, it) {
  let pts = [];
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const r = Math.max(1.2, radFn(a, i) || 1.2);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  for (let k = 0; k < (it || 1); k++) pts = _chaik2(pts);
  return pts;
}
function _tracePath(pts) {
  if (!pts || pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}
function _fillPts(pts) { _tracePath(pts); ctx.fill(); }
function _strokePts(pts, col, w, alpha) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  _tracePath(pts);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
function _faceAngle(e) {
  const p = typeof game !== 'undefined' && game.player ? game.player : null;
  if (e.faceA != null) return e.faceA;
  if (p) return Math.atan2(p.y - e.y, p.x - e.x);
  return 0;
}
function _eyes(sx, sy, R, t, eph, P, n, yoff, es, gap, xoff) {
  const count = Math.max(0, Math.round(n));
  if (!count) return;
  const ew = Math.max(1.4, R * 0.15 * (es || 1));
  const eh = Math.max(1.2, R * 0.10 * (es || 1));
  const bl = 0.45 + 0.55 * Math.abs(Math.sin(t * 0.0032 + eph));   // blink
  ctx.fillStyle = P.glint;
  for (let i = 0; i < count; i++) {
    const off = count === 1 ? 0 : (i - (count - 1) / 2);
    const ex = sx + off * R * (gap || 0.42) + (xoff || 0) * R;
    const ey = sy + (yoff || 0) * R;
    ctx.fillRect(ex - ew / 2, ey - eh * bl / 2, ew, eh * bl);
  }
}
function _tendrils(sx, sy, R, t, eph, P, n, len, col, wMul, rotOff, swayAmp) {
  if (_sdDet < 1) return;
  const count = Math.max(0, Math.round(n));
  if (!count) return;
  ctx.strokeStyle = col || P.body;
  ctx.lineWidth = Math.max(1.2, R * 0.11 * (wMul || 1));
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const a = eph + i * (Math.PI * 2 / count) + (rotOff || 0) + t * 0.0003;
    const sw = Math.sin(t * 0.005 + i * 2.3) * R * (swayAmp || 0.2);
    const tip = R * (len || 1.2) * (1 + 0.1 * Math.sin(t * 0.003 + i * 1.7));
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a) * R * 0.45, sy + Math.sin(a) * R * 0.45);
    ctx.quadraticCurveTo(
      sx + Math.cos(a) * R * 0.8 + Math.cos(a + 1.4) * sw,
      sy + Math.sin(a) * R * 0.8 + Math.sin(a + 1.4) * sw,
      sx + Math.cos(a) * tip, sy + Math.sin(a) * tip);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
function _spikes(sx, sy, R, t, eph, P, n, len, col, baseA, span) {
  if (_sdDet < 1) return;
  const count = Math.max(0, Math.round(n));
  if (!count) return;
  ctx.strokeStyle = col || P.core;
  ctx.lineWidth = Math.max(1.4, R * 0.05);
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const frac = count === 1 ? 0.5 : i / (count - 1);
    const a = (baseA || -Math.PI * 0.8) + frac * (span || Math.PI * 1.6);
    const wob = Math.sin(t * 0.012 + i * 1.9 + eph) * 0.07;
    const L = R * (len || 0.3) * (1 + 0.16 * Math.sin(t * 0.008 + i * 2.1));
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a) * R * 0.88, sy + Math.sin(a) * R * 0.88);
    ctx.lineTo(sx + Math.cos(a + wob) * (R * 0.88 + L), sy + Math.sin(a + wob) * (R * 0.88 + L));
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
// The shared "living shadow" body: a boiling ring with an inner shifting core
// and a creeping outline + smoky echo rim. Tuned per enemy via `o`.
function _livingMass(sx, sy, R, t, eph, P, o) {
  const o2 = Object.assign({
    n: 12, amp: 0.08, f1: 3, f2: 5, r0: 1, coreR: 0.5,
    it: 1, echo: true, rim: true, pulseR: 0.002
  }, o || {});
  const n = _lodN(o2.n);
  const chi = _sdDet >= 1 ? o2.it : 0;
  const amp = o2.amp * (1 + 0.22 * Math.sin(t * o2.pulseR + eph));
  const bodyR = (a, i) =>
    R * o2.r0 * (1 + amp * Math.sin(a * o2.f1 + eph * 1.7 + t * 0.004)
      + amp * 0.5 * Math.cos(a * o2.f2 - eph * 2.3 - t * 0.003 + 1.4));
  if (GFX.enemyFx && o2.echo && _sdDet >= 2) {
    _strokePts(_traceRing(sx, sy, n,
      a => R * o2.r0 * (1.12 + 0.05 * Math.cos(t * 0.005 + eph)), 1),
      'rgb(' + P.aura + ')', Math.max(1, R * 0.08), 0.26);
  }
  ctx.fillStyle = P.body;
  const pts = _traceRing(sx, sy, n, bodyR, chi);
  _fillPts(pts);
  if (P.deep && _sdDet > 0) {
    // Dark crease hugging the silhouette edge = materialized depth
    ctx.strokeStyle = P.deep;
    ctx.lineWidth = Math.max(1, R * 0.22);
    ctx.globalAlpha = 0.55;
    _tracePath(_traceRing(sx, sy, n, (a, i) => bodyR(a, i) * 0.9, 0));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (_sdDet > 0) {
    ctx.fillStyle = P.core;
    _fillPts(_traceRing(sx, sy, n,
      a => R * o2.r0 * o2.coreR * (1 + o2.amp * 1.6 * Math.sin(a * o2.f1 - eph * 1.7 + t * 0.003 + 2.4)),
      chi));
    if (o2.rim) _strokePts(pts, P.core, Math.max(1, R * 0.08), 0.9);
  }
  return pts;
}
// One distinct silhouette per enemy kind. Palette flows in via `P`
// ({body, core, glint, aura}) so the roster keeps its biome colours.
function drawShadowBody(ctx, e, sx, sy, R, t, eph, P) {
  const kind = e.kind || e.type;

  // ------------------------------------------------------------
  // BOSS & GUARDIAN — the Tyrant of Shadows
  // ------------------------------------------------------------
  if (e.type === 'boss') {
    const pulse = 1 + 0.06 * Math.sin(t * 0.003 + eph);
    _livingMass(sx, sy, R * pulse, t, eph, P, { n: 16, amp: 0.10, f1: 3, f2: 6, r0: 1.02, coreR: 0.5, it: 1, echo: true });
    for (const ux of [-0.62, 0, 0.62]) {
      const hx = sx + ux * R;
      const sway = Math.sin(t * 0.003 + ux * 4 + eph) * 0.12;
      const lean = ux * (0.3 + 0.1 * Math.cos(t * 0.005 + eph));
      const hornL = R * (1.25 + 0.1 * Math.sin(t * 0.006 + ux + eph)) * pulse;
      ctx.fillStyle = P.core;
      ctx.beginPath();
      ctx.moveTo(hx - R * 0.16, sy - R * 0.5);
      ctx.quadraticCurveTo(hx + lean * R, sy - R * 1.05, hx + ux * R * 0.5 + sway * R, sy - hornL);
      ctx.lineTo(hx + R * 0.07, sy - R * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    _tendrils(sx, sy, R * 1.15, t, eph, P, 9, 0.55, P.body, 1, Math.PI, 0.16);
    const thr = 1 + 0.16 * Math.sin(t * 0.003 + eph);
    ctx.fillStyle = P.glint;
    ctx.beginPath();
    ctx.arc(sx, sy + R * 0.12, R * 0.22 * thr, 0, Math.PI * 2);
    ctx.fill();
    _eyes(sx, sy, R, t, eph, P, 2, -0.18, 1.15, 0.5);
    if (GFX.enemyFx) {
      ctx.fillStyle = P.body;
      const count = kind === 'guardian' ? 8 : 6;
      for (let i = 0; i < count; i++) {
        const a = eph + t * 0.0005 + i * (Math.PI * 2 / count);
        const fd = R * (1.28 + 0.14 * Math.sin(t * 0.002 + i));
        const fx2 = sx + Math.cos(a) * fd;
        const fy2 = sy + Math.sin(a) * fd;
        const s = 2 + R * 0.05 * (kind === 'guardian' ? 0.7 : 1);
        ctx.save();
        ctx.translate(fx2, fy2);
        ctx.rotate(a + t * 0.003);
        ctx.fillRect(-s * 0.5, -s * 0.5, s, s);
        ctx.restore();
      }
    }
    if (kind === 'guardian') {
      const gr = R * (1.15 + 0.05 * Math.sin(t * 0.004 + eph));
      ctx.strokeStyle = 'rgba(' + P.aura + ',0.6)';
      ctx.lineWidth = Math.max(1.5, R * 0.03);
      ctx.beginPath();
      ctx.arc(sx, sy - R * 0.1, gr, 0, Math.PI * 2);
      ctx.stroke();
    }
    return;
  }

  // ------------------------------------------------------------
  // WARDEN — crowned colossus
  // ------------------------------------------------------------
  if (e.type === 'warden' || kind === 'warden') {
    const pulse = 1 + 0.05 * Math.sin(t * 0.0025 + eph);
    _livingMass(sx, sy, R * pulse, t, eph, P, { n: 12, amp: 0.06, f1: 2, f2: 4, r0: 1.05, coreR: 0.4, it: 1, echo: true });
    ctx.fillStyle = P.core;
    for (const ud of [-0.72, 0.72]) {
      const syy = sy - R * 0.3 + Math.sin(t * 0.003 + eph) * R * 0.02;
      ctx.beginPath();
      ctx.arc(sx + ud * R, syy, R * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    _spikes(sx, sy, R, t, eph, P, 7, 0.42, 'rgba(255,215,120,0.95)', -Math.PI * 0.8, Math.PI * 1.6);
    const ch = 1 + 0.18 * Math.sin(t * 0.004 + eph);
    ctx.fillStyle = P.glint;
    ctx.beginPath();
    ctx.arc(sx, sy + R * 0.16, R * 0.16 * ch, 0, Math.PI * 2);
    ctx.fill();
    _eyes(sx, sy, R, t, eph, P, 2, -0.32, 0.9, 0.6);
    return;
  }

  // ------------------------------------------------------------
  // SHADOWLING — the common wandering wisp
  // ------------------------------------------------------------
  if (kind === 'normal' || kind === 'shadowling') {
    _livingMass(sx, sy, R, t, eph, P, { n: 11, amp: 0.09, f1: 3, f2: 4, r0: 0.92, coreR: 0.45, it: 1 });
    _tendrils(sx, sy, R, t, eph, P, 2, 1.05, P.core, 1, Math.PI, 0.12);
    _eyes(sx, sy, R, t, eph, P, 2, -0.16, 1, 0.44);
    return;
  }

  // ------------------------------------------------------------
  // SWARMLING — tiny boiling pin-cushion
  // ------------------------------------------------------------
  if (kind === 'swarmling') {
    _livingMass(sx, sy, R, t, eph, P, { n: 10, amp: 0.14, f1: 5, f2: 7, r0: 1.0, coreR: 0.5, it: 1, echo: false });
    _spikes(sx, sy, R, t, eph, P, 8, 0.28, P.body, 0, Math.PI * 2);
    _eyes(sx, sy, R, t, eph, P, 1, 0, 1.4, 0, 0);
    return;
  }

  // ------------------------------------------------------------
  // RUNNER — arrow of darkness (blade skeleton)
  // ------------------------------------------------------------
  if (kind === 'runner') {
    const ang = _faceAngle(e);
    ctx.save();
    ctx.translate(sx, sy + Math.sin(t * 0.009 + eph) * R * 0.05);
    ctx.rotate(ang);
    const bladeR = (a) => {
      const xF = Math.cos(a);
      const len = 1 + xF * 0.85;
      const wid = 1 - Math.abs(xF) * 0.6;
      return R * Math.max(0.28, len * wid * 0.92) * (1 + 0.12 * Math.sin(a * 6 + t * 0.012 + eph));
    };
    ctx.fillStyle = P.body;
    _fillPts(_traceRing(0, 0, 10, bladeR, 1));
    ctx.fillStyle = P.core;
    _fillPts(_traceRing(0, 0, 10, a => bladeR(a) * 0.55, 1));
    ctx.strokeStyle = P.core;
    ctx.lineWidth = Math.max(1.5, R * 0.09);
    ctx.lineCap = 'round';
    for (const sgn of [-1, 1]) {
      const wy = Math.sin(t * 0.008 + sgn * 1.7 + eph) * R * 0.5;
      const tip2 = R * 1.7 * (1 + 0.16 * Math.sin(t * 0.005 + eph));
      ctx.beginPath();
      ctx.moveTo(-R * 0.55, 0);
      ctx.quadraticCurveTo(-R * 1.35, wy * 0.45, -tip2, wy);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    _eyes(0, 0, R, t, eph, P, 1, -0.05, 1.1, 0, 0.82);
    ctx.restore();
    return;
  }

  // ------------------------------------------------------------
  // DUNE RUNNER — swept sand whisp
  // ------------------------------------------------------------
  if (kind === 'dunerunner') {
    const ang = _faceAngle(e);
    ctx.save();
    ctx.translate(sx, sy + Math.sin(t * 0.008 + eph) * R * 0.05);
    ctx.rotate(ang);
    const bladeR = (a) => {
      const xF = Math.cos(a);
      const len = 1 + xF * 0.9;
      const wid = 1 - Math.abs(xF) * 0.5;
      return R * Math.max(0.3, len * wid * 0.95) * (1 + 0.1 * Math.sin(a * 5 - t * 0.01 + eph));
    };
    ctx.fillStyle = P.body;
    _fillPts(_traceRing(0, 0, 11, bladeR, 1));
    ctx.fillStyle = P.core;
    _fillPts(_traceRing(0, 0, 11, a => bladeR(a) * 0.5, 1));
    ctx.strokeStyle = P.core;
    ctx.lineWidth = Math.max(1.4, R * 0.06);
    ctx.lineCap = 'round';
    for (const sgn of [-1, 1]) {
      const wy = Math.sin(t * 0.01 + eph) * R * 0.35;
      ctx.beginPath();
      ctx.moveTo(R * 0.1, 0);
      ctx.quadraticCurveTo(-R * 0.2, sgn * R * 0.9, -R * 0.7, sgn * R * 0.55 + wy * 0.2);
      ctx.stroke();
    }
    if (GFX.enemyFx) {
      ctx.fillStyle = P.glint;
      for (let i = 0; i < 3; i++) {
        const tt = (t * 0.004 + eph + i * 1.3) % 1;
        const tr = R * (0.9 + tt * 1.1);
        const ty = Math.sin(tt * 9 + i * 2) * R * 0.4;
        ctx.globalAlpha = 0.35 * (1 - tt);
        ctx.fillRect(-tr, ty, Math.max(1.5, R * 0.07), Math.max(1.5, R * 0.07));
      }
      ctx.globalAlpha = 1;
    }
    ctx.lineCap = 'butt';
    _eyes(0, 0, R, t, eph, P, 1, -0.05, 1.1, 0, 0.8);
    ctx.restore();
    return;
  }

  // ------------------------------------------------------------
  // PINE WRAITH — tall, thin, dripping needles of shadow
  // ------------------------------------------------------------
  if (kind === 'pinewraith') {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(1, 1.5);
    _livingMass(0, 0, R, t, eph, P, { n: 9, amp: 0.12, f1: 2, f2: 5, r0: 0.62, coreR: 0.45, it: 1, echo: false });
    ctx.restore();
    ctx.strokeStyle = P.body;
    ctx.lineWidth = Math.max(1.2, R * 0.06);
    ctx.lineCap = 'round';
    for (const sgn of [-1, 1]) {
      const wY = Math.sin(t * 0.004 + eph + sgn) * R * 0.3;
      ctx.beginPath();
      ctx.moveTo(sx + sgn * R * 0.35, sy - R * 0.15);
      ctx.quadraticCurveTo(sx + sgn * R * 0.95, sy + R * 0.35, sx + sgn * R * 0.7, sy + R * 0.95 + wY);
      ctx.stroke();
    }
    if (GFX.enemyFx) {
      ctx.fillStyle = P.glint;
      for (let i = 0; i < 4; i++) {
        const tt = (t * 0.002 + eph * 0.7 + i * 0.31) % 1;
        ctx.globalAlpha = 0.5 * (1 - tt);
        ctx.fillRect(sx + Math.sin(tt * 8 + i * 3) * R * 0.5, sy - R * (0.4 + tt * 1.4), 1.5, 1.5);
      }
      ctx.globalAlpha = 1;
    }
    ctx.lineCap = 'butt';
    _eyes(sx, sy - R * 0.35, R, t, eph, P, 2, 0, 0.7, 0.5);
    return;
  }

  // ------------------------------------------------------------
  // FROSTLING — living crystal shard
  // ------------------------------------------------------------
  if (kind === 'frostling') {
    const rot = t * 0.0002 + eph * 0.5;
    const jag = [
      [1.3, 0.72, 0.55, 0.9, 1.32, 0.7, 0.52, 0.86],
      [1.25, 0.8, 0.6, 1.0, 1.18, 0.75, 0.68, 0.92]
    ];
    const set = jag[Math.floor(eph) % 2];
    const crysR = (a, i) => set[i % set.length] * R * 0.92 * (1 + 0.06 * Math.sin(a * 4 + t * 0.006 + eph));
    ctx.fillStyle = P.body;
    _fillPts(_traceRing(sx, sy, 8, crysR, 0));
    ctx.strokeStyle = P.glint;
    ctx.lineWidth = Math.max(1, R * 0.04);
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 8; i++) {
      const a = rot + i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * R * 0.15, sy + Math.sin(a) * R * 0.15);
      ctx.lineTo(sx + Math.cos(a) * set[i] * R * 0.9, sy + Math.sin(a) * set[i] * R * 0.9);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    _spikes(sx, sy, R, t, eph, P, 8, 0.3, P.glint, 0, Math.PI * 2);
    _eyes(sx, sy, R, t, eph, P, 2, -0.1, 0.8, 0.45);
    return;
  }

  // ------------------------------------------------------------
  // RIVER WISP — flowing water ghost
  // ------------------------------------------------------------
  if (kind === 'riverwisp') {
    _livingMass(sx, sy, R, t, eph, P, { n: 11, amp: 0.13, f1: 2, f2: 3, r0: 0.95, coreR: 0.4, it: 1 });
    const ang = _faceAngle(e);
    ctx.strokeStyle = P.body;
    ctx.lineWidth = Math.max(1.5, R * 0.12);
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = ang + Math.PI + (i - 1) * 0.55 + Math.sin(t * 0.003 + eph + i) * 0.12;
      const wY = Math.sin(t * 0.006 + i * 1.9 + eph) * R * 0.65;
      const tip3 = R * (1.6 + 0.2 * Math.sin(t * 0.004 + i + eph));
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * R * 0.4, sy + Math.sin(a) * R * 0.4);
      ctx.quadraticCurveTo(
        sx + Math.cos(a) * R * 1.0 + Math.cos(a + 1.3) * wY * 0.6,
        sy + Math.sin(a) * R * 1.0 + Math.sin(a + 1.3) * wY * 0.6,
        sx + Math.cos(a) * tip3 + Math.cos(a + 1.3) * wY,
        sy + Math.sin(a) * tip3 + Math.sin(a + 1.3) * wY);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    _eyes(sx, sy, R, t, eph, P, 2, -0.15, 0.9, 0.46);
    return;
  }

  // ------------------------------------------------------------
  // BRUTE — heavy wide beast
  // ------------------------------------------------------------
  if (kind === 'brute') {
    const gulp = e.gulp || 0;
    const pulse = 1 + 0.045 * Math.sin(t * 0.0025 + eph) + 0.16 * gulp * Math.abs(Math.sin(t * 0.02 + eph));
    _livingMass(sx, sy, R * pulse, t, eph, P, { n: 13, amp: 0.05, f1: 2, f2: 5, r0: 1.15, coreR: 0.4, it: 1, echo: true });
    const open = Math.max(0.5 + 0.5 * Math.sin(t * 0.0025 + eph), gulp * 0.85);
    ctx.fillStyle = P.core;
    ctx.beginPath();
    ctx.ellipse(sx + Math.sin(t * 0.002 + eph) * R * 0.05, sy + R * 0.2,
      R * (0.34 + 0.1 * open), R * (0.24 + 0.16 * open), 0, 0, Math.PI * 2);
    ctx.fill();
    _eyes(sx, sy, R, t, eph, P, 2, -0.4, 1.1, 0.55);
    return;
  }

  // ------------------------------------------------------------
  // CANYON GOLEM — blocky rock colossus
  // ------------------------------------------------------------
  if (kind === 'canyongolem') {
    const rot = t * 0.00008 + eph * 0.2;
    const fac = [1.5, 0.62, 0.42, 0.8, 1.45, 0.6, 0.4, 0.78, 1.52, 0.66, 0.46, 0.84];
    const rockR = (a, i) => fac[i % fac.length] * R * 0.85;
    ctx.fillStyle = P.body;
    _fillPts(_traceRing(sx, sy, 12, rockR, 0));
    ctx.strokeStyle = P.core;
    ctx.lineWidth = Math.max(1.2, R * 0.035);
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 6; i++) {
      const a = rot + i * Math.PI / 3;
      const jr = R * (0.85 + 0.12 * Math.sin(t * 0.004 + i));
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * R * 0.5, sy + Math.sin(a) * R * 0.5);
      ctx.lineTo(sx + Math.cos(a + 0.35) * jr, sy + Math.sin(a + 0.35) * jr);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    _eyes(sx, sy, R, t, eph, P, 2, -0.28, 0.7, 0.62);
    return;
  }

  // ------------------------------------------------------------
  // SHIELDED — angular slab facing the player
  // ------------------------------------------------------------
  if (kind === 'shielded') {
    const ang = _faceAngle(e);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang);
    const kite = (a) => {
      const xF = Math.cos(a);
      const yF = Math.sin(a);
      const front = xF > 0 ? 1 + xF * 0.55 : 1 - Math.abs(xF) * 0.3;
      const wid = Math.max(0.35, 0.85 - Math.abs(yF) * 0.3);
      return R * front * wid * (1 + 0.06 * Math.sin(a * 3 + t * 0.006 + eph));
    };
    ctx.fillStyle = P.body;
    _fillPts(_traceRing(0, 0, 9, kite, 1));
    ctx.fillStyle = P.core;
    ctx.beginPath();
    ctx.arc(R * 0.12, 0, R * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.glint;
    for (const sgn of [-1, 1]) {
      const j = Math.sin(t * 0.01 + eph + sgn) * R * 0.02;
      ctx.fillRect(R * 0.45, sgn * R * 0.45 + j, R * 0.08, R * 0.08);
      ctx.fillRect(-R * 0.5, sgn * R * 0.5 + j, R * 0.08, R * 0.08);
    }
    _eyes(0, 0, R, t, eph, P, 2, -0.15, 0.9, 0.6, 0.35);
    ctx.restore();
    return;
  }

  // ------------------------------------------------------------
  // SPLITTER — two twinned lobes
  // ------------------------------------------------------------
  if (kind === 'splitter') {
    const trem = Math.max(0, 1 - e.hp / (e.maxHp || 1));
    const sh = trem * R * 0.16 * Math.sin(t * 0.03 + eph * 3);
    const wobL = Math.sin(t * 0.006 + eph) * R * 0.12 * (1 + trem);
    _livingMass(sx - R * 0.45 + wobL * 0.5 + sh, sy, R * 0.62, t, eph, P, { n: 10, amp: 0.1, f1: 3, f2: 5, r0: 1, coreR: 0.5, it: 1, echo: false });
    _livingMass(sx + R * 0.45 - wobL * 0.5 - sh, sy, R * 0.62, t, eph + 1.3, P, { n: 10, amp: 0.1, f1: 3, f2: 5, r0: 1, coreR: 0.5, it: 1, echo: false });
    ctx.strokeStyle = P.core;
    ctx.lineWidth = Math.max(1.5, R * 0.07);
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 0.008 + eph);
    ctx.beginPath();
    ctx.moveTo(sx - R * 0.12, sy - R * 0.3);
    ctx.lineTo(sx + R * 0.06, sy - R * 0.1 + Math.sin(t * 0.01 + eph) * R * 0.06);
    ctx.lineTo(sx - R * 0.04, sy + R * 0.12);
    ctx.lineTo(sx + R * 0.1, sy + R * 0.3);
    ctx.stroke();
    ctx.globalAlpha = 1;
    _eyes(sx - R * 0.42, sy + R * 0.08, R * 0.6, t, eph, P, 1, 0, 1, 0, 0);
    _eyes(sx + R * 0.48, sy + R * 0.08, R * 0.6, t, eph, P, 1, 0, 1, 0, 0);
    return;
  }

  // ------------------------------------------------------------
  // CASTER — hooded watcher with a cowl
  // ------------------------------------------------------------
  if (kind === 'caster') {
    if (GFX.enemyFx) {
      const hr = R * 1.5 * (1 + 0.06 * Math.sin(t * 0.004 + eph));
      ctx.strokeStyle = 'rgba(' + P.aura + ',0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, hr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(1, 1.35);
    const hoodR = (a) => R * (0.92 - 0.42 * Math.abs(Math.cos(a))) * (1 + 0.07 * Math.sin(a * 2 + t * 0.004 + eph));
    ctx.fillStyle = P.body;
    _fillPts(_traceRing(0, 0, 10, hoodR, 1));
    ctx.fillStyle = P.core;
    _fillPts(_traceRing(0, 0, 10, a => hoodR(a) * 0.55, 1));
    ctx.restore();
    _spikes(sx, sy - R * 0.3, R, t, eph, P, 6, 0.8, P.core, -Math.PI * 0.85, Math.PI * 1.7);
    _eyes(sx, sy - R * 0.15, R, t, eph, P, 1, 0, 1.3, 0, 0);
    return;
  }

  // ------------------------------------------------------------
  // SCORCHER — rising flame
  // ------------------------------------------------------------
  if (kind === 'scorcher') {
    _livingMass(sx, sy, R, t, eph, P, { n: 12, amp: 0.16, f1: 4, f2: 8, r0: 1.0, coreR: 0.5, it: 1, echo: false, pulseR: 0.004 });
    const fr = R * 0.55 * (1 + 0.18 * Math.sin(t * 0.01 + eph));
    ctx.fillStyle = P.core;
    ctx.beginPath();
    ctx.moveTo(sx - fr * 0.5, sy - R * 0.45);
    ctx.quadraticCurveTo(sx - fr * 0.25, sy - R * 1.15,
      sx + Math.sin(t * 0.011 + eph) * fr * 0.3, sy - R * (1.35 + 0.15 * Math.sin(t * 0.013 + eph)));
    ctx.quadraticCurveTo(sx + fr * 0.3, sy - R * 0.9, sx + fr * 0.55, sy - R * 0.4);
    ctx.closePath();
    ctx.fill();
    if (GFX.enemyFx) {
      ctx.fillStyle = P.glint;
      for (let i = 0; i < 4; i++) {
        const tt = (t * 0.005 + eph + i * 0.37) % 1;
        ctx.globalAlpha = 0.6 * (1 - tt);
        ctx.fillRect(sx + Math.sin(tt * 6 + i * 2.7 + eph) * R * 0.7, sy - R * (0.2 + tt * 1.5),
          Math.max(1.4, R * 0.06), Math.max(1.4, R * 0.06));
      }
      ctx.globalAlpha = 1;
    }
    _eyes(sx, sy + R * 0.25, R, t, eph, P, 2, 0, 0.9, 0.6);
    return;
  }

  // ------------------------------------------------------------
  // DRYAD SEER — tree with a branch crown
  // ------------------------------------------------------------
  if (kind === 'dryadseer') {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(1, 1.25);
    _livingMass(0, 0, R * 0.7, t, eph, P, { n: 10, amp: 0.08, f1: 2, f2: 5, r0: 1, coreR: 0.45, it: 1, echo: false });
    ctx.restore();
    _spikes(sx, sy - R * 0.15, R, t, eph, P, 9, 0.75, P.core, -Math.PI * 0.95, Math.PI * 1.9);
    _eyes(sx, sy - R * 0.05, R, t, eph, P, 1, 0, 1.2, 0, 0);
    return;
  }

  // ------------------------------------------------------------
  // BOG HAUNT — bloated bubbling mass
  // ------------------------------------------------------------
  if (kind === 'boghaunt') {
    _livingMass(sx, sy, R, t, eph, P, { n: 12, amp: 0.08, f1: 2, f2: 3, r0: 1.05, coreR: 0.35, it: 1, echo: true });
    ctx.fillStyle = P.core;
    for (let i = 0; i < 5; i++) {
      const ba = eph + i * 1.26;
      const bx = sx + Math.cos(ba) * R * 0.55;
      const by = sy + Math.sin(ba) * R * 0.55 + Math.sin(t * 0.004 + i * 2) * R * 0.06;
      ctx.beginPath();
      ctx.arc(bx, by, R * (0.12 + 0.04 * Math.sin(t * 0.006 + i)), 0, Math.PI * 2);
      ctx.fill();
    }
    _tendrils(sx, sy, R, t, eph, P, 3, 0.6, P.core, 1, Math.PI, 0.08);
    _eyes(sx, sy, R, t, eph, P, 2, -0.25, 0.8, 0.55);
    return;
  }

  // ------------------------------------------------------------
  // LEECHER — serpent with a pulsing maw
  // ------------------------------------------------------------
  if (kind === 'leecher') {
    const ang = _faceAngle(e);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang);
    const worm = (a) => {
      const xF = Math.cos(a);
      const front = xF > 0 ? 1 + xF * 0.45 : 1 - Math.abs(xF) * 0.55;
      const wid = Math.max(0.34, 0.8 - Math.abs(Math.sin(a)) * 0.25);
      return R * front * wid * (1 + 0.09 * Math.sin(a * 3 + t * 0.008 + eph));
    };
    ctx.fillStyle = P.body;
    _fillPts(_traceRing(0, 0, 11, worm, 1));
    _spikes(0, 0, R, t, eph, P, 5, 0.4, P.core, -Math.PI * 0.6, Math.PI * 0.9);
    const open = 0.5 + 0.5 * Math.sin(t * 0.004 + eph);
    ctx.fillStyle = P.core;
    ctx.beginPath();
    ctx.ellipse(R * 0.35, 0, R * 0.26 + open * R * 0.1, R * 0.12 + open * R * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    _eyes(0, 0, R, t, eph, P, 2, -0.1, 0.8, 0.4, 0.15);
    ctx.restore();
    return;
  }

  // ------------------------------------------------------------
  // ELITE — shadow knight
  // ------------------------------------------------------------
  if (kind === 'elite') {
    const pulse = 1 + 0.05 * Math.sin(t * 0.0035 + eph);
    _livingMass(sx, sy, R * pulse, t, eph, P, { n: 14, amp: 0.09, f1: 3, f2: 6, r0: 1.0, coreR: 0.45, it: 1, echo: true });
    for (const sgn of [-1, 1]) {
      const wob = Math.sin(t * 0.009 + eph + sgn) * R * 0.05;
      ctx.fillStyle = P.core;
      ctx.beginPath();
      ctx.moveTo(sx + sgn * R * 0.3, sy - R * 0.5);
      ctx.lineTo(sx + sgn * R * 1.15, sy - R * 0.75 + wob);
      ctx.lineTo(sx + sgn * R * 0.8, sy);
      ctx.closePath();
      ctx.fill();
    }
    _eyes(sx, sy - R * 0.1, R, t, eph, P, 1, 0, 1.4, 0, 0);
    return;
  }

  // ------------------------------------------------------------
  // FALLBACK — any unlisted kind gets the shadowling body
  // ------------------------------------------------------------
  _livingMass(sx, sy, R, t, eph, P, { n: 11, amp: 0.09, f1: 3, f2: 4, r0: 0.92, coreR: 0.45, it: 1 });
  _eyes(sx, sy, R, t, eph, P, 2, -0.16, 1, 0.44);
}

// ------------------------------------------------------------
// Cached radial sprites: full-gradient glows (nova/shockwave bursts,
// torch and lava light pools, flame flame) drawn once into small offscreen
// canvases and re-blitted, so per-frame createRadialGradient churn is zero.
// ------------------------------------------------------------
const _rSpr = Object.create(null);
function _radialSprite(key, size, stops) {
  let can = _rSpr[key];
  if (can) return can;
  can = document.createElement('canvas');
  can.width = can.height = size;
  const c = can.getContext('2d');
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  _rSpr[key] = can;
  return can;
}
// Pre-baked nova/shockwave glow sprite (centre α 1, transparent rim scaled by
// globalAlpha at draw time)
const _NOVA_SPR = [['0', 'rgba(220,250,255,0.9)'], ['0.5', 'rgba(140,225,255,0.35)'], ['1', 'rgba(110,200,255,0)']];
const _SHOCK_SPR = [['0', 'rgba(255,200,60,0.9)'], ['0.35', 'rgba(255,100,20,0.7)'], ['0.7', 'rgba(255,50,0,0.3)'], ['1', 'rgba(255,30,0,0)']];

// Cached full-screen vignette (rebuilt only when the viewport size changes)
let _vigCan = null, _vigW = 0, _vigH = 0;
function vignetteSprite(w, h) {
  if (_vigCan && _vigW === w && _vigH === h) return _vigCan;
  _vigCan = document.createElement('canvas');
  _vigCan.width = Math.max(1, Math.round(w));
  _vigCan.height = Math.max(1, Math.round(h));
  const c = _vigCan.getContext('2d');
  const g = c.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.4)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  _vigW = w;
  _vigH = h;
  return _vigCan;
}

// ============================================================
// WIND GRASS - animated grass overlay
// ============================================================
// The dark blades of every grass mat stay baked inside the chunk canvases;
// this pass re-draws the exact thin LIGHT blades the bake would have stamped
// (same per-tile seed and formula) and bends them with a slow travelling wind,
// so the only moving grass on screen is the very same grass the bake owns - no
// extra blades, no new tufts. Because the chunk bake skips its light pass
// (skipLight), each blade exists exactly once and simply leans as the wind
// passes.
//
// Cost model: per grass tile the light blades are cached once (a handful of
// numbers), then rebuilt every frame into per-type Path2D paths with the wind
// bend added to the tips. Screen-wide that is a few tens of thousands of segment
// ops and a handful of strokes - no sprites, no transforms, trivial cache memory.
// glint = brighter stem tint used while the wind folds a blade to its max:
// the low-sun light catching the leaned tips (light/shadow wave accent).
const GRASS_WIND_TYPES = [
  { id: 'icegrass',     dark: '#6f93b8', light: '#c2ddf5', glint: '#eef9ff', base: 15, vari: 10, lean: 5,  wind: [0.9, 0.1, 0.85] },
  { id: 'savgrass',     dark: '#7a5a20', light: '#a37a2c', glint: '#e6b84c', base: 18, vari: 12, lean: 6,  wind: [0.98, -0.2, 1.1] },
  { id: 'tallgrass',    dark: '#4c5a1e', light: '#74902c', glint: '#b8e273', base: 20, vari: 14, lean: 7,  wind: [1, 0, 0.9] },
  { id: 'thickgrass',   dark: '#2e5a22', light: '#4a8530', glint: '#86d66a', base: 24, vari: 14, lean: 6,  nL: 11, nD: 14, wind: [0.95, 0.1, 0.85] },
  { id: 'swampgrass',   dark: '#3a4020', light: '#50591f', glint: '#9fb54f', base: 26, vari: 14, lean: 7,  nL: 11, nD: 14, wind: [0.75, 0.25, 0.55] },
  { id: 'canyongrass',  dark: '#7a5738', light: '#a57950', glint: '#d19a66', base: 10, vari: 6,  lean: 4,  wind: [1, 0, 1.4] },
  { id: 'prairiegrass', dark: '#3a5420', light: '#5f7f2e', glint: '#a6d66b', base: 42, vari: 18, lean: 10, nL: 28, nD: 36, dw: 3, wind: [0.98, 0.2, 1.25] }
];
const GRASS_WIND_IDX = {};
for (let i = 0; i < GRASS_WIND_TYPES.length; i++) GRASS_WIND_IDX[GRASS_WIND_TYPES[i].id] = i;

// Wind strength (-1..1): one slow travelling wave sweeping toward +x (left to
// right on screen - a full wave crosses the 3.4k px screen in ~40s) plus two
// very low-frequency organic layers so neighbouring tiles are never in unison.
// t in ms.
// Player grass trail: radius and bend strength of each walk push. Read by the
// WG shader and the 2D fallback; the trail itself is fed by updatePlayer into
// game.grassPushes (x,y + z,w = directional force, decaying over ~1s).
const GRASS_PUSH_R = 12;
const GRASS_PUSH_STR = 0.8;

// Persistent trample mask: the player's walk leaves a permanent flattened path
// (direction + soft radial amount) that never springs back, unlike the live
// pushes above. Layout mirrors the animated blades: TRAMPLE_CELL world-px per
// mask texel, mask tiles of TRAMPLE_A x TRAMPLE_A cells cached as RGBA
// Uint8ClampedArray (R = amount, G/B = direction * amount, 255 in alpha).
// updatePlayer stamps it; the WG shader samples it as a texture (bilinear ->
// smooth path edges) and the 2D fallback reads the same cells per blade.
const TRAMPLE_CELL = 4;
const TRAMPLE_A = TILE / TRAMPLE_CELL;
const GRASS_TRAMPLE_R = 12;
const GRASS_TRAMPLE_STR = 1.0;
const TRAMPLE_TILE_LR = 2048;
const trampleTiles = new Map();
let trampleRev = 0;

function getTrampleTile(tx, ty) {
  const key = tx + ',' + ty;
  let t = trampleTiles.get(key);
  if (t) return t;
  t = new Uint8ClampedArray(TRAMPLE_A * TRAMPLE_A * 4);
  trampleTiles.set(key, t);
  if (trampleTiles.size > TRAMPLE_TILE_LR) {
    trampleTiles.delete(trampleTiles.keys().next().value);
  }
  return t;
}

// Soft footprint stamp: writes the max radial envelope of a step into the cell
// grid. A stronger/newer sample also wins the direction, so the trail follows
// the last movement across a spot while the softer outer flanks of earlier
// passes stay as a faint "sfumatura" of the path edge. Never decays.
function trampleStamp(wx, wy, dx, dy, amt) {
  const tt = getTile(wx, wy);
  if (tt !== T_FLOOR && tt !== T_TREE && tt !== T_TALLGRASS) return;
  if (ownHazardAt(wx, wy) !== HAZARD_NONE) return;
  const invR2 = 1 / (GRASS_TRAMPLE_R * GRASS_TRAMPLE_R);
  const cx0 = Math.floor((wx - GRASS_TRAMPLE_R) / TRAMPLE_CELL);
  const cx1 = Math.floor((wx + GRASS_TRAMPLE_R) / TRAMPLE_CELL);
  const cy0 = Math.floor((wy - GRASS_TRAMPLE_R) / TRAMPLE_CELL);
  const cy1 = Math.floor((wy + GRASS_TRAMPLE_R) / TRAMPLE_CELL);
  const gd = (dx + 1) * 0.5 * amt, bd = (dy + 1) * 0.5 * amt;
  for (let cy = cy0; cy <= cy1; cy++) {
    const ddy = cy * TRAMPLE_CELL + TRAMPLE_CELL * 0.5 - wy;
    const my = ((cy % TRAMPLE_A) + TRAMPLE_A) % TRAMPLE_A;
    const ty = Math.floor(cy / TRAMPLE_A);
    for (let cx = cx0; cx <= cx1; cx++) {
      const ddx = cx * TRAMPLE_CELL + TRAMPLE_CELL * 0.5 - wx;
      const w = Math.exp(-(ddx * ddx + ddy * ddy) * invR2) * amt;
      if (w < 0.02) continue;
      const mx = ((cx % TRAMPLE_A) + TRAMPLE_A) % TRAMPLE_A;
      const t = getTrampleTile(Math.floor(cx / TRAMPLE_A), ty);
      const oi = (my * TRAMPLE_A + mx) * 4;
      // A newer step wins when its falloff is within ~2% of the stored amount
      // (so byte rounding / tiny offsets can't freeze the direction), then its
      // own direction takes over: the path follows the latest movement.
      if (w + 0.02 >= t[oi] / 255) {
        t[oi] = w * 255;
        t[oi + 1] = gd * 255;
        t[oi + 2] = bd * 255;
        t[oi + 3] = 255;
      }
    }
  }
  trampleRev++;
}

function grassWindBend(wx, wy, t, wd, wsp) {
  wd = wd || [1, 0]; wsp = wsp || 1;
  const ps = wx * 0.998 + wy * 0.063;            // shared crest axis: all types
  const pp = wy * 0.998 - wx * 0.063;            // synchronised wavefronts
  const wave = Math.sin(ps * 0.0030 - t * 0.00075);
  const ripp = Math.sin(ps * 0.0058 - t * 0.00030 + Math.sin(pp * 0.0055) * 1.7) * 0.5;
  const sway = Math.cos(ps * 0.0014 - t * 0.00018 + pp * 0.002) * 0.6;
  const osc = wave * 0.50 + ripp * 0.34 + sway * 0.16;
  return clamp(0.55 + osc * 0.45, 0, 1);           // global phase: synced for all types
}

// The per-tile mat hash, exactly as stampBiomeGrass computes it (from the chunk
// cell index rather than the flat tile coords) so the animated blades are the
// same blades the chunk bake would have stamped.
function tileMatSeed(tx, ty) {
  const lx = ((tx % CHUNK) + CHUNK) % CHUNK;
  const ly = ((ty % CHUNK) + CHUNK) % CHUNK;
  const cx = (tx - lx) / CHUNK, cy = (ty - ly) / CHUNK;
  return seed2(cx * CHUNK + lx * 57 + 3, cy * CHUNK + ly * 41 + 11);
}

// The light blades of one grass tile - same seed, same counts and geometry as
// drawPropTile's grassMat light pass. Returns null where the bake lays no grass
// (walls, hazards, desert/canyon gaps).
const grassLightCache = new Map();
// Big enough to hold every visible tile (a 3.4k x 1.3k screen spans ~4600 tiles)
// plus scroll slack, so a steady view never evicts its own blades.
// Must exceed the worst-case tile count in view at DPR2 (6880/D32*2542/32
// ≈ 17.6k plus 3-ring margin ≈ 20k) or the LR will thrash and re-bake the
// whole visible set every frame (that was the real 150 ms cost, not the 2D stroke).
const GRASS_WIND_LR = 30000;
function bakeGrassLight(tx, ty) {
  const wx = tx * TILE + TILE * 0.5, wy = ty * TILE + TILE * 0.5;
  const tt = getTile(wx, wy);
  if (tt !== T_FLOOR && tt !== T_TREE && tt !== T_TALLGRASS) return null;
  if (ownHazardAt(wx, wy) !== HAZARD_NONE) return null;
  const gr = tileMatSeed(tx, ty);
  let gi, hgt;
  if (tt === T_TALLGRASS) {
    gi = GRASS_WIND_IDX.prairiegrass; hgt = 1;
  } else {
    const bm = owningBiomeAt(wx, wy);
    const gtype = BIOME_GRASS[bm];
    if (gtype === undefined) return null;        // desert stays still
    const temp = BIOME_TEMP[bm] || 0.6;
    if (gr >= (temp === 0.9 ? 0.07 : grassDensity(temp))) return null;
    gi = GRASS_WIND_IDX[gtype];
    if (gi === undefined) return null;           // no animated light pass for it
    hgt = temp === 0.9 ? 1 : grassHeight(temp);
  }
  const gt = GRASS_WIND_TYPES[gi];
  const rh = (k) => {
    const v = Math.sin(gr * 43758.5453 + k * 12.9898) * 43758.5453;
    return v - Math.floor(v);
  };
  const lines = [], dlines = [];
  if (gi === GRASS_WIND_IDX.canyongrass) {
    // Isolated dry clumps: 3 absolute-size blades per clump, 1-2 clumps per tile
    // (mirror of drawPropTile's canyongrass branch).
    const cl = 1 + (rh(3) > 0.62 ? 1 : 0);
    for (let k = 0; k < cl; k++) {
      const cxx = 16 + (rh(4 + k * 5) - 0.5) * 22;
      const cyy = 7 + rh(8 + k * 7) * (TILE - 14);
      for (let i = 0; i < 3; i++) {
        lines.push({
          gx: cxx + (rh(37 + i + k * 23) - 0.5) * 8,
          grt: cyy,
          gh: 5 + rh(47 + i + k * 11) * 4,
          le: (rh(43 + i + k * 31) - 0.5) * 5
        });
      }
      for (let i = 0; i < 4; i++) {
        dlines.push({
          gx: cxx + (rh(11 + i + k * 13) - 0.5) * 10,
          grt: cyy,
          gh: 7 + rh(19 + i + k * 17) * 6,
          le: (rh(29 + i + k * 9) - 0.5) * 4
        });
      }
    }
  } else {
    const vs = 0.6 + gr * 0.8;                 // same size variation as the bake
    const nL = gt.nL || 10;
    for (let i = 0; i < nL; i++) {
      lines.push({
        gx: 16 + (rh(i + 41) - 0.5) * 34,      // root x inside the tile
        grt: rh(i + 59) * TILE,                // root depth (anywhere in tile)
        gh: (gt.base * 0.72 + rh(i + 53) * gt.vari) * vs * hgt,
        le: (rh(i + 67) - 0.5) * gt.lean * 0.7 // baked static lean
      });
    }
    const nD = gt.nD || 12;
    for (let i = 0; i < nD; i++) {
      dlines.push({
        gx: 16 + (rh(i + 1) - 0.5) * 34,
        grt: rh(i + 47) * TILE,
        gh: (gt.base + rh(i + 20) * gt.vari) * vs * hgt,
        le: (rh(i + 31) - 0.5) * gt.lean
      });
    }
  }
  // Compact: one flat Float32Array [gx,grt,gh,le, ...] keeps the cache small
  // (~200B/tile) and the per-frame rebuild loop linear without object reads.
  const d = new Float32Array(lines.length * 4);
  for (let i = 0; i < lines.length; i++) {
    const o = i * 4;
    d[o] = lines[i].gx; d[o + 1] = lines[i].grt; d[o + 2] = lines[i].gh; d[o + 3] = lines[i].le;
  }
  const dd = new Float32Array(dlines.length * 4);
  for (let i = 0; i < dlines.length; i++) {
    const o = i * 4;
    dd[o] = dlines[i].gx; dd[o + 1] = dlines[i].grt; dd[o + 2] = dlines[i].gh; dd[o + 3] = dlines[i].le;
  }
  return { gi, d, dd };
}

// Rebuild the cached light blades into per-type paths, bent by the wind (tips
// shift proportionally to their height, like a strand leaning). Each grass type
// gets two strokes: a normal one plus a "glint" one - blades folded far enough
// that their tip leans over catch a brighter tint, sweeping over the field as
// the wave crest passes (light/shadow accent).
const GRASS_GLINT_PX = 3;   // min tip displacement (px) before a blade glints
function drawGrassWind(cx, cy, w, h, t) {
  if (!GFX.grass) return;
  if (typeof WG !== 'undefined' && WG.ok) {
    wgRender(cx, cy, w, h, t);
    ctx.drawImage(WG.canvas, 0, 0, w, h);
    return;
  }
  const firstTx = Math.floor(cx / TILE) - 1, firstTy = Math.floor(cy / TILE) - 1;
  const lastTx = Math.floor((cx + w) / TILE) + 1, lastTy = Math.floor((cy + h) / TILE) + 1;
  const paths = new Map();
  for (let ty = firstTy; ty <= lastTy; ty++) {
    for (let tx = firstTx; tx <= lastTx; tx++) {
      if (GFX.level >= 2 && ((tx + ty) & 1)) continue;   // half density on weak machines
      const key = tx + ',' + ty;
      let ent = grassLightCache.get(key);
      if (ent === undefined) {
        ent = bakeGrassLight(tx, ty);
        grassLightCache.set(key, ent);
        if (grassLightCache.size > GRASS_WIND_LR) {
          grassLightCache.delete(grassLightCache.keys().next().value);
        }
      }
      if (!ent) continue;
      const wind = GRASS_WIND_TYPES[ent.gi].wind || [1, 0, 1];
      const bend = grassWindBend((tx & ~1) * TILE + TILE * 0.5 + 16, (ty & ~1) * TILE + TILE * 0.5 + 16, t, wind, wind[2]);
      const lit = bend <= 0.45 ? 0 : bend >= 0.75 ? 1 : ((bend - 0.45) / 0.3) * ((bend - 0.45) / 0.3) * (3 - 2 * ((bend - 0.45) / 0.3));
      const gust = 0.8 + 0.2 * Math.min(1.6, Math.max(0.4, wind[2]));
      const k = bend * 0.6 * (1 + lit * 1.6) * gust, fold = 1 - bend * 0.2;
      const wl = Math.sqrt(wind[0] * wind[0] + wind[1] * wind[1]) || 1;
      const lx = wind[0] / wl, ly = wind[1] / wl;
      const gP = typeof game !== 'undefined' && game && game.grassPushes ? game.grassPushes : null;
      let pvx = 0, pvy = 0;
      if (gP && gP.length) {
        const cx0 = tx * TILE + TILE * 0.5, cy0 = ty * TILE + TILE * 0.5;
        const invR2 = 1 / (GRASS_PUSH_R * GRASS_PUSH_R);
        for (let i = 0; i < gP.length && i < 40; i++) {
          const dx = cx0 - gP[i].x, dy = cy0 - gP[i].y;
          const w = Math.exp(-(dx * dx + dy * dy) * invR2);
          pvx += gP[i].z * w; pvy += gP[i].w * w;
        }
        pvx *= GRASS_PUSH_STR; pvy *= GRASS_PUSH_STR;
      }
      const ox = tx * TILE - cx, oy = ty * TILE - cy;
      const d = ent.d;
      // Persistent trample cells for this tile, when the walk ever flattened it.
      const tt = trampleTiles.get(tx + ',' + ty);
      for (let j = 0; j < d.length; j += 4) {
        const gx = d[j], grt = d[j + 1], gh = d[j + 2], le = d[j + 3];
        // Per-blade shade bucket (stable per blade, roughly balanced 0..4). Uses the
        // local blade geometry as a cheap, deterministic spread.
        const bkt = ((((gx | 0) * 7 + (grt | 0) * 13 + (gh | 0) * 31) % GRASS_TINT_LEVELS.length) + GRASS_TINT_LEVELS.length) % GRASS_TINT_LEVELS.length;
        const key = ent.gi * 11 + bkt * 2;
        let pn = paths.get(key);
        let pl = paths.get(key + 1);
        if (!pn) { pn = new Path2D(); paths.set(key, pn); }
        if (!pl) { pl = new Path2D(); paths.set(key + 1, pl); }
        const wx0 = ox + gx + (le + k * gh) * lx, wy0 = oy + grt - gh * fold + (le + k * gh) * ly;
        // Same mask the WG shader samples: R=amount, G/B=direction*amount.
        let tpx = 0, tpy = 0;
        if (tt) {
          const cix = (gx / TRAMPLE_CELL) | 0;
          const ciy = (grt / TRAMPLE_CELL) | 0;
          if (cix < TRAMPLE_A && ciy < TRAMPLE_A) {
            const oi = (ciy * TRAMPLE_A + cix) * 4;
            const a = tt[oi] / 255;
            if (a > 0) {
              tpx = (tt[oi + 1] / 255 * 2 - a) * GRASS_TRAMPLE_STR;
              tpy = (tt[oi + 2] / 255 * 2 - a) * GRASS_TRAMPLE_STR;
            }
          }
        }
        let txx = wx0 + (pvx + tpx) * gh, tyy = wy0 + (pvy + tpy) * gh - Math.hypot(pvx + tpx, pvy + tpy) * gh * 0.08;
        const len0 = Math.hypot(wx0 - ox - gx, wy0 - oy - grt);
        const len1 = Math.hypot(txx - ox - gx, tyy - oy - grt);
        if (len1 > len0 && len0 > 0.5) { txx = ox + gx + (txx - ox - gx) * len0 / len1; tyy = oy + grt + (tyy - oy - grt) * len0 / len1; }
        if (lit > 0.5) {
          pl.moveTo(ox + gx, oy + grt);
          pl.lineTo(txx, tyy);
        } else {
          pn.moveTo(ox + gx, oy + grt);
          pn.lineTo(txx, tyy);
        }
      }
    }
  }
  for (const entry of paths) {
    const key = entry[0];
    const gi = (key / 11) | 0;
    const glint = key & 1;
    const bkt = ((key >> 1) % GRASS_TINT_LEVELS.length) % GRASS_TINT_LEVELS.length;
    ctx.lineWidth = glint ? 1.25 : 1;
    ctx.strokeStyle = tintHex(
      GRASS_WIND_TYPES[gi][glint ? 'glint' : 'light'],
      GRASS_TINT_LEVELS[bkt]
    );
    ctx.stroke(entry[1]);
  }
}

function render() {
  const g = game;
  // Interpolated camera: the sim advances in fixed 8.33ms steps, so rendering
  // at the raw camera pos makes the world scroll jump at that quantization on
  // high-refresh displays (speed pulsing). Blend between the pre-step snapshot
  // (g._rpCamX/Y) and the current sim position by ia (0..1) — the world scroll
  // is then fully continuous between simulation steps. (Named `ia`, not
  // `alpha`, to avoid shadowing the per-object alpha used down in the loops.)
  const ia = (typeof g.renderAlpha === 'number') ? g.renderAlpha : 0;
  const cam0x = (typeof g._rpCamX === 'number') ? g._rpCamX : g.camera.x;
  const cam0y = (typeof g._rpCamY === 'number') ? g._rpCamY : g.camera.y;
  let cx = lerp(cam0x, g.camera.x, ia);
  let cy = lerp(cam0y, g.camera.y, ia);
  // Damage-shock camera kick: a small decaying shake right after a hit so hits
  // register on screen even when damage numbers are hidden.
  const shk = (g.player.hurtShake || 0) * 5;
  if (shk > 0.01) {
    cx += Math.sin(g.time * 0.021) * shk;
    cy += Math.cos(g.time * 0.017) * shk;
  }
  const w = VIEW_W;
  const h = VIEW_H;
  ctx.setTransform(DPR * GFX.pixelScale, 0, 0, DPR * GFX.pixelScale, 0, 0);

  ctx.fillStyle = '#0d0d10';
  ctx.fillRect(0, 0, w, h);

  // --- Chunk tiles (procedural terrain) ---
  ensureChunksNear(g.player.x, g.player.y);
  preBakeChunks(g.player.x, g.player.y);
  const firstCx = Math.floor(cx / CHUNK_PX);
  const firstCy = Math.floor(cy / CHUNK_PX);
  const lastCx = Math.floor((cx + w) / CHUNK_PX);
  const lastCy = Math.floor((cy + h) / CHUNK_PX);
  for (let ccy = firstCy; ccy <= lastCy; ccy++) {
    for (let ccx = firstCx; ccx <= lastCx; ccx++) {
      const chk = getChunkCanvas(ccx, ccy);
      ctx.drawImage(chk, ccx * CHUNK_PX - cx, ccy * CHUNK_PX - cy, CHUNK_PX, CHUNK_PX);
    }
  }

  // --- Animated wind grass (baked blade cache, wave + sun glint) ---
  drawGrassWind(cx, cy, w, h, g.time);

  // --- Torches with flickering fire ---
  if (GFX.fire > 0) drawTorches(cx, cy, w, h);

  // --- Living hazard surfaces (lava bubbles, ripples, glints) ---
  drawTerrainAnimated(cx, cy, w, h);

  // --- Big canopy trees (world-space pass, over terrain/torches) ---
  drawTrees(cx, cy, w, h);

  // --- Biome ambient details (fireflies, leaves, snow, spores…) ---
  drawAmbientDetails(cx, cy, w, h);

  // --- Biome treasure chests ---
  drawStatues(cx, cy, w, h);

  // --- Spawn signposts: wooden signs toward the eight biome hearts ---
  drawSpawnSignposts(cx, cy, w, h);

  // --- Boss compass: big corona + edge arrows to the nearest hearts ---
  drawBossCompass(cx, cy, w, h);

  // --- Pickups ---
  for (const pk of g.pickups) {
    const sx = pk.x - cx;
    const sy = pk.y - cy;
    if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;
    if (pk.type === 'magnet') {
      drawMagnetPickup(sx, sy, g.time);
      continue;
    }
    // Umbra Shards: a violet sparkling soul, so it reads as special currency
    if (pk.type === 'essence') {
      const pulse = 1 + Math.sin(g.time * 0.006) * 0.18;
      const sz = pk.radius / 4;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#e7c9ff';
      if (GFX.glow) {
        ctx.shadowColor = '#c86bff';
        ctx.shadowBlur = 12;
      }
      ctx.beginPath();
      ctx.moveTo(sx, sy - 6 * sz * pulse);
      ctx.quadraticCurveTo(sx + 2 * sz * pulse, sy - 2 * sz * pulse, sx + 6 * sz * pulse, sy);
      ctx.quadraticCurveTo(sx + 2 * sz * pulse, sy + 2 * sz * pulse, sx, sy + 6 * sz * pulse);
      ctx.quadraticCurveTo(sx - 2 * sz * pulse, sy + 2 * sz * pulse, sx - 6 * sz * pulse, sy);
      ctx.quadraticCurveTo(sx - 2 * sz * pulse, sy - 2 * sz * pulse, sx, sy - 6 * sz * pulse);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      continue;
    }
    const pulse = 1 + Math.sin(g.time * 0.005) * 0.2;
    const sc = pk.radius / 5;           // scale factor from base 5
    const sz = Math.min(sc, 2.8);       // cap visual scale
    ctx.fillStyle = pk.color;
    // XP gems never fade; others keep life-based fade
    ctx.globalAlpha = pk.type === 'xp' ? 0.85 + 0.15 * pulse
                     : 0.6 + 0.4 * Math.min(1, pk.life / 2000);
    // Outer glow for large XP gems
    if (pk.type === 'xp' && pk.radius > 8) {
      ctx.globalAlpha *= 0.35;
      ctx.beginPath();
      ctx.arc(sx, sy, pk.radius * 2 * pulse, 0, PI2);
      ctx.fill();
      ctx.globalAlpha = pk.type === 'xp' ? 0.85 + 0.15 * pulse
                       : 0.6 + 0.4 * Math.min(1, pk.life / 2000);
    }
    ctx.beginPath();
    // Diamond shape
    ctx.moveTo(sx, sy - 5 * sz * pulse);
    ctx.lineTo(sx + 4 * sz * pulse, sy);
    ctx.lineTo(sx, sy + 5 * sz * pulse);
    ctx.lineTo(sx - 4 * sz * pulse, sy);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // --- Shield orbs ---
  for (const wpn of g.player.weapons) {
    if (wpn.id !== 'holyShield' || !wpn.orbs) continue;
    const pulse = 1 + Math.sin(g.time * 0.006) * 0.15;
    for (const orb of wpn.orbs) {
      const sx = orb.x - cx;
      const sy = orb.y - cy;
      // Outer soft glow
      if (GFX.glow) {
        const grd = ctx.createRadialGradient(sx, sy, 2, sx, sy, 22);
        grd.addColorStop(0, 'rgba(255,240,160,0.9)');
        grd.addColorStop(0.4, 'rgba(255,200,80,0.35)');
        grd.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(sx, sy, 22, 0, PI2);
        ctx.fill();
      }
      // Spinning ring
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 12 * pulse, 5, g.time * 0.004, 0, PI2);
      ctx.stroke();
      // Core
      ctx.fillStyle = '#fff6d0';
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(sx, sy, 6 * pulse, 0, PI2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // --- Familiar drones ---
  for (const wpn of g.player.weapons) {
    if (wpn.id !== 'familiar' || !wpn.drones) continue;
    for (const dr of wpn.drones) {
      if (dr.x === undefined) continue;
      const sx = dr.x - cx;
      const sy = dr.y - cy;
      const pulse = 1 + Math.sin(g.time * 0.01) * 0.12;
      if (GFX.glow) {
        const grd = ctx.createRadialGradient(sx, sy, 1, sx, sy, 20);
        grd.addColorStop(0, 'rgba(80,255,255,0.5)');
        grd.addColorStop(1, 'rgba(80,255,255,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(sx, sy, 20, 0, PI2);
        ctx.fill();
      }
      // Hull + eye toward its current aim
      ctx.fillStyle = '#bff5ff';
      ctx.beginPath();
      ctx.arc(sx, sy, 6 * pulse, 0, PI2);
      ctx.fill();
      ctx.fillStyle = '#3a5a5a';
      ctx.beginPath();
      ctx.arc(sx + Math.cos(dr.aim || 0) * 3, sy + Math.sin(dr.aim || 0) * 3, 2.6, 0, PI2);
      ctx.fill();
      ctx.fillStyle = '#6ff';
      ctx.beginPath();
      ctx.arc(sx + Math.cos(dr.aim || 0) * 3.8, sy + Math.sin(dr.aim || 0) * 3.8, 1.4, 0, PI2);
      ctx.fill();
    }
  }

  // --- Enemies: Shadow Survivors visual system ---
  // Every enemy renders a distinct materialized-shadow silhouette via
  // drawShadowBody(): a boiling "living shadow" outline plus a per-kind body.
  // `e.kind` picks the archetype (runner, brute, caster, ...), `e.type`
  // dominates for boss/warden; unknown kinds fall back to the Shadowling.
  const t = g.time;

  for (const e of g.enemies) {
    if (e.dead) continue;

    // Interpolated world position between the pre-step snapshot and now, so
    // enemies stay glued to the smooth terrain scroll instead of stepping at
    // the 8.33ms sim grid.
    const ex = (typeof e.prevX === 'number') ? lerp(e.prevX, e.x, ia) : e.x;
    const ey = (typeof e.prevY === 'number') ? lerp(e.prevY, e.y, ia) : e.y;
    const sx = ex - cx;
    const sy = ey - cy;
    if (sx < -70 || sx > w + 70 || sy < -70 || sy > h + 70) continue;

    const R = e.radius;
    const eph = e.ph || 0;

    // LOD: tiny silhouettes, screen edges and huge crowds drop detail
    // (point count, smoothing passes, echo/deep/core/rim strokes and
    // decorative spikes/tendrils) — the biggest per-enemy cost in a swarm.
    let det = 2;
    const crowd = g.enemies.length;
    if (crowd > 240) det = 1;
    if (crowd > 420) det = 0;
    if (GFX.level >= 2) det = 0;
    else if (GFX.level === 1 && det > 1) det = 1;
    if (det > 0 && R < 7) det = 1;
    if (R < 5) det = 0;
    if (det > 0) {
      const ddx = sx - w * 0.5, ddy = sy - h * 0.5;
      const lim = (w * 0.45) * (w * 0.45);
      if (ddx * ddx + ddy * ddy > lim) det = 1;
    }
    if (e.type === 'boss') det = Math.max(det, 1);
    _sdDet = det;

    const [ar, ag, ab] = e.aura || [120, 0, 30];

    // Common shadow palette (per biome)
    const body = e.body || '#ff4d4d';
    const core = e.core || '#7a1a1a';
    const glint = e.glint || '#ff9e9e';
    const deep = e.deep || body;

    // Materialized shadow silhouette: each enemy kind draws its own shifting
    // body via the shared "living shadow" helpers inside drawShadowBody.
    drawShadowBody(ctx, e, sx, sy, R, t, eph, { body, core, glint, deep, aura: `${ar},${ag},${ab}` });

    // Hit flash overlay
    if (e.flashTimer > 0) {
      ctx.globalAlpha = 0.45 * (e.flashTimer / 100);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, sy, R * 1.15, 0, PI2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Frost overlay: briefly sluggish enemies glow cyan with a ring
    if (e.slowT > 0 && e.slowFactor !== undefined && e.slowFactor < 1) {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#8ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, R + 5, 0, PI2);
      ctx.stroke();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#8ff';
      ctx.beginPath();
      ctx.arc(sx, sy, R, 0, PI2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Shielded enemy: visible shield wedge always facing the player
    if (e.shield > 0) {
      const fA = e.faceA || 0;
      const half = Math.PI * 0.19;           // ~34° front arc
      const shR = R + 6;
      const shieldHp = clamp(e.shield / (e.maxShield || 1), 0.2, 1);
      ctx.strokeStyle = '#9fe8ff';
      ctx.lineWidth = 2 + 2.5 * shieldHp;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(sx, sy, shR, fA - half, fA + half);
      ctx.stroke();
      ctx.globalAlpha = 0.15 + 0.15 * shieldHp;
      ctx.fillStyle = '#9fe8ff';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.arc(sx, sy, shR, fA - half, fA + half);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // HP bar for elites, wardens and bosses
    if (e.type !== 'normal') {
      const barW = R * 2;
      const barH = 4;
      const barX = sx - barW / 2;
      const barY = sy - R - 10;
      ctx.fillStyle = '#300';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = e.type === 'boss' ? '#f0f' : e.type === 'warden' ? '#af6' : '#fa0';
      ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
    }

    ctx.globalAlpha = 1;
  }

  // --- Poison clouds (stationary DoT zones) ---
  for (const c of g.clouds) {
    const sx = c.x - cx;
    const sy = c.y - cy;
    if (sx < -c.radius || sx > w + c.radius || sy < -c.radius || sy > h + c.radius) continue;
    const alpha = clamp(c.life / c.maxLife, 0, 1);
    const pulse = 1 + 0.1 * Math.sin(g.time * 0.007 + c.x);
    const R = c.radius * pulse;
    if (GFX.glow) {
      const grd = ctx.createRadialGradient(sx, sy, R * 0.1, sx, sy, R);
      grd.addColorStop(0, `rgba(110,230,120,${0.34 * alpha})`);
      grd.addColorStop(0.6, `rgba(70,160,90,${0.22 * alpha})`);
      grd.addColorStop(1, 'rgba(70,160,90,0)');
      ctx.fillStyle = grd;
    } else {
      ctx.fillStyle = `rgba(110,230,120,${0.18 * alpha})`;
    }
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(sx, sy, R, 0, PI2);
    ctx.fill();
    // Rising blobs for texture
    for (let i = 0; i < 5; i++) {
      const ba = g.time * 0.0009 + i * 1.9;
      const br = R * (0.3 + 0.08 * ((i * 37) % 10) / 10) * (1 + 0.15 * Math.sin(g.time * 0.006 + i * 2));
      const bx = sx + Math.cos(ba) * R * 0.42;
      const by = sy + Math.sin(ba) * R * 0.42;
      ctx.fillStyle = `rgba(160,255,170,${0.16 * alpha})`;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, PI2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // --- Turrets (deployable defenses) ---
  for (const tt of g.turrets) {
    const sx = tt.x - cx;
    const sy = tt.y - cy;
    if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;
    const alpha = clamp(tt.life / tt.maxLife, 0, 1);
    // Spinning base glow
    ctx.globalAlpha = 0.22 * alpha;
    ctx.fillStyle = '#ffc078';
    ctx.beginPath();
    ctx.arc(sx, sy, 13, 0, PI2);
    ctx.fill();
    // Hull
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#5a4a2f';
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, PI2);
    ctx.fill();
    ctx.fillStyle = '#8a7040';
    ctx.beginPath();
    ctx.arc(sx, sy, 5.5, 0, PI2);
    ctx.fill();
    // Barrel oriented to target
    ctx.strokeStyle = '#e0b877';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(tt.aim) * 12, sy + Math.sin(tt.aim) * 12);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // Core
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, PI2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // --- Void rifts (pulling gravity wells) ---
  for (const r of g.rifts) {
    const sx = r.x - cx;
    const sy = r.y - cy;
    if (sx < -r.radius || sx > w + r.radius || sy < -r.radius || sy > h + r.radius) continue;
    const alpha = clamp(r.life / r.maxLife, 0, 1);
    const pulse = 1 + 0.08 * Math.sin(g.time * 0.01 + r.x + r.y);
    const R = r.radius * pulse;
    if (GFX.glow) {
      const grd = ctx.createRadialGradient(sx, sy, R * 0.15, sx, sy, R);
      grd.addColorStop(0, `rgba(190,80,255,${0.4 * alpha})`);
      grd.addColorStop(0.5, `rgba(90,20,160,${0.28 * alpha})`);
      grd.addColorStop(1, 'rgba(20,0,40,0)');
      ctx.fillStyle = grd;
    } else {
      ctx.fillStyle = `rgba(120,50,200,${0.22 * alpha})`;
    }
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(sx, sy, R, 0, PI2);
    ctx.fill();
    // Swirling arms
    ctx.strokeStyle = `rgba(210,140,255,${0.35 * alpha})`;
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const a = g.time * 0.004 + i * 0.42 + k * 2.1;
        const rr = R * 0.25 + i * (R * 0.62 / 12);
        const bx = sx + Math.cos(a) * rr;
        const by = sy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
      }
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(235,180,255,${0.8 * alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 7 * pulse, 0, PI2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // --- Caster bolts (enemy projectiles): small animated shadow serpents ---
  for (const cp of g.castProjectiles) {
    const cpx = (typeof cp.prevX === 'number') ? lerp(cp.prevX, cp.x, ia) : cp.x;
    const cpy = (typeof cp.prevY === 'number') ? lerp(cp.prevY, cp.y, ia) : cp.y;
    const sx = cpx - cx;
    const sy = cpy - cy;
    if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;
    const alpha = clamp(cp.life / cp.maxLife, 0, 1);
    const dir = Math.atan2(cp.vy || 0, cp.vx || 1);
    const ph = cp.ph != null ? cp.ph : 0;
    const segs = 6;
    const segLen = Math.max(2, cp.radius * 0.85);
    const amp = cp.radius * (0.55 + 0.18 * Math.sin(g.time * 0.011 + ph));
    const wave = g.time * 0.02 + ph;

    // Serpentine spine: undulating points trailing behind the head
    const pts = [];
    for (let k = 0; k <= segs; k++) {
      const back = k * segLen;
      const sw = Math.sin(back * 0.8 - wave) * amp;
      pts.push([
        sx - Math.cos(dir) * back + Math.cos(dir + Math.PI / 2) * sw,
        sy - Math.sin(dir) * back + Math.sin(dir + Math.PI / 2) * sw
      ]);
    }

    // Fading wake back toward where the bolt came from
    ctx.globalAlpha = alpha * 0.22;
    ctx.strokeStyle = cp.color;
    ctx.lineWidth = Math.max(1, cp.radius * 0.5);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cp.prevX != null ? cp.prevX - cx : sx, cp.prevY != null ? cp.prevY - cy : sy);
    ctx.lineTo(pts[segs][0], pts[segs][1]);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 1;

    // Soft glow at the head
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = cp.head || cp.color;
    ctx.beginPath();
    ctx.arc(sx, sy, cp.radius * 1.6, 0, PI2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Segmented body: chunky scales tapering toward the tail
    for (let k = segs; k >= 0; k--) {
      const r = Math.max(1.3, cp.radius * (1.05 - k * 0.12));
      ctx.globalAlpha = alpha * (1 - k * 0.07);
      ctx.fillStyle = (k % 2) ? (cp.dark || cp.color) : cp.color;
      ctx.beginPath();
      ctx.arc(pts[k][0], pts[k][1], r, 0, PI2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Head: dart shape with a blinking eye, aimed along the fire direction
    const hx = pts[0][0];
    const hy = pts[0][1];
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(dir);
    ctx.fillStyle = cp.color;
    ctx.beginPath();
    ctx.moveTo(cp.radius * 2.0, 0);
    ctx.quadraticCurveTo(cp.radius * 0.6, -cp.radius * 0.75, -cp.radius * 0.5, -cp.radius * 0.4);
    ctx.lineTo(-cp.radius * 0.5, cp.radius * 0.4);
    ctx.quadraticCurveTo(cp.radius * 0.6, cp.radius * 0.75, cp.radius * 2.0, 0);
    ctx.closePath();
    ctx.fill();
    const bl = 0.5 + 0.5 * Math.abs(Math.sin(g.time * 0.004 + ph));
    ctx.fillStyle = cp.head || '#ffffff';
    ctx.fillRect(cp.radius * 0.9, -cp.radius * 0.13, cp.radius * 0.4, cp.radius * 0.26 * bl);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // --- Projectiles ---
  for (const pr of g.projectiles) {
    const prx = (typeof pr.prevX === 'number') ? lerp(pr.prevX, pr.x, ia) : pr.x;
    const pry = (typeof pr.prevY === 'number') ? lerp(pr.prevY, pr.y, ia) : pr.y;
    const sx = prx - cx;
    const sy = pry - cy;
    if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;
    if (pr.delay > 0) continue;   // Duplicator echo still waiting to fire
    const alpha = clamp(pr.life / pr.maxLife, 0, 1);
    if (alpha <= 0.02) continue;

    // Motion trail
    if (pr.trail) {
      ctx.globalAlpha = alpha * 0.25;
      ctx.strokeStyle = pr.color;
      ctx.lineWidth = pr.radius * 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(pr.prevX - cx, pr.prevY - cy);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    ctx.save();
    ctx.translate(sx, sy);

    if (pr.shape === 'bolt') {
      // Directional magic dart
      ctx.rotate(pr.rot);
      const r = pr.radius;
      // Outer glow
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = '#2fae6c';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 3.2, r * 1.8, 0, 0, PI2);
      ctx.fill();
      // Body - elongated dart
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      ctx.moveTo(r * 2.8, 0);
      ctx.lineTo(-r * 2.2, -r * 0.9);
      ctx.quadraticCurveTo(-r * 2.8, 0, -r * 2.2, r * 0.9);
      ctx.closePath();
      ctx.fill();
      // Bright core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(r * 1.2, 0, r * 0.7, 0, PI2);
      ctx.fill();
    } else if (pr.shape === 'cross') {
      // Spinning 4-point sparkle star
      ctx.rotate(pr.rot * 2);
      const r = pr.radius * 1.9;
      // Outer glow
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = '#2fa8c9';
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.6, 0, PI2);
      ctx.fill();
      // Star body (concave 4-point sparkle)
      ctx.globalAlpha = alpha;
      let grad = pr.color;
      if (GFX.glow) {
        grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.4);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, pr.color);
        grad.addColorStop(1, '#b9f6ff');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.4);
      ctx.quadraticCurveTo(0, 0, r * 1.4, 0);
      ctx.quadraticCurveTo(0, 0, 0, r * 1.4);
      ctx.quadraticCurveTo(0, 0, -r * 1.4, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r * 1.4);
      ctx.closePath();
      ctx.fill();
      // Bright core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.3, 0, PI2);
      ctx.fill();
    } else if (pr.shape === 'shard') {
      // Jagged glass shard that spins as it travels
      ctx.rotate(pr.rot);
      const r = pr.radius;
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = '#7fa8ff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 2, 0, PI2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      ctx.moveTo(r * 2, 0);
      ctx.lineTo(-r * 1.2, -r * 1.1);
      ctx.lineTo(-r * 0.6, r * 0.7);
      ctx.lineTo(r * 1.4, r * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(r * 0.5, 0, r * 0.5, 0, PI2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // Default circle projectile (fires/blasts)
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      ctx.arc(0, 0, pr.radius * 2.2, 0, PI2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, pr.radius * 0.6, 0, PI2);
      ctx.fill();
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      ctx.arc(0, 0, pr.radius, 0, PI2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // --- Lightning effects ---
  for (const le of g.lightningEffects) {
    const alpha = le.life / le.maxLife;
    const dx = le.x2 - le.x1;
    const dy = le.y2 - le.y1;
    const segments = 6;

    // Broad outer glow
    ctx.globalAlpha = alpha * 0.25;
    ctx.strokeStyle = '#ffd200';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(le.x1 - cx, le.y1 - cy);
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      ctx.lineTo(le.x1 + dx * t + rand(-15, 15) - cx, le.y1 + dy * t + rand(-15, 15) - cy);
    }
    ctx.lineTo(le.x2 - cx, le.y2 - cy);
    ctx.stroke();

    // Yellow bolt
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ffe000';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(le.x1 - cx, le.y1 - cy);
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      ctx.lineTo(le.x1 + dx * t + rand(-12, 12) - cx, le.y1 + dy * t + rand(-12, 12) - cy);
    }
    ctx.lineTo(le.x2 - cx, le.y2 - cy);
    ctx.stroke();

    // White core bolt
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(le.x1 - cx, le.y1 - cy);
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      ctx.lineTo(le.x1 + dx * t + rand(-8, 8) - cx, le.y1 + dy * t + rand(-8, 8) - cy);
    }
    ctx.lineTo(le.x2 - cx, le.y2 - cy);
    ctx.stroke();

    // Impact flash at target
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = '#ffe000';
    ctx.beginPath();
    ctx.arc(le.x2 - cx, le.y2 - cy, 10 * alpha + 3, 0, PI2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(le.x2 - cx, le.y2 - cy, 5 * alpha + 1.5, 0, PI2);
    ctx.fill();

    ctx.lineCap = 'butt';
    ctx.globalAlpha = 1;
  }

  // --- Player (top-down pixel mage) ---
  const pl = g.player;
  const plx = (typeof g._rpPx === 'number') ? lerp(g._rpPx, pl.x, ia) : pl.x;
  const ply = (typeof g._rpPy === 'number') ? lerp(g._rpPy, pl.y, ia) : pl.y;
  const px = plx - cx, py = ply - cy;

  // Cape: behind the body, except when the camera sees the character's back
  // (moving straight up) â€” then it's drawn in FRONT so it visibly starts at
  // the neck and drapes over the back.
  const capeFront = Math.sin(pl.renderAngle) < -0.5;
  // Only the wizard (aeloria) wears the cape; the other characters keep
  // their own silhouettes (pyromancer hood, sentinel armor, assassin cloak).
  const mageOnly = !pl.charId || pl.charId === 'aeloria';
  // Fade the whole silhouette (cape + body) for the invulnerability blink and
  // while standing under a tree crown, so the tree reads as passing in front
  // of the player instead of the player stamping over it.
  let plAlpha = underTreeCanopy(plx, ply) ? 0.36 : 1;
  if (pl.invulnTimer > 0 && Math.floor(g.time / 80) % 2 === 0) {
    plAlpha = Math.min(plAlpha, 0.45);
  }

  if (!capeFront && mageOnly) {
    ctx.globalAlpha = plAlpha;
    drawCape(cx, cy);
    ctx.globalAlpha = 1;
  }

  // ---- Active XP magnet: expanding red pull rings ----
  if (g.xpMagnetTimer > 0) {
    const prog = 1 - g.xpMagnetTimer / MAGNET_ACTIVE_MS;
    for (let k = 0; k < 2; k++) {
      const ph = (prog + k * 0.5) % 1;
      const rr = 30 + ph * 320;
      ctx.strokeStyle = `rgba(255,80,100,${0.5 * (1 - ph * 0.85)})`;
      ctx.lineWidth = 3 * (1 - ph * 0.5);
      ctx.beginPath();
      ctx.arc(px, py, rr, 0, PI2);
      ctx.stroke();
    }
  }

  // ---- Chain saw: spinning serrated ring while the weapon is held ----
  for (const wpn of pl.weapons) {
    if (wpn.id !== 'chainSaw') continue;
    const st = getWeaponStats(wpn);
    // No pulse: the ring stays at its true hit radius (`st.area`) at all times,
    // so it never swells when another weapon (e.g. magic bullet) fires.
    const rR = st.area;
    const teeth = 18;
    const spikeLen = 16;

    // Thick blade ring (no transparent fill)
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = '#d3340e';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(px, py, rR, 0, PI2);
    ctx.stroke();
    // Hot inner edge
    ctx.strokeStyle = '#ffb066';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(px, py, rR, 0, PI2);
    ctx.stroke();

    // Protruding spike teeth (spinning triangles pointing outward)
    for (let i = 0; i < teeth; i++) {
      const ta = g.time * 0.02 + i * (PI2 / teeth);
      const bx = px + Math.cos(ta) * rR;
      const by = py + Math.sin(ta) * rR;
      const tx = px + Math.cos(ta) * (rR + spikeLen);
      const ty = py + Math.sin(ta) * (rR + spikeLen);
      const pdx = Math.cos(ta + Math.PI / 2);
      const pdy = Math.sin(ta + Math.PI / 2);
      const wHalf = 4.5;
      ctx.fillStyle = '#8c1f08';
      ctx.beginPath();
      ctx.moveTo(bx + pdx * wHalf, by + pdy * wHalf);
      ctx.lineTo(bx - pdx * wHalf, by - pdy * wHalf);
      ctx.lineTo(tx, ty);
      ctx.closePath();
      ctx.fill();
      // Speck of hot metal on each tip
      ctx.fillStyle = '#ffc98f';
      ctx.beginPath();
      ctx.arc(tx, ty, 1.4, 0, PI2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    break;
  }

  // Player: dispatches on the selected character's archetype.
  const charId = pl.charId || 'aeloria';
  ctx.globalAlpha = plAlpha;
  if (charId === 'rael') drawTopDownRael(px, py, pl, g.time);
  else if (charId === 'briga') drawTopDownBriga(px, py, pl, g.time);
  else if (charId === 'nyx') drawTopDownNix(px, py, pl, g.time);
  else drawTopDownMage(px, py, pl, g.time);
  ctx.globalAlpha = 1;

  // Cape in front of the character (back view) â€” wizard only.
  if (capeFront && mageOnly) {
    ctx.globalAlpha = plAlpha;
    drawCape(cx, cy);
    ctx.globalAlpha = 1;
  }

  // --- Particles ---
  for (const pt of g.particles) {
    const pxx = pt.x - cx, pyy = pt.y - cy;
    if (pxx < -120 || pxx > w + 120 || pyy < -120 || pyy > h + 120) continue;
    const alpha = clamp(pt.life / pt.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    if (pt.type === 'whip') {
      // Whip Chain: a chain of metal links that cracks out from the caster
      // toward the tip, drooping a little on the way.
      const prog = 1 - clamp(pt.life / pt.maxLife, 0, 1);   // 0 â†’ 1 as it plays
      const ext = Math.min(1, prog * 2.5);                  // fast snap-out
      const ex2 = pt.x + (pt.tx - pt.x) * ext;
      const ey2 = pt.y + (pt.ty - pt.y) * ext;
      const cxX = pt.x - cx, cyY = pt.y - cy;
      const eX = ex2 - cx, eY = ey2 - cy;
      const dx = eX - cxX, dy = eY - cyY;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const droop = (1 - ext) * 1.3 + 0.25;                 // sags while rolling out
      const links = Math.max(5, Math.floor(len / 12));
      for (let i = 0; i <= links; i++) {
        const t = i / links;
        const bul = Math.sin(t * Math.PI) * 5 * droop;
        const bx = cxX + dx * t + nx * bul;
        const by = cyY + dy * t + ny * bul;
        const s = 4.2 * (1 - t * 0.55) + 0.8;
        ctx.globalAlpha = alpha * (1 - t * 0.25);
        ctx.fillStyle = i % 2 === 0 ? '#57545c' : '#6d6a72';
        ctx.strokeStyle = '#2b2a2e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx, by, s, 0, PI2);
        ctx.fill();
        ctx.stroke();
        if (i % 3 === 1) {                                  // steel highlight
          ctx.fillStyle = '#c9b98a';
          ctx.beginPath();
          ctx.arc(bx - s * 0.25, by - s * 0.25, s * 0.32, 0, PI2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffd176';
      ctx.beginPath();
      ctx.arc(eX, eY, 3.5, 0, PI2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (pt.type === 'arc') {
      // Blood Scythe slash: a fading arc in front of the player
      const cx2 = pt.x - cx;
      const cy2 = pt.y - cy;
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = '#f66';
      ctx.lineWidth = 10 * alpha;
      ctx.beginPath();
      ctx.arc(cx2, cy2, pt.radius, pt.a0, pt.a1);
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3 * alpha;
      ctx.beginPath();
      ctx.arc(cx2, cy2, pt.radius * 0.85, pt.a0, pt.a1);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (pt.type === 'nova') {
      // Frost Nova: expanding icy ring
      const progress = 1 - pt.life / pt.maxLife;
      const currentRadius = pt.radius * Math.min(1, progress * 1.6);
      const cx2 = pt.x - cx;
      const cy2 = pt.y - cy;
      ctx.globalAlpha = alpha * 0.5;
      ctx.drawImage(_radialSprite('nova', 64, _NOVA_SPR), cx2 - currentRadius, cy2 - currentRadius, currentRadius * 2, currentRadius * 2);
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = '#9ff';
      ctx.lineWidth = 2 * alpha;
      ctx.beginPath();
      ctx.arc(cx2, cy2, currentRadius, 0, PI2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (pt.type === 'shockwave' && GFX.shockwaves) {
      const progress = 1 - pt.life / pt.maxLife;
      const currentRadius = pt.radius * Math.min(1, progress * 1.4);
      const cx2 = pt.x - cx;
      const cy2 = pt.y - cy;
      // Fire-filled area (radial sprite, bright centre fading to transparent)
      ctx.globalAlpha = alpha * 0.55;
      ctx.drawImage(_radialSprite('shock', 64, _SHOCK_SPR), cx2 - currentRadius, cy2 - currentRadius, currentRadius * 2, currentRadius * 2);
      // Outer ring
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = '#f80';
      ctx.lineWidth = 6 * alpha;
      ctx.beginPath();
      ctx.arc(cx2, cy2, currentRadius, 0, PI2);
      ctx.stroke();
      // Bright inner ring
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = '#ffa';
      ctx.lineWidth = 2 * alpha;
      ctx.beginPath();
      ctx.arc(cx2, cy2, Math.max(2, currentRadius * 0.55), 0, PI2);
      ctx.stroke();
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x - cx, pt.y - cy, pt.radius * alpha, 0, PI2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // --- Floating texts ---
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  const dmgNums = showDmgNumbers();
  for (const ft of g.floatingTexts) {
    if (ft.kind === 'dmg' && !dmgNums) continue;   // damage toggle hides dealt
    const alpha = clamp(ft.life / ft.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x - cx, ft.y - cy);
  }
  ctx.globalAlpha = 1;

  // --- Darkness + vignette ---
  if (GFX.lightMode > 0) {
    drawLighting(cx, cy, w, h);
  } else {
    // Cheap flat darkness instead of the dynamic lighting layer (also tweened
    // across biome boundaries via smoothBiomeDarkColor)
    ctx.fillStyle = smoothBiomeDarkColor();
    ctx.fillRect(0, 0, w, h);
  }
  // Ambient sun/moon wash: a faint full-screen tint in the current biome's
  // light colour on top of the darkness, so cold wedges read moon-washed and
  // hot wedges read sun-drenched even in cheap-light mode. Blended smoothly
  // across the weight map so it never snaps in the blend ring.
  const ambWash = ambientTintBlend();
  if (ambWash) {
    const a = Math.min(0.08, 0.04 + ambWash.strength * 0.2);
    ctx.fillStyle = `rgba(${ambWash.r | 0},${ambWash.g | 0},${ambWash.b | 0},${a})`;
    ctx.fillRect(0, 0, w, h);
  }
  // Cached full-screen vignette (rebuilt only on resize)
  ctx.drawImage(vignetteSprite(w, h), 0, 0, w, h);

  // --- Damage-taken feedback: red edge vignette, bright when just hit ---
  // Drawn AFTER the world so it tints the whole screen but stays under the HUD.
  const hf = g.player.hurtFlash || 0;
  if (hf > 0.02) {
    const rg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.72);
    rg.addColorStop(0, 'rgba(200,10,20,0)');
    rg.addColorStop(1, `rgba(210,16,28,${0.62 * hf})`);
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
  }

  // --- Weather overlays (falling precipitation + taiga gust streaks) ---
  drawStormOverlay();
  drawGustOverlay();

  // --- Guardian boss bar (when a biome heart is being defended) ---
  drawGuardianBossBar();

  // --- Touch joystick ---
  if (g.joystick.active) {
    const j = g.joystick;
    const stickX = j.baseX + j.dx * j.maxRadius;
    const stickY = j.baseY + j.dy * j.maxRadius;
    // Base ring
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(j.baseX, j.baseY, j.maxRadius, 0, PI2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    // Stick
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(stickX, stickY, 24, 0, PI2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(stickX, stickY, 24 * 1.5, 0, PI2);
    ctx.fill();
  }
}

// --- Dynamic cape: trapezoid cloth grid that billows like a flag ---
// The neck edge (narrow, attached to the player) is behind; the cloth widens
// towards the free tail edge that floats and waves in the wind.
// Dispatcher picks the look from the facing direction:
  //  â€¢ vertical/diagonal facing â†’ the wide billowing cloth behind the back
  //  â€¢ near-horizontal (left/right) â†’ the cape morphs into a soft diagonal
  //    ribbon flowing down
function drawCape(cx, cy) {
  if (!GFX.cape) return;
  const p = game.player;
  const cap = p.cape;
  if (!cap || !cap.grid || cap.grid.length < 2) return;
  if (Math.abs(Math.cos(p.renderAngle)) > 0.9) drawCapeRibbon(cx, cy, cap);
  else drawCapeCloth(cx, cy, cap);
}

// --- Wide trapezoid cloth: the classic flag behind the back (vertical facing) ---
function drawCapeCloth(cx, cy, cap) {
  const { grid, L, W } = cap;

  // Fill the whole cloth as one smooth polygon along the outer boundary.
  ctx.beginPath();
  // left edge: neck -> tail
  for (let i = 0; i < L; i++) {
    const pt = grid[0][i];
    const sx = pt.x - cx, sy = pt.y - cy;
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  }
  // tail edge: left -> right
  for (let j = 1; j < W; j++) {
    const pt = grid[j][L - 1];
    ctx.lineTo(pt.x - cx, pt.y - cy);
  }
  // right edge: tail -> neck
  for (let i = L - 2; i >= 0; i--) {
    const pt = grid[W - 1][i];
    ctx.lineTo(pt.x - cx, pt.y - cy);
  }
  // neck edge: right -> left (thin, hugs the player's back)
  for (let j = W - 2; j >= 0; j--) {
    const pt = grid[j][0];
    ctx.lineTo(pt.x - cx, pt.y - cy);
  }
  ctx.closePath();

  // Gradient along the cloth: dark deep-blue at the neck, lighter/translucent tail
  const nA = grid[0][0], tA = grid[0][L - 1];
  const grad = ctx.createLinearGradient(nA.x - cx, nA.y - cy, tA.x - cx, tA.y - cy);
  grad.addColorStop(0, 'rgba(12,40,90,0.95)');
  grad.addColorStop(0.45, 'rgba(24,80,160,0.9)');
  grad.addColorStop(1, 'rgba(40,140,230,0.35)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle fold lines along the length (vertical in cloth-wind direction) so it
  // reads as fabric rippling, not a flat silhouette.
  ctx.save();
  ctx.globalAlpha = 0.35;
  for (let j = 1; j < W - 1; j++) {
    ctx.strokeStyle = 'rgba(160,220,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < L; i++) {
      const pt = grid[j][i];
      const sx = pt.x - cx, sy = pt.y - cy;
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Colored border around the whole cloth perimeter
  ctx.save();
  // Outer stroke (soft glow)
  ctx.strokeStyle = 'rgba(255,215,80,0.35)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(grid[0][0].x - cx, grid[0][0].y - cy);
  for (let i = 1; i < L; i++) ctx.lineTo(grid[0][i].x - cx, grid[0][i].y - cy);
  for (let j = 1; j < W; j++) ctx.lineTo(grid[j][L - 1].x - cx, grid[j][L - 1].y - cy);
  for (let i = L - 2; i >= 0; i--) ctx.lineTo(grid[W - 1][i].x - cx, grid[W - 1][i].y - cy);
  for (let j = W - 2; j > 0; j--) ctx.lineTo(grid[j][0].x - cx, grid[j][0].y - cy);
  ctx.closePath();
  ctx.stroke();
  // Inner crisp border
  ctx.strokeStyle = 'rgba(255,230,140,0.95)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}

// --- Sideways facing (left/right): morph the cape into a soft diagonal ribbon
// that flows downward along the trailing side of the body. ---
function drawCapeRibbon(cx, cy, cap) {
  const { grid, L, W, NECK_W } = cap;

  // Centerline down the middle of the cloth
  const mid = [];
  for (let i = 0; i < L; i++) {
    const a0 = grid[0][i], a1 = grid[W - 1][i];
    mid.push({ x: (a0.x + a1.x) / 2, y: (a0.y + a1.y) / 2 });
  }
  // Downward droop that grows toward the tail â†’ reads as a diagonal line down
  const SAG = 11;
  for (let i = 0; i < L; i++) {
    const f = i / (L - 1);
    mid[i].y += SAG * f * f;
  }

  // Local tangent â†’ perpendicular so the ribbon keeps a consistent thickness
  const pxV = [], pyV = [];
  for (let i = 0; i < L; i++) {
    const prev = mid[Math.max(0, i - 1)], next = mid[Math.min(L - 1, i + 1)];
    const dx = next.x - prev.x, dy = next.y - prev.y;
    const d = Math.hypot(dx, dy) || 1;
    pxV.push(-dy / d); pyV.push(dx / d);
  }

  const left = [], right = [];
  for (let i = 0; i < L; i++) {
    const f = i / (L - 1);
    const hw = NECK_W * 0.5 + (2.6 - NECK_W * 0.5) * f;   // 5 â†’ 2.6: a thin line
    const ox = pxV[i] * hw, oy = pyV[i] * hw;
    left.push({ x: mid[i].x + ox - cx, y: mid[i].y + oy - cy });
    right.push({ x: mid[i].x - ox - cx, y: mid[i].y - oy - cy });
  }

  ctx.beginPath();
  for (let i = 0; i < L; i++) {
    if (i === 0) ctx.moveTo(left[i].x, left[i].y); else ctx.lineTo(left[i].x, left[i].y);
  }
  for (let i = L - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();

  const grad = ctx.createLinearGradient(left[0].x, left[0].y, left[L - 1].x, left[L - 1].y);
  grad.addColorStop(0, 'rgba(12,40,90,0.95)');
  grad.addColorStop(0.55, 'rgba(24,80,160,0.9)');
  grad.addColorStop(1, 'rgba(40,140,230,0.45)');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.save();
  // Center highlight along the ribbon
  ctx.strokeStyle = 'rgba(160,220,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < L; i++) {
    const m = { x: mid[i].x - cx, y: mid[i].y - cy };
    if (i === 0) ctx.moveTo(m.x, m.y); else ctx.lineTo(m.x, m.y);
  }
  ctx.stroke();

  // Soft outer glow + crisp inner border
  ctx.strokeStyle = 'rgba(255,215,80,0.3)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  for (let i = 0; i < L; i++) {
    if (i === 0) ctx.moveTo(left[i].x, left[i].y); else ctx.lineTo(left[i].x, left[i].y);
  }
  for (let i = L - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,230,140,0.95)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

// --- Full-screen weather: tint + falling precipitation ---
// Every drop keeps its own random column, speed and length and falls in a
// continuous stream from above the screen to a random spot below it before
// wrapping, so the rain slides smoothly instead of snapping between frames.
function drawStormOverlay() {
  const g = game;
  if (!g.storm) return;
  const def = STORM_DEFS[g.storm.id];
  if (!def) return;

  // Tinted visibility: sandstorms blind, freezes chill
  ctx.fillStyle = g.storm.id === 'south'
    ? 'rgba(255,190,110,0.12)'
    : 'rgba(140,190,255,0.07)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (g.storm.id === 'south') {
    // Sandstorm: NOT rain. Short sandy dashes blow almost horizontally with
    // the wind, plus big translucent dust cells drifting across, so the desert
    // storm reads as airborne sand instead of falling streaks.
    const n = def.drops || 160;
    const margin = 80;
    const spanX = VIEW_W + margin * 2;
    const spanY = VIEW_H + margin * 2;
    const angle = def.windA || -0.06;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const t = g.time;
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const h1 = (i * 2654435761 + 40503) % 65536;
      const h2 = (i * 40503 + 104729) % 65536;
      const x0 = (h1 / 65536) * spanX - margin;
      const y0 = (i % 23) * (spanY / 23) - 20;      // fixed rows of streaks
      const len = 7 + (h1 % 9);                     // short dashes
      const spd = 420 + (i * 37) % 360;             // fast sideways drift
      const phase = (h1 % 4096) / 4096;
      const along = (((t * 0.001 * spd + phase * spanX * 1.6) % (spanX * 1.6)) + spanX * 1.6) % (spanX * 1.6) - margin;
      const lx = x0 + ca * along, ly = y0 + sa * along + ((h2 % 60) / 60 - 0.5) * 10;
      ctx.strokeStyle = i % 5 === 0 ? 'rgba(255,214,140,0.50)' : 'rgba(230,170,95,0.28)';
      ctx.lineWidth = i % 4 === 0 ? 2 : 1;
      ctx.globalAlpha = 0.5 + (h2 % 50) / 100;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx - ca * len, ly - sa * len);
      ctx.stroke();
    }
    // Drifting dust cells keep the air visibly thick between the dashes.
    ctx.fillStyle = 'rgba(255,200,120,0.09)';
    for (let i = 0; i < 9; i++) {
      const x = ((i * 97 + 11) % 100) / 100 * VIEW_W;
      const y = (i * 53 + t * 0.006 * (28 + (i % 5) * 9)) % (VIEW_H + 60) - 30;
      ctx.beginPath();
      ctx.ellipse(x, y, 30 + (i % 3) * 16, 12 + (i % 4) * 6, -0.06, 0, PI2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
    return;
  }

  const n = def.drops || 50;
  const margin = 60;
  const spanX = VIEW_W + margin * 2;
  const spanY = VIEW_H + margin * 2;
  const lean = Math.cos(def.windA) * 0.7;   // drops tilt with the wind
  ctx.lineCap = 'round';
  ctx.strokeStyle = def.streak;
  ctx.lineWidth = 1.5;
  const t = g.time;
  for (let i = 0; i < n; i++) {
    const h1 = (i * 2654435761 + 40503) % 65536;
    const h2 = (i * 40503 + 104729) % 65536;
    const x0 = (h1 / 65536) * spanX - margin;                 // random column
    const len = def.dropLen[0] + (h1 / 65536) * (def.dropLen[1] - def.dropLen[0]);
    const spd = def.speed[0] + (h2 / 65536) * (def.speed[1] - def.speed[0]);
    const phase = h2 / 65536;
    const y = (((t * 0.001 * spd + phase * spanY) % spanY) + spanY) % spanY - margin;
    ctx.globalAlpha = 0.35 + (h2 / 65536) * 0.4;
    ctx.beginPath();
    ctx.moveTo(x0 - lean * len * 0.5, y - len * 0.5);
    ctx.lineTo(x0 + lean * len * 0.5, y + len * 0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
}

// --- Taiga gust: fast wind streaks sweeping across the screen while a gust
// shoves the player. Streaks slide continuously along the gust direction.
function drawGustOverlay() {
  const g = game;
  const gu = g.gust;
  if (!gu || gu.t <= 0) return;
  const inten = clamp(gu.t / gu.hold, 0, 1);
  const a = gu.a;
  const ca = Math.cos(a), sa = Math.sin(a);
  const span = Math.hypot(VIEW_W, VIEW_H) + 160;
  const t = g.time;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(218,235,255,0.55)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 22; i++) {
    const h1 = (i * 40503 + 104729) % 65536;
    const h2 = (i * 2654435761 + 7919) % 65536;
    const px = (h1 / 65536) * (VIEW_W + 200) - 100 + Math.cos(a + Math.PI / 2) * (h2 % 200 - 100);
    const py = (h2 / 65536) * (VIEW_H + 200) - 100 + Math.sin(a + Math.PI / 2) * (h1 % 200 - 100);
    const len = 40 + (h1 % 60);
    const spd = 300 + (h2 % 300);
    const off = (t * 0.001 * spd + (h2 % 1000) * 0.06) % span;
    ctx.globalAlpha = (0.25 + (h1 % 5) * 0.06) * inten;
    ctx.beginPath();
    ctx.moveTo(px - ca * off, py - sa * off);
    ctx.lineTo(px - ca * (off + len), py - sa * (off + len));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
}
// --- Progressive boss-spawn ring (drawn in drawStatues via spawnRingFor) ---

// Nota al margine: eliminata la funzione di edge-fade assieme alla nebbia.


// --- Swamp fog: soft banks of green mist anchored to the WORLD inside the
// south-west swamp wedge. Banks follow the slow fogBreathe lifecycle (fade in
// 5-10s, hold 15s, fade out 5-10s). Iteration covers the whole viewport plus
// a margin cell, so walking never makes banks pop: they ease past the screen
// edges via viewEdgeFade instead of blinking in/out.
function drawFogOverlay() {
  // Nebbia rimossa — gnarly: nessun banco viene più disegnato.
  return;
  const g = game;
  const camX = g.camera.x, camY = g.camera.y;
  const CELL = SWAMP_FOG_CELL * TILE;
  const x0 = Math.floor((camX - VIEW_W / 2) / CELL) - 1;
  const x1 = Math.floor((camX + VIEW_W / 2) / CELL) + 1;
  const y0 = Math.floor((camY - VIEW_H / 2) / CELL) - 1;
  const y1 = Math.floor((camY + VIEW_H / 2) / CELL) + 1;

  for (let ay = y0; ay <= y1; ay++) {
    for (let ax = x0; ax <= x1; ax++) {
      if (seed2(ax * 977 + 11, ay * 433 + 7) > 0.45) continue;
      const oX = (3 + seed2(ax * 977 + 3, ay * 433 + 1) * 8) * TILE;
      const oY = (3 + seed2(ax * 977 + 13, ay * 433 + 17) * 8) * TILE;
      const fx = ax * CELL + oX, fy = ay * CELL + oY;
      // Mist lives only in the south-west swamp wedge
      if (owningBiomeAt(fx, fy) !== 'southwest') continue;
      let R = (5 + seed2(ax * 977 + 5, ay * 433 + 11) * 5) * TILE;
      // Gentle living wobble so banks breathe but never drift with the player
      R *= 1 + 0.10 * Math.sin(g.time * 0.00010 + ax * 3.7 + ay * 1.3);

      const sx = fx - camX;
      const sy = fy - camY;
      if (sx < -R || sx > VIEW_W + R || sy < -R || sy > VIEW_H + R) continue;

      // Banks fade through their slow seeded lifecycle (fade in -> hold ->
      // fade out), softly easing at the screen edges — never by player moves.
      const vis = fogBreathe(ax * 977 + 23, ay * 433 + 29, g.time);
      const a = 0.30 * vis * viewEdgeFade(sx, sy, R);
      const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
      grd.addColorStop(0, `rgba(115,165,150,${a.toFixed(3)})`);
      grd.addColorStop(1, 'rgba(115,165,150,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(sx, sy, R, 0, PI2);
      ctx.fill();
    }
  }
}

// --- Ambient fog: a mist present in EVERY biome that slowly fades in, holds
// and fades out (fogBreathe). Banks are anchored to fixed WORLD positions
// (seeded macro cells) and projected through the camera, so the fog never
// follows the player. Iteration covers the whole viewport plus a margin cell
// so banks on the screen edges never pop with movement.
const AMBIENT_FOG_CELL = 20;   // macro cell (tiles) anchoring ambient mist
function drawAmbientFog() {
  return; // nebbia rimossa — nessun banco ambientale viene disegnato
  const g = game;
  const camX = g.camera.x, camY = g.camera.y;
  const CELL = AMBIENT_FOG_CELL * TILE;
  const x0 = Math.floor((camX - VIEW_W / 2) / CELL) - 1;
  const x1 = Math.floor((camX + VIEW_W / 2) / CELL) + 1;
  const y0 = Math.floor((camY - VIEW_H / 2) / CELL) - 1;
  const y1 = Math.floor((camY + VIEW_H / 2) / CELL) + 1;
  const t = g.time;

  for (let ay = y0; ay <= y1; ay++) {
    for (let ax = x0; ax <= x1; ax++) {
      if (seed2(ax * 1777 + 33, ay * 1559 + 47) > 0.72) continue;
      const oX = (0.2 + seed2(ax * 1777 + 3, ay * 1559 + 1) * 0.6) * CELL;
      const oY = (0.2 + seed2(ax * 1777 + 13, ay * 1559 + 17) * 0.6) * CELL;
      const fx = ax * CELL + oX, fy = ay * CELL + oY;
      const phase = seed2(ax * 1777 + 9, ay * 1559 + 5) * 6.283;
      let R = (3 + seed2(ax * 1777 + 5, ay * 1559 + 11) * 4) * TILE;
      // Living wobble — banks breathe in place but never translate with you
      R *= 1 + 0.12 * Math.sin(t * 0.00008 + phase + ax + ay);

      const sx = fx - camX;
      const sy = fy - camY;
      if (sx < -R || sx > VIEW_W + R || sy < -R || sy > VIEW_H + R) continue;

      // Slow seeded lifecycle (fade in -> hold -> fade out) + soft edge ease
      const vis = fogBreathe(ax * 1777 + 77, ay * 1559 + 101, t);
      const a = 0.16 * vis * viewEdgeFade(sx, sy, R);
      const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
      grd.addColorStop(0, `rgba(165,180,205,${a.toFixed(3)})`);
      grd.addColorStop(1, 'rgba(165,180,205,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(sx, sy, R, 0, PI2);
      ctx.fill();
    }
  }
}

// --- Top-centre boss bar while a WEDGE GUARDIAN defends its heart ---
function drawGuardianBossBar() {
  const g = game;
  if (!g.guardian) return;
  const boss = g.enemies.find(e => e.isGuardian && e.biomeId === g.guardian.biomeId);
  if (!boss) return;
  const w = 360, x = (VIEW_W - w) / 2, y = 16;
  const pct = clamp(boss.hp / boss.maxHp, 0, 1);
  const fill = pct > 0.5 ? '#b07cff' : pct > 0.25 ? '#d95fd0' : '#ff5050';
  ctx.fillStyle = 'rgba(5,5,12,0.65)';
  ctx.fillRect(x - 4, y - 4, w + 8, 18);
  ctx.strokeStyle = '#6a45a0';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 4, y - 4, w + 8, 18);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * pct, 10);
  ctx.font = 'bold 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const bDef = BIOME_DEFS[boss.biomeId];
  ctx.fillStyle = '#e0c8ff';
  ctx.fillText('WEDGE GUARDIAN' + (bDef ? ' — ' + bDef.name.toUpperCase() : ''), x, y - 8);
  ctx.fillStyle = '#ffd24d';
  ctx.textAlign = 'right';
  ctx.fillText(Math.max(0, Math.ceil(boss.hp)) + ' HP', x + w, y - 8);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}