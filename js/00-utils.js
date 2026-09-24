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
const dist2 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };
const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const lerp = (a, b, t) => a + (b - a) * t;
const choose = arr => arr[randInt(0, arr.length - 1)];
const wrapAngle = a => { while (a > Math.PI) a -= PI2; while (a < -Math.PI) a += PI2; return a; };

// True on devices that primarily input through a coarse pointer (touch
// phones/tablets). Used to skip the reactive grass trail on mobile — the
// bend/trample effect is tuned for keyboard/mouse and wastes GPU on phones.
const IS_MOBILE = (typeof navigator !== 'undefined')
  && (('ontouchstart' in window)
    || (navigator.maxTouchPoints > 0)
    || (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches));

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Grass blade colour variation ---
// Five graded shade levels used to tint individual grass blades of the same
// tone (~±12% luminance). Small enough to stay "the same green", large enough
// that neighbouring blades read as slightly different strands.
const GRASS_TINT_LEVELS = [0.88, 0.94, 1.0, 1.06, 1.12];

// Scale every RGB channel of a #rrggbb colour by `f` (0..1 dims, >1 brightens).
function tintHex(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

// #rrggbb -> [r, g, b] (used to feed hex blade colours into palette arrays).
function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// --- Persistent user preferences (localStorage, keyed `shadow.prefs.<k>`) ---
function prefGet(key, defVal) {
  try {
    const v = localStorage.getItem('shadow.prefs.' + key);
    return v === null ? defVal : (v === '1' || v === 'true');
  } catch (e) { return defVal; }
}

function prefSet(key, val) {
  try { localStorage.setItem('shadow.prefs.' + key, val ? '1' : '0'); } catch (e) {}
}

// Latest user choice: show the yellow damage-dealt numbers above enemies.
// Cached in memory so the render loop never hits localStorage per frame.
let _dmgNumbers = prefGet('dmgNumbers', true);
function setDmgNumbers(v) { _dmgNumbers = !!v; prefSet('dmgNumbers', _dmgNumbers); }
function showDmgNumbers() { return _dmgNumbers; }