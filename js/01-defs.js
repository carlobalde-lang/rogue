// ============================================================
// DATA DEFINITIONS: WEAPONS, PASSIVES, ENEMIES, SPAWN TABLES
// Add a new weapon / passive / enemy here to extend the game.
// ============================================================

// --- Weapon definitions — add new weapons here ---
const WEAPON_DEFS = {
  magicBolt: {
    name: 'Magic Bolt', icon: '🔮', color: '#aaf',
    desc: 'Fires homing bolts at nearest enemies',
    baseDmg: 8, baseSpeed: 8, baseRate: 900, baseCount: 1, baseArea: 0,
    upgradeDesc: l => `+${2+l} dmg, +${l > 2 ? 1 : 0} projectile${l > 2 ? 's' : ''}`
  },
  holyShield: {
    name: 'Holy Shield', icon: '🛡️', color: '#ffa',
    desc: 'Orbiting shields that damage enemies',
    baseDmg: 12, baseSpeed: 0, baseRate: 0, baseCount: 2, baseArea: 50,
    upgradeDesc: l => `+${3+l} dmg, +1 orb`
  },
  lightning: {
    name: 'Lightning', icon: '⚡', color: '#ff0',
    desc: 'Strikes nearest enemy with chain lightning',
    baseDmg: 15, baseSpeed: 0, baseRate: 1200, baseCount: 1, baseArea: 0,
    upgradeDesc: l => `+${4+l} dmg, +${l >= 3 ? 2 : 1} target${l >= 3 ? 's' : ''}`
  },
  fireBlast: {
    name: 'Fire Blast', icon: '🔥', color: '#f80',
    desc: 'Periodic explosions around you',
    baseDmg: 6, baseSpeed: 0, baseRate: 2200, baseCount: 1, baseArea: 75,
    upgradeDesc: l => `+${1+l} dmg, +15 area`
  },
  holyCross: {
    name: 'Stellar', icon: '✨', color: '#aef3ff',
    desc: 'Star projectiles that pierce enemies',
    baseDmg: 6, baseSpeed: 5, baseRate: 1100, baseCount: 1, baseArea: 0,
    upgradeDesc: l => `+${2+l} dmg, +1 star`
  },
  chainSaw: {
    name: 'Chain Saw', icon: '🪚', color: '#afc',
    desc: 'Rotating saw: enemies take damage only touching the blades',
    baseDmg: 8, baseSpeed: 0, baseRate: 0, baseCount: 1, baseArea: 30,
    upgradeDesc: l => `+${2+l} dmg, +6 area`
  },
  poisonCloud: {
    name: 'Poison Cloud', icon: '☠️', color: '#6e5',
    desc: 'Leaves clouds around you that poison enemies (DoT)',
    baseDmg: 6, baseSpeed: 0, baseRate: 1000, baseCount: 1, baseArea: 65,
    upgradeDesc: l => `+${2+l} dmg, +10 area`
  },
  boomerang: {
    name: 'Boomerang', icon: '🪃', color: '#8f8',
    desc: 'Throws boomerangs that return, hitting twice',
    baseDmg: 14, baseSpeed: 6, baseRate: 1400, baseCount: 1, baseArea: 0,
    upgradeDesc: l => `+${3+l} dmg, +${l >= 2 ? 1 : 0} boomerang${l >= 2 ? 's' : ''}`
  },
  turret: {
    name: 'Turret', icon: '🗼', color: '#fc8',
    desc: 'Deploys turrets that fire on their own',
    baseDmg: 9, baseSpeed: 0, baseRate: 0, baseCount: 1, baseArea: 0,
    upgradeDesc: l => `+${2+l} dmg, +1 turret`
  },
  voidRift: {
    name: 'Void Rift', icon: '🌀', color: '#8af',
    desc: 'Opens rifts that pull enemies in and drain them',
    baseDmg: 3, baseSpeed: 0, baseRate: 5500, baseCount: 1, baseArea: 90,
    upgradeDesc: l => `+15 area, -15% cooldown`
  }
};

