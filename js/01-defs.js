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
    baseDmg: 10, baseSpeed: 8, baseRate: 900, baseCount: 1, baseArea: 0,
    upgradeDesc: l => '+2 dmg' + (l > 1 && (l - 1) % 3 === 0 ? ', +1 bolt' : '')
  },
  holyShield: {
    name: 'Holy Shield', icon: '🛡️', color: '#ffa',
    desc: 'Orbiting shields that damage enemies',
    baseDmg: 14, baseSpeed: 0, baseRate: 0, baseCount: 2, baseArea: 50,
    upgradeDesc: l => '+3 dmg, +1 orb'
  },
  lightning: {
    name: 'Lightning', icon: '⚡', color: '#ff0',
    desc: 'Strikes nearest enemy with chain lightning',
    baseDmg: 18, baseSpeed: 0, baseRate: 1200, baseCount: 1, baseArea: 0,
    upgradeDesc: l => '+4 dmg' + (l > 1 && (l - 1) % 2 === 0 ? ', +1 target' : '')
  },
  fireBlast: {
    name: 'Fire Blast', icon: '🔥', color: '#f80',
    desc: 'Periodic explosions around you',
    baseDmg: 7, baseSpeed: 0, baseRate: 2200, baseCount: 1, baseArea: 75,
    upgradeDesc: l => '+1 dmg, +15 area'
  },
  holyCross: {
    name: 'Stellar', icon: '✨', color: '#aef3ff',
    desc: 'Star projectiles that pierce enemies',
    baseDmg: 7, baseSpeed: 5, baseRate: 1100, baseCount: 1, baseArea: 0,
    upgradeDesc: l => '+2 dmg, +1 star'
  },
  chainSaw: {
    name: 'Chain Saw', icon: '🪚', color: '#afc',
    desc: 'Rotating saw: enemies take damage only touching the blades',
    baseDmg: 10, baseSpeed: 0, baseRate: 0, baseCount: 1, baseArea: 30,
    upgradeDesc: l => '+2 dmg, +6 area'
  },
  poisonCloud: {
    name: 'Poison Cloud', icon: '☠️', color: '#6e5',
    desc: 'Leaves clouds around you that poison enemies',
    baseDmg: 7, baseSpeed: 0, baseRate: 1000, baseCount: 1, baseArea: 65,
    upgradeDesc: l => '+2 dmg, +10 area'
  },
  boomerang: {
    name: 'Boomerang', icon: '🪃', color: '#8f8',
    desc: 'Throws boomerangs that return, hitting twice',
    baseDmg: 17, baseSpeed: 6, baseRate: 1400, baseCount: 1, baseArea: 0,
    upgradeDesc: l => '+3 dmg' + (l > 1 && (l - 1) % 3 === 0 ? ', +1 boomerang' : '')
  },
  turret: {
    name: 'Turret', icon: '🗼', color: '#fc8',
    desc: 'Deploys turrets that fire on their own',
    baseDmg: 11, baseSpeed: 0, baseRate: 0, baseCount: 1, baseArea: 0,
    upgradeDesc: l => '+2 dmg, +1 turret'
  },
  voidRift: {
    name: 'Void Rift', icon: '🌀', color: '#8af',
    desc: 'Opens rifts that pull enemies in and drain them',
    baseDmg: 4, baseSpeed: 0, baseRate: 5500, baseCount: 1, baseArea: 90,
    upgradeDesc: l => '+15 area, -15% cooldown'
  },
  frostNova: {
    name: 'Frost Nova', icon: '❄️', color: '#8ff',
    desc: 'Pulses of frost that slow enemies in a ring',
    baseDmg: 5, baseSpeed: 0, baseRate: 2100, baseCount: 1, baseArea: 90,
    upgradeDesc: l => '+2 dmg, +18 area'
  },
  bloodScythe: {
    name: 'Blood Scythe', icon: '🩸', color: '#f66',
    desc: 'Arc slash in front; bonus damage from missing HP',
    baseDmg: 12, baseSpeed: 0, baseRate: 1400, baseCount: 1, baseArea: 115,
    upgradeDesc: l => '+3 dmg, +15 arc range'
  },
  familiar: {
    name: 'Familiar', icon: '🛸', color: '#6ff',
    desc: 'Drone that orbits you and shoots the nearest enemy',
    baseDmg: 6, baseSpeed: 0, baseRate: 620, baseCount: 1, baseArea: 0,
    upgradeDesc: l => '+1 dmg' + (l > 1 && (l - 1) % 3 === 0 ? ', +1 drone' : '')
  },
  whipChain: {
    name: 'Whip Chain', icon: '⛓️', color: '#ffd176',
    desc: 'Lashes a line in your movement direction',
    baseDmg: 11, baseSpeed: 0, baseRate: 900, baseCount: 1, baseArea: 150,
    upgradeDesc: l => '+3 dmg, +15 range'
  },
  mirrorShard: {
    name: 'Mirror Shard', icon: '🪞', color: '#bcd0ff',
    desc: 'Glass shards that bounce between nearby enemies',
    baseDmg: 14, baseSpeed: 9, baseRate: 1300, baseCount: 1, baseArea: 0,
    upgradeDesc: l => '+2 dmg' + (l > 1 && l % 2 === 1 ? ', +1 shard' : '')
  }
};

