import { NATION_SPECS, type NationSpec } from './nations';
import type {
  EmbassyId,
  EmbassyStatus,
  EnemyArchetypeConfig,
  EnemyType,
  InfraId,
  InfraStatus,
  NationId,
  PlayerJetConfig,
  PlayerJetType,
  SupportOpId,
  TankOrder,
  TimeOfDay,
  UpgradeState,
  WeaponStats,
  WeaponType,
  WeatherType,
} from './types';

export const MAX_BASE_HP = 100;
export const MIN_SHIELDED_HP = 15;
export const RADAR_MAX_RANGE = 480;
export const NUKE_COOLDOWN_SECONDS = 24;
export const NUKE_BLAST_RADIUS = 95;
export const SLEEPER_CELL_COOLDOWN = 20;
export const REINFORCE_SOLDIER_BATCH = 50;
export const MAX_ALLIED_SOLDIERS = 200;
export const MAX_ENEMY_SOLDIERS = 60;
export const TRAINING_GRADUATION_INTERVAL = 12;
export const EMBASSY_FENCE_HALF_W = 14.5;
export const EMBASSY_FENCE_HALF_D = 11.5;

export const CITY_AREA_SQM = 600_000;
export const WORLD_PLAYABLE_BOUNDS = {
  minX: -1400,
  maxX: 420,
  minZ: -1350,
  maxZ: 1450,
} as const;

export const FORTIFIED_DESERT_REGION = {
  minX: -460,
  maxX: 80,
  minZ: 405,
  maxZ: 745,
} as const;

export const SUPPORT_OP_COOLDOWNS: Record<SupportOpId, number> = {
  reinforce_50: 26,
  swarm_drones: 16,
  paratroopers: 20,
  ew_jam: 18,
  naval_barrage: 15,
  artillery_barrage: 18,
  joint_strike: 14,
  desert_tunnels: 12,
};

export const UNIFIED_FIGHTER_CODE = 'F-IQ22';
export const DESERT_TUNNEL_MAX_RANGE = 2000;

/**
 * Huge Fortified Desert Mega-Base located well outside city neighborhoods in the Southern Desert.
 */
export const FORTIFIED_TRAINING_BASE = {
  centerX: -220,
  centerZ: 560,
  minX: -330,
  maxX: -110,
  minZ: 470,
  maxZ: 650,
  gateMinX: -234,
  gateMaxX: -206,
  gateZ: 470,
  apronCenterX: -220,
  apronCenterZ: 622,
  apronWidth: 120,
  apronDepth: 22,
  parkedJets: [
    [-256, 0.04, 622] as [number, number, number],
    [-184, 0.04, 622] as [number, number, number],
  ],
  trainingCommanderPos: [-220, 0.04, 535] as [number, number, number],
} as const;

export const DESERT_TUNNEL_SPECS: ReadonlyArray<{
  id: string;
  code: string;
  position: [number, number, number];
}> = [
  { id: 'tunnel_west', code: 'SILO-01', position: [-286, 0.04, 565] },
  { id: 'tunnel_east', code: 'SILO-02', position: [-154, 0.04, 565] },
  { id: 'tunnel_south', code: 'SILO-03', position: [-220, 0.04, 608] },
];

export const ALLIED_TANK_STATIONS: ReadonlyArray<[number, number, number]> = [
  [-32, 0.04, -18],
  [32, 0.04, -18],
  // Desert Base Reserve Tank Ranks (remain stationary until Reserve Mobilization button is pressed)
  [-282, 0.04, 512],
  [-252, 0.04, 512],
  [-188, 0.04, 512],
  [-158, 0.04, 512],
];

export const ALLIED_HUMVEE_STATIONS: ReadonlyArray<[number, number, number]> = [
  [-15, 0.04, -22],
  [15, 0.04, -22],
  // Desert Base Reserve Humvees
  [-266, 0.04, 494],
  [-174, 0.04, 494],
];

export const ALLIED_MLRS_STATIONS: ReadonlyArray<[number, number, number]> = [
  [-296, 0.04, 536],
  [-144, 0.04, 536],
];

export const CONVOY_ESCORT_STAGING = {
  leadHumvees: [
    [-10.5, 0.04, -18.0] as [number, number, number],
    [10.5, 0.04, -18.0] as [number, number, number],
    [0, 0.04, -26.0] as [number, number, number],
  ],
  tahoes: [
    [9.5, 0.04, -1.5] as [number, number, number], // Commander's lead Tahoe
    [-9.5, 0.04, -1.5] as [number, number, number],
    [10.5, 0.04, -9.5] as [number, number, number],
    [-10.5, 0.04, -9.5] as [number, number, number],
    [9.5, 0.04, 6.0] as [number, number, number],
  ],
} as const;

export const STRATEGIC_SAM_POSITIONS = {
  patriot: [-38, 0.04, -28] as [number, number, number],
  thaad: [-68, 0.04, -28] as [number, number, number],
  s400: [56, 0.04, -28] as [number, number, number],
  hq9: [38, 0.04, -28] as [number, number, number],
  ciws: [
    [-16, 0.04, -14] as [number, number, number],
    [16, 0.04, -14] as [number, number, number],
  ],
  hqAirDefense: [
    [-26, 0.04, 24] as [number, number, number],
    [26, 0.04, 24] as [number, number, number],
  ],
} as const;

export const FRONTLINE_SOLDIER_SLOTS: ReadonlyArray<{
  pos: [number, number, number];
  role: 'sniper' | 'infantry';
  branch: 'iraq_army' | 'pmf' | 'ctu' | 'presidential_guard';
  carryFlag?: boolean;
}> = [
  { pos: [-6.2, 0.04, 9.4], role: 'infantry', branch: 'presidential_guard', carryFlag: true },
  { pos: [6.2, 0.04, 9.4], role: 'infantry', branch: 'presidential_guard', carryFlag: true },
  { pos: [-15.2, 0.04, 9.8], role: 'infantry', branch: 'presidential_guard' },
  { pos: [15.2, 0.04, 9.8], role: 'infantry', branch: 'presidential_guard' },
  { pos: [-10.5, 0.04, -10.0], role: 'infantry', branch: 'ctu', carryFlag: true },
  { pos: [10.5, 0.04, -10.0], role: 'infantry', branch: 'pmf', carryFlag: true },
  { pos: [-11.8, 0.04, -23.0], role: 'sniper', branch: 'ctu' },
  { pos: [11.8, 0.04, -23.0], role: 'sniper', branch: 'iraq_army' },
  { pos: [-28.5, 0.04, -21.0], role: 'infantry', branch: 'iraq_army', carryFlag: true },
  { pos: [28.5, 0.04, -21.0], role: 'infantry', branch: 'pmf', carryFlag: true },
  { pos: [-43.0, 0.04, -15.0], role: 'sniper', branch: 'ctu' },
  { pos: [43.0, 0.04, -15.0], role: 'sniper', branch: 'iraq_army' },
  { pos: [-10.5, 0.04, -34.0], role: 'infantry', branch: 'iraq_army' },
  { pos: [10.5, 0.04, -34.0], role: 'infantry', branch: 'pmf' },
  { pos: [-45.0, 0.04, -30.0], role: 'infantry', branch: 'ctu' },
  { pos: [45.0, 0.04, -30.0], role: 'infantry', branch: 'iraq_army' },
  { pos: [-18.0, 0.04, 42.0], role: 'infantry', branch: 'presidential_guard' },
  { pos: [18.0, 0.04, 42.0], role: 'infantry', branch: 'presidential_guard' },
];

export const OUR_HQ_COMPLEX = {
  minX: -13.5,
  maxX: 13.5,
  intelMinZ: 11.5,
  intelMaxZ: 26.0,
  hqMinZ: 26.0,
  hqMaxZ: 37.5,
  frontDoorHalfW: 3.8,
  innerDoorHalfW: 2.1,
  chairPos: [0, 0.04, 33.6] as [number, number, number],
  deskPos: [0, 0.04, 31.6] as [number, number, number],
  mapTablePos: [0, 0.04, 19.6] as [number, number, number],
  roofY: 6.55,
  maxIntegrity: 100,
} as const;

export const SECRET_SITE_SPECS: ReadonlyArray<{
  id: string;
  code: string;
  position: [number, number, number];
  maxHp: number;
}> = [
  { id: 'secret_nw', code: 'ISIS-01', position: [-236, 0.04, -338], maxHp: 520 },
  { id: 'secret_ne', code: 'ISIS-02', position: [92, 0.04, -338], maxHp: 520 },
  { id: 'secret_fw', code: 'ISIS-03', position: [-332, 0.04, -178], maxHp: 560 },
  { id: 'secret_mt', code: 'ISIS-04', position: [-168, 0.04, -368], maxHp: 600 },
];

/**
 * Tactical sandbag/Hesco cover barriers across city boulevards & perimeters for soldier cover/peeking/bounding.
 */
export const COVER_BARRIER_SPECS: ReadonlyArray<{
  id: number;
  x: number;
  z: number;
  rotY: number;
  width: number;
}> = [
  { id: 0, x: -9.5, z: -11, rotY: 0, width: 4.2 },
  { id: 1, x: 9.5, z: -11, rotY: 0, width: 4.2 },
  { id: 2, x: -12, z: -32, rotY: 0.15, width: 4.4 },
  { id: 3, x: 12, z: -32, rotY: -0.15, width: 4.4 },
  { id: 4, x: -46, z: -32, rotY: 0.25, width: 4.2 },
  { id: 5, x: 46, z: -32, rotY: -0.25, width: 4.2 },
  { id: 6, x: -16, z: -64, rotY: 0, width: 4.5 },
  { id: 7, x: 16, z: -64, rotY: 0, width: 4.5 },
  { id: 8, x: -58, z: -68, rotY: 0.2, width: 4.2 },
  { id: 9, x: 58, z: -68, rotY: -0.2, width: 4.2 },
  { id: 10, x: -115, z: -84, rotY: Math.PI / 2, width: 4.2 },
  { id: 11, x: -175, z: -96, rotY: 0, width: 4.4 },
  { id: 12, x: -195, z: -48, rotY: 0.2, width: 4.2 },
  { id: 13, x: -245, z: -140, rotY: 0, width: 4.4 },
  { id: 14, x: -12, z: -118, rotY: 0, width: 4.5 },
  { id: 15, x: 12, z: -118, rotY: 0, width: 4.5 },
  { id: 16, x: -18, z: 46, rotY: 0.3, width: 4.2 },
  { id: 17, x: 18, z: 46, rotY: -0.3, width: 4.2 },
  // Desert Base tactical drill cover barriers
  { id: 18, x: -234, z: 530, rotY: 0, width: 5.0 },
  { id: 19, x: -206, z: 530, rotY: 0, width: 5.0 },
  { id: 20, x: -220, z: 515, rotY: 0, width: 5.5 },
  // Northern city defensive perimeter sandbag/Hesco emplacements (replacing scattered rocks)
  { id: 21, x: -340, z: -415, rotY: 0, width: 5.8 },
  { id: 22, x: -250, z: -418, rotY: 0.08, width: 5.8 },
  { id: 23, x: -140, z: -418, rotY: -0.06, width: 5.8 },
  { id: 24, x: -40, z: -415, rotY: 0.05, width: 5.8 },
  { id: 25, x: 60, z: -418, rotY: -0.08, width: 5.8 },
  { id: 26, x: -190, z: -422, rotY: 0, width: 6.2 },
];

