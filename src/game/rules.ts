import type {
  EnemyArchetypeConfig,
  EnemyType,
  NationConfig,
  NationFaction,
  PlayerJetConfig,
  PlayerJetType,
  UpgradeState,
  WaveDefinition,
  WeaponStats,
  WeaponType,
} from './types';

export const MAX_BASE_HP = 100;
export const MIN_SHIELDED_HP = 20; // Never drops to 0: invincible defense guarantee
export const MAX_OUTPOST_HP = 100;
export const MIN_OUTPOST_HP = 15; // Forward sandbag outposts scar/smoke under enemy artillery & sniper fire, then engineers repair
export const RADAR_MAX_RANGE = 460;

export const NATION_ORDER: NationFaction[] = ['joint', 'us', 'ru', 'cn'];

export const NATION_CONFIGS: Record<NationFaction, NationConfig> = {
  joint: {
    id: 'joint',
    nameAr: 'التحالف المشترك',
    shortAr: 'تحالف',
    flagCode: 'INT',
    accentColor: '#eab308',
    defaultJet: 'f22',
    preferredWeapon: 'manpads',
    startingCreditsBonus: 0,
    damageMultiplier: 1.0,
    descriptionAr: 'قيادة موحدة لجميع المنظومات الأمريكية والروسية والصينية والمطار',
  },
  us: {
    id: 'us',
    nameAr: 'القوات الأمريكية',
    shortAr: 'أمريكا',
    flagCode: 'US',
    accentColor: '#38bdf8',
    defaultJet: 'f22',
    preferredWeapon: 'patriot',
    startingCreditsBonus: 1200,
    damageMultiplier: 1.08,
    descriptionAr: 'أولوية لمنظومات باتريوت وثاد ومقاتلات F-22 Raptor وراجمات HIMARS',
  },
  ru: {
    id: 'ru',
    nameAr: 'القوات الروسية',
    shortAr: 'روسيا',
    flagCode: 'RU',
    accentColor: '#fb923c',
    defaultJet: 'su57',
    preferredWeapon: 's400',
    startingCreditsBonus: 1200,
    damageMultiplier: 1.08,
    descriptionAr: 'أولوية لمنظومات S-400 وبانتسير ومقاتلات Su-57 Felon والراجمات',
  },
  cn: {
    id: 'cn',
    nameAr: 'القوات الصينية',
    shortAr: 'الصين',
    flagCode: 'CN',
    accentColor: '#facc15',
    defaultJet: 'j20',
    preferredWeapon: 'hq9',
    startingCreditsBonus: 1200,
    damageMultiplier: 1.08,
    descriptionAr: 'أولوية لمنظومة HQ-9B الشبحية ومقاتلات J-20 Mighty Dragon',
  },
};

export const PLAYER_JET_ORDER: PlayerJetType[] = ['f22', 'su57', 'j20'];

export const PLAYER_JET_CONFIGS: Record<PlayerJetType, PlayerJetConfig> = {
  f22: {
    id: 'f22',
    origin: 'us',
    nameAr: 'F-22 رابتور (أمريكا)',
    codeName: 'F-22 Raptor',
    cruiseSpeed: 64,
    boostSpeed: 96,
    turnRate: 1.85,
    cannonDamage: 32,
    cannonCooldown: 0.085,
    missileDamage: 165,
    missileSpeed: 215,
  },
  su57: {
    id: 'su57',
    origin: 'ru',
    nameAr: 'Su-57 فيلون (روسيا)',
    codeName: 'Su-57 Felon',
    cruiseSpeed: 62,
    boostSpeed: 94,
    turnRate: 2.05,
    cannonDamage: 36,
    cannonCooldown: 0.095,
    missileDamage: 175,
    missileSpeed: 210,
  },
  j20: {
    id: 'j20',
    origin: 'cn',
    nameAr: 'J-20 التنين (الصين)',
    codeName: 'J-20 Dragon',
    cruiseSpeed: 66,
    boostSpeed: 98,
    turnRate: 1.9,
    cannonDamage: 30,
    cannonCooldown: 0.08,
    missileDamage: 185,
    missileSpeed: 225,
  },
};