// --- Passive definitions — add new passives here ---
const PASSIVE_DEFS = {
  maxHp:     { name: 'Vitality',     icon: '❤️', desc: '+20 Max HP', apply: p => { p.maxHp += 20; p.hp = Math.min(p.hp + 20, p.maxHp); } },
  speed:     { name: 'Swift Boots',  icon: '👟', desc: '+12% Move Speed', apply: p => { p.speed *= 1.12; } },
  damage:    { name: 'Power Up',     icon: '💪', desc: '+20% Damage', apply: p => { p.dmgMult *= 1.20; } },
  soulHarvest: { name: 'Soul Harvest', icon: '💀', desc: 'Kills explode, damaging nearby enemies (12% chance, small blast)', apply: p => { p.soulHarvest += 0.12; } },
  cooldown:  { name: 'Haste',        icon: '⏱️', desc: '-15% Cooldown', apply: p => { p.cdMult *= 0.85; } },
  armor:     { name: 'Iron Skin',    icon: '🪖', desc: '+1 Armor (reduces dmg)', apply: p => { p.armor += 1; } },
  magnet:    { name: 'Magnet',       icon: '🧲', desc: '+40% Pickup Range', apply: p => { p.pickupRange *= 1.4; } },
  regen:     { name: 'Regeneration', icon: '💚', desc: '+0.25 HP/s', apply: p => { p.regen += 0.25; } },
  vampirism: { name: 'Vampirism',    icon: '🩸', desc: '+10% of damage dealt becomes HP', apply: p => { p.vamp = (p.vamp || 0) + 0.10; } },
  growth:    { name: 'Growth',       icon: '📈', desc: '+15% Weapon Area / Radius', apply: p => { p.areaMult *= 1.15; } },
  duplicator:{ name: 'Duplicator',   icon: '✌️', desc: '+12% chance shots split into 2 weaker projectiles', apply: p => { p.duplicate = (p.duplicate || 0) + 0.12; } },
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
  overload:  { name: 'Overload',     icon: '🔋', desc: '+25% attack speed on cooldown weapons per stack', apply: p => { p.overload = (p.overload || 0) + 1; } },
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
    deep: '#0B0A14',
    body: '#211B35', core: '#49346B', glint: '#8966B5',
    aura: [197, 165, 245], auraAlpha: 0.15, auraScale: 2.2
  },