/**
 * Urban ISIS stronghold blocks & covert underground tunnel exits inside outer city districts.
 */
export const ISIS_BLOCK_SPECS: ReadonlyArray<{
  id: string;
  position: [number, number, number];
  maxHp: number;
}> = [
  { id: 'isis_blk_1', position: [-188, 0.04, -138], maxHp: 460 },
  { id: 'isis_blk_2', position: [-282, 0.04, -182], maxHp: 480 },
  { id: 'isis_blk_3', position: [-186, 0.04, 86], maxHp: 460 },
  { id: 'isis_blk_4', position: [76, 0.04, -124], maxHp: 460 },
];

export const HUMVEE_CONFIG = {
  maxHp: 220,
  speed: 11.5,
  damage: 24,
  cooldown: 0.22,
  blastRadius: 2.2,
  collisionRadius: 2.2,
} as const;

export const ALLIED_MLRS_CONFIG = {
  maxHp: 310,
  speed: 6.0,
  rocketDamage: 165,
  rocketBlastRadius: 13,
  salvoCount: 6,
  cooldown: 4.8,
  collisionRadius: 3.4,
} as const;

export const CARRIER_OPERATIONS = {
  deckY: 9.2,
  catapultStart: [224, 9.2, -46] as [number, number, number],
  catapultEnd: [222, 9.2, -132] as [number, number, number],
  touchdownPoint: [224, 9.2, -124] as [number, number, number],
  approachEntry: [232, 34.0, 26] as [number, number, number],
  launchHeadingRad: 0.14,
} as const;

export const PLAYER_TANK_CONFIG = {
  maxHp: 600,
  speed: 19,
  turnRate: 1.85,
  turretTurnRate: 3.2,
  cannonDamage: 320,
  cannonCooldown: 1.25,
  cannonSpeed: 190,
  cannonBlastRadius: 12,
  coaxDamage: 26,
  coaxCooldown: 0.1,
} as const;

export const CLIMBABLE_WATCHTOWERS: Array<{
  id: 'west_tower' | 'east_tower';
  centerX: number;
  halfW: number;
  rampStartZ: number;
  rampEndZ: number;
  deckEndZ: number;
  deckHeight: number;
}> = [
  {
    id: 'west_tower',
    centerX: -22,
    halfW: 3.2,
    rampStartZ: -14.5,
    rampEndZ: -5.5,
    deckEndZ: 0.5,
    deckHeight: 6.2,
  },
  {
    id: 'east_tower',
    centerX: 22,
    halfW: 3.2,
    rampStartZ: -14.5,
    rampEndZ: -5.5,
    deckEndZ: 0.5,
    deckHeight: 6.2,
  },
];

export const TRAINING_CENTER_SPECS: Array<{
  id: 'desert_command' | 'desert_range';
  position: [number, number, number];
  musterPoint: [number, number, number];
}> = [
  { id: 'desert_command', position: [-220, 0, 560], musterPoint: [-220, 0.04, 495] },
  { id: 'desert_range', position: [-270, 0, 585], musterPoint: [-250, 0.04, 515] },
];

export const EMBASSY_SPECS: Array<{
  id: EmbassyId;
  code: string;
  position: [number, number, number];
  palacePosition: [number, number, number];
  accentHex: number;
  maxHp: number;
  palaceMaxHp: number;
}> = [
  {
    id: 'us_embassy',
    code: 'US',
    position: [-56, 0, -96],
    palacePosition: [-86, 0, -104],
    accentHex: 0x2563eb,
    maxHp: 850,
    palaceMaxHp: 1100,
  },
  {
    id: 'ru_embassy',
    code: 'RU',
    position: [0, 0, -148],
    palacePosition: [0, 0, -184],
    accentHex: 0xb91c1c,
    maxHp: 850,
    palaceMaxHp: 1100,
  },
  {
    id: 'cn_embassy',
    code: 'CN',
    position: [56, 0, -96],
    palacePosition: [86, 0, -104],
    accentHex: 0xd97706,
    maxHp: 850,
    palaceMaxHp: 1100,
  },
];

export const INFRA_SPECS: Array<{
  id: InfraId;
  position: [number, number, number];
  radius: number;
  maxHp: number;
}> = [
  { id: 'power_plant', position: [-102, 0, -56], radius: 14, maxHp: 320 },
  { id: 'comms_radar', position: [74, 0, -166], radius: 11, maxHp: 260 },
  { id: 'fuel_depot', position: [-104, 0, -152], radius: 13, maxHp: 280 },
  { id: 'coastal_bridge', position: [142, 0, -72], radius: 15, maxHp: 400 },
];

export const DEFAULT_TANK_ORDER: TankOrder = 'hold';

export interface CityBuildingSpec {
  id: number;
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  tone: number;
}

export interface ResidentialHouseSpec {
  id: number;
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  tone: number;
  roofTone: number;
}

export interface MosqueSpec {
  id: number;
  x: number;
  z: number;
  w: number;
  d: number;
}

export const CITY_BUILDING_SPECS: ReadonlyArray<CityBuildingSpec> = [
  { id: 0, x: -24, z: -44, w: 12, h: 24, d: 12, tone: 0xd6d1c8 },
  { id: 1, x: -41, z: -48, w: 12, h: 34, d: 12, tone: 0xbec7d1 },
  { id: 2, x: 24, z: -44, w: 12, h: 28, d: 12, tone: 0xd1cac0 },
  { id: 3, x: 41, z: -48, w: 12, h: 38, d: 12, tone: 0xb7c2ce },
  { id: 4, x: -24, z: -98, w: 13, h: 40, d: 13, tone: 0xb0bcc8 },
  { id: 5, x: -39, z: -108, w: 11, h: 29, d: 11, tone: 0xd4cbc0 },
  { id: 6, x: 24, z: -98, w: 13, h: 44, d: 13, tone: 0xb4c0cd },
  { id: 7, x: 39, z: -108, w: 11, h: 31, d: 11, tone: 0xcfc5b6 },
  { id: 8, x: -76, z: -42, w: 14, h: 35, d: 14, tone: 0xaab6c2 },
  { id: 9, x: -78, z: -146, w: 14, h: 33, d: 14, tone: 0xc6beb0 },
  { id: 10, x: -28, z: -148, w: 13, h: 31, d: 13, tone: 0xbcc6d1 },
  { id: 11, x: 28, z: -148, w: 13, h: 32, d: 13, tone: 0xcac0b2 },
  { id: 12, x: -42, z: -182, w: 15, h: 42, d: 15, tone: 0xa4b1bd },
  { id: 13, x: 42, z: -182, w: 15, h: 44, d: 15, tone: 0xb2bdc8 },
  { id: 14, x: 100, z: -44, w: 13, h: 35, d: 13, tone: 0xb2c0ce },
  { id: 15, x: 100, z: -146, w: 13, h: 32, d: 13, tone: 0xb8c1cb },
  { id: 16, x: -138, z: -46, w: 14, h: 32, d: 14, tone: 0xb0bac4 },
  { id: 17, x: 78, z: -44, w: 12, h: 25, d: 12, tone: 0xc1cad4 },
  // Expanded skyline districts across 600,000 m² urban grid (clear of avenues x=0,±56,±118,-190,-280,-370 & z=6,-24,-72,-124,-184,-260,-340,86,170)
  { id: 18, x: -156, z: -96, w: 14, h: 38, d: 14, tone: 0xc4ccd4 },
  { id: 19, x: -156, z: -152, w: 14, h: 44, d: 14, tone: 0xaab8c4 },
  { id: 20, x: -218, z: -46, w: 14, h: 36, d: 14, tone: 0xc9c2b5 },
  { id: 21, x: -218, z: -98, w: 15, h: 46, d: 15, tone: 0xb3c0cc },
  { id: 22, x: -218, z: -154, w: 14, h: 39, d: 14, tone: 0xc2b8a8 },
  { id: 23, x: -252, z: -46, w: 13, h: 30, d: 13, tone: 0xbac4cf },
  { id: 24, x: -252, z: -98, w: 13, h: 34, d: 13, tone: 0xd2c9bc },
  { id: 25, x: -308, z: -46, w: 14, h: 33, d: 14, tone: 0xa9b6c2 },
  { id: 26, x: -308, z: -102, w: 15, h: 41, d: 15, tone: 0xc8c0b4 },
  { id: 27, x: -308, z: -156, w: 14, h: 37, d: 14, tone: 0xb9c3ce },
  { id: 28, x: -156, z: -222, w: 14, h: 40, d: 14, tone: 0xb2bec9 },
  { id: 29, x: -86, z: -222, w: 14, h: 42, d: 14, tone: 0xc8c0b2 },
  { id: 30, x: -28, z: -222, w: 15, h: 48, d: 15, tone: 0xa7b4c2 },
  { id: 31, x: 28, z: -222, w: 15, h: 46, d: 15, tone: 0xb4c0cb },
  { id: 32, x: 86, z: -222, w: 14, h: 36, d: 14, tone: 0xcdc4b6 },
  { id: 33, x: -218, z: -222, w: 14, h: 35, d: 14, tone: 0xbfc8d2 },
  { id: 34, x: -86, z: -302, w: 14, h: 34, d: 14, tone: 0xb5c1cc },
  { id: 35, x: -28, z: -302, w: 15, h: 38, d: 15, tone: 0xc9c1b4 },
  { id: 36, x: 28, z: -302, w: 15, h: 36, d: 15, tone: 0xacb8c5 },
  { id: 37, x: 86, z: -302, w: 14, h: 31, d: 14, tone: 0xc4bdb0 },
  { id: 38, x: -156, z: 48, w: 14, h: 32, d: 14, tone: 0xb9c4ce },
  { id: 39, x: -218, z: 48, w: 14, h: 34, d: 14, tone: 0xcbc2b6 },
  { id: 40, x: 28, z: 48, w: 13, h: 28, d: 13, tone: 0xb4c0cb },
  { id: 41, x: 88, z: 48, w: 13, h: 30, d: 13, tone: 0xc7bfb2 },
  { id: 42, x: -28, z: 128, w: 14, h: 35, d: 14, tone: 0xadb9c6 },
  { id: 43, x: 28, z: 128, w: 14, h: 33, d: 14, tone: 0xcbc3b6 },
  { id: 44, x: -88, z: 128, w: 14, h: 31, d: 14, tone: 0xb8c3ce },
  { id: 45, x: 88, z: 128, w: 14, h: 29, d: 14, tone: 0xc4bcb0 },
  { id: 46, x: -156, z: 128, w: 14, h: 34, d: 14, tone: 0xb0bcc8 },
  { id: 47, x: -218, z: 128, w: 14, h: 32, d: 14, tone: 0xcac1b4 },
];

