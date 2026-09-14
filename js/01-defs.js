// ============================================================
// DATA DEFINITIONS: WEAPONS, PASSIVES, ENEMIES, SPAWN TABLES
// Add a new weapon / passive / enemy here to extend the game.
// ============================================================

// --- Rarity ladder for level-up choices ---
// Each choice rolls a rarity: rarer versions are noticeably stronger.
//   common    the baseline card
//   rare      +1 level on weapons / new weapons (same strength otherwise)
//   epic      +2 levels, passives take effect ×2
//   legendary +3 levels, passives ×2, golden gradient border
const RARITY_DEFS = {
  common:    { name: 'Common',    label: 'COMMON',    weight: 0.52, bonus: 0, stacks: 1, color: '#9aa0b6' },
  rare:      { name: 'Rare',      label: 'RARE',      weight: 0.27, bonus: 1, stacks: 1, color: '#43a6f5' },
  epic:      { name: 'Epic',      label: 'EPIC',      weight: 0.14, bonus: 2, stacks: 2, color: '#c25bff' },
  legendary: { name: 'Legendary', label: 'LEGENDARY', weight: 0.07, bonus: 3, stacks: 2, color: '#ffd24d' }
};

function rollRarityKey() {
  let r = Math.random();
  for (const key of Object.keys(RARITY_DEFS)) {
    const w = RARITY_DEFS[key].weight;
    if (r < w) return key;
    r -= w;
  }
  return 'common';
}

