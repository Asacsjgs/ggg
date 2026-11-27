import type { NationArchitecturalTier, NationId, NationStatus } from './types';

export interface NationSpec {
  id: NationId;
  nameAr: string;
  code: string;
  tier: NationArchitecturalTier;
  palacePos: [number, number, number];
  welcomeGatePos: [number, number, number];
  borderPos: [number, number, number];
  borderRotationY: number;
  samPos: [number, number, number];
  accentHex: number;
  secondaryHex: number;
  towerHeightScale: number;
  palaceMaxHp: number;
  militaryPower: number; // Relative to player (1.25 - 1.95 => stronger armies & arsenals)
  flagColors: [string, string, string];
  flagStyle: 'tricolor_h' | 'tricolor_v' | 'bicolor_crescent' | 'stripes_canton' | 'eu_stars' | 'israel' | 'saudi' | 'uae' | 'iraq_style' | 'china' | 'qatar' | 'bahrain';
}

/**
 * 13 distinct foreign nations organized beyond Iraq's borders:
 * - Luxury Modern Tier (AE, SA, QA, US, EU, IL): glass skyscrapers, palm boulevards, grand white/gold palaces, high-tech SAMs.
 * - Historic/Imperial Tier (EG, SY, IR, KW, BH, CN, AF): cultural domes, minarets, limestone arches, fortress citadels, heavy artillery.
 * All capitals lie within the 2000m Desert Ballistic Missile Tunnel envelope.
 */