export const MOSQUE_SPECS: ReadonlyArray<MosqueSpec> = [
  { id: 0, x: -28, z: 46, w: 16, d: 16 },
  { id: 1, x: 32, z: -2, w: 16, d: 16 },
  { id: 2, x: -148, z: -12, w: 16, d: 16 },
  { id: 3, x: -236, z: -12, w: 16, d: 16 },
  { id: 4, x: -148, z: 108, w: 16, d: 16 },
  { id: 5, x: 86, z: 108, w: 16, d: 16 },
  { id: 6, x: -148, z: -292, w: 16, d: 16 },
  { id: 7, x: -242, z: 212, w: 16, d: 16 },
];

// Deterministic Residential Neighborhood Blocks across 600,000 m² City (clear of roads, mosques, skyscrapers & training base)
export const RESIDENTIAL_HOUSE_SPECS: ReadonlyArray<ResidentialHouseSpec> = (() => {
  const houses: ResidentialHouseSpec[] = [];
  const wallTones = [0xe4dccf, 0xd9cebc, 0xe8dfd1, 0xcfc4b2, 0xdcd4c6, 0xe0d6c4];
  const roofTones = [0x9f7f64, 0x8b6e56, 0xa8927a, 0x7b6958];

  const blocks: Array<{ x0: number; x1: number; z0: number; z1: number; cols: number; rows: number }> = [
    // East & Central-South residential quarters
    { x0: 14, x1: 44, z0: 98, z1: 152, cols: 3, rows: 3 },
    { x0: 70, x1: 104, z0: 180, z1: 242, cols: 3, rows: 3 },
    { x0: -44, x1: -14, z0: 180, z1: 242, cols: 3, rows: 3 },
    { x0: 14, x1: 44, z0: 180, z1: 242, cols: 3, rows: 3 },
    { x0: -104, x1: -70, z0: 180, z1: 242, cols: 3, rows: 3 },
    // Western neighborhoods
    { x0: -174, x1: -136, z0: 16, z1: 68, cols: 3, rows: 3 },
    { x0: -264, x1: -206, z0: 16, z1: 68, cols: 4, rows: 3 },
    { x0: -354, x1: -296, z0: 16, z1: 68, cols: 4, rows: 3 },
    { x0: -354, x1: -296, z0: -60, z1: -36, cols: 4, rows: 2 },
    { x0: -354, x1: -296, z0: -112, z1: -84, cols: 4, rows: 2 },
    { x0: -264, x1: -206, z0: 98, z1: 152, cols: 4, rows: 3 },
    { x0: -354, x1: -296, z0: 98, z1: 152, cols: 4, rows: 3 },
    { x0: -174, x1: -136, z0: 180, z1: 242, cols: 3, rows: 3 },
    { x0: -354, x1: -296, z0: 180, z1: 242, cols: 4, rows: 3 },
    // Far Southern & Far Northern residential suburbs
    { x0: -104, x1: -14, z0: 274, z1: 332, cols: 5, rows: 3 },
    { x0: 14, x1: 104, z0: 274, z1: 332, cols: 5, rows: 3 },
    { x0: -264, x1: -136, z0: 274, z1: 332, cols: 5, rows: 3 },
    { x0: -264, x1: -206, z0: -242, z1: -198, cols: 4, rows: 2 },
    { x0: -354, x1: -296, z0: -242, z1: -198, cols: 4, rows: 2 },
    { x0: -264, x1: -206, z0: -322, z1: -278, cols: 4, rows: 2 },
  ];

  let idx = 0;
  for (const blk of blocks) {
    for (let r = 0; r < blk.rows; r++) {
      for (let c = 0; c < blk.cols; c++) {
        const tx = blk.cols === 1 ? 0.5 : c / (blk.cols - 1);
        const tz = blk.rows === 1 ? 0.5 : r / (blk.rows - 1);
        const x = Math.round(blk.x0 + (blk.x1 - blk.x0) * tx);
        const z = Math.round(blk.z0 + (blk.z1 - blk.z0) * tz);
        const w = 7.4 + (idx % 3) * 0.8;
        const d = 6.8 + ((idx + 1) % 3) * 0.8;
        const h = 4.6 + (idx % 4) * 1.45;
        houses.push({
          id: idx,
          x,
          z,
          w,
          h,
          d,
          tone: wallTones[idx % wallTones.length],
          roofTone: roofTones[idx % roofTones.length],
        });
        idx++;
      }
    }
  }
  return houses;
})();

export interface ObstacleBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  kind:
    | 'skyscraper'
    | 'house'
    | 'mosque'
    | 'embassy'
    | 'palace'
    | 'infra'
    | 'our_wall'
    | 'training_wall'
    | 'nation_wall'
    | 'palace_wall';
}

export interface NationWallSegmentSpec {
  id: string;
  nationId: NationId;
  side: 'north' | 'south' | 'west' | 'east';
  cx: number;
  cz: number;
  width: number;
  depth: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxHp: number;
}

export function getNationGateSide(spec: NationSpec): 'north' | 'south' | 'east' {
  const dx = spec.borderPos[0] - spec.palacePos[0];
  const dz = spec.borderPos[2] - spec.palacePos[2];
  if (Math.abs(dx) > Math.abs(dz) && dx > 0) return 'east';
  if (dz < 0) return 'north';
  return 'south';
}

/**
 * Generates 16 tall destructible fortified border wall segments around each of the 13 nations
 * (4 per side, leaving a single 26m open checkpoint highway facing that nation's border gate).
 */
export function buildNationPerimeterWallSpecs(): NationWallSegmentSpec[] {
  const halfW = 100;
  const halfD = 90;
  const thick = 2.6;
  const gateHalfGap = 13;
  const list: NationWallSegmentSpec[] = [];

  for (const spec of NATION_SPECS) {
    const [px, , pz] = spec.palacePos;
    const gateSide = getNationGateSide(spec);
    const segHp = Math.round(320 * spec.militaryPower);

    const pushSeg = (
      side: 'north' | 'south' | 'west' | 'east',
      idx: number,
      minX: number,
      maxX: number,
      minZ: number,
      maxZ: number,
    ) => {
      list.push({
        id: `${spec.id}_${side}_${idx}`,
        nationId: spec.id,
        side,
        cx: (minX + maxX) * 0.5,
        cz: (minZ + maxZ) * 0.5,
        width: maxX - minX,
        depth: maxZ - minZ,
        minX,
        maxX,
        minZ,
        maxZ,
        maxHp: segHp,
      });
    };

    // North (z = pz - 90) & South (z = pz + 90)
    for (const side of ['north', 'south'] as const) {
      const zMid = side === 'north' ? pz - halfD : pz + halfD;
      const minZ = zMid - thick * 0.5;
      const maxZ = zMid + thick * 0.5;
      if (gateSide === side) {
        const span = halfW - gateHalfGap; // 87m -> 2 segments each side (43.5m)
        const halfSpan = span * 0.5;
        pushSeg(side, 0, px - halfW, px - halfW + halfSpan, minZ, maxZ);
        pushSeg(side, 1, px - halfW + halfSpan, px - gateHalfGap, minZ, maxZ);
        pushSeg(side, 2, px + gateHalfGap, px + gateHalfGap + halfSpan, minZ, maxZ);
        pushSeg(side, 3, px + gateHalfGap + halfSpan, px + halfW, minZ, maxZ);
      } else {
        const segW = (halfW * 2) / 4; // 50m
        for (let i = 0; i < 4; i++) {
          pushSeg(side, i, px - halfW + i * segW, px - halfW + (i + 1) * segW, minZ, maxZ);
        }
      }
    }

    // West (x = px - 100) & East (x = px + 100)
    for (const side of ['west', 'east'] as const) {
      const xMid = side === 'west' ? px - halfW : px + halfW;
      const minX = xMid - thick * 0.5;
      const maxX = xMid + thick * 0.5;
      if (gateSide === side) {
        const span = halfD - gateHalfGap; // 77m -> 2 segments each side (38.5m)
        const halfSpan = span * 0.5;
        pushSeg(side, 0, minX, maxX, pz - halfD, pz - halfD + halfSpan);
        pushSeg(side, 1, minX, maxX, pz - halfD + halfSpan, pz - gateHalfGap);
        pushSeg(side, 2, minX, maxX, pz + gateHalfGap, pz + gateHalfGap + halfSpan);
        pushSeg(side, 3, minX, maxX, pz + gateHalfGap + halfSpan, pz + halfD);
      } else {
        const segD = (halfD * 2) / 4; // 45m
        for (let i = 0; i < 4; i++) {
          pushSeg(side, i, minX, maxX, pz - halfD + i * segD, pz - halfD + (i + 1) * segD);
        }
      }
    }
  }

  return list;
}

