// ============================================================
// CORE UTILITIES & CANVAS SETUP
// ============================================================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Logical (CSS pixel) view size + DPR-aware hi-res backing store so high-DPI
// phones render crisp instead of upscaled. Game math stays in CSS pixels.
const DPR = Math.min(window.devicePixelRatio || 1, 2);
let VIEW_W = 0;
let VIEW_H = 0;

// --- Canvas Resize ---
function resizeCanvas() {
  VIEW_W = window.innerWidth;
  VIEW_H = window.innerHeight;
  const ps = (typeof GFX !== 'undefined' && GFX.pixelScale) ? GFX.pixelScale : 1;
  canvas.width = Math.max(1, Math.round(VIEW_W * DPR * ps));
  canvas.height = Math.max(1, Math.round(VIEW_H * DPR * ps));
  canvas.style.width = VIEW_W + 'px';
  canvas.style.height = VIEW_H + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const PI2 = Math.PI * 2;
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const lerp = (a, b, t) => a + (b - a) * t;
const choose = arr => arr[randInt(0, arr.length - 1)];
const wrapAngle = a => { while (a > Math.PI) a -= PI2; while (a < -Math.PI) a += PI2; return a; };

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}