export const WEAPON_ORDER: WeaponType[] = [
  'manpads',
  'heavy_aa',
  'patriot',
  'thaad',
  's400',
  'pantsir',
  'hq9',
];

export const ENEMY_CONFIGS: Record<EnemyType, EnemyArchetypeConfig> = {
  drone: {
    type: 'drone',
    labelAr: 'طائرة مسيّرة انتحارية',
    codeName: 'UAV-136',
    maxHp: 45,
    speed: 26,
    minAltitude: 22,
    maxAltitude: 46,
    rcs: 0.72,
    rewardCredits: 95,
    rewardScore: 150,
    baseDamage: 5,
    attackCooldown: 5.8,
    windupDuration: 0.7,
  },
  helicopter: {
    type: 'helicopter',
    labelAr: 'مروحية هجومية',
    codeName: 'Mi-28N',
    maxHp: 90,
    speed: 19,
    minAltitude: 18,
    maxAltitude: 36,
    rcs: 1.0,
    rewardCredits: 150,
    rewardScore: 240,
    baseDamage: 7,
    attackCooldown: 5.6,
    windupDuration: 0.75,
  },
  fighter: {
    type: 'fighter',
    labelAr: 'مقاتلة نفاثة',
    codeName: 'Su-35 / F-16',
    maxHp: 135,
    speed: 44,
    minAltitude: 42,
    maxAltitude: 88,
    rcs: 0.85,
    rewardCredits: 240,
    rewardScore: 420,
    baseDamage: 9,
    attackCooldown: 4.9,
    windupDuration: 0.7,
  },
  stealth: {
    type: 'stealth',
    labelAr: 'مقاتلة شبحية',
    codeName: 'F-35 / J-20',
    maxHp: 180,
    speed: 38,
    minAltitude: 52,
    maxAltitude: 105,
    rcs: 0.2,
    rewardCredits: 400,
    rewardScore: 720,
    baseDamage: 12,
    attackCooldown: 5.0,
    windupDuration: 0.75,
  },
};

export function getWaveDefinition(waveNumber: number): WaveDefinition {
  const w = Math.max(1, waveNumber);
  return {
    waveNumber: w,
    titleAr: `الموجة ${w} — اعتراض الأهداف المعادية`,
    spawns: [
      { type: 'drone', count: 3 + Math.min(5, w) },
      { type: 'helicopter', count: 2 + Math.min(4, Math.floor(w / 2)) },
      { type: 'fighter', count: 2 + Math.min(6, w) },
      { type: 'stealth', count: w >= 2 ? 1 + Math.min(4, Math.floor(w / 2)) : 1 },
    ],
    spawnInterval: Math.max(1.2, 2.5 - w * 0.14),
    speedMultiplier: Math.min(1.45, 0.94 + (w - 1) * 0.08),
    maxConcurrentAttackers: Math.min(4, 2 + Math.floor(w / 2)),
  };
}

export function createInitialUpgrades(): UpgradeState {
  return {
    closeInLevel: 1,
    usLevel: 1,
    ruLevel: 1,
    cnLevel: 1,
    radarLevel: 1,
    forcesLevel: 1,
  };
}