// --- Weapon definitions — add new weapons here ---
const WEAPON_DEFS = {
  magicBolt: {
    name: 'Magic Bolt', icon: '🔮', color: '#aaf',
    desc: 'Fires homing bolts at nearest enemies',
    baseDmg: 8, baseSpeed: 8, baseRate: 900, baseCount: 1, baseArea: 0,
    upgradeDesc: l => '+2 dmg' + (l > 1 && (l - 1) % 3 === 0 ? ', +1 bolt' : '')
  },
  holyShield: {
    name: 'Holy Shield', icon: '🛡️', color: '#ffa',
    desc: 'Orbiting shields that damage enemies',
    baseDmg: 12, baseSpeed: 0, baseRate: 0, baseCount: 2, baseArea: 50,
    upgradeDesc: l => '+3 dmg, +1 orb'
  },
  lightning: {
    name: 'Lightning', icon: '⚡', color: '#ff0',
    desc: 'Strikes nearest enemy with chain lightning',
    baseDmg: 15, baseSpeed: 0, baseRate: 1200, baseCount: 1, baseArea: 0,
    upgradeDesc: l => '+4 dmg' + (l > 1 && (l - 1) % 2 === 0 ? ', +1 target' : '')
  },
  fireBlast: {
    name: 'Fire Blast', icon: '🔥', color: '#f80',
    desc: 'Periodic explosions around you',
    baseDmg: 6, baseSpeed: 0, baseRate: 2200, baseCount: 1, baseArea: 75,
    upgradeDesc: l => '+1 dmg, +15 area'
  },
  holyCross: {
    name: 'Stellar', icon: '✨', color: '#aef3ff',
    desc: 'Star projectiles that pierce enemies',
    baseDmg: 6, baseSpeed: 5, baseRate: 1100, baseCount: 1, baseArea: 0,
    upgradeDesc: l => '+2 dmg, +1 star'
  },
  chainSaw: {
    name: 'Chain Saw', icon: '🪚', color: '#afc',
    desc: 'Rotating saw: enemies take damage only touching the blades',
    baseDmg: 8, baseSpeed: 0, baseRate: 0, baseCount: 1, baseArea: 30,
    upgradeDesc: l => '+2 dmg, +6 area'
  },
  poisonCloud: {
    name: 'Poison Cloud', icon: '☠️', color: '#6e5',
    desc: 'Leaves clouds around you that poison enemies (DoT)',
    baseDmg: 6, baseSpeed: 0, baseRate: 1000, baseCount: 1, baseArea: 65,
    upgradeDesc: l => '+2 dmg, +10 area'
  },
  boomerang: {
    name: 'Boomerang', icon: '🪃', color: '#8f8',
    desc: 'Throws boomerangs that return, hitting twice',
    baseDmg: 14, baseSpeed: 6, baseRate: 1400, baseCount: 1, baseArea: 0,
    upgradeDesc: l => '+3 dmg' + (l > 1 && (l - 1) % 3 === 0 ? ', +1 boomerang' : '')
  },
  turret: {
    name: 'Turret', icon: '🗼', color: '#fc8',
    desc: 'Deploys turrets that fire on their own',
    baseDmg: 9, baseSpeed: 0, baseRate: 0, baseCount: 1, baseArea: 0,
    upgradeDesc: l => '+2 dmg, +1 turret'
  },
  voidRift: {
    name: 'Void Rift', icon: '🌀', color: '#8af',
    desc: 'Opens rifts that pull enemies in and drain them',
    baseDmg: 3, baseSpeed: 0, baseRate: 5500, baseCount: 1, baseArea: 90,
    upgradeDesc: l => '+15 area, -15% cooldown'
  },
  frostNova: {
    name: 'Frost Nova', icon: '❄️', color: '#8ff',
    desc: 'Pulses of frost that slow enemies in a ring',
    baseDmg: 4, baseSpeed: 0, baseRate: 2100, baseCount: 1, baseArea: 90,
    upgradeDesc: l => '+2 dmg, +18 area'
  },
  bloodScythe: {
    name: 'Blood Scythe', icon: '🩸', color: '#f66',
    desc: 'Arc slash in front; bonus damage from missing HP',
    baseDmg: 10, baseSpeed: 0, baseRate: 1400, baseCount: 1, baseArea: 115,
    upgradeDesc: l => '+3 dmg, +15 arc range'
  },
  familiar: {
    name: 'Familiar', icon: '🛸', color: '#6ff',
    desc: 'Drone that orbits you and shoots the nearest enemy',
    baseDmg: 5, baseSpeed: 0, baseRate: 620, baseCount: 1, baseArea: 0,
    upgradeDesc: l => '+1 dmg' + (l > 1 && (l - 1) % 3 === 0 ? ', +1 drone' : '')
  },
  whipChain: {
    name: 'Whip Chain', icon: '⛓️', color: '#ffd176',
    desc: 'Lashes a line in your movement direction',
    baseDmg: 9, baseSpeed: 0, baseRate: 900, baseCount: 1, baseArea: 150,
    upgradeDesc: l => '+3 dmg, +15 range'
  },
  mirrorShard: {
    name: 'Mirror Shard', icon: '🪞', color: '#bcd0ff',
    desc: 'Glass shards that bounce between nearby enemies',
    baseDmg: 12, baseSpeed: 9, baseRate: 1300, baseCount: 1, baseArea: 0,
    upgradeDesc: l => '+2 dmg' + (l > 1 && l % 2 === 1 ? ', +1 shard' : '')
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
  thorns:    { name: 'Thorns',       icon: '🌵', desc: '+50% of damage taken reflected to attackers', apply: p => { p.thorns = (p.thorns || 0) + 0.50; } },
  glassCannon: { name: 'Glass Cannon', icon: '💥', desc: '+40% Damage, -25% Max HP', apply: p => {
    p.dmgMult *= 1.4;
    p.maxHp = Math.max(30, Math.round(p.maxHp * 0.75));
    p.hp = Math.min(p.hp, p.maxHp);
  } },
  momentum:  { name: 'Momentum',     icon: '🌪️', desc: 'Move straight >1s for +12% dmg & +6% speed per stack', apply: p => { p.momentum = (p.momentum || 0) + 1; } },
  overload:  { name: 'Overload',     icon: '⚡', desc: '25% chance weapons double-fire; next cooldown doubles after a burst', apply: p => { p.overload = (p.overload || 0) + 1; } },
  scavenger: { name: 'Scavenger',    icon: '🕯️', desc: 'Normal enemies may drop Umbra Shards (chance scales with Luck)', apply: p => { p.scavenger = (p.scavenger || 0) + 1; } }
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
  runner: {
    name: 'Runner', category: 'normal',
    radius: dm => 7,
    hp: dm => 4 + dm * 2,
    speed: dm => 95 + rand(0, 30) + dm * 4,
    damage: dm => 2 + Math.floor(dm * 0.5),
    xp: 2,
    color: '#fb5',
    body: '#ffb85e', core: '#8a4a12', glint: '#ffe3c0',
    aura: [220, 140, 40], auraAlpha: 0.18, auraScale: 2.3
  },
  brute: {
    name: 'Brute', category: 'normal',
    radius: dm => 16,
    hp: dm => 45 + dm * 14,
    speed: dm => 26 + rand(0, 12) + dm,
    damage: dm => 6 + Math.floor(dm * 1.2),
    xp: 8,
    color: '#4c8',
    body: '#4cc76e', core: '#1c4a2a', glint: '#b8ffc9',
    aura: [60, 190, 90], auraAlpha: 0.18, auraScale: 2.2
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
    aura: [60, 200, 60], auraAlpha: 0.16, auraScale: 2.4,
    // On death it bursts into two half-HP Shadowlings
    onDeath: e => { spawnSplitlings(e.x, e.y, e.maxHp, e.xp); }
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
    aura: [160, 40, 160], auraAlpha: 0.18, auraScale: 2.4,
    // Heals for a portion of the damage it survives
    onHit: (e, dmg) => {
      if (e.hp <= 0 || dmg <= 0) return;
      const heal = Math.min(e.maxHp - e.hp, dmg * 0.30);
      if (heal > 0) { e.hp += heal; spawnParticles(e.x, e.y, '#7f4', 3, 2); }
    }
  },
  // --- Biome-specific enemies (spawn in their own climate wedges) ---
  frostling: {
    name: 'Frostling', category: 'normal',
    radius: dm => 12,
    hp: dm => 22 + dm * 7,
    speed: dm => 30 + rand(0, 15) + dm,
    damage: dm => 3 + Math.floor(dm * 0.8),
    xp: 4,
    color: '#8ef',
    body: '#5fd8ff', core: '#1d5a7a', glint: '#d6f4ff',
    aura: [80, 170, 255], auraAlpha: 0.18, auraScale: 2.3
  },
  pinewraith: {
    name: 'Pine Wraith', category: 'normal',
    radius: dm => 6,
    hp: dm => 2 + dm * 1,
    speed: dm => 72 + rand(0, 25) + dm * 3,
    damage: dm => 1 + Math.floor(dm * 0.4),
    xp: 2,
    color: '#7ec',
    body: '#4fd0b8', core: '#1c5a4e', glint: '#c7fff0',
    aura: [70, 190, 150], auraAlpha: 0.18, auraScale: 2.6
  },
  dunerunner: {
    name: 'Dune Runner', category: 'normal',
    radius: dm => 7,
    hp: dm => 5 + dm * 2.5,
    speed: dm => 96 + rand(0, 30) + dm * 4,
    damage: dm => 2 + Math.floor(dm * 0.5),
    xp: 2,
    color: '#eb9',
    body: '#e8b46a', core: '#7a4a12', glint: '#ffe6c0',
    aura: [220, 150, 70], auraAlpha: 0.18, auraScale: 2.3
  },
  canyongolem: {
    name: 'Canyon Golem', category: 'normal',
    radius: dm => 15,
    hp: dm => 52 + dm * 17,
    speed: dm => 25 + rand(0, 12) + dm,
    damage: dm => 6 + Math.floor(dm * 1.2),
    xp: 9,
    color: '#c86',
    body: '#c1784a', core: '#5c2c16', glint: '#ffd1a8',
    aura: [180, 100, 50], auraAlpha: 0.18, auraScale: 2.2
  },
  scorcher: {
    name: 'Scorcher', category: 'normal',
    radius: dm => 9,
    hp: dm => 13 + dm * 4.5,
    speed: dm => 26 + rand(0, 15) + dm,
    damage: dm => 3 + Math.floor(dm),
    xp: 4,
    color: '#f82',
    body: '#ff8a3c', core: '#7a2208', glint: '#ffd7a8',
    aura: [240, 110, 30], auraAlpha: 0.18, auraScale: 2.4,
    fireRate: 1900
  },
  riverwisp: {
    name: 'River Wisp', category: 'normal',
    radius: dm => 11,
    hp: dm => 24 + dm * 7,
    speed: dm => 40 + rand(0, 18) + dm,
    damage: dm => 4 + Math.floor(dm * 0.7),
    xp: 5,
    color: '#7de',
    body: '#5fc8de', core: '#175c6a', glint: '#c9f4ff',
    aura: [70, 180, 200], auraAlpha: 0.18, auraScale: 2.4,
    onHit: (e, dmg) => {
      if (e.hp <= 0 || dmg <= 0) return;
      const heal = Math.min(e.maxHp - e.hp, dmg * 0.30);
      if (heal > 0) { e.hp += heal; spawnParticles(e.x, e.y, '#7de', 3, 2); }
    }
  },
  dryadseer: {
    name: 'Dryad Seer', category: 'normal',
    radius: dm => 9,
    hp: dm => 14 + dm * 4.5,
    speed: dm => 25 + rand(0, 15) + dm,
    damage: dm => 3 + Math.floor(dm),
    xp: 4,
    color: '#6e6',
    body: '#5fe06a', core: '#1c5c24', glint: '#c8ffce',
    aura: [80, 210, 80], auraAlpha: 0.18, auraScale: 2.4,
    fireRate: 2000
  },
  boghaunt: {
    name: 'Bog Haunt', category: 'normal',
    radius: dm => 13,
    hp: dm => 30 + dm * 8,
    speed: dm => 34 + rand(0, 18) + dm,
    damage: dm => 4 + Math.floor(dm * 0.85),
    xp: 5,
    color: '#ab9',
    body: '#a8a64e', core: '#4a5411', glint: '#eef2b8',
    aura: [150, 160, 50], auraAlpha: 0.18, auraScale: 2.4,
    onHit: (e, dmg) => {
      if (e.hp <= 0 || dmg <= 0) return;
      const heal = Math.min(e.maxHp - e.hp, dmg * 0.35);
      if (heal > 0) { e.hp += heal; spawnParticles(e.x, e.y, '#ee4', 3, 2); }
    }
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