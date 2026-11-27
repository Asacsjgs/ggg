import * as THREE from 'three';
import { NATION_SPECS, type NationSpec } from './nations';
import {
  COVER_BARRIER_SPECS,
  DESERT_TUNNEL_SPECS,
  FORTIFIED_DESERT_REGION,
  FORTIFIED_TRAINING_BASE,
  ISIS_BLOCK_SPECS,
  NATION_WALL_SPECS,
  getNationGateSide,
  getNationMilitaryBasePos,
} from './rules';
import type { AlliedForceBranch, NationId } from './types';

export interface NationVisualRig {
  id: NationId;
  spec: NationSpec;
  palaceGroup: THREE.Group;
  palaceMat: THREE.MeshStandardMaterial;
  palaceWorldPos: THREE.Vector3;
  borderPos: THREE.Vector3;
  borderGateArm: THREE.Mesh;
  samMuzzles: THREE.Object3D[];
  presidentGroup: THREE.Group;
  presidentRightArm: THREE.Mesh;
  flagMesh: THREE.Mesh;
}

export interface NationWallVisualRig {
  id: string;
  nationId: NationId;
  intactGroup: THREE.Group;
  rubbleGroup: THREE.Group;
  intactMat: THREE.MeshStandardMaterial;
}

export interface DesertTunnelSiloRig {
  id: string;
  code: string;
  worldPos: THREE.Vector3;
  doorL: THREE.Mesh;
  doorR: THREE.Mesh;
  launcherPivot: THREE.Group;
  muzzle: THREE.Object3D;
  openProgress: number; // 0 = closed, 1 = open
  openHoldTimer: number;
}

export interface IsisBlockRig {
  id: string;
  group: THREE.Group;
  worldPos: THREE.Vector3;
  bodyMat: THREE.MeshStandardMaterial;
  flagMesh: THREE.Mesh;
}

export interface TahoeSuvRig {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  bodyMeshes: THREE.Mesh[];
  strobeL: THREE.Mesh;
  strobeR: THREE.Mesh;
}

export interface WorldExtensionsBundle {
  nations: NationVisualRig[];
  nationWalls: NationWallVisualRig[];
  desertTunnels: DesertTunnelSiloRig[];
  isisBlocks: IsisBlockRig[];
  trainingParkedJets: THREE.Group[];
  desertBaseFlag: THREE.Mesh;
  hqDamageGroup: THREE.Group;
  hqDamageMeshes: THREE.Object3D[];
  branchFlagTextures: Record<AlliedForceBranch | 'isis', THREE.CanvasTexture>;
  nationFlagTextures: Record<NationId, THREE.CanvasTexture>;
}

/**
 * Generates crisp procedural CanvasTexture national flags for all 13 countries.
 */
