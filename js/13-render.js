// ============================================================
// RENDERING
// ============================================================

// Draw a horseshoe XP-magnet pickup (top-down view), open at the top
// with white pole caps and orbiting sparks.
function drawMagnetPickup(x, y, t) {
  const pulse = 1 + Math.sin(t * 0.006) * 0.12;
  const r = 10 * pulse;
  // Outer red glow
  const grd = ctx.createRadialGradient(x, y, 2, x, y, 30 * pulse);
  grd.addColorStop(0, 'rgba(255,70,90,0.30)');
  grd.addColorStop(0.5, 'rgba(255,50,70,0.12)');
  grd.addColorStop(1, 'rgba(255,50,70,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y, 30 * pulse, 0, PI2);
  ctx.fill();
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
// TOP-DOWN PIXEL MAGE
// Procedural hero - no external sprite required
// ============================================================
function drawTopDownMage(x, y, pl, time) {
  const moving = Math.hypot(pl.velX, pl.velY) > 0.4;
  const speed = Math.hypot(pl.velX, pl.velY);

  // ----------------------------------------------------------
  // Direction: no continuous body rotation; a true 4-dir RPG facing
  // ----------------------------------------------------------
  let dir = 'DOWN';
  if (speed > 0.4) {
    if (Math.abs(pl.velX) > Math.abs(pl.velY)) {
      dir = pl.velX > 0 ? 'RIGHT' : 'LEFT';
    } else {
      dir = pl.velY > 0 ? 'DOWN' : 'UP';
    }
  } else {
    const a = pl.renderAngle;
    if (Math.abs(Math.cos(a)) > Math.abs(Math.sin(a))) {
      dir = Math.cos(a) > 0 ? 'RIGHT' : 'LEFT';
    } else {
      dir = Math.sin(a) > 0 ? 'DOWN' : 'UP';
    }
  }

  // ----------------------------------------------------------
  // Animation: 4-frame walk cycle, idle bob, attack frames
  // ----------------------------------------------------------
  const walkFrame = moving ? Math.floor(time / 110) % 4 : 0;
  const bob = moving ? [0, -1, 0, 1][walkFrame] : Math.sin(time * 0.003) * 0.35;
  const attack = pl.attackPulse > 0.01;
  const attackFrame = attack ? Math.min(3, Math.floor((1 - pl.attackPulse) * 4)) : 0;

  // Pixel helper: everything aligns to integer pixels
  const px = v => Math.round(v);

  ctx.save();
  ctx.translate(px(x), px(y + bob));
  ctx.imageSmoothingEnabled = false;

  // PALETTE
  const OUTLINE = '#10152b';
  const BLUE_DARK = '#17255c';
  const BLUE_DEEP = '#20357d';
  const BLUE = '#315dcc';
  const BLUE_LIGHT = '#4e82ed';
  const GOLD_DARK = '#9b6420';
  const GOLD = '#dca437';
  const GOLD_LIGHT = '#ffd65c';
  const SKIN = '#e8ad86';
  const SKIN_DARK = '#a96355';
  const WOOD_DARK = '#42291e';
  const WOOD = '#70452f';
  const WOOD_LIGHT = '#a06a45';
  const MAGIC_DARK = '#2186d8';
  const MAGIC = '#55c9ff';
  const MAGIC_LIGHT = '#d8f8ff';

  // ----------------------------------------------------------
  // Ground shadow
  // ----------------------------------------------------------
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(1, 13, 13 + (moving ? 1 : 0), 5, 0, 0, PI2);
  ctx.fill();

  // ----------------------------------------------------------
  // Walking feet
  // ----------------------------------------------------------
  const step = moving ? [0, -2, 0, 2][walkFrame] : 0;
  ctx.fillStyle = OUTLINE;
  if (dir === 'DOWN' || dir === 'UP') {
    ctx.fillRect(-9 + step, 8, 5, 7);
    ctx.fillRect(4 - step, 8, 5, 7);
    ctx.fillStyle = BLUE_DARK;
    ctx.fillRect(-8 + step, 9, 4, 5);
    ctx.fillRect(5 - step, 9, 4, 5);
  } else {
    ctx.fillRect(-7 + step, 8, 6, 6);
    ctx.fillRect(3 - step, 9, 6, 5);
    ctx.fillStyle = BLUE_DARK;
    ctx.fillRect(-6 + step, 9, 5, 4);
    ctx.fillRect(4 - step, 10, 5, 3);
  }

  // ----------------------------------------------------------
  // Body / robe outline
  // ----------------------------------------------------------
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

  // Robe
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

  // Robe light side
  ctx.fillStyle = BLUE;
  ctx.beginPath();
  ctx.moveTo(-6, -8);
  ctx.lineTo(-2, -10);
  ctx.lineTo(2, -9);
  ctx.lineTo(1, 9);
  ctx.lineTo(-5, 10);
  ctx.lineTo(-7, 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = BLUE_LIGHT;
  ctx.fillRect(-5, -6, 2, 7);
  ctx.fillRect(-4, 2, 2, 5);

  // ----------------------------------------------------------
  // Golden robe trim
  // ----------------------------------------------------------
  ctx.fillStyle = GOLD_DARK;
  ctx.fillRect(-7, 8, 14, 3);
  ctx.fillStyle = GOLD;
  ctx.fillRect(-6, 8, 12, 2);
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fillRect(-3, 8, 4, 1);

  // ----------------------------------------------------------
  // Arms
  // ----------------------------------------------------------
  if (dir === 'DOWN') {
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-12, -3, 5, 8);
    ctx.fillStyle = BLUE;
    ctx.fillRect(-11, -2, 4, 6);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(7, -3, 5, 8);
    ctx.fillStyle = BLUE;
    ctx.fillRect(7, -2, 4, 6);
    ctx.fillStyle = SKIN;
    ctx.fillRect(-9, 3, 3, 3);
  } else if (dir === 'LEFT') {
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(-12, -4, 5, 9);
    ctx.fillStyle = BLUE;
    ctx.fillRect(-11, -3, 4, 7);
    ctx.fillStyle = SKIN;
    ctx.fillRect(-12, 2, 3, 3);
  } else if (dir === 'RIGHT') {
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(7, -4, 5, 9);
    ctx.fillStyle = BLUE;
    ctx.fillRect(7, -3, 4, 7);
    ctx.fillStyle = SKIN;
    ctx.fillRect(9, 2, 3, 3);
  }

  // ----------------------------------------------------------
  // Head (face only visible from the front)
  // ----------------------------------------------------------
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(-7, -13, 14, 10);
  if (dir === 'DOWN') {
    ctx.fillStyle = SKIN;
    ctx.fillRect(-5, -9, 10, 7);
    ctx.fillRect(-4, -2, 8, 3);
    ctx.fillStyle = SKIN_DARK;
    ctx.fillRect(-4, 1, 8, 2);
  } else if (dir === 'UP') {
    ctx.fillStyle = BLUE_DARK;
    ctx.fillRect(-5, -10, 10, 9);
  } else if (dir === 'LEFT') {
    ctx.fillStyle = SKIN;
    ctx.fillRect(-6, -9, 7, 8);
    ctx.fillRect(-7, -5, 4, 4);
    ctx.fillStyle = SKIN_DARK;
    ctx.fillRect(-6, -1, 5, 2);
  } else {
    ctx.fillStyle = SKIN;
    ctx.fillRect(-1, -9, 7, 8);
    ctx.fillRect(3, -5, 4, 4);
    ctx.fillStyle = SKIN_DARK;
    ctx.fillRect(1, -1, 5, 2);
  }

  // ----------------------------------------------------------
  // Huge pixel wizard hat
  // ----------------------------------------------------------
  ctx.fillStyle = OUTLINE;
  // brim
  ctx.fillRect(-13, -14, 26, 6);
  ctx.fillRect(-10, -16, 20, 3);
  // cone
  ctx.beginPath();
  ctx.moveTo(-8, -15);
  ctx.lineTo(-5, -25);
  ctx.lineTo(0, -31);
  ctx.lineTo(6, -27);
  ctx.lineTo(7, -17);
  ctx.lineTo(10, -14);
  ctx.closePath();
  ctx.fill();
  // hat body
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
  // bright left side
  ctx.fillStyle = BLUE;
  ctx.fillRect(-5, -22, 4, 7);
  ctx.fillRect(-3, -25, 3, 5);
  // hat highlight
  ctx.fillStyle = BLUE_LIGHT;
  ctx.fillRect(-4, -22, 2, 5);

  // ----------------------------------------------------------
  // Hat band
  // ----------------------------------------------------------
  ctx.fillStyle = GOLD_DARK;
  ctx.fillRect(-9, -15, 18, 3);
  ctx.fillStyle = GOLD;
  ctx.fillRect(-7, -15, 14, 2);
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fillRect(-2, -15, 5, 1);

  // ----------------------------------------------------------
  // Staff (always on the side, flipped when facing LEFT)
  // ----------------------------------------------------------
  let staffSide = 1;
  if (dir === 'LEFT') staffSide = -1;
  const sx = staffSide * 14;

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(sx, 13);
  ctx.lineTo(sx + staffSide * 3, -18);
  ctx.stroke();

  ctx.strokeStyle = WOOD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, 13);
  ctx.lineTo(sx + staffSide * 3, -18);
  ctx.stroke();

  ctx.strokeStyle = WOOD_LIGHT;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx + staffSide, 10);
  ctx.lineTo(sx + staffSide * 3, -15);
  ctx.stroke();

  // ----------------------------------------------------------
  // Magic crystal on the staff tip
  // ----------------------------------------------------------
  const crystalX = sx + staffSide * 3;
  const crystalY = -20;
  const glow = ctx.createRadialGradient(crystalX, crystalY, 1, crystalX, crystalY, 10);
  glow.addColorStop(0, 'rgba(100,220,255,0.7)');
  glow.addColorStop(0.4, 'rgba(50,160,255,0.3)');
  glow.addColorStop(1, 'rgba(50,160,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(crystalX, crystalY, 10, 0, PI2);
  ctx.fill();

  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.moveTo(crystalX, crystalY - 5);
  ctx.lineTo(crystalX + 5, crystalY);
  ctx.lineTo(crystalX, crystalY + 5);
  ctx.lineTo(crystalX - 5, crystalY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = MAGIC;
  ctx.beginPath();
  ctx.moveTo(crystalX, crystalY - 4);
  ctx.lineTo(crystalX + 4, crystalY);
  ctx.lineTo(crystalX, crystalY + 4);
  ctx.lineTo(crystalX - 4, crystalY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = MAGIC_LIGHT;
  ctx.fillRect(crystalX - 1, crystalY - 2, 2, 3);

  // ----------------------------------------------------------
  // Attack: magic orb + sparkle in front of the facing direction
  // ----------------------------------------------------------
  if (attack) {
    const p = attackFrame / 3;
    ctx.globalAlpha = 0.35 + p * 0.65;
    let ax = 0, ay = -20;
    if (dir === 'DOWN') { ax = 0; ay = 24; }
    if (dir === 'UP') { ax = 0; ay = -28; }
    if (dir === 'LEFT') { ax = -27; ay = 0; }
    if (dir === 'RIGHT') { ax = 27; ay = 0; }

    ctx.fillStyle = MAGIC_DARK;
    ctx.beginPath();
    ctx.arc(ax, ay, 7 + p * 5, 0, PI2);
    ctx.fill();
    ctx.fillStyle = MAGIC;
    ctx.beginPath();
    ctx.arc(ax, ay, 4 + p * 3, 0, PI2);
    ctx.fill();
    ctx.fillStyle = MAGIC_LIGHT;
    ctx.beginPath();
    ctx.arc(ax - 1, ay - 1, 2, 0, PI2);
    ctx.fill();

    ctx.strokeStyle = MAGIC_LIGHT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax - 10, ay);
    ctx.lineTo(ax + 10, ay);
    ctx.moveTo(ax, ay - 10);
    ctx.lineTo(ax, ay + 10);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ----------------------------------------------------------
  // Idle magic motes
  // ----------------------------------------------------------
  if (!moving && !attack) {
    for (let i = 0; i < 3; i++) {
      const a = time * 0.001 + i * 2.1;
      const r = 15 + Math.sin(time * 0.002 + i) * 2;
      const mx = Math.cos(a) * r;
      const my = Math.sin(a) * r * 0.7;
      ctx.globalAlpha = 0.25 + Math.sin(time * 0.004 + i) * 0.15;
      ctx.fillStyle = MAGIC;
      ctx.fillRect(Math.round(mx), Math.round(my), 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function render() {
  const g = game;
  const cx = g.camera.x;
  const cy = g.camera.y;
  const w = VIEW_W;
  const h = VIEW_H;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

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
  drawTorches(cx, cy, w, h);

  // --- Pickups ---
  for (const pk of g.pickups) {
    const sx = pk.x - cx;
    const sy = pk.y - cy;
    if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;
    if (pk.type === 'magnet') {
      drawMagnetPickup(sx, sy, g.time);
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
      const grd = ctx.createRadialGradient(sx, sy, 2, sx, sy, 22);
      grd.addColorStop(0, 'rgba(255,240,160,0.9)');
      grd.addColorStop(0.4, 'rgba(255,200,80,0.35)');
      grd.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(sx, sy, 22, 0, PI2);
      ctx.fill();
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

  // --- Enemies (solid shadow blobs with per-type palette) ---
  const t = g.time;
  for (const e of g.enemies) {
    if (e.dead) continue;
    const sx = e.x - cx;
    const sy = e.y - cy;
    if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) continue;

    const R = e.radius;
    const eph = e.ph || 0;

    const [ar, ag, ab] = e.aura || [120, 0, 30];

    // Outer type-colored aura (very soft)
    ctx.globalAlpha = e.auraAlpha ?? 0.15;
    ctx.fillStyle = `rgb(${ar},${ag},${ab})`;
    ctx.beginPath();
    ctx.arc(sx, sy, R * (e.auraScale ?? 2.2), 0, PI2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Solid amorphous body: an opaque wobbly blob (no transparency). The edge
    // undulates over time so its shape never becomes a fixed, defined polygon.
    const r1 = R * (1 + 0.10 * Math.sin(t * 0.006 + eph));
    const r2 = R * (1 + 0.10 * Math.sin(t * 0.006 + eph + 2.1));
    const wobR = R * 0.45;
    ctx.fillStyle = e.body || '#ff4d4d';
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const a = PI2 / 14 * i;
      const rr = R + wobR * Math.sin(a * 3 + t * 0.005 + eph)
                      + wobR * 0.6 * Math.sin(a * 5 - t * 0.008 + eph * 2);
      const rr2 = rr * (0.92 + 0.08 * Math.sin(t * 0.004 + eph));
      const xx = sx + Math.cos(a) * rr2;
      const yy = sy + Math.sin(a) * rr2;
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.closePath();
    ctx.fill();

    // Darker solid inner core (opaque, gives "heavy shadow" depth)
    const coreR = R * 0.55;
    ctx.fillStyle = e.core || '#7a1a1a';
    ctx.beginPath();
    ctx.arc(sx + r1 * 0.12 - r2 * 0.08, sy + r2 * 0.12 - r1 * 0.08, coreR, 0, PI2);
    ctx.fill();

    // Highlight glint (opaque, small)
    ctx.fillStyle = e.glint || '#ff9e9e';
    ctx.beginPath();
    ctx.arc(sx - coreR * 0.25, sy - coreR * 0.25, coreR * 0.35, 0, PI2);
    ctx.fill();

    // Hit flash overlay
    if (e.flashTimer > 0) {
      ctx.globalAlpha = 0.45 * (e.flashTimer / 100);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, sy, R * 1.1, 0, PI2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Shielded enemy: visible shield wedge always facing the player
    if (e.shield > 0) {
      const fA = e.faceA || 0;
      const half = Math.PI * 0.19;          // ~34° front arc (user: a little less arc)
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

    // Warden: golden rim + crown spikes on the sentinel armor
    if (e.type === 'warden') {
      ctx.strokeStyle = 'rgba(255,215,120,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, R + 2, 0.6, 2.5);   // partial rim
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,215,120,0.7)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const sa = eph + g.time * 0.001 + i * (PI2 / 4);
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(sa) * (R + 2), sy + Math.sin(sa) * (R + 2));
        ctx.lineTo(sx + Math.cos(sa) * (R + 7), sy + Math.sin(sa) * (R + 7));
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;

    // HP bar for elites and bosses
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
  }

  // --- Poison clouds (stationary DoT zones) ---
  for (const c of g.clouds) {
    const sx = c.x - cx;
    const sy = c.y - cy;
    if (sx < -c.radius || sx > w + c.radius || sy < -c.radius || sy > h + c.radius) continue;
    const alpha = clamp(c.life / c.maxLife, 0, 1);
    const pulse = 1 + 0.1 * Math.sin(g.time * 0.007 + c.x);
    const R = c.radius * pulse;
    const grd = ctx.createRadialGradient(sx, sy, R * 0.1, sx, sy, R);
    grd.addColorStop(0, `rgba(110,230,120,${0.34 * alpha})`);
    grd.addColorStop(0.6, `rgba(70,160,90,${0.22 * alpha})`);
    grd.addColorStop(1, 'rgba(70,160,90,0)');
    ctx.fillStyle = grd;
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
    const grd = ctx.createRadialGradient(sx, sy, R * 0.15, sx, sy, R);
    grd.addColorStop(0, `rgba(190,80,255,${0.4 * alpha})`);
    grd.addColorStop(0.5, `rgba(90,20,160,${0.28 * alpha})`);
    grd.addColorStop(1, 'rgba(20,0,40,0)');
    ctx.fillStyle = grd;
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
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.4);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, pr.color);
      grad.addColorStop(1, '#b9f6ff');
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

  // Dynamic cape (drawn behind the body — kept)
  drawCape(cx, cy);

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

  drawTopDownMage(px, py, pl, g.time);

  ctx.globalAlpha = 1;

  // --- Particles ---
  for (const pt of g.particles) {
    const alpha = clamp(pt.life / pt.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    if (pt.type === 'shockwave') {
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

  // --- Vignette ---
  drawLighting(cx, cy, w, h);
  const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  // --- Minimap ---
  drawMinimap();

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
function drawCape(cx, cy) {
  const p = game.player;
  const cap = p.cape;
  if (!cap || !cap.grid || cap.grid.length < 2) return;
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

function drawMinimap() {
  const g = game;
  const mmW = 140, mmH = 140;
  const mmX = VIEW_W - mmW - 10;
  const mmY = VIEW_H - mmH - 10;
  const mmRange = 1200;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.fillRect(mmX, mmY, mmW, mmH);
  ctx.strokeRect(mmX, mmY, mmW, mmH);

  const scale = mmW / (mmRange * 2);
  const cx = mmX + mmW / 2;
  const cy = mmY + mmH / 2;

  // Player dot
  ctx.fillStyle = '#4cf';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, PI2);
  ctx.fill();

  // Enemy dots
  ctx.fillStyle = '#e44';
  for (const e of g.enemies) {
    const dx = (e.x - g.player.x) * scale;
    const dy = (e.y - g.player.y) * scale;
    if (Math.abs(dx) < mmW / 2 && Math.abs(dy) < mmH / 2) {
      ctx.fillRect(cx + dx - 1, cy + dy - 1, 2, 2);
    }
  }

  // Pickup dots
  for (const pk of g.pickups) {
    const dx = (pk.x - g.player.x) * scale;
    const dy = (pk.y - g.player.y) * scale;
    if (Math.abs(dx) < mmW / 2 && Math.abs(dy) < mmH / 2) {
      ctx.fillStyle = pk.type === 'xp' ? pk.color : '#4af';
      ctx.fillRect(cx + dx, cy + dy, 1, 1);
    }
  }
}