export function getWeaponStats(type: WeaponType, upgrades: UpgradeState): WeaponStats {
  switch (type) {
    case 'manpads': {
      const lv = upgrades.closeInLevel;
      return {
        type: 'manpads',
        faction: 'close',
        shortLabel: 'مانباد',
        labelAr: 'صواريخ كتف مانباد',
        systemTag: 'FIM-92 / Igla-S',
        roleAr: 'إقفال حراري سريع للدفاع القريب',
        keyHint: '1',
        damage: 115 + (lv - 1) * 28,
        cooldown: 0.65,
        projectileSpeed: 155 + (lv - 1) * 14,
        homing: true,
        requiresLock: true,
        coldLaunch: false,
        turnRate: 7.4 + (lv - 1) * 0.6,
        blastRadius: 8.5,
        magSize: 4 + (lv - 1),
        reloadTime: 1.5,
      };
    }
    case 'heavy_aa': {
      const lv = upgrades.closeInLevel;
      return {
        type: 'heavy_aa',
        faction: 'close',
        shortLabel: 'رشاش',
        labelAr: 'رشاش ثقيل 23mm + CIWS',
        systemTag: 'ZU-23 / Phalanx',
        roleAr: 'نيران سريعة ضد المسيّرات والمروحيات',
        keyHint: '2',
        damage: 24 + (lv - 1) * 7,
        cooldown: Math.max(0.065, 0.11 - (lv - 1) * 0.01),
        projectileSpeed: 310,
        homing: false,
        requiresLock: false,
        coldLaunch: false,
        turnRate: 0,
        blastRadius: 3.4,
        magSize: 60,
        reloadTime: 1.2,
      };
    }
    case 'patriot': {
      const lv = upgrades.usLevel;
      return {
        type: 'patriot',
        faction: 'us',
        shortLabel: 'Patriot',
        labelAr: 'باتريوت الأمريكي',
        systemTag: 'MIM-104 PAC-3',
        roleAr: 'اعتراض متوسط وبعيد المدى بدقة عالية',
        keyHint: '3',
        damage: 155 + (lv - 1) * 35,
        cooldown: 0.75,
        projectileSpeed: 185 + (lv - 1) * 16,
        homing: true,
        requiresLock: false,
        coldLaunch: false,
        turnRate: 8.0 + (lv - 1) * 0.65,
        blastRadius: 12,
        magSize: 4 + (lv - 1),
        reloadTime: 1.9,
      };
    }
    case 'thaad': {
      const lv = upgrades.usLevel;
      return {
        type: 'thaad',
        faction: 'us',
        shortLabel: 'THAAD',
        labelAr: 'منظومة ثاد الأمريكية',
        systemTag: 'THAAD Kinetic',
        roleAr: 'اعتراض فرط صوتي ضد الشبحيات والمقاتلات',
        keyHint: '4',
        damage: 240 + (lv - 1) * 48,
        cooldown: 1.0,
        projectileSpeed: 235 + (lv - 1) * 18,
        homing: true,
        requiresLock: false,
        coldLaunch: false,
        turnRate: 9.2 + (lv - 1) * 0.7,
        blastRadius: 14,
        magSize: 2 + Math.floor(lv / 2),
        reloadTime: 2.3,
      };
    }
    case 's400': {
      const lv = upgrades.ruLevel;
      return {
        type: 's400',
        faction: 'ru',
        shortLabel: 'S-400',
        labelAr: 'إس-400 / إس-300 الروسي',
        systemTag: 'S-400 Triumf',
        roleAr: 'إطلاق عمودي بارد + تدمير شامل للأهداف',
        keyHint: '5',
        damage: 225 + (lv - 1) * 45,
        cooldown: 0.9,
        projectileSpeed: 205 + (lv - 1) * 16,
        homing: true,
        requiresLock: false,
        coldLaunch: true,
        turnRate: 8.8 + (lv - 1) * 0.65,
        blastRadius: 15,
        magSize: 4 + (lv - 1),
        reloadTime: 2.1,
      };
    }
    case 'pantsir': {
      const lv = upgrades.ruLevel;
      return {
        type: 'pantsir',
        faction: 'ru',
        shortLabel: 'Pantsir',
        labelAr: 'بانتسير الروسي',
        systemTag: 'Pantsir-S1',
        roleAr: 'صواريخ سريعة + رشاش مزدوج 30mm',
        keyHint: '6',
        damage: 130 + (lv - 1) * 28,
        cooldown: 0.48,
        projectileSpeed: 210 + (lv - 1) * 15,
        homing: true,
        requiresLock: false,
        coldLaunch: false,
        turnRate: 9.5 + (lv - 1) * 0.7,
        blastRadius: 9.5,
        magSize: 6 + (lv - 1),
        reloadTime: 1.7,
      };
    }
    case 'hq9': {
      const lv = upgrades.cnLevel;
      return {
        type: 'hq9',
        faction: 'cn',
        shortLabel: 'HQ-9',
        labelAr: 'منظومة HQ-9 الصينية',
        systemTag: 'HQ-9B SAM',
        roleAr: 'إطلاق عمودي بعيد المدى ومناورة حادة',
        keyHint: '7',
        damage: 195 + (lv - 1) * 40,
        cooldown: 0.8,
        projectileSpeed: 195 + (lv - 1) * 16,
        homing: true,
        requiresLock: false,
        coldLaunch: true,
        turnRate: 8.6 + (lv - 1) * 0.65,
        blastRadius: 13.5,
        magSize: 4 + (lv - 1),
        reloadTime: 2.0,
      };
    }
  }
}

