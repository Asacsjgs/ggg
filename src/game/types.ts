export type GameScreenState = 'title' | 'playing' | 'paused';

export type NationFaction = 'joint' | 'us' | 'ru' | 'cn';

export type PlayerJetType = 'f22' | 'su57' | 'j20';

export type CombatMode = 'ground' | 'takeoff' | 'air';

export type WeaponType =
  | 'manpads'
  | 'heavy_aa'
  | 'patriot'
  | 'thaad'
  | 's400'
  | 'pantsir'
  | 'hq9';

export type FactionOrigin = 'close' | 'us' | 'ru' | 'cn';

export type EnemyType = 'drone' | 'helicopter' | 'fighter' | 'stealth';

export interface NationConfig {
  id: NationFaction;
  nameAr: string;
  shortAr: string;
  flagCode: string;
  accentColor: string;
  defaultJet: PlayerJetType;
  preferredWeapon: WeaponType;
  startingCreditsBonus: number;
  damageMultiplier: number;
  descriptionAr: string;
}

export interface PlayerJetConfig {
  id: PlayerJetType;
  origin: 'us' | 'ru' | 'cn';
  nameAr: string;
  codeName: string;
  cruiseSpeed: number;
  boostSpeed: number;
  turnRate: number;
  cannonDamage: number;
  cannonCooldown: number;
  missileDamage: number;
  missileSpeed: number;
}

export interface UpgradeState {
  closeInLevel: number; // MANPADS + Heavy AA + Phalanx CIWS (1..5)
  usLevel: number; // Patriot + THAAD (1..5)
  ruLevel: number; // S-400 + S-300 + Pantsir-S1 (1..5)
  cnLevel: number; // HQ-9 (1..5)
  radarLevel: number; // Seeker lock speed + stealth detection (1..4)
  forcesLevel: number; // Allied Snipers + Infantry + MLRS Rocket Artillery (1..5)
}

export interface WeaponStats {
  type: WeaponType;
  faction: FactionOrigin;
  shortLabel: string;
  labelAr: string;
  systemTag: string;
  roleAr: string;
  keyHint: string;
  damage: number;
  cooldown: number;
  projectileSpeed: number;
  homing: boolean;
  requiresLock: boolean;
  coldLaunch: boolean;
  turnRate: number;
  blastRadius: number;
  magSize: number;
  reloadTime: number;
}

export interface EnemyArchetypeConfig {
  type: EnemyType;
  labelAr: string;
  codeName: string;
  maxHp: number;
  speed: number;
  minAltitude: number;
  maxAltitude: number;
  rcs: number;
  rewardCredits: number;
  rewardScore: number;
  baseDamage: number;
  attackCooldown: number;
  windupDuration: number;
}

export interface RadarBlip {
  id: number;
  type: EnemyType;
  x: number; // -1..1
  z: number; // -1..1
  altitude: number;
  detectedStrength: number;
  isAttacking: boolean;
  distance: number;
}

export interface LockedTargetInfo {
  id: number;
  type: EnemyType;
  labelAr: string;
  codeName: string;
  distance: number;
  hp: number;
  maxHp: number;
  lockProgress: number; // 0..1 (1 = solid SkyLock!)
  isLocked: boolean;
  isStealthHardLock: boolean;
  isAttacking: boolean;
  screenX: number; // 0..1 viewport %
  screenY: number; // 0..1 viewport %
  onScreen: boolean;
}

export interface HudSnapshot {
  screenState: GameScreenState;
  nation: NationFaction;
  combatMode: CombatMode;
  selectedJet: PlayerJetType;
  airSpeedKts: number;
  airAltitudeM: number;
  mlrsCooldownPct: number;
  outpostHpPct: number;
  alliedUnitsAlive: number;
  enemyGroundAlive: number;
  commanderLevel: number;
  wave: number;
  waveEnemiesRemaining: number;
  waveBannerTimer: number;
  baseHp: number; // Always >= 20% (No Defeat mode)
  maxBaseHp: number;
  credits: number;
  score: number;
  bestScore: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
  activeWeapon: WeaponType;
  weaponMag: Record<WeaponType, number>;
  weaponCooldownPct: Record<WeaponType, number>;
  isZoomed: boolean;
  ciwsActiveBurst: boolean;
  upgrades: UpgradeState;
  radarAngle: number;
  stealthWarning: boolean;
  incomingThreatWarning: boolean;
  lockedTarget: LockedTargetInfo | null;
  radarBlips: RadarBlip[];
  muted: boolean;
  elapsedTime: number;
}

export interface WaveDefinition {
  waveNumber: number;
  titleAr: string;
  spawns: Array<{ type: EnemyType; count: number }>;
  spawnInterval: number;
  speedMultiplier: number;
  maxConcurrentAttackers: number;
}