export const NATION_WALL_SPECS: ReadonlyArray<NationWallSegmentSpec> = buildNationPerimeterWallSpecs();

export function getNationMilitaryBasePos(spec: NationSpec): [number, number, number] {
  const [px, , pz] = spec.palacePos;
  const eastApproach = Math.abs(spec.welcomeGatePos[0] - px) > 20;
  if (eastApproach) {
    return [px - 46, 0.04, pz - 16];
  }
  const sideX = spec.samPos[0] <= px ? 46 : -46;
  return [px + sideX, 0.04, pz + 14];
}

export function getForeignPalaceApproachPoint(spec: NationSpec): [number, number, number] {
  const [px, , pz] = spec.palacePos;
  const gateSide = getNationGateSide(spec);
  if (gateSide === 'east') return [px + 124, 0.04, pz];
  if (gateSide === 'north') return [px, 0.04, pz - 114];
  return [px, 0.04, pz + 114];
}

export function isInsideForeignPalace(x: number, z: number): NationId | null {
  for (const spec of NATION_SPECS) {
    const [px, , pz] = spec.palacePos;
    if (Math.abs(x - px) <= 11.4 && z >= pz - 18.4 && z <= pz - 1.2) {
      return spec.id;
    }
  }
  return null;
}

export function isNearForeignPalaceChair(x: number, z: number): NationId | null {
  for (const spec of NATION_SPECS) {
    const [px, , pz] = spec.palacePos;
    const chairZ = pz - 10.8;
    if (Math.hypot(x - px, z - chairZ) <= 4.8 && Math.abs(x - px) <= 11.4 && z >= pz - 18.4 && z <= pz + 2.0) {
      return spec.id;
    }
  }
  return null;
}

export const TRAINING_BASE_WALL_OBSTACLES: ReadonlyArray<ObstacleBox> = [
  // North Hesco wall left of 28m wide Desert Base gate (-234..-206, z=470)
  { minX: -331.0, maxX: -234.0, minZ: 469.0, maxZ: 471.5, kind: 'training_wall' },
  // North Hesco wall right of Desert Base gate
  { minX: -206.0, maxX: -109.0, minZ: 469.0, maxZ: 471.5, kind: 'training_wall' },
  // West, East & South Desert Base fortified perimeter walls
  { minX: -331.0, maxX: -328.5, minZ: 469.0, maxZ: 651.5, kind: 'training_wall' },
  { minX: -111.5, maxX: -109.0, minZ: 469.0, maxZ: 651.5, kind: 'training_wall' },
  { minX: -331.0, maxX: -109.0, minZ: 648.5, maxZ: 651.5, kind: 'training_wall' },
  // Desert Arsenal & Command Hangar blocks
  { minX: -318.0, maxX: -292.0, minZ: 590.0, maxZ: 612.0, kind: 'training_wall' },
  { minX: -148.0, maxX: -122.0, minZ: 590.0, maxZ: 612.0, kind: 'training_wall' },
];

export const CITY_AND_FOREIGN_OBSTACLES: ReadonlyArray<ObstacleBox> = [
  ...CITY_BUILDING_SPECS.map((b) => ({
    minX: b.x - (b.w * 0.5 + 0.7),
    maxX: b.x + (b.w * 0.5 + 0.7),
    minZ: b.z - (b.d * 0.5 + 0.7),
    maxZ: b.z + (b.d * 0.5 + 0.7),
    kind: 'skyscraper' as const,
  })),
  ...RESIDENTIAL_HOUSE_SPECS.map((h) => ({
    minX: h.x - (h.w * 0.5 + 0.5),
    maxX: h.x + (h.w * 0.5 + 0.5),
    minZ: h.z - (h.d * 0.5 + 0.5),
    maxZ: h.z + (h.d * 0.5 + 0.5),
    kind: 'house' as const,
  })),
  ...MOSQUE_SPECS.map((m) => ({
    minX: m.x - (m.w * 0.5 + 0.8),
    maxX: m.x + (m.w * 0.5 + 0.8),
    minZ: m.z - (m.d * 0.5 + 0.8),
    maxZ: m.z + (m.d * 0.5 + 0.8),
    kind: 'mosque' as const,
  })),
  // Enterable City Embassies: perimeter side/back walls ONLY (wide open front gate on +Z so soldiers & player enter freely!)
  ...EMBASSY_SPECS.flatMap((e) => [
    {
      minX: e.position[0] - EMBASSY_FENCE_HALF_W,
      maxX: e.position[0] - EMBASSY_FENCE_HALF_W + 1.4,
      minZ: e.position[2] - EMBASSY_FENCE_HALF_D,
      maxZ: e.position[2] + EMBASSY_FENCE_HALF_D,
      kind: 'embassy' as const,
    },
    {
      minX: e.position[0] + EMBASSY_FENCE_HALF_W - 1.4,
      maxX: e.position[0] + EMBASSY_FENCE_HALF_W,
      minZ: e.position[2] - EMBASSY_FENCE_HALF_D,
      maxZ: e.position[2] + EMBASSY_FENCE_HALF_D,
      kind: 'embassy' as const,
    },
    {
      minX: e.position[0] - EMBASSY_FENCE_HALF_W,
      maxX: e.position[0] + EMBASSY_FENCE_HALF_W,
      minZ: e.position[2] - EMBASSY_FENCE_HALF_D,
      maxZ: e.position[2] - EMBASSY_FENCE_HALF_D + 1.4,
      kind: 'embassy' as const,
    },
    {
      minX: e.position[0] - EMBASSY_FENCE_HALF_W,
      maxX: e.position[0] - 4.2,
      minZ: e.position[2] + EMBASSY_FENCE_HALF_D - 1.4,
      maxZ: e.position[2] + EMBASSY_FENCE_HALF_D,
      kind: 'embassy' as const,
    },
    {
      minX: e.position[0] + 4.2,
      maxX: e.position[0] + EMBASSY_FENCE_HALF_W,
      minZ: e.position[2] + EMBASSY_FENCE_HALF_D - 1.4,
      maxZ: e.position[2] + EMBASSY_FENCE_HALF_D,
      kind: 'embassy' as const,
    },
  ]),
  ...EMBASSY_SPECS.map((e) => ({
    minX: e.palacePosition[0] - 14.2,
    maxX: e.palacePosition[0] + 14.2,
    minZ: e.palacePosition[2] - 13.8,
    maxZ: e.palacePosition[2] + 13.8,
    kind: 'palace' as const,
  })),
  ...TRAINING_BASE_WALL_OBSTACLES,
  { minX: -110.5, maxX: -93.5, minZ: -64, maxZ: -49, kind: 'infra' },
  { minX: 67.5, maxX: 80.5, minZ: -172.5, maxZ: -159.5, kind: 'infra' },
  { minX: -111.5, maxX: -96.5, minZ: -159, maxZ: -145, kind: 'infra' },
  // Strategic SAM battery & HQ Air-Defense pads (keep troops/vehicles from overlapping launchers)
  { minX: -40.5, maxX: -35.5, minZ: -31.0, maxZ: -25.0, kind: 'infra' },
  { minX: 35.5, maxX: 40.5, minZ: -31.0, maxZ: -25.0, kind: 'infra' },
  { minX: -70.5, maxX: -65.5, minZ: -31.0, maxZ: -25.0, kind: 'infra' },
  { minX: 53.5, maxX: 58.5, minZ: -31.0, maxZ: -25.0, kind: 'infra' },
  { minX: -28.5, maxX: -23.5, minZ: 21.5, maxZ: 26.5, kind: 'infra' },
  { minX: 23.5, maxX: 28.5, minZ: 21.5, maxZ: 26.5, kind: 'infra' },
  // Hollow Enterable Foreign Presidential Palaces (open front archway |dx| <= 3.8 at local z = -1.5, solid interior desk & outer wings)
  ...NATION_SPECS.flatMap((n) => {
    const [px, , pz] = n.palacePos;
    const base = getNationMilitaryBasePos(n);
    const boxes: ObstacleBox[] = [
      // Back wall
      { minX: px - 12.2, maxX: px + 12.2, minZ: pz - 19.2, maxZ: pz - 18.0, kind: 'palace_wall' },
      // West & East hall walls
      { minX: px - 12.2, maxX: px - 11.0, minZ: pz - 19.2, maxZ: pz - 1.0, kind: 'palace_wall' },
      { minX: px + 11.0, maxX: px + 12.2, minZ: pz - 19.2, maxZ: pz - 1.0, kind: 'palace_wall' },
      // Front-left & Front-right doorway jamb walls (leaves 7.6m central portal open!)
      { minX: px - 12.2, maxX: px - 3.8, minZ: pz - 2.1, maxZ: pz - 1.0, kind: 'palace_wall' },
      { minX: px + 3.8, maxX: px + 12.2, minZ: pz - 2.1, maxZ: pz - 1.0, kind: 'palace_wall' },
      // Presidential Executive Desk inside Hall
      { minX: px - 2.2, maxX: px + 2.2, minZ: pz - 14.0, maxZ: pz - 12.4, kind: 'palace_wall' },
      // Foreign Military Base Main Bunker Collider
      { minX: base[0] - 7.2, maxX: base[0] + 7.2, minZ: base[2] - 5.2, maxZ: base[2] + 5.2, kind: 'infra' },
    ];
    if (n.tier === 'luxury_modern') {
      boxes.push(
        { minX: px - 20.6, maxX: px - 11.4, minZ: pz - 10.2, maxZ: pz + 2.2, kind: 'palace_wall' },
        { minX: px + 11.4, maxX: px + 20.6, minZ: pz - 10.2, maxZ: pz + 2.2, kind: 'palace_wall' },
      );
    }
    return boxes;
  }),
];