export type UpgradeSlotKey =
  | 'closeInLevel'
  | 'usLevel'
  | 'ruLevel'
  | 'cnLevel'
  | 'radarLevel'
  | 'forcesLevel';

export function getUpgradeMaxLevel(slot: UpgradeSlotKey): number {
  return slot === 'radarLevel' ? 4 : 5;
}

export function getUpgradeCost(slot: UpgradeSlotKey, currentLevel: number): number {
  const baseCosts: Record<UpgradeSlotKey, number> = {
    closeInLevel: 400,
    usLevel: 650,
    ruLevel: 650,
    cnLevel: 600,
    radarLevel: 550,
    forcesLevel: 500,
  };
  return Math.round(baseCosts[slot] * Math.pow(1.42, Math.max(0, currentLevel - 1)));
}

export function canPurchaseUpgrade(
  slot: UpgradeSlotKey,
  upgrades: UpgradeState,
  credits: number,
): boolean {
  const cur = upgrades[slot];
  if (cur >= getUpgradeMaxLevel(slot)) return false;
  return credits >= getUpgradeCost(slot, cur);
}

export function purchaseUpgrade(
  slot: UpgradeSlotKey,
  upgrades: UpgradeState,
  credits: number,
): { upgrades: UpgradeState; credits: number; purchased: boolean } {
  if (!canPurchaseUpgrade(slot, upgrades, credits)) {
    return { upgrades, credits, purchased: false };
  }
  const cost = getUpgradeCost(slot, upgrades[slot]);
  return {
    upgrades: {
      ...upgrades,
      [slot]: upgrades[slot] + 1,
    },
    credits: credits - cost,
    purchased: true,
  };
}

/**
 * Allied Combined Arms Scaling (Snipers, Infantry & MLRS Rocket Artillery)
 */
export function getCombinedForcesStats(forcesLevel: number): {
  sniperDamage: number;
  sniperInterval: number;
  mlrsRocketsPerSalvo: number;
  mlrsCooldown: number;
  mlrsRocketDamage: number;
  engineerRepairRate: number;
} {
  const lv = Math.max(1, forcesLevel);
  return {
    sniperDamage: 34 + (lv - 1) * 12,
    sniperInterval: Math.max(1.05, 1.9 - (lv - 1) * 0.18),
    mlrsRocketsPerSalvo: 6 + (lv - 1) * 2,
    mlrsCooldown: Math.max(7.0, 11.5 - (lv - 1) * 0.9),
    mlrsRocketDamage: 65 + (lv - 1) * 18,
    engineerRepairRate: 2.8 + (lv - 1) * 1.1,
  };
}

/**
 * SkyLock-style IR / Radar Seeker Lock Progression:
 * Locks faster when target is close to crosshair center and with higher radarLevel.
 */
export function advanceSeekerLock(params: {
  currentLock: number;
  hasTargetInCone: boolean;
  ndcDist: number;
  isStealth: boolean;
  canHardLockStealth: boolean;
  radarLevel: number;
  dt: number;
}): number {
  const { currentLock, hasTargetInCone, ndcDist, isStealth, canHardLockStealth, radarLevel, dt } =
    params;
  if (!hasTargetInCone) {
    return Math.max(0, currentLock - dt * 1.9);
  }
  if (isStealth && !canHardLockStealth) {
    // Partial jittery lock on stealth jets until detected clearly
    return Math.min(0.45, currentLock + dt * 0.35);
  }
  const centerBonus = Math.max(0.55, 1.35 - ndcDist * 2.2);
  const lockRate = (1.35 + (radarLevel - 1) * 0.42) * centerBonus;
  return Math.min(1, currentLock + dt * lockRate);
}