// --- Passive definitions — add new passives here ---
const PASSIVE_DEFS = {
  maxHp:     { name: 'Vitality',     icon: '❤️', desc: '+20 Max HP', apply: p => { p.maxHp += 20; p.hp = Math.min(p.hp + 20, p.maxHp); } },
  speed:     { name: 'Swift Boots',  icon: '👟', desc: '+12% Move Speed', apply: p => { p.speed *= 1.12; } },
  damage:    { name: 'Power Up',     icon: '💪', desc: '+15% Damage', apply: p => { p.dmgMult *= 1.15; } },
  soulHarvest: { name: 'Soul Harvest', icon: '💀', desc: 'Kills explode, damaging nearby enemies (18% chance, small blast)', apply: p => { p.soulHarvest += 0.18; } },
  cooldown:  { name: 'Haste',        icon: '⏱️', desc: '-15% Cooldown', apply: p => { p.cdMult *= 0.85; } },
  armor:     { name: 'Iron Skin',    icon: '🪖', desc: '+1 Armor (reduces dmg)', apply: p => { p.armor += 1; } },
  magnet:    { name: 'Magnet',       icon: '🧲', desc: '+40% Pickup Range', apply: p => { p.pickupRange *= 1.4; } },
  regen:     { name: 'Regeneration', icon: '💚', desc: '+0.3 HP/s', apply: p => { p.regen += 0.3; } },
  vampirism: { name: 'Vampirism',    icon: '🩸', desc: '+10% of damage dealt becomes HP', apply: p => { p.vamp = (p.vamp || 0) + 0.10; } },
  growth:    { name: 'Growth',       icon: '📈', desc: '+15% Weapon Area / Radius', apply: p => { p.areaMult *= 1.15; } },
  duplicator:{ name: 'Duplicator',   icon: '✌️', desc: '+12% chance a projectile fires twice', apply: p => { p.duplicate = (p.duplicate || 0) + 0.12; } },
  cdrKill:   { name: 'Rush',         icon: '⏳', desc: 'Kills cut your weapon cooldowns', apply: p => { p.cdrKillLvl = (p.cdrKillLvl || 0) + 1; } },
  luck:      { name: 'Luck',         icon: '🍀', desc: '+8% extra gems & better rare drops', apply: p => { p.luck = (p.luck || 0) + 0.08; } },
  revive:    { name: 'Revive',       icon: '💫', desc: 'Resurrect with 60% HP once (max 2)', apply: p => { p.revives = Math.min(2, (p.revives || 0) + 1); }, weight: 0.12, max: 2 },
  thorns:    { name: 'Thorns',       icon: '🌵', desc: '+50% of damage taken reflected to attackers', apply: p => { p.thorns = (p.thorns || 0) + 0.50; } }
};