// Doorway-gapped exterior & interior walls for Our Intelligence Wing + Private HQ Office
export const HQ_WALL_OBSTACLES: ReadonlyArray<ObstacleBox> = [
  // Front marble walls leaving central x=-3.8..+3.8 double-doorway wide open
  { minX: -13.9, maxX: -3.9, minZ: 11.1, maxZ: 11.9, kind: 'our_wall' },
  { minX: 3.9, maxX: 13.9, minZ: 11.1, maxZ: 11.9, kind: 'our_wall' },
  // West & East perimeter walls along both Intel & Private HQ wings
  { minX: -13.9, maxX: -13.1, minZ: 11.1, maxZ: 37.9, kind: 'our_wall' },
  { minX: 13.1, maxX: 13.9, minZ: 11.1, maxZ: 37.9, kind: 'our_wall' },
  // Partition wall at z=26.0 leaving central x=-2.1..+2.1 HQ doorway open
  { minX: -13.6, maxX: -2.2, minZ: 25.6, maxZ: 26.4, kind: 'our_wall' },
  { minX: 2.2, maxX: 13.6, minZ: 25.6, maxZ: 26.4, kind: 'our_wall' },
  // South marble wall behind Commander-in-Chief crest
  { minX: -13.9, maxX: 13.9, minZ: 37.1, maxZ: 37.9, kind: 'our_wall' },
];

export const WORLD_OBSTACLES: ReadonlyArray<ObstacleBox> = [
  ...CITY_AND_FOREIGN_OBSTACLES,
  ...HQ_WALL_OBSTACLES,
];

export const PLAYER_JET_ORDER: PlayerJetType[] = ['stealth_jet', 'ru_jet'];

export const PLAYER_JET_CONFIGS: Record<PlayerJetType, PlayerJetConfig> = {
  stealth_jet: {
    id: 'stealth_jet',
    labelShort: 'شبح',
    codeName: 'F-35 / F-22',
    cruiseSpeed: 68,
    turnRate: 2.0,
    cannonDamage: 36,
    cannonCooldown: 0.08,
    missileDamage: 180,
    missileSpeed: 235,
  },
  ru_jet: {
    id: 'ru_jet',
    labelShort: 'روسية',
    codeName: 'Su-57 / Su-35',
    cruiseSpeed: 65,
    turnRate: 2.15,
    cannonDamage: 40,
    cannonCooldown: 0.09,
    missileDamage: 190,
    missileSpeed: 225,
  },
};

export const WEAPON_ORDER: WeaponType[] = [
  'rifle',
  'manpads',
  'heavy_aa',
  'patriot',
  'thaad',
  's400',
  'hq9',
  'laser',
  'hypersonic',
];

export const ENEMY_CONFIGS: Record<EnemyType, EnemyArchetypeConfig> = {
  drone: {
    type: 'drone',
    codeName: 'UAV-136',
    maxHp: 55,
    speed: 25,
    minAltitude: 22,
    maxAltitude: 46,
    rcs: 0.72,
    rewardCredits: 115,
    rewardScore: 150,
    baseDamage: 5,
    attackCooldown: 6.2,
    windupDuration: 0.75,
  },
  helicopter: {
    type: 'helicopter',
    codeName: 'Mi-28N',
    maxHp: 100,
    speed: 19,
    minAltitude: 20,
    maxAltitude: 38,
    rcs: 1.0,
    rewardCredits: 175,
    rewardScore: 240,
    baseDamage: 7,
    attackCooldown: 5.8,
    windupDuration: 0.8,
  },
  fighter: {
    type: 'fighter',
    codeName: 'Su-35 / F-16',
    maxHp: 145,
    speed: 44,
    minAltitude: 46,
    maxAltitude: 96,
    rcs: 0.85,
    rewardCredits: 265,
    rewardScore: 420,
    baseDamage: 9,
    attackCooldown: 5.2,
    windupDuration: 0.75,
  },
  stealth: {
    type: 'stealth',
    codeName: 'Stealth',
    maxHp: 190,
    speed: 40,
    minAltitude: 58,
    maxAltitude: 112,
    rcs: 0.22,
    rewardCredits: 430,
    rewardScore: 720,
    baseDamage: 12,
    attackCooldown: 5.4,
    windupDuration: 0.8,
  },
  bomber: {
    type: 'bomber',
    codeName: 'Tu-160 / B-2',
    maxHp: 320,
    speed: 28,
    minAltitude: 88,
    maxAltitude: 132,
    rcs: 0.68,
    rewardCredits: 620,
    rewardScore: 1050,
    baseDamage: 16,
    attackCooldown: 7.4,
    windupDuration: 1.0,
  },
};

export function createInitialEmbassies(): EmbassyStatus[] {
  return EMBASSY_SPECS.map((s) => ({
    id: s.id,
    code: s.code,
    atWar: false,
    hp: s.maxHp,
    maxHp: s.maxHp,
    palaceHp: s.palaceMaxHp,
    palaceMaxHp: s.palaceMaxHp,
  }));
}

