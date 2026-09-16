// ============================================================
// RENDERING
// ============================================================

// Draw a horseshoe XP-magnet pickup (top-down view), open at the top
// with white pole caps and orbiting sparks.
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
  // Horseshoe body (U shape, open at the top)
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI * 1.10, Math.PI * 1.90);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#c2222e';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.strokeStyle = '#ff5566';
  ctx.lineWidth = 5;
  ctx.stroke();
  // Inner glow arc
  ctx.strokeStyle = `rgba(255,140,160,${0.35 + 0.2 * Math.sin(t * 0.01)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  // White pole caps at the tips
  ctx.fillStyle = '#ffe9ee';
  for (const tip of [Math.PI * 1.10, Math.PI * 1.90]) {
    ctx.beginPath();
    ctx.arc(x + Math.cos(tip) * r, y + Math.sin(tip) * r, 2.6, 0, PI2);
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

function render() {
  const g = game;
  const cx = g.camera.x;
  const cy = g.camera.y;
  const w = VIEW_W;
  const h = VIEW_H;
  ctx.setTransform(DPR * GFX.pixelScale, 0, 0, DPR * GFX.pixelScale, 0, 0);

  ctx.fillStyle = '#0d0d10';
  ctx.fillRect(0, 0, w, h);

  // --- Chunk tiles (procedural terrain) ---
  ensureChunksNear(g.player.x, g.player.y);
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

  // --- Torches with flickering fire ---
  if (GFX.fire > 0) drawTorches(cx, cy, w, h);

  // --- Living hazard surfaces (lava bubbles, ripples, glints) ---
  drawTerrainAnimated(cx, cy, w, h);

  // --- Big canopy trees (world-space pass, over terrain/torches) ---
  drawTrees(cx, cy, w, h);

  // --- Biome treasure chests ---
  drawStatues(cx, cy, w, h);

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
  // Every enemy renders a distinct shadow-creature silhouette instead of the
  // old circular blob. `e.kind` selects fast/tank/ranged biome shapes, while
  // `e.type` (category) dominates for boss/warden; everything else falls back
  // to the basic Shadowling.
  const t = g.time;
  const FAST_FORMS = ['runner', 'dunerunner', 'swarmling', 'pinewraith', 'riverwisp', 'frostling'];
  const TANK_FORMS = ['brute', 'canyongolem', 'shielded', 'leecher', 'boghaunt'];
  const RANGED_FORMS = ['caster', 'scorcher', 'dryadseer'];

  for (const e of g.enemies) {
    if (e.dead) continue;

    const sx = e.x - cx;
    const sy = e.y - cy;
    if (sx < -70 || sx > w + 70 || sy < -70 || sy > h + 70) continue;

    const R = e.radius;
    const eph = e.ph || 0;

    const [ar, ag, ab] = e.aura || [120, 0, 30];

    // Common shadow palette (per biome)
    const body = e.body || '#ff4d4d';
    const core = e.core || '#7a1a1a';
    const glint = e.glint || '#ff9e9e';

    // Silhouette: category rules first, then kind-based archetypes.
    const fkind = e.kind || e.type;
    let form = 'normal';
    if (e.type === 'boss') form = 'boss';
    else if (e.type === 'warden') form = 'warden';
    else if (FAST_FORMS.indexOf(fkind) >= 0) form = 'fast';
    else if (TANK_FORMS.indexOf(fkind) >= 0) form = 'tank';
    else if (RANGED_FORMS.indexOf(fkind) >= 0) form = 'ranged';

    // Shadow aura (soft, breathing)
    if (GFX.enemyFx) {
      const pulse = 1 + 0.08 * Math.sin(t * 0.003 + eph);
      ctx.globalAlpha = (e.auraAlpha ?? 0.15) * pulse;
      ctx.fillStyle = `rgb(${ar},${ag},${ab})`;
      ctx.beginPath();
      ctx.arc(sx, sy, R * (e.auraScale ?? 2.2) * pulse, 0, PI2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (form === 'boss') {
      // SHADOW LORD: a mountain of shadow with three tall curling horns.
      // Rounded lumpy mass (no radial spikes, so it never reads as a star).
      const pulse = 1 + 0.06 * Math.sin(t * 0.003 + eph);

      ctx.fillStyle = body;
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const a = PI2 / 14 * i;
        const lump = R * (0.10 * Math.sin(a * 3 + eph * 1.7) + 0.05 * Math.sin(a * 5 - t * 0.002 + eph));
        const rr = R * 1.0 + lump;
        const xx = sx + Math.cos(a) * rr * pulse;
        const yy = sy + Math.sin(a) * rr * pulse;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.closePath();
      ctx.fill();

      // Dark heart core, slightly lower
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(sx, sy + R * 0.10, R * 0.52, 0, PI2);
      ctx.fill();

      // Three tall horns crowning the top, curving outward
      for (const ux of [-0.55, 0, 0.55]) {
        const hx = sx + ux * R;
        const lean = ux * 0.25;
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.moveTo(hx - R * 0.14, sy - R * 0.52);
        ctx.quadraticCurveTo(hx + lean * R, sy - R * 1.0, hx + ux * R * 0.45, sy - R * 1.28);
        ctx.lineTo(hx + R * 0.06, sy - R * 0.6);
        ctx.closePath();
        ctx.fill();
      }

      // Two glowing eyes
      ctx.fillStyle = glint;
      ctx.fillRect(sx - R * 0.32, sy - R * 0.08, R * 0.18, R * 0.10);
      ctx.fillRect(sx + R * 0.14, sy - R * 0.08, R * 0.18, R * 0.10);

      // Orbiting shadow shards
      if (GFX.enemyFx) {
        ctx.fillStyle = body;
        for (let i = 0; i < 6; i++) {
          const a = eph + t * 0.0005 + i * (PI2 / 6);
          const fd = R * (1.3 + 0.12 * Math.sin(t * 0.002 + i));
          const fx = sx + Math.cos(a) * fd;
          const fy = sy + Math.sin(a) * fd;
          const s = 3 + R * 0.06;
          ctx.fillRect(fx - s * 0.5, fy - s * 0.5, s, s);
        }
      }
    } else if (form === 'warden' || form === 'tank') {
      // WARDEN / heavy tank: broad rounded shoulders with pauldron studs and
      // a crown of spikes over the top arc only.
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(sx, sy - R * 1.1);
      ctx.quadraticCurveTo(sx + R * 0.75, sy - R * 1.2, sx + R * 1.12, sy - R * 0.30);
      ctx.quadraticCurveTo(sx + R * 1.05, sy + R * 0.80, sx + R * 0.30, sy + R * 1.08);
      ctx.quadraticCurveTo(sx, sy + R * 1.14, sx - R * 0.30, sy + R * 1.08);
      ctx.quadraticCurveTo(sx - R * 1.05, sy + R * 0.80, sx - R * 1.12, sy - R * 0.30);
      ctx.quadraticCurveTo(sx - R * 0.75, sy - R * 1.2, sx, sy - R * 1.1);
      ctx.closePath();
      ctx.fill();

      // Pauldron studs (separate discs so the fill never bridges)
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(sx - R * 0.72, sy - R * 0.32, R * 0.22, 0, PI2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx + R * 0.72, sy - R * 0.32, R * 0.22, 0, PI2);
      ctx.fill();

      // Chest core
      ctx.beginPath();
      ctx.arc(sx, sy + R * 0.14, R * 0.38, 0, PI2);
      ctx.fill();

      // Crown of spikes over the top arc only
      ctx.strokeStyle = 'rgba(255,215,120,0.9)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI * 0.85 + i * (Math.PI * 1.45 / 4);
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * (R + 1), sy + Math.sin(a) * (R + 1));
        ctx.lineTo(sx + Math.cos(a) * (R + 7), sy + Math.sin(a) * (R + 7));
        ctx.stroke();
      }
    } else if (form === 'fast') {
      // STALKER: sleek directional blade, pointed at the player. faceA is only
      // updated for shielded enemies, so fall back to a cheap aim each frame.
      const bob = Math.sin(t * 0.009 + eph) * R * 0.05;
      const ang = e.faceA ?? Math.atan2(g.player?.y - e.y || 0, g.player?.x - e.x || 1);

      ctx.save();
      ctx.translate(sx, sy + bob);
      ctx.rotate(ang);

      // Sleek tapered body: pointed head, thin trailing tail
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(R * 1.8, 0);
      ctx.quadraticCurveTo(R * 0.3, -R * 0.48, -R * 1.15, -R * 0.26);
      ctx.quadraticCurveTo(-R * 1.55, 0, -R * 1.15, R * 0.26);
      ctx.quadraticCurveTo(R * 0.3, R * 0.48, R * 1.8, 0);
      ctx.closePath();
      ctx.fill();

      // Dark spine line
      ctx.strokeStyle = core;
      ctx.lineWidth = R * 0.24;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(R * 0.85, 0);
      ctx.lineTo(-R * 0.95, 0);
      ctx.stroke();
      ctx.lineCap = 'butt';

      // Single eye near the head
      ctx.fillStyle = glint;
      ctx.fillRect(R * 0.8, -R * 0.07, R * 0.22, R * 0.14);

      ctx.restore();
    } else if (form === 'ranged') {
      // SHADE: floating watcher with a halo ring, swaying tendrils and a
      // blinking eye.
      const pulse = 1 + Math.sin(t * 0.004 + eph) * 0.07;

      // Halo ring
      if (GFX.enemyFx) {
        ctx.strokeStyle = `rgba(${ar},${ag},${ab},0.45)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, R * 1.5 * pulse, 0, PI2);
        ctx.stroke();
      }

      // Floating body
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(sx, sy, R * pulse, 0, PI2);
      ctx.fill();

      // Five swaying tendrils (curved, not straight spokes)
      ctx.strokeStyle = body;
      ctx.lineWidth = Math.max(1.5, R * 0.14);
      ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const a = eph + i * (PI2 / 5) + t * 0.0004;
        const sway = Math.sin(t * 0.004 + i * 2.1) * R * 0.22;
        const tipR = R * (1.2 + 0.08 * Math.sin(t * 0.003 + i));
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * R * 0.5, sy + Math.sin(a) * R * 0.5);
        ctx.quadraticCurveTo(
          sx + Math.cos(a) * R * 0.85 + Math.cos(a + 1.4) * sway,
          sy + Math.sin(a) * R * 0.85 + Math.sin(a + 1.4) * sway,
          sx + Math.cos(a) * tipR,
          sy + Math.sin(a) * tipR
        );
        ctx.stroke();
      }
      ctx.lineCap = 'butt';

      // Watching eye (blinks now and then)
      ctx.fillStyle = glint;
      ctx.beginPath();
      ctx.arc(sx, sy, R * 0.26, 0, PI2);
      ctx.fill();
      const blink = Math.max(0.12, Math.abs(Math.sin(t * 0.002 + eph)));
      ctx.fillStyle = '#140b18';
      ctx.beginPath();
      ctx.ellipse(sx, sy, R * 0.11, Math.max(1, R * 0.11 * blink), 0, 0, PI2);
      ctx.fill();
    } else {
      // SHADOWLING: small lumpy shadow with two short trailing tendrils and a
      // pair of eyes — organic, not a star.
      const sway = Math.sin(t * 0.006 + eph);

      // Lumpy organic body (low-amplitude wobble)
      ctx.fillStyle = body;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const a = PI2 / 10 * i;
        const lump = R * (0.09 * Math.sin(a * 2 + eph) + 0.05 * Math.sin(a * 4 - t * 0.004));
        const rr = R * (0.92 + 0.04 * Math.sin(a + sway)) + lump;
        const xx = sx + Math.cos(a) * rr;
        const yy = sy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.closePath();
      ctx.fill();

      // Two short trailing tendrils hang from the lower body
      ctx.strokeStyle = core;
      ctx.lineWidth = Math.max(2, R * 0.18);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const ba = 1.1 + side * 0.85 + sway * 0.18;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(ba) * R * 0.5, sy + Math.sin(ba) * R * 0.5);
        ctx.quadraticCurveTo(
          sx + Math.cos(ba) * R * 0.85, sy + Math.sin(ba) * R * 0.85,
          sx + Math.cos(ba) * R * 1.15, sy + Math.sin(ba) * R * 1.15
        );
        ctx.stroke();
      }
      ctx.lineCap = 'butt';

      // Dark core
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(sx + sway * R * 0.05, sy + R * 0.10, R * 0.5, 0, PI2);
      ctx.fill();

      // Two small eyes
      ctx.fillStyle = glint;
      ctx.fillRect(sx - R * 0.30, sy - R * 0.20, R * 0.14, R * 0.11);
      ctx.fillRect(sx + R * 0.16, sy - R * 0.20, R * 0.14, R * 0.11);
    }

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

  // --- Caster bolts (enemy projectiles) ---
  for (const cp of g.castProjectiles) {
    const sx = cp.x - cx;
    const sy = cp.y - cy;
    if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;
    const alpha = clamp(cp.life / cp.maxLife, 0, 1);
    // Trail
    ctx.globalAlpha = alpha * 0.3;
    ctx.strokeStyle = cp.color;
    ctx.lineWidth = cp.radius * 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(cp.prevX - cx, cp.prevY - cy);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // Soft aura
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = cp.color;
    ctx.beginPath();
    ctx.arc(sx, sy, cp.radius * 2.2, 0, PI2);
    ctx.fill();
    // Hot core
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, cp.radius * 0.7, 0, PI2);
    ctx.fill();
    ctx.fillStyle = cp.color;
    ctx.beginPath();
    ctx.arc(sx, sy, cp.radius * 1.1, 0, PI2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // --- Projectiles ---
  for (const pr of g.projectiles) {
    const sx = pr.x - cx;
    const sy = pr.y - cy;
    if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;
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
      ctx.fillStyle = '#3a6fc4';
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
  const px = pl.x - cx, py = pl.y - cy;

  // Cape: behind the body, except when the camera sees the character's back
  // (moving straight up) â€” then it's drawn in FRONT so it visibly starts at
  // the neck and drapes over the back.
  const capeFront = Math.sin(pl.renderAngle) < -0.5;
  // Only the wizard (aeloria) wears the cape; the other characters keep
  // their own silhouettes (pyromancer hood, sentinel armor, assassin cloak).
  const mageOnly = !pl.charId || pl.charId === 'aeloria';
  if (!capeFront && mageOnly) drawCape(cx, cy);

  // Invulnerability blink
  if (pl.invulnTimer > 0 && Math.floor(g.time / 80) % 2 === 0) {
    ctx.globalAlpha = 0.45;
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
    const SR = st.area;
    const sawPulse = 1 + pl.attackPulse * 0.3;
    const rR = SR * sawPulse;
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
  if (charId === 'rael') drawTopDownRael(px, py, pl, g.time);
  else if (charId === 'briga') drawTopDownBriga(px, py, pl, g.time);
  else if (charId === 'nyx') drawTopDownNix(px, py, pl, g.time);
  else drawTopDownMage(px, py, pl, g.time);

  ctx.globalAlpha = 1;

  // Cape in front of the character (back view) â€” wizard only.
  if (capeFront && mageOnly) drawCape(cx, cy);

  // --- Particles ---
  for (const pt of g.particles) {
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
      const grd = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, currentRadius);
      grd.addColorStop(0, 'rgba(220,250,255,0.9)');
      grd.addColorStop(0.5, 'rgba(140,225,255,0.35)');
      grd.addColorStop(1, 'rgba(110,200,255,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx2, cy2, currentRadius, 0, PI2);
      ctx.fill();
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
      // Fire-filled area (radial gradient, bright centre fading to transparent)
      ctx.globalAlpha = alpha * 0.55;
      const grd = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, currentRadius);
      grd.addColorStop(0, 'rgba(255,200,60,0.9)');
      grd.addColorStop(0.35, 'rgba(255,100,20,0.7)');
      grd.addColorStop(0.7, 'rgba(255,50,0,0.3)');
      grd.addColorStop(1, 'rgba(255,30,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx2, cy2, currentRadius, 0, PI2);
      ctx.fill();
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
  for (const ft of g.floatingTexts) {
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
    // Cheap flat darkness instead of the dynamic lighting layer
    ctx.fillStyle = biomeDarkColor();
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
  const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  // --- Biome compass ---
  if (GFX.compass) drawCompass();

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

function drawCompass() {
  const g = game;
  const R = 60;
  const cx = VIEW_W - R - 16;
  const cy = VIEW_H - R - 16;
  const p = g.player;

  // Face — a translucent rose fixed to the world (north = screen up)
  ctx.fillStyle = 'rgba(4,8,16,0.55)';
  ctx.strokeStyle = '#31415c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, PI2);
  ctx.fill();
  ctx.stroke();

  // Cardinal letters
  ctx.fillStyle = '#7aa2c4';
  ctx.font = 'bold 10px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', cx, cy - R + 10);
  ctx.fillText('E', cx + R - 10, cy);
  ctx.fillText('S', cx, cy + R - 10);
  ctx.fillText('W', cx - R + 10, cy);

  const ring = R - 16;

  // Tick marks at the 8 sector directions
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (ring - 5), cy + Math.sin(a) * (ring - 5));
    ctx.lineTo(cx + Math.cos(a) * ring, cy + Math.sin(a) * ring);
    ctx.stroke();
  }

  // One dot per discovered biome: the chest sits at the heart of each wedge,
  // so every dot points exactly at that treasure. Undiscovered biomes show
  // as faint ghost dots; the current biome always glows.
  const weights = biomeWeightsAt(p.x, p.y);
  const cur = owningBiomeAt(p.x, p.y);
  for (let k = 0; k < 8; k++) {
    const id = BIOME_IDS[k];
    const c = chestPos(id);
    const ba = Math.atan2(c.y - p.y, c.x - p.x);
    const wt = weights[id] || 0;
    const isCur = id === cur;
    const discovered = isCur || g.discoveredBiomes.includes(id);
    const cleared = heartCleared(id);

    const bx = cx + Math.cos(ba) * (ring - 5);
    const by = cy + Math.sin(ba) * (ring - 5);

    if (!discovered) {
      // Ghost dot: very faint hint that something exists out there
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = '#556677';
      ctx.beginPath();
      ctx.arc(bx, by, 2.5, 0, PI2);
      ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }

    // Discovered biome: full color, current biome pulses
    const rad = isCur ? 4.5 + wt * 1.5 + Math.sin(g.time * 0.006) * 0.6 : 3 + wt * 3;
    ctx.globalAlpha = isCur ? 1 : clamp(0.35 + wt * 2.2, 0, 1);
    if (isCur) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(bx, by, rad + 1.5, 0, PI2);
      ctx.fill();
    }
    ctx.fillStyle = BIOME_DEFS[id].color;
    ctx.beginPath();
    ctx.arc(bx, by, rad, 0, PI2);
    ctx.fill();
    // Cleared-heart purple ring
    if (cleared) {
      ctx.strokeStyle = 'rgba(200,155,255,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx, by, rad + 3 + Math.sin(g.time * 0.005 + k) * 0.8, 0, PI2);
      ctx.stroke();
    }
    // Biome name label for discovered biomes with a weapon
    if (BIOME_DEFS[id].weapon) {
      const midAng = -Math.PI / 2 + k * Math.PI / 4 + Math.PI / 8;
      const lx = cx + Math.cos(midAng) * (ring - 15);
      const ly = cy + Math.sin(midAng) * (ring - 15);
      ctx.globalAlpha = isCur ? 1 : 0.7;
      ctx.fillStyle = BIOME_DEFS[id].color;
      ctx.font = 'bold 8px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(BIOME_DEFS[id].name.toUpperCase(), lx, ly);
    }
  }
  ctx.globalAlpha = 1;

  // Player centre mark
  ctx.fillStyle = '#e8f2ff';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, PI2);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
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
