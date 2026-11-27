export type GameScreenState = 'title' | 'playing' | 'paused';

export type EmbassyId = 'us_embassy' | 'ru_embassy' | 'cn_embassy';

export type NationId =
  | 'ae'
  | 'sa'
  | 'qa'
  | 'us'
  | 'eu'
  | 'eg'
  | 'sy'
  | 'ir'
  | 'kw'
  | 'bh'
  | 'il'
  | 'cn'
  | 'af';

export type NationArchitecturalTier = 'luxury_modern' | 'historic_imperial';

export type AlliedForceBranch =
  | 'iraq_army'
  | 'pmf'
  | 'ctu'
  | 'presidential_guard'
  | 'commander';

export type SoldierCoverState =
  | 'advancing'
  | 'taking_cover'
  | 'peeking'
  | 'bounding'
  | 'retreating';

export type InfraId = 'power_plant' | 'comms_radar' | 'fuel_depot' | 'coastal_bridge';

export type PlayerJetType = 'stealth_jet' | 'ru_jet';

export type CombatMode = 'ground' | 'tank' | 'convoy' | 'takeoff' | 'air' | 'landing';

export type ConvoyDriveMode = 'manual' | 'chauffeur';

export type SquadOrder = 'follow' | 'advance' | 'attack';

export type TankOrder = 'hold' | 'move' | 'strike';

export type AlliedVehicleKind = 'tank' | 'humvee' | 'mlrs' | 'tahoe';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export type WeatherType = 'clear' | 'fog' | 'rain' | 'storm';

export type SupportOpId =
  | 'reinforce_50'
  | 'swarm_drones'
  | 'paratroopers'
  | 'ew_jam'
  | 'naval_barrage'
  | 'artillery_barrage'
  | 'joint_strike'
  | 'desert_tunnels';

export type WeaponType =
  | 'rifle'
  | 'manpads'
  | 'heavy_aa'
  | 'patriot'
  | 'thaad'
  | 's400'
  | 'hq9'
  | 'laser'
  | 'hypersonic';

export type EnemyType =
  | 'drone'
  | 'helicopter'
  | 'fighter'
  | 'stealth'
  | 'bomber';

export interface EmbassyStatus {
  id: EmbassyId;
  code: string;
  atWar: boolean;
  hp: number;
  maxHp: number;
  palaceHp: number;
  palaceMaxHp: number;
}

export interface NationStatus {
  id: NationId;
  nameAr: string;
  code: string;
  tier: NationArchitecturalTier;
  atWar: boolean;
  allied: boolean;
  wallsIntact: number;
  wallsTotal: number;
  palaceHp: number;
  palaceMaxHp: number;
  militaryPower: number;
  presidentWelcoming: boolean;
}

export interface InfraStatus {
  id: InfraId;
  destroyed: boolean;
  hp: number;
  maxHp: number;
}

export interface PlayerJetConfig {
  id: PlayerJetType;
  labelShort: string;
  codeName: string;
  cruiseSpeed: number;
  turnRate: number;
  cannonDamage: number;
  cannonCooldown: number;
  missileDamage: number;
  missileSpeed: number;
}

export interface UpgradeState {
  closeInLevel: number;
  usLevel: number;
  ruLevel: number;
  cnLevel: number;
  radarLevel: number;
  forcesLevel: number;
}

export interface WeaponStats {
  type: WeaponType;
  shortLabel: string;
  keyHint: string;
  damage: number;
  cooldown: number;
  projectileSpeed: number;
  homing: boolean;
  requiresLock: boolean;
  coldLaunch: boolean;
  isLaser?: boolean;
  isHypersonic?: boolean;
  turnRate: number;
  blastRadius: number;
  magSize: number;
  reloadTime: number;
}

export interface EnemyArchetypeConfig {
  type: EnemyType;
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

export interface SecretSiteStatus {
  id: string;
  code: string;
  position: [number, number, number];
  revealed: boolean;
  destroyed: boolean;
  hp: number;
  maxHp: number;
}

export interface RadarBlip {
  id: number;
  kind: 'aircraft' | 'embassy' | 'soldier' | 'armor' | 'naval' | 'secret' | 'nation';
  x: number; // -1..1 relative to player
  z: number; // -1..1 relative to player
  atWar: boolean;
  detectedStrength: number;
}

export interface LockedTargetInfo {
  id: number;
  codeName: string;
  distance: number;
  hp: number;
  maxHp: number;
  lockProgress: number;
  isLocked: boolean;
  screenX: number;
  screenY: number;
  onScreen: boolean;
}

export interface HudSnapshot {
  screenState: GameScreenState;
  combatMode: CombatMode;
  selectedJet: PlayerJetType;
  squadOrder: SquadOrder;
  tankOrder: TankOrder;
  tankTargetPoint: { x: number; z: number } | null;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  warDeclared: boolean;
  ewJamActive: boolean;
  weaponHolstered: boolean;
  reservesMobilized: boolean;
  convoyDriveMode: ConvoyDriveMode;
  convoyDestination: NationId | 'home';
  convoySpeedKmh: number;
  poetryTrackIndex: number; // 0 = off, 1..4 = track
  insideEmbassy: boolean;
  insideForeignPalace: NationId | null;
  nearForeignChair: NationId | null;
  foreignSeatedNation: NationId | null;
  nearIntelConsole: boolean;
  nearHqDesk: boolean;
  nearConvoyVehicle: boolean;
  hqSeated: boolean;
  listeningActive: boolean;
  truceActive: boolean;
  truceRemainingSec: number;
  hqIntegrityPct: number;
  secretSitesRevealed: number;
  secretSitesTotal: number;
  secretSitesDestroyed: number;
  nations: NationStatus[];
  activePresidentNation: NationId | null;
  nukeReady: boolean;
  nukeCooldownPct: number;
  nukeTargetingActive: boolean;
  nukeTargetPoint: { x: number; z: number } | null;
  sleeperReady: boolean;
  sleeperCooldownPct: number;
  supportCooldownPct: Record<SupportOpId, number>;
  embassies: EmbassyStatus[];
  infrastructure: InfraStatus[];
  airSpeedKts: number;
  airAltitudeM: number;
  alliedSoldiersAlive: number;
  enemySoldiersAlive: number;
  baseHp: number;
  maxBaseHp: number;
  credits: number;
  score: number;
  bestScore: number;
  kills: number;
  activeWeapon: WeaponType;
  weaponMag: Record<WeaponType, number>;
  isZoomed: boolean;
  thermalActive: boolean;
  playerAltitudeM: number;
  tankHp: number;
  maxTankHp: number;
  upgrades: UpgradeState;
  radarAngle: number;
  lockedTarget: LockedTargetInfo | null;
  radarBlips: RadarBlip[];
  muted: boolean;
  elapsedTime: number;
}