export function createInitialInfrastructure(): InfraStatus[] {
  return INFRA_SPECS.map((s) => ({
    id: s.id,
    destroyed: false,
    hp: s.maxHp,
    maxHp: s.maxHp,
  }));
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

/**
 * Pure diplomacy rule: Peace holds until player attacks an embassy OR its adjacent presidential palace
 * (or launches a nuclear strike).
 */
export function applyEmbassyAttack(
  embassies: EmbassyStatus[],
  embassyId: EmbassyId,
  damage: number,
  targetKind: 'embassy' | 'palace' = 'embassy',
): {
  nextEmbassies: EmbassyStatus[];
  newlyDeclaredWar: boolean;
  anyWarDeclared: boolean;
} {
  let newlyDeclaredWar = false;
  const nextEmbassies = embassies.map((e) => {
    if (e.id !== embassyId) return e;
    if (!e.atWar) newlyDeclaredWar = true;
    const dmg = Math.max(0, damage);
    return {
      ...e,
      atWar: true,
      hp: targetKind === 'embassy' ? Math.max(0, Math.round(e.hp - dmg)) : e.hp,
      palaceHp: targetKind === 'palace' ? Math.max(0, Math.round(e.palaceHp - dmg)) : e.palaceHp,
    };
  });
  return {
    nextEmbassies,
    newlyDeclaredWar,
    anyWarDeclared: nextEmbassies.some((e) => e.atWar),
  };
}

export function applyInfraDamage(
  infra: InfraStatus[],
  infraId: InfraId,
  damage: number,
): {
  nextInfra: InfraStatus[];
  justDestroyed: boolean;
} {
  let justDestroyed = false;
  const nextInfra = infra.map((item) => {
    if (item.id !== infraId || item.destroyed) return item;
    const nextHp = Math.max(0, Math.round(item.hp - Math.max(0, damage)));
    const destroyed = nextHp <= 0;
    if (destroyed) justDestroyed = true;
    return { ...item, hp: nextHp, destroyed };
  });
  return { nextInfra, justDestroyed };
}

/**
 * Tactical modifiers driven by Infrastructure status + Weather + Time of Day
 */
export function getEnvironmentTacticalModifiers(params: {
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  infra: InfraStatus[];
  ewJamActive: boolean;
}): {
  cityLightsOn: boolean;
  visibilityFactor: number;
  radarRangeFactor: number;
  enemyAccuracyFactor: number;
  enemyRespawnDelayMult: number;
} {
  const powerDown = params.infra.some((i) => i.id === 'power_plant' && i.destroyed);
  const commsDown = params.infra.some((i) => i.id === 'comms_radar' && i.destroyed);
  const fuelDown = params.infra.some((i) => i.id === 'fuel_depot' && i.destroyed);
  const bridgeDown = params.infra.some((i) => i.id === 'coastal_bridge' && i.destroyed);

  const cityLightsOn = (params.timeOfDay === 'night' || params.timeOfDay === 'sunset') && !powerDown;

  let visibilityFactor = 1.0;
  if (params.timeOfDay === 'night') visibilityFactor *= 0.72;
  else if (params.timeOfDay === 'sunset') visibilityFactor *= 0.88;

  if (params.weather === 'fog') visibilityFactor *= 0.65;
  else if (params.weather === 'rain') visibilityFactor *= 0.82;
  else if (params.weather === 'storm') visibilityFactor *= 0.68;

  let radarRangeFactor = 1.0;
  if (params.weather === 'storm') radarRangeFactor *= 0.84;
  else if (params.weather === 'rain') radarRangeFactor *= 0.92;

  let enemyAccuracyFactor = 1.0;
  if (commsDown) enemyAccuracyFactor *= 0.58;
  if (params.ewJamActive) enemyAccuracyFactor *= 0.25;
  if (params.weather === 'storm' || params.weather === 'fog') enemyAccuracyFactor *= 0.8;

  let enemyRespawnDelayMult = 1.0;
  if (fuelDown) enemyRespawnDelayMult *= 1.45;
  if (bridgeDown) enemyRespawnDelayMult *= 1.25;

  return {
    cityLightsOn,
    visibilityFactor,
    radarRangeFactor,
    enemyAccuracyFactor,
    enemyRespawnDelayMult,
  };
}

/**
 * Logical bounded escalation budget based on how many embassies are at war.
 * Scales smoothly up to 60 enemy soldiers when war is declared.
 */
export function getHostileForceCap(warEmbassyCount: number): {
  maxAircraft: number;
  maxSoldiers: number;
  maxArmor: number;
} {
  if (warEmbassyCount <= 0) {
    return { maxAircraft: 0, maxSoldiers: 0, maxArmor: 0 };
  }
  return {
    maxAircraft: Math.min(7, 2 + warEmbassyCount * 2),
    maxSoldiers: Math.min(MAX_ENEMY_SOLDIERS, warEmbassyCount * 20),
    maxArmor: Math.min(4, warEmbassyCount + 1),
  };
}

/**
 * Escalating war wave pacing: scales enemy aircraft, 60 hostile ground troops,
 * MLRS missile salvo sizes, and spawn cadence cleanly based on war embassies + battle duration.
 */
export function computeWarWaveConfig(
  warEmbassyCount: number,
  warElapsedSec: number,
): {
  waveLevel: number;
  maxAircraft: number;
  maxSoldiers: number;
  maxArmor: number;
  enemyMlrsCooldown: number;
  missileSalvoCount: number;
  aircraftAttackMult: number;
} {
  if (warEmbassyCount <= 0) {
    return {
      waveLevel: 0,
      maxAircraft: 0,
      maxSoldiers: 0,
      maxArmor: 0,
      enemyMlrsCooldown: 99,
      missileSalvoCount: 0,
      aircraftAttackMult: 1,
    };
  }
  const waveLevel = Math.min(5, warEmbassyCount + Math.floor(Math.max(0, warElapsedSec) / 28));
  const baseCap = getHostileForceCap(warEmbassyCount);
  return {
    waveLevel,
    maxAircraft: Math.min(9, baseCap.maxAircraft + Math.floor((waveLevel - 1) / 2)),
    maxSoldiers: MAX_ENEMY_SOLDIERS,
    maxArmor: Math.min(6, baseCap.maxArmor + Math.floor(waveLevel / 3)),
    enemyMlrsCooldown: Math.max(3.4, 7.2 - waveLevel * 0.75),
    missileSalvoCount: Math.min(5, 2 + Math.floor(waveLevel / 2)),
    aircraftAttackMult: Math.max(0.55, 1.0 - (waveLevel - 1) * 0.09),
  };
}

/**
 * Pure check identifying dedicated Air-Defense SAM systems that must launch vertically into
 * high altitude above all buildings and never strike streets or houses.
 */
export function isAirDefenseSamWeapon(weapon: WeaponType): boolean {
  return (
    weapon === 'patriot' ||
    weapon === 'thaad' ||
    weapon === 's400' ||
    weapon === 'hq9' ||
    weapon === 'hypersonic'
  );
}

/**
 * Pure sky-arcing flight kinematics for SAM interceptors:
 * 1. Climbs steeply upward until clearing rooftops (y >= minSkyFloor) & climbTimer finishes.
 * 2. Steers toward an active airborne target (enemy aircraft or incoming hostile missile).
 * 3. Never dives below minSkyFloor (22m) and safely self-detonates at high altitude if no aerial target exists.
 */
export function computeSamFlightStep(params: {
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  targetSpeed: number;
  turnRate: number;
  climbTimer: number;
  dt: number;
  aerialTarget: { x: number; y: number; z: number } | null;
  minSkyFloor?: number;
}): {
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  climbTimer: number;
  shouldAirburst: boolean;
} {
  const { pos, vel, targetSpeed, turnRate, dt, aerialTarget, minSkyFloor = 22 } = params;
  const climbTimer = Math.max(0, params.climbTimer - dt);

  // Phase 1: Vertical climb clear above all rooftops & skyscrapers
  if (climbTimer > 0 || pos.y < minSkyFloor) {
    const upSpeed = Math.max(38, targetSpeed * 0.42);
    const nvx = vel.x * Math.max(0, 1 - dt * 2.5);
    const nvy = Math.max(upSpeed, vel.y);
    const nvz = vel.z * Math.max(0, 1 - dt * 2.5);
    return {
      pos: {
        x: pos.x + nvx * dt,
        y: pos.y + nvy * dt,
        z: pos.z + nvz * dt,
      },
      vel: { x: nvx, y: nvy, z: nvz },
      climbTimer,
      shouldAirburst: false,
    };
  }

  // Phase 2: No airborne target remaining -> safe high-altitude airburst (never dive into city)
  if (!aerialTarget) {
    return {
      pos: {
        x: pos.x + vel.x * dt,
        y: pos.y + Math.max(8, vel.y) * dt,
        z: pos.z + vel.z * dt,
      },
      vel: { x: vel.x, y: Math.max(8, vel.y), z: vel.z },
      climbTimer: 0,
      shouldAirburst: true,
    };
  }

  // Phase 3: High-altitude interception steer toward airborne target, clamping target Y >= minSkyFloor
  const tx = aerialTarget.x - pos.x;
  const ty = Math.max(minSkyFloor, aerialTarget.y) - pos.y;
  const tz = aerialTarget.z - pos.z;
  const len = Math.hypot(tx, ty, tz) || 1;
  const desX = (tx / len) * targetSpeed;
  const desY = (ty / len) * targetSpeed;
  const desZ = (tz / len) * targetSpeed;

  const alpha = Math.min(1, turnRate * dt);
  let nvx = vel.x + (desX - vel.x) * alpha;
  let nvy = vel.y + (desY - vel.y) * alpha;
  let nvz = vel.z + (desZ - vel.z) * alpha;

  // Hard floor safety: never dive below minSkyFloor once airborne
  if (pos.y <= minSkyFloor + 4 && nvy < 0) {
    nvy = Math.max(4, Math.abs(nvy) * 0.35);
  }
  const nLen = Math.hypot(nvx, nvy, nvz) || 1;
  nvx = (nvx / nLen) * targetSpeed;
  nvy = (nvy / nLen) * targetSpeed;
  nvz = (nvz / nLen) * targetSpeed;

  return {
    pos: {
      x: pos.x + nvx * dt,
      y: Math.max(minSkyFloor, pos.y + nvy * dt),
      z: pos.z + nvz * dt,
    },
    vel: { x: nvx, y: nvy, z: nvz },
    climbTimer: 0,
    shouldAirburst: false,
  };
}

/**
 * Resolves circle vs world-building AABB collisions cleanly across multiple passes
 * so soldiers, tanks, Humvees, MLRS, and player movement never clip into buildings or perimeter walls.
 */
export function resolveCircleObstacleCollision(
  x: number,
  z: number,
  radius: number,
  obstacles: ReadonlyArray<ObstacleBox> = WORLD_OBSTACLES,
): { x: number; z: number; collided: boolean } {
  let rx = x;
  let rz = z;
  let collided = false;

  const overlapsAny = (cx: number, cz: number): boolean => {
    for (let j = 0; j < obstacles.length; j++) {
      const b = obstacles[j];
      const kx = Math.max(b.minX, Math.min(cx, b.maxX));
      const kz = Math.max(b.minZ, Math.min(cz, b.maxZ));
      const dx = cx - kx;
      const dz = cz - kz;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  };

  for (let pass = 0; pass < 5; pass++) {
    let movedThisPass = false;
    for (let i = 0; i < obstacles.length; i++) {
      const box = obstacles[i];
      const closestX = Math.max(box.minX, Math.min(rx, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(rz, box.maxZ));
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        collided = true;
        movedThisPass = true;
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist + 0.03;
          rx += (dx / dist) * push;
          rz += (dz / dist) * push;
        } else {
          const candidates = [
            { cx: box.minX - radius - 0.04, cz: rz, pen: Math.abs(rx - box.minX) },
            { cx: box.maxX + radius + 0.04, cz: rz, pen: Math.abs(box.maxX - rx) },
            { cx: rx, cz: box.minZ - radius - 0.04, pen: Math.abs(rz - box.minZ) },
            { cx: rx, cz: box.maxZ + radius + 0.04, pen: Math.abs(box.maxZ - rz) },
          ].sort((a, b) => a.pen - b.pen);

          const clearExit = candidates.find((c) => !overlapsAny(c.cx, c.cz)) ?? candidates[0];
          rx = clearExit.cx;
          rz = clearExit.cz;
        }
      }
    }
    if (!movedThisPass) break;
  }

  if (overlapsAny(rx, rz)) {
    for (let ring = 2; ring <= 18; ring += 2) {
      let escaped = false;
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        const cx = rx + Math.cos(ang) * ring;
        const cz = rz + Math.sin(ang) * ring;
        if (!overlapsAny(cx, cz)) {
          rx = cx;
          rz = cz;
          escaped = true;
          break;
        }
      }
      if (escaped) break;
    }
  }

  return { x: rx, z: rz, collided };
}

/**
 * Smart obstacle-avoiding ground movement step: dual-probe steering fan around
 * houses, mosques, skyscrapers, embassies, palaces, and fortified walls along open streets.
 */
export function computeObstacleAwareStep(params: {
  x: number;
  z: number;
  destX: number;
  destZ: number;
  speed: number;
  dt: number;
  radius: number;
  obstacles?: ReadonlyArray<ObstacleBox>;
}): { x: number; z: number; dirX: number; dirZ: number; moved: boolean } {
  const { x, z, destX, destZ, speed, dt, radius, obstacles = WORLD_OBSTACLES } = params;
  const toX = destX - x;
  const toZ = destZ - z;
  const dist = Math.hypot(toX, toZ);
  if (dist < 0.05 || speed <= 0 || dt <= 0) {
    const safe = resolveCircleObstacleCollision(x, z, radius, obstacles);
    return { x: safe.x, z: safe.z, dirX: 0, dirZ: 0, moved: false };
  }

  const baseDx = toX / dist;
  const baseDz = toZ / dist;
  const stepLen = Math.min(dist, speed * dt);
  const nearProbe = Math.max(stepLen * 1.4, radius + 1.2);
  const farProbe = Math.max(stepLen * 2.6, radius + 2.8);

  const candidateAngles = [0, 0.55, -0.55, 1.05, -1.05, 1.55, -1.55, 2.15, -2.15];
  let chosenDx = baseDx;
  let chosenDz = baseDz;
  let foundClear = false;

  for (const ang of candidateAngles) {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const cdx = baseDx * c - baseDz * s;
    const cdz = baseDx * s + baseDz * c;
    const nearCheck = resolveCircleObstacleCollision(
      x + cdx * nearProbe,
      z + cdz * nearProbe,
      radius,
      obstacles,
    );
    if (!nearCheck.collided) {
      const farCheck = resolveCircleObstacleCollision(
        x + cdx * farProbe,
        z + cdz * farProbe,
        radius,
        obstacles,
      );
      if (!farCheck.collided) {
        chosenDx = cdx;
        chosenDz = cdz;
        foundClear = true;
        break;
      }
    }
  }

  if (!foundClear) {
    for (const ang of candidateAngles) {
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const cdx = baseDx * c - baseDz * s;
      const cdz = baseDx * s + baseDz * c;
      const nearCheck = resolveCircleObstacleCollision(
        x + cdx * nearProbe,
        z + cdz * nearProbe,
        radius,
        obstacles,
      );
      if (!nearCheck.collided) {
        chosenDx = cdx;
        chosenDz = cdz;
        foundClear = true;
        break;
      }
    }
  }

  const moveScalar = foundClear ? stepLen : stepLen * 0.45;
  const rawX = x + chosenDx * moveScalar;
  const rawZ = z + chosenDz * moveScalar;
  const resolved = resolveCircleObstacleCollision(rawX, rawZ, radius, obstacles);
  return {
    x: resolved.x,
    z: resolved.z,
    dirX: chosenDx,
    dirZ: chosenDz,
    moved: Math.hypot(resolved.x - x, resolved.z - z) > 1e-4,
  };
}

