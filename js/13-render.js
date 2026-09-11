// ============================================================
// RENDERING
// ============================================================
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
      ctx.drawImage(chk, ccx * CHUNK_PX - cx, ccy * CHUNK_PX - cy);
    }
  }

  // --- Torches with flickering fire ---
  drawTorches(cx, cy, w, h);

  // --- Pickups ---
  for (const pk of g.pickups) {
    const sx = pk.x - cx;
    const sy = pk.y - cy;
    if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;
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

    ctx.globalAlpha = 1;

    // HP bar for elites and bosses
    if (e.type !== 'normal') {
      const barW = R * 2;
      const barH = 4;
      const barX = sx - barW / 2;
      const barY = sy - R - 10;
      ctx.fillStyle = '#300';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = e.type === 'boss' ? '#f0f' : '#fa0';
      ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
    }
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

  // --- Player ---
  const px = g.player.x - cx;
  const py = g.player.y - cy;
  if (g.player.invulnTimer > 0 && Math.floor(g.time / 80) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }
  // Body
  ctx.fillStyle = '#4cf';
  ctx.beginPath();
  ctx.arc(px, py, g.player.radius, 0, PI2);
  ctx.fill();
  // Inner highlight
  ctx.fillStyle = '#8df';
  ctx.beginPath();
  ctx.arc(px - 3, py - 3, g.player.radius * 0.5, 0, PI2);
  ctx.fill();
  // Direction indicator
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(px + Math.cos(g.player.facingAngle) * 10, py + Math.sin(g.player.facingAngle) * 10, 3, 0, PI2);
  ctx.fill();
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