export function createNationalFlagTexture(spec: NationSpec): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  const [c1, c2, c3] = spec.flagColors;

  if (spec.flagStyle === 'tricolor_h') {
    ctx.fillStyle = c1;
    ctx.fillRect(0, 0, 256, 53);
    ctx.fillStyle = c2;
    ctx.fillRect(0, 53, 256, 54);
    ctx.fillStyle = c3;
    ctx.fillRect(0, 107, 256, 53);
    if (spec.id === 'sy') {
      ctx.fillStyle = '#007a3d';
      for (const sx of [92, 164]) {
        ctx.beginPath();
        ctx.arc(sx, 80, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (spec.id === 'eg') {
      ctx.fillStyle = '#c09300';
      ctx.fillRect(116, 64, 24, 32);
    } else if (spec.id === 'ir') {
      ctx.fillStyle = '#da0000';
      ctx.beginPath();
      ctx.arc(128, 80, 13, 0, Math.PI * 2);
      ctx.fill();
    } else if (spec.id === 'kw') {
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(72, 53);
      ctx.lineTo(72, 107);
      ctx.lineTo(0, 160);
      ctx.closePath();
      ctx.fill();
    } else if (spec.id === 'af') {
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, 86, 160);
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(86, 0, 84, 160);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(170, 0, 86, 160);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(128, 80, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (spec.flagStyle === 'uae') {
    ctx.fillStyle = '#00732f';
    ctx.fillRect(68, 0, 188, 53);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(68, 53, 188, 54);
    ctx.fillStyle = '#111827';
    ctx.fillRect(68, 107, 188, 53);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 68, 160);
  } else if (spec.flagStyle === 'saudi') {
    ctx.fillStyle = '#006c35';
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(58, 56, 140, 16);
    ctx.fillRect(72, 92, 112, 8);
    ctx.fillRect(170, 86, 14, 18);
  } else if (spec.flagStyle === 'qatar' || spec.flagStyle === 'bahrain') {
    ctx.fillStyle = c2;
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 74, 160);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const yTop = i * 20;
      ctx.moveTo(74, yTop);
      ctx.lineTo(94, yTop + 10);
      ctx.lineTo(74, yTop + 20);
    }
    ctx.fill();
  } else if (spec.flagStyle === 'israel') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = '#0038b8';
    ctx.fillRect(0, 18, 256, 22);
    ctx.fillRect(0, 120, 256, 22);
    ctx.strokeStyle = '#0038b8';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(128, 52);
    ctx.lineTo(154, 98);
    ctx.lineTo(102, 98);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(128, 108);
    ctx.lineTo(154, 62);
    ctx.lineTo(102, 62);
    ctx.closePath();
    ctx.stroke();
  } else if (spec.flagStyle === 'eu_stars') {
    ctx.fillStyle = '#003399';
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = '#ffcc00';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(128 + Math.cos(a) * 46, 80 + Math.sin(a) * 46, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (spec.flagStyle === 'stripes_canton') {
    for (let s = 0; s < 13; s++) {
      ctx.fillStyle = s % 2 === 0 ? '#b22234' : '#ffffff';
      ctx.fillRect(0, (s * 160) / 13, 256, 160 / 13 + 1);
    }
    ctx.fillStyle = '#3c3b6e';
    ctx.fillRect(0, 0, 104, 86);
    ctx.fillStyle = '#ffffff';
    for (let r = 0; r < 4; r++) {
      for (let col = 0; col < 5; col++) {
        ctx.fillRect(12 + col * 19, 10 + r * 19, 6, 6);
      }
    }
  } else if (spec.flagStyle === 'china') {
    ctx.fillStyle = '#de2910';
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = '#ffde00';
    ctx.beginPath();
    ctx.arc(46, 46, 16, 0, Math.PI * 2);
    ctx.fill();
    for (const [sx, sy] of [
      [78, 24],
      [88, 42],
      [86, 62],
      [74, 78],
    ]) {
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = c1;
    ctx.fillRect(0, 0, 256, 160);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates authentic branch flags: Iraqi Army, PMF (الحشد الشعبي), CTU (جهاز مكافحة الإرهاب), Presidential Guard, and ISIS (داعش).
 */
export function createBranchFlagTexture(branch: AlliedForceBranch | 'isis'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext('2d')!;

  if (branch === 'isis') {
    ctx.fillStyle = '#090a0d';
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(68, 28, 120, 16);
    ctx.beginPath();
    ctx.arc(128, 104, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#090a0d';
    ctx.fillRect(108, 98, 40, 10);
  } else if (branch === 'pmf') {
    // Popular Mobilization Forces (yellow shield banner + green/red crest)
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = '#14532d';
    ctx.fillRect(0, 0, 256, 22);
    ctx.fillRect(0, 138, 256, 22);
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(128, 80, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('الحشد', 128, 82);
  } else if (branch === 'ctu') {
    // Iraqi Counter Terrorism Service (all-black tactical banner with golden falcon emblem)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 236, 140);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(128, 76, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CTU', 128, 77);
  } else if (branch === 'presidential_guard') {
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 240, 144);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(128, 80, 34, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Iraqi Army / Commander (Red / White / Black + Green Allahu Akbar stars)
    ctx.fillStyle = '#ce1126';
    ctx.fillRect(0, 0, 256, 53);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 53, 256, 54);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 107, 256, 53);
    ctx.fillStyle = '#007a3d';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('الله أكبر', 128, 80);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Sleek Black Presidential Tahoe / Armored Diplomatic SUV for Convoys.
 */
export function buildTahoeSuvRig(iraqiFlagTex: THREE.Texture): TahoeSuvRig {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  const bodyMeshes: THREE.Mesh[] = [];

  const obsidianMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b0e14,
    roughness: 0.14,
    metalness: 0.72,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x09131e, roughness: 0.05, metalness: 0.94 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.18, metalness: 0.92 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.86, metalness: 0.08 });

  // SUV Body & Long Cabin
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.78, 5.25), obsidianMat);
  lowerBody.position.y = 0.82;
  lowerBody.castShadow = true;
  group.add(lowerBody);
  bodyMeshes.push(lowerBody);

  const upperCabin = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.8, 3.35), obsidianMat);
  upperCabin.position.set(0, 1.56, 0.45);
  upperCabin.castShadow = true;
  group.add(upperCabin);
  bodyMeshes.push(upperCabin);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.36, 1.48), obsidianMat);
  hood.position.set(0, 1.24, -1.88);
  group.add(hood);
  bodyMeshes.push(hood);

  // Dark Tinted Windows + Front Grille + Headlights
  const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.56, 2.95), glassMat);
  sideGlass.position.set(0, 1.56, 0.45);
  group.add(sideGlass);

  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.88, 0.62), glassMat);
  windshield.position.set(0, 1.56, -1.24);
  windshield.rotation.x = -0.32;
  windshield.rotation.y = Math.PI;
  group.add(windshield);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.44, 0.08), chromeMat);
  grille.position.set(0, 0.88, -2.64);
  group.add(grille);

  // Red & Blue VIP Escort Strobes inside grille/roof
  const strobeL = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.1, 0.16),
    new THREE.MeshBasicMaterial({ color: 0xef4444 }),
  );
  strobeL.position.set(-0.42, 2.02, -0.35);
  group.add(strobeL);
  const strobeR = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.1, 0.16),
    new THREE.MeshBasicMaterial({ color: 0x3b82f6 }),
  );
  strobeR.position.set(0.42, 2.02, -0.35);
  group.add(strobeR);

  // Diplomatic Fender Iraqi Flag
  const fenderPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.55, 5), chromeMat);
  fenderPole.position.set(-0.98, 1.46, -2.18);
  group.add(fenderPole);
  const fenderFlag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.28),
    new THREE.MeshStandardMaterial({ map: iraqiFlagTex, side: THREE.DoubleSide, roughness: 0.4 }),
  );
  fenderFlag.position.set(-0.76, 1.62, -2.18);
  group.add(fenderFlag);

  const tireGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12).rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.34, 8).rotateZ(Math.PI / 2);
  for (const wz of [-1.62, 1.62]) {
    for (const wx of [-1.06, 1.06]) {
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.position.set(wx, 0.45, wz);
      group.add(tire);
      wheels.push(tire);
      const rim = new THREE.Mesh(rimGeo, chromeMat);
      rim.position.set(wx, 0.45, wz);
      group.add(rim);
    }
  }

  return { group, wheels, bodyMeshes, strobeL, strobeR };
}

/**
 * Builds all 13 foreign nations (Luxury Modern vs Historic Imperial), border checkpoints, foreign SAMs,
 * Desert Mega-Base + 3 Underground Ballistic Tunnels, Tactical Sandbag Cover Barriers, ISIS Urban Blocks,
 * Our Presidential Palace Grounds, and Permanent HQ War Damage Meshes.
 */