swarmling: {
    name: 'Swarmling', category: 'normal',
    radius: dm => 5,
    hp: dm => 1 + dm * 0.5,
    speed: dm => 55 + rand(0, 30) + dm * 3,
    damage: dm => 1 + Math.floor(dm * 0.4),
    xp: 1,
    color: '#f66',
    deep: '#0B0A14',
    body: '#211B35', core: '#49346B', glint: '#8966B5',
    aura: [197, 165, 245], auraAlpha: 0.18, auraScale: 2.6
  },
  runner: {
    name: 'Runner', category: 'normal',
    radius: dm => 7,
    hp: dm => 4 + dm * 2,
    speed: dm => 95 + rand(0, 30) + dm * 4,
    damage: dm => 2 + Math.floor(dm * 0.5),
    xp: 2,
    color: '#fb5',
    deep: '#12090F',
    body: '#32101F', core: '#721D3D', glint: '#C43D58',
    aura: [255, 138, 112], auraAlpha: 0.18, auraScale: 2.3
  },
  brute: {
    name: 'Brute', category: 'normal',
    radius: dm => 16,
    hp: dm => 45 + dm * 14,
    speed: dm => 26 + rand(0, 12) + dm,
    damage: dm => 6 + Math.floor(dm * 1.2),
    xp: 8,
    color: '#4c8',
    deep: '#0B120D',
    body: '#1D3020', core: '#3E6635', glint: '#86B83F',
    aura: [210, 245, 108], auraAlpha: 0.18, auraScale: 2.2
  },
  shielded: {
    name: 'Shielded', category: 'normal',
    radius: dm => 14,
    hp: dm => 40 + dm * 10,
    speed: dm => 30 + rand(0, 15) + dm,
    damage: dm => 5 + Math.floor(dm),
    xp: 6,
    color: '#88f',
    deep: '#071319',
    body: '#12323C', core: '#176879', glint: '#42C7D5',
    aura: [181, 255, 255], auraAlpha: 0.18, auraScale: 2.4,
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
    deep: '#0B120D',
    body: '#1D3020', core: '#3E6635', glint: '#86B83F',
    aura: [210, 245, 108], auraAlpha: 0.16, auraScale: 2.4,
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
    deep: '#0A0614',
    body: '#261044', core: '#5B1F91', glint: '#B83DDB',
    aura: [241, 155, 255], auraAlpha: 0.18, auraScale: 2.4,
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
    deep: '#12090F',
    body: '#32101F', core: '#721D3D', glint: '#C43D58',
    aura: [255, 138, 112], auraAlpha: 0.18, auraScale: 2.4,
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
    deep: '#071319',
    body: '#12323C', core: '#176879', glint: '#42C7D5',
    aura: [181, 255, 255], auraAlpha: 0.18, auraScale: 2.3
  },
  pinewraith: {
    name: 'Pine Wraith', category: 'normal',
    radius: dm => 6,
    hp: dm => 2 + dm * 1,
    speed: dm => 72 + rand(0, 25) + dm * 3,
    damage: dm => 1 + Math.floor(dm * 0.4),
    xp: 2,
    color: '#7ec',
    deep: '#071319',
    body: '#12323C', core: '#176879', glint: '#42C7D5',
    aura: [181, 255, 255], auraAlpha: 0.18, auraScale: 2.6
  },
  dunerunner: {
    name: 'Dune Runner', category: 'normal',
    radius: dm => 7,
    hp: dm => 5 + dm * 2.5,
    speed: dm => 96 + rand(0, 30) + dm * 4,
    damage: dm => 2 + Math.floor(dm * 0.5),
    xp: 2,
    color: '#eb9',
    deep: '#0B0A14',
    body: '#211B35', core: '#49346B', glint: '#8966B5',
    aura: [197, 165, 245], auraAlpha: 0.18, auraScale: 2.3
  },
  canyongolem: {
    name: 'Canyon Golem', category: 'normal',
    radius: dm => 15,
    hp: dm => 52 + dm * 17,
    speed: dm => 25 + rand(0, 12) + dm,
    damage: dm => 6 + Math.floor(dm * 1.2),
    xp: 9,
    color: '#c86',
    deep: '#0B120D',
    body: '#1D3020', core: '#3E6635', glint: '#86B83F',
    aura: [210, 245, 108], auraAlpha: 0.18, auraScale: 2.2
  },
  scorcher: {
    name: 'Scorcher', category: 'normal',
    radius: dm => 9,
    hp: dm => 13 + dm * 4.5,
    speed: dm => 26 + rand(0, 15) + dm,
    damage: dm => 3 + Math.floor(dm),
    xp: 4,
    color: '#f82',
    deep: '#12090F',
    body: '#32101F', core: '#721D3D', glint: '#C43D58',
    aura: [255, 138, 112], auraAlpha: 0.18, auraScale: 2.4,
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
    deep: '#071319',
    body: '#12323C', core: '#176879', glint: '#42C7D5',
    aura: [181, 255, 255], auraAlpha: 0.18, auraScale: 2.4,
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
    deep: '#0B120D',
    body: '#1D3020', core: '#3E6635', glint: '#86B83F',
    aura: [210, 245, 108], auraAlpha: 0.18, auraScale: 2.4,
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
    deep: '#0B120D',
    body: '#1D3020', core: '#3E6635', glint: '#86B83F',
    aura: [210, 245, 108], auraAlpha: 0.18, auraScale: 2.4,
    onHit: (e, dmg) => {
      if (e.hp <= 0 || dmg <= 0) return;
      const heal = Math.min(e.maxHp - e.hp, dmg * 0.35);
      if (heal > 0) { e.hp += heal; spawnParticles(e.x, e.y, '#ee4', 3, 2); }
    }
  },
  elite: {
    name: 'Elite', category: 'elite',
    radius: dm => 18,
    // HP curve: dm^1.5 instead of dm^2. Near-identical early on, but in the
    // late game (where the difficulty term itself grows quadratically) the old
    // formula turned elites into sponges of 100k+ HP far out of reach of the
    // player's roughly-linear weapon scaling.
    hp: dm => 40 + 12 * Math.pow(dm, 1.5),
    speed: dm => 55 + rand(0, 25) + dm * 2,
    // Elite contact damage trimmed ~30% from run-log telemetry: elites were
    // the biggest single source of player damage (43% of all contact damage),
    // with each hit ~40-60 in the late game.
    damage: dm => 6 + Math.floor(dm * 2),
    xp: 25,
    color: '#fa0',
    deep: '#0A0614',
    body: '#261044', core: '#5B1F91', glint: '#B83DDB',
    aura: [241, 155, 255], auraAlpha: 0.2, auraScale: 2.2
  },
  warden: {
    name: 'Warden', category: 'warden',
    radius: dm => 24,
    hp: dm => 90 + 19.5 * Math.pow(dm, 1.5),
    speed: dm => 55 + dm * 3 + rand(0, 20),
    damage: dm => 10 + Math.floor(dm * 3),
    xp: 45,
    color: '#fa0',
    deep: '#08090D',
    body: '#1B1D27', core: '#414354', glint: '#8B91A8',
    aura: [255, 200, 87], auraAlpha: 0.22, auraScale: 2.6
  },
  boss: {
    name: 'Boss', category: 'boss',
    // Radius grows a little with difficulty but is hard-capped: an unbounded
    // linear term made bosses fill most of the screen once the difficulty
    // counter passed ~20-30 (the quadratically rising difficulty term makes
    // dm ≥ 30 normal in the late game).
    radius: dm => 33 + Math.min(dm, 15) * 1.2,
    hp: dm => 150 + 45 * Math.pow(dm, 1.5),
    speed: dm => 50 + dm * 3 + rand(0, 20),
    damage: dm => 15 + Math.floor(dm * 5),
    xp: dm => 100 + Math.floor(dm * 20),
    color: '#f0f',
    deep: '#08090D',
    body: '#1B1D27', core: '#414354', glint: '#8B91A8',
    aura: [255, 200, 87], auraAlpha: 0.25, auraScale: 2.2
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