export const NATION_SPECS: ReadonlyArray<NationSpec> = [
  // NORTH & NORTH-WEST AXIS (Syria, Iran, Israel, Europe, America, Asia)
  {
    id: 'sy',
    nameAr: 'سوريا',
    code: 'SY',
    tier: 'historic_imperial',
    palacePos: [-220, 0, -680],
    welcomeGatePos: [-220, 0.04, -636],
    borderPos: [-220, 0.04, -470],
    borderRotationY: 0,
    samPos: [-262, 0.04, -660],
    accentHex: 0xc2b280,
    secondaryHex: 0x991b1b,
    towerHeightScale: 0.78,
    palaceMaxHp: 1650,
    militaryPower: 1.35,
    flagColors: ['#ce1126', '#ffffff', '#111827'],
    flagStyle: 'tricolor_h',
  },
  {
    id: 'ir',
    nameAr: 'إيران',
    code: 'IR',
    tier: 'historic_imperial',
    palacePos: [20, 0, -700],
    welcomeGatePos: [20, 0.04, -656],
    borderPos: [20, 0.04, -470],
    borderRotationY: 0,
    samPos: [64, 0.04, -680],
    accentHex: 0x0d9488,
    secondaryHex: 0xd97706,
    towerHeightScale: 0.92,
    palaceMaxHp: 1950,
    militaryPower: 1.6,
    flagColors: ['#239f40', '#ffffff', '#da0000'],
    flagStyle: 'tricolor_h',
  },
  {
    id: 'il',
    nameAr: 'إسرائيل',
    code: 'IL',
    tier: 'luxury_modern',
    palacePos: [-660, 0, -650],
    welcomeGatePos: [-622, 0.04, -622],
    borderPos: [-480, 0.04, -460],
    borderRotationY: Math.PI * 0.25,
    samPos: [-702, 0.04, -625],
    accentHex: 0x0284c7,
    secondaryHex: 0xf1f5f9,
    towerHeightScale: 1.18,
    palaceMaxHp: 2250,
    militaryPower: 1.85,
    flagColors: ['#ffffff', '#0038b8', '#ffffff'],
    flagStyle: 'israel',
  },
  {
    id: 'eu',
    nameAr: 'أوروبا',
    code: 'EU',
    tier: 'luxury_modern',
    palacePos: [-680, 0, -1040],
    welcomeGatePos: [-652, 0.04, -1000],
    borderPos: [-480, 0.04, -860],
    borderRotationY: Math.PI * 0.2,
    samPos: [-725, 0.04, -1015],
    accentHex: 0x1d4ed8,
    secondaryHex: 0xe2e8f0,
    towerHeightScale: 1.25,
    palaceMaxHp: 2100,
    militaryPower: 1.75,
    flagColors: ['#003399', '#ffcc00', '#1e40af'],
    flagStyle: 'eu_stars',
  },
  {
    id: 'us',
    nameAr: 'أمريكا',
    code: 'US',
    tier: 'luxury_modern',
    palacePos: [-1100, 0, -840],
    welcomeGatePos: [-1064, 0.04, -812],
    borderPos: [-920, 0.04, -560],
    borderRotationY: Math.PI * 0.25,
    samPos: [-1142, 0.04, -815],
    accentHex: 0x2563eb,
    secondaryHex: 0xf8fafc,
    towerHeightScale: 1.48,
    palaceMaxHp: 2500,
    militaryPower: 1.95,
    flagColors: ['#b22234', '#ffffff', '#3c3b6e'],
    flagStyle: 'stripes_canton',
  },
  {
    id: 'cn',
    nameAr: 'آسيا',
    code: 'AS',
    tier: 'historic_imperial',
    palacePos: [20, 0, -1100],
    welcomeGatePos: [20, 0.04, -1056],
    borderPos: [20, 0.04, -900],
    borderRotationY: 0,
    samPos: [68, 0.04, -1075],
    accentHex: 0xb91c1c,
    secondaryHex: 0xfbbf24,
    towerHeightScale: 1.34,
    palaceMaxHp: 2350,
    militaryPower: 1.88,
    flagColors: ['#de2910', '#ffde00', '#de2910'],
    flagStyle: 'china',
  },

  // WEST CORRIDOR (Egypt, Africa, Saudi Arabia — completely west of City & Desert)
  {
    id: 'eg',
    nameAr: 'مصر',
    code: 'EG',
    tier: 'historic_imperial',
    palacePos: [-780, 0, -120],
    welcomeGatePos: [-736, 0.04, -120],
    borderPos: [-500, 0.04, -120],
    borderRotationY: Math.PI / 2,
    samPos: [-818, 0.04, -90],
    accentHex: 0xd4a359,
    secondaryHex: 0xf3e8d2,
    towerHeightScale: 0.9,
    palaceMaxHp: 1850,
    militaryPower: 1.5,
    flagColors: ['#ce1126', '#ffffff', '#111827'],
    flagStyle: 'tricolor_h',
  },
  {
    id: 'af',
    nameAr: 'أفريقيا',
    code: 'AF',
    tier: 'historic_imperial',
    palacePos: [-820, 0, 240],
    welcomeGatePos: [-776, 0.04, 240],
    borderPos: [-500, 0.04, 220],
    borderRotationY: Math.PI / 2,
    samPos: [-858, 0.04, 275],
    accentHex: 0xb45309,
    secondaryHex: 0x15803d,
    towerHeightScale: 0.85,
    palaceMaxHp: 1750,
    militaryPower: 1.42,
    flagColors: ['#007a4d', '#ffb612', '#de3831'],
    flagStyle: 'tricolor_h',
  },
  {
    id: 'sa',
    nameAr: 'السعودية',
    code: 'SA',
    tier: 'luxury_modern',
    palacePos: [-840, 0, 580],
    welcomeGatePos: [-796, 0.04, 580],
    borderPos: [-500, 0.04, 560],
    borderRotationY: Math.PI / 2,
    samPos: [-880, 0.04, 610],
    accentHex: 0x15803d,
    secondaryHex: 0xfef3c7,
    towerHeightScale: 1.38,
    palaceMaxHp: 2200,
    militaryPower: 1.78,
    flagColors: ['#006c35', '#ffffff', '#006c35'],
    flagStyle: 'saudi',
  },

  // FAR SOUTH GULF CORRIDOR (Kuwait, Bahrain, UAE, Qatar — completely south of Southern Desert z=420..740)
  {
    id: 'kw',
    nameAr: 'الكويت',
    code: 'KW',
    tier: 'historic_imperial',
    palacePos: [10, 0, 960],
    welcomeGatePos: [10, 0.04, 916],
    borderPos: [10, 0.04, 770],
    borderRotationY: 0,
    samPos: [54, 0.04, 940],
    accentHex: 0x0f766e,
    secondaryHex: 0xe7dcc8,
    towerHeightScale: 0.98,
    palaceMaxHp: 1700,
    militaryPower: 1.45,
    flagColors: ['#007a3d', '#ffffff', '#ce1126'],
    flagStyle: 'tricolor_h',
  },
  {
    id: 'bh',
    nameAr: 'البحرين',
    code: 'BH',
    tier: 'historic_imperial',
    palacePos: [-420, 0, 960],
    welcomeGatePos: [-420, 0.04, 916],
    borderPos: [-420, 0.04, 770],
    borderRotationY: 0,
    samPos: [-464, 0.04, 940],
    accentHex: 0xbe123c,
    secondaryHex: 0xfef2f2,
    towerHeightScale: 0.96,
    palaceMaxHp: 1680,
    militaryPower: 1.4,
    flagColors: ['#ffffff', '#ce1126', '#ce1126'],
    flagStyle: 'bahrain',
  },
  {
    id: 'ae',
    nameAr: 'الإمارات',
    code: 'AE',
    tier: 'luxury_modern',
    palacePos: [-780, 0, 1040],
    welcomeGatePos: [-748, 0.04, 1002],
    borderPos: [-680, 0.04, 770],
    borderRotationY: Math.PI * 0.22,
    samPos: [-822, 0.04, 1072],
    accentHex: 0xd97706,
    secondaryHex: 0xf8fafc,
    towerHeightScale: 1.56,
    palaceMaxHp: 2250,
    militaryPower: 1.8,
    flagColors: ['#00732f', '#ffffff', '#111827'],
    flagStyle: 'uae',
  },
  {
    id: 'qa',
    nameAr: 'قطر',
    code: 'QA',
    tier: 'luxury_modern',
    palacePos: [-20, 0, 1280],
    welcomeGatePos: [-20, 0.04, 1236],
    borderPos: [-20, 0.04, 1140],
    borderRotationY: 0,
    samPos: [26, 0.04, 1260],
    accentHex: 0x881337,
    secondaryHex: 0xf8fafc,
    towerHeightScale: 1.32,
    palaceMaxHp: 2050,
    militaryPower: 1.65,
    flagColors: ['#ffffff', '#8a1538', '#8a1538'],
    flagStyle: 'qatar',
  },
];