export function buildWorldExtensions(
  parentGroup: THREE.Group,
  iraqiFlagTex: THREE.Texture,
  hescoTex: THREE.Texture,
  sandbagTex: THREE.Texture,
  cityFacadeTex: THREE.Texture,
  buildParkedJetFn: () => THREE.Group,
): WorldExtensionsBundle {
  const extRoot = new THREE.Group();
  parentGroup.add(extRoot);

  const branchFlagTextures: Record<AlliedForceBranch | 'isis', THREE.CanvasTexture> = {
    iraq_army: createBranchFlagTexture('iraq_army'),
    pmf: createBranchFlagTexture('pmf'),
    ctu: createBranchFlagTexture('ctu'),
    presidential_guard: createBranchFlagTexture('presidential_guard'),
    commander: createBranchFlagTexture('iraq_army'),
    isis: createBranchFlagTexture('isis'),
  };

  const nationFlagTextures = {} as Record<NationId, THREE.CanvasTexture>;
  for (const spec of NATION_SPECS) {
    nationFlagTextures[spec.id] = createNationalFlagTexture(spec);
  }

  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x9b9589, roughness: 0.86, metalness: 0.06 });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e242c, roughness: 0.34, metalness: 0.82 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x262b31, roughness: 0.88, metalness: 0.04 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.86 });
  const glassTowerMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    map: cityFacadeTex,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.22,
    roughness: 0.14,
    metalness: 0.86,
  });
  const sandstoneMat = new THREE.MeshStandardMaterial({ color: 0xd6c3a1, roughness: 0.78, metalness: 0.06 });
  const hescoMat = new THREE.MeshStandardMaterial({ color: 0xb5a485, map: hescoTex, roughness: 0.88 });
  const sandbagMat = new THREE.MeshStandardMaterial({ color: 0xa28c6c, map: sandbagTex, roughness: 0.9 });
  const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4328, roughness: 0.92 });
  const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.82 });
  const iraqiBannerMat = new THREE.MeshStandardMaterial({
    map: iraqiFlagTex,
    roughness: 0.45,
    side: THREE.DoubleSide,
  });

  // 1. CLEAR REGIONAL ZONING: URBAN CITY ZONE vs INDEPENDENT SOUTHERN DESERT MILITARY REGION + BORDER HIGHWAYS
  const cityZonePad = new THREE.Mesh(
    new THREE.PlaneGeometry(540, 785),
    new THREE.MeshStandardMaterial({ color: 0x6f7680, roughness: 0.92, metalness: 0.04 }),
  );
  cityZonePad.rotation.x = -Math.PI / 2;
  cityZonePad.position.set(-135, 0.012, -12);
  cityZonePad.receiveShadow = true;
  extRoot.add(cityZonePad);

  const desertRegionW = FORTIFIED_DESERT_REGION.maxX - FORTIFIED_DESERT_REGION.minX;
  const desertRegionD = FORTIFIED_DESERT_REGION.maxZ - FORTIFIED_DESERT_REGION.minZ;
  const desertRegionPad = new THREE.Mesh(
    new THREE.PlaneGeometry(desertRegionW, desertRegionD),
    new THREE.MeshStandardMaterial({ color: 0xd9b87c, map: sandbagTex, roughness: 0.94, metalness: 0.02 }),
  );
  desertRegionPad.rotation.x = -Math.PI / 2;
  desertRegionPad.position.set(
    (FORTIFIED_DESERT_REGION.minX + FORTIFIED_DESERT_REGION.maxX) * 0.5,
    0.014,
    (FORTIFIED_DESERT_REGION.minZ + FORTIFIED_DESERT_REGION.maxZ) * 0.5,
  );
  desertRegionPad.receiveShadow = true;
  extRoot.add(desertRegionPad);

  // Highway corridors linking City & Desert Base cleanly to all 13 Border Checkpoints (zero Desert Base encroachment)
  const highwayPositions: Array<[number, number, number, number, number]> = [
    [-110, 422, 14, 240, 0.88], // City SW boulevard -> Desert Base North Gate (-220, 470)
    [-220, -560, 12, 390, 0], // North Syria Highway (City -> SY border -> SY palace)
    [20, -565, 12, 410, 0], // North Iran Highway (City -> IR border -> IR palace)
    [20, -900, 12, 420, 0], // Far North Asia Highway (IR -> CN border -> CN palace)
    [-510, -500, 11, 480, Math.PI * 0.25], // North-West IL Corridor
    [-550, -920, 11, 460, Math.PI * 0.2], // North-West EU Corridor
    [-950, -680, 11, 480, Math.PI * 0.25], // Far West US Corridor
    [-590, -120, 12, 420, Math.PI / 2], // West Egypt Corridor
    [-590, 230, 12, 470, Math.PI / 2], // West Africa Corridor
    [-640, 570, 12, 430, Math.PI / 2], // West Saudi Corridor (west of Desert x=-460)
    [10, 865, 12, 390, 0], // Far South Kuwait Highway
    [-420, 865, 12, 390, 0], // Far South Bahrain Highway
    [-720, 910, 12, 420, Math.PI * 0.22], // Far South-West UAE Highway
    [-20, 1210, 12, 300, 0], // Far South Qatar Highway
    [0, 570, 12, 420, 0], // Eastern Gulf Express Bypass (east of Desert Base x=-110)
  ];
  for (const [hx, hz, hw, hl, rot] of highwayPositions) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(hw, hl), asphaltMat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = rot;
    road.position.set(hx, 0.025, hz);
    road.receiveShadow = true;
    extRoot.add(road);
  }

  // 2. OUR PRESIDENTIAL PALACE GROUNDS FRAMING HQ (حدائق وبوابات القصر الرئاسي العراقي)
  {
    const pg = new THREE.Group();
    const gardenMat = new THREE.MeshStandardMaterial({ color: 0x2f6834, roughness: 0.88 });
    for (const gx of [-19, 19]) {
      const lawn = new THREE.Mesh(new THREE.PlaneGeometry(10, 32), gardenMat);
      lawn.rotation.x = -Math.PI / 2;
      lawn.position.set(gx, 0.03, 25);
      pg.add(lawn);
    }
    // Royal Forecourt Marble Apron & Ceremonial Palm Trees
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(36, 0.14, 16), concreteMat);
    plaza.position.set(0, 0.05, 4.5);
    plaza.receiveShadow = true;
    pg.add(plaza);
    for (const px of [-17, -12, 12, 17]) {
      for (const pz of [14, 24, 34]) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 6.2, 6), palmTrunkMat);
        trunk.position.set(px, 3.1, pz);
        pg.add(trunk);
        const crown = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.8, 7), palmLeafMat);
        crown.position.set(px, 6.5, pz);
        pg.add(crown);
      }
    }
    extRoot.add(pg);
  }

  // 3. PERMANENT REAL WAR DAMAGE PROPS INSIDE & AROUND OUR HQ COMPLEX (أضرار حقيقية دائمة بالمقر)
  const hqDamageGroup = new THREE.Group();
  const hqDamageMeshes: THREE.Object3D[] = [];
  const scorchMat = new THREE.MeshStandardMaterial({ color: 0x171412, roughness: 0.96, metalness: 0.04 });
  const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x6b645c, roughness: 0.94 });
  const crackSpots: Array<[number, number, number, number]> = [
    [-8.5, 2.8, 11.4, 2.2],
    [8.2, 3.1, 11.4, 2.5],
    [-4.6, 0.45, 28.4, 1.2],
    [4.4, 0.45, 30.2, 1.3],
    [-12.6, 2.4, 22.0, 2.6],
    [12.6, 2.4, 29.8, 2.4],
    [0, 0.4, 34.4, 1.5],
    [-3.2, 6.55, 20.5, 2.8],
  ];
  crackSpots.forEach(([cx, cy, cz, sc]) => {
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(sc * 0.45, 0), rubbleMat);
    chunk.position.set(cx, cy, cz);
    chunk.scale.set(1.2, 0.65, 1.1);
    chunk.visible = false;
    hqDamageGroup.add(chunk);
    hqDamageMeshes.push(chunk);

    const scorch = new THREE.Mesh(new THREE.BoxGeometry(sc * 1.1, sc * 0.75, 0.75), scorchMat);
    scorch.position.set(cx, Math.max(0.4, cy), cz);
    scorch.visible = false;
    hqDamageGroup.add(scorch);
    hqDamageMeshes.push(scorch);
  });
  extRoot.add(hqDamageGroup);

  // 4. 13 INDEPENDENT PROVINCE NATIONS (LUXURY MODERN VS HISTORIC IMPERIAL) + EXTENDED BORDER CROSSINGS
  const nations: NationVisualRig[] = [];
  const towerGeo = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();

  // Instanced province urban pads, street grids & full 16-building districts across all 13 nations
  const luxNationIndices: number[] = [];
  const histNationIndices: number[] = [];
  NATION_SPECS.forEach((s, idx) => {
    if (s.tier === 'luxury_modern') luxNationIndices.push(idx);
    else histNationIndices.push(idx);
  });

  const provincePadGeo = new THREE.PlaneGeometry(190, 170);
  if (luxNationIndices.length > 0) {
    const luxPadInst = new THREE.InstancedMesh(
      provincePadGeo,
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.72, metalness: 0.14 }),
      luxNationIndices.length,
    );
    luxNationIndices.forEach((nIdx, i) => {
      const [px, , pz] = NATION_SPECS[nIdx].palacePos;
      dummy.position.set(px, 0.018, pz);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      luxPadInst.setMatrixAt(i, dummy.matrix);
    });
    luxPadInst.instanceMatrix.needsUpdate = true;
    luxPadInst.receiveShadow = true;
    extRoot.add(luxPadInst);
  }
  if (histNationIndices.length > 0) {
    const histPadInst = new THREE.InstancedMesh(
      provincePadGeo,
      new THREE.MeshStandardMaterial({ color: 0xc8b596, roughness: 0.88, metalness: 0.04 }),
      histNationIndices.length,
    );
    histNationIndices.forEach((nIdx, i) => {
      const [px, , pz] = NATION_SPECS[nIdx].palacePos;
      dummy.position.set(px, 0.018, pz);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      histPadInst.setMatrixAt(i, dummy.matrix);
    });
    histPadInst.instanceMatrix.needsUpdate = true;
    histPadInst.receiveShadow = true;
    extRoot.add(histPadInst);
  }

  // Batched internal avenues across all 13 nations (4 boulevards per nation = 52 segments in 1 draw call)
  const nationRoadInst = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), asphaltMat, NATION_SPECS.length * 4);
  let roadIdx = 0;
  NATION_SPECS.forEach((s) => {
    const [px, , pz] = s.palacePos;
    const avenues: Array<[number, number, number, number]> = [
      [px, pz + 36, 184, 10],
      [px, pz - 38, 184, 10],
      [px - 42, pz, 10, 164],
      [px + 42, pz, 10, 164],
    ];
    for (const [ax, az, aw, al] of avenues) {
      dummy.position.set(ax, 0.032, az);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(aw, al, 1);
      dummy.updateMatrix();
      nationRoadInst.setMatrixAt(roadIdx++, dummy.matrix);
    }
  });
  nationRoadInst.instanceMatrix.needsUpdate = true;
  nationRoadInst.receiveShadow = true;
  extRoot.add(nationRoadInst);

  // Full 16-block architectural district surrounding each Presidential Palace (208 buildings total batched cleanly!)
  const luxuryTowers: Array<{ x: number; z: number; w: number; h: number; d: number }> = [];
  const historicTowers: Array<{ x: number; z: number; w: number; h: number; d: number }> = [];

  for (const spec of NATION_SPECS) {
    const [px, , pz] = spec.palacePos;
    const isLux = spec.tier === 'luxury_modern';
    const samDx = spec.samPos[0] - px;
    const samDz = spec.samPos[2] - pz;
    const gateDx = spec.welcomeGatePos[0] - px;
    const gateDz = spec.welcomeGatePos[2] - pz;

    const districtOffsets: Array<[number, number, number, number, number]> = [
      [-68, -58, 15, 42, 15],
      [-24, -58, 16, 56, 16],
      [24, -58, 16, 52, 16],
      [68, -58, 15, 44, 15],
      [-68, -18, 14, 38, 14],
      [-68, 18, 14, 34, 14],
      [68, -18, 14, 40, 14],
      [68, 18, 14, 36, 14],
      [-68, 58, 14, 32, 14],
      [-24, 58, 14, 28, 14],
      [24, 58, 14, 30, 14],
      [68, 58, 14, 32, 14],
      [-48, -42, 12, 46, 12],
      [48, -42, 12, 48, 12],
      [-48, 42, 12, 26, 12],
      [48, 42, 12, 28, 12],
    ];
    const basePos = getNationMilitaryBasePos(spec);
    const baseDx = basePos[0] - px;
    const baseDz = basePos[2] - pz;
    for (const [ox, oz, w, h, d] of districtOffsets) {
      // Skip any block near the nation's SAM battery, Military Base, or welcoming palace gate avenue
      if (Math.hypot(ox - samDx, oz - samDz) < 18) continue;
      if (Math.hypot(ox - baseDx, oz - baseDz) < 22) continue;
      if (Math.hypot(ox - gateDx, oz - gateDz) < 18) continue;
      const scaledH = h * spec.towerHeightScale;
      if (isLux) {
        luxuryTowers.push({ x: px + ox, z: pz + oz, w, h: scaledH, d });
      } else {
        historicTowers.push({ x: px + ox, z: pz + oz, w, h: scaledH, d });
      }
    }

    // Distinct Hollow Enterable Presidential Palace Compound per Nation
    const pg = new THREE.Group();
    pg.position.set(px, 0, pz);

    const palaceMat = new THREE.MeshStandardMaterial({
      color: isLux ? 0xf8fafc : spec.secondaryHex,
      roughness: isLux ? 0.28 : 0.72,
      metalness: isLux ? 0.24 : 0.08,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: spec.accentHex,
      roughness: isLux ? 0.22 : 0.45,
      metalness: isLux ? 0.65 : 0.32,
    });
    const carpetMat = new THREE.MeshStandardMaterial({
      color: isLux ? 0x991b1b : 0x7f1d1d,
      roughness: 0.75,
    });
    const woodDeskMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.4 });

    // Grand Marble/Sandstone Courtyard Pad
    const yard = new THREE.Mesh(
      new THREE.BoxGeometry(58, 0.22, 56),
      isLux ? concreteMat : sandstoneMat,
    );
    yard.position.y = 0.08;
    yard.receiveShadow = true;
    pg.add(yard);

    // Royal Red Carpet Runner from courtyard gate cleanly inside Throne/Executive Hall
    const carpet = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.04, 39), carpetMat);
    carpet.position.set(0, 0.21, 4.5);
    pg.add(carpet);

    // Hollow Enterable Palace Central Hall (x: -12..+12, z: -19..-1, wide open front portal x: -3.8..+3.8)
    const hallH = isLux ? 12.6 : 10.6;
    const hallFloor = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.2, 18),
      isLux ? concreteMat : sandstoneMat,
    );
    hallFloor.position.set(0, 0.14, -10);
    hallFloor.receiveShadow = true;
    pg.add(hallFloor);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(24, hallH, 1.2), palaceMat);
    backWall.position.set(0, hallH * 0.5, -18.6);
    backWall.castShadow = true;
    pg.add(backWall);

    for (const sx of [-11.5, 11.5]) {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(1.1, hallH, 18), palaceMat);
      sideWall.position.set(sx, hallH * 0.5, -10);
      sideWall.castShadow = true;
      pg.add(sideWall);
    }

    for (const fx of [-7.9, 7.9]) {
      const frontJamb = new THREE.Mesh(new THREE.BoxGeometry(8.2, hallH, 1.2), palaceMat);
      frontJamb.position.set(fx, hallH * 0.5, -1.5);
      frontJamb.castShadow = true;
      pg.add(frontJamb);
    }

    const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(7.8, hallH - 5.4, 1.4), palaceMat);
    portalHeader.position.set(0, 5.4 + (hallH - 5.4) * 0.5, -1.5);
    pg.add(portalHeader);

    const portalCrown = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.9, 1.8), goldMat);
    portalCrown.position.set(0, 5.6, -1.3);
    pg.add(portalCrown);

    const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(24.6, 0.8, 18.4), palaceMat);
    roofSlab.position.set(0, hallH + 0.4, -10);
    pg.add(roofSlab);

    // Interior Columns & Illuminated Luxury Chandelier
    for (const cx of [-6.8, 6.8]) {
      for (const cz of [-5.2, -13.5]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, hallH - 0.5, 10), goldMat);
        col.position.set(cx, (hallH - 0.5) * 0.5 + 0.2, cz);
        pg.add(col);
      }
    }

    const chandelier = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xfef3c7 }),
    );
    chandelier.position.set(0, hallH - 1.4, -10.5);
    pg.add(chandelier);

    // Interior Back-Wall National Flag Backdrop & Gold Emblem
    const wallFlag = new THREE.Mesh(
      new THREE.PlaneGeometry(7.4, 4.4),
      new THREE.MeshStandardMaterial({
        map: nationFlagTextures[spec.id],
        roughness: 0.4,
        side: THREE.DoubleSide,
      }),
    );
    wallFlag.position.set(0, 5.4, -17.88);
    pg.add(wallFlag);

    // Presidential Executive Desk + President Throne Chair + Guest Diplomatic Armchair (Facing President!)
    const execDesk = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.92, 1.5), woodDeskMat);
    execDesk.position.set(0, 0.68, -13.2);
    pg.add(execDesk);
    const deskCrest = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.14), goldMat);
    deskCrest.position.set(0, 0.72, -12.4);
    pg.add(deskCrest);

    const buildLuxuryChair = (chairColor: number) => {
      const ch = new THREE.Group();
      const seatMat = new THREE.MeshStandardMaterial({ color: chairColor, roughness: 0.45 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.46, 1.05), seatMat);
      base.position.y = 0.25;
      ch.add(base);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 0.24), seatMat);
      back.position.set(0, 0.85, -0.42);
      ch.add(back);
      for (const ax of [-0.54, 0.54]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.98), goldMat);
        arm.position.set(ax, 0.55, 0);
        ch.add(arm);
      }
      return ch;
    };

    const presChair = buildLuxuryChair(isLux ? 0x1e293b : 0x7f1d1d);
    presChair.position.set(0, 0.24, -15.3);
    pg.add(presChair);

    const guestChair = buildLuxuryChair(0x78350f);
    guestChair.position.set(0, 0.24, -10.8);
    guestChair.rotation.y = Math.PI; // Faces North (-Z) toward Executive Desk & President!
    pg.add(guestChair);

    if (isLux) {
      // Modern Luxury: Curtain Glass Facade + Golden Crown Dome + Palm Gardens + Flanking Wings
      const glassPanel = new THREE.Mesh(new THREE.BoxGeometry(24.3, hallH - 0.6, 0.22), glassTowerMat);
      glassPanel.position.set(0, hallH * 0.5, -19.2);
      pg.add(glassPanel);

      const luxDome = new THREE.Mesh(
        new THREE.SphereGeometry(5.2, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        goldMat,
      );
      luxDome.position.set(0, hallH + 0.7, -10);
      pg.add(luxDome);

      for (const wx of [-16, 16]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(8.8, 8.5, 12), palaceMat);
        wing.position.set(wx, 4.25, -4);
        pg.add(wing);
        const palmTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 6.8, 6), palmTrunkMat);
        palmTrunk.position.set(wx, 3.4, 14);
        pg.add(palmTrunk);
        const palmLeaf = new THREE.Mesh(new THREE.ConeGeometry(2.5, 2.0, 7), palmLeafMat);
        palmLeaf.position.set(wx, 7.2, 14);
        pg.add(palmLeaf);
      }
    } else {
      // Historic Imperial: Twin Minarets/Towers + Cultural Dome
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(5.6, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
        accentMat,
      );
      dome.position.set(0, hallH + 0.6, -10);
      pg.add(dome);
      for (const mx of [-11.5, 11.5]) {
        const minaret = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 20, 10), palaceMat);
        minaret.position.set(mx, 10, -10);
        pg.add(minaret);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.8, 10), goldMat);
        cap.position.set(mx, 21.5, -10);
        pg.add(cap);
      }
    }

    // Open Grand Diplomatic Archway Gate (South Side z = +24 in local coords)
    for (const gx of [-15, 15]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(22, 4.2, 1.2), palaceMat);
      wall.position.set(gx, 2.1, 24);
      pg.add(wall);
    }
    const archTop = new THREE.Mesh(new THREE.BoxGeometry(10, 1.6, 1.5), accentMat);
    archTop.position.set(0, 5.2, 24);
    pg.add(archTop);

    // Tall National Flag Mast
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 22, 8), darkSteelMat);
    pole.position.set(14, 11, 16);
    pg.add(pole);
    const flagGeo = new THREE.PlaneGeometry(6.4, 3.8);
    flagGeo.translate(3.2, 0, 0);
    const flagMesh = new THREE.Mesh(
      flagGeo,
      new THREE.MeshStandardMaterial({
        map: nationFlagTextures[spec.id],
        roughness: 0.42,
        side: THREE.DoubleSide,
      }),
    );
    flagMesh.position.set(14.1, 19.6, 16);
    pg.add(flagMesh);

    // President NPC inside the Luxury Presidential Hall behind the Executive Desk (facing South +Z toward Guest Chair)
    const presGroup = new THREE.Group();
    presGroup.position.set(0, 0.24, -14.7);
    const suitMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 });
    const sashMat = new THREE.MeshStandardMaterial({ color: spec.accentHex, roughness: 0.4 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a78b, roughness: 0.8 });

    const pLegs = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.88, 0.26), suitMat);
    pLegs.position.y = 0.44;
    presGroup.add(pLegs);
    const pTorso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.3), suitMat);
    pTorso.position.y = 1.22;
    presGroup.add(pTorso);
    const pSash = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.72, 0.32), sashMat);
    pSash.position.y = 1.22;
    presGroup.add(pSash);
    const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), skinMat);
    pHead.position.y = 1.76;
    presGroup.add(pHead);
    const presidentRightArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.14), suitMat);
    presidentRightArm.position.set(0.35, 1.38, 0.14);
    presGroup.add(presidentRightArm);
    pg.add(presGroup);
    extRoot.add(pg);

    // Strong Foreign Military Base & Arsenal Compound inside each Nation
    const milBaseGroup = new THREE.Group();
    milBaseGroup.position.set(...basePos);
    const milPad = new THREE.Mesh(new THREE.BoxGeometry(28, 0.2, 24), concreteMat);
    milPad.position.y = 0.08;
    milBaseGroup.add(milPad);
    const cmdBunker = new THREE.Mesh(new THREE.BoxGeometry(14, 5.2, 10), hescoMat);
    cmdBunker.position.set(0, 2.6, 0);
    cmdBunker.castShadow = true;
    milBaseGroup.add(cmdBunker);
    const radarPole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 6, 8), darkSteelMat);
    radarPole.position.set(4.5, 7.6, -2);
    milBaseGroup.add(radarPole);
    const radarDish = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.9, 0.45), accentMat);
    radarDish.position.set(4.5, 10.2, -2);
    radarDish.rotation.x = -0.35;
    milBaseGroup.add(radarDish);
    for (const bx of [-9.5, 9.5]) {
      const ammoBay = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.8, 8.5), darkSteelMat);
      ammoBay.position.set(bx, 1.9, 4.5);
      milBaseGroup.add(ammoBay);
    }
    const baseFlagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 14, 6), darkSteelMat);
    baseFlagPole.position.set(-5.2, 7, -3.5);
    milBaseGroup.add(baseFlagPole);
    const baseFlag = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 2.2),
      new THREE.MeshStandardMaterial({ map: nationFlagTextures[spec.id], side: THREE.DoubleSide }),
    );
    baseFlag.position.set(-3.4, 12.6, -3.5);
    milBaseGroup.add(baseFlag);
    extRoot.add(milBaseGroup);

    // Foreign Nation Heavy Air Defense SAM Battery (stronger when at war!)
    const samGroup = new THREE.Group();
    samGroup.position.set(...spec.samPos);
    const samPad = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 6), concreteMat);
    samPad.position.y = 0.25;
    samGroup.add(samPad);
    const samMuzzles: THREE.Object3D[] = [];
    for (const [tx, tz] of [
      [-1.1, -1.1],
      [1.1, -1.1],
      [-1.1, 1.1],
      [1.1, 1.1],
    ]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 7.2, 8), darkSteelMat);
      tube.position.set(tx, 3.8, tz);
      samGroup.add(tube);
      const muz = new THREE.Object3D();
      muz.position.set(tx, 7.6, tz);
      samGroup.add(muz);
      samMuzzles.push(muz);
    }
    extRoot.add(samGroup);

    // Corner Fortification Bastions & Perimeter Gate Towers around the 200x180 Nation Wall
    const gateSide = getNationGateSide(spec);
    for (const cx of [-100, 100]) {
      for (const cz of [-90, 90]) {
        const bastion = new THREE.Mesh(new THREE.BoxGeometry(5.6, 9.6, 5.6), isLux ? concreteMat : sandstoneMat);
        bastion.position.set(px + cx, 4.8, pz + cz);
        extRoot.add(bastion);
      }
    }
    const gateCenter =
      gateSide === 'east'
        ? [px + 100, pz, true]
        : gateSide === 'north'
        ? [px, pz - 90, false]
        : [px, pz + 90, false];
    for (const side of [-14.2, 14.2]) {
      const gTower = new THREE.Mesh(new THREE.BoxGeometry(3.4, 10.2, 3.4), darkSteelMat);
      gTower.position.set(
        (gateCenter[0] as number) + (gateCenter[2] ? 0 : side),
        5.1,
        (gateCenter[1] as number) + (gateCenter[2] ? side : 0),
      );
      extRoot.add(gTower);
    }
    const wallArch = new THREE.Mesh(
      new THREE.BoxGeometry(gateCenter[2] ? 2.4 : 29.5, 1.8, gateCenter[2] ? 29.5 : 2.4),
      accentMat,
    );
    wallArch.position.set(gateCenter[0] as number, 9.2, gateCenter[1] as number);
    extRoot.add(wallArch);

    // Guarded Border Checkpoint Gate with Extended Flanking Perimeter Walls + Iraqi/Nation Flags
    const borderGroup = new THREE.Group();
    borderGroup.position.set(...spec.borderPos);
    borderGroup.rotation.y = spec.borderRotationY;
    for (const bx of [-7.5, 7.5]) {
      const booth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.4, 2.8), concreteMat);
      booth.position.set(bx, 1.7, 0);
      borderGroup.add(booth);
      const bunker = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.1, 1.4), sandbagMat);
      bunker.position.set(bx, 0.55, 2.6);
      borderGroup.add(bunker);
    }
    for (const side of [-1, 1]) {
      const frontierWall = new THREE.Mesh(new THREE.BoxGeometry(62, 3.6, 1.4), concreteMat);
      frontierWall.position.set(side * 40, 1.8, 0);
      borderGroup.add(frontierWall);
      const razorTop = new THREE.Mesh(new THREE.BoxGeometry(62, 0.55, 1.7), darkSteelMat);
      razorTop.position.set(side * 40, 3.85, 0);
      borderGroup.add(razorTop);
    }

    const borderArch = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 1.8), darkSteelMat);
    borderArch.position.set(0, 5.2, 0);
    borderGroup.add(borderArch);

    const borderGateArm = new THREE.Mesh(
      new THREE.BoxGeometry(11.5, 0.16, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 }),
    );
    borderGateArm.position.set(-5.8, 1.35, 0);
    borderGroup.add(borderGateArm);

    const irPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 8, 6), darkSteelMat);
    irPole.position.set(-8.5, 4, 2.5);
    borderGroup.add(irPole);
    const irFlag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.3), iraqiBannerMat);
    irFlag.position.set(-7.3, 7.2, 2.5);
    borderGroup.add(irFlag);

    const fnPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 8, 6), darkSteelMat);
    fnPole.position.set(8.5, 4, -2.5);
    borderGroup.add(fnPole);
    const fnFlag = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.3),
      new THREE.MeshStandardMaterial({ map: nationFlagTextures[spec.id], side: THREE.DoubleSide }),
    );
    fnFlag.position.set(7.3, 7.2, -2.5);
    borderGroup.add(fnFlag);

    extRoot.add(borderGroup);

    nations.push({
      id: spec.id,
      spec,
      palaceGroup: pg,
      palaceMat,
      palaceWorldPos: new THREE.Vector3(px, 0, pz),
      borderPos: new THREE.Vector3(...spec.borderPos),
      borderGateArm,
      samMuzzles,
      presidentGroup: presGroup,
      presidentRightArm,
      flagMesh,
    });
  }

  // Tall Destructible Nation Perimeter Walls (16 segments x 13 nations = 208 segments + Permanent Rubble Piles)
  const nationWalls: NationWallVisualRig[] = [];
  const wallRubbleGeo = new THREE.DodecahedronGeometry(1.6, 0);
  const brokenSlabGeo = new THREE.BoxGeometry(5.5, 1.2, 2.8);
  const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x4b4742, roughness: 0.94 });
  const rubbleScorchMat = new THREE.MeshStandardMaterial({ color: 0x161412, roughness: 0.96 });

  for (const ws of NATION_WALL_SPECS) {
    const spec = NATION_SPECS.find((n) => n.id === ws.nationId)!;
    const isLux = spec.tier === 'luxury_modern';
    const intactMat = new THREE.MeshStandardMaterial({
      color: isLux ? 0x64748b : 0xb89f78,
      roughness: isLux ? 0.65 : 0.86,
      metalness: isLux ? 0.22 : 0.06,
    });

    const intactGroup = new THREE.Group();
    intactGroup.position.set(ws.cx, 0, ws.cz);
    const wallBody = new THREE.Mesh(new THREE.BoxGeometry(ws.width, 7.5, ws.depth), intactMat);
    wallBody.position.y = 3.75;
    wallBody.receiveShadow = true;
    intactGroup.add(wallBody);

    const coping = new THREE.Mesh(
      new THREE.BoxGeometry(ws.width + 0.35, 0.75, ws.depth + 0.35),
      darkSteelMat,
    );
    coping.position.y = 7.75;
    intactGroup.add(coping);
    extRoot.add(intactGroup);

    const rubbleGroup = new THREE.Group();
    rubbleGroup.position.set(ws.cx, 0, ws.cz);
    rubbleGroup.visible = false;
    const scorch = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(4, ws.width * 0.9), 0.12, Math.max(4, ws.depth * 1.8)),
      rubbleScorchMat,
    );
    scorch.position.y = 0.06;
    rubbleGroup.add(scorch);

    const alongX = ws.width >= ws.depth;
    const span = Math.max(ws.width, ws.depth);
    for (let k = -2; k <= 2; k++) {
      const offset = k * (span * 0.19);
      const chunk = new THREE.Mesh(wallRubbleGeo, rubbleMat);
      chunk.position.set(alongX ? offset : (k % 2) * 1.1, 0.72, alongX ? (k % 2) * 1.1 : offset);
      chunk.scale.set(1.3, 0.75, 1.15);
      chunk.rotation.set(k * 0.35, k * 0.8, 0.2);
      rubbleGroup.add(chunk);

      if (k % 2 === 0) {
        const slab = new THREE.Mesh(brokenSlabGeo, intactMat);
        slab.position.set(alongX ? offset * 0.8 : 0.7, 0.55, alongX ? -0.6 : offset * 0.8);
        slab.rotation.set(0.18, alongX ? 0.2 : Math.PI / 2 + 0.2, 0.14);
        rubbleGroup.add(slab);
      }
    }
    extRoot.add(rubbleGroup);

    nationWalls.push({
      id: ws.id,
      nationId: ws.nationId,
      intactGroup,
      rubbleGroup,
      intactMat,
    });
  }

  // Batched Instanced Luxury Towers & Historic Towers across all 13 nations (only 2 draw calls!)
  if (luxuryTowers.length > 0) {
    const luxInst = new THREE.InstancedMesh(towerGeo, glassTowerMat, luxuryTowers.length);
    luxuryTowers.forEach((t, i) => {
      dummy.position.set(t.x, t.h * 0.5, t.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(t.w, t.h, t.d);
      dummy.updateMatrix();
      luxInst.setMatrixAt(i, dummy.matrix);
    });
    luxInst.instanceMatrix.needsUpdate = true;
    luxInst.computeBoundingSphere();
    extRoot.add(luxInst);
  }
  if (historicTowers.length > 0) {
    const histInst = new THREE.InstancedMesh(towerGeo, sandstoneMat, historicTowers.length);
    historicTowers.forEach((t, i) => {
      dummy.position.set(t.x, t.h * 0.5, t.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(t.w, t.h, t.d);
      dummy.updateMatrix();
      histInst.setMatrixAt(i, dummy.matrix);
    });
    histInst.instanceMatrix.needsUpdate = true;
    histInst.computeBoundingSphere();
    extRoot.add(histInst);
  }

  // 5. DESERT MEGA-BASE + ARSENALS + 3 UNDERGROUND BALLISTIC MISSILE TUNNELS (القاعدة الصحراوية الكبرى والأنفاق)
  const desertBaseGroup = new THREE.Group();
  const {
    centerX,
    centerZ,
    minX,
    maxX,
    minZ,
    maxZ,
    gateMinX,
    gateMaxX,
    apronCenterX,
    apronCenterZ,
    apronWidth,
    apronDepth,
    parkedJets,
  } = FORTIFIED_TRAINING_BASE;

  // Vast Desert Base Pad (220m x 180m)
  const basePad = new THREE.Mesh(
    new THREE.BoxGeometry(maxX - minX - 2, 0.16, maxZ - minZ - 2),
    concreteMat,
  );
  basePad.position.set(centerX, 0.05, centerZ);
  basePad.receiveShadow = true;
  desertBaseGroup.add(basePad);

  // Southern Aircraft Apron + Parked F-IQ22 Jets
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(apronWidth, apronDepth), asphaltMat);
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(apronCenterX, 0.15, apronCenterZ);
  desertBaseGroup.add(apron);

  const trainingParkedJets: THREE.Group[] = [];
  for (let j = 0; j < parkedJets.length; j++) {
    const jp = parkedJets[j];
    const jet = buildParkedJetFn();
    jet.position.set(jp[0], 1.15, jp[2]);
    jet.rotation.y = j === 0 ? -0.18 : 0.18;
    jet.scale.setScalar(0.86);
    desertBaseGroup.add(jet);
    trainingParkedJets.push(jet);
  }

  // Hesco Perimeter Blast Walls leaving Northern Gate Open (gateMinX..gateMaxX at z = minZ)
  const addWall = (cx: number, cz: number, w: number, d: number) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 4.2, d), hescoMat);
    wall.position.set(cx, 2.1, cz);
    wall.castShadow = true;
    wall.receiveShadow = true;
    desertBaseGroup.add(wall);
  };
  const lw = gateMinX - minX;
  addWall(minX + lw * 0.5, minZ, lw, 2.2);
  const rw = maxX - gateMaxX;
  addWall(gateMaxX + rw * 0.5, minZ, rw, 2.2);
  addWall(minX, centerZ, 2.2, maxZ - minZ);
  addWall(maxX, centerZ, 2.2, maxZ - minZ);
  addWall(centerX, maxZ, maxX - minX, 2.2);

  // North Gate Towers + Arch + Iraqi Flags
  for (const gx of [gateMinX, gateMaxX]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(2.4, 6.2, 2.6), concreteMat);
    pil.position.set(gx, 3.1, minZ);
    desertBaseGroup.add(pil);
  }
  const archBeam = new THREE.Mesh(new THREE.BoxGeometry(gateMaxX - gateMinX + 4, 1.3, 2.0), darkSteelMat);
  archBeam.position.set((gateMinX + gateMaxX) * 0.5, 6.4, minZ);
  desertBaseGroup.add(archBeam);

  // Massive Desert Munitions Arsenals (مستودعات التسليح العملاقة)
  const arsenalMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.72, metalness: 0.28 });
  for (const [ax, az] of [
    [-304, 540],
    [-304, 588],
    [-136, 540],
    [-136, 588],
  ]) {
    const depot = new THREE.Mesh(new THREE.BoxGeometry(22, 7.2, 28), arsenalMat);
    depot.position.set(ax, 3.6, az);
    depot.castShadow = true;
    desertBaseGroup.add(depot);
    const roofArch = new THREE.Mesh(
      new THREE.CylinderGeometry(11, 11, 28, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2),
      darkSteelMat,
    );
    roofArch.scale.set(1, 0.38, 1);
    roofArch.position.set(ax, 7.2, az);
    desertBaseGroup.add(roofArch);
  }

  // Desert Training Commander Podium & Iraqi Main Flag
  const podium = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.65, 4.5), concreteMat);
  podium.position.set(centerX, 0.36, 535);
  desertBaseGroup.add(podium);

  const dPole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 18, 8), darkSteelMat);
  dPole.position.set(centerX, 9, 548);
  desertBaseGroup.add(dPole);
  const dFlagGeo = new THREE.PlaneGeometry(5.2, 2.9);
  dFlagGeo.translate(2.6, 0, 0);
  const desertBaseFlag = new THREE.Mesh(dFlagGeo, iraqiBannerMat);
  desertBaseFlag.position.set(centerX + 0.08, 16.4, 548);
  desertBaseGroup.add(desertBaseFlag);

  // 3 Underground Desert Ballistic Missile Tunnels (أنفاق صواريخ باليستية بمدى 2000 متر)
  const desertTunnels: DesertTunnelSiloRig[] = DESERT_TUNNEL_SPECS.map((ts) => {
    const sg = new THREE.Group();
    sg.position.set(...ts.position);

    const collar = new THREE.Mesh(new THREE.BoxGeometry(14, 1.0, 14), concreteMat);
    collar.position.y = 0.5;
    sg.add(collar);

    const hazardRing = new THREE.Mesh(
      new THREE.BoxGeometry(14.4, 0.18, 14.4),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45, metalness: 0.3 }),
    );
    hazardRing.position.y = 1.02;
    sg.add(hazardRing);

    const pit = new THREE.Mesh(
      new THREE.BoxGeometry(9.6, 0.4, 9.6),
      new THREE.MeshBasicMaterial({ color: 0x05070a }),
    );
    pit.position.y = 0.88;
    sg.add(pit);

    const doorL = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.36, 9.8), darkSteelMat);
    doorL.position.set(-2.48, 1.16, 0);
    sg.add(doorL);

    const doorR = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.36, 9.8), darkSteelMat);
    doorR.position.set(2.48, 1.16, 0);
    sg.add(doorR);

    const launcherPivot = new THREE.Group();
    launcherPivot.position.set(0, 0.4, 0);
    const rocketTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.85, 8.8, 10),
      new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.35, metalness: 0.65 }),
    );
    rocketTube.position.y = 2.8;
    launcherPivot.add(rocketTube);
    const warhead = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 2.1, 10),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.3, metalness: 0.55 }),
    );
    warhead.position.y = 8.25;
    launcherPivot.add(warhead);

    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 9.4, 0);
    launcherPivot.add(muzzle);

    launcherPivot.position.y = -5.2; // Recessed underground until blast doors open!
    sg.add(launcherPivot);
    desertBaseGroup.add(sg);

    return {
      id: ts.id,
      code: ts.code,
      worldPos: new THREE.Vector3(...ts.position),
      doorL,
      doorR,
      launcherPivot,
      muzzle,
      openProgress: 0,
      openHoldTimer: 0,
    };
  });

  extRoot.add(desertBaseGroup);

  // 6. TACTICAL SANDBAG / HESCO COVER BARRIERS FOR SOLDIER PEEKING & BOUNDING AI
  if (COVER_BARRIER_SPECS.length > 0) {
    const coverInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1.25, 1.25),
      sandbagMat,
      COVER_BARRIER_SPECS.length,
    );
    COVER_BARRIER_SPECS.forEach((cb, idx) => {
      dummy.position.set(cb.x, 0.62, cb.z);
      dummy.rotation.set(0, cb.rotY, 0);
      dummy.scale.set(cb.width, 1, 1);
      dummy.updateMatrix();
      coverInst.setMatrixAt(idx, dummy.matrix);
    });
    coverInst.instanceMatrix.needsUpdate = true;
    coverInst.computeBoundingSphere();
    extRoot.add(coverInst);
  }

  // 7. ISIS URBAN INSURGENCY STRONGHOLDS & TUNNEL EXITS (مربعات ومقرات داعش)
  const isisFlagMat = new THREE.MeshStandardMaterial({
    map: branchFlagTextures.isis,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
  const isisBlocks: IsisBlockRig[] = ISIS_BLOCK_SPECS.map((spec) => {
    const bg = new THREE.Group();
    bg.position.set(...spec.position);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x3f3a36,
      map: hescoTex,
      roughness: 0.88,
    });
    const compound = new THREE.Mesh(new THREE.BoxGeometry(12, 4.2, 10), bodyMat);
    compound.position.y = 2.1;
    compound.castShadow = true;
    bg.add(compound);

    const tunnelHatch = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 4.4), darkSteelMat);
    tunnelHatch.position.set(0, 0.4, 7.4);
    bg.add(tunnelHatch);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 8.5, 6), darkSteelMat);
    pole.position.set(4.5, 4.25, 3.2);
    bg.add(pole);

    const flagGeo = new THREE.PlaneGeometry(3.2, 1.8);
    flagGeo.translate(1.6, 0, 0);
    const flagMesh = new THREE.Mesh(flagGeo, isisFlagMat);
    flagMesh.position.set(4.54, 7.6, 3.2);
    bg.add(flagMesh);

    extRoot.add(bg);
    return {
      id: spec.id,
      group: bg,
      worldPos: new THREE.Vector3(...spec.position),
      bodyMat,
      flagMesh,
    };
  });

  return {
    nations,
    nationWalls,
    desertTunnels,
    isisBlocks,
    trainingParkedJets,
    desertBaseFlag,
    hqDamageGroup,
    hqDamageMeshes,
    branchFlagTextures,
    nationFlagTextures,
  };
}