// --- Enemy definitions — add new enemies here ---
// Each entry can override the base stat formulas. `category` drives XP/drop
// behavior: 'normal' (1 gem), 'elite' (5 gems), 'boss' (bonus XP + 10 gems).
const ENEMY_DEFS = {
  normal: {
    name: 'Shadowling', category: 'normal',
    radius: dm => 8 + rand(0, 4),
    hp: dm => 5 + dm * 2.5,
    speed: dm => 40 + rand(0, 30) + dm * 2.5,
    damage: dm => 3 + Math.floor(dm * 0.7),
    xp: 2,
    color: '#e44',
    // Visual "shadow blob" palette (solid body + core + glint + aura RGB)
    body: '#ff4d4d', core: '#7a1a1a', glint: '#ff9e9e',
    aura: [120, 0, 30], auraAlpha: 0.15, auraScale: 2.2
  },
  swarmling: {
    name: 'Swarmling', category: 'normal',
    radius: dm => 5,
    hp: dm => 1 + dm * 0.5,
    speed: dm => 55 + rand(0, 30) + dm * 3,
    damage: dm => 1 + Math.floor(dm * 0.4),
    xp: 1,
    color: '#f66',
    body: '#ff6666', core: '#771717', glint: '#ffc1c1',
    aura: [200, 60, 60], auraAlpha: 0.18, auraScale: 2.6
  },
  shielded: {
    name: 'Shielded', category: 'normal',
    radius: dm => 14,
    hp: dm => 40 + dm * 10,
    speed: dm => 30 + rand(0, 15) + dm,
    damage: dm => 5 + Math.floor(dm),
    xp: 6,
    color: '#88f',
    body: '#7777ff', core: '#2a2a7a', glint: '#c9c9ff',
    aura: [90, 90, 220], auraAlpha: 0.18, auraScale: 2.4,
    shield: dm => 40 + dm * 5
  },
  splitter: {
    name: 'Splitter', category: 'normal',
    radius: dm => 11,
    hp: dm => 18 + dm * 6,
    speed: dm => 35 + rand(0, 20) + dm,
    damage: dm => 4 + Math.floor(dm),
    xp: 3,
    color: '#8f8',
    body: '#66e66', core: '#1c5c1c', glint: '#c8ffc8',
    aura: [60, 200, 60], auraAlpha: 0.16, auraScale: 2.4
  },
  caster: {
    name: 'Caster', category: 'normal',
    radius: dm => 9,
    hp: dm => 12 + dm * 4,
    speed: dm => 25 + rand(0, 15) + dm,
    damage: dm => 3 + Math.floor(dm),
    xp: 4,
    color: '#f9a',
    body: '#ff9a6e', core: '#7a2a14', glint: '#ffd1b8',
    aura: [220, 120, 40], auraAlpha: 0.18, auraScale: 2.4,
    fireRate: 1800
  },
  leecher: {
    name: 'Leecher', category: 'normal',
    radius: dm => 12,
    hp: dm => 25 + dm * 7,
    speed: dm => 38 + rand(0, 20) + dm,
    damage: dm => 4 + Math.floor(dm * 0.8),
    xp: 5,
    color: '#a4a',
    body: '#b76bb7', core: '#4a1c4a', glint: '#eec1ee',
    aura: [160, 40, 160], auraAlpha: 0.18, auraScale: 2.4
  },
  elite: {
    name: 'Elite', category: 'elite',
    radius: dm => 18,
    hp: dm => 50 * dm * dm,
    speed: dm => 55 + rand(0, 25) + dm * 2,
    damage: dm => 8 + Math.floor(dm * 3),
    xp: 25,
    color: '#fa0',
    body: '#ff8c1a', core: '#a35205', glint: '#ffc37a',
    aura: [200, 100, 0], auraAlpha: 0.2, auraScale: 2.2
  },
  warden: {
    name: 'Warden', category: 'warden',
    radius: dm => 24,
    hp: dm => 120 * dm * dm,
    speed: dm => 55 + dm * 3 + rand(0, 20),
    damage: dm => 10 + Math.floor(dm * 3),
    xp: 45,
    color: '#fa0',
    body: '#ff8c1a', core: '#a35205', glint: '#ffe0ae',
    aura: [255, 120, 20], auraAlpha: 0.22, auraScale: 2.6
  },
  boss: {
    name: 'Boss', category: 'boss',
    radius: dm => 30 + dm * 2,
    hp: dm => 200 * dm * dm,
    speed: dm => 50 + dm * 3 + rand(0, 20),
    damage: dm => 15 + Math.floor(dm * 5),
    xp: dm => 100 + Math.floor(dm * 20),
    color: '#f0f',
    body: '#c030ff', core: '#7a149f', glint: '#e78aff',
    aura: [140, 0, 200], auraAlpha: 0.25, auraScale: 2.2
  }
};

// Wave spawn rotation: only `normal` enemies appear in regular waves, and the
// little-guys pool can mix in the special mobs at higher difficulty. Elites,
// wardens and bosses are timed events spawned directly by the game loop.
const WAVE_POOL = [
  { type: 'runner',    minDiff: 6,  chance: 0.25 },
  { type: 'brute',     minDiff: 12, chance: 0.20 },
  { type: 'swarmling', minDiff: 3,  chance: 0.20 },
  { type: 'caster',    minDiff: 8,  chance: 0.22 },
  { type: 'leecher',   minDiff: 10, chance: 0.18 },
  { type: 'splitter',  minDiff: 5,  chance: 0.16 },
  { type: 'shielded',  minDiff: 6,  chance: 0.12 }
];