export function createInitialNations(): NationStatus[] {
  return NATION_SPECS.map((s) => ({
    id: s.id,
    nameAr: s.nameAr,
    code: s.code,
    tier: s.tier,
    atWar: false,
    allied: false,
    wallsIntact: 16,
    wallsTotal: 16,
    palaceHp: s.palaceMaxHp,
    palaceMaxHp: s.palaceMaxHp,
    militaryPower: s.militaryPower,
    presidentWelcoming: false,
  }));
}

export function getNationSpec(id: NationId): NationSpec {
  return NATION_SPECS.find((n) => n.id === id) ?? NATION_SPECS[0];
}

export function setNationWarState(
  nations: NationStatus[],
  nationId: NationId,
  atWar: boolean,
): NationStatus[] {
  return nations.map((n) =>
    n.id === nationId
      ? {
          ...n,
          atWar,
          allied: atWar ? false : n.allied,
          presidentWelcoming: atWar ? false : n.presidentWelcoming,
        }
      : n,
  );
}

export function canLaunchDiplomaticConvoy(
  nations: ReadonlyArray<NationStatus>,
  dest: NationId | 'home',
): boolean {
  if (dest === 'home') return true;
  const target = nations.find((n) => n.id === dest);
  return Boolean(target && !target.atWar);
}

/**
 * Peace-time upgrade discount: upgrading arsenal & forces during peace costs 20% less.
 */
export function getPeaceUpgradeCostMultiplier(anyWarDeclared: boolean): number {
  return anyWarDeclared ? 1.0 : 0.8;
}