export function isInsideOurEmbassy(x: number, z: number): boolean {
  return (
    x >= OUR_HQ_COMPLEX.minX &&
    x <= OUR_HQ_COMPLEX.maxX &&
    z >= OUR_HQ_COMPLEX.intelMinZ &&
    z <= OUR_HQ_COMPLEX.hqMaxZ
  );
}

export function isNearIntelConsole(x: number, z: number): boolean {
  return x >= -9.0 && x <= 9.0 && z >= 14.5 && z <= 25.5;
}

export function isNearHqDesk(x: number, z: number): boolean {
  return x >= -7.5 && x <= 7.5 && z >= 26.8 && z <= 36.6;
}

/**
 * Pure elevation surface query for walkable roofs, exterior stair ramps, watchtowers,
 * bunker tops, and interior embassy/HQ floors.
 * Respects currentFootY so ground units walk inside Our Embassy & Private HQ without snapping onto the roof,
 * while climbing the exterior staircase smoothly reaches the rooftop vantage deck (6.55m).
 */
export function getWalkableElevationAt(x: number, z: number, currentFootY = 0): number {
  let maxElev = 0;

  // 1. Watchtowers + wide inclined ramps (West x=-22, East x=+22)
  for (const wt of CLIMBABLE_WATCHTOWERS) {
    if (Math.abs(x - wt.centerX) <= wt.halfW) {
      if (z >= wt.rampStartZ && z <= wt.rampEndZ) {
        const t = (z - wt.rampStartZ) / (wt.rampEndZ - wt.rampStartZ);
        maxElev = Math.max(maxElev, t * wt.deckHeight);
      } else if (z > wt.rampEndZ && z <= wt.deckEndZ) {
        maxElev = Math.max(maxElev, wt.deckHeight);
      }
    }
  }

  // 2. Our Embassy Exterior Staircase/Ramp on the East wall (x = 13.6..18.4, z = 12.0..28.5)
  if (x >= 13.6 && x <= 18.4 && z >= 12.0 && z <= 28.5) {
    const t = Math.min(1, Math.max(0, (z - 12.0) / (26.5 - 12.0)));
    maxElev = Math.max(maxElev, t * OUR_HQ_COMPLEX.roofY);
  }

  // 3. Our Embassy + Private HQ Interior Floor (y = 0.25) vs Rooftop Vantage Deck (y = 6.55)
  if (x >= -14.2 && x <= 14.2 && z >= 11.0 && z <= 38.0) {
    if (currentFootY >= 3.4) {
      maxElev = Math.max(maxElev, OUR_HQ_COMPLEX.roofY);
    } else if (x >= -13.5 && x <= 13.5 && z >= 11.5 && z <= 37.5) {
      maxElev = Math.max(maxElev, 0.25);
    }
  }

  // 3b. Foreign Presidential Palaces Interior Floor (y = 0.23)
  if (currentFootY < 2.5 && isInsideForeignPalace(x, z) !== null) {
    maxElev = Math.max(maxElev, 0.23);
  }

  // 4. Forward Tactical Command Concrete Platforms (Hesco sniper berms at x = ±9.2, z = -22..-16)
  for (const sideX of [-9.2, 9.2]) {
    if (Math.abs(x - sideX) <= 2.3) {
      if (z >= -16.0 && z <= -12.5) {
        const t = (-12.5 - z) / 3.5;
        maxElev = Math.max(maxElev, t * 2.2);
      } else if (z >= -21.5 && z < -16.0) {
        maxElev = Math.max(maxElev, 2.2);
      }
    }
  }

  return maxElev;
}

export function isInsideCityEmbassy(x: number, z: number): EmbassyId | null {
  for (const spec of EMBASSY_SPECS) {
    const cx = spec.position[0];
    const cz = spec.position[2];
    if (
      Math.abs(x - cx) <= EMBASSY_FENCE_HALF_W &&
      Math.abs(z - cz) <= EMBASSY_FENCE_HALF_D
    ) {
      return spec.id;
    }
  }
  return null;
}

/**
 * Checks outer fence collision while keeping the wide front gate (+Z, |dx| <= 4.0) open
 * so players and soldiers can enter, secure, or storm any embassy in the city.
 */
export function checkElectricFenceCollision(
  x: number,
  z: number,
  pad = 0.85,
): {
  blocked: boolean;
  embassyId: EmbassyId | null;
  safeX: number;
  safeZ: number;
} {
  for (const spec of EMBASSY_SPECS) {
    const cx = spec.position[0];
    const cz = spec.position[2];
    const hw = EMBASSY_FENCE_HALF_W + pad;
    const hd = EMBASSY_FENCE_HALF_D + pad;
    const dx = x - cx;
    const dz = z - cz;
    // Open front diplomatic gate + interior courtyard remain freely walkable
    if (Math.abs(dx) <= 4.0 && dz >= -EMBASSY_FENCE_HALF_D + 1.5 && dz <= hd + 0.5) {
      continue;
    }
    if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
      const innerClear =
        Math.abs(dx) < EMBASSY_FENCE_HALF_W - 1.6 &&
        Math.abs(dz) < EMBASSY_FENCE_HALF_D - 1.6;
      if (innerClear) continue;
      const penX = hw - Math.abs(dx);
      const penZ = hd - Math.abs(dz);
      if (penX < penZ) {
        return {
          blocked: true,
          embassyId: spec.id,
          safeX: cx + (dx >= 0 ? hw : -hw),
          safeZ: z,
        };
      }
      return {
        blocked: true,
        embassyId: spec.id,
        safeX: x,
        safeZ: cz + (dz >= 0 ? hd : -hd),
      };
    }
  }
  return { blocked: false, embassyId: null, safeX: x, safeZ: z };
}

/**
 * Computes distance-attenuated nuclear blast damage around the player-selected ground impact point.
 */
export function computeNukeSplashDamage(
  impactX: number,
  impactZ: number,
  targetX: number,
  targetZ: number,
  blastRadius = NUKE_BLAST_RADIUS,
  centerDamage = 650,
): number {
  const dist = Math.hypot(targetX - impactX, targetZ - impactZ);
  if (dist > blastRadius) return 0;
  const falloff = 1 - (dist / blastRadius) * 0.65;
  return Math.round(centerDamage * falloff);
}

/**
 * Calculates how many soldiers to deploy for a 50-soldier battalion reinforcement while respecting FPS caps.
 */
export function computeReinforcementCount(
  currentAlliedAlive: number,
  batchSize = REINFORCE_SOLDIER_BATCH,
  maxCap = MAX_ALLIED_SOLDIERS,
): number {
  return Math.max(0, Math.min(batchSize, maxCap - currentAlliedAlive));
}

