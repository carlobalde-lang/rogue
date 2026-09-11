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
  runner: {
    name: 'Runner', category: 'normal',
    radius: dm => 6,
    hp: dm => 3 + dm * 1.5,
    speed: dm => 70 + rand(0, 40) + dm * 3,
    damage: dm => 2 + Math.floor(dm * 0.8),
    xp: 3,
    color: '#f84',
    body: '#ff8c5e', core: '#7a2a14', glint: '#ffc9a8',
    aura: [200, 90, 20], auraAlpha: 0.16, auraScale: 2.2
  },
  brute: {
    name: 'Brute', category: 'normal',
    radius: dm => 14,
    hp: dm => 30 + dm * 8,
    speed: dm => 25 + rand(0, 15) + dm,
    damage: dm => 6 + Math.floor(dm * 1.5),
    xp: 8,
    color: '#8a4',
    body: '#7aae4d', core: '#2d4a14', glint: '#c9e89e',
    aura: [90, 160, 30], auraAlpha: 0.16, auraScale: 2.2
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
// little-guys pool can mix in runners/brutes at higher difficulty. Elites and
// bosses are timed events spawned directly by the game loop.
const WAVE_POOL = [
  { type: 'runner', minDiff: 6,  chance: 0.25 },
  { type: 'brute',  minDiff: 12, chance: 0.20 }
];