export function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

export function computeRadarDetection(params: {
  enemyType: EnemyType;
  distance: number;
  bearingRad: number;
  radarAngleRad: number;
  radarLevel: number;
  previousStrength: number;
  dt: number;
}): { strength: number; canLockHoming: boolean } {
  const { enemyType, distance, bearingRad, radarAngleRad, radarLevel, previousStrength, dt } = params;
  const cfg = ENEMY_CONFIGS[enemyType];

  const effectiveRange = RADAR_MAX_RANGE * (0.9 + radarLevel * 0.12);
  if (distance > effectiveRange) {
    return {
      strength: Math.max(0, previousStrength - dt * 1.2),
      canLockHoming: false,
    };
  }

  const beamHalfWidth = 0.38 + (radarLevel - 1) * 0.16;
  const sweptByBeam = angleDiff(bearingRad, radarAngleRad) <= beamHalfWidth;

  if (enemyType !== 'stealth') {
    const baseStrength = sweptByBeam ? 1.0 : Math.max(0.6, previousStrength - dt * 0.25);
    return {
      strength: Math.min(1, baseStrength),
      canLockHoming: true,
    };
  }

  if (radarLevel >= 3) {
    return {
      strength: sweptByBeam ? 1.0 : Math.max(0.72, previousStrength - dt * 0.2),
      canLockHoming: true,
    };
  }

  const closeRevealDist = radarLevel === 1 ? 85 : 135;
  if (distance <= closeRevealDist) {
    return {
      strength: Math.max(0.85, previousStrength),
      canLockHoming: true,
    };
  }

  if (sweptByBeam) {
    return {
      strength: radarLevel === 1 ? 0.9 : 1.0,
      canLockHoming: radarLevel >= 2,
    };
  }

  const decayRate = radarLevel === 1 ? 0.75 : 0.32;
  const next = Math.max(0, previousStrength - dt * decayRate * (1 / Math.max(cfg.rcs, 0.2)));
  return {
    strength: next,
    canLockHoming: next > 0.4,
  };
}

export function buildWaveSpawnQueue(waveNumber: number): EnemyType[] {
  const def = getWaveDefinition(waveNumber);
  const queue: EnemyType[] = [];
  const pools = def.spawns.map((s) => ({ type: s.type, left: s.count }));
  let added = true;
  while (added) {
    added = false;
    for (const p of pools) {
      if (p.left > 0) {
        queue.push(p.type);
        p.left -= 1;
        added = true;
      }
    }
  }
  return queue;
}

export function applyBaseDamage(currentHp: number, damage: number): {
  nextHp: number;
  isDefeated: boolean;
} {
  const nextHp = Math.max(MIN_SHIELDED_HP, Math.round(currentHp - Math.max(0, damage)));
  return {
    nextHp,
    isDefeated: false,
  };
}

/**
 * Two-Way Forward Outpost / Barrier Damage & Engineer Auto-Repair:
 * Forward bunkers and sandbag lines char and drop in integrity during prolonged combat
 * (never causing game-over defeat), and gradually rebuild via engineers.
 */
export function applyOutpostDamageAndRepair(params: {
  currentHp: number;
  damage: number;
  repairRate: number;
  dt: number;
}): { nextHp: number; isDamagedState: boolean } {
  const afterDmg = Math.max(MIN_OUTPOST_HP, params.currentHp - Math.max(0, params.damage));
  const repaired = Math.min(MAX_OUTPOST_HP, afterDmg + Math.max(0, params.repairRate) * params.dt);
  return {
    nextHp: Math.round(repaired * 10) / 10,
    isDamagedState: repaired < 65,
  };
}

export function checkWaveOutcome(params: {
  spawnQueueLength: number;
  activeEnemiesCount: number;
}): 'playing' | 'wave_clear' {
  if (params.spawnQueueLength === 0 && params.activeEnemiesCount === 0) {
    return 'wave_clear';
  }
  return 'playing';
}

export function calculateAccuracyPercent(shotsFired: number, shotsHit: number): number {
  if (shotsFired <= 0) return 0;
  return Math.min(100, Math.round((shotsHit / shotsFired) * 100));
}