export function getWeaponStats(type: WeaponType, upgrades: UpgradeState): WeaponStats {
  switch (type) {
    case 'rifle': {
      const lv = upgrades.closeInLevel;
      return {
        type: 'rifle',
        shortLabel: 'بندقية',
        keyHint: '1',
        damage: 30 + (lv - 1) * 8,
        cooldown: 0.13,
        projectileSpeed: 295,
        homing: false,
        requiresLock: false,
        coldLaunch: false,
        turnRate: 0,
        blastRadius: 2.2,
        magSize: 30,
        reloadTime: 1.0,
      };
    }
    case 'manpads': {
      const lv = upgrades.closeInLevel;
      return {
        type: 'manpads',
        shortLabel: 'مانباد',
        keyHint: '2',
        damage: 125 + (lv - 1) * 28,
        cooldown: 0.65,
        projectileSpeed: 165 + (lv - 1) * 14,
        homing: true,
        requiresLock: true,
        coldLaunch: false,
        turnRate: 7.5 + (lv - 1) * 0.6,
        blastRadius: 8.5,
        magSize: 4 + (lv - 1),
        reloadTime: 1.5,
      };
    }
    case 'heavy_aa': {
      const lv = upgrades.closeInLevel;
      return {
        type: 'heavy_aa',
        shortLabel: 'رشاش',
        keyHint: '3',
        damage: 26 + (lv - 1) * 7,
        cooldown: 0.09,
        projectileSpeed: 320,
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
        shortLabel: 'Patriot',
        keyHint: '4',
        damage: 165 + (lv - 1) * 35,
        cooldown: 0.72,
        projectileSpeed: 195 + (lv - 1) * 16,
        homing: true,
        requiresLock: false,
        coldLaunch: false,
        turnRate: 8.4 + (lv - 1) * 0.65,
        blastRadius: 12.5,
        magSize: 4 + (lv - 1),
        reloadTime: 1.85,
      };
    }
    case 'thaad': {
      const lv = upgrades.usLevel;
      return {
        type: 'thaad',
        shortLabel: 'THAAD',
        keyHint: '5',
        damage: 250 + (lv - 1) * 48,
        cooldown: 0.95,
        projectileSpeed: 240 + (lv - 1) * 18,
        homing: true,
        requiresLock: false,
        coldLaunch: false,
        turnRate: 9.4 + (lv - 1) * 0.7,
        blastRadius: 14.5,
        magSize: 2 + Math.floor(lv / 2),
        reloadTime: 2.2,
      };
    }
    case 's400': {
      const lv = upgrades.ruLevel;
      return {
        type: 's400',
        shortLabel: 'S-400',
        keyHint: '6',
        damage: 235 + (lv - 1) * 45,
        cooldown: 0.85,
        projectileSpeed: 210 + (lv - 1) * 16,
        homing: true,
        requiresLock: false,
        coldLaunch: true,
        turnRate: 8.9 + (lv - 1) * 0.65,
        blastRadius: 15,
        magSize: 4 + (lv - 1),
        reloadTime: 2.0,
      };
    }
    case 'hq9': {
      const lv = upgrades.cnLevel;
      return {
        type: 'hq9',
        shortLabel: 'HQ-9',
        keyHint: '7',
        damage: 205 + (lv - 1) * 40,
        cooldown: 0.78,
        projectileSpeed: 200 + (lv - 1) * 16,
        homing: true,
        requiresLock: false,
        coldLaunch: true,
        turnRate: 8.6 + (lv - 1) * 0.65,
        blastRadius: 14,
        magSize: 4 + (lv - 1),
        reloadTime: 1.95,
      };
    }
    case 'laser': {
      const lv = upgrades.radarLevel;
      return {
        type: 'laser',
        shortLabel: 'ليزر',
        keyHint: '8',
        damage: 58 + (lv - 1) * 16,
        cooldown: 0.14,
        projectileSpeed: 900,
        homing: false,
        requiresLock: false,
        coldLaunch: false,
        isLaser: true,
        turnRate: 0,
        blastRadius: 4.5,
        magSize: 45,
        reloadTime: 1.1,
      };
    }
    case 'hypersonic': {
      const lv = upgrades.forcesLevel;
      return {
        type: 'hypersonic',
        shortLabel: 'فرط صوتي',
        keyHint: '9',
        damage: 420 + (lv - 1) * 75,
        cooldown: 1.2,
        projectileSpeed: 365 + (lv - 1) * 24,
        homing: true,
        requiresLock: false,
        coldLaunch: true,
        isHypersonic: true,
        turnRate: 11.2,
        blastRadius: 20,
        magSize: 2 + Math.floor(lv / 2),
        reloadTime: 2.6,
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

export function getUpgradeCost(
  slot: UpgradeSlotKey,
  currentLevel: number,
  costMultiplier = 1,
): number {
  const baseCosts: Record<UpgradeSlotKey, number> = {
    closeInLevel: 400,
    usLevel: 650,
    ruLevel: 650,
    cnLevel: 600,
    radarLevel: 550,
    forcesLevel: 500,
  };
  return Math.round(baseCosts[slot] * Math.pow(1.42, Math.max(0, currentLevel - 1)) * costMultiplier);
}

export function canPurchaseUpgrade(
  slot: UpgradeSlotKey,
  upgrades: UpgradeState,
  credits: number,
  costMultiplier = 1,
): boolean {
  const cur = upgrades[slot];
  if (cur >= getUpgradeMaxLevel(slot)) return false;
  return credits >= getUpgradeCost(slot, cur, costMultiplier);
}

export function purchaseUpgrade(
  slot: UpgradeSlotKey,
  upgrades: UpgradeState,
  credits: number,
  costMultiplier = 1,
): { upgrades: UpgradeState; credits: number; purchased: boolean } {
  if (!canPurchaseUpgrade(slot, upgrades, credits, costMultiplier)) {
    return { upgrades, credits, purchased: false };
  }
  const cost = getUpgradeCost(slot, upgrades[slot], costMultiplier);
  return {
    upgrades: {
      ...upgrades,
      [slot]: upgrades[slot] + 1,
    },
    credits: credits - cost,
    purchased: true,
  };
}

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
  radarRangeFactor?: number;
}): { strength: number; canLockHoming: boolean } {
  const {
    enemyType,
    distance,
    bearingRad,
    radarAngleRad,
    radarLevel,
    previousStrength,
    dt,
    radarRangeFactor = 1.0,
  } = params;
  const cfg = ENEMY_CONFIGS[enemyType];
  const effectiveRange = RADAR_MAX_RANGE * (0.9 + radarLevel * 0.12) * radarRangeFactor;
  if (distance > effectiveRange) {
    return { strength: Math.max(0, previousStrength - dt * 1.2), canLockHoming: false };
  }
  const beamHalfWidth = 0.38 + (radarLevel - 1) * 0.16;
  const sweptByBeam = angleDiff(bearingRad, radarAngleRad) <= beamHalfWidth;

  if (enemyType !== 'stealth') {
    const baseStrength = sweptByBeam ? 1.0 : Math.max(0.6, previousStrength - dt * 0.25);
    return { strength: Math.min(1, baseStrength), canLockHoming: true };
  }
  if (radarLevel >= 3) {
    return {
      strength: sweptByBeam ? 1.0 : Math.max(0.72, previousStrength - dt * 0.2),
      canLockHoming: true,
    };
  }
  if (distance <= (radarLevel === 1 ? 85 : 135)) {
    return { strength: Math.max(0.85, previousStrength), canLockHoming: true };
  }
  if (sweptByBeam) {
    return { strength: radarLevel === 1 ? 0.9 : 1.0, canLockHoming: radarLevel >= 2 };
  }
  const decayRate = radarLevel === 1 ? 0.75 : 0.32;
  const next = Math.max(0, previousStrength - dt * decayRate * (1 / Math.max(cfg.rcs, 0.2)));
  return { strength: next, canLockHoming: next > 0.4 };
}

export function applyBaseDamage(currentHp: number, damage: number): {
  nextHp: number;
  isDefeated: boolean;
} {
  const nextHp = Math.max(MIN_SHIELDED_HP, Math.round(currentHp - Math.max(0, damage)));
  return { nextHp, isDefeated: false };
}

export function computeCarrierApproachStep(params: {
  x: number;
  y: number;
  z: number;
  speed: number;
  dt: number;
}): {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  speed: number;
  touchedDown: boolean;
} {
  const [tx, ty, tz] = CARRIER_OPERATIONS.touchdownPoint;
  const dx = tx - params.x;
  const dy = ty - params.y;
  const dz = tz - params.z;
  const horiz = Math.hypot(dx, dz);
  const dist3d = Math.hypot(dx, dy, dz);

  if (dist3d <= 3.6) {
    return {
      x: tx,
      y: ty,
      z: tz,
      yaw: 0,
      pitch: 0,
      speed: 0,
      touchedDown: true,
    };
  }

  const targetSpeed = horiz < 28 ? 22 : horiz < 90 ? 38 : 62;
  const nextSpeed = params.speed + (targetSpeed - params.speed) * Math.min(1, params.dt * 2.5);
  const step = Math.min(dist3d, nextSpeed * params.dt);
  const nx = params.x + (dx / dist3d) * step;
  const ny = Math.max(ty, params.y + (dy / dist3d) * step);
  const nz = params.z + (dz / dist3d) * step;
  const yaw = Math.atan2(-dx, -dz);
  const pitch = Math.atan2(dy, Math.max(0.1, horiz));

  return {
    x: nx,
    y: ny,
    z: nz,
    yaw,
    pitch,
    speed: nextSpeed,
    touchedDown: false,
  };
}

/**
 * Strict reserve discipline rule: Desert Base reserves remain 100% stationary inside
 * the fortified desert compound and NEVER mobilize or attack on Advance/Attack/Move/Strike;
 * ONLY the explicit Reserve button (directReserveOrder) deploys them.
 */
export function shouldMobilizeReserves(
  _squadOrder: 'follow' | 'advance' | 'attack',
  directReserveOrder = false,
): boolean {
  return Boolean(directReserveOrder);
}

/**
 * Enforces strict rule: No military commanders may be stationed inside city residential/urban quarters;
 * commanders belong strictly inside the Desert Mega-Base or Private HQ Complex.
 */
export function isCommanderPositionValid(x: number, z: number): boolean {
  const inDesertBase =
    x >= FORTIFIED_TRAINING_BASE.minX &&
    x <= FORTIFIED_TRAINING_BASE.maxX &&
    z >= FORTIFIED_TRAINING_BASE.minZ &&
    z <= FORTIFIED_TRAINING_BASE.maxZ;
  const inHq =
    x >= OUR_HQ_COMPLEX.minX &&
    x <= OUR_HQ_COMPLEX.maxX &&
    z >= OUR_HQ_COMPLEX.intelMinZ &&
    z <= OUR_HQ_COMPLEX.hqMaxZ;
  return inDesertBase || inHq;
}

/**
 * Computes whether a target coordinate lies within the 2000m Desert Underground Ballistic Tunnel range.
 */
export function isWithinDesertTunnelRange(
  targetX: number,
  targetZ: number,
  tunnelPos: readonly [number, number, number] = DESERT_TUNNEL_SPECS[0].position,
): boolean {
  const dist = Math.hypot(targetX - tunnelPos[0], targetZ - tunnelPos[2]);
  return dist <= DESERT_TUNNEL_MAX_RANGE;
}

/**
 * Selects the nearest tactical sandbag/Hesco cover barrier relative to a soldier & threat direction.
 */
export function findNearestCoverBarrier(
  x: number,
  z: number,
  maxRadius = 46,
): (typeof COVER_BARRIER_SPECS)[number] | null {
  let best: (typeof COVER_BARRIER_SPECS)[number] | null = null;
  let bestDist = maxRadius;
  for (const c of COVER_BARRIER_SPECS) {
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

export function createInitialSecretSites() {
  return SECRET_SITE_SPECS.map((s) => ({
    id: s.id,
    code: s.code,
    position: [...s.position] as [number, number, number],
    revealed: false,
    destroyed: false,
    hp: s.maxHp,
    maxHp: s.maxHp,
  }));
}

/**
 * Pure diplomacy & listening resolution for the Private Commander's HQ hotline.
 */
export function resolveNegotiationAction(params: {
  stance: 'truce' | 'escalate';
  warDeclared: boolean;
  credits: number;
  truceCooldown: number;
}): {
  accepted: boolean;
  truceDuration: number;
  cooldownSet: number;
  creditsSpent: number;
  moraleBoostDuration: number;
} {
  const { stance, warDeclared, credits, truceCooldown } = params;
  if (stance === 'truce') {
    if (!warDeclared || truceCooldown > 0 || credits < 350) {
      return {
        accepted: false,
        truceDuration: 0,
        cooldownSet: truceCooldown,
        creditsSpent: 0,
        moraleBoostDuration: 0,
      };
    }
    return {
      accepted: true,
      truceDuration: 15,
      cooldownSet: 26,
      creditsSpent: 350,
      moraleBoostDuration: 0,
    };
  }
  return {
    accepted: true,
    truceDuration: 0,
    cooldownSet: Math.max(truceCooldown, 6),
    creditsSpent: 0,
    moraleBoostDuration: 14,
  };
}
