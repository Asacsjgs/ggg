import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { TacticalAudio, type MissileAudioProfile } from './audio';
import { TacticalFxSystem } from './fx';
import {
  buildAirbaseWorld,
  buildCargoTransportRig,
  buildDetailedMissileMesh,
  buildEnemyMlrsUnitRig,
  buildEnemyModel,
  buildFirstPersonRig,
  buildHumveeUnitRig,
  buildParatrooperRig,
  buildPlayerJetMesh,
  buildSkyDome,
  buildSoldierUnitRig,
  buildTankUnitRig,
  createInstancedSoldierBatch,
  createProceduralTextures,
  type EnemyVisualRig,
  type FirstPersonRig,
  type HumveeRig,
  type InstancedSoldierBatch,
  type MlrsRig,
  type PlayerJetRig,
  type ProceduralTextures,
  type SkyDomeRig,
  type SoldierRig,
  type TankRig,
  type WorldDefenseBatteries,
} from './models';
import {
  NATION_SPECS,
  canLaunchDiplomaticConvoy,
  createInitialNations,
  getNationSpec,
  getPeaceUpgradeCostMultiplier,
  setNationWarState,
} from './nations';
import {
  ALLIED_HUMVEE_STATIONS,
  ALLIED_MLRS_CONFIG,
  ALLIED_MLRS_STATIONS,
  ALLIED_TANK_STATIONS,
  CARRIER_OPERATIONS,
  CITY_BUILDING_SPECS,
  CONVOY_ESCORT_STAGING,
  DEFAULT_TANK_ORDER,
  DESERT_TUNNEL_MAX_RANGE,
  DESERT_TUNNEL_SPECS,
  EMBASSY_SPECS,
  ENEMY_CONFIGS,
  FORTIFIED_TRAINING_BASE,
  FRONTLINE_SOLDIER_SLOTS,
  HUMVEE_CONFIG,
  INFRA_SPECS,
  ISIS_BLOCK_SPECS,
  MAX_ALLIED_SOLDIERS,
  MAX_BASE_HP,
  MAX_ENEMY_SOLDIERS,
  NATION_WALL_SPECS,
  NUKE_BLAST_RADIUS,
  NUKE_COOLDOWN_SECONDS,
  OUR_HQ_COMPLEX,
  PLAYER_JET_CONFIGS,
  PLAYER_TANK_CONFIG,
  RADAR_MAX_RANGE,
  SLEEPER_CELL_COOLDOWN,
  SUPPORT_OP_COOLDOWNS,
  TRAINING_GRADUATION_INTERVAL,
  WEAPON_ORDER,
  WORLD_OBSTACLES,
  WORLD_PLAYABLE_BOUNDS,
  advanceSeekerLock,
  applyBaseDamage,
  applyEmbassyAttack,
  applyInfraDamage,
  checkElectricFenceCollision,
  computeCarrierApproachStep,
  computeNukeSplashDamage,
  computeObstacleAwareStep,
  computeRadarDetection,
  computeReinforcementCount,
  computeSamFlightStep,
  computeWarWaveConfig,
  createInitialEmbassies,
  createInitialInfrastructure,
  createInitialSecretSites,
  createInitialUpgrades,
  findNearestCoverBarrier,
  getEnvironmentTacticalModifiers,
  getForeignPalaceApproachPoint,
  getNationMilitaryBasePos,
  getWalkableElevationAt,
  getWeaponStats,
  isAirDefenseSamWeapon,
  isInsideCityEmbassy,
  isInsideForeignPalace,
  isInsideOurEmbassy,
  isNearForeignPalaceChair,
  isNearHqDesk,
  isNearIntelConsole,
  isWithinDesertTunnelRange,
  purchaseUpgrade,
  resolveCircleObstacleCollision,
  resolveNegotiationAction,
  shouldMobilizeReserves,
  type ObstacleBox,
  type UpgradeSlotKey,
} from './rules';
import type {
  AlliedForceBranch,
  CombatMode,
  ConvoyDriveMode,
  EmbassyId,
  EmbassyStatus,
  EnemyType,
  GameScreenState,
  HudSnapshot,
  InfraId,
  InfraStatus,
  LockedTargetInfo,
  NationId,
  NationStatus,
  PlayerJetType,
  RadarBlip,
  SecretSiteStatus,
  SoldierCoverState,
  SquadOrder,
  SupportOpId,
  TankOrder,
  TimeOfDay,
  UpgradeState,
  WeaponType,
  WeatherType,
} from './types';
import { buildTahoeSuvRig, type TahoeSuvRig } from './worldExtensions';

// Zero-GC reusable scratch objects
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _projScreenMatrix = new THREE.Matrix4();
const _frustum = new THREE.Frustum();
const _cullSphere = new THREE.Sphere();

interface ActiveEnemy {
  id: number;
  type: EnemyType;
  hp: number;
  maxHp: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  phase: number;
  orbitSign: number;
  attackTimer: number;
  windupTimer: number;
  radarStrength: number;
  canLockHoming: boolean;
  hitFlashTimer: number;
  crashing: boolean;
  crashTimer: number;
  crashSpin: number;
  flybyPlayed: boolean;
  rig: EnemyVisualRig;
}

interface ActiveProjectile {
  active: boolean;
  fromEnemy: boolean;
  isMissile: boolean;
  isHypersonic: boolean;
  isAirDefenseSam: boolean;
  samClimbTimer: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetSpeed: number;
  damage: number;
  blastRadius: number;
  homing: boolean;
  coldTimer: number;
  turnRate: number;
  targetEnemyId: number | null;
  targetWorldPos: THREE.Vector3 | null;
  life: number;
  smokeTimer: number;
  mesh: THREE.Group;
}

interface GroundSoldierUnit {
  id: number;
  faction: 'ally' | 'enemy';
  branch: AlliedForceBranch;
  role: 'sniper' | 'infantry';
  isSleeper: boolean;
  isReserve: boolean;
  isBorderGuard: boolean;
  borderNationId: NationId | null;
  hasFlag: boolean;
  yaw: number;
  sleeperTargetEmbassy: EmbassyId | null;
  hp: number;
  maxHp: number;
  position: THREE.Vector3;
  homeSlot: THREE.Vector3;
  fireCooldown: number;
  walkPhase: number;
  crouchProgress: number;
  coverState: SoldierCoverState;
  peekTimer: number;
  peekSign: number;
  alive: boolean;
  dying: boolean;
  collapseProgress: number;
  lingerTimer: number;
  respawnTimer: number;
  rig: SoldierRig | null;
}

interface ConvoyTahoeUnit {
  id: number;
  position: THREE.Vector3;
  homeSlot: THREE.Vector3;
  yaw: number;
  rig: TahoeSuvRig;
}

interface ConvoyHumveeUnit {
  id: number;
  position: THREE.Vector3;
  homeSlot: THREE.Vector3;
  yaw: number;
  rig: HumveeRig;
  gunnerRig: SoldierRig;
}

interface IsisBlockRuntime {
  id: string;
  position: THREE.Vector3;
  hp: number;
  maxHp: number;
  destroyed: boolean;
}

interface ActiveTank {
  id: number;
  faction: 'ally' | 'enemy';
  isReserve: boolean;
  hp: number;
  maxHp: number;
  position: THREE.Vector3;
  homeSlot: THREE.Vector3;
  fireCooldown: number;
  alive: boolean;
  wreckTimer: number;
  smokeTimer: number;
  rig: TankRig;
}

interface ActiveHumvee {
  id: number;
  isReserve: boolean;
  hp: number;
  maxHp: number;
  position: THREE.Vector3;
  homeSlot: THREE.Vector3;
  fireCooldown: number;
  alive: boolean;
  smokeTimer: number;
  rig: HumveeRig;
}

interface ActiveAlliedMlrs {
  id: number;
  isReserve: boolean;
  hp: number;
  maxHp: number;
  position: THREE.Vector3;
  homeSlot: THREE.Vector3;
  fireCooldown: number;
  alive: boolean;
  smokeTimer: number;
  rig: MlrsRig;
}

interface AlliedSwarmDrone {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetPos: THREE.Vector3;
  targetEnemyId: number | null;
  life: number;
  smokeTimer: number;
  mesh: THREE.Group;
}

interface CargoFlyover {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  dropsRemaining: number;
  dropTimer: number;
  life: number;
  mesh: THREE.Group;
}

interface ParatroopDrop {
  position: THREE.Vector3;
  mesh: THREE.Group;
}

interface ActiveNuclearIcbm {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  target: THREE.Vector3;
  life: number;
  smokeTimer: number;
  mesh: THREE.Group;
}

interface ActiveSortieJet {
  id: number;
  position: THREE.Vector3;
  target: THREE.Vector3;
  phase: 'launch' | 'inbound' | 'egress';
  timer: number;
  bombsDropped: boolean;
  rig: PlayerJetRig;
}

interface CityBuildingRuntime {
  id: number;
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  tone: number;
  hp: number;
  maxHp: number;
  tiltX: number;
  tiltZ: number;
  collapsed: boolean;
}

interface ActiveFireSource {
  pos: THREE.Vector3;
  scale: number;
  life: number;
  timer: number;
}

interface DelayedBlast {
  pos: THREE.Vector3;
  delay: number;
  scale: number;
  damage: number;
}

interface EnemyMlrsUnit {
  id: number;
  embassyId: EmbassyId | NationId;
  position: THREE.Vector3;
  hp: number;
  maxHp: number;
  fireCooldown: number;
  alive: boolean;
  wreckTimer: number;
  rig: MlrsRig;
}

interface NationWallRuntime {
  id: string;
  nationId: NationId;
  cx: number;
  cz: number;
  width: number;
  depth: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  hp: number;
  maxHp: number;
  destroyed: boolean;
}

const PROJECTILE_POOL_SIZE = 104;
const BEST_SCORE_STORAGE_KEY = 'sky_aegis_skylock_best_v5';

export class SkyDefenseEngine {
  private container: HTMLElement;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  public audio = new TacticalAudio();

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private skyRig!: SkyDomeRig;
  private textures!: ProceduralTextures;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private fx!: TacticalFxSystem;
  private isSoftwareGl = false;
  private resizeObserver: ResizeObserver | null = null;

  private frameId = 0;
  private afterDrawTimerId: number | null = null;
  private lastTimestamp = 0;
  private destroyed = false;

  // World Actors
  private batteries!: WorldDefenseBatteries;
  private fpRig!: FirstPersonRig;
  private soldierBatch!: InstancedSoldierBatch;
  private batteryFireCycles: Record<string, number> = {
    patriot: 0,
    thaad: 0,
    s400: 0,
    hq9: 0,
    hypersonic: 0,
    naval: 0,
  };

  // Pooled projectiles & active entities
  private projectiles: ActiveProjectile[] = [];
  private enemies: ActiveEnemy[] = [];
  private groundUnits: GroundSoldierUnit[] = [];
  private tanks: ActiveTank[] = [];
  private humvees: ActiveHumvee[] = [];
  private alliedMlrsList: ActiveAlliedMlrs[] = [];
  private swarmDrones: AlliedSwarmDrone[] = [];
  private cargoPlanes: CargoFlyover[] = [];
  private paratroopers: ParatroopDrop[] = [];
  private sortieJets: ActiveSortieJet[] = [];
  private cityBuildings: CityBuildingRuntime[] = [];
  private activeFires: ActiveFireSource[] = [];
  private delayedBlasts: DelayedBlast[] = [];
  private enemyMlrsUnits: EnemyMlrsUnit[] = [];
  private convoyTahoes: ConvoyTahoeUnit[] = [];
  private convoyHumvees: ConvoyHumveeUnit[] = [];
  private isisBlocks: IsisBlockRuntime[] = [];
  private nationWalls: NationWallRuntime[] = [];
  private effectiveWorldObstacles: ObstacleBox[] = [...WORLD_OBSTACLES];
  private nextEnemyId = 1;
  private nextSoldierId = 1;
  private nextTankId = 1;
  private nextHumveeId = 1;
  private nextSortieId = 1;
  private nextEnemyMlrsId = 1;

  // Game & Diplomacy State (Starts 100% calm & peaceful!)
  private screenState: GameScreenState = 'title';
  private embassies: EmbassyStatus[] = createInitialEmbassies();
  private nations: NationStatus[] = createInitialNations();
  private infra: InfraStatus[] = createInitialInfrastructure();
  private secretSites: SecretSiteStatus[] = createInitialSecretSites();
  private warDeclared = false;
  private warElapsedSec = 0;
  private weaponHolstered = false;
  private holsterLerp = 0;
  private reservesMobilized = false;
  private convoyDriveMode: ConvoyDriveMode = 'manual';
  private convoyDestination: NationId | 'home' = 'ae';
  private convoySpeed = 0;
  private convoyPos = new THREE.Vector3(0, 0.04, 3.5);
  private convoyYaw = 0;
  private poetryTrackIndex = 0;
  private activePresidentNation: NationId | null = null;
  private foreignSeatedNation: NationId | null = null;
  private presidentTalkTimer = 0;
  private presidentTalkNation: NationId | null = null;
  private foreignSamTimer = 0;
  private isisInsurgentTimer = 4.5;
  private squadOrder: SquadOrder = 'follow';
  private directReserveOrder = false;
  private tankOrder: TankOrder = DEFAULT_TANK_ORDER;
  private tankTargetPoint: THREE.Vector3 | null = null;
  private lastBombardmentPos = new THREE.Vector3(0, 0, -24);
  private bombardmentCoverTimer = 0;
  private lastSoldierAudioTime = 0;
  private timeOfDay: TimeOfDay = 'day';
  private weather: WeatherType = 'clear';
  private thermalActive = false;
  private thunderTimer = 4.0;
  private ewJamTimer = 0;
  private hqSeated = false;
  private listeningActive = false;
  private truceTimer = 0;
  private truceCooldown = 0;
  private moraleBoostTimer = 0;
  private hqIntegrity: number = OUR_HQ_COMPLEX.maxIntegrity;
  private hqDoorAngleFront = 0;
  private hqDoorAngleInner = 0;
  private intelMapTimer = 0;
  private listenPingTimer = 0;
  private hqLightFlickerTimer = 0;
  private hqSamTimer = 0;
  private hqSamCycle = 0;
  private nukeCooldown = 0;
  private nukeFlashTimer = 0;
  private nukeTargetingActive = false;
  private nukeTargetPoint = new THREE.Vector3(0, 0, -148);
  private activeNuclearIcbm: ActiveNuclearIcbm | null = null;
  private sleeperCooldown = 0;
  private trainingSpawnTimer = 6.0;
  private embassyTurretTimer = 1.6;
  private carrierLandingStage: 'approach' | 'glideslope' = 'approach';
  private frameTick = 0;

  private supportCooldowns: Record<SupportOpId, number> = {
    joint_strike: 0,
    reinforce_50: 0,
    swarm_drones: 0,
    paratroopers: 0,
    ew_jam: 0,
    naval_barrage: 0,
    artillery_barrage: 0,
    desert_tunnels: 0,
  };

  private baseHp = MAX_BASE_HP;
  private credits = 12500;
  private score = 0;
  private bestScore = 0;
  private kills = 0;
  private elapsedTime = 0;

  private activeWeapon: WeaponType = 'rifle';
  private upgrades: UpgradeState = createInitialUpgrades();
  private weaponCooldowns: Record<WeaponType, number> = {
    rifle: 0,
    manpads: 0,
    heavy_aa: 0,
    patriot: 0,
    thaad: 0,
    s400: 0,
    hq9: 0,
    laser: 0,
    hypersonic: 0,
  };
  private weaponMag: Record<WeaponType, number> = {
    rifle: 30,
    manpads: 4,
    heavy_aa: 60,
    patriot: 4,
    thaad: 2,
    s400: 4,
    hq9: 4,
    laser: 45,
    hypersonic: 2,
  };
  private reloadTimers: Record<WeaponType, number> = {
    rifle: 0,
    manpads: 0,
    heavy_aa: 0,
    patriot: 0,
    thaad: 0,
    s400: 0,
    hq9: 0,
    laser: 0,
    hypersonic: 0,
  };

  private isZoomed = false;
  private ciwsTimer = 0;
  private weaponRecoil = 0;
  private radarAngle = 0;
  private trauma = 0;
  private hudEmitTimer = 0;
  private retaliationSpawnTimer = 0;
  private embassySmokeTimer = 0;

  // Walkable / Climbable Commander, Drivable Tank & Flyable Jet State
  private playerPos = new THREE.Vector3(0, 1.72, 4);
  private playerFootY = 0;
  private playerVelY = 0;
  private isGrounded = true;
  private walkBobPhase = 0;
  private combatMode: CombatMode = 'ground';
  private selectedJet: PlayerJetType = 'stealth_jet';
  private playerJetRig: PlayerJetRig | null = null;
  private jetPos = new THREE.Vector3(78, 1.25, 18);
  private jetYaw = 0;
  private jetPitch = 0;
  private jetRoll = 0;
  private jetSpeed = 0;
  private takeoffTimer = 0;
  private airCannonCooldown = 0;
  private airMissileCooldown = 0;

  private playerTankRig: TankRig | null = null;
  private playerTankPos = new THREE.Vector3(0, 0.04, -14);
  private playerTankHullYaw = 0;
  private playerTankTurretYaw = 0;
  private playerTankBarrelPitch = 0.04;
  private playerTankHp: number = PLAYER_TANK_CONFIG.maxHp;
  private playerTankCannonCd = 0;
  private playerTankCoaxCd = 0;
  private smokeScreenCd = 0;

  // Camera & Seeker State
  private aimYaw = 0;
  private aimPitch = 0.04;
  private targetYaw = 0;
  private targetPitch = 0.04;
  private camPos = new THREE.Vector3(0, 1.75, 4);
  private camLook = new THREE.Vector3(0, 4, -60);
  private seekerCandidateId: number | null = null;
  private seekerLockProgress = 0;
  private lockedTarget: LockedTargetInfo | null = null;

  // Input State
  private keysHeld = new Set<string>();
  private fireHeld = false;
  private walkInput = { x: 0, y: 0 };
  private virtualSlew = { x: 0, y: 0 };
  private touchDragging = false;
  private activeLookPointerId: number | null = null;
  private pointerDownStart = { x: 0, y: 0 };
  private lastTouchPos = { x: 0, y: 0 };

  constructor(container: HTMLElement, onHudUpdate: (snapshot: HudSnapshot) => void) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    try {
      const saved = localStorage.getItem(BEST_SCORE_STORAGE_KEY);
      if (saved) this.bestScore = Number(saved) || 0;
    } catch {
      // ignore storage failure
    }

    this.initScene();
    this.resetCityBuildings();
    this.resetNationWalls();
    this.bindEvents();
    this.initAlliedForces();
    this.applyEnvironmentVisuals();
    this.emitHud();
    this.startLoop();
  }

  private detectSoftwareGl(): boolean {
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param) || '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  private initScene(): void {
    this.isSoftwareGl = this.detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.72;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(320, this.container.clientWidth || 1280);
    const height = Math.max(180, this.container.clientHeight || 720);
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const textures = createProceduralTextures(maxAniso);
    this.textures = textures;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.scene.environment = pmrem.fromEquirectangular(textures.envSkyTex).texture;
    pmrem.dispose();

    this.skyRig = buildSkyDome(textures);
    this.scene.add(this.skyRig.group);
    this.scene.fog = new THREE.FogExp2(0xcfe4f5, 0.00042);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.15, 4500);
    this.camera.position.copy(this.camPos);
    this.scene.add(this.camera);

    this.fpRig = buildFirstPersonRig();
    this.fpRig.group.position.set(0.26, -0.2, -0.52);
    this.camera.add(this.fpRig.group);
    this.syncFirstPersonWeaponModel();

    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x4f5a38, 1.05);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff0d4, 2.85);
    this.sunLight.position.set(60, 80, 48);
    this.sunLight.castShadow = !this.isSoftwareGl;
    const shadowSize = this.isSoftwareGl ? 1024 : 2048;
    this.sunLight.shadow.mapSize.set(shadowSize, shadowSize);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 230;
    const d = 76;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    const rimLight = new THREE.DirectionalLight(0x7cb8f7, 0.58);
    rimLight.position.set(-50, 35, -65);
    this.scene.add(rimLight);

    this.batteries = buildAirbaseWorld(textures);
    this.scene.add(this.batteries.group);

    this.soldierBatch = createInstancedSoldierBatch(
      MAX_ALLIED_SOLDIERS + 12,
      MAX_ENEMY_SOLDIERS + 12,
      textures,
    );
    this.scene.add(this.soldierBatch.group);

    this.fx = new TacticalFxSystem(this.scene);

    const tracerGeo = new THREE.CylinderGeometry(0.055, 0.1, 2.4, 6);
    tracerGeo.rotateX(Math.PI / 2);
    const tracerMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    for (let i = 0; i < PROJECTILE_POOL_SIZE; i++) {
      const isTracer = i < 46;
      const isHypersonic = i >= 72 && i < 78;
      const isEnemyMissile = i >= 78;
      const mesh = isTracer
        ? (() => {
            const g = new THREE.Group();
            g.add(new THREE.Mesh(tracerGeo, tracerMat));
            return g;
          })()
        : buildDetailedMissileMesh(isEnemyMissile, isHypersonic ? 'hypersonic' : 'standard');

      mesh.visible = false;
      this.scene.add(mesh);
      this.projectiles.push({
        active: false,
        fromEnemy: false,
        isMissile: !isTracer,
        isHypersonic,
        isAirDefenseSam: false,
        samClimbTimer: 0,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        targetSpeed: 160,
        damage: 25,
        blastRadius: 4,
        homing: false,
        coldTimer: 0,
        turnRate: 0,
        targetEnemyId: null,
        targetWorldPos: null,
        life: 0,
        smokeTimer: 0,
        mesh,
      });
    }

    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.18,
        0.32,
        0.92,
      );
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(new OutputPass());
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private clearGroundForces(): void {
    for (const s of this.groundUnits) {
      if (s.rig) {
        this.scene.remove(s.rig.group);
      }
    }
    this.groundUnits = [];
    this.soldierBatch?.beginFrame();
    this.soldierBatch?.commit();

    for (const t of this.tanks) {
      this.scene.remove(t.rig.group);
    }
    this.tanks = [];
    for (const h of this.humvees) {
      this.scene.remove(h.rig.group);
    }
    this.humvees = [];
    this.alliedMlrsList = [];
    for (const d of this.swarmDrones) {
      this.scene.remove(d.mesh);
    }
    this.swarmDrones = [];
    for (const c of this.cargoPlanes) {
      this.scene.remove(c.mesh);
    }
    this.cargoPlanes = [];
    for (const p of this.paratroopers) {
      this.scene.remove(p.mesh);
    }
    this.paratroopers = [];
    for (const sj of this.sortieJets) {
      this.scene.remove(sj.rig.group);
    }
    this.sortieJets = [];
    for (const m of this.enemyMlrsUnits) {
      this.scene.remove(m.rig.group);
    }
    this.enemyMlrsUnits = [];
    for (const tv of this.convoyTahoes) {
      this.scene.remove(tv.rig.group);
    }
    this.convoyTahoes = [];
    for (const ch of this.convoyHumvees) {
      this.scene.remove(ch.rig.group);
    }
    this.convoyHumvees = [];
    this.isisBlocks = [];
    this.activeFires = [];
    this.delayedBlasts = [];
  }

  private resetCityBuildings(): void {
    const dummy = new THREE.Object3D();
    const colorTmp = new THREE.Color();
    const { bldgInst, crownTowerInst, roofInst } = this.batteries.citySkyscrapers;

    this.cityBuildings = CITY_BUILDING_SPECS.map((b, idx) => {
      const mainH = b.h * 0.72;
      const crownH = b.h * 0.28;

      dummy.position.set(b.x, mainH * 0.5, b.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(b.w, mainH, b.d);
      dummy.updateMatrix();
      bldgInst.setMatrixAt(idx, dummy.matrix);
      bldgInst.setColorAt(idx, colorTmp.setHex(b.tone));

      dummy.position.set(b.x, mainH + crownH * 0.5, b.z);
      dummy.scale.set(b.w * 0.74, crownH, b.d * 0.74);
      dummy.updateMatrix();
      crownTowerInst.setMatrixAt(idx, dummy.matrix);
      crownTowerInst.setColorAt(idx, colorTmp.setHex(b.tone));

      dummy.position.set(b.x - 1.2, b.h + 0.9, b.z + 0.8);
      dummy.scale.set(b.w * 0.32, 1.8, b.d * 0.32);
      dummy.updateMatrix();
      roofInst.setMatrixAt(idx * 2, dummy.matrix);

      dummy.position.set(b.x + 1.4, b.h + 2.4, b.z - 0.8);
      dummy.scale.set(0.32, 4.8, 0.32);
      dummy.updateMatrix();
      roofInst.setMatrixAt(idx * 2 + 1, dummy.matrix);

      return {
        id: b.id,
        x: b.x,
        z: b.z,
        w: b.w,
        h: b.h,
        d: b.d,
        tone: b.tone,
        hp: Math.round(170 + b.h * 4),
        maxHp: Math.round(170 + b.h * 4),
        tiltX: (b.id % 2 === 0 ? 1 : -1) * 0.065,
        tiltZ: (b.id % 3 === 0 ? 1 : -1) * 0.055,
        collapsed: false,
      };
    });

    bldgInst.instanceMatrix.needsUpdate = true;
    if (bldgInst.instanceColor) bldgInst.instanceColor.needsUpdate = true;
    crownTowerInst.instanceMatrix.needsUpdate = true;
    if (crownTowerInst.instanceColor) crownTowerInst.instanceColor.needsUpdate = true;
    roofInst.instanceMatrix.needsUpdate = true;
  }

  private resetNationWalls(): void {
    this.nationWalls = NATION_WALL_SPECS.map((ws) => ({
      ...ws,
      hp: ws.maxHp,
      destroyed: false,
    }));
    if (this.batteries?.extensions?.nationWalls) {
      for (const wr of this.batteries.extensions.nationWalls) {
        const spec = NATION_SPECS.find((n) => n.id === wr.nationId);
        wr.intactGroup.visible = true;
        wr.rubbleGroup.visible = false;
        wr.intactMat.color.setHex(spec?.tier === 'luxury_modern' ? 0x64748b : 0xb89f78);
      }
    }
    this.rebuildEffectiveWorldObstacles();
  }

  private rebuildEffectiveWorldObstacles(): void {
    const activeWallBoxes: ObstacleBox[] = [];
    for (const w of this.nationWalls) {
      if (!w.destroyed) {
        activeWallBoxes.push({
          minX: w.minX,
          maxX: w.maxX,
          minZ: w.minZ,
          maxZ: w.maxZ,
          kind: 'nation_wall',
        });
      }
    }
    this.effectiveWorldObstacles = [...WORLD_OBSTACLES, ...activeWallBoxes];
  }

  private addActiveFire(pos: THREE.Vector3, scale = 1, life = 18): void {
    const cleanPos = pos.clone();
    cleanPos.y = Math.max(0.6, cleanPos.y);
    if (this.activeFires.length >= 24) {
      this.activeFires.shift();
    }
    this.activeFires.push({
      pos: cleanPos,
      scale,
      life,
      timer: 0,
    });
  }

  private initAlliedForces(): void {
    this.clearGroundForces();

    // 1. 18 Frontline Guard & Special Operations Soldiers (Iraq Army, PMF, CTU Black, Presidential Guard) — ZERO commanders in city!
    for (const spec of FRONTLINE_SOLDIER_SLOTS) {
      this.spawnGroundSoldier(
        'ally',
        spec.role,
        new THREE.Vector3(...spec.pos),
        false,
        null,
        Boolean(spec.carryFlag),
        false,
        spec.branch,
      );
    }

    // 2. Active Training Commander stationed strictly inside Southern Desert Mega-Base podium
    this.spawnGroundSoldier(
      'ally',
      'infantry',
      new THREE.Vector3(...FORTIFIED_TRAINING_BASE.trainingCommanderPos),
      false,
      null,
      true,
      false,
      'commander',
    );

    // 3. Organized 182 Reserve Soldiers stationed cleanly inside Southern Desert Mega-Base
    const reserveCountTarget = MAX_ALLIED_SOLDIERS - FRONTLINE_SOLDIER_SLOTS.length - 1;
    let spawnedReserve = 0;
    const reserveBranches: AlliedForceBranch[] = ['iraq_army', 'pmf', 'ctu', 'iraq_army', 'pmf'];
    const addReserveAt = (rx: number, rz: number) => {
      if (spawnedReserve >= reserveCountTarget) return;
      const carryFlag = spawnedReserve < 20 || spawnedReserve % 3 === 0;
      const branch = reserveBranches[spawnedReserve % reserveBranches.length];
      this.spawnGroundSoldier(
        'ally',
        spawnedReserve % 5 === 0 ? 'sniper' : 'infantry',
        new THREE.Vector3(rx, 0.04, rz),
        false,
        null,
        carryFlag,
        true,
        branch,
      );
      spawnedReserve++;
    };

    // Desert Parade Block A (West-Center Yard): 15 cols x 7 rows = 105
    for (let row = 0; row < 7 && spawnedReserve < reserveCountTarget; row++) {
      for (let col = 0; col < 15 && spawnedReserve < reserveCountTarget; col++) {
        addReserveAt(-266 + col * 3.1, 526 + row * 2.8);
      }
    }
    // Desert Parade Block B (North Gate Honor Ranks): 15 cols x 2 rows = 30
    for (let row = 0; row < 2 && spawnedReserve < reserveCountTarget; row++) {
      for (let col = 0; col < 15 && spawnedReserve < reserveCountTarget; col++) {
        addReserveAt(-262 + col * 3.0, 484 + row * 2.8);
      }
    }
    // Desert Parade Block C (South Training Ground): remaining troops
    for (let row = 0; row < 3 && spawnedReserve < reserveCountTarget; row++) {
      for (let col = 0; col < 16 && spawnedReserve < reserveCountTarget; col++) {
        addReserveAt(-266 + col * 3.2, 578 + row * 2.8);
      }
    }

    // 4. Opposing Border Guards stationed beside concrete checkpoint booths (never blocking roadway center!)
    for (const spec of NATION_SPECS) {
      const bx = spec.borderPos[0];
      const bz = spec.borderPos[2];
      const sinR = Math.sin(spec.borderRotationY);
      const cosR = Math.cos(spec.borderRotationY);
      // Local +X along border wall; Local +Z normal to border wall
      const rightX = cosR;
      const rightZ = -sinR;
      const normalX = sinR;
      const normalZ = cosR;
      // Orient homeSign toward Iraq center (0, 0)
      const homeSign = normalX * -bx + normalZ * -bz >= 0 ? 1 : -1;

      for (const sideX of [-8.4, 8.4]) {
        const iraqPos = new THREE.Vector3(
          bx + rightX * sideX + normalX * (homeSign * 4.2),
          0.04,
          bz + rightZ * sideX + normalZ * (homeSign * 4.2),
        );
        this.spawnGroundSoldier('ally', 'infantry', iraqPos, false, null, sideX < 0, false, 'iraq_army', true, spec.id);
        const fPos = new THREE.Vector3(
          bx + rightX * sideX - normalX * (homeSign * 4.2),
          0.04,
          bz + rightZ * sideX - normalZ * (homeSign * 4.2),
        );
        this.spawnGroundSoldier('enemy', 'infantry', fPos, false, null, sideX > 0, false, 'iraq_army', true, spec.id);
      }
    }

    // 5. Six Allied M1A2 Main Battle Tanks (2 Frontline + 4 Desert Base Reserve)
    for (const station of ALLIED_TANK_STATIONS) {
      this.spawnTankUnit('ally', new THREE.Vector3(...station));
    }

    // 6. Four Combat Armored Humvees (2 Frontline + 2 Desert Base Reserve)
    for (const hStation of ALLIED_HUMVEE_STATIONS) {
      const rig = buildHumveeUnitRig(
        this.textures?.iraqiFlagTex,
        this.textures?.camoArmorTex,
        this.textures?.armorNormal,
      );
      const pos = new THREE.Vector3(...hStation);
      rig.group.position.copy(pos);
      this.scene.add(rig.group);
      this.humvees.push({
        id: this.nextHumveeId++,
        isReserve: pos.z >= FORTIFIED_TRAINING_BASE.minZ - 2,
        hp: HUMVEE_CONFIG.maxHp,
        maxHp: HUMVEE_CONFIG.maxHp,
        position: pos,
        homeSlot: pos.clone(),
        fireCooldown: 0.4,
        alive: true,
        smokeTimer: 0,
        rig,
      });
    }

    // 7. Two Commandable Allied MLRS Launchers inside Desert Mega-Base
    for (let idx = 0; idx < ALLIED_MLRS_STATIONS.length; idx++) {
      const rig = this.batteries.alliedMlrsUnits[idx];
      if (!rig) continue;
      const st = ALLIED_MLRS_STATIONS[idx];
      rig.group.position.set(st[0], st[1], st[2]);
      rig.group.rotation.set(0, 0, 0);
      rig.yawGroup.rotation.set(0, 0, 0);
      rig.group.visible = true;
      const pos = new THREE.Vector3(st[0], st[1], st[2]);
      this.alliedMlrsList.push({
        id: idx + 1,
        isReserve: pos.z >= FORTIFIED_TRAINING_BASE.minZ - 2,
        hp: ALLIED_MLRS_CONFIG.maxHp,
        maxHp: ALLIED_MLRS_CONFIG.maxHp,
        position: pos,
        homeSlot: pos.clone(),
        fireCooldown: 0.8 + idx * 0.4,
        alive: true,
        smokeTimer: 0,
        rig,
      });
    }

    // 8. Diplomatic & Presidential Escort Convoy (3 Troop-Manned Humvees + 5 Black Armored Tahoes)
    for (let i = 0; i < CONVOY_ESCORT_STAGING.leadHumvees.length; i++) {
      const st = CONVOY_ESCORT_STAGING.leadHumvees[i];
      const rig = buildHumveeUnitRig(
        this.textures?.iraqiFlagTex,
        this.textures?.camoArmorTex,
        this.textures?.armorNormal,
      );
      const pos = new THREE.Vector3(...st);
      rig.group.position.copy(pos);
      // Visible armed Presidential Guard / CTU troop seated cleanly inside Humvee roof turret ring (turret.y = 2.04m)
      const gunnerRig = buildSoldierUnitRig(
        'ally',
        'infantry',
        false,
        this.textures?.iraqiFlagTex,
        false,
        this.textures?.blackFlagTex,
        i === 0 ? 'ctu' : 'presidential_guard',
      );
      gunnerRig.group.position.set(0, -0.78, 0.14);
      gunnerRig.group.scale.setScalar(0.84);
      rig.turret.add(gunnerRig.group);
      this.scene.add(rig.group);
      this.convoyHumvees.push({
        id: i + 1,
        position: pos,
        homeSlot: pos.clone(),
        yaw: 0,
        rig,
        gunnerRig,
      });
    }

    for (let i = 0; i < CONVOY_ESCORT_STAGING.tahoes.length; i++) {
      const st = CONVOY_ESCORT_STAGING.tahoes[i];
      const rig = buildTahoeSuvRig(this.textures.iraqiFlagTex);
      const pos = new THREE.Vector3(...st);
      rig.group.position.copy(pos);
      this.scene.add(rig.group);
      this.convoyTahoes.push({
        id: i + 1,
        position: pos,
        homeSlot: pos.clone(),
        yaw: 0,
        rig,
      });
    }
    this.convoyPos.copy(this.convoyTahoes[0]?.position ?? new THREE.Vector3(0, 0.04, 3.5));
    this.convoyYaw = 0;

    // 9. ISIS Urban Strongholds Runtime Reset
    this.isisBlocks = ISIS_BLOCK_SPECS.map((spec) => ({
      id: spec.id,
      position: new THREE.Vector3(...spec.position),
      hp: spec.maxHp,
      maxHp: spec.maxHp,
      destroyed: false,
    }));
    for (const ib of this.batteries.extensions.isisBlocks) {
      ib.group.scale.y = 1;
      ib.bodyMat.color.setHex(0x3f3a36);
      ib.flagMesh.visible = true;
    }

    this.syncSoldierBatchVisuals();
  }

  private spawnGroundSoldier(
    faction: 'ally' | 'enemy',
    role: 'sniper' | 'infantry',
    pos: THREE.Vector3,
    isSleeper = false,
    sleeperTargetEmbassy: EmbassyId | null = null,
    carryFlag = false,
    isReserve = false,
    branch: AlliedForceBranch = 'iraq_army',
    isBorderGuard = false,
    borderNationId: NationId | null = null,
  ): void {
    const yaw = faction === 'ally' ? 0 : Math.PI;
    const articulatedCount = this.groundUnits.reduce((acc, u) => acc + (u.rig ? 1 : 0), 0);
    const shouldBuildRig =
      isSleeper ||
      branch === 'commander' ||
      (!isReserve && !isBorderGuard && articulatedCount < 24) ||
      (carryFlag && !isBorderGuard && articulatedCount < 28);

    let rig: SoldierRig | null = null;
    if (shouldBuildRig) {
      rig = buildSoldierUnitRig(
        faction,
        role,
        isSleeper,
        this.textures?.iraqiFlagTex,
        carryFlag,
        this.textures?.blackFlagTex,
        branch,
      );
      rig.group.position.copy(pos);
      rig.group.rotation.y = yaw;
      this.scene.add(rig.group);
    }

    this.groundUnits.push({
      id: this.nextSoldierId++,
      faction,
      branch,
      role,
      isSleeper,
      isReserve,
      isBorderGuard,
      borderNationId,
      hasFlag: carryFlag,
      yaw,
      sleeperTargetEmbassy,
      hp: isSleeper ? 210 : faction === 'ally' ? 140 : 75,
      maxHp: isSleeper ? 210 : faction === 'ally' ? 140 : 75,
      position: pos.clone(),
      homeSlot: pos.clone(),
      fireCooldown: 0.4 + Math.random() * 0.9,
      walkPhase: Math.random() * Math.PI * 2,
      crouchProgress: 0,
      coverState: 'advancing',
      peekTimer: Math.random() * 3.0,
      peekSign: Math.random() > 0.5 ? 1 : -1,
      alive: true,
      dying: false,
      collapseProgress: 0,
      lingerTimer: 0,
      respawnTimer: 0,
      rig,
    });
  }

  private spawnTankUnit(faction: 'ally' | 'enemy', pos: THREE.Vector3): void {
    const rig = buildTankUnitRig(
      faction,
      this.textures?.camoArmorTex,
      this.textures?.armorNormal,
      this.textures?.iraqiFlagTex,
    );
    rig.group.position.copy(pos);
    rig.group.rotation.y = faction === 'ally' ? 0 : Math.PI;
    if (this.thermalActive && faction === 'enemy') {
      for (const m of rig.bodyMeshes) {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0xfb923c);
        mat.emissiveIntensity = 1.2;
      }
    }
    this.scene.add(rig.group);
    this.tanks.push({
      id: this.nextTankId++,
      faction,
      isReserve: faction === 'ally' && pos.z >= FORTIFIED_TRAINING_BASE.minZ - 2,
      hp: faction === 'ally' ? 420 : 260,
      maxHp: faction === 'ally' ? 420 : 260,
      position: pos.clone(),
      homeSlot: pos.clone(),
      fireCooldown: 1.5 + Math.random() * 1.5,
      alive: true,
      wreckTimer: 0,
      smokeTimer: 0,
      rig,
    });
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;

    const onResize = () => {
      if (this.destroyed) return;
      const w = Math.max(320, this.container.clientWidth || 1280);
      const h = Math.max(180, this.container.clientHeight || 720);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.composer?.setSize(w, h);
      this.bloomPass?.setSize(w, h);
    };

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(onResize);
      this.resizeObserver.observe(this.container);
    }
    window.addEventListener('resize', onResize);

    const onPointerDown = (e: PointerEvent) => {
      this.audio.unlock(true);
      if (this.screenState !== 'playing') return;
      const targetEl = e.target as HTMLElement | null;
      if (targetEl && targetEl.closest('button, [data-hud-interactive="true"]')) {
        return;
      }
      if (e.button === 2) {
        if (this.nukeTargetingActive) {
          this.nukeTargetingActive = false;
          this.fx.setNukeTargetMarker(false, 0, 0);
          this.emitHud();
        } else {
          this.toggleZoom();
        }
        return;
      }
      if (this.activeLookPointerId === null) {
        this.activeLookPointerId = e.pointerId;
        this.touchDragging = true;
        this.pointerDownStart = { x: e.clientX, y: e.clientY };
        this.lastTouchPos = { x: e.clientX, y: e.clientY };
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (
        this.screenState !== 'playing' ||
        !this.touchDragging ||
        e.pointerId !== this.activeLookPointerId
      ) {
        return;
      }
      const dx = e.clientX - this.lastTouchPos.x;
      const dy = e.clientY - this.lastTouchPos.y;
      this.lastTouchPos = { x: e.clientX, y: e.clientY };

      const sens = this.isZoomed ? 0.0026 : 0.0056;
      if (this.combatMode === 'air') {
        this.jetYaw -= dx * 0.0042;
        this.jetPitch = THREE.MathUtils.clamp(this.jetPitch - dy * 0.0032, -0.58, 0.65);
      } else {
        this.targetYaw -= dx * sens;
        this.targetPitch = THREE.MathUtils.clamp(this.targetPitch - dy * sens, -0.68, 1.46);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === this.activeLookPointerId) {
        const moved = Math.hypot(
          e.clientX - this.pointerDownStart.x,
          e.clientY - this.pointerDownStart.y,
        );
        if (this.screenState === 'playing' && this.nukeTargetingActive && moved < 9) {
          this.aimNukeAtScreenPoint(e.clientX, e.clientY);
        }
        this.touchDragging = false;
        this.activeLookPointerId = null;
      }
    };

    const onWindowBlur = () => {
      this.touchDragging = false;
      this.activeLookPointerId = null;
      this.fireHeld = false;
      this.keysHeld.clear();
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onKeyDown = (e: KeyboardEvent) => {
      this.audio.unlock(true);
      this.keysHeld.add(e.code);
      if (this.screenState !== 'playing') return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.fireHeld = true;
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyJ') {
        this.jump();
      } else if (e.code === 'KeyZ') {
        this.toggleZoom();
      } else if (e.code === 'KeyT') {
        this.cycleTimeOfDay();
      } else if (e.code === 'KeyY') {
        this.cycleWeather();
      } else if (e.code === 'KeyX') {
        this.toggleThermal();
      } else if (e.code === 'KeyB') {
        this.toggleTankMode();
      } else if (e.code === 'KeyR') {
        this.toggleWeaponHolster();
      } else if (e.code === 'KeyH') {
        this.issueTankOrder('strike', true);
      } else if (e.code === 'KeyC') {
        if (this.combatMode === 'convoy') {
          this.toggleConvoyMode();
        } else if (
          this.combatMode === 'ground' &&
          (this.foreignSeatedNation !== null ||
            isNearForeignPalaceChair(this.playerPos.x, this.playerPos.z) !== null)
        ) {
          this.toggleForeignPalaceSeat();
        } else if (this.combatMode === 'ground' && (this.hqSeated || isNearHqDesk(this.playerPos.x, this.playerPos.z))) {
          this.toggleHqSeat();
        } else if (this.combatMode === 'ground' && this.isPlayerNearConvoy()) {
          this.toggleConvoyMode();
        } else {
          this.issueTankOrder('move', true);
        }
      } else if (e.code === 'KeyQ' && this.combatMode === 'tank') {
        this.deployTankSmokeScreen();
      } else if (e.code === 'KeyE') {
        const idx = WEAPON_ORDER.indexOf(this.activeWeapon);
        this.selectWeapon(WEAPON_ORDER[(idx + 1) % WEAPON_ORDER.length]);
      } else if (e.code === 'KeyF') {
        this.fireBatterySalvo();
      } else if (e.code === 'KeyG') {
        if (this.combatMode === 'ground' || this.combatMode === 'tank') {
          this.launchFighterTakeoff(this.selectedJet);
        } else {
          this.initiateCarrierLanding();
        }
      } else if (e.code === 'KeyV' && this.combatMode !== 'ground') {
        if (this.combatMode === 'air' || this.combatMode === 'takeoff' || this.combatMode === 'landing') {
          this.initiateCarrierLanding();
        } else {
          this.returnToGroundDefense();
        }
      } else if (e.code === 'KeyN') {
        this.launchNuclearStrike();
      } else if (e.code === 'Digit1') {
        this.selectWeapon('rifle');
      } else if (e.code === 'Digit2') {
        this.selectWeapon('manpads');
      } else if (e.code === 'Digit3') {
        this.selectWeapon('heavy_aa');
      } else if (e.code === 'Digit4') {
        this.selectWeapon('patriot');
      } else if (e.code === 'Digit5') {
        this.selectWeapon('thaad');
      } else if (e.code === 'Digit6') {
        this.selectWeapon('s400');
      } else if (e.code === 'Digit7') {
        this.selectWeapon('hq9');
      } else if (e.code === 'Digit8') {
        this.selectWeapon('laser');
      } else if (e.code === 'Digit9') {
        this.selectWeapon('hypersonic');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keysHeld.delete(e.code);
      if (e.code === 'Space') {
        this.fireHeld = false;
      }
    };

    this.container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('blur', onWindowBlur);
    dom.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    this.unbindListeners = () => {
      this.resizeObserver?.disconnect();
      window.removeEventListener('resize', onResize);
      this.container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('blur', onWindowBlur);
      dom.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }

  private unbindListeners: () => void = () => {};

  // ---- PUBLIC CONTROLS ----

  public startNewMission(fromUserGesture = true): void {
    this.audio.unlock(fromUserGesture);
    this.clearEnemies();
    this.clearProjectiles();

    this.screenState = 'playing';
    this.combatMode = 'ground';
    if (this.playerJetRig) {
      this.scene.remove(this.playerJetRig.group);
      this.playerJetRig = null;
    }
    if (this.playerTankRig) {
      this.scene.remove(this.playerTankRig.group);
      this.playerTankRig = null;
    }
    this.batteries.parkedJets.stealth_jet.visible = true;
    this.batteries.parkedJets.ru_jet.visible = true;

    // Reset embassies, 13 nations, palaces, city buildings, and strategic infrastructure to 100% calm peace
    this.embassies = createInitialEmbassies();
    this.nations = createInitialNations();
    this.infra = createInitialInfrastructure();
    this.fx.clearBattlefieldMarks();
    this.resetCityBuildings();
    this.resetNationWalls();
    for (const rig of this.batteries.embassies) {
      const wallColor =
        rig.id === 'us_embassy' ? 0xd8dee9 : rig.id === 'ru_embassy' ? 0xe5d8c8 : 0xdccbb4;
      rig.facadeMat.color.setHex(wallColor);
      rig.group.scale.y = 1;
    }
    for (const pRig of this.batteries.palaces) {
      const wallColor =
        pRig.id === 'us_embassy' ? 0xd8dee9 : pRig.id === 'ru_embassy' ? 0xe5d8c8 : 0xdccbb4;
      pRig.facadeMat.color.setHex(wallColor);
      pRig.group.scale.y = 1;
      pRig.presidentGroup.visible = true;
    }
    for (const nr of this.batteries.extensions.nations) {
      nr.palaceGroup.scale.y = 1;
      nr.palaceMat.color.setHex(nr.spec.tier === 'luxury_modern' ? 0xf8fafc : 0xe5d7be);
      nr.presidentGroup.visible = true;
      nr.presidentGroup.position.set(0, 0.24, -14.7);
      nr.presidentRightArm.rotation.x = 0;
      nr.borderGateArm.rotation.z = 0;
    }
    for (const ts of this.batteries.extensions.desertTunnels) {
      ts.openProgress = 0;
      ts.openHoldTimer = 0;
      ts.doorL.position.x = -2.48;
      ts.doorR.position.x = 2.48;
      ts.launcherPivot.position.y = -5.2;
    }
    for (const hm of this.batteries.extensions.hqDamageMeshes) {
      hm.visible = false;
    }
    for (const iRig of this.batteries.infraRigs) {
      const baseColor =
        iRig.id === 'power_plant'
          ? 0x8b8e94
          : iRig.id === 'comms_radar'
          ? 0x64748b
          : iRig.id === 'fuel_depot'
          ? 0xd6d3d1
          : 0x9ca3af;
      iRig.bodyMat.color.setHex(baseColor);
      iRig.group.scale.y = 1;
    }

    this.secretSites = createInitialSecretSites();
    for (const sr of this.batteries.secretSites) {
      sr.group.scale.y = 1;
      sr.bodyMat.color.setHex(0x3b3834);
      sr.beaconMesh.visible = false;
    }
    this.batteries.hqMarbleMat.color.setHex(0xdfd8cb);
    this.batteries.hqLight.intensity = 3.8;
    this.batteries.intelLight.intensity = 4.4;

    this.warDeclared = false;
    this.warElapsedSec = 0;
    this.weaponHolstered = false;
    this.holsterLerp = 0;
    this.reservesMobilized = false;
    this.convoyDriveMode = 'manual';
    this.convoyDestination = 'ae';
    this.convoySpeed = 0;
    this.poetryTrackIndex = 0;
    this.audio.stopConvoyPoetry();
    this.activePresidentNation = null;
    this.foreignSeatedNation = null;
    this.presidentTalkTimer = 0;
    this.presidentTalkNation = null;
    this.foreignSamTimer = 0;
    this.isisInsurgentTimer = 4.5;
    this.squadOrder = 'follow';
    this.directReserveOrder = false;
    this.tankOrder = DEFAULT_TANK_ORDER;
    this.tankTargetPoint = null;
    this.bombardmentCoverTimer = 0;
    this.timeOfDay = 'day';
    this.weather = 'clear';
    this.thermalActive = false;
    this.ewJamTimer = 0;
    this.hqSeated = false;
    this.listeningActive = false;
    this.truceTimer = 0;
    this.truceCooldown = 0;
    this.moraleBoostTimer = 0;
    this.hqIntegrity = OUR_HQ_COMPLEX.maxIntegrity;
    this.hqDoorAngleFront = 0;
    this.hqDoorAngleInner = 0;
    this.intelMapTimer = 0;
    this.listenPingTimer = 0;
    this.hqLightFlickerTimer = 0;
    this.hqSamTimer = 0;
    this.nukeCooldown = 0;
    this.nukeFlashTimer = 0;
    this.nukeTargetingActive = false;
    this.nukeTargetPoint.set(0, 0, -148);
    if (this.activeNuclearIcbm) {
      this.scene.remove(this.activeNuclearIcbm.mesh);
      this.activeNuclearIcbm = null;
    }
    this.fx.setNukeTargetMarker(false, 0, 0);
    this.sleeperCooldown = 0;
    this.trainingSpawnTimer = 6.0;
    this.embassyTurretTimer = 1.6;
    this.supportCooldowns = {
      joint_strike: 0,
      reinforce_50: 0,
      swarm_drones: 0,
      paratroopers: 0,
      ew_jam: 0,
      naval_barrage: 0,
      artillery_barrage: 0,
      desert_tunnels: 0,
    };

    this.baseHp = MAX_BASE_HP;
    this.credits = 12500;
    this.score = 0;
    this.kills = 0;
    this.elapsedTime = 0;
    this.upgrades = createInitialUpgrades();
    this.activeWeapon = 'rifle';
    this.isZoomed = false;
    this.seekerCandidateId = null;
    this.seekerLockProgress = 0;
    this.lockedTarget = null;
    this.trauma = 0;
    this.retaliationSpawnTimer = 0;

    this.playerTankHp = PLAYER_TANK_CONFIG.maxHp;
    this.playerTankCannonCd = 0;
    this.playerTankCoaxCd = 0;
    this.smokeScreenCd = 0;
    this.playerTankPos.set(0, 0.04, -14);
    this.playerTankHullYaw = 0;
    this.playerTankTurretYaw = 0;

    // Player starts outdoors facing -Z toward city & embassies, with Our Embassy right behind (+Z)
    this.playerFootY = 0;
    this.playerVelY = 0;
    this.isGrounded = true;
    this.playerPos.set(0, 1.72, 4);
    this.aimYaw = 0;
    this.aimPitch = 0.04;
    this.targetYaw = 0;
    this.targetPitch = 0.04;
    this.camPos.copy(this.playerPos);

    for (const w of WEAPON_ORDER) {
      const stats = getWeaponStats(w, this.upgrades);
      this.weaponMag[w] = stats.magSize;
      this.weaponCooldowns[w] = 0;
      this.reloadTimers[w] = 0;
    }

    this.initAlliedForces();
    this.applyEnvironmentVisuals();
    this.syncFirstPersonWeaponModel();
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();
    this.emitHud();
  }

  public setPaused(paused: boolean): void {
    if (this.screenState === 'title') return;
    this.screenState = paused ? 'paused' : 'playing';
    this.fireHeld = false;
    this.touchDragging = false;
    this.activeLookPointerId = null;
    this.emitHud();
  }

  public returnToTitle(): void {
    this.clearEnemies();
    this.clearProjectiles();
    this.screenState = 'title';
    this.combatMode = 'ground';
    this.thermalActive = false;
    this.poetryTrackIndex = 0;
    this.audio.stopConvoyPoetry();
    if (this.playerJetRig) {
      this.scene.remove(this.playerJetRig.group);
      this.playerJetRig = null;
    }
    if (this.playerTankRig) {
      this.scene.remove(this.playerTankRig.group);
      this.playerTankRig = null;
    }
    this.warDeclared = false;
    this.warElapsedSec = 0;
    this.weaponHolstered = false;
    this.reservesMobilized = false;
    this.directReserveOrder = false;
    this.hqSeated = false;
    this.listeningActive = false;
    this.truceTimer = 0;
    this.truceCooldown = 0;
    this.moraleBoostTimer = 0;
    this.hqIntegrity = OUR_HQ_COMPLEX.maxIntegrity;
    this.secretSites = createInitialSecretSites();
    this.nations = createInitialNations();
    this.activePresidentNation = null;
    this.foreignSeatedNation = null;
    this.presidentTalkTimer = 0;
    this.presidentTalkNation = null;
    this.tankOrder = DEFAULT_TANK_ORDER;
    this.tankTargetPoint = null;
    this.bombardmentCoverTimer = 0;
    this.embassies = createInitialEmbassies();
    this.infra = createInitialInfrastructure();
    this.fx.clearBattlefieldMarks();
    this.resetCityBuildings();
    this.resetNationWalls();
    this.fpRig.group.visible = false;
    this.initAlliedForces();
    this.applyEnvironmentVisuals();
    this.emitHud();
  }

  public cycleTimeOfDay(): void {
    this.audio.unlock(true);
    const order: TimeOfDay[] = ['day', 'sunset', 'night'];
    this.timeOfDay = order[(order.indexOf(this.timeOfDay) + 1) % order.length];
    this.applyEnvironmentVisuals();
    this.audio.playUiClick();
    this.emitHud();
  }

  public cycleWeather(): void {
    this.audio.unlock(true);
    const order: WeatherType[] = ['clear', 'fog', 'rain', 'storm'];
    this.weather = order[(order.indexOf(this.weather) + 1) % order.length];
    this.applyEnvironmentVisuals();
    this.audio.playUiClick();
    if (this.weather === 'storm') {
      this.audio.playThunder();
    }
    this.emitHud();
  }

  public triggerSupportOp(op: SupportOpId): void {
    if (this.screenState !== 'playing' || this.supportCooldowns[op] > 0) return;
    this.audio.unlock(true);
    this.supportCooldowns[op] = SUPPORT_OP_COOLDOWNS[op];

    if (op === 'joint_strike') {
      this.launchJointStrike();
    } else if (op === 'reinforce_50') {
      this.deploy50Soldiers();
    } else if (op === 'swarm_drones') {
      this.launchSwarmDrones();
    } else if (op === 'paratroopers') {
      this.launchParatrooperDrop();
    } else if (op === 'ew_jam') {
      this.ewJamTimer = 10;
      this.audio.playEwJammer();
      for (const p of this.projectiles) {
        if (p.active && p.fromEnemy) {
          p.velocity.x += (Math.random() - 0.5) * 45;
          p.velocity.y += (Math.random() - 0.5) * 20;
        }
      }
      for (const e of this.enemies) {
        e.windupTimer = 0;
        e.rig.telegraphRing.visible = false;
      }
    } else if (op === 'naval_barrage') {
      this.launchNavalBarrage();
    } else if (op === 'artillery_barrage') {
      this.launchArtilleryBarrage();
    } else if (op === 'desert_tunnels') {
      this.launchDesertTunnelStrike();
    }
    this.emitHud();
  }

  public activateSleeperCell(): void {
    if (this.screenState !== 'playing' || this.sleeperCooldown > 0) return;
    this.audio.unlock(true);
    this.sleeperCooldown = SLEEPER_CELL_COOLDOWN;
    this.audio.playSleeperAmbush();

    const targetEmb =
      this.embassies.find((e) => e.atWar) ||
      this.embassies[1] ||
      this.embassies[0];
    const spec = EMBASSY_SPECS.find((s) => s.id === targetEmb.id) ?? EMBASSY_SPECS[0];

    // Covert sleeper strike immediately triggers retaliation & breaches target embassy perimeter
    const atkRes = applyEmbassyAttack(this.embassies, spec.id, 65, 'embassy');
    this.embassies = atkRes.nextEmbassies;
    this.warDeclared = atkRes.anyWarDeclared;
    this.updateEmbassyDamageVisual(spec.id);
    if (atkRes.newlyDeclaredWar) this.onNewWarDeclared(spec.id);

    // Spawn 8 elite Sleeper Cell Commandos surrounding the target embassy/palace flanks!
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const sx = spec.position[0] + Math.cos(ang) * 19;
      const sz = spec.position[2] + Math.sin(ang) * 15;
      const pos = new THREE.Vector3(sx, 0.04, sz);
      this.spawnGroundSoldier(
        'ally',
        i % 3 === 0 ? 'sniper' : 'infantry',
        pos,
        true,
        spec.id,
      );
      this.fx.spawnFireGlow(new THREE.Vector3(sx, 1.2, sz), 0xf97316, 1.2, 3.0, 0.28, 2.0);
    }
    this.emitHud();
  }

  private deploy50Soldiers(): void {
    const aliveAllies = this.groundUnits.filter((u) => u.faction === 'ally' && u.alive).length;
    const toSpawn = computeReinforcementCount(aliveAllies, 50, MAX_ALLIED_SOLDIERS);
    this.audio.playReinforcementsHorn();
    if (toSpawn <= 0) return;

    const branches: AlliedForceBranch[] = ['iraq_army', 'pmf', 'ctu'];
    for (let i = 0; i < toSpawn; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const basePt = new THREE.Vector3(
        FORTIFIED_TRAINING_BASE.centerX + (col - 2) * 3.2,
        0.04,
        FORTIFIED_TRAINING_BASE.gateZ - 10 - row * 2.8,
      );
      this.spawnGroundSoldier(
        'ally',
        i % 5 === 0 ? 'sniper' : 'infantry',
        basePt,
        false,
        null,
        i % 3 === 0,
        false,
        branches[i % branches.length],
      );
    }
    if (this.squadOrder === 'follow') {
      this.squadOrder = 'advance';
    }
  }

  public toggleWeaponHolster(): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    this.weaponHolstered = !this.weaponHolstered;
    if (this.weaponHolstered) this.fireHeld = false;
    this.audio.playWeaponHolster(this.weaponHolstered);
    this.syncFirstPersonWeaponModel();
    this.emitHud();
  }

  public mobilizeReserves(): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    this.reservesMobilized = true;
    this.directReserveOrder = true;
    this.audio.playReserveMobilize();
    this.emitHud();
  }

  public declareWarOnNation(nationId: NationId): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    const alreadyWar = this.nations.find((n) => n.id === nationId)?.atWar;
    this.nations = setNationWarState(this.nations, nationId, true);
    this.warDeclared = true;
    if (this.foreignSeatedNation === nationId) {
      this.foreignSeatedNation = null;
      this.playerFootY = 0;
    }
    if (this.convoyDestination === nationId && this.combatMode === 'convoy') {
      this.convoyDriveMode = 'manual';
    }
    if (!alreadyWar) {
      this.retaliationSpawnTimer = 0.25;
      this.audio.playAlarmSiren();
      const spec = getNationSpec(nationId);
      const basePos = getNationMilitaryBasePos(spec);
      const tankCount = spec.militaryPower >= 1.55 ? 2 : 1;
      for (let ti = 0; ti < tankCount; ti++) {
        const safe = resolveCircleObstacleCollision(
          basePos[0] + (ti === 0 ? -10 : 10),
          basePos[2] + 15,
          3.5,
          this.effectiveWorldObstacles,
        );
        this.spawnTankUnit('enemy', new THREE.Vector3(safe.x, 0.04, safe.z));
      }
      this.spawnEnemyMlrsForNation(nationId);
      for (let gi = 0; gi < 6; gi++) {
        const safeS = resolveCircleObstacleCollision(
          basePos[0] + ((gi % 3) - 1) * 9,
          basePos[2] + 18 + Math.floor(gi / 3) * 6,
          0.9,
          this.effectiveWorldObstacles,
        );
        this.spawnGroundSoldier(
          'enemy',
          gi % 3 === 0 ? 'sniper' : 'infantry',
          new THREE.Vector3(safeS.x, 0.04, safeS.z),
          false,
          null,
          gi === 0,
        );
      }
    }
    this.emitHud();
  }

  public makePeaceWithNation(nationId: NationId): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    this.nations = setNationWarState(this.nations, nationId, false);
    this.warDeclared =
      this.nations.some((n) => n.atWar) || this.embassies.some((e) => e.atWar);
    this.audio.playNegotiationSignal('truce');
    this.emitHud();
  }

  public launchDesertTunnelStrike(): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    const tunnels = this.batteries.extensions.desertTunnels;
    const warNation = this.nations.find((n) => n.atWar);
    const revealedSecret = this.secretSites.find((s) => s.revealed && !s.destroyed);
    const targetPoint = warNation
      ? new THREE.Vector3(...getNationSpec(warNation.id).palacePos)
      : revealedSecret
      ? new THREE.Vector3(...revealedSecret.position)
      : this.resolveJointStrikeTarget();

    this.audio.playTunnelDoorsOpen();
    let launched = 0;
    for (let i = 0; i < tunnels.length; i++) {
      const silo = tunnels[i];
      silo.openHoldTimer = 8.5;
      if (!isWithinDesertTunnelRange(targetPoint.x, targetPoint.z, DESERT_TUNNEL_SPECS[i].position)) {
        continue;
      }
      const p = this.acquireProjectile(true, false, true);
      if (!p) continue;
      const origin = silo.worldPos.clone().add(new THREE.Vector3(0, 6.5, 0));
      const impact = targetPoint.clone().add(new THREE.Vector3((i - 1) * 10, 2, (i - 1) * 6));
      p.active = true;
      p.fromEnemy = false;
      p.isMissile = true;
      p.position.copy(origin);
      p.velocity.set((impact.x - origin.x) * 0.22, 86 + i * 6, (impact.z - origin.z) * 0.22);
      p.targetSpeed = 245;
      p.damage = 420;
      p.blastRadius = 22;
      p.homing = true;
      p.coldTimer = 0.35;
      p.turnRate = 5.4;
      p.targetEnemyId = null;
      p.targetWorldPos = impact;
      p.life = 12.0;
      p.smokeTimer = 0;
      p.mesh.position.copy(origin);
      p.mesh.lookAt(_vecC.copy(origin).add(p.velocity));
      p.mesh.visible = true;
      this.fx.spawnLaunchPlume(origin, true);
      launched++;
    }
    if (launched > 0) {
      this.audio.playBallisticLaunch();
      this.trauma = Math.min(1, this.trauma + 0.38);
    }
    this.emitHud();
  }

  private isPlayerNearConvoy(): boolean {
    if (
      this.convoyTahoes.some(
        (t) => Math.hypot(this.playerPos.x - t.position.x, this.playerPos.z - t.position.z) <= 14,
      )
    ) {
      return true;
    }
    return this.convoyHumvees.some(
      (h) => Math.hypot(this.playerPos.x - h.position.x, this.playerPos.z - h.position.z) <= 14,
    );
  }

  public toggleConvoyMode(): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    if (this.combatMode === 'convoy') {
      this.convoySpeed = 0;
      this.poetryTrackIndex = 0;
      this.audio.stopConvoyPoetry();
      const rawExitX = THREE.MathUtils.clamp(
        this.convoyPos.x - Math.cos(this.convoyYaw) * 4.5,
        WORLD_PLAYABLE_BOUNDS.minX + 6,
        WORLD_PLAYABLE_BOUNDS.maxX - 4,
      );
      const rawExitZ = THREE.MathUtils.clamp(
        this.convoyPos.z + Math.sin(this.convoyYaw) * 4.5,
        WORLD_PLAYABLE_BOUNDS.minZ + 6,
        WORLD_PLAYABLE_BOUNDS.maxZ - 6,
      );
      const safeExit = resolveCircleObstacleCollision(rawExitX, rawExitZ, 0.85, this.effectiveWorldObstacles);
      this.playerPos.set(safeExit.x, 1.72, safeExit.z);
      this.playerFootY = 0;
      this.playerVelY = 0;
      this.isGrounded = true;
      this.combatMode = 'ground';
      this.camera.fov = this.isZoomed ? 30 : 60;
      this.camera.updateProjectionMatrix();
      this.syncFirstPersonWeaponModel();
      this.audio.playUiClick();
      this.emitHud();
      return;
    }

    if (this.playerJetRig) {
      this.scene.remove(this.playerJetRig.group);
      this.playerJetRig = null;
      this.batteries.parkedJets.stealth_jet.visible = true;
      this.batteries.parkedJets.ru_jet.visible = true;
    }
    if (this.playerTankRig) {
      this.scene.remove(this.playerTankRig.group);
      this.playerTankRig = null;
    }

    this.hqSeated = false;
    this.fireHeld = false;
    this.weaponHolstered = true;
    this.combatMode = 'convoy';
    if (this.convoyTahoes.length > 0) {
      this.convoyPos.copy(this.convoyTahoes[0].position);
      this.convoyYaw = this.convoyTahoes[0].yaw;
    }
    this.aimYaw = this.targetYaw = this.convoyYaw;
    this.aimPitch = this.targetPitch = 0.06;
    this.fpRig.group.visible = false;
    this.camera.fov = 64;
    this.camera.updateProjectionMatrix();
    this.audio.playConvoyHorn();
    this.emitHud();
  }

  public setConvoyDriveMode(mode: ConvoyDriveMode): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    this.convoyDriveMode = mode;
    this.audio.playUiClick();
    this.emitHud();
  }

  public startDiplomaticConvoy(dest: NationId | 'home'): void {
    if (this.screenState !== 'playing') return;
    if (!canLaunchDiplomaticConvoy(this.nations, dest)) return;
    this.audio.unlock(true);
    this.convoyDestination = dest;
    this.convoyDriveMode = 'chauffeur';
    if (this.combatMode !== 'convoy') {
      this.toggleConvoyMode();
    } else {
      this.audio.playConvoyHorn();
      this.emitHud();
    }
  }

  public setPoetryTrack(trackIndex: number): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    const next = Math.max(0, Math.min(4, Math.floor(trackIndex)));
    this.poetryTrackIndex = next;
    if (next === 0) {
      this.audio.stopConvoyPoetry();
    } else {
      this.audio.setConvoyPoetryTrack(next);
    }
    this.emitHud();
  }

  public soundConvoyHorn(): void {
    this.audio.unlock(true);
    this.audio.playConvoyHorn();
  }

  public selectWeapon(weapon: WeaponType): void {
    this.audio.unlock(true);
    this.activeWeapon = weapon;
    this.weaponHolstered = false;
    this.seekerLockProgress = 0;
    this.syncFirstPersonWeaponModel();
    this.audio.playUiClick();
    this.emitHud();
  }

  public setSquadOrder(order: SquadOrder): void {
    this.audio.unlock(true);
    this.squadOrder = order;
    this.audio.playUiClick();
    this.emitHud();
  }

  public toggleForeignPalaceSeat(): void {
    if (this.screenState !== 'playing' || this.combatMode !== 'ground') return;
    this.audio.unlock(true);
    if (this.foreignSeatedNation) {
      const spec = getNationSpec(this.foreignSeatedNation);
      this.foreignSeatedNation = null;
      this.playerFootY = 0.22;
      this.playerPos.set(spec.palacePos[0], 1.92, spec.palacePos[2] - 8.6);
      this.audio.playUiClick();
      this.syncFirstPersonWeaponModel();
      this.emitHud();
      return;
    }

    const nearNation = isNearForeignPalaceChair(this.playerPos.x, this.playerPos.z);
    if (!nearNation) return;
    const status = this.nations.find((n) => n.id === nearNation);
    if (status?.atWar) return;

    const spec = getNationSpec(nearNation);
    this.foreignSeatedNation = nearNation;
    this.hqSeated = false;
    this.fireHeld = false;
    this.weaponHolstered = true;
    this.playerFootY = 0.24;
    this.playerVelY = 0;
    this.isGrounded = true;
    this.playerPos.set(spec.palacePos[0], 1.56, spec.palacePos[2] - 10.8);
    this.aimYaw = this.targetYaw = 0;
    this.aimPitch = this.targetPitch = 0.04;
    this.presidentTalkNation = nearNation;
    this.presidentTalkTimer = 2.5;
    this.audio.playPresidentTalk(Boolean(status?.allied));
    this.syncFirstPersonWeaponModel();
    this.emitHud();
  }

  public talkToForeignPresident(topic: 'greet' | 'alliance' | 'trade'): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    const targetId =
      this.foreignSeatedNation ??
      isNearForeignPalaceChair(this.playerPos.x, this.playerPos.z) ??
      isInsideForeignPalace(this.playerPos.x, this.playerPos.z);
    if (!targetId) return;
    const current = this.nations.find((n) => n.id === targetId);
    if (!current || current.atWar) return;

    this.presidentTalkNation = targetId;
    this.presidentTalkTimer = 3.2;

    if (topic === 'alliance') {
      const newlyAllied = !current.allied;
      this.nations = this.nations.map((n) => (n.id === targetId ? { ...n, allied: true } : n));
      if (newlyAllied) {
        this.score += 350;
        this.credits += 400;
        this.updateBestScore();
      }
      this.audio.playPresidentTalk(true);
    } else if (topic === 'trade') {
      this.credits += 250;
      this.score += 120;
      this.updateBestScore();
      this.audio.playPresidentTalk(Boolean(current.allied));
    } else {
      this.score += 50;
      this.updateBestScore();
      this.audio.playPresidentTalk(Boolean(current.allied));
    }
    this.emitHud();
  }

  public toggleHqSeat(): void {
    if (this.screenState !== 'playing' || this.combatMode !== 'ground') return;
    this.audio.unlock(true);
    if (!this.hqSeated) {
      if (!isNearHqDesk(this.playerPos.x, this.playerPos.z)) return;
      this.hqSeated = true;
      this.foreignSeatedNation = null;
      this.fireHeld = false;
      this.playerFootY = 0.04;
      this.playerVelY = 0;
      this.isGrounded = true;
      this.playerPos.set(0, 1.54, 33.42);
      this.aimYaw = this.targetYaw = 0;
      this.aimPitch = this.targetPitch = 0.02;
    } else {
      this.hqSeated = false;
      this.playerPos.set(0, 1.72, 32.85);
      this.playerFootY = 0;
    }
    this.audio.playUiClick();
    this.syncFirstPersonWeaponModel();
    this.emitHud();
  }

  public toggleListening(): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    this.listeningActive = !this.listeningActive;
    this.listenPingTimer = 0.15;
    this.audio.playNegotiationSignal('listen');
    this.emitHud();
  }

  public negotiate(stance: 'truce' | 'escalate'): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    const res = resolveNegotiationAction({
      stance,
      warDeclared: this.warDeclared,
      credits: this.credits,
      truceCooldown: this.truceCooldown,
    });
    if (!res.accepted) {
      this.audio.playUiClick();
      this.emitHud();
      return;
    }
    this.credits -= res.creditsSpent;
    this.truceCooldown = res.cooldownSet;
    if (stance === 'truce') {
      this.truceTimer = res.truceDuration;
      for (const e of this.enemies) {
        e.windupTimer = 0;
        e.rig.telegraphRing.visible = false;
      }
      this.audio.playNegotiationSignal('truce');
    } else {
      this.truceTimer = 0;
      this.moraleBoostTimer = res.moraleBoostDuration;
      for (const w of WEAPON_ORDER) {
        this.weaponMag[w] = getWeaponStats(w, this.upgrades).magSize;
        this.reloadTimers[w] = 0;
      }
      this.audio.playNegotiationSignal('escalate');
    }
    this.emitHud();
  }

  public scanSecretSites(): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    let newlyRevealed = 0;
    for (const s of this.secretSites) {
      if (!s.revealed && !s.destroyed) {
        s.revealed = true;
        newlyRevealed++;
        const rig = this.batteries.secretSites.find((r) => r.id === s.id);
        if (rig) rig.beaconMesh.visible = true;
      }
    }
    this.intelMapTimer = 0;
    this.audio.playIntelIntercept();
    if (newlyRevealed > 0) {
      this.score += newlyRevealed * 75;
      this.updateBestScore();
    }
    this.emitHud();
  }

  private getCrosshairGroundPoint(maxRange = 360): THREE.Vector3 {
    const fwd = _vecA.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    let gx: number;
    let gz: number;
    if (fwd.y < -0.04) {
      const t = Math.min(maxRange, Math.max(18, -this.camera.position.y / fwd.y));
      gx = this.camera.position.x + fwd.x * t;
      gz = this.camera.position.z + fwd.z * t;
    } else {
      const hLen = Math.hypot(fwd.x, fwd.z) || 1;
      gx = this.camera.position.x + (fwd.x / hLen) * 95;
      gz = this.camera.position.z + (fwd.z / hLen) * 95;
    }
    gx = THREE.MathUtils.clamp(gx, WORLD_PLAYABLE_BOUNDS.minX + 10, WORLD_PLAYABLE_BOUNDS.maxX - 8);
    gz = THREE.MathUtils.clamp(gz, WORLD_PLAYABLE_BOUNDS.minZ + 10, WORLD_PLAYABLE_BOUNDS.maxZ - 10);
    const safe = resolveCircleObstacleCollision(gx, gz, 3.6, this.effectiveWorldObstacles);
    return new THREE.Vector3(safe.x, 0.04, safe.z);
  }

  public issueTankOrder(order: TankOrder, useCrosshair = true): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    this.tankOrder = order;

    if (order === 'hold') {
      this.tankTargetPoint = null;
    } else if (order === 'move') {
      this.tankTargetPoint = useCrosshair
        ? this.getCrosshairGroundPoint(320)
        : new THREE.Vector3(0, 0.04, -56);
    } else {
      const eTank = this.tanks.find((x) => x.faction === 'enemy' && x.alive);
      const eMlrs = this.enemyMlrsUnits.find((m) => m.alive);
      if (useCrosshair) {
        const aimPt = this.getCrosshairGroundPoint(360);
        this.tankTargetPoint = aimPt;
      } else if (eTank) {
        this.tankTargetPoint = eTank.position.clone();
      } else if (eMlrs) {
        this.tankTargetPoint = eMlrs.position.clone();
      } else {
        this.tankTargetPoint = this.resolveJointStrikeTarget();
      }
      // Prime allied Tanks, Humvees, and Allied MLRS so commanded salvo begins right away
      let idx = 0;
      for (const tk of this.tanks) {
        if (tk.faction === 'ally' && tk.alive) {
          tk.fireCooldown = Math.min(tk.fireCooldown, 0.08 + idx * 0.14);
          idx++;
        }
      }
      let hIdx = 0;
      for (const hm of this.humvees) {
        if (hm.alive) {
          hm.fireCooldown = Math.min(hm.fireCooldown, 0.05 + hIdx * 0.08);
          hIdx++;
        }
      }
      let mIdx = 0;
      for (const am of this.alliedMlrsList) {
        if (am.alive) {
          am.fireCooldown = Math.min(am.fireCooldown, 0.15 + mIdx * 0.35);
          mIdx++;
        }
      }
    }

    this.audio.playUiClick();
    this.emitHud();
  }

  public toggleMute(): void {
    this.audio.toggleMute();
    this.emitHud();
  }

  public toggleZoom(): void {
    this.isZoomed = !this.isZoomed;
    this.camera.fov = this.isZoomed ? 30 : this.combatMode === 'air' ? 68 : 60;
    this.camera.updateProjectionMatrix();
    this.audio.playUiClick();
    this.emitHud();
  }

  public setVirtualFire(firing: boolean): void {
    this.audio.unlock(true);
    this.fireHeld = firing;
  }

  public setWalkInput(x: number, y: number): void {
    this.walkInput.x = THREE.MathUtils.clamp(x, -1, 1);
    this.walkInput.y = THREE.MathUtils.clamp(y, -1, 1);
  }

  public setVirtualSlew(x: number, y: number): void {
    this.virtualSlew.x = THREE.MathUtils.clamp(x, -1, 1);
    this.virtualSlew.y = THREE.MathUtils.clamp(y, -1, 1);
  }

  public buyUpgrade(slot: UpgradeSlotKey): void {
    this.audio.unlock(true);
    const costMult = getPeaceUpgradeCostMultiplier(this.warDeclared);
    const res = purchaseUpgrade(slot, this.upgrades, this.credits, costMult);
    if (!res.purchased) return;
    this.upgrades = res.upgrades;
    this.credits = res.credits;
    for (const w of WEAPON_ORDER) {
      this.weaponMag[w] = getWeaponStats(w, this.upgrades).magSize;
      this.reloadTimers[w] = 0;
    }
    this.audio.playUpgrade();
    this.emitHud();
  }

  public jump(): void {
    if (this.screenState !== 'playing' || this.combatMode !== 'ground') return;
    if (!this.isGrounded) return;
    this.audio.unlock(true);
    this.playerVelY = 10.2;
    this.isGrounded = false;
    this.audio.playUiClick();
  }

  public toggleThermal(): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    this.thermalActive = !this.thermalActive;
    this.applyEnvironmentVisuals();
    this.audio.playUiClick();
    this.emitHud();
  }

  public toggleTankMode(): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    if (this.combatMode === 'tank') {
      this.returnToGroundDefense();
      return;
    }
    if (this.combatMode === 'convoy') {
      this.poetryTrackIndex = 0;
      this.audio.stopConvoyPoetry();
    }
    if (this.playerJetRig) {
      this.scene.remove(this.playerJetRig.group);
      this.playerJetRig = null;
      this.batteries.parkedJets.stealth_jet.visible = true;
      this.batteries.parkedJets.ru_jet.visible = true;
    }
    if (!this.playerTankRig) {
      this.playerTankRig = buildTankUnitRig(
        'ally',
        this.textures?.camoArmorTex,
        this.textures?.armorNormal,
        this.textures?.iraqiFlagTex,
      );
    }
    this.playerTankHp = PLAYER_TANK_CONFIG.maxHp;
    this.playerTankPos.set(
      THREE.MathUtils.clamp(this.playerPos.x, -110, 110),
      0.04,
      THREE.MathUtils.clamp(this.playerPos.z - 6, -180, 4),
    );
    this.playerTankHullYaw = this.aimYaw;
    this.playerTankTurretYaw = this.aimYaw;
    this.playerTankBarrelPitch = 0.04;
    this.targetPitch = 0.04;
    this.aimPitch = 0.04;
    this.playerTankRig.group.position.copy(this.playerTankPos);
    this.playerTankRig.group.rotation.y = this.playerTankHullYaw;
    this.scene.add(this.playerTankRig.group);

    this.combatMode = 'tank';
    this.isZoomed = false;
    this.fpRig.group.visible = false;
    this.camera.fov = 62;
    this.camera.updateProjectionMatrix();
    this.applyEnvironmentVisuals();
    this.audio.playTankCannon();
    this.emitHud();
  }

  public deployTankSmokeScreen(): void {
    if (this.screenState !== 'playing' || this.combatMode !== 'tank' || this.smokeScreenCd > 0) return;
    this.audio.unlock(true);
    this.smokeScreenCd = 9.0;
    this.fx.spawnSmokeScreen(this.playerTankPos);
    this.audio.playEwJammer();
    this.emitHud();
  }

  public launchFighterTakeoff(jetType: PlayerJetType): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    this.selectedJet = jetType;

    if (this.combatMode === 'convoy') {
      this.poetryTrackIndex = 0;
      this.audio.stopConvoyPoetry();
    }
    if (this.playerTankRig) {
      this.scene.remove(this.playerTankRig.group);
      this.playerTankRig = null;
    }
    this.batteries.parkedJets.stealth_jet.visible = false;
    this.batteries.parkedJets.ru_jet.visible = true;

    if (this.playerJetRig) {
      this.scene.remove(this.playerJetRig.group);
    }
    this.playerJetRig = buildPlayerJetMesh(jetType, this.textures?.iraqiFlagTex);
    this.jetPos.set(...CARRIER_OPERATIONS.catapultStart);
    this.jetYaw = CARRIER_OPERATIONS.launchHeadingRad;
    this.jetPitch = 0.02;
    this.jetRoll = 0;
    this.jetSpeed = 18;
    this.takeoffTimer = 2.2;
    this.combatMode = 'takeoff';
    this.isZoomed = false;
    this.fpRig.group.visible = false;

    this.playerJetRig.group.position.copy(this.jetPos);
    this.scene.add(this.playerJetRig.group);

    this.fx.spawnSmokePuff(this.jetPos, 0xe2e8f0, 1.4, 4.2, 1.1, 0.5, 1.4, 1.1);
    this.audio.playJetTakeoffAfterburner();
    this.camera.fov = 66;
    this.camera.updateProjectionMatrix();
    this.emitHud();
  }

  public initiateCarrierLanding(): void {
    if (this.screenState !== 'playing') return;
    if (this.combatMode === 'ground' || this.combatMode === 'tank' || this.combatMode === 'convoy') {
      this.returnToGroundDefense();
      return;
    }
    if (this.combatMode === 'landing') {
      // Second press completes carrier deck arrest immediately
      this.returnToGroundDefense();
      return;
    }
    this.audio.unlock(true);
    this.fireHeld = false;
    this.combatMode = 'landing';
    this.carrierLandingStage =
      this.jetPos.z < -165 && this.jetPos.x > 160 ? 'glideslope' : 'approach';
    this.audio.playUiClick();
    this.emitHud();
  }

  public returnToGroundDefense(): void {
    if (this.combatMode === 'ground') return;
    if (this.combatMode === 'convoy') {
      this.toggleConvoyMode();
      return;
    }
    if (this.combatMode === 'tank') {
      this.playerPos.set(
        THREE.MathUtils.clamp(this.playerTankPos.x + 3.2, WORLD_PLAYABLE_BOUNDS.minX + 6, WORLD_PLAYABLE_BOUNDS.maxX - 4),
        1.72,
        THREE.MathUtils.clamp(this.playerTankPos.z, WORLD_PLAYABLE_BOUNDS.minZ + 6, WORLD_PLAYABLE_BOUNDS.maxZ - 6),
      );
      this.playerFootY = 0;
      this.playerVelY = 0;
      this.isGrounded = true;
    }
    this.combatMode = 'ground';
    if (this.playerJetRig) {
      this.scene.remove(this.playerJetRig.group);
      this.playerJetRig = null;
    }
    if (this.playerTankRig) {
      this.scene.remove(this.playerTankRig.group);
      this.playerTankRig = null;
    }
    this.batteries.parkedJets.stealth_jet.visible = true;
    this.batteries.parkedJets.ru_jet.visible = true;
    this.aimYaw = this.targetYaw = 0;
    this.aimPitch = this.targetPitch = 0.04;
    this.camera.fov = this.isZoomed ? 30 : 60;
    this.camera.updateProjectionMatrix();
    this.syncFirstPersonWeaponModel();
    this.audio.playUiClick();
    this.emitHud();
  }

  private updateNukeGroundAim(): void {
    if (!this.nukeTargetingActive) return;
    const fwd = _vecA.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    if (fwd.y < -0.05) {
      const t = Math.min(420, Math.max(8, -this.camera.position.y / fwd.y));
      this.nukeTargetPoint.set(
        THREE.MathUtils.clamp(this.camera.position.x + fwd.x * t, WORLD_PLAYABLE_BOUNDS.minX + 10, WORLD_PLAYABLE_BOUNDS.maxX + 80),
        0,
        THREE.MathUtils.clamp(this.camera.position.z + fwd.z * t, WORLD_PLAYABLE_BOUNDS.minZ + 10, WORLD_PLAYABLE_BOUNDS.maxZ - 20),
      );
    } else {
      const hLen = Math.hypot(fwd.x, fwd.z) || 1;
      this.nukeTargetPoint.set(
        THREE.MathUtils.clamp(this.camera.position.x + (fwd.x / hLen) * 145, WORLD_PLAYABLE_BOUNDS.minX + 10, WORLD_PLAYABLE_BOUNDS.maxX + 80),
        0,
        THREE.MathUtils.clamp(this.camera.position.z + (fwd.z / hLen) * 145, WORLD_PLAYABLE_BOUNDS.minZ + 10, WORLD_PLAYABLE_BOUNDS.maxZ - 20),
      );
    }
  }

  private aimNukeAtScreenPoint(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    const rayVec = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(this.camera);
    const dir = rayVec.sub(this.camera.position).normalize();
    if (dir.y < -0.03) {
      const t = Math.min(440, Math.max(8, -this.camera.position.y / dir.y));
      this.nukeTargetPoint.set(
        THREE.MathUtils.clamp(this.camera.position.x + dir.x * t, WORLD_PLAYABLE_BOUNDS.minX + 10, WORLD_PLAYABLE_BOUNDS.maxX + 80),
        0,
        THREE.MathUtils.clamp(this.camera.position.z + dir.z * t, WORLD_PLAYABLE_BOUNDS.minZ + 10, WORLD_PLAYABLE_BOUNDS.maxZ - 20),
      );
      this.audio.playNukeTargetLock();
      this.emitHud();
    }
  }

  public cancelNukeTargeting(): void {
    if (!this.nukeTargetingActive) return;
    this.nukeTargetingActive = false;
    this.fx.setNukeTargetMarker(false, 0, 0);
    this.emitHud();
  }

  public launchNuclearStrike(): void {
    if (this.screenState !== 'playing' || this.nukeCooldown > 0 || this.activeNuclearIcbm) return;
    this.audio.unlock(true);

    if (!this.nukeTargetingActive) {
      this.nukeTargetingActive = true;
      this.updateNukeGroundAim();
      this.audio.playNukeTargetLock();
      this.emitHud();
      return;
    }

    // Confirm and launch realistic 3D Strategic Nuclear ICBM to the chosen target coordinate!
    this.nukeTargetingActive = false;
    this.fx.setNukeTargetMarker(false, 0, 0);
    this.nukeCooldown = NUKE_COOLDOWN_SECONDS;

    const launchOrigin = new THREE.Vector3(-18, 4.5, -14);
    const mesh = buildDetailedMissileMesh(false, 'nuclear');
    mesh.position.copy(launchOrigin);
    this.scene.add(mesh);

    this.activeNuclearIcbm = {
      position: launchOrigin,
      velocity: new THREE.Vector3(0, 62, -18),
      target: new THREE.Vector3(this.nukeTargetPoint.x, 1.5, this.nukeTargetPoint.z),
      life: 9.0,
      smokeTimer: 0,
      mesh,
    };

    this.fx.spawnLaunchPlume(launchOrigin, true);
    this.audio.playHypersonicLaunch();
    this.trauma = Math.min(1, this.trauma + 0.45);
    this.emitHud();
  }

  private detonateNuclearAt(impactPos: THREE.Vector3): void {
    this.nukeFlashTimer = 0.95;
    this.trauma = 1.0;

    this.fx.spawnNuclearBlast(impactPos, this.camera.position);
    this.audio.playNuclearDetonation();

    // Splash damage scaled accurately from chosen nuclear ground zero
    for (const rig of this.batteries.embassies) {
      const dmg = computeNukeSplashDamage(
        impactPos.x,
        impactPos.z,
        rig.worldPos.x,
        rig.worldPos.z,
        NUKE_BLAST_RADIUS + 30,
        420,
      );
      if (dmg > 0) {
        const res = applyEmbassyAttack(this.embassies, rig.id, dmg, 'embassy');
        this.embassies = res.nextEmbassies;
        this.warDeclared = res.anyWarDeclared;
        this.updateEmbassyDamageVisual(rig.id);
        if (res.newlyDeclaredWar) this.onNewWarDeclared(rig.id);
      }
    }

    for (const pRig of this.batteries.palaces) {
      const dmg = computeNukeSplashDamage(
        impactPos.x,
        impactPos.z,
        pRig.worldPos.x,
        pRig.worldPos.z,
        NUKE_BLAST_RADIUS + 30,
        480,
      );
      if (dmg > 0) {
        const res = applyEmbassyAttack(this.embassies, pRig.id, dmg, 'palace');
        this.embassies = res.nextEmbassies;
        this.warDeclared = res.anyWarDeclared;
        this.updateEmbassyDamageVisual(pRig.id);
        if (res.newlyDeclaredWar) this.onNewWarDeclared(pRig.id);
      }
    }

    for (const iRig of this.batteries.infraRigs) {
      const dmg = computeNukeSplashDamage(
        impactPos.x,
        impactPos.z,
        iRig.worldPos.x,
        iRig.worldPos.z,
        NUKE_BLAST_RADIUS + 20,
        360,
      );
      if (dmg > 0) {
        const res = applyInfraDamage(this.infra, iRig.id, dmg);
        this.infra = res.nextInfra;
        this.updateInfraDamageVisual(iRig.id);
      }
    }

    for (const enemy of this.enemies) {
      const dmg = computeNukeSplashDamage(
        impactPos.x,
        impactPos.z,
        enemy.position.x,
        enemy.position.z,
        NUKE_BLAST_RADIUS + 55,
        550,
      );
      if (!enemy.crashing && dmg > 0) {
        enemy.hp = 0;
        enemy.crashing = true;
        enemy.crashSpin = (Math.random() > 0.5 ? 1 : -1) * 4.2;
        this.kills++;
        this.score += ENEMY_CONFIGS[enemy.type].rewardScore;
        this.credits += ENEMY_CONFIGS[enemy.type].rewardCredits;
      }
    }

    for (const s of this.groundUnits) {
      if (s.faction === 'enemy' && s.alive && !s.dying) {
        const dmg = computeNukeSplashDamage(
          impactPos.x,
          impactPos.z,
          s.position.x,
          s.position.z,
          NUKE_BLAST_RADIUS + 15,
          300,
        );
        if (dmg > 0) {
          s.hp = 0;
          s.dying = true;
          s.collapseProgress = 0;
          this.kills++;
          this.credits += 75;
          this.score += 110;
        }
      }
    }

    for (const t of this.tanks) {
      if (t.faction === 'enemy' && t.alive) {
        const dmg = computeNukeSplashDamage(
          impactPos.x,
          impactPos.z,
          t.position.x,
          t.position.z,
          NUKE_BLAST_RADIUS + 20,
          450,
        );
        if (dmg > 0) {
          this.damageEnemyTank(t, dmg);
        }
      }
    }

    for (const b of this.cityBuildings) {
      const dmg = computeNukeSplashDamage(
        impactPos.x,
        impactPos.z,
        b.x,
        b.z,
        NUKE_BLAST_RADIUS + 28,
        520,
      );
      if (dmg > 0) {
        this.damageCityBuilding(b, dmg, new THREE.Vector3(b.x, Math.min(b.h * 0.45, 10), b.z));
      }
    }

    for (const m of this.enemyMlrsUnits) {
      if (!m.alive) continue;
      const dmg = computeNukeSplashDamage(
        impactPos.x,
        impactPos.z,
        m.position.x,
        m.position.z,
        NUKE_BLAST_RADIUS + 22,
        420,
      );
      if (dmg > 0) {
        this.damageEnemyMlrs(m, dmg);
      }
    }

    let wallBreachedByNuke = false;
    for (const w of this.nationWalls) {
      if (w.destroyed) continue;
      const dmg = computeNukeSplashDamage(
        impactPos.x,
        impactPos.z,
        w.cx,
        w.cz,
        NUKE_BLAST_RADIUS + 35,
        620,
      );
      if (dmg > 0) {
        w.hp = Math.max(0, w.hp - dmg);
        this.declareWarOnNation(w.nationId);
        const rig = this.batteries.extensions.nationWalls.find((r) => r.id === w.id);
        if (w.hp <= 0) {
          w.destroyed = true;
          wallBreachedByNuke = true;
          if (rig) {
            rig.intactGroup.visible = false;
            rig.rubbleGroup.visible = true;
          }
          this.kills++;
          this.score += 180;
        } else if (rig) {
          rig.intactMat.color.lerp(new THREE.Color(0x1f1d1b), 0.45);
        }
      }
    }
    if (wallBreachedByNuke) {
      this.rebuildEffectiveWorldObstacles();
    }

    this.updateBestScore();
    this.emitHud();
  }

  public fireBatterySalvo(): void {
    if (this.screenState !== 'playing' || this.combatMode !== 'ground') return;
    this.audio.unlock(true);
    const systems: WeaponType[] = ['patriot', 'thaad', 's400', 'hq9'];
    let fired = 0;
    for (const w of systems) {
      if (this.weaponMag[w] <= 0) continue;
      this.launchSingleBatteryRound(w, this.seekerCandidateId);
      this.weaponMag[w]--;
      if (this.weaponMag[w] <= 0) {
        this.reloadTimers[w] = getWeaponStats(w, this.upgrades).reloadTime;
      }
      fired++;
    }
    if (fired > 0) {
      this.trauma = Math.min(1, this.trauma + 0.3);
      this.emitHud();
    }
  }

  // ---- ENVIRONMENT & SPECIAL OPS ----

  private applyEnvironmentVisuals(): void {
    if (!this.scene || !this.skyRig) return;
    const mods = getEnvironmentTacticalModifiers({
      timeOfDay: this.timeOfDay,
      weather: this.weather,
      infra: this.infra,
      ewJamActive: this.ewJamTimer > 0,
    });

    // Physically based Atmospheric Scattering + Cloud Layer + Night Starfield + Thermal FLIR mode
    let cloudTint = 0xffffff;
    let cloudOpacity = 0.58;
    let starOpacity = 0.0;
    let fogHex = 0x93c5fd;
    let fogDensity = 0.00028;
    let sunHex = 0xfff5e4;
    let sunIntensity = 3.1;
    let sunPos: [number, number, number] = [55, 48, 88];
    let hemiSky = 0x60a5fa;
    let hemiGround = 0x4f5a38;
    let hemiInt = 1.04;
    let turbidity = 1.6;
    let rayleigh = 2.45;
    let mieCoefficient = 0.0015;
    let mieDirectionalG = 0.78;

    if (this.timeOfDay === 'sunset') {
      cloudTint = 0xfdba74;
      cloudOpacity = 0.78;
      fogHex = 0xd99b72;
      fogDensity = 0.00056;
      sunHex = 0xff9f5a;
      sunIntensity = 2.2;
      sunPos = [-95, 11, -135];
      hemiSky = 0xfbbf24;
      hemiGround = 0x443528;
      hemiInt = 0.72;
      turbidity = 8.4;
      rayleigh = 2.85;
      mieCoefficient = 0.012;
      mieDirectionalG = 0.9;
    } else if (this.timeOfDay === 'night') {
      cloudTint = 0x1e293b;
      cloudOpacity = 0.42;
      starOpacity = 0.88;
      fogHex = 0x0b1324;
      fogDensity = 0.00068;
      sunHex = 0x93c5fd;
      sunIntensity = 0.72;
      sunPos = [-45, -18, -95];
      hemiSky = 0x1e3a8a;
      hemiGround = 0x0f172a;
      hemiInt = 0.48;
      turbidity = 1.6;
      rayleigh = 0.25;
      mieCoefficient = 0.002;
    }

    if (this.weather === 'fog') {
      fogDensity = Math.max(fogDensity, 0.0036);
      cloudTint = this.timeOfDay === 'night' ? 0x1e293b : 0xcbd5e1;
      cloudOpacity = 0.92;
      starOpacity = 0.0;
      sunIntensity *= 0.65;
      turbidity = 12;
    } else if (this.weather === 'rain') {
      fogDensity = Math.max(fogDensity, 0.0014);
      cloudTint = this.timeOfDay === 'night' ? 0x111827 : 0x64748b;
      cloudOpacity = 0.94;
      starOpacity = 0.0;
      sunIntensity *= 0.72;
      turbidity = 10;
    } else if (this.weather === 'storm') {
      fogDensity = Math.max(fogDensity, 0.0022);
      cloudTint = 0x334155;
      cloudOpacity = 0.96;
      starOpacity = 0.0;
      fogHex = this.timeOfDay === 'night' ? 0x090d16 : 0x475569;
      sunIntensity *= 0.45;
      turbidity = 14;
    }

    if (this.thermalActive) {
      cloudTint = 0x0f172a;
      cloudOpacity = 0.35;
      fogHex = 0x070d18;
      fogDensity = 0.00035;
      sunHex = 0x94a3b8;
      sunIntensity = 1.1;
      hemiSky = 0x1e293b;
      hemiGround = 0x090d16;
      hemiInt = 0.55;
      turbidity = 1.2;
      rayleigh = 0.12;
    }

    const uniforms = this.skyRig.sky.material.uniforms;
    uniforms['turbidity'].value = turbidity;
    uniforms['rayleigh'].value = rayleigh;
    uniforms['mieCoefficient'].value = mieCoefficient;
    uniforms['mieDirectionalG'].value = mieDirectionalG;
    uniforms['sunPosition'].value.set(...sunPos).normalize().multiplyScalar(400);

    this.skyRig.cloudMat.color.setHex(cloudTint);
    this.skyRig.cloudMat.opacity = cloudOpacity;
    this.skyRig.starsMat.opacity = starOpacity;

    (this.scene.fog as THREE.FogExp2).color.setHex(fogHex);
    (this.scene.fog as THREE.FogExp2).density = fogDensity;
    this.sunLight.color.setHex(sunHex);
    this.sunLight.intensity = sunIntensity;
    this.sunLight.position.set(sunPos[0], Math.max(18, sunPos[1]), sunPos[2]);
    this.hemiLight.color.setHex(hemiSky);
    this.hemiLight.groundColor.setHex(hemiGround);
    this.hemiLight.intensity = hemiInt;

    // Night city windows & searchlights (blackout turns them off when power_plant is destroyed!)
    this.batteries.cityNightMat.emissiveIntensity = mods.cityLightsOn ? 1.25 : 0.0;
    this.batteries.cityFacadeMat.emissiveIntensity = mods.cityLightsOn ? 1.1 : 0.0;
    for (const beam of this.batteries.nightLightBeams) {
      beam.visible = this.timeOfDay === 'night' && mods.cityLightsOn && !this.thermalActive;
    }

    this.renderer.toneMappingExposure = this.thermalActive
      ? 0.88
      : this.timeOfDay === 'night'
        ? 0.82
        : 0.68;

    // Highlight hot hostile & cool allied signatures when Thermal / FLIR mode is active
    for (const e of this.enemies) {
      for (const m of e.rig.bodyMeshes) {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (this.thermalActive) {
          mat.emissive.setHex(0xffedd5);
          mat.emissiveIntensity = 1.35;
        } else if (e.hitFlashTimer <= 0) {
          mat.emissiveIntensity = 0;
        }
      }
    }
    for (const t of this.tanks) {
      if (!t.alive) continue;
      for (const m of t.rig.bodyMeshes) {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (this.thermalActive) {
          mat.emissive.setHex(t.faction === 'enemy' ? 0xfb923c : 0x38bdf8);
          mat.emissiveIntensity = t.faction === 'enemy' ? 1.25 : 0.36;
        } else {
          mat.emissiveIntensity = 0;
        }
      }
    }
    if (this.playerTankRig) {
      for (const m of this.playerTankRig.bodyMeshes) {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (this.thermalActive) {
          mat.emissive.setHex(0x38bdf8);
          mat.emissiveIntensity = 0.38;
        } else {
          mat.emissiveIntensity = 0;
        }
      }
    }

    this.fx.setWeatherPrecipitation(
      this.weather === 'rain' || this.weather === 'storm',
      this.weather === 'storm',
    );
  }

  private launchSwarmDrones(): void {
    this.audio.playMissileLaunch('manpads');
    for (let i = 0; i < 5; i++) {
      const rig = buildEnemyModel('drone');
      rig.group.scale.setScalar(0.55);
      const startPos = new THREE.Vector3(-14 + i * 7, 5, -16);
      rig.group.position.copy(startPos);
      this.scene.add(rig.group);

      const warEmb = this.embassies.find((e) => e.atWar) || this.embassies[i % this.embassies.length];
      const spec = EMBASSY_SPECS.find((s) => s.id === warEmb.id)!;
      const targetAir = this.enemies.find((e) => !e.crashing) || null;
      const targetPos = targetAir
        ? targetAir.position.clone()
        : new THREE.Vector3(spec.palacePosition[0], 7, spec.palacePosition[2]);

      this.swarmDrones.push({
        position: startPos,
        velocity: new THREE.Vector3(0, 14, -22),
        targetPos,
        targetEnemyId: targetAir ? targetAir.id : null,
        life: 9.0,
        smokeTimer: 0,
        mesh: rig.group,
      });
    }
  }

  private launchParatrooperDrop(): void {
    this.audio.playJetFlyby();
    const mesh = buildCargoTransportRig();
    const startPos = new THREE.Vector3((Math.random() - 0.5) * 32, 74, 24);
    mesh.position.copy(startPos);
    this.scene.add(mesh);
    this.cargoPlanes.push({
      position: startPos,
      velocity: new THREE.Vector3(0, 0, -34),
      dropsRemaining: 4,
      dropTimer: 1.5,
      life: 9.5,
      mesh,
    });
  }

  private launchNavalBarrage(): void {
    this.audio.playNavalSalvo();
    const warEmb = this.embassies.find((e) => e.atWar) || this.embassies[1];
    const spec = EMBASSY_SPECS.find((s) => s.id === warEmb.id)!;
    const origin = new THREE.Vector3();

    for (let i = 0; i < 4; i++) {
      const p = this.acquireProjectile(true, false, true);
      if (!p) break;

      const muzzles = this.batteries.navalMuzzles;
      if (muzzles.length > 0) {
        const idx = (this.batteryFireCycles.naval + i) % muzzles.length;
        muzzles[idx].getWorldPosition(origin);
      } else {
        origin.copy(this.batteries.carrierDeckOrigin);
      }

      const airTarget = this.enemies.find((e) => !e.crashing);
      const tgtPos = airTarget
        ? airTarget.position.clone()
        : new THREE.Vector3(
            spec.position[0] + (Math.random() - 0.5) * 14,
            5,
            spec.position[2] + (Math.random() - 0.5) * 12,
          );

      p.active = true;
      p.fromEnemy = false;
      p.isMissile = true;
      p.position.copy(origin);
      p.velocity.set(0, 28, 0);
      p.targetSpeed = 210;
      p.damage = 280;
      p.blastRadius = 16;
      p.homing = true;
      p.coldTimer = 0.25;
      p.turnRate = 8.8;
      p.targetEnemyId = airTarget ? airTarget.id : null;
      p.targetWorldPos = airTarget ? null : tgtPos;
      p.life = 7.5;
      p.smokeTimer = 0;
      p.mesh.position.copy(origin);
      p.mesh.lookAt(_vecC.copy(origin).add(p.velocity));
      p.mesh.visible = true;
      this.fx.spawnLaunchPlume(origin, true);
    }
    this.batteryFireCycles.naval += 4;
  }

  private launchArtilleryBarrage(): void {
    this.audio.playTankCannon();
    const warEmb = this.embassies.find((e) => e.atWar) || this.embassies[1];
    const spec = EMBASSY_SPECS.find((s) => s.id === warEmb.id)!;
    const enemyTank = this.tanks.find((t) => t.faction === 'enemy' && t.alive);
    const baseTarget = enemyTank
      ? enemyTank.position
      : new THREE.Vector3(spec.palacePosition[0], 1.5, spec.palacePosition[2]);

    for (let i = 0; i < 6; i++) {
      const p = this.acquireProjectile(true, false, false);
      if (!p) break;
      const origin = new THREE.Vector3(-12 + i * 4.8, 4.5, -18);
      const tgt = new THREE.Vector3(
        baseTarget.x + (Math.random() - 0.5) * 24,
        1.2,
        baseTarget.z + (Math.random() - 0.5) * 22,
      );
      p.active = true;
      p.fromEnemy = false;
      p.isMissile = true;
      p.position.copy(origin);
      p.velocity.set((tgt.x - origin.x) * 0.4, 52 + i * 3, (tgt.z - origin.z) * 0.4);
      p.targetSpeed = 165;
      p.damage = 240;
      p.blastRadius = 15;
      p.homing = true;
      p.coldTimer = 0.15;
      p.turnRate = 5.4;
      p.targetEnemyId = null;
      p.targetWorldPos = tgt;
      p.life = 7.0;
      p.smokeTimer = 0;
      p.mesh.position.copy(origin);
      p.mesh.lookAt(_vecC.copy(origin).add(p.velocity));
      p.mesh.visible = true;
      this.fx.spawnLaunchPlume(origin, true);
    }
    this.trauma = Math.min(1, this.trauma + 0.35);
  }

  private resolveJointStrikeTarget(override?: THREE.Vector3): THREE.Vector3 {
    if (override) return override.clone();
    const revealedSecret = this.secretSites.find((s) => s.revealed && !s.destroyed);
    if (revealedSecret) return new THREE.Vector3(...revealedSecret.position);
    const activeEnemy = this.enemies.find((e) => !e.crashing);
    if (activeEnemy) return activeEnemy.position.clone();
    const enemyTank = this.tanks.find((t) => t.faction === 'enemy' && t.alive);
    if (enemyTank) return enemyTank.position.clone();
    const warEmb = this.embassies.find((e) => e.atWar) || this.embassies[1];
    const spec = EMBASSY_SPECS.find((s) => s.id === warEmb.id);
    return spec
      ? new THREE.Vector3(spec.position[0], 4, spec.position[2])
      : new THREE.Vector3(0, 4, -142);
  }

  private spawnSortieJet(target: THREE.Vector3): void {
    const rig = buildPlayerJetMesh('stealth_jet', this.textures?.iraqiFlagTex);
    const startPos = new THREE.Vector3(...CARRIER_OPERATIONS.catapultStart);
    rig.group.position.copy(startPos);
    this.scene.add(rig.group);
    this.audio.playJetFlyby();
    this.sortieJets.push({
      id: this.nextSortieId++,
      position: startPos,
      target: target.clone(),
      phase: 'launch',
      timer: 1.35,
      bombsDropped: false,
      rig,
    });
  }

  private launchJointStrike(overrideTarget?: THREE.Vector3): void {
    const target = this.resolveJointStrikeTarget(overrideTarget);
    const activeSecretTargets = this.secretSites
      .filter((s) => s.revealed && !s.destroyed)
      .map((s) => new THREE.Vector3(...s.position));
    const pickStrikeTarget = (idx: number) =>
      activeSecretTargets.length > 0 && !overrideTarget
        ? activeSecretTargets[idx % activeSecretTargets.length]
        : target;

    // 1. Land Armor: Nearest 3 Allied M1A2 Tanks fire synchronized 120mm cannon salvos
    const allyTanks = this.tanks
      .filter((t) => t.faction === 'ally' && t.alive)
      .sort((a, b) => a.position.distanceTo(target) - b.position.distanceTo(target))
      .slice(0, 3);
    const origin = new THREE.Vector3();
    allyTanks.forEach((tank, tIdx) => {
      const subTarget = pickStrikeTarget(tIdx);
      tank.rig.turret.lookAt(subTarget.x, Math.max(2, subTarget.y), subTarget.z);
      tank.rig.muzzle.getWorldPosition(origin);
      const p = this.acquireProjectile(true, false, false);
      if (p) {
        const dir = _vecA.copy(subTarget).sub(origin).normalize();
        p.active = true;
        p.fromEnemy = false;
        p.isMissile = true;
        p.position.copy(origin);
        p.velocity.copy(dir).multiplyScalar(175);
        p.targetSpeed = 175;
        p.damage = 220;
        p.blastRadius = 14;
        p.homing = true;
        p.coldTimer = 0.08;
        p.turnRate = 6.2;
        p.targetEnemyId = null;
        p.targetWorldPos = subTarget.clone();
        p.life = 5.5;
        p.smokeTimer = 0;
        p.mesh.position.copy(origin);
        p.mesh.lookAt(_vecC.copy(origin).add(p.velocity));
        p.mesh.visible = true;
        this.fx.spawnLaunchPlume(origin, false);
      }
    });
    if (allyTanks.length > 0) this.audio.playTankCannon();

    // 2. Allied MLRS Rocket Artillery Units fire synchronized precision salvos
    this.alliedMlrsList.forEach((m, mIdx) => {
      if (!m.alive) return;
      const subTarget = pickStrikeTarget(mIdx);
      m.rig.yawGroup.rotation.y = Math.atan2(-(subTarget.x - m.position.x), -(subTarget.z - m.position.z)) - m.rig.group.rotation.y;
      for (let s = 0; s < 3; s++) {
        const p = this.acquireProjectile(true, false, false);
        if (!p) break;
        const muz = m.rig.muzzles[s % m.rig.muzzles.length];
        muz.getWorldPosition(origin);
        p.active = true;
        p.fromEnemy = false;
        p.isMissile = true;
        p.position.copy(origin);
        p.velocity.set((subTarget.x - origin.x) * 0.35, 56 + s * 3, (subTarget.z - origin.z) * 0.35);
        p.targetSpeed = 172;
        p.damage = 210;
        p.blastRadius = 14;
        p.homing = true;
        p.coldTimer = 0.16;
        p.turnRate = 6.0;
        p.targetEnemyId = null;
        p.targetWorldPos = subTarget.clone();
        p.life = 7.4;
        p.smokeTimer = 0;
        p.mesh.position.copy(origin);
        p.mesh.lookAt(_vecC.copy(origin).add(p.velocity));
        p.mesh.visible = true;
        this.fx.spawnLaunchPlume(origin, true);
      }
      this.audio.playMlrsSalvoLaunch(3);
    });

    // 3. Sea Fleet: 2 Naval VLS Missiles from Destroyers
    const navalMuzzles = this.batteries.navalMuzzles;
    for (let i = 0; i < 2; i++) {
      const subTarget = pickStrikeTarget(i);
      const p = this.acquireProjectile(true, false, true);
      if (!p) break;
      if (navalMuzzles.length > 0) {
        navalMuzzles[(this.batteryFireCycles.naval + i) % navalMuzzles.length].getWorldPosition(origin);
      } else {
        origin.copy(this.batteries.carrierDeckOrigin);
      }
      p.active = true;
      p.fromEnemy = false;
      p.isMissile = true;
      p.position.copy(origin);
      p.velocity.set(0, 26, 0);
      p.targetSpeed = 200;
      p.damage = 260;
      p.blastRadius = 15;
      p.homing = true;
      p.coldTimer = 0.22;
      p.turnRate = 8.4;
      p.targetEnemyId = null;
      p.targetWorldPos = subTarget.clone();
      p.life = 7.0;
      p.smokeTimer = 0;
      p.mesh.position.copy(origin);
      p.mesh.lookAt(_vecC.copy(origin).add(p.velocity));
      p.mesh.visible = true;
      this.fx.spawnLaunchPlume(origin, true);
    }
    this.batteryFireCycles.naval += 2;
    this.audio.playNavalSalvo();

    // 4. Air Force: Launch Unified Flagship Fighter Jet Sortie from Aircraft Carrier
    this.spawnSortieJet(target);
    this.trauma = Math.min(1, this.trauma + 0.3);
  }

  private updateSortieJets(dt: number): void {
    for (let i = this.sortieJets.length - 1; i >= 0; i--) {
      const sj = this.sortieJets[i];
      sj.timer -= dt;
      const desired = _vecA;
      let speed = 96;

      if (sj.phase === 'launch') {
        desired.set(sj.position.x, 48, sj.position.z - 80).sub(sj.position);
        speed = 68;
        if (sj.timer <= 0) {
          sj.phase = 'inbound';
          sj.timer = 6.5;
        }
      } else if (sj.phase === 'inbound') {
        desired.set(sj.target.x, Math.max(46, sj.target.y + 38), sj.target.z).sub(sj.position);
        speed = 112;
        if (!sj.bombsDropped && Math.hypot(desired.x, desired.z) < 42) {
          sj.bombsDropped = true;
          for (let m = 0; m < 2; m++) {
            const p = this.acquireProjectile(true, false, false);
            if (!p) break;
            p.active = true;
            p.fromEnemy = false;
            p.isMissile = true;
            p.position.copy(sj.position).add(new THREE.Vector3(m === 0 ? -2.2 : 2.2, -1.2, 0));
            p.velocity.copy(sj.target).sub(p.position).normalize().multiplyScalar(170);
            p.targetSpeed = 170;
            p.damage = 250;
            p.blastRadius = 15;
            p.homing = true;
            p.coldTimer = 0;
            p.turnRate = 8.0;
            p.targetEnemyId = null;
            p.targetWorldPos = sj.target.clone();
            p.life = 4.2;
            p.smokeTimer = 0;
            p.mesh.position.copy(p.position);
            p.mesh.lookAt(_vecC.copy(p.position).add(p.velocity));
            p.mesh.visible = true;
            this.fx.spawnLaunchPlume(p.position, false);
          }
          this.audio.playMissileLaunch('manpads');
          sj.phase = 'egress';
          sj.timer = 4.5;
        } else if (sj.timer <= 0) {
          sj.phase = 'egress';
          sj.timer = 4.5;
        }
      } else {
        desired.set(CARRIER_OPERATIONS.approachEntry[0], 56, CARRIER_OPERATIONS.approachEntry[2]).sub(sj.position);
        speed = 104;
        if (desired.length() < 26 || sj.timer <= 0) {
          this.scene.remove(sj.rig.group);
          this.sortieJets.splice(i, 1);
          continue;
        }
      }

      if (desired.lengthSq() > 0.01) {
        desired.normalize();
        sj.position.addScaledVector(desired, speed * dt);
        sj.rig.group.position.copy(sj.position);
        sj.rig.group.lookAt(_vecB.copy(sj.position).add(desired));
        sj.rig.group.rotateY(Math.PI);
      }
      const pulse = 0.85 + Math.sin(this.elapsedTime * 36 + sj.id) * 0.2;
      for (const fl of sj.rig.afterburners) {
        fl.scale.set(1, 1, pulse);
      }
    }
  }

  // ---- INTERNAL HELPERS ----

  private syncFirstPersonWeaponModel(): void {
    if (!this.fpRig) return;
    const insidePeacePalace = (() => {
      const fn = isInsideForeignPalace(this.playerPos.x, this.playerPos.z);
      if (!fn) return false;
      const st = this.nations.find((n) => n.id === fn);
      return Boolean(st && !st.atWar);
    })();
    const hideFp =
      this.screenState !== 'playing' ||
      this.combatMode !== 'ground' ||
      isInsideOurEmbassy(this.playerPos.x, this.playerPos.z) ||
      insidePeacePalace ||
      this.foreignSeatedNation !== null ||
      (this.weaponHolstered && this.holsterLerp >= 0.96);

    this.fpRig.group.visible = !hideFp;
    if (hideFp) return;

    this.fpRig.rifleGroup.visible = this.activeWeapon === 'rifle';
    this.fpRig.manpadsGroup.visible = this.activeWeapon === 'manpads';
    this.fpRig.heavyAaGroup.visible = this.activeWeapon === 'heavy_aa';
    this.fpRig.laserGroup.visible = this.activeWeapon === 'laser';
    this.fpRig.designatorGroup.visible =
      this.activeWeapon === 'patriot' ||
      this.activeWeapon === 'thaad' ||
      this.activeWeapon === 's400' ||
      this.activeWeapon === 'hq9' ||
      this.activeWeapon === 'hypersonic';
  }

  private updateEmbassyDamageVisual(id: EmbassyId): void {
    const status = this.embassies.find((e) => e.id === id);
    const baseHex =
      id === 'us_embassy' ? 0xd8dee9 : id === 'ru_embassy' ? 0xe5d8c8 : 0xdccbb4;
    const scorch = new THREE.Color(0x282320);

    const rig = this.batteries.embassies.find((e) => e.id === id);
    if (status && rig) {
      const ratio = status.hp / Math.max(1, status.maxHp);
      rig.facadeMat.color.setHex(baseHex).lerp(scorch, (1 - ratio) * 0.82);
      rig.group.scale.y = ratio < 0.65 ? Math.max(0.62, 0.62 + (ratio / 0.65) * 0.38) : 1;
    }

    const pRig = this.batteries.palaces.find((p) => p.id === id);
    if (status && pRig) {
      const pRatio = status.palaceHp / Math.max(1, status.palaceMaxHp);
      pRig.facadeMat.color.setHex(baseHex).lerp(scorch, (1 - pRatio) * 0.82);
      pRig.group.scale.y = pRatio < 0.6 ? Math.max(0.58, 0.58 + (pRatio / 0.6) * 0.42) : 1;
      if (status.palaceHp <= 0) {
        pRig.presidentGroup.visible = false;
      }
    }
  }

  private updateInfraDamageVisual(id: InfraId): void {
    const st = this.infra.find((i) => i.id === id);
    const rig = this.batteries.infraRigs.find((r) => r.id === id);
    if (!st || !rig) return;
    const ratio = st.hp / Math.max(1, st.maxHp);
    const scorch = new THREE.Color(0x1f1e1d);
    rig.bodyMat.color.lerp(scorch, (1 - ratio) * 0.52);
    if (st.destroyed) {
      rig.group.scale.y = 0.42;
      this.applyEnvironmentVisuals();
    }
  }

  private damageCityBuilding(b: CityBuildingRuntime, dmg: number, hitPos: THREE.Vector3): void {
    b.hp = Math.max(0, b.hp - dmg);
    const dmgRatio = 1 - b.hp / Math.max(1, b.maxHp);
    const { bldgInst, crownTowerInst, roofInst } = this.batteries.citySkyscrapers;
    const dummy = new THREE.Object3D();
    const colorTmp = new THREE.Color();
    const soot = new THREE.Color(0x1d1b19);

    const charColor = colorTmp.setHex(b.tone).lerp(soot, Math.min(0.88, dmgRatio * 0.95));
    bldgInst.setColorAt(b.id, charColor);
    crownTowerInst.setColorAt(b.id, charColor);
    if (bldgInst.instanceColor) bldgInst.instanceColor.needsUpdate = true;
    if (crownTowerInst.instanceColor) crownTowerInst.instanceColor.needsUpdate = true;

    const mainH = b.h * 0.72;
    const crownH = b.h * 0.28;
    const justCollapsed = b.hp <= 0 && !b.collapsed;
    if (justCollapsed) {
      b.collapsed = true;
      this.kills++;
      this.credits += 180;
      this.score += 260;
      this.updateBestScore();
      this.fx.spawnDebrisBurst(new THREE.Vector3(b.x, Math.max(4, b.h * 0.5), b.z), 10, 5.5);
      this.fx.spawnBlastCraterAndRubble(new THREE.Vector3(b.x, 0.06, b.z), 1.45);
      this.audio.playExplosion(1.18);
    }

    const bodyCollapseScale = b.collapsed ? 0.56 : Math.max(0.76, 1 - dmgRatio * 0.24);
    const collapsedMainH = mainH * bodyCollapseScale;
    const tiltFactor = b.collapsed ? 1.0 : Math.max(0, (dmgRatio - 0.35) / 0.65);

    dummy.position.set(b.x, collapsedMainH * 0.5, b.z);
    dummy.rotation.set(b.tiltX * tiltFactor * 0.55, 0, b.tiltZ * tiltFactor * 0.55);
    dummy.scale.set(b.w, collapsedMainH, b.d);
    dummy.updateMatrix();
    bldgInst.setMatrixAt(b.id, dummy.matrix);
    bldgInst.instanceMatrix.needsUpdate = true;

    const crownScaleY = b.collapsed ? 0.35 : Math.max(0.45, 1 - dmgRatio * 0.55);
    const collapsedCrownH = crownH * crownScaleY;
    dummy.position.set(
      b.x + b.tiltZ * tiltFactor * 2.2,
      collapsedMainH + collapsedCrownH * 0.42,
      b.z - b.tiltX * tiltFactor * 2.2,
    );
    dummy.rotation.set(b.tiltX * tiltFactor * 1.4, 0.08 * tiltFactor, b.tiltZ * tiltFactor * 1.4);
    dummy.scale.set(b.w * 0.74, collapsedCrownH, b.d * 0.74);
    dummy.updateMatrix();
    crownTowerInst.setMatrixAt(b.id, dummy.matrix);
    crownTowerInst.instanceMatrix.needsUpdate = true;

    const roofTopY = collapsedMainH + collapsedCrownH * 0.85;
    dummy.position.set(b.x - 1.0, b.collapsed ? 1.2 : roofTopY + 0.6, b.z + 0.8);
    dummy.rotation.set(b.tiltX * 2.2 * tiltFactor, 0.2, b.tiltZ * 2.2 * tiltFactor);
    dummy.scale.set(b.w * 0.32, 1.6, b.d * 0.32);
    dummy.updateMatrix();
    roofInst.setMatrixAt(b.id * 2, dummy.matrix);

    dummy.position.set(b.x + 1.4, b.collapsed ? 0.8 : roofTopY + 1.4, b.z - 0.8);
    dummy.rotation.set(b.tiltX * 3 * tiltFactor, 0, b.tiltZ * 3 * tiltFactor);
    dummy.scale.set(0.32, b.collapsed ? 2.2 : 4.2, 0.32);
    dummy.updateMatrix();
    roofInst.setMatrixAt(b.id * 2 + 1, dummy.matrix);
    roofInst.instanceMatrix.needsUpdate = true;

    this.addActiveFire(
      new THREE.Vector3(hitPos.x, Math.min(collapsedMainH, Math.max(2.2, hitPos.y)), hitPos.z),
      b.collapsed ? 1.35 : 1.0,
      b.collapsed ? 26 : 18,
    );
  }

  private damageEnemyMlrs(m: EnemyMlrsUnit, dmg: number): void {
    if (!m.alive) return;
    m.hp -= dmg;
    this.audio.playHitMarker();
    if (m.hp <= 0) {
      m.alive = false;
      m.wreckTimer = 6.0;
      this.kills++;
      this.credits += 310;
      this.score += 480;
      this.updateBestScore();
      this.fx.spawnExplosion(m.position, 1.4, this.camera.position);
      this.fx.spawnBlastCraterAndRubble(m.position, 1.15);
      this.addActiveFire(m.position, 1.2, 20);
      this.delayedBlasts.push({
        pos: m.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 1, (Math.random() - 0.5) * 3)),
        delay: 0.75,
        scale: 1.25,
        damage: 0,
      });
      this.audio.playExplosion(1.1);
    }
  }

  private clearEnemies(): void {
    for (const e of this.enemies) {
      this.scene.remove(e.rig.group);
    }
    this.enemies = [];
  }

  private clearProjectiles(): void {
    for (const p of this.projectiles) {
      p.active = false;
      p.mesh.visible = false;
    }
  }

  private acquireProjectile(
    wantMissile: boolean,
    wantEnemy = false,
    wantHypersonic = false,
    isAiTracer = false,
  ): ActiveProjectile | null {
    let startIdx = 0;
    let endIdx = 46;
    if (wantMissile) {
      if (wantEnemy) {
        startIdx = 78;
        endIdx = PROJECTILE_POOL_SIZE;
      } else if (wantHypersonic) {
        startIdx = 72;
        endIdx = 78;
      } else {
        startIdx = 46;
        endIdx = 72;
      }
    } else if (isAiTracer) {
      // Reserve slots 0..15 exclusively for Player weapons so 50 soldiers never starve player shots
      startIdx = 16;
      endIdx = 46;
    }
    for (let i = startIdx; i < endIdx; i++) {
      if (!this.projectiles[i].active) {
        this.projectiles[i].isAirDefenseSam = false;
        this.projectiles[i].samClimbTimer = 0;
        return this.projectiles[i];
      }
    }
    return null;
  }

  private getLaunchOriginForWeapon(weapon: WeaponType): {
    origin: THREE.Vector3;
    audioProfile: MissileAudioProfile;
  } {
    const origin = new THREE.Vector3();
    let list: THREE.Object3D[] | null = null;
    let audioProfile: MissileAudioProfile = 'hot_sam';

    if (weapon === 'patriot') list = this.batteries.patriotMuzzles;
    else if (weapon === 'thaad') list = this.batteries.thaadMuzzles;
    else if (weapon === 's400' || weapon === 'hypersonic') {
      list = this.batteries.s400Muzzles;
      audioProfile = 'cold_sam';
    } else if (weapon === 'hq9') {
      list = this.batteries.hq9Muzzles;
      audioProfile = 'cold_sam';
    }

    if (list && list.length > 0) {
      const count = this.batteryFireCycles[weapon] ?? 0;
      const idx = count % list.length;
      this.batteryFireCycles[weapon] = count + 1;
      list[idx].getWorldPosition(origin);
      return { origin, audioProfile };
    }

    this.fpRig.muzzlePoint.getWorldPosition(origin);
    return { origin, audioProfile: 'manpads' };
  }

  private updateBestScore(): void {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(this.bestScore));
      } catch {
        // ignore
      }
    }
  }

  private spawnEnemyMlrsForEmbassy(embId: EmbassyId): void {
    const existing = this.enemyMlrsUnits.filter((m) => m.embassyId === embId && m.alive).length;
    if (existing >= 1) return;
    const spec = EMBASSY_SPECS.find((s) => s.id === embId);
    if (!spec) return;
    const rawX = spec.palacePosition[0] + (spec.palacePosition[0] < 0 ? 19 : spec.palacePosition[0] > 0 ? -19 : 20);
    const rawZ = spec.palacePosition[2] + 15;
    const safe = resolveCircleObstacleCollision(rawX, rawZ, 4.0, this.effectiveWorldObstacles);
    const rig = buildEnemyMlrsUnitRig();
    const pos = new THREE.Vector3(safe.x, 0.04, safe.z);
    rig.group.position.copy(pos);
    rig.group.rotation.y = Math.PI;
    this.scene.add(rig.group);
    this.enemyMlrsUnits.push({
      id: this.nextEnemyMlrsId++,
      embassyId: embId,
      position: pos,
      hp: 290,
      maxHp: 290,
      fireCooldown: 2.2 + Math.random() * 1.5,
      alive: true,
      wreckTimer: 0,
      rig,
    });
  }

  private spawnEnemyMlrsForNation(nationId: NationId): void {
    const existing = this.enemyMlrsUnits.filter((m) => m.embassyId === nationId && m.alive).length;
    if (existing >= 1) return;
    const spec = getNationSpec(nationId);
    const base = getNationMilitaryBasePos(spec);
    const safe = resolveCircleObstacleCollision(base[0], base[2] + 15, 4.0, this.effectiveWorldObstacles);
    const rig = buildEnemyMlrsUnitRig();
    const pos = new THREE.Vector3(safe.x, 0.04, safe.z);
    rig.group.position.copy(pos);
    rig.group.rotation.y = Math.PI;
    this.scene.add(rig.group);
    this.enemyMlrsUnits.push({
      id: this.nextEnemyMlrsId++,
      embassyId: nationId,
      position: pos,
      hp: Math.round(310 * spec.militaryPower),
      maxHp: Math.round(310 * spec.militaryPower),
      fireCooldown: 2.0 + Math.random() * 1.2,
      alive: true,
      wreckTimer: 0,
      rig,
    });
  }

  private onNewWarDeclared(embId: EmbassyId): void {
    this.retaliationSpawnTimer = 0.25;
    this.audio.playAlarmSiren();
    const palace = this.batteries.palaces.find((p) => p.id === embId);
    if (palace) {
      palace.guardPosts.forEach((post, idx) => {
        this.spawnGroundSoldier(
          'enemy',
          post.role,
          new THREE.Vector3(...post.pos),
          false,
          null,
          idx === 0,
        );
      });
    }
    const spec = EMBASSY_SPECS.find((s) => s.id === embId);
    if (spec) {
      for (let i = 0; i < 8; i++) {
        const safe = resolveCircleObstacleCollision(
          spec.position[0] + (Math.random() - 0.5) * 30,
          spec.position[2] + 15 + Math.random() * 10,
          0.9,
          this.effectiveWorldObstacles,
        );
        this.spawnGroundSoldier(
          'enemy',
          i % 4 === 0 ? 'sniper' : 'infantry',
          new THREE.Vector3(safe.x, 0.04, safe.z),
          false,
          null,
          i === 0,
        );
      }
    }
    this.spawnEnemyMlrsForEmbassy(embId);
  }

  private damageWorldStructureAtPoint(
    point: THREE.Vector3,
    radius: number,
    damage: number,
  ): boolean {
    // 1. Check Foreign Embassies
    for (const rig of this.batteries.embassies) {
      const dx = Math.abs(point.x - rig.worldPos.x);
      const dz = Math.abs(point.z - rig.worldPos.z);
      if (dx <= 9.5 + radius && dz <= 7.5 + radius && point.y <= 14 + radius) {
        const res = applyEmbassyAttack(this.embassies, rig.id, damage, 'embassy');
        this.embassies = res.nextEmbassies;
        this.warDeclared = res.anyWarDeclared;
        this.updateEmbassyDamageVisual(rig.id);
        this.fx.spawnExplosion(point, 0.95, this.camera.position);
        this.fx.spawnBlastCraterAndRubble(point, 1.1);
        this.addActiveFire(point, 1.15, 22);
        this.audio.playExplosion(0.8);
        this.audio.playHitMarker();
        if (res.newlyDeclaredWar) this.onNewWarDeclared(rig.id);
        return true;
      }
    }

    // 2. Check Fortified Presidential Palaces
    for (const palace of this.batteries.palaces) {
      const dx = Math.abs(point.x - palace.worldPos.x);
      const dz = Math.abs(point.z - palace.worldPos.z);
      if (dx <= 14.5 + radius && dz <= 14.5 + radius && point.y <= 18 + radius) {
        const res = applyEmbassyAttack(this.embassies, palace.id, damage, 'palace');
        this.embassies = res.nextEmbassies;
        this.warDeclared = res.anyWarDeclared;
        this.updateEmbassyDamageVisual(palace.id);
        this.fx.spawnExplosion(point, 1.05, this.camera.position);
        this.fx.spawnBlastCraterAndRubble(point, 1.2);
        this.addActiveFire(point, 1.25, 24);
        this.audio.playExplosion(0.9);
        this.audio.playHitMarker();
        if (res.newlyDeclaredWar) this.onNewWarDeclared(palace.id);
        return true;
      }
    }

    // 3. Check Strategic Infrastructure (Power Plant, Comms, Fuel Depot, Coastal Bridge)
    for (const iRig of this.batteries.infraRigs) {
      const dist2d = Math.hypot(point.x - iRig.worldPos.x, point.z - iRig.worldPos.z);
      if (dist2d <= iRig.radius + radius && point.y <= 22 + radius) {
        const res = applyInfraDamage(this.infra, iRig.id, damage);
        this.infra = res.nextInfra;
        this.updateInfraDamageVisual(iRig.id);
        const blastScale = res.justDestroyed && iRig.id === 'fuel_depot' ? 1.85 : 0.95;
        this.fx.spawnExplosion(point, blastScale, this.camera.position);
        this.fx.spawnBlastCraterAndRubble(point, blastScale);
        this.addActiveFire(point, res.justDestroyed ? 1.45 : 1.0, 26);
        this.audio.playExplosion(blastScale);
        this.audio.playHitMarker();
        if (res.justDestroyed) {
          this.credits += 350;
          this.score += 500;
          this.updateBestScore();
          if (iRig.id === 'fuel_depot') {
            this.delayedBlasts.push(
              { pos: iRig.worldPos.clone().add(new THREE.Vector3(-4, 2, 3)), delay: 0.7, scale: 1.65, damage: 120 },
              { pos: iRig.worldPos.clone().add(new THREE.Vector3(4, 3, -3)), delay: 1.45, scale: 1.75, damage: 120 },
            );
          }
        }
        return true;
      }
    }

    // 4. Check Hostile Ground MLRS Launchers
    for (const m of this.enemyMlrsUnits) {
      if (!m.alive) continue;
      if (Math.hypot(point.x - m.position.x, point.z - m.position.z) <= 5.2 + radius && point.y <= 8 + radius) {
        this.damageEnemyMlrs(m, damage);
        return true;
      }
    }

    // 4b. Check Secret Enemy Sites (المواقع السرية)
    for (const site of this.secretSites) {
      if (site.destroyed) continue;
      const dx = point.x - site.position[0];
      const dz = point.z - site.position[2];
      if (Math.hypot(dx, dz) <= 8.5 + radius && point.y <= 9 + radius) {
        site.revealed = true;
        site.hp = Math.max(0, site.hp - damage);
        const rig = this.batteries.secretSites.find((r) => r.id === site.id);
        if (rig) {
          const ratio = site.hp / Math.max(1, site.maxHp);
          rig.bodyMat.color.setHex(0x3b3834).lerp(new THREE.Color(0x181715), (1 - ratio) * 0.8);
          rig.beaconMesh.visible = !site.destroyed;
          if (site.hp <= 0) {
            site.destroyed = true;
            rig.group.scale.y = 0.42;
            rig.beaconMesh.visible = false;
            this.kills++;
            this.credits += 450;
            this.score += 700;
            this.updateBestScore();
            this.delayedBlasts.push({
              pos: new THREE.Vector3(site.position[0], 2.0, site.position[2]),
              delay: 0.65,
              scale: 1.55,
              damage: 0,
            });
          }
        }
        this.fx.spawnExplosion(point, 1.25, this.camera.position);
        this.fx.spawnBlastCraterAndRubble(point, 1.15);
        this.addActiveFire(point, 1.25, 24);
        this.audio.playExplosion(1.0);
        this.audio.playHitMarker();
        return true;
      }
    }

    // 4c. Check Foreign Nation Palaces (13 Nations)
    for (const nr of this.batteries.extensions.nations) {
      if (Math.hypot(point.x - nr.palaceWorldPos.x, point.z - nr.palaceWorldPos.z) <= 22 + radius && point.y <= 28 + radius) {
        const st = this.nations.find((n) => n.id === nr.id);
        if (st) {
          st.palaceHp = Math.max(0, Math.round(st.palaceHp - damage));
          const ratio = st.palaceHp / Math.max(1, st.palaceMaxHp);
          nr.palaceMat.color
            .setHex(nr.spec.tier === 'luxury_modern' ? 0xf8fafc : 0xe5d7be)
            .lerp(new THREE.Color(0x282320), (1 - ratio) * 0.78);
          nr.palaceGroup.scale.y = ratio < 0.6 ? Math.max(0.55, 0.55 + (ratio / 0.6) * 0.45) : 1;
          if (st.palaceHp <= 0) nr.presidentGroup.visible = false;
        }
        this.declareWarOnNation(nr.id);
        this.fx.spawnExplosion(point, 1.3, this.camera.position);
        this.fx.spawnBlastCraterAndRubble(point, 1.3);
        this.addActiveFire(point, 1.3, 28);
        this.audio.playExplosion(1.0);
        this.audio.playHitMarker();
        return true;
      }
    }

    // 4c2. Check Tall Destructible Nation Perimeter Walls (leave permanent rubble & breach path!)
    for (const w of this.nationWalls) {
      if (w.destroyed) continue;
      const hitPad = radius + 2.2;
      if (
        point.x >= w.minX - hitPad &&
        point.x <= w.maxX + hitPad &&
        point.z >= w.minZ - hitPad &&
        point.z <= w.maxZ + hitPad &&
        point.y <= 10 + radius
      ) {
        w.hp = Math.max(0, Math.round(w.hp - damage));
        this.declareWarOnNation(w.nationId);
        const rig = this.batteries.extensions.nationWalls.find((r) => r.id === w.id);
        if (w.hp <= 0) {
          w.destroyed = true;
          if (rig) {
            rig.intactGroup.visible = false;
            rig.rubbleGroup.visible = true;
          }
          this.rebuildEffectiveWorldObstacles();
          this.kills++;
          this.credits += 180;
          this.score += 240;
          this.updateBestScore();
          this.fx.spawnExplosion(new THREE.Vector3(w.cx, 3.2, w.cz), 1.65, this.camera.position);
          this.fx.spawnBlastCraterAndRubble(new THREE.Vector3(w.cx, 0.1, w.cz), 1.75);
          this.addActiveFire(new THREE.Vector3(w.cx, 1.2, w.cz), 1.45, 32);
          this.audio.playExplosion(1.3);
        } else {
          if (rig) {
            const ratio = w.hp / Math.max(1, w.maxHp);
            const spec = getNationSpec(w.nationId);
            rig.intactMat.color
              .setHex(spec.tier === 'luxury_modern' ? 0x64748b : 0xb89f78)
              .lerp(new THREE.Color(0x1f1d1b), (1 - ratio) * 0.72);
          }
          this.fx.spawnExplosion(point, 1.05, this.camera.position);
          this.fx.spawnBlastCraterAndRubble(point, 1.0);
          this.addActiveFire(point, 1.05, 18);
          this.audio.playExplosion(0.85);
        }
        this.audio.playHitMarker();
        return true;
      }
    }

    // 4d. Check ISIS Urban Stronghold Blocks (مربعات داعش)
    for (const ib of this.isisBlocks) {
      if (ib.destroyed) continue;
      if (Math.hypot(point.x - ib.position.x, point.z - ib.position.z) <= 8.5 + radius && point.y <= 9 + radius) {
        ib.hp = Math.max(0, ib.hp - damage);
        const rig = this.batteries.extensions.isisBlocks.find((r) => r.id === ib.id);
        if (rig) {
          const ratio = ib.hp / Math.max(1, ib.maxHp);
          rig.bodyMat.color.setHex(0x3f3a36).lerp(new THREE.Color(0x161412), (1 - ratio) * 0.8);
          if (ib.hp <= 0) {
            ib.destroyed = true;
            rig.group.scale.y = 0.35;
            rig.flagMesh.visible = false;
            this.kills++;
            this.credits += 400;
            this.score += 620;
            this.updateBestScore();
          }
        }
        this.fx.spawnExplosion(point, 1.2, this.camera.position);
        this.fx.spawnBlastCraterAndRubble(point, 1.15);
        this.addActiveFire(point, 1.2, 24);
        this.audio.playExplosion(0.95);
        this.audio.playHitMarker();
        return true;
      }
    }

    // 5. Check City Skyscrapers (Real Physical Damage, Charring, Partial Collapse & Persistent Fires)
    for (const b of this.cityBuildings) {
      const dx = Math.abs(point.x - b.x);
      const dz = Math.abs(point.z - b.z);
      const maxH = b.collapsed ? b.h * 0.56 : b.h;
      if (dx <= b.w * 0.5 + radius + 0.8 && dz <= b.d * 0.5 + radius + 0.8 && point.y <= maxH + radius + 2) {
        this.damageCityBuilding(b, damage, point);
        this.fx.spawnExplosion(point, 0.95, this.camera.position);
        this.fx.spawnDebrisBurst(point, 6, 4.0);
        this.audio.playExplosion(0.8);
        this.audio.playHitMarker();
        return true;
      }
    }

    return false;
  }

  private damageHqComplex(hitPoint: THREE.Vector3, dmg: number): void {
    this.hqIntegrity = Math.max(15, this.hqIntegrity - dmg * 0.42);
    const ratio = this.hqIntegrity / OUR_HQ_COMPLEX.maxIntegrity;
    this.batteries.hqMarbleMat.color
      .setHex(0xdfd8cb)
      .lerp(new THREE.Color(0x2e2926), (1 - ratio) * 0.65);

    // Permanent structural war damage chunks & persistent HQ fires
    const dmgMeshes = this.batteries.extensions.hqDamageMeshes;
    const revealCount = Math.min(
      dmgMeshes.length,
      Math.max(2, Math.ceil((1 - ratio) * dmgMeshes.length * 1.15)),
    );
    for (let i = 0; i < revealCount; i++) {
      dmgMeshes[i].visible = true;
    }
    this.addActiveFire(
      new THREE.Vector3(
        THREE.MathUtils.clamp(hitPoint.x, -12, 12),
        1.1,
        THREE.MathUtils.clamp(hitPoint.z, 13, 36),
      ),
      1.05,
      99999,
    );

    this.hqLightFlickerTimer = 2.6;
    this.trauma = Math.min(1, this.trauma + 0.48);
    this.fx.spawnDebrisBurst(hitPoint, 8, 4.5);
    this.fx.spawnElectricSparks(
      new THREE.Vector3(
        THREE.MathUtils.clamp(hitPoint.x, -11, 11),
        2.6,
        THREE.MathUtils.clamp(hitPoint.z, 13, 36),
      ),
    );
    this.audio.playHqImpactTremor(0.95);
  }

  private launchSingleBatteryRound(weapon: WeaponType, targetId: number | null): void {
    const stats = getWeaponStats(weapon, this.upgrades);
    const { origin, audioProfile } = this.getLaunchOriginForWeapon(weapon);
    const isSam = isAirDefenseSamWeapon(weapon);

    _vecA.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const aimPoint = _vecB.copy(this.camera.position).addScaledVector(_vecA, 220);

    const p = this.acquireProjectile(true, false, Boolean(stats.isHypersonic));
    if (!p) return;

    const dir = isSam || stats.coldLaunch
      ? new THREE.Vector3(0, 1, 0)
      : aimPoint.clone().sub(origin).normalize();

    p.active = true;
    p.fromEnemy = false;
    p.isMissile = true;
    p.isAirDefenseSam = isSam;
    p.samClimbTimer = isSam ? 0.44 : 0;
    p.position.copy(origin);
    p.velocity.copy(dir).multiplyScalar(
      isSam
        ? Math.max(54, stats.projectileSpeed * 0.38)
        : stats.coldLaunch
        ? 26
        : stats.projectileSpeed,
    );
    p.targetSpeed = stats.projectileSpeed;
    p.damage = stats.damage;
    p.blastRadius = stats.blastRadius;
    p.homing = stats.homing;
    p.coldTimer = !isSam && stats.coldLaunch ? 0.3 : 0;
    p.turnRate = stats.turnRate;
    p.targetEnemyId = targetId;
    p.targetWorldPos = null;
    p.life = isSam ? 6.2 : 5.4;
    p.smokeTimer = 0;

    p.mesh.position.copy(origin);
    p.mesh.lookAt(_vecC.copy(origin).add(p.velocity));
    p.mesh.visible = true;

    this.fx.spawnLaunchPlume(origin, true);
    if (stats.isHypersonic) {
      this.audio.playHypersonicLaunch();
    } else {
      this.audio.playMissileLaunch(audioProfile);
    }
  }

  private fireLaserWeapon(damage: number): void {
    const muzzlePos = new THREE.Vector3();
    if (this.fpRig.group.visible) {
      this.fpRig.muzzlePoint.getWorldPosition(muzzlePos);
    } else {
      muzzlePos.copy(this.camera.position);
    }
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();

    // Instant beam intersection check along ray up to 340m
    let hitDist = 340;
    let hitTargetEnemy: ActiveEnemy | null = null;
    let hitEnemyMissile: ActiveProjectile | null = null;
    let hitTank: ActiveTank | null = null;
    let hitSoldier: GroundSoldierUnit | null = null;

    const ray = new THREE.Ray(this.camera.position, fwd);
    const closestPt = new THREE.Vector3();

    for (const m of this.projectiles) {
      if (!m.active || !m.fromEnemy) continue;
      ray.closestPointToPoint(m.position, closestPt);
      const d = closestPt.distanceTo(this.camera.position);
      if (d < hitDist && closestPt.distanceTo(m.position) <= 4.2) {
        hitDist = d;
        hitEnemyMissile = m;
      }
    }

    for (const e of this.enemies) {
      if (e.crashing) continue;
      ray.closestPointToPoint(e.position, closestPt);
      const d = closestPt.distanceTo(this.camera.position);
      if (d < hitDist && closestPt.distanceTo(e.position) <= 6.2) {
        hitDist = d;
        hitTargetEnemy = e;
        hitEnemyMissile = null;
      }
    }

    for (const t of this.tanks) {
      if (t.faction !== 'enemy' || !t.alive) continue;
      ray.closestPointToPoint(t.position, closestPt);
      const d = closestPt.distanceTo(this.camera.position);
      if (d < hitDist && closestPt.distanceTo(t.position) <= 4.2) {
        hitDist = d;
        hitTank = t;
        hitTargetEnemy = null;
        hitEnemyMissile = null;
      }
    }

    for (const s of this.groundUnits) {
      if (s.faction !== 'enemy' || !s.alive || s.dying) continue;
      ray.closestPointToPoint(s.position, closestPt);
      const d = closestPt.distanceTo(this.camera.position);
      if (d < hitDist && closestPt.distanceTo(s.position) <= 2.2) {
        hitDist = d;
        hitSoldier = s;
        hitTank = null;
        hitTargetEnemy = null;
        hitEnemyMissile = null;
      }
    }

    const hitPoint = _vecB.copy(this.camera.position).addScaledVector(fwd, hitDist);
    this.fx.spawnLaserBeam(muzzlePos, hitPoint, 0x38bdf8);
    this.audio.playLaserBeam();

    if (hitEnemyMissile) {
      hitEnemyMissile.active = false;
      hitEnemyMissile.mesh.visible = false;
      this.fx.spawnExplosion(hitEnemyMissile.position, 0.7, this.camera.position);
      this.audio.playHitMarker();
    } else if (hitTargetEnemy) {
      this.damageEnemyAircraft(hitTargetEnemy, damage);
      this.fx.spawnFireGlow(hitPoint, 0x38bdf8, 1.4, 3.2, 0.14, 1.5);
    } else if (hitTank) {
      this.damageEnemyTank(hitTank, damage);
    } else if (hitSoldier) {
      hitSoldier.hp -= damage;
      if (hitSoldier.hp <= 0) {
        hitSoldier.dying = true;
        hitSoldier.collapseProgress = 0;
        this.kills++;
        this.credits += 75;
        this.score += 110;
        this.updateBestScore();
      }
      this.audio.playHitMarker();
    } else {
      // Ray check against embassies/palaces/infrastructure along beam
      for (const distStep of [40, 75, 110, 145, 185, 225]) {
        const probe = _vecC.copy(this.camera.position).addScaledVector(fwd, distStep);
        if (probe.y > 0 && this.damageWorldStructureAtPoint(probe, 3.0, damage)) {
          this.fx.spawnLaserBeam(muzzlePos, probe, 0x38bdf8);
          break;
        }
      }
    }
  }

  private fireActiveWeapon(): void {
    if (this.weaponHolstered) {
      this.weaponHolstered = false;
      this.syncFirstPersonWeaponModel();
    }
    if (this.nukeTargetingActive) {
      this.fireHeld = false;
      this.launchNuclearStrike();
      return;
    }

    const w = this.activeWeapon;
    if (this.weaponCooldowns[w] > 0 || this.reloadTimers[w] > 0) return;

    const stats = getWeaponStats(w, this.upgrades);
    if (this.weaponMag[w] <= 0) {
      this.reloadTimers[w] = stats.reloadTime;
      return;
    }

    if (stats.requiresLock) {
      const target = this.enemies.find((e) => e.id === this.seekerCandidateId && !e.crashing);
      const minLock = target && target.type === 'stealth' ? 0.72 : 0.82;
      if (!target || this.seekerLockProgress < minLock || !target.canLockHoming) {
        return;
      }
    }

    this.weaponCooldowns[w] = stats.cooldown;
    this.weaponMag[w]--;
    this.weaponRecoil = stats.homing ? 0.12 : 0.045;

    if (this.weaponMag[w] <= 0) {
      this.reloadTimers[w] = stats.reloadTime;
    }

    if (stats.isLaser) {
      this.fireLaserWeapon(stats.damage);
      return;
    }

    if (stats.homing) {
      this.launchSingleBatteryRound(w, this.seekerCandidateId);
      this.trauma = Math.min(1, this.trauma + 0.14);
      return;
    }

    // Ballistic Rifle or Heavy 23mm AA Cannon
    const p = this.acquireProjectile(false, false);
    if (!p) return;

    const muzzlePos = new THREE.Vector3();
    if (this.fpRig.group.visible) {
      this.fpRig.muzzlePoint.getWorldPosition(muzzlePos);
    } else {
      muzzlePos.copy(this.camera.position).addScaledVector(
        _vecA.set(0, -0.15, -0.6).applyQuaternion(this.camera.quaternion),
        1,
      );
    }

    const forward = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(this.camera.quaternion)
      .normalize();
    const targetPoint = _vecB.copy(this.camera.position).addScaledVector(forward, 180);
    const spread = w === 'rifle' ? 0.008 : 0.02;
    const dir = targetPoint
      .sub(muzzlePos)
      .normalize()
      .add(
        new THREE.Vector3(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
        ),
      )
      .normalize();

    p.active = true;
    p.fromEnemy = false;
    p.isMissile = false;
    p.position.copy(muzzlePos);
    p.velocity.copy(dir).multiplyScalar(stats.projectileSpeed);
    p.targetSpeed = stats.projectileSpeed;
    p.damage = stats.damage;
    p.blastRadius = stats.blastRadius;
    p.homing = false;
    p.coldTimer = 0;
    p.turnRate = 0;
    p.targetEnemyId = null;
    p.targetWorldPos = null;
    p.life = 2.1;
    p.smokeTimer = 0;

    p.mesh.position.copy(muzzlePos);
    p.mesh.lookAt(_vecC.copy(muzzlePos).add(p.velocity));
    p.mesh.visible = true;

    this.fx.spawnFireGlow(muzzlePos, 0xffd166, 0.35, 0.85, 0.08, 0.4);
    if (w === 'rifle') this.audio.playRifleShot();
    else this.audio.playAutocannon();
    this.trauma = Math.min(1, this.trauma + 0.025);
  }

  private firePlayerJetWeapons(): void {
    if (!this.playerJetRig) return;
    const jetCfg = PLAYER_JET_CONFIGS[this.selectedJet];

    if (this.airCannonCooldown <= 0) {
      this.airCannonCooldown = jetCfg.cannonCooldown;
      for (const muz of this.playerJetRig.muzzles) {
        const p = this.acquireProjectile(false, false);
        if (!p) continue;
        muz.getWorldPosition(p.position);
        const fwd = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(this.playerJetRig.group.quaternion)
          .normalize();
        p.active = true;
        p.fromEnemy = false;
        p.isMissile = false;
        p.velocity.copy(fwd).multiplyScalar(320 + this.jetSpeed);
        p.targetSpeed = 320 + this.jetSpeed;
        p.damage = jetCfg.cannonDamage;
        p.blastRadius = 3.2;
        p.homing = false;
        p.coldTimer = 0;
        p.turnRate = 0;
        p.targetEnemyId = null;
        p.targetWorldPos = null;
        p.life = 1.9;
        p.mesh.position.copy(p.position);
        p.mesh.lookAt(_vecC.copy(p.position).add(p.velocity));
        p.mesh.visible = true;
      }
      this.audio.playJetCannon();
    }

    if (this.airMissileCooldown <= 0) {
      const target =
        this.enemies.find((e) => e.id === this.seekerCandidateId && !e.crashing) ||
        this.enemies.find((e) => !e.crashing) ||
        null;
      this.airMissileCooldown = 1.15;
      const p = this.acquireProjectile(true, false);
      if (p) {
        p.position.copy(this.jetPos).add(new THREE.Vector3(0, -0.5, 0));
        const fwd = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(this.playerJetRig.group.quaternion)
          .normalize();
        p.active = true;
        p.fromEnemy = false;
        p.isMissile = true;
        p.velocity.copy(fwd).multiplyScalar(jetCfg.missileSpeed);
        p.targetSpeed = jetCfg.missileSpeed;
        p.damage = jetCfg.missileDamage;
        p.blastRadius = 11;
        p.homing = target !== null;
        p.coldTimer = 0;
        p.turnRate = 8.5;
        p.targetEnemyId = target ? target.id : null;
        p.targetWorldPos = null;
        p.life = 4.6;
        p.smokeTimer = 0;
        p.mesh.position.copy(p.position);
        p.mesh.lookAt(_vecC.copy(p.position).add(p.velocity));
        p.mesh.visible = true;
        this.fx.spawnLaunchPlume(p.position, false);
        this.audio.playMissileLaunch('manpads');
      }
    }
  }

  private spawnRetaliationForce(): void {
    const warEmbassies = this.embassies.filter((e) => e.atWar);
    const warNations = this.nations.filter((n) => n.atWar);
    if (warEmbassies.length === 0 && warNations.length === 0) return;

    const totalHostiles = warEmbassies.length + warNations.length;
    const avgPower =
      warNations.length > 0
        ? warNations.reduce((s, n) => s + n.militaryPower, 0) / warNations.length
        : 1.25;
    const wave = computeWarWaveConfig(Math.min(4, totalHostiles), this.warElapsedSec);
    const activeAircraft = this.enemies.filter((e) => !e.crashing).length;
    const activeSoldiers = this.groundUnits.filter((s) => s.faction === 'enemy' && s.alive).length;
    const activeEnemyTanks = this.tanks.filter((t) => t.faction === 'enemy' && t.alive).length;

    // 1. Spawn aircraft smoothly from distant mountain horizon (escalates with waveLevel & foreign militaryPower)
    if (activeAircraft < wave.maxAircraft) {
      const types: EnemyType[] =
        wave.waveLevel >= 3
          ? ['drone', 'helicopter', 'fighter', 'stealth', 'bomber']
          : wave.waveLevel === 2
          ? ['drone', 'helicopter', 'fighter', 'bomber']
          : ['drone', 'helicopter'];
      const type = types[Math.floor(Math.random() * types.length)];
      const cfg = ENEMY_CONFIGS[type];

      const spawnX = (Math.random() - 0.5) * 260;
      const spawnZ = -265 - Math.random() * 115;
      const alt = THREE.MathUtils.lerp(cfg.minAltitude, cfg.maxAltitude, Math.random());

      const rig = buildEnemyModel(type);
      rig.group.position.set(spawnX, alt, spawnZ);
      if (this.thermalActive) {
        for (const m of rig.bodyMeshes) {
          const mat = m.material as THREE.MeshStandardMaterial;
          mat.emissive.setHex(0xffedd5);
          mat.emissiveIntensity = 1.35;
        }
      }
      this.scene.add(rig.group);

      this.enemies.push({
        id: this.nextEnemyId++,
        type,
        hp: Math.round(cfg.maxHp * Math.min(1.45, avgPower * 0.85)),
        maxHp: Math.round(cfg.maxHp * Math.min(1.45, avgPower * 0.85)),
        position: new THREE.Vector3(spawnX, alt, spawnZ),
        velocity: new THREE.Vector3(0, 0, cfg.speed),
        phase: Math.random() * Math.PI * 2,
        orbitSign: Math.random() > 0.5 ? 1 : -1,
        attackTimer: cfg.attackCooldown * wave.aircraftAttackMult * (0.6 + Math.random() * 0.45),
        windupTimer: 0,
        radarStrength: type === 'stealth' ? 0 : 0.75,
        canLockHoming: type !== 'stealth',
        hitFlashTimer: 0,
        crashing: false,
        crashTimer: 0,
        crashSpin: (Math.random() > 0.5 ? 1 : -1) * 2.8,
        flybyPlayed: false,
        rig,
      });
    }

    // 2. Spawn hostile Black-Flag ground soldiers near war embassies or war nation borders up to 60 soldiers
    const neededSoldiers = Math.max(0, wave.maxSoldiers - activeSoldiers);
    const batch = Math.min(6, neededSoldiers);
    for (let k = 0; k < batch; k++) {
      let sx = 0;
      let sz = -90;
      if (warEmbassies.length > 0) {
        const srcEmb = warEmbassies[(k + this.frameTick) % warEmbassies.length];
        const spec = EMBASSY_SPECS.find((s) => s.id === srcEmb.id)!;
        sx = spec.position[0] + (Math.random() - 0.5) * 34;
        sz = spec.position[2] + 14 + Math.random() * 14;
      } else if (warNations.length > 0) {
        const wn = warNations[(k + this.frameTick) % warNations.length];
        const nSpec = getNationSpec(wn.id);
        sx = THREE.MathUtils.clamp(nSpec.borderPos[0] * 0.45 + (Math.random() - 0.5) * 32, -260, 120);
        sz = THREE.MathUtils.clamp(nSpec.borderPos[2] * 0.45 + (Math.random() - 0.5) * 24, -280, 260);
      }
      const safe = resolveCircleObstacleCollision(sx, sz, 0.9, this.effectiveWorldObstacles);
      this.spawnGroundSoldier(
        'enemy',
        Math.random() > 0.68 ? 'sniper' : 'infantry',
        new THREE.Vector3(safe.x, 0.04, safe.z),
        false,
        null,
        (activeSoldiers + k) % 6 === 0,
      );
    }

    // 3. Spawn hostile Battle Tanks from war-declared Presidential Palaces or War Nations
    if (activeEnemyTanks < wave.maxArmor && (warEmbassies.length > 0 || warNations.length > 0)) {
      if (warEmbassies.length > 0) {
        const srcEmb = warEmbassies[Math.floor(Math.random() * warEmbassies.length)];
        const spec = EMBASSY_SPECS.find((s) => s.id === srcEmb.id)!;
        const safe = resolveCircleObstacleCollision(
          spec.palacePosition[0] + (Math.random() - 0.5) * 16,
          spec.palacePosition[2] + 19,
          3.3,
          this.effectiveWorldObstacles,
        );
        this.spawnTankUnit('enemy', new THREE.Vector3(safe.x, 0.04, safe.z));
      } else {
        const wn = warNations[Math.floor(Math.random() * warNations.length)];
        const nSpec = getNationSpec(wn.id);
        const safe = resolveCircleObstacleCollision(
          THREE.MathUtils.clamp(nSpec.borderPos[0] * 0.55, -260, 120),
          THREE.MathUtils.clamp(nSpec.borderPos[2] * 0.55, -280, 260),
          3.3,
          this.effectiveWorldObstacles,
        );
        this.spawnTankUnit('enemy', new THREE.Vector3(safe.x, 0.04, safe.z));
      }
    }

    // 4. Maintain hostile ground MLRS rocket artillery batteries at war-declared palaces
    for (const emb of warEmbassies) {
      this.spawnEnemyMlrsForEmbassy(emb.id);
    }
  }

  private spawnEnemyMissile(enemy: ActiveEnemy): void {
    const p = this.acquireProjectile(true, true);
    if (!p) return;

    const mods = getEnvironmentTacticalModifiers({
      timeOfDay: this.timeOfDay,
      weather: this.weather,
      infra: this.infra,
      ewJamActive: this.ewJamTimer > 0,
    });
    const scatter = 12 / Math.max(0.2, mods.enemyAccuracyFactor);

    const alliedTanks = this.tanks.filter((t) => t.faction === 'ally' && t.alive);
    const pickTank = alliedTanks.length > 0 && Math.random() < 0.3
      ? alliedTanks[Math.floor(Math.random() * alliedTanks.length)].position
      : null;
    const strikeHq = !pickTank && Math.random() < 0.34;

    const target = pickTank
      ? new THREE.Vector3(
          pickTank.x + (Math.random() - 0.5) * scatter * 0.5,
          1.4,
          pickTank.z + (Math.random() - 0.5) * scatter * 0.5,
        )
      : strikeHq
      ? new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          1.8,
          20 + Math.random() * 16,
        )
      : new THREE.Vector3(
          (Math.random() - 0.5) * scatter,
          1.4,
          -12 + (Math.random() - 0.5) * scatter,
        );
    const dir = target.sub(enemy.position).normalize();

    p.active = true;
    p.fromEnemy = true;
    p.isMissile = true;
    p.position.copy(enemy.position);
    p.velocity.copy(dir).multiplyScalar(84);
    p.targetSpeed = 84;
    p.damage = ENEMY_CONFIGS[enemy.type].baseDamage * mods.enemyAccuracyFactor;
    p.blastRadius = 5;
    p.homing = false;
    p.coldTimer = 0;
    p.turnRate = 0;
    p.targetEnemyId = null;
    p.targetWorldPos = null;
    p.life = 6.5;
    p.smokeTimer = 0;

    p.mesh.position.copy(p.position);
    p.mesh.lookAt(_vecC.copy(p.position).add(p.velocity));
    p.mesh.visible = true;
    this.fx.spawnLaunchPlume(p.position, false);
  }

  private damageEnemyAircraft(enemy: ActiveEnemy, dmg: number): void {
    if (enemy.crashing) return;
    enemy.hp -= dmg;
    enemy.hitFlashTimer = 0.08;
    for (const m of enemy.rig.bodyMeshes) {
      (m.material as THREE.MeshStandardMaterial).emissive.setHex(0xffffff);
      (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.85;
    }
    this.audio.playHitMarker();

    if (enemy.hp <= 0) {
      const cfg = ENEMY_CONFIGS[enemy.type];
      enemy.crashing = true;
      enemy.crashTimer = 0;
      enemy.rig.telegraphRing.visible = false;
      this.kills++;
      this.score += cfg.rewardScore;
      this.credits += cfg.rewardCredits;
      this.updateBestScore();
      this.fx.spawnExplosion(enemy.position, 0.9, this.camera.position);
      this.audio.playExplosion(0.85);
    }
  }

  private damageEnemyTank(tank: ActiveTank, dmg: number): void {
    if (!tank.alive) return;
    tank.hp -= dmg;
    this.audio.playHitMarker();
    if (tank.hp <= 0) {
      tank.alive = false;
      tank.wreckTimer = 5.5;
      tank.rig.hullMat.color.setHex(0x1f2937);
      this.kills++;
      this.credits += 220;
      this.score += 340;
      this.updateBestScore();
      this.fx.spawnExplosion(tank.position, 1.35, this.camera.position);
      this.fx.spawnBlastCraterAndRubble(tank.position, 1.0);
      this.addActiveFire(tank.position, 1.0, 14);
      this.delayedBlasts.push({
        pos: tank.position.clone().add(new THREE.Vector3(0.5, 1.2, 0.5)),
        delay: 0.65,
        scale: 1.15,
        damage: 0,
      });
      this.audio.playExplosion(1.0);
    }
  }

  private updateEnemyMlrs(dt: number, wave: ReturnType<typeof computeWarWaveConfig>): void {
    for (let i = this.enemyMlrsUnits.length - 1; i >= 0; i--) {
      const m = this.enemyMlrsUnits[i];
      if (!m.alive) {
        m.wreckTimer -= dt;
        if (Math.random() < 0.35) {
          this.fx.spawnSmokePuff(m.position, 0x22252a, 1.6, 5.2, 1.6, 0.62, 1.4, 2.5);
        }
        if (m.wreckTimer <= 0) {
          this.scene.remove(m.rig.group);
          this.enemyMlrsUnits.splice(i, 1);
        }
        continue;
      }

      if (!this.warDeclared || this.ewJamTimer > 0 || this.truceTimer > 0) continue;

      m.fireCooldown -= dt;
      if (m.fireCooldown <= 0) {
        m.fireCooldown = wave.enemyMlrsCooldown + Math.random() * 1.4;
        const allyTanks = this.tanks.filter((t) => t.faction === 'ally' && t.alive);
        const roll = Math.random();
        const tgtBase =
          roll < 0.3 && allyTanks.length > 0
            ? allyTanks[Math.floor(Math.random() * allyTanks.length)].position
            : roll < 0.62
            ? new THREE.Vector3((Math.random() - 0.5) * 10, 0.5, 24 + Math.random() * 10)
            : new THREE.Vector3(0, 0.5, -14);

        const dx = tgtBase.x - m.position.x;
        const dz = tgtBase.z - m.position.z;
        m.rig.yawGroup.rotation.y = Math.atan2(-dx, -dz) - m.rig.group.rotation.y;

        const origin = new THREE.Vector3();
        let fired = 0;
        for (let s = 0; s < wave.missileSalvoCount; s++) {
          const p = this.acquireProjectile(true, true);
          if (!p) break;
          const muz = m.rig.muzzles[s % m.rig.muzzles.length];
          muz.getWorldPosition(origin);

          const impactX = tgtBase.x + (Math.random() - 0.5) * 28;
          const impactZ = tgtBase.z + (Math.random() - 0.5) * 26;
          const flightTime = 2.6 + Math.random() * 0.8;
          const g = 14.5;
          p.active = true;
          p.fromEnemy = true;
          p.isMissile = true;
          p.position.copy(origin);
          p.velocity.set(
            (impactX - origin.x) / flightTime,
            0.5 * g * flightTime - origin.y / flightTime,
            (impactZ - origin.z) / flightTime,
          );
          p.targetSpeed = p.velocity.length();
          p.damage = 6.5 + wave.waveLevel * 1.4;
          p.blastRadius = 8.5; // triggers ballistic arc gravity in updateProjectiles
          p.homing = false;
          p.coldTimer = 0;
          p.turnRate = 0;
          p.targetEnemyId = null;
          p.targetWorldPos = null;
          p.life = flightTime + 2.2;
          p.smokeTimer = 0;
          p.mesh.position.copy(origin);
          p.mesh.lookAt(_vecC.copy(origin).add(p.velocity));
          p.mesh.visible = true;
          this.fx.spawnLaunchPlume(origin, false);
          fired++;
        }
        if (fired > 0) {
          this.audio.playMlrsSalvoLaunch(fired);
        }
      }
    }
  }

  // ---- MAIN FRAME LOOP ----

  private startLoop(): void {
    this.lastTimestamp = performance.now();
    const afterDraw = (fn: (now: number) => void) => {
      if (!this.isSoftwareGl) {
        this.frameId = requestAnimationFrame(fn);
        return;
      }
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        this.frameId = requestAnimationFrame(fn);
        return;
      }
      gl.flush();
      const poll = () => {
        if (this.destroyed) {
          gl.deleteSync(sync);
          return;
        }
        const status = gl.clientWaitSync(sync, 0, 0);
        if (status === gl.TIMEOUT_EXPIRED) {
          this.afterDrawTimerId = window.setTimeout(poll, 16);
        } else {
          gl.deleteSync(sync);
          this.frameId = requestAnimationFrame(fn);
        }
      };
      this.afterDrawTimerId = window.setTimeout(poll, 16);
    };

    const tick = (now: number) => {
      if (this.destroyed) return;

      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTimestamp) / 1000));
      this.lastTimestamp = now;

      this.updateWorldAnimations(dt);
      if (this.screenState === 'title') {
        this.updateTitleCamera(dt);
      } else if (this.screenState === 'playing') {
        this.updateGameplay(dt);
      }

      this.fx.update(dt, this.camera.position);

      if (this.composer && !this.isSoftwareGl) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      this.hudEmitTimer += dt;
      if (this.hudEmitTimer >= 0.08) {
        this.hudEmitTimer = 0;
        this.emitHud();
      }

      afterDraw(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  private updateWorldAnimations(dt: number): void {
    if (this.skyRig?.cloudMesh) {
      this.skyRig.cloudMesh.rotation.y += dt * 0.008;
    }
    if (this.textures?.oceanWaveNormal) {
      this.textures.oceanWaveNormal.offset.x = (this.textures.oceanWaveNormal.offset.x + dt * 0.015) % 1;
      this.textures.oceanWaveNormal.offset.y = (this.textures.oceanWaveNormal.offset.y + dt * 0.01) % 1;
    }
    this.batteries.radarRotator.rotation.y += dt * 1.15;
    this.batteries.s400RadarRotator.rotation.y += dt * 1.45;
    for (const nr of this.batteries.navalRadarRotators) {
      nr.rotation.y += dt * 1.35;
    }
    this.radarAngle =
      (this.radarAngle + dt * (1.55 + this.upgrades.radarLevel * 0.35)) % (Math.PI * 2);

    const t = performance.now() * 0.0024;
    if (this.batteries.electricFenceMat) {
      this.batteries.electricFenceMat.opacity = 0.4 + Math.sin(t * 7.2) * 0.25;
    }
    for (const tc of this.batteries.trainingCenters) {
      tc.flagMesh.rotation.y = Math.sin(t * 2.1 + tc.worldPos.x) * 0.24;
    }
    this.batteries.extensions.desertBaseFlag.rotation.y = Math.sin(t * 2.2) * 0.26;
    if (this.presidentTalkTimer > 0) {
      this.presidentTalkTimer = Math.max(0, this.presidentTalkTimer - dt);
    }
    for (const nr of this.batteries.extensions.nations) {
      nr.flagMesh.rotation.y = Math.sin(t * 2.0 + nr.palaceWorldPos.x * 0.05) * 0.22;
      const st = this.nations.find((n) => n.id === nr.id);
      const targetGateAngle = st?.atWar ? 0 : 1.05;
      nr.borderGateArm.rotation.z = THREE.MathUtils.lerp(nr.borderGateArm.rotation.z, targetGateAngle, dt * 4.0);
      const gesturing =
        !st?.atWar &&
        (this.foreignSeatedNation === nr.id ||
          this.activePresidentNation === nr.id ||
          (this.presidentTalkTimer > 0 && this.presidentTalkNation === nr.id));
      if (gesturing) {
        nr.presidentRightArm.rotation.x = -1.15 + Math.sin(t * 5.2) * 0.35;
      } else {
        nr.presidentRightArm.rotation.x = THREE.MathUtils.lerp(nr.presidentRightArm.rotation.x, 0, dt * 4.0);
      }
    }
    for (const ib of this.batteries.extensions.isisBlocks) {
      ib.flagMesh.rotation.y = Math.sin(t * 2.8 + ib.worldPos.x) * 0.3;
    }
    for (const silo of this.batteries.extensions.desertTunnels) {
      if (silo.openHoldTimer > 0) {
        silo.openHoldTimer = Math.max(0, silo.openHoldTimer - dt);
        silo.openProgress = Math.min(1, silo.openProgress + dt * 1.8);
      } else {
        silo.openProgress = Math.max(0, silo.openProgress - dt * 1.1);
      }
      silo.doorL.position.x = -2.48 - silo.openProgress * 4.4;
      silo.doorR.position.x = 2.48 + silo.openProgress * 4.4;
      silo.launcherPivot.position.y = -5.2 + silo.openProgress * 5.6;
    }
    // Flash red/blue convoy strobes
    const strobeFlash = Math.sin(t * 9.0) > 0;
    for (const tv of this.convoyTahoes) {
      tv.rig.strobeL.visible = strobeFlash;
      tv.rig.strobeR.visible = !strobeFlash;
    }
    for (const s of this.groundUnits) {
      if (s.alive && s.rig?.flagBanner) {
        s.rig.flagBanner.rotation.y = Math.PI * 0.16 + Math.sin(t * 2.5 + s.id) * 0.28;
      }
    }
    for (const op of this.batteries.intelOperators) {
      op.leftArm.rotation.x = Math.sin(t * 2.1 + op.phase) * 0.14;
      op.rightArm.rotation.x = Math.cos(t * 2.3 + op.phase) * 0.14;
      op.head.rotation.y = Math.sin(t * 0.55 + op.phase) * 0.24;
    }
    this.batteries.nightLightBeams.forEach((beam, idx) => {
      if (beam.visible) {
        beam.rotation.z = Math.sin(t * 0.35 + idx * 2.1) * 0.32;
      }
    });

    if (this.activeNuclearIcbm) {
      const icbm = this.activeNuclearIcbm;
      icbm.life -= dt;
      const toTarget = _vecA.copy(icbm.target).sub(icbm.position);
      const horizDist = Math.hypot(toTarget.x, toTarget.z);
      const desired = _vecB.copy(toTarget);
      if (horizDist > 52 && icbm.position.y < 105) {
        desired.y += horizDist * 0.62;
      }
      desired.normalize().multiplyScalar(116);
      icbm.velocity.lerp(desired, Math.min(1, dt * 3.4));
      icbm.position.addScaledVector(icbm.velocity, dt);
      icbm.mesh.position.copy(icbm.position);
      icbm.mesh.lookAt(_vecC.copy(icbm.position).add(icbm.velocity));

      icbm.smokeTimer -= dt;
      if (icbm.smokeTimer <= 0) {
        icbm.smokeTimer = 0.028;
        this.fx.spawnSmokePuff(icbm.position, 0xf1f5f9, 1.25, 4.4, 1.2, 0.72, 1.7, 0.9);
      }

      if (icbm.position.distanceTo(icbm.target) <= 6.5 || icbm.position.y <= 1.6 || icbm.life <= 0) {
        const impact = icbm.target.clone();
        this.scene.remove(icbm.mesh);
        this.activeNuclearIcbm = null;
        this.detonateNuclearAt(impact);
      }
    }

    if (this.nukeFlashTimer > 0) {
      this.nukeFlashTimer = Math.max(0, this.nukeFlashTimer - dt);
      const flash = Math.pow(this.nukeFlashTimer / 0.85, 2);
      this.sunLight.intensity = 2.45 + flash * 4.8;
    }

    if (this.weather === 'storm' && this.screenState === 'playing') {
      this.thunderTimer -= dt;
      if (this.thunderTimer <= 0) {
        this.thunderTimer = 6.5 + Math.random() * 6.0;
        this.audio.playThunder();
      }
    }

    if (this.warDeclared) {
      this.embassySmokeTimer -= dt;
      if (this.embassySmokeTimer <= 0) {
        this.embassySmokeTimer = 0.44;
        for (const emb of this.embassies) {
          if (emb.hp < emb.maxHp) {
            const rig = this.batteries.embassies.find((r) => r.id === emb.id);
            if (rig) {
              _vecA.set(
                rig.worldPos.x + (Math.random() - 0.5) * 6,
                7.5,
                rig.worldPos.z + (Math.random() - 0.5) * 4,
              );
              this.fx.spawnSmokePuff(_vecA, 0x3b3f45, 2.5, 8.2, 2.2, 0.58, 2.2, 4.2);
            }
          }
          if (emb.palaceHp < emb.palaceMaxHp) {
            const pRig = this.batteries.palaces.find((r) => r.id === emb.id);
            if (pRig) {
              _vecA.set(
                pRig.worldPos.x + (Math.random() - 0.5) * 8,
                9.0,
                pRig.worldPos.z + (Math.random() - 0.5) * 6,
              );
              this.fx.spawnSmokePuff(_vecA, 0x3b3f45, 2.8, 9.0, 2.4, 0.62, 2.5, 4.5);
            }
          }
        }
      }
    }
  }

  private updateTitleCamera(dt: number): void {
    this.elapsedTime += dt;
    const t = this.elapsedTime * 0.14;
    this.camera.position.set(Math.sin(t) * 28, 16, 12 + Math.cos(t) * 8);
    this.camera.lookAt(0, 6, -90);
    this.fpRig.group.visible = false;
  }

  private updateGameplay(dt: number): void {
    this.elapsedTime += dt;
    this.frameTick = (this.frameTick + 1) % 1000000;
    this.nukeCooldown = Math.max(0, this.nukeCooldown - dt);
    this.sleeperCooldown = Math.max(0, this.sleeperCooldown - dt);
    this.ewJamTimer = Math.max(0, this.ewJamTimer - dt);
    this.truceTimer = Math.max(0, this.truceTimer - dt);
    this.truceCooldown = Math.max(0, this.truceCooldown - dt);
    this.moraleBoostTimer = Math.max(0, this.moraleBoostTimer - dt);

    for (const op of [
      'joint_strike',
      'reinforce_50',
      'swarm_drones',
      'paratroopers',
      'ew_jam',
      'naval_barrage',
      'artillery_barrage',
      'desert_tunnels',
    ] as SupportOpId[]) {
      if (this.supportCooldowns[op] > 0) {
        this.supportCooldowns[op] = Math.max(0, this.supportCooldowns[op] - dt);
      }
    }

    this.playerTankCannonCd = Math.max(0, this.playerTankCannonCd - dt);
    this.playerTankCoaxCd = Math.max(0, this.playerTankCoaxCd - dt);
    this.smokeScreenCd = Math.max(0, this.smokeScreenCd - dt);

    for (const w of WEAPON_ORDER) {
      if (this.weaponCooldowns[w] > 0) {
        this.weaponCooldowns[w] = Math.max(0, this.weaponCooldowns[w] - dt);
      }
      if (this.reloadTimers[w] > 0) {
        this.reloadTimers[w] -= dt;
        if (this.reloadTimers[w] <= 0) {
          this.reloadTimers[w] = 0;
          this.weaponMag[w] = getWeaponStats(w, this.upgrades).magSize;
        }
      }
    }

    if (this.combatMode === 'ground') {
      this.updateGroundPlayer(dt);
    } else if (this.combatMode === 'tank') {
      this.updateTankPlayer(dt);
    } else if (this.combatMode === 'convoy') {
      this.updateConvoyPlayer(dt);
    } else {
      this.updateAirPlayer(dt);
    }

    this.updateHqAndIntelSystems(dt);

    if (this.nukeTargetingActive) {
      this.updateNukeGroundAim();
      this.fx.setNukeTargetMarker(true, this.nukeTargetPoint.x, this.nukeTargetPoint.z, this.elapsedTime);
    } else {
      this.fx.setNukeTargetMarker(false, 0, 0);
    }

    const mods = getEnvironmentTacticalModifiers({
      timeOfDay: this.timeOfDay,
      weather: this.weather,
      infra: this.infra,
      ewJamActive: this.ewJamTimer > 0,
    });

    if (this.bombardmentCoverTimer > 0) {
      this.bombardmentCoverTimer = Math.max(0, this.bombardmentCoverTimer - dt);
    }

    // Update persistent fires & delayed secondary blasts
    for (let i = this.activeFires.length - 1; i >= 0; i--) {
      const f = this.activeFires[i];
      if (f.life < 90000) {
        f.life -= dt;
      }
      f.timer -= dt;
      if (f.timer <= 0) {
        f.timer = 0.22 + Math.random() * 0.14;
        this.fx.spawnActiveFirePuff(f.pos, f.scale, Math.random() < 0.72);
      }
      if (f.life <= 0) {
        this.activeFires.splice(i, 1);
      }
    }

    for (let i = this.delayedBlasts.length - 1; i >= 0; i--) {
      const db = this.delayedBlasts[i];
      db.delay -= dt;
      if (db.delay <= 0) {
        this.fx.spawnExplosion(db.pos, db.scale, this.camera.position);
        this.fx.spawnBlastCraterAndRubble(db.pos, db.scale);
        this.addActiveFire(db.pos, db.scale, 20);
        this.audio.playExplosion(db.scale);
        this.delayedBlasts.splice(i, 1);
      }
    }

    const warEmbCount = this.embassies.filter((e) => e.atWar).length;
    const warNationCount = this.nations.filter((n) => n.atWar).length;
    if (this.warDeclared && this.truceTimer <= 0) {
      this.warElapsedSec += dt;
      this.retaliationSpawnTimer -= dt;
      if (this.retaliationSpawnTimer <= 0) {
        this.retaliationSpawnTimer = 2.2 * mods.enemyRespawnDelayMult;
        this.spawnRetaliationForce();
      }
      this.updateForeignNationsAndInsurgency(dt);
    }
    const waveCfg = computeWarWaveConfig(Math.min(4, warEmbCount + warNationCount), this.warElapsedSec);

    this.updateTrainingCenters(dt);
    this.updateEmbassyTurrets(dt);
    this.updateEnemyMlrs(dt, waveCfg);
    this.updateEnemies(dt, mods.radarRangeFactor);
    this.updateGroundSoldiers(dt);
    this.updateTanks(dt);
    this.updateAlliedHumveesAndMlrs(dt);
    this.updateSupportEntities(dt);
    this.updateSortieJets(dt);
    this.updateCiws(dt);
    this.updateHqAirDefense(dt);
    this.updateProjectiles(dt);
    this.updateSeekerLock(dt);

    if (this.baseHp < MAX_BASE_HP) {
      this.baseHp = Math.min(MAX_BASE_HP, this.baseHp + dt * 0.45);
    }

    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * 1.45);
    }
  }

  private updateHqAndIntelSystems(dt: number): void {
    // 1. Animate Swinging Doors (Front Double Armored Doors + Inner Security Door)
    const frontOpen =
      this.combatMode === 'ground' &&
      Math.hypot(this.playerPos.x, this.playerPos.z - 11.5) < 5.6;
    const innerOpen =
      this.combatMode === 'ground' &&
      Math.hypot(this.playerPos.x, this.playerPos.z - 26.0) < 4.6;

    const targetFront = frontOpen ? 1.38 : 0;
    const targetInner = innerOpen ? 1.4 : 0;
    if ((this.hqDoorAngleFront < 0.08 && frontOpen) || (this.hqDoorAngleInner < 0.08 && innerOpen)) {
      this.audio.playDoorSwing();
    }
    this.hqDoorAngleFront = THREE.MathUtils.lerp(this.hqDoorAngleFront, targetFront, Math.min(1, dt * 6.5));
    this.hqDoorAngleInner = THREE.MathUtils.lerp(this.hqDoorAngleInner, targetInner, Math.min(1, dt * 6.5));
    this.batteries.hqDoors.frontL.rotation.y = -this.hqDoorAngleFront;
    this.batteries.hqDoors.frontR.rotation.y = this.hqDoorAngleFront;
    this.batteries.hqDoors.innerHq.rotation.y = -this.hqDoorAngleInner;

    // 2. Interior Light Flicker after real bombardment shock
    if (this.hqLightFlickerTimer > 0) {
      this.hqLightFlickerTimer = Math.max(0, this.hqLightFlickerTimer - dt);
      const flick = Math.sin(this.elapsedTime * 42) > 0.2 ? 1.15 : 0.25;
      this.batteries.hqLight.intensity = 3.8 * flick;
      this.batteries.intelLight.intensity = 4.4 * flick;
    } else {
      this.batteries.hqLight.intensity = 3.8;
      this.batteries.intelLight.intensity = 4.4;
    }

    // 3. Spin Secret Site Dishes & Auto-reveal on close flyby/ground recon or Intel Room inspection
    for (const sr of this.batteries.secretSites) {
      sr.dishRotator.rotation.y += dt * 0.9;
      const st = this.secretSites.find((s) => s.id === sr.id);
      if (st && !st.revealed && !st.destroyed) {
        const scoutPos = this.combatMode === 'air' ? this.jetPos : this.playerPos;
        if (Math.hypot(scoutPos.x - st.position[0], scoutPos.z - st.position[2]) < 95) {
          st.revealed = true;
          sr.beaconMesh.visible = true;
          this.audio.playIntelIntercept();
        }
      }
    }

    // 4. Live Eavesdropping Intercepts (الاستماع)
    if (this.listeningActive) {
      this.listenPingTimer -= dt;
      if (this.listenPingTimer <= 0) {
        this.listenPingTimer = 3.2;
        this.audio.playIntelIntercept();
        const hiddenSite = this.secretSites.find((s) => !s.revealed && !s.destroyed);
        if (hiddenSite) {
          hiddenSite.revealed = true;
          const rig = this.batteries.secretSites.find((r) => r.id === hiddenSite.id);
          if (rig) rig.beaconMesh.visible = true;
        }
      }
    }

    // 5. Refresh Live 3D Situation Map Texture inside Intelligence Room & HQ Desk (~3x/s)
    this.intelMapTimer -= dt;
    if (this.intelMapTimer <= 0) {
      this.intelMapTimer = 0.34;
      const ctx = this.batteries.intelLiveMapCtx;
      ctx.fillStyle = '#06131f';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1;
      for (let g = 0; g <= 512; g += 32) {
        ctx.beginPath();
        ctx.moveTo(g, 0);
        ctx.lineTo(g, 512);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, g);
        ctx.lineTo(512, g);
        ctx.stroke();
      }
      const toMapX = (wx: number) => THREE.MathUtils.clamp(((wx + 420) / 620) * 512, 6, 506);
      const toMapY = (wz: number) => THREE.MathUtils.clamp(((wz + 420) / 520) * 512, 6, 506);

      // Training Base outline
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.6)';
      ctx.strokeRect(
        toMapX(FORTIFIED_TRAINING_BASE.minX),
        toMapY(FORTIFIED_TRAINING_BASE.minZ),
        toMapX(FORTIFIED_TRAINING_BASE.maxX) - toMapX(FORTIFIED_TRAINING_BASE.minX),
        toMapY(FORTIFIED_TRAINING_BASE.maxZ) - toMapY(FORTIFIED_TRAINING_BASE.minZ),
      );
      // Our HQ & Intel Complex
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(toMapX(0) - 5, toMapY(24) - 5, 10, 10);

      // Foreign Embassies
      for (const spec of EMBASSY_SPECS) {
        const st = this.embassies.find((e) => e.id === spec.id);
        ctx.fillStyle = st?.atWar ? '#ef4444' : '#60a5fa';
        ctx.fillRect(toMapX(spec.position[0]) - 4, toMapY(spec.position[2]) - 4, 8, 8);
      }

      // Secret Enemy Sites
      for (const s of this.secretSites) {
        if (s.destroyed) continue;
        const sx = toMapX(s.position[0]);
        const sy = toMapY(s.position[2]);
        if (s.revealed) {
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.moveTo(sx, sy - 7);
          ctx.lineTo(sx + 7, sy);
          ctx.lineTo(sx, sy + 7);
          ctx.lineTo(sx - 7, sy);
          ctx.closePath();
          ctx.fill();
        } else if (this.listeningActive) {
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
          ctx.beginPath();
          ctx.arc(sx, sy, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Hostile Aircraft & Tanks
      ctx.fillStyle = '#fb923c';
      for (const e of this.enemies) {
        if (e.crashing) continue;
        ctx.beginPath();
        ctx.arc(toMapX(e.position.x), toMapY(e.position.z), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f87171';
      for (const t of this.tanks) {
        if (t.faction === 'enemy' && t.alive) {
          ctx.fillRect(toMapX(t.position.x) - 2.5, toMapY(t.position.z) - 2.5, 5, 5);
        }
      }
      this.batteries.intelLiveMapTex.needsUpdate = true;
    }
  }

  private updateHqAirDefense(dt: number): void {
    if (!this.warDeclared || this.ewJamTimer > 0 || this.truceTimer > 0) return;
    this.hqSamTimer -= dt;
    if (this.hqSamTimer > 0) return;

    const threateningAir = this.enemies.find(
      (e) => !e.crashing && (e.position.z > -85 || Math.hypot(e.position.x, e.position.z - 24) < 200),
    );
    const threateningMissile = !threateningAir
      ? this.projectiles.find(
          (p) => p.active && p.fromEnemy && p.isMissile && p.position.y >= 10 && p.position.z > -110,
        )
      : null;

    if (!threateningAir && !threateningMissile) return;
    const muzzles = this.batteries.hqSamMuzzles;
    if (muzzles.length === 0) return;

    this.hqSamTimer = this.moraleBoostTimer > 0 ? 1.45 : 2.35;
    const muzzle = muzzles[this.hqSamCycle % muzzles.length];
    this.hqSamCycle++;

    const p = this.acquireProjectile(true, false, false);
    if (!p) return;

    const origin = new THREE.Vector3();
    muzzle.getWorldPosition(origin);
    p.active = true;
    p.fromEnemy = false;
    p.isMissile = true;
    p.isAirDefenseSam = true;
    p.samClimbTimer = 0.44;
    p.position.copy(origin);
    p.velocity.set(0, 62, 0);
    p.targetSpeed = 165;
    p.damage = 140;
    p.blastRadius = 11;
    p.homing = true;
    p.coldTimer = 0;
    p.turnRate = 8.5;
    p.targetEnemyId = threateningAir ? threateningAir.id : null;
    p.targetWorldPos = null;
    p.life = 5.5;
    p.smokeTimer = 0;
    p.mesh.position.copy(origin);
    p.mesh.lookAt(_vecC.copy(origin).add(p.velocity));
    p.mesh.visible = true;
    this.fx.spawnLaunchPlume(origin, true);
    this.audio.playMissileLaunch('cold_sam');
  }

  private updateTrainingCenters(dt: number): void {
    this.trainingSpawnTimer -= dt;
    if (this.trainingSpawnTimer > 0) return;
    this.trainingSpawnTimer = TRAINING_GRADUATION_INTERVAL;

    const aliveAllies = this.groundUnits.filter((u) => u.faction === 'ally' && u.alive).length;
    if (aliveAllies >= MAX_ALLIED_SOLDIERS) return;

    const tc =
      this.batteries.trainingCenters[this.frameTick % Math.max(1, this.batteries.trainingCenters.length)];
    if (!tc) return;
    const branches: AlliedForceBranch[] = ['iraq_army', 'pmf', 'ctu'];
    const spawnPos = tc.musterPos.clone().add(
      new THREE.Vector3((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 6),
    );
    this.spawnGroundSoldier(
      'ally',
      Math.random() > 0.72 ? 'sniper' : 'infantry',
      spawnPos,
      false,
      null,
      true,
      true,
      branches[this.frameTick % branches.length],
    );
  }

  private updateEmbassyTurrets(dt: number): void {
    if (!this.warDeclared || this.ewJamTimer > 0 || this.truceTimer > 0) return;
    this.embassyTurretTimer -= dt;
    if (this.embassyTurretTimer > 0) return;
    this.embassyTurretTimer = 1.25;

    const aliveAllies = this.groundUnits.filter((u) => u.faction === 'ally' && u.alive && !u.dying);

    for (const turret of this.batteries.embassyTurrets) {
      const emb = this.embassies.find((e) => e.id === turret.embassyId);
      if (!emb || !emb.atWar || emb.hp <= 0) continue;

      const worldBase = _vecA;
      turret.yawGroup.getWorldPosition(worldBase);

      let nearestAlly: GroundSoldierUnit | null = null;
      let bestDist = 135;
      for (const a of aliveAllies) {
        const d = a.position.distanceTo(worldBase);
        if (d < bestDist) {
          bestDist = d;
          nearestAlly = a;
        }
      }

      const playerDist = this.playerPos.distanceTo(worldBase);
      const targetPos = nearestAlly
        ? nearestAlly.position
        : playerDist < 95 && !isInsideOurEmbassy(this.playerPos.x, this.playerPos.z)
        ? this.playerPos
        : null;
      if (!targetPos) continue;

      const dx = targetPos.x - worldBase.x;
      const dz = targetPos.z - worldBase.z;
      turret.yawGroup.rotation.y = Math.atan2(-dx, -dz);
      this.spawnSoldierTracer(turret.muzzle, targetPos, true);

      if (nearestAlly) {
        nearestAlly.hp -= 16;
        if (nearestAlly.hp <= 0) {
          nearestAlly.dying = true;
          nearestAlly.collapseProgress = 0;
        }
      } else {
        this.baseHp = applyBaseDamage(this.baseHp, 1.8).nextHp;
      }
    }
  }

  private updateGroundPlayer(dt: number): void {
    const turnSpeed = this.isZoomed ? 1.15 : 2.35;
    let dYaw = -this.virtualSlew.x * turnSpeed * dt;
    let dPitch = this.virtualSlew.y * turnSpeed * dt;

    if (this.keysHeld.has('ArrowLeft')) dYaw += turnSpeed * dt;
    if (this.keysHeld.has('ArrowRight')) dYaw -= turnSpeed * dt;
    if (this.keysHeld.has('ArrowUp')) dPitch += turnSpeed * dt * 0.8;
    if (this.keysHeld.has('ArrowDown')) dPitch -= turnSpeed * dt * 0.8;

    this.targetYaw += dYaw;
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + dPitch, -0.68, 1.46);

    const smooth = 1 - Math.exp(-16 * dt);
    this.aimYaw = THREE.MathUtils.lerp(this.aimYaw, this.targetYaw, smooth);
    this.aimPitch = THREE.MathUtils.lerp(this.aimPitch, this.targetPitch, smooth);

    let moveFwd = this.walkInput.y;
    let moveStrafe = this.walkInput.x;
    if (this.keysHeld.has('KeyW')) moveFwd += 1;
    if (this.keysHeld.has('KeyS')) moveFwd -= 1;
    if (this.keysHeld.has('KeyD')) moveStrafe += 1;
    if (this.keysHeld.has('KeyA')) moveStrafe -= 1;

    const mag = Math.hypot(moveFwd, moveStrafe);
    if (this.hqSeated && mag > 0.28) {
      this.hqSeated = false;
      this.playerFootY = 0;
      this.playerPos.set(this.playerPos.x, 1.72, 32.85);
    }
    if (this.foreignSeatedNation && mag > 0.28) {
      const sp = getNationSpec(this.foreignSeatedNation);
      this.foreignSeatedNation = null;
      this.playerFootY = 0.23;
      this.playerPos.set(sp.palacePos[0], 1.95, sp.palacePos[2] - 8.2);
    }

    if (!this.hqSeated && !this.foreignSeatedNation && mag > 0.05) {
      if (mag > 1) {
        moveFwd /= mag;
        moveStrafe /= mag;
      }
      const walkSpeed = 12.0;
      const sinY = Math.sin(this.aimYaw);
      const cosY = Math.cos(this.aimYaw);
      const vx = (-sinY * moveFwd + cosY * moveStrafe) * walkSpeed * dt;
      const vz = (-cosY * moveFwd - sinY * moveStrafe) * walkSpeed * dt;

      const nextX = THREE.MathUtils.clamp(
        this.playerPos.x + vx,
        WORLD_PLAYABLE_BOUNDS.minX + 5,
        WORLD_PLAYABLE_BOUNDS.maxX - 2,
      );
      const nextZ = THREE.MathUtils.clamp(
        this.playerPos.z + vz,
        WORLD_PLAYABLE_BOUNDS.minZ + 5,
        WORLD_PLAYABLE_BOUNDS.maxZ - 5,
      );

      const onHighDeck = this.playerFootY >= 5.2;
      const fenceHit = checkElectricFenceCollision(nextX, nextZ);
      if (fenceHit.blocked) {
        this.playerPos.x = fenceHit.safeX;
        this.playerPos.z = fenceHit.safeZ;
        this.fx.spawnElectricSparks(new THREE.Vector3(fenceHit.safeX, 1.4, fenceHit.safeZ));
        this.audio.playElectricZap();
        this.baseHp = applyBaseDamage(this.baseHp, 1.5).nextHp;
        this.trauma = Math.min(1, this.trauma + 0.12);
      } else {
        let tryX = nextX;
        let tryZ = nextZ;
        if (!onHighDeck) {
          const safe = resolveCircleObstacleCollision(tryX, tryZ, 0.72, this.effectiveWorldObstacles);
          tryX = safe.x;
          tryZ = safe.z;
          // Solid indoor furniture colliders (Map Table & Executive Desk) with generous aisles
          const safeFurniture = resolveCircleObstacleCollision(tryX, tryZ, 0.55, [
            { minX: -1.65, maxX: 1.65, minZ: 18.4, maxZ: 20.8, kind: 'our_wall' },
            { minX: -2.35, maxX: 2.35, minZ: 30.7, maxZ: 32.5, kind: 'our_wall' },
          ]);
          tryX = safeFurniture.x;
          tryZ = safeFurniture.z;
        }
        const nextSurf = getWalkableElevationAt(tryX, tryZ, this.playerFootY);
        const stepHeight = nextSurf - this.playerFootY;
        if (stepHeight <= 1.05) {
          this.playerPos.x = tryX;
          this.playerPos.z = tryZ;
          if (this.isGrounded && stepHeight > 0) {
            this.playerFootY = nextSurf;
          }
        }
      }
      if (this.isGrounded) {
        this.walkBobPhase += dt * 9.5;
      }
    }

    if (this.hqSeated) {
      this.playerFootY = 0.04;
      this.playerVelY = 0;
      this.isGrounded = true;
      this.playerPos.set(0, 1.54, 33.42);
    } else if (this.foreignSeatedNation) {
      const sp = getNationSpec(this.foreignSeatedNation);
      this.playerFootY = 0.24;
      this.playerVelY = 0;
      this.isGrounded = true;
      this.playerPos.set(sp.palacePos[0], 1.56, sp.palacePos[2] - 10.8);
    } else {
      // Vertical Jump + Gravity + Ramp/Rooftop Landing Physics
      const floorHere = getWalkableElevationAt(this.playerPos.x, this.playerPos.z, this.playerFootY);
      if (!this.isGrounded || this.playerFootY > floorHere + 0.04) {
        this.isGrounded = false;
        this.playerVelY -= 24 * dt;
        this.playerFootY += this.playerVelY * dt;
        if (this.playerFootY <= floorHere) {
          this.playerFootY = floorHere;
          this.playerVelY = 0;
          this.isGrounded = true;
        }
      } else {
        this.playerFootY = floorHere;
      }
      this.playerPos.y = this.playerFootY + 1.72;
    }

    const bobY =
      !this.hqSeated && !this.foreignSeatedNation && mag > 0.05 && this.isGrounded
        ? Math.sin(this.walkBobPhase) * 0.055
        : 0;
    const shake = this.trauma * this.trauma * 0.28;
    this.camPos.set(
      this.playerPos.x + (Math.random() - 0.5) * shake,
      this.playerPos.y + bobY + (Math.random() - 0.5) * shake,
      this.playerPos.z + (Math.random() - 0.5) * shake,
    );
    this.camera.position.copy(this.camPos);

    _vecA.set(
      -Math.sin(this.aimYaw) * Math.cos(this.aimPitch),
      Math.sin(this.aimPitch),
      -Math.cos(this.aimYaw) * Math.cos(this.aimPitch),
    );
    this.camLook.copy(this.camPos).addScaledVector(_vecA, 60);
    this.camera.lookAt(this.camLook);

    const inFormalGround = isInsideOurEmbassy(this.playerPos.x, this.playerPos.z);
    const insideForeignId = isInsideForeignPalace(this.playerPos.x, this.playerPos.z);
    const inPeaceForeignPalace =
      insideForeignId !== null && !this.nations.find((n) => n.id === insideForeignId)?.atWar;
    const shouldLowerWeapon =
      this.weaponHolstered || inFormalGround || inPeaceForeignPalace || this.foreignSeatedNation !== null;
    this.holsterLerp = THREE.MathUtils.lerp(
      this.holsterLerp,
      shouldLowerWeapon ? 1 : 0,
      Math.min(1, dt * 10),
    );
    this.syncFirstPersonWeaponModel();
    this.weaponRecoil = Math.max(0, this.weaponRecoil - dt * 0.45);
    this.fpRig.group.position.set(
      0.26,
      -0.2 + bobY * 0.35 - this.holsterLerp * 0.42,
      -0.56 + this.weaponRecoil + this.holsterLerp * 0.08,
    );
    this.fpRig.group.rotation.set(
      -this.holsterLerp * 0.85,
      0,
      this.holsterLerp * 0.35,
    );

    if (this.fireHeld) {
      this.fireActiveWeapon();
    }
  }

  private updateForeignNationsAndInsurgency(dt: number): void {
    // 1. Foreign nations at war fire long-range retaliatory SAM / ballistic volleys (stronger than base)
    this.foreignSamTimer -= dt;
    if (this.foreignSamTimer <= 0) {
      this.foreignSamTimer = 3.6;
      const warNations = this.nations.filter((n) => n.atWar);
      if (warNations.length > 0 && this.ewJamTimer <= 0) {
        const wn = warNations[this.frameTick % warNations.length];
        const rig = this.batteries.extensions.nations.find((r) => r.id === wn.id);
        const muz = rig?.samMuzzles[0];
        const p = this.acquireProjectile(true, true);
        if (p && muz) {
          const origin = new THREE.Vector3();
          muz.getWorldPosition(origin);
          const impact = new THREE.Vector3((Math.random() - 0.5) * 18, 1.5, 22 + (Math.random() - 0.5) * 14);
          const flightTime = 3.2;
          const g = 14.5;
          p.active = true;
          p.fromEnemy = true;
          p.isMissile = true;
          p.position.copy(origin);
          p.velocity.set(
            (impact.x - origin.x) / flightTime,
            0.5 * g * flightTime - origin.y / flightTime,
            (impact.z - origin.z) / flightTime,
          );
          p.targetSpeed = p.velocity.length();
          p.damage = 7.5 * wn.militaryPower;
          p.blastRadius = 9.0;
          p.homing = false;
          p.coldTimer = 0;
          p.turnRate = 0;
          p.targetEnemyId = null;
          p.targetWorldPos = null;
          p.life = 6.5;
          p.smokeTimer = 0;
          p.mesh.position.copy(origin);
          p.mesh.lookAt(_vecC.copy(origin).add(p.velocity));
          p.mesh.visible = true;
          this.fx.spawnLaunchPlume(origin, true);
        }
      }
    }

    // 2. Urban ISIS blocks deploy insurgent fighters during war
    this.isisInsurgentTimer -= dt;
    if (this.isisInsurgentTimer <= 0) {
      this.isisInsurgentTimer = 6.2;
      const standingBlocks = this.isisBlocks.filter((b) => !b.destroyed);
      const enemyCount = this.groundUnits.filter((u) => u.faction === 'enemy' && u.alive).length;
      if (standingBlocks.length > 0 && enemyCount < MAX_ENEMY_SOLDIERS) {
        const blk = standingBlocks[this.frameTick % standingBlocks.length];
        const safe = resolveCircleObstacleCollision(
          blk.position.x + (Math.random() - 0.5) * 10,
          blk.position.z + 7.5,
          0.9,
          this.effectiveWorldObstacles,
        );
        this.spawnGroundSoldier(
          'enemy',
          Math.random() > 0.7 ? 'sniper' : 'infantry',
          new THREE.Vector3(safe.x, 0.04, safe.z),
          false,
          null,
          Math.random() < 0.35,
        );
      }
    }
  }

  private updateConvoyPlayer(dt: number): void {
    const turnSpeed = 2.0;
    let dYaw = -this.virtualSlew.x * turnSpeed * dt;
    let dPitch = this.virtualSlew.y * turnSpeed * dt;
    if (this.keysHeld.has('ArrowLeft')) dYaw += turnSpeed * dt;
    if (this.keysHeld.has('ArrowRight')) dYaw -= turnSpeed * dt;
    if (this.keysHeld.has('ArrowUp')) dPitch += turnSpeed * dt * 0.7;
    if (this.keysHeld.has('ArrowDown')) dPitch -= turnSpeed * dt * 0.7;
    this.targetYaw += dYaw;
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + dPitch, -0.25, 0.7);
    const smooth = 1 - Math.exp(-12 * dt);
    this.aimYaw = THREE.MathUtils.lerp(this.aimYaw, this.targetYaw, smooth);
    this.aimPitch = THREE.MathUtils.lerp(this.aimPitch, this.targetPitch, smooth);

    let drive = this.walkInput.y;
    let steer = this.walkInput.x;
    if (this.keysHeld.has('KeyW')) drive += 1;
    if (this.keysHeld.has('KeyS')) drive -= 1;
    if (this.keysHeld.has('KeyD')) steer += 1;
    if (this.keysHeld.has('KeyA')) steer -= 1;

    if (Math.abs(drive) > 0.1 || Math.abs(steer) > 0.1) {
      this.convoyDriveMode = 'manual';
    }

    if (this.convoyDriveMode === 'chauffeur') {
      const finalTarget =
        this.convoyDestination === 'home'
          ? new THREE.Vector3(9.5, 0.04, -1.5)
          : new THREE.Vector3(...getNationSpec(this.convoyDestination).welcomeGatePos);

      // Steer onto clear paved boulevards around watchtowers, HQ Complex, Desert Mega-Base & Nation Border Gateways
      const targetPt = finalTarget.clone();
      if (this.convoyDestination !== 'home') {
        const destSpec = getNationSpec(this.convoyDestination);
        if (this.convoyPos.z > -18 && Math.abs(this.convoyPos.x) < 28) {
          targetPt.set(0, 0.04, -26);
        } else if (finalTarget.z > 680 && this.convoyPos.z < 710 && this.convoyPos.x > -360 && this.convoyPos.x < -80) {
          // Route cleanly east or west around Desert Base walls (x:-331..-109, z:469..651)
          const bypassX = finalTarget.x < -220 ? -400 : 0;
          targetPt.set(bypassX, 0.04, Math.max(this.convoyPos.z + 60, 710));
        } else if (finalTarget.z > 40 && this.convoyPos.z < 75 && this.convoyPos.x > -44) {
          targetPt.set(-56, 0.04, -26);
        } else if (finalTarget.z > 40 && this.convoyPos.z < 120 && Math.abs(this.convoyPos.x + 56) < 18) {
          targetPt.set(-56, 0.04, 140);
        } else if (finalTarget.z < -40 && this.convoyPos.z > -20 && Math.abs(this.convoyPos.x) > 8) {
          targetPt.set(0, 0.04, -26);
        } else if (
          Math.abs(this.convoyPos.x - destSpec.palacePos[0]) > 102 ||
          Math.abs(this.convoyPos.z - destSpec.palacePos[2]) > 92
        ) {
          const [ax, ay, az] = getForeignPalaceApproachPoint(destSpec);
          if (Math.hypot(this.convoyPos.x - ax, this.convoyPos.z - az) > 18) {
            targetPt.set(ax, ay, az);
          }
        }
      }

      const dx = targetPt.x - this.convoyPos.x;
      const dz = targetPt.z - this.convoyPos.z;
      const dist = Math.hypot(dx, dz);
      const finalDist = Math.hypot(finalTarget.x - this.convoyPos.x, finalTarget.z - this.convoyPos.z);
      if (finalDist > 6.5 && dist > 1.0) {
        const desiredYaw = Math.atan2(-dx, -dz);
        let diff = desiredYaw - this.convoyYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.convoyYaw += THREE.MathUtils.clamp(diff, -2.1 * dt, 2.1 * dt);
        this.convoySpeed = THREE.MathUtils.lerp(this.convoySpeed, Math.min(34, finalDist * 0.9 + 8), dt * 2.5);
        const step = computeObstacleAwareStep({
          x: this.convoyPos.x,
          z: this.convoyPos.z,
          destX: targetPt.x,
          destZ: targetPt.z,
          speed: this.convoySpeed,
          dt,
          radius: 2.6,
          obstacles: this.effectiveWorldObstacles,
        });
        this.convoyPos.set(
          THREE.MathUtils.clamp(step.x, WORLD_PLAYABLE_BOUNDS.minX + 8, WORLD_PLAYABLE_BOUNDS.maxX - 8),
          0.04,
          THREE.MathUtils.clamp(step.z, WORLD_PLAYABLE_BOUNDS.minZ + 8, WORLD_PLAYABLE_BOUNDS.maxZ - 8),
        );
        if (step.moved && (Math.abs(step.dirX) > 0.01 || Math.abs(step.dirZ) > 0.01)) {
          this.convoyYaw = Math.atan2(-step.dirX, -step.dirZ);
        }
        this.aimYaw = this.targetYaw = THREE.MathUtils.lerp(this.aimYaw, this.convoyYaw, dt * 3.0);
      } else {
        this.convoySpeed = THREE.MathUtils.lerp(this.convoySpeed, 0, dt * 5);
      }
    } else {
      if (Math.abs(steer) > 0.05) {
        this.convoyYaw -= steer * 1.65 * dt;
      }
      const targetSpd = drive * 36;
      this.convoySpeed = THREE.MathUtils.lerp(this.convoySpeed, targetSpd, dt * 4.5);
      if (Math.abs(this.convoySpeed) > 0.25) {
        const vx = -Math.sin(this.convoyYaw) * this.convoySpeed * dt;
        const vz = -Math.cos(this.convoyYaw) * this.convoySpeed * dt;
        const nextX = THREE.MathUtils.clamp(
          this.convoyPos.x + vx,
          WORLD_PLAYABLE_BOUNDS.minX + 8,
          WORLD_PLAYABLE_BOUNDS.maxX - 8,
        );
        const nextZ = THREE.MathUtils.clamp(
          this.convoyPos.z + vz,
          WORLD_PLAYABLE_BOUNDS.minZ + 8,
          WORLD_PLAYABLE_BOUNDS.maxZ - 8,
        );
        const safe = resolveCircleObstacleCollision(nextX, nextZ, 2.5, this.effectiveWorldObstacles);
        this.convoyPos.set(safe.x, 0.04, safe.z);
      }
    }

    // Lead Tahoe = Commander's SUV; other 4 Tahoes & 3 Escort Humvees follow smoothly in armored presidential motorcade!
    const fwdX = -Math.sin(this.convoyYaw);
    const fwdZ = -Math.cos(this.convoyYaw);
    const rightX = Math.cos(this.convoyYaw);
    const rightZ = -Math.sin(this.convoyYaw);

    if (this.convoyTahoes[0]) {
      const lead = this.convoyTahoes[0];
      lead.position.copy(this.convoyPos);
      lead.yaw = this.convoyYaw;
      lead.rig.group.position.copy(lead.position);
      lead.rig.group.rotation.y = lead.yaw;
      for (const w of lead.rig.wheels) w.rotation.x -= this.convoySpeed * dt * 1.8;
    }

    const tahoeOffsets: Array<[number, number]> = [
      [-4.6, -7.8],
      [4.6, -7.8],
      [-4.6, -15.6],
      [4.6, -15.6],
    ];
    for (let i = 1; i < this.convoyTahoes.length; i++) {
      const tv = this.convoyTahoes[i];
      const [ox, oz] = tahoeOffsets[i - 1] ?? [0, -8 * i];
      const tx = this.convoyPos.x + rightX * ox + fwdX * oz;
      const tz = this.convoyPos.z + rightZ * ox + fwdZ * oz;
      const step = computeObstacleAwareStep({
        x: tv.position.x,
        z: tv.position.z,
        destX: tx,
        destZ: tz,
        speed: Math.max(14, Math.abs(this.convoySpeed) + 8),
        dt,
        radius: 2.2,
        obstacles: this.effectiveWorldObstacles,
      });
      tv.position.set(step.x, 0.04, step.z);
      tv.yaw = THREE.MathUtils.lerp(tv.yaw, this.convoyYaw, dt * 4.5);
      tv.rig.group.position.copy(tv.position);
      tv.rig.group.rotation.y = tv.yaw;
      if (step.moved) {
        for (const w of tv.rig.wheels) w.rotation.x -= Math.abs(this.convoySpeed) * dt * 1.6;
      }
    }

    const humveeOffsets: Array<[number, number]> = [
      [-5.6, 8.8],
      [5.6, 8.8],
      [0, -23.5],
    ];
    for (let i = 0; i < this.convoyHumvees.length; i++) {
      const hm = this.convoyHumvees[i];
      const [ox, oz] = humveeOffsets[i] ?? [0, 9];
      const hx = this.convoyPos.x + rightX * ox + fwdX * oz;
      const hz = this.convoyPos.z + rightZ * ox + fwdZ * oz;
      const step = computeObstacleAwareStep({
        x: hm.position.x,
        z: hm.position.z,
        destX: hx,
        destZ: hz,
        speed: Math.max(15, Math.abs(this.convoySpeed) + 9),
        dt,
        radius: 2.2,
        obstacles: this.effectiveWorldObstacles,
      });
      hm.position.set(step.x, 0.04, step.z);
      hm.yaw = THREE.MathUtils.lerp(hm.yaw, this.convoyYaw, dt * 4.5);
      hm.rig.group.position.copy(hm.position);
      hm.rig.group.rotation.y = hm.yaw;
      if (step.moved) {
        for (const w of hm.rig.wheels) w.rotation.x -= Math.abs(this.convoySpeed) * dt * 1.8;
      }
    }

    // Check President Welcome near any peaceful foreign nation's Presidential Palace
    let welcomed: NationId | null = null;
    for (const n of this.nations) {
      if (n.atWar) continue;
      const spec = getNationSpec(n.id);
      if (Math.hypot(this.convoyPos.x - spec.welcomeGatePos[0], this.convoyPos.z - spec.welcomeGatePos[2]) <= 36) {
        welcomed = n.id;
        break;
      }
    }
    this.activePresidentNation = welcomed;

    this.playerPos.set(this.convoyPos.x, 2.2, this.convoyPos.z);
    const camDist = 11.5;
    this.camPos.set(
      this.convoyPos.x + Math.sin(this.aimYaw) * camDist,
      3.85 + Math.sin(this.aimPitch) * 3.5,
      this.convoyPos.z + Math.cos(this.aimYaw) * camDist,
    );
    this.camera.position.copy(this.camPos);
    this.camLook.set(
      this.convoyPos.x - Math.sin(this.aimYaw) * 18,
      2.1 + Math.sin(this.aimPitch) * 6,
      this.convoyPos.z - Math.cos(this.aimYaw) * 18,
    );
    this.camera.lookAt(this.camLook);
  }

  private updateTankPlayer(dt: number): void {
    if (!this.playerTankRig) return;

    const turnSpeed = this.isZoomed ? 1.15 : 2.1;
    let dYaw = -this.virtualSlew.x * turnSpeed * dt;
    let dPitch = this.virtualSlew.y * turnSpeed * dt;
    if (this.keysHeld.has('ArrowLeft')) dYaw += turnSpeed * dt;
    if (this.keysHeld.has('ArrowRight')) dYaw -= turnSpeed * dt;
    if (this.keysHeld.has('ArrowUp')) dPitch += turnSpeed * dt * 0.7;
    if (this.keysHeld.has('ArrowDown')) dPitch -= turnSpeed * dt * 0.7;

    this.targetYaw += dYaw;
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + dPitch, -0.22, 0.75);
    const smooth = 1 - Math.exp(-14 * dt);
    this.aimYaw = THREE.MathUtils.lerp(this.aimYaw, this.targetYaw, smooth);
    this.aimPitch = THREE.MathUtils.lerp(this.aimPitch, this.targetPitch, smooth);

    let drive = this.walkInput.y;
    let steer = this.walkInput.x;
    if (this.keysHeld.has('KeyW')) drive += 1;
    if (this.keysHeld.has('KeyS')) drive -= 1;
    if (this.keysHeld.has('KeyD')) steer += 1;
    if (this.keysHeld.has('KeyA')) steer -= 1;

    if (Math.abs(steer) > 0.05) {
      this.playerTankHullYaw -= steer * 1.45 * dt;
    }

    if (Math.abs(drive) > 0.05) {
      const speed = PLAYER_TANK_CONFIG.speed * drive;
      const vx = -Math.sin(this.playerTankHullYaw) * speed * dt;
      const vz = -Math.cos(this.playerTankHullYaw) * speed * dt;
      const nextX = THREE.MathUtils.clamp(
        this.playerTankPos.x + vx,
        WORLD_PLAYABLE_BOUNDS.minX + 6,
        WORLD_PLAYABLE_BOUNDS.maxX - 4,
      );
      const nextZ = THREE.MathUtils.clamp(
        this.playerTankPos.z + vz,
        WORLD_PLAYABLE_BOUNDS.minZ + 6,
        WORLD_PLAYABLE_BOUNDS.maxZ - 6,
      );
      const fenceHit = checkElectricFenceCollision(nextX, nextZ, 2.2);
      if (fenceHit.blocked) {
        this.playerTankPos.x = fenceHit.safeX;
        this.playerTankPos.z = fenceHit.safeZ;
        this.fx.spawnElectricSparks(new THREE.Vector3(fenceHit.safeX, 1.5, fenceHit.safeZ));
      } else {
        const safe = resolveCircleObstacleCollision(nextX, nextZ, 3.3, this.effectiveWorldObstacles);
        this.playerTankPos.x = safe.x;
        this.playerTankPos.z = safe.z;
      }
      for (const w of this.playerTankRig.wheels) {
        w.rotation.x -= speed * dt * 1.8;
      }
    }

    if (this.playerTankHp < PLAYER_TANK_CONFIG.maxHp * 0.65 && Math.random() < dt * 3.5) {
      const severe = this.playerTankHp < PLAYER_TANK_CONFIG.maxHp * 0.35;
      this.fx.spawnSmokePuff(
        _vecA.set(this.playerTankPos.x, 1.9, this.playerTankPos.z + 1.2),
        severe ? 0x1f2228 : 0x6b7280,
        severe ? 1.3 : 0.85,
        severe ? 4.2 : 3.2,
        1.2,
        severe ? 0.65 : 0.42,
        1.1,
        1.8,
      );
    }

    this.playerPos.set(this.playerTankPos.x, 2.6, this.playerTankPos.z);
    this.playerTankRig.group.position.copy(this.playerTankPos);
    this.playerTankRig.group.rotation.y = this.playerTankHullYaw;

    this.playerTankTurretYaw = this.aimYaw;
    this.playerTankBarrelPitch = THREE.MathUtils.clamp(this.aimPitch, -0.08, 0.55);
    this.playerTankRig.turret.rotation.y = this.playerTankTurretYaw - this.playerTankHullYaw;
    this.playerTankRig.barrelPivot.rotation.x = this.playerTankBarrelPitch;

    const camDist = this.isZoomed ? 4.6 : 9.2;
    const orbitPitch = THREE.MathUtils.clamp(this.aimPitch * 0.45, -0.12, 0.32);
    const shake = this.trauma * this.trauma * 0.25;
    const pivotX = this.playerTankPos.x;
    const pivotY = this.playerTankPos.y + 2.2;
    const pivotZ = this.playerTankPos.z;
    this.camPos.set(
      pivotX + Math.sin(this.aimYaw) * Math.cos(orbitPitch) * camDist + (Math.random() - 0.5) * shake,
      Math.max(1.55, pivotY + 1.65 - Math.sin(orbitPitch) * camDist * 0.65 + (Math.random() - 0.5) * shake),
      pivotZ + Math.cos(this.aimYaw) * Math.cos(orbitPitch) * camDist + (Math.random() - 0.5) * shake,
    );
    this.camera.position.copy(this.camPos);

    _vecA.set(
      -Math.sin(this.aimYaw) * Math.cos(this.aimPitch),
      Math.sin(this.aimPitch),
      -Math.cos(this.aimYaw) * Math.cos(this.aimPitch),
    );
    this.camLook.set(pivotX, pivotY + 0.35, pivotZ).addScaledVector(_vecA, 22);
    this.camera.lookAt(this.camLook);

    if (this.fireHeld) {
      this.firePlayerTankWeapons();
    }
  }

  private firePlayerTankWeapons(): void {
    if (!this.playerTankRig) return;
    if (this.nukeTargetingActive) {
      this.fireHeld = false;
      this.launchNuclearStrike();
      return;
    }

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const aimPoint = _vecB.copy(this.camera.position).addScaledVector(fwd, 190);
    const muz = new THREE.Vector3();
    this.playerTankRig.muzzle.getWorldPosition(muz);

    if (this.playerTankCannonCd <= 0) {
      this.playerTankCannonCd = PLAYER_TANK_CONFIG.cannonCooldown;
      const p = this.acquireProjectile(true, false, false);
      if (p) {
        const dir = aimPoint.clone().sub(muz).normalize();
        p.active = true;
        p.fromEnemy = false;
        p.isMissile = true;
        p.position.copy(muz);
        p.velocity.copy(dir).multiplyScalar(PLAYER_TANK_CONFIG.cannonSpeed);
        p.targetSpeed = PLAYER_TANK_CONFIG.cannonSpeed;
        p.damage = PLAYER_TANK_CONFIG.cannonDamage;
        p.blastRadius = PLAYER_TANK_CONFIG.cannonBlastRadius;
        p.homing = false;
        p.coldTimer = 0;
        p.turnRate = 0;
        p.targetEnemyId = null;
        p.targetWorldPos = null;
        p.life = 3.2;
        p.smokeTimer = 0;
        p.mesh.position.copy(muz);
        p.mesh.lookAt(_vecC.copy(muz).add(p.velocity));
        p.mesh.visible = true;
      }
      this.fx.spawnLaunchPlume(muz, false);
      this.audio.playTankCannon();
      this.trauma = Math.min(1, this.trauma + 0.28);
    }

    if (this.playerTankCoaxCd <= 0) {
      this.playerTankCoaxCd = PLAYER_TANK_CONFIG.coaxCooldown;
      const p = this.acquireProjectile(false, false);
      if (p) {
        const coaxOrigin = muz.clone().add(new THREE.Vector3(0.25, 0.2, 0));
        const dir = aimPoint.clone().sub(coaxOrigin).normalize();
        p.active = true;
        p.fromEnemy = false;
        p.isMissile = false;
        p.position.copy(coaxOrigin);
        p.velocity.copy(dir).multiplyScalar(250);
        p.targetSpeed = 250;
        p.damage = PLAYER_TANK_CONFIG.coaxDamage;
        p.blastRadius = 2.5;
        p.homing = false;
        p.coldTimer = 0;
        p.turnRate = 0;
        p.targetEnemyId = null;
        p.targetWorldPos = null;
        p.life = 1.6;
        p.mesh.position.copy(coaxOrigin);
        p.mesh.lookAt(_vecC.copy(coaxOrigin).add(p.velocity));
        p.mesh.visible = true;
        this.audio.playRifleShot();
      }
    }
  }

  private updateAirPlayer(dt: number): void {
    if (!this.playerJetRig) {
      this.returnToGroundDefense();
      return;
    }
    const jetCfg = PLAYER_JET_CONFIGS[this.selectedJet];
    this.airCannonCooldown = Math.max(0, this.airCannonCooldown - dt);
    this.airMissileCooldown = Math.max(0, this.airMissileCooldown - dt);

    if (this.combatMode === 'landing') {
      if (this.carrierLandingStage === 'approach') {
        const entry = CARRIER_OPERATIONS.approachEntry;
        _vecA.set(entry[0], entry[1], entry[2]).sub(this.jetPos);
        const dist = _vecA.length();
        const stepSpeed = Math.min(dist, 98 * dt);
        if (dist > 0.01) {
          this.jetPos.addScaledVector(_vecA.normalize(), stepSpeed);
        }
        const targetYaw = Math.atan2(-(entry[0] - this.jetPos.x), -(entry[2] - this.jetPos.z));
        this.jetYaw = THREE.MathUtils.lerp(this.jetYaw, targetYaw, dt * 3.5);
        this.jetPitch = THREE.MathUtils.lerp(this.jetPitch, -0.06, dt * 3.5);
        this.jetRoll = THREE.MathUtils.lerp(this.jetRoll, 0, dt * 5.0);
        this.jetSpeed = 72;
        if (dist <= 24) {
          this.carrierLandingStage = 'glideslope';
        }
      } else {
        const step = computeCarrierApproachStep({
          x: this.jetPos.x,
          y: this.jetPos.y,
          z: this.jetPos.z,
          speed: this.jetSpeed,
          dt,
        });
        this.jetPos.set(step.x, step.y, step.z);
        this.jetYaw = THREE.MathUtils.lerp(this.jetYaw, step.yaw, dt * 4.5);
        this.jetPitch = THREE.MathUtils.lerp(this.jetPitch, step.pitch, dt * 4.5);
        this.jetRoll = THREE.MathUtils.lerp(this.jetRoll, 0, dt * 6.0);
        this.jetSpeed = step.speed;
        if (step.touchedDown) {
          this.fx.spawnSmokePuff(this.jetPos, 0xe2e8f0, 1.3, 3.8, 1.0, 0.55, 1.2, 0.8);
          this.audio.playTankCannon();
          this.returnToGroundDefense();
          return;
        }
      }
    } else if (this.combatMode === 'takeoff') {
      this.takeoffTimer -= dt;
      this.jetSpeed = THREE.MathUtils.lerp(this.jetSpeed, jetCfg.cruiseSpeed, dt * 1.6);
      // Catapult run along carrier deck first (2.2s -> 1.1s), then crisp climb over ocean
      this.jetPitch =
        this.takeoffTimer > 1.15
          ? THREE.MathUtils.lerp(this.jetPitch, 0.02, dt * 4)
          : THREE.MathUtils.lerp(this.jetPitch, 0.34, dt * 2.4);
      const fwd = new THREE.Vector3(
        -Math.sin(this.jetYaw) * Math.cos(this.jetPitch),
        Math.sin(this.jetPitch),
        -Math.cos(this.jetYaw) * Math.cos(this.jetPitch),
      ).normalize();
      this.jetPos.addScaledVector(fwd, this.jetSpeed * dt);
      if (this.jetPos.y < CARRIER_OPERATIONS.deckY) {
        this.jetPos.y = CARRIER_OPERATIONS.deckY;
      }
      if (this.takeoffTimer <= 0) {
        this.combatMode = 'air';
      }
    } else {
      let yawInput = -this.virtualSlew.x - this.walkInput.x;
      let pitchInput = this.virtualSlew.y + this.walkInput.y;
      if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) yawInput += 1;
      if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) yawInput -= 1;
      if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) pitchInput += 1;
      if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) pitchInput -= 1;

      this.jetYaw += yawInput * jetCfg.turnRate * dt;
      this.jetPitch = THREE.MathUtils.clamp(this.jetPitch + pitchInput * 1.3 * dt, -0.58, 0.65);
      this.jetRoll = THREE.MathUtils.lerp(this.jetRoll, -yawInput * 0.72, dt * 4.5);
      this.jetSpeed = jetCfg.cruiseSpeed;

      const fwd = new THREE.Vector3(
        -Math.sin(this.jetYaw) * Math.cos(this.jetPitch),
        Math.sin(this.jetPitch),
        -Math.cos(this.jetYaw) * Math.cos(this.jetPitch),
      ).normalize();

      this.jetPos.addScaledVector(fwd, this.jetSpeed * dt);
      this.jetPos.y = THREE.MathUtils.clamp(this.jetPos.y, 18, 175);
      this.jetPos.x = THREE.MathUtils.clamp(this.jetPos.x, -360, 360);
      this.jetPos.z = THREE.MathUtils.clamp(this.jetPos.z, -380, 140);
    }

    const fwdDir = new THREE.Vector3(
      -Math.sin(this.jetYaw) * Math.cos(this.jetPitch),
      Math.sin(this.jetPitch),
      -Math.cos(this.jetYaw) * Math.cos(this.jetPitch),
    ).normalize();

    this.playerJetRig.group.position.copy(this.jetPos);
    this.playerJetRig.group.rotation.order = 'YXZ';
    this.playerJetRig.group.rotation.set(this.jetPitch, this.jetYaw, this.jetRoll);

    const pulse = 0.85 + Math.sin(this.elapsedTime * 34) * 0.2;
    for (const flame of this.playerJetRig.afterburners) {
      flame.scale.set(1, 1, pulse);
    }

    const camOffset = new THREE.Vector3(0, 3.6, 14.5).applyEuler(this.playerJetRig.group.rotation);
    this.camera.position.copy(this.jetPos).add(camOffset);
    this.camera.lookAt(_vecA.copy(this.jetPos).addScaledVector(fwdDir, 55));

    if (this.fireHeld && this.combatMode === 'air') {
      this.firePlayerJetWeapons();
    }
  }

  private updateEnemies(dt: number, radarRangeFactor: number): void {
    _projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_projScreenMatrix);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= dt;
        if (e.hitFlashTimer <= 0 && !this.thermalActive) {
          for (const m of e.rig.bodyMeshes) {
            (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
          }
        }
      }

      if (e.crashing) {
        e.crashTimer += dt;
        e.velocity.y -= 24 * dt;
        e.position.addScaledVector(e.velocity, dt);
        e.rig.group.position.copy(e.position);
        e.rig.airframeGroup.rotation.z += e.crashSpin * dt;
        e.rig.airframeGroup.rotation.x = Math.min(1.1, e.rig.airframeGroup.rotation.x + dt * 1.4);

        if (Math.random() < 0.65) {
          this.fx.spawnSmokePuff(e.position, 0x2d3138, 1.8, 5.8, 1.4, 0.72, 2.2, 2.5);
        }

        if (e.position.y <= 1.8 || e.crashTimer >= 4.5) {
          e.position.y = Math.max(1.8, e.position.y);
          this.fx.spawnExplosion(e.position, 1.35, this.camera.position);
          this.audio.playExplosion(1.15);
          this.scene.remove(e.rig.group);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      const cfg = ENEMY_CONFIGS[e.type];
      e.phase += dt;

      const targetCenter = _vecA.set(
        Math.sin(e.phase * 0.35) * 65 * e.orbitSign,
        THREE.MathUtils.lerp(cfg.minAltitude, cfg.maxAltitude, 0.5 + 0.35 * Math.sin(e.phase * 0.4)),
        -55 + Math.cos(e.phase * 0.25) * 35,
      );
      const desiredDir = targetCenter.sub(e.position).normalize();
      e.velocity.lerp(desiredDir.multiplyScalar(cfg.speed), dt * 1.4);
      e.position.addScaledVector(e.velocity, dt);

      e.rig.group.position.copy(e.position);
      e.rig.group.lookAt(_vecB.copy(e.position).add(e.velocity));
      for (const r of e.rig.rotors) {
        r.rotation.y += dt * 26;
      }

      e.rig.group.visible = _frustum.intersectsSphere(_cullSphere.set(e.position, 14));
      if (e.rig.group.visible) {
        e.rig.lod.update(this.camera);
      }

      const dx = e.position.x - this.playerPos.x;
      const dz = e.position.z - this.playerPos.z;
      const dist = Math.hypot(dx, dz);
      const bearing = Math.atan2(dx, -dz);
      const det = computeRadarDetection({
        enemyType: e.type,
        distance: dist,
        bearingRad: bearing,
        radarAngleRad: this.radarAngle,
        radarLevel: this.upgrades.radarLevel,
        previousStrength: e.radarStrength,
        dt,
        radarRangeFactor,
      });
      e.radarStrength = det.strength;
      e.canLockHoming = det.canLockHoming;

      if (
        !e.flybyPlayed &&
        dist < 58 &&
        (e.type === 'fighter' || e.type === 'stealth' || e.type === 'bomber')
      ) {
        e.flybyPlayed = true;
        this.audio.playJetFlyby();
      }

      if (this.ewJamTimer > 0 || this.truceTimer > 0) continue;

      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = cfg.attackCooldown;
        e.windupTimer = cfg.windupDuration;
      }
      if (e.windupTimer > 0) {
        e.windupTimer -= dt;
        e.rig.telegraphRing.visible = true;
        e.rig.telegraphRing.lookAt(this.camera.position);
        if (e.windupTimer <= 0) {
          e.rig.telegraphRing.visible = false;
          this.spawnEnemyMissile(e);
        }
      }
    }
  }

  private syncSoldierBatchVisuals(): void {
    if (!this.soldierBatch) return;
    const t = performance.now() * 0.0024;
    this.soldierBatch.beginFrame();
    for (const s of this.groundUnits) {
      if (s.rig !== null || !s.alive) continue;
      const flagWave = s.hasFlag ? Math.sin(t * 2.5 + s.id) * 0.28 : 0;
      this.soldierBatch.pushUnit(
        s.faction,
        s.position.x,
        s.position.y,
        s.position.z,
        s.yaw,
        s.dying ? s.collapseProgress : 0,
        s.hasFlag,
        flagWave,
        s.crouchProgress,
        s.branch,
      );
    }
    this.soldierBatch.commit();
  }

  private updateGroundSoldiers(dt: number): void {
    const aliveEnemies = this.groundUnits.filter(
      (u) => u.faction === 'enemy' && u.alive && !u.dying,
    );
    const aliveAllies = this.groundUnits.filter(
      (u) => u.faction === 'ally' && u.alive && !u.dying,
    );
    const activeAir = this.enemies.filter((e) => !e.crashing);
    const denseUnits = this.groundUnits.length > 26;
    const mobilizeReserves =
      this.reservesMobilized || shouldMobilizeReserves(this.squadOrder, this.directReserveOrder);

    for (let i = this.groundUnits.length - 1; i >= 0; i--) {
      const s = this.groundUnits[i];

      if (s.dying) {
        s.collapseProgress = Math.min(1, s.collapseProgress + dt * 2.4);
        if (s.rig) {
          s.rig.group.rotation.x = -s.collapseProgress * (Math.PI / 2);
          s.rig.group.position.y = THREE.MathUtils.lerp(0.04, 0.22, s.collapseProgress);
        }
        if (s.collapseProgress >= 1) {
          s.lingerTimer += dt;
          if (s.lingerTimer >= 3.2) {
            if (s.faction === 'ally' && !s.isSleeper) {
              s.alive = false;
              s.dying = false;
              s.respawnTimer = 4.5;
              if (s.rig) s.rig.group.visible = false;
            } else {
              if (s.rig) this.scene.remove(s.rig.group);
              this.groundUnits.splice(i, 1);
            }
          }
        }
        continue;
      }

      if (!s.alive) {
        if (s.faction === 'ally' && !s.isSleeper) {
          s.respawnTimer -= dt;
          if (s.respawnTimer <= 0) {
            s.alive = true;
            s.hp = s.maxHp;
            s.crouchProgress = 0;
            s.position.copy(s.homeSlot);
            s.yaw = 0;
            if (s.rig) {
              s.rig.group.position.copy(s.position);
              s.rig.group.rotation.set(0, 0, 0);
              s.rig.group.visible = true;
            }
          }
        }
        continue;
      }

      const dest = _vecA.copy(s.position);
      let moveSpeed = 0;
      let targetCrouch = 0;

      if (s.faction === 'ally') {
        if (s.branch === 'commander') {
          // Training Commander stays on Desert Base podium drilling reserve ranks!
          dest.copy(s.homeSlot);
          moveSpeed = s.position.distanceTo(s.homeSlot) > 1.0 ? 4.2 : 0;
          s.yaw = Math.sin(this.elapsedTime * 0.7) * 0.55;
        } else if (s.branch === 'presidential_guard') {
          // Presidential Guards hold ceremonial posts guarding Our Presidential Palace & HQ Forecourt
          dest.copy(s.homeSlot);
          moveSpeed = s.position.distanceTo(s.homeSlot) > 1.2 ? 4.8 : 0;
          if (moveSpeed === 0) {
            s.yaw = s.homeSlot.x < 0 ? -Math.PI * 0.15 : Math.PI * 0.15;
          }
        } else if (s.isBorderGuard) {
          dest.copy(s.homeSlot);
          moveSpeed = s.position.distanceTo(s.homeSlot) > 1.8 ? 5.2 : 0;
        } else if (s.isSleeper) {
          const embId = s.sleeperTargetEmbassy ?? 'ru_embassy';
          const spec = EMBASSY_SPECS.find((sp) => sp.id === embId) ?? EMBASSY_SPECS[1];
          const orbitAng = this.elapsedTime * 0.55 + s.id * 0.9;
          dest.set(
            spec.position[0] + Math.cos(orbitAng) * 18.5,
            0.04,
            spec.position[2] + Math.sin(orbitAng) * 15.5,
          );
          moveSpeed = 10.6;
        } else if (s.isReserve && !mobilizeReserves) {
          // Strict reserve discipline: remain stationary in parade ranks inside Southern Desert Mega-Base
          dest.copy(s.homeSlot);
          moveSpeed = s.position.distanceTo(s.homeSlot) > 1.8 ? 5.4 : 0;
        } else if (
          s.isReserve &&
          s.position.z >= FORTIFIED_TRAINING_BASE.minZ - 2 &&
          s.position.z <= FORTIFIED_TRAINING_BASE.maxZ + 2 &&
          s.position.x >= FORTIFIED_TRAINING_BASE.minX - 2 &&
          s.position.x <= FORTIFIED_TRAINING_BASE.maxX + 2
        ) {
          // Exit Southern Desert Mega-Base cleanly through North Gate (gateZ = 470)
          dest.set(
            FORTIFIED_TRAINING_BASE.centerX + ((s.id % 5) - 2) * 2.2,
            0.04,
            FORTIFIED_TRAINING_BASE.gateZ - 14.0,
          );
          moveSpeed = 9.4;
        } else if (s.hp < s.maxHp * 0.35 && this.warDeclared) {
          // Tactical retreat toward HQ when severely wounded
          s.coverState = 'retreating';
          dest.set(((s.id % 5) - 2) * 3.0, 0.04, 6.0);
          moveSpeed = 9.2;
        } else if (
          this.warDeclared &&
          this.bombardmentCoverTimer > 0 &&
          this.batteries.bunkerPositions.length > 0 &&
          s.position.distanceTo(this.lastBombardmentPos) < 42
        ) {
          s.coverState = 'taking_cover';
          targetCrouch = 1;
          let bestBunker = this.batteries.bunkerPositions[0];
          let bestBDist = s.position.distanceTo(bestBunker);
          for (const bp of this.batteries.bunkerPositions) {
            const bd = s.position.distanceTo(bp);
            if (bd < bestBDist) {
              bestBDist = bd;
              bestBunker = bp;
            }
          }
          dest.set(
            bestBunker.x + ((s.id % 3) - 1) * 2.4,
            0.04,
            bestBunker.z + 3.2 + (s.id % 2) * 1.4,
          );
          moveSpeed = 8.4;
        } else if (this.warDeclared && !s.isReserve) {
          // Tactical cover peeking & bounding around sandbag/Hesco barriers
          const cover = findNearestCoverBarrier(s.position.x, s.position.z, 44);
          if (cover) {
            s.peekTimer -= dt;
            if (s.peekTimer <= 0) {
              s.coverState = s.coverState === 'peeking' ? 'taking_cover' : 'peeking';
              s.peekTimer = s.coverState === 'peeking' ? 1.5 : 1.9;
            }
            const latOffset = s.coverState === 'peeking' ? s.peekSign * 0.65 : ((s.id % 3) - 1) * 0.9;
            targetCrouch = s.coverState === 'taking_cover' ? 1 : 0.25;
            dest.set(cover.x + latOffset, 0.04, cover.z + 1.45);
            moveSpeed = 6.2;
          } else if (this.squadOrder === 'follow') {
            const anchorZ = isInsideOurEmbassy(this.playerPos.x, this.playerPos.z) ? 6.0 : this.playerPos.z;
            const anchorX = isInsideOurEmbassy(this.playerPos.x, this.playerPos.z) ? 0 : this.playerPos.x;
            dest.set(anchorX + ((s.id % 11) - 5) * 3.8, 0.04, anchorZ - 6.5 - (Math.floor(s.id / 11) % 5) * 2.8);
            moveSpeed = 7.4;
          } else {
            dest.set(((s.id % 15) - 7) * 6.5, 0.04, -44 - (Math.floor(s.id / 15) % 4) * 3.8);
            moveSpeed = 8.4;
          }
        } else if (s.isReserve && mobilizeReserves && !this.warDeclared && this.squadOrder === 'follow') {
          dest.set(((s.id % 15) - 7) * 6.5, 0.04, -46 - (Math.floor(s.id / 15) % 4) * 3.8);
          moveSpeed = 8.4;
        } else if (this.squadOrder === 'follow') {
          const anchorZ = isInsideOurEmbassy(this.playerPos.x, this.playerPos.z)
            ? 6.0
            : this.playerPos.z;
          const anchorX = isInsideOurEmbassy(this.playerPos.x, this.playerPos.z)
            ? 0
            : this.playerPos.x;
          const offsetX = ((s.id % 11) - 5) * 3.8;
          const offsetZ = -6.5 - (Math.floor(s.id / 11) % 5) * 2.8;
          dest.set(anchorX + offsetX, 0.04, anchorZ + offsetZ);
          moveSpeed = 7.4;
        } else if (this.squadOrder === 'advance') {
          dest.set(
            ((s.id % 15) - 7) * 6.5,
            0.04,
            -44 - (Math.floor(s.id / 15) % 4) * 3.8,
          );
          moveSpeed = 8.4;
        } else {
          const targetEmb = this.embassies.find((e) => e.atWar);
          const spec = targetEmb ? EMBASSY_SPECS.find((sp) => sp.id === targetEmb.id) : null;
          dest.set(
            (spec ? spec.position[0] : 0) + ((s.id % 13) - 6) * 4.2,
            0.04,
            (spec ? spec.position[2] + 22 : -76) - (Math.floor(s.id / 13) % 4) * 3.4,
          );
          moveSpeed = 8.8;
        }
      } else {
        if (s.isBorderGuard) {
          dest.copy(s.homeSlot);
          moveSpeed = s.position.distanceTo(s.homeSlot) > 1.8 ? 4.8 : 0;
        } else {
          dest.set(((s.id % 14) - 6.5) * 6.0, 0.04, -18 - (s.id % 4) * 3.5);
          moveSpeed = this.truceTimer > 0 ? 0 : 5.0;
        }
      }

      s.crouchProgress = THREE.MathUtils.lerp(s.crouchProgress, targetCrouch, dt * 7);

      const horizDist = Math.hypot(dest.x - s.position.x, dest.z - s.position.z);
      if (horizDist > 1.5 && moveSpeed > 0) {
        const step = computeObstacleAwareStep({
          x: s.position.x,
          z: s.position.z,
          destX: dest.x,
          destZ: dest.z,
          speed: moveSpeed,
          dt,
          radius: 0.85,
          obstacles: this.effectiveWorldObstacles,
        });
        let nextX = THREE.MathUtils.clamp(step.x, WORLD_PLAYABLE_BOUNDS.minX + 6, WORLD_PLAYABLE_BOUNDS.maxX - 4);
        let nextZ = THREE.MathUtils.clamp(step.z, WORLD_PLAYABLE_BOUNDS.minZ + 6, WORLD_PLAYABLE_BOUNDS.maxZ - 6);
        if (s.faction === 'ally' && this.combatMode === 'ground') {
          const pdx = nextX - this.playerPos.x;
          const pdz = nextZ - this.playerPos.z;
          const pDist = Math.hypot(pdx, pdz);
          if (pDist < 3.4) {
            const nx = pDist > 0.05 ? pdx / pDist : 1;
            const nz = pDist > 0.05 ? pdz / pDist : 0;
            nextX = this.playerPos.x + nx * 3.4;
            nextZ = this.playerPos.z + nz * 3.4;
          }
        }
        s.position.set(nextX, 0.04, nextZ);
        if (step.moved && (Math.abs(step.dirX) > 0.01 || Math.abs(step.dirZ) > 0.01)) {
          s.yaw = Math.atan2(-step.dirX, -step.dirZ);
        }
        if (s.rig) {
          s.rig.group.position.set(s.position.x, s.position.y - s.crouchProgress * 0.28, s.position.z);
          s.rig.group.rotation.y = s.yaw;
          if (
            Math.abs(s.position.x - this.playerPos.x) < 95 &&
            Math.abs(s.position.z - this.playerPos.z) < 95
          ) {
            s.walkPhase += dt * moveSpeed * 1.45;
            const swing = Math.sin(s.walkPhase) * 0.55;
            s.rig.leftLeg.rotation.x = swing;
            s.rig.rightLeg.rotation.x = -swing;
          }
        }
      } else if (
        s.rig &&
        Math.abs(s.position.x - this.playerPos.x) < 95 &&
        Math.abs(s.position.z - this.playerPos.z) < 95
      ) {
        s.rig.group.position.set(s.position.x, s.position.y - s.crouchProgress * 0.28, s.position.z);
        s.rig.group.rotation.y = s.yaw;
        s.rig.leftLeg.rotation.x = THREE.MathUtils.lerp(s.rig.leftLeg.rotation.x, 0, dt * 8);
        s.rig.rightLeg.rotation.x = THREE.MathUtils.lerp(s.rig.rightLeg.rotation.x, 0, dt * 8);
      }

      if (s.branch === 'commander') continue;
      if (s.isBorderGuard && s.borderNationId) {
        const bNation = this.nations.find((n) => n.id === s.borderNationId);
        if (!bNation?.atWar) continue;
      } else if (!this.warDeclared && !s.isSleeper) {
        continue;
      }
      if (s.faction === 'enemy' && this.truceTimer > 0) continue;
      if (s.faction === 'ally' && s.isReserve && !mobilizeReserves) {
        const nearIntruder = aliveEnemies.some((e) => e.position.distanceTo(s.position) < 34);
        if (!nearIntruder) continue;
      }

      s.fireCooldown -= dt;
      if (s.fireCooldown <= 0) {
        if (denseUnits && (s.id + this.frameTick) % 4 !== 0) {
          s.fireCooldown = 0.12;
          continue;
        }

        const tracerSrc: THREE.Object3D | THREE.Vector3 = s.rig
          ? s.rig.muzzle
          : _vecC.set(s.position.x, s.position.y + 1.25 - s.crouchProgress * 0.28, s.position.z);

        if (s.faction === 'ally') {
          const targetSoldier = aliveEnemies[s.id % Math.max(1, aliveEnemies.length)];
          const targetAir = activeAir[s.id % Math.max(1, activeAir.length)];

          if (targetSoldier && (!s.isSleeper || targetSoldier.position.distanceTo(s.position) < 95)) {
            s.fireCooldown = s.isSleeper ? 0.52 : s.role === 'sniper' ? 1.55 : 0.95;
            s.yaw = Math.atan2(-(targetSoldier.position.x - s.position.x), -(targetSoldier.position.z - s.position.z));
            if (s.rig) s.rig.group.rotation.y = s.yaw;
            this.spawnSoldierTracer(tracerSrc, targetSoldier.position, false);
            if (this.elapsedTime - this.lastSoldierAudioTime > 0.24) {
              this.lastSoldierAudioTime = this.elapsedTime;
              this.audio.playRifleShot();
            }
            targetSoldier.hp -= s.isSleeper ? 44 : s.role === 'sniper' ? 38 : 18;
            if (targetSoldier.hp <= 0 && !targetSoldier.dying) {
              targetSoldier.dying = true;
              targetSoldier.collapseProgress = 0;
              this.kills++;
              this.credits += 65;
              this.score += 90;
              this.updateBestScore();
            }
          } else if (s.isSleeper) {
            const embId = s.sleeperTargetEmbassy ?? 'ru_embassy';
            const spec = EMBASSY_SPECS.find((sp) => sp.id === embId);
            if (spec) {
              s.fireCooldown = 0.65;
              const hitPt = _vecB.set(spec.position[0], 4.0, spec.position[2]);
              s.yaw = Math.atan2(-(hitPt.x - s.position.x), -(hitPt.z - s.position.z));
              if (s.rig) s.rig.group.rotation.y = s.yaw;
              this.spawnSoldierTracer(tracerSrc, hitPt, false);
              const res = applyEmbassyAttack(this.embassies, spec.id, 14, 'embassy');
              this.embassies = res.nextEmbassies;
              this.warDeclared = res.anyWarDeclared;
              this.updateEmbassyDamageVisual(spec.id);
              if (res.newlyDeclaredWar) this.onNewWarDeclared(spec.id);
            } else {
              s.fireCooldown = 0.6;
            }
          } else if (targetAir && targetAir.position.distanceTo(s.position) < 160) {
            s.fireCooldown = s.role === 'sniper' ? 1.65 : 1.1;
            s.yaw = Math.atan2(-(targetAir.position.x - s.position.x), -(targetAir.position.z - s.position.z));
            if (s.rig) s.rig.group.rotation.y = s.yaw;
            this.spawnSoldierTracer(tracerSrc, targetAir.position, false);
            this.damageEnemyAircraft(targetAir, s.role === 'sniper' ? 22 : 10);
          } else {
            s.fireCooldown = 0.75;
          }
        } else {
          const ally = aliveAllies[s.id % Math.max(1, aliveAllies.length)];
          s.fireCooldown = s.role === 'sniper' ? 2.1 : 1.45;
          if (ally && ally.position.distanceTo(s.position) < 130) {
            s.yaw = Math.atan2(-(ally.position.x - s.position.x), -(ally.position.z - s.position.z));
            if (s.rig) s.rig.group.rotation.y = s.yaw;
            this.spawnSoldierTracer(tracerSrc, ally.position, true);
            ally.hp -= 15;
            if (ally.hp <= 0 && !ally.dying) {
              ally.dying = true;
              ally.collapseProgress = 0;
            }
          } else {
            this.baseHp = applyBaseDamage(this.baseHp, 1.4).nextHp;
          }
        }
      }
    }

    this.syncSoldierBatchVisuals();
  }

  private resolveVehicleCommandDest(
    curPos: THREE.Vector3,
    slotX: number,
    slotZ: number,
    radius: number,
    rawTarget: THREE.Vector3,
  ): THREE.Vector3 {
    const insideBase =
      curPos.z >= FORTIFIED_TRAINING_BASE.minZ - 2 &&
      curPos.z <= FORTIFIED_TRAINING_BASE.maxZ + 2 &&
      curPos.x >= FORTIFIED_TRAINING_BASE.minX - 2 &&
      curPos.x <= FORTIFIED_TRAINING_BASE.maxX + 2;
    if (insideBase && rawTarget.z < FORTIFIED_TRAINING_BASE.minZ) {
      return new THREE.Vector3(FORTIFIED_TRAINING_BASE.centerX, 0.04, FORTIFIED_TRAINING_BASE.gateZ - 14);
    }
    const safe = resolveCircleObstacleCollision(
      THREE.MathUtils.clamp(rawTarget.x + slotX, WORLD_PLAYABLE_BOUNDS.minX + 6, WORLD_PLAYABLE_BOUNDS.maxX - 5),
      THREE.MathUtils.clamp(rawTarget.z + slotZ, WORLD_PLAYABLE_BOUNDS.minZ + 6, WORLD_PLAYABLE_BOUNDS.maxZ - 6),
      radius,
      this.effectiveWorldObstacles,
    );
    return new THREE.Vector3(safe.x, 0.04, safe.z);
  }

  private emitVehicleDamageSmoke(pos: THREE.Vector3, hp: number, maxHp: number, timer: number, dt: number): number {
    const ratio = hp / Math.max(1, maxHp);
    if (ratio >= 0.65) return 0;
    const nextTimer = timer - dt;
    if (nextTimer <= 0) {
      const severe = ratio < 0.35;
      this.fx.spawnSmokePuff(
        _vecB.set(pos.x, pos.y + 1.85, pos.z),
        severe ? 0x1e2126 : 0x6b7280,
        severe ? 1.45 : 0.9,
        severe ? 4.4 : 3.2,
        1.25,
        severe ? 0.68 : 0.42,
        1.1,
        1.9,
      );
      if (severe) {
        this.fx.spawnFireGlow(_vecB.set(pos.x, pos.y + 1.5, pos.z), 0xf97316, 1.1, 2.5, 0.22, 1.4);
      }
      return severe ? 0.24 : 0.42;
    }
    return nextTimer;
  }

  private updateTanks(dt: number): void {
    const mobilizeReserves =
      this.reservesMobilized || shouldMobilizeReserves(this.squadOrder, this.directReserveOrder);
    let allyIndex = 0;
    for (let i = this.tanks.length - 1; i >= 0; i--) {
      const t = this.tanks[i];
      if (!t.alive) {
        t.wreckTimer -= dt;
        if (Math.random() < 0.35) {
          this.fx.spawnSmokePuff(t.position, 0x262626, 1.5, 4.5, 1.5, 0.55, 1.2, 2.2);
        }
        if (t.wreckTimer <= 0) {
          this.scene.remove(t.rig.group);
          this.tanks.splice(i, 1);
        }
        continue;
      }

      t.smokeTimer = this.emitVehicleDamageSmoke(t.position, t.hp, t.maxHp, t.smokeTimer, dt);

      const dest = _vecA.copy(t.position);
      let moveSpeed = 0;

      if (t.faction === 'ally') {
        const slotIdx = allyIndex++;
        if (t.isReserve && !mobilizeReserves) {
          moveSpeed = 0;
        } else if (this.tankOrder === 'hold' && !(t.isReserve && mobilizeReserves)) {
          // Strict Command-Only Rule: tanks NEVER move or shoot autonomously while on Hold
          moveSpeed = 0;
        } else if (this.tankOrder === 'move' && this.tankTargetPoint) {
          const col = (slotIdx % 3) - 1;
          const row = Math.floor(slotIdx / 3);
          const routed = this.resolveVehicleCommandDest(
            t.position,
            col * 10.5,
            row * 9.5,
            3.3,
            this.tankTargetPoint,
          );
          dest.copy(routed);
          moveSpeed = 6.2;
        } else if (this.tankOrder === 'strike' && this.tankTargetPoint) {
          const dToTarget = t.position.distanceTo(this.tankTargetPoint);
          if (dToTarget > 135) {
            const routed = this.resolveVehicleCommandDest(t.position, 0, 0, 3.3, this.tankTargetPoint);
            dest.copy(routed);
            moveSpeed = 5.4;
          }
        } else if (t.isReserve && mobilizeReserves) {
          const col = (slotIdx % 3) - 1;
          const row = Math.floor(slotIdx / 3);
          const routed = this.resolveVehicleCommandDest(
            t.position,
            col * 10.5,
            row * 9.5,
            3.3,
            new THREE.Vector3(0, 0.04, -36),
          );
          dest.copy(routed);
          moveSpeed = 6.2;
        }
      } else {
        dest.set(t.homeSlot.x * 0.45, 0.04, -26);
        moveSpeed = 4.2;
      }

      const horizDist = Math.hypot(dest.x - t.position.x, dest.z - t.position.z);
      if (horizDist > 2.6 && moveSpeed > 0) {
        const step = computeObstacleAwareStep({
          x: t.position.x,
          z: t.position.z,
          destX: dest.x,
          destZ: dest.z,
          speed: moveSpeed,
          dt,
          radius: 3.3,
          obstacles: this.effectiveWorldObstacles,
        });
        t.position.set(
          THREE.MathUtils.clamp(step.x, WORLD_PLAYABLE_BOUNDS.minX + 6, WORLD_PLAYABLE_BOUNDS.maxX - 5),
          0.04,
          THREE.MathUtils.clamp(step.z, WORLD_PLAYABLE_BOUNDS.minZ + 6, WORLD_PLAYABLE_BOUNDS.maxZ - 6),
        );
        t.rig.group.position.copy(t.position);
        if (step.moved && (Math.abs(step.dirX) > 0.01 || Math.abs(step.dirZ) > 0.01)) {
          t.rig.group.rotation.y = Math.atan2(-step.dirX, -step.dirZ);
        }
        for (const w of t.rig.wheels) {
          w.rotation.x -= moveSpeed * dt * 1.6;
        }
      }

      // Allied tanks ONLY shoot when explicitly ordered 'strike' by player!
      if (t.faction === 'ally') {
        if (t.isReserve && !mobilizeReserves) continue;
        if (this.tankOrder !== 'strike' || !this.tankTargetPoint) {
          continue;
        }
        t.fireCooldown -= dt;
        if (t.fireCooldown <= 0) {
          t.fireCooldown = 2.1 + (t.id % 3) * 0.2;
          const nearEnemyTank = this.tanks.find(
            (x) => x.faction === 'enemy' && x.alive && x.position.distanceTo(this.tankTargetPoint!) < 48,
          );
          const nearMlrs = this.enemyMlrsUnits.find(
            (m) => m.alive && m.position.distanceTo(this.tankTargetPoint!) < 48,
          );
          const strikePos = nearEnemyTank
            ? nearEnemyTank.position.clone()
            : nearMlrs
            ? nearMlrs.position.clone()
            : this.tankTargetPoint.clone();

          const dx = strikePos.x - t.position.x;
          const dz = strikePos.z - t.position.z;
          t.rig.turret.rotation.y = Math.atan2(-dx, -dz) - t.rig.group.rotation.y;

          const origin = new THREE.Vector3();
          t.rig.muzzle.getWorldPosition(origin);
          const p = this.acquireProjectile(true, false, false);
          if (p) {
            const dir = _vecB.copy(strikePos).add(new THREE.Vector3(0, 1.5, 0)).sub(origin).normalize();
            p.active = true;
            p.fromEnemy = false;
            p.isMissile = true;
            p.position.copy(origin);
            p.velocity.copy(dir).multiplyScalar(175);
            p.targetSpeed = 175;
            p.damage = 190;
            p.blastRadius = 11;
            p.homing = true;
            p.coldTimer = 0;
            p.turnRate = 5.5;
            p.targetEnemyId = null;
            p.targetWorldPos = strikePos.clone();
            p.life = 3.4;
            p.smokeTimer = 0;
            p.mesh.position.copy(origin);
            p.mesh.lookAt(_vecC.copy(origin).add(p.velocity));
            p.mesh.visible = true;
            this.fx.spawnLaunchPlume(origin, false);
            this.audio.playTankCannon();
          }
        }
        continue;
      }

      // Hostile Enemy Tanks
      if (!this.warDeclared) continue;
      t.fireCooldown -= dt;
      if (t.fireCooldown <= 0) {
        const aTank = this.tanks.find((x) => x.faction === 'ally' && x.alive);
        t.fireCooldown = 3.1;
        if (aTank) {
          const dx = aTank.position.x - t.position.x;
          const dz = aTank.position.z - t.position.z;
          t.rig.turret.rotation.y = Math.atan2(-dx, -dz) - t.rig.group.rotation.y;
          this.spawnSoldierTracer(t.rig.muzzle, aTank.position, true);
          this.audio.playTankCannon();
          aTank.hp -= 35;
          if (aTank.hp <= 0) aTank.hp = 420;
        } else {
          this.baseHp = applyBaseDamage(this.baseHp, 3).nextHp;
        }
      }
    }
  }

  private updateAlliedHumveesAndMlrs(dt: number): void {
    const mobilizeReserves =
      this.reservesMobilized || shouldMobilizeReserves(this.squadOrder, this.directReserveOrder);

    // 1. Armored Humvees (.50 Cal Roof Turret — strictly command-only 'hold' | 'move' | 'strike')
    this.humvees.forEach((h, idx) => {
      if (!h.alive) return;
      h.smokeTimer = this.emitVehicleDamageSmoke(h.position, h.hp, h.maxHp, h.smokeTimer, dt);
      if (h.isReserve && !mobilizeReserves) return;

      const dest = _vecA.copy(h.position);
      let moveSpeed = 0;
      if (this.tankOrder === 'move' && this.tankTargetPoint) {
        const slotX = ((idx % 2) * 2 - 1) * 7.5;
        const slotZ = Math.floor(idx / 2) * 7.5 - 4.0;
        const routed = this.resolveVehicleCommandDest(
          h.position,
          slotX,
          slotZ,
          HUMVEE_CONFIG.collisionRadius,
          this.tankTargetPoint,
        );
        dest.copy(routed);
        moveSpeed = HUMVEE_CONFIG.speed;
      } else if (this.tankOrder === 'strike' && this.tankTargetPoint) {
        if (h.position.distanceTo(this.tankTargetPoint) > 95) {
          const routed = this.resolveVehicleCommandDest(
            h.position,
            ((idx % 2) * 2 - 1) * 6,
            0,
            HUMVEE_CONFIG.collisionRadius,
            this.tankTargetPoint,
          );
          dest.copy(routed);
          moveSpeed = HUMVEE_CONFIG.speed * 0.85;
        }
      } else if (h.isReserve && mobilizeReserves) {
        const routed = this.resolveVehicleCommandDest(
          h.position,
          ((idx % 2) * 2 - 1) * 7.5,
          -4.0,
          HUMVEE_CONFIG.collisionRadius,
          new THREE.Vector3(0, 0.04, -36),
        );
        dest.copy(routed);
        moveSpeed = HUMVEE_CONFIG.speed;
      }

      const horizDist = Math.hypot(dest.x - h.position.x, dest.z - h.position.z);
      if (horizDist > 2.2 && moveSpeed > 0) {
        const step = computeObstacleAwareStep({
          x: h.position.x,
          z: h.position.z,
          destX: dest.x,
          destZ: dest.z,
          speed: moveSpeed,
          dt,
          radius: HUMVEE_CONFIG.collisionRadius,
          obstacles: this.effectiveWorldObstacles,
        });
        h.position.set(
          THREE.MathUtils.clamp(step.x, WORLD_PLAYABLE_BOUNDS.minX + 6, WORLD_PLAYABLE_BOUNDS.maxX - 5),
          0.04,
          THREE.MathUtils.clamp(step.z, WORLD_PLAYABLE_BOUNDS.minZ + 6, WORLD_PLAYABLE_BOUNDS.maxZ - 6),
        );
        h.rig.group.position.copy(h.position);
        if (step.moved && (Math.abs(step.dirX) > 0.01 || Math.abs(step.dirZ) > 0.01)) {
          h.rig.group.rotation.y = Math.atan2(-step.dirX, -step.dirZ);
        }
        for (const w of h.rig.wheels) {
          w.rotation.x -= moveSpeed * dt * 2.2;
        }
      }

      if (this.tankOrder !== 'strike' || !this.tankTargetPoint) return;

      h.fireCooldown -= dt;
      if (h.fireCooldown <= 0) {
        h.fireCooldown = HUMVEE_CONFIG.cooldown + idx * 0.04;
        const nearSoldier = this.groundUnits.find(
          (s) => s.faction === 'enemy' && s.alive && !s.dying && s.position.distanceTo(this.tankTargetPoint!) < 55,
        );
        const targetPos = nearSoldier ? nearSoldier.position : this.tankTargetPoint;
        const dx = targetPos.x - h.position.x;
        const dz = targetPos.z - h.position.z;
        h.rig.turret.rotation.y = Math.atan2(-dx, -dz) - h.rig.group.rotation.y;

        const p = this.acquireProjectile(false, false, false, true);
        if (p) {
          h.rig.muzzle.getWorldPosition(p.position);
          const dir = _vecB.copy(targetPos).add(new THREE.Vector3(0, 1.1, 0)).sub(p.position).normalize();
          p.active = true;
          p.fromEnemy = false;
          p.isMissile = false;
          p.velocity.copy(dir).multiplyScalar(255);
          p.targetSpeed = 255;
          p.damage = HUMVEE_CONFIG.damage;
          p.blastRadius = HUMVEE_CONFIG.blastRadius;
          p.homing = false;
          p.coldTimer = 0;
          p.turnRate = 0;
          p.targetEnemyId = null;
          p.targetWorldPos = null;
          p.life = 1.4;
          p.mesh.position.copy(p.position);
          p.mesh.lookAt(_vecC.copy(p.position).add(p.velocity));
          p.mesh.visible = true;
          this.fx.spawnFireGlow(p.position, 0xfef08a, 0.4, 1.0, 0.08, 0.5);
          if (this.elapsedTime - this.lastSoldierAudioTime > 0.16) {
            this.lastSoldierAudioTime = this.elapsedTime;
            this.audio.playRifleShot();
          }
        }
      }
    });

    // 2. Commandable Allied MLRS Rocket Launchers (6-rocket salvos — strictly command-only)
    this.alliedMlrsList.forEach((m, idx) => {
      if (!m.alive) return;
      m.smokeTimer = this.emitVehicleDamageSmoke(m.position, m.hp, m.maxHp, m.smokeTimer, dt);
      if (m.isReserve && !mobilizeReserves) return;

      const dest = _vecA.copy(m.position);
      let moveSpeed = 0;
      if (this.tankOrder === 'move' && this.tankTargetPoint) {
        const routed = this.resolveVehicleCommandDest(
          m.position,
          (idx === 0 ? -1 : 1) * 14,
          12,
          ALLIED_MLRS_CONFIG.collisionRadius,
          this.tankTargetPoint,
        );
        dest.copy(routed);
        moveSpeed = ALLIED_MLRS_CONFIG.speed;
      } else if (this.tankOrder === 'strike' && this.tankTargetPoint) {
        if (m.position.distanceTo(this.tankTargetPoint) > 220) {
          const routed = this.resolveVehicleCommandDest(
            m.position,
            (idx === 0 ? -1 : 1) * 12,
            10,
            ALLIED_MLRS_CONFIG.collisionRadius,
            this.tankTargetPoint,
          );
          dest.copy(routed);
          moveSpeed = ALLIED_MLRS_CONFIG.speed;
        }
      } else if (m.isReserve && mobilizeReserves) {
        const routed = this.resolveVehicleCommandDest(
          m.position,
          (idx === 0 ? -1 : 1) * 14,
          12,
          ALLIED_MLRS_CONFIG.collisionRadius,
          new THREE.Vector3(0, 0.04, -36),
        );
        dest.copy(routed);
        moveSpeed = ALLIED_MLRS_CONFIG.speed;
      }

      const horizDist = Math.hypot(dest.x - m.position.x, dest.z - m.position.z);
      if (horizDist > 2.8 && moveSpeed > 0) {
        const step = computeObstacleAwareStep({
          x: m.position.x,
          z: m.position.z,
          destX: dest.x,
          destZ: dest.z,
          speed: moveSpeed,
          dt,
          radius: ALLIED_MLRS_CONFIG.collisionRadius,
          obstacles: this.effectiveWorldObstacles,
        });
        m.position.set(
          THREE.MathUtils.clamp(step.x, WORLD_PLAYABLE_BOUNDS.minX + 6, WORLD_PLAYABLE_BOUNDS.maxX - 5),
          0.04,
          THREE.MathUtils.clamp(step.z, WORLD_PLAYABLE_BOUNDS.minZ + 6, WORLD_PLAYABLE_BOUNDS.maxZ - 6),
        );
        m.rig.group.position.copy(m.position);
        if (step.moved && (Math.abs(step.dirX) > 0.01 || Math.abs(step.dirZ) > 0.01)) {
          m.rig.group.rotation.y = Math.atan2(-step.dirX, -step.dirZ);
        }
      }

      if (this.tankOrder !== 'strike' || !this.tankTargetPoint) return;

      m.fireCooldown -= dt;
      if (m.fireCooldown <= 0) {
        m.fireCooldown = ALLIED_MLRS_CONFIG.cooldown + idx * 0.5;
        const strikeBase = this.tankTargetPoint;
        const dx = strikeBase.x - m.position.x;
        const dz = strikeBase.z - m.position.z;
        m.rig.yawGroup.rotation.y = Math.atan2(-dx, -dz) - m.rig.group.rotation.y;

        const origin = new THREE.Vector3();
        let fired = 0;
        for (let s = 0; s < ALLIED_MLRS_CONFIG.salvoCount; s++) {
          const p = this.acquireProjectile(true, false, false);
          if (!p) break;
          const muz = m.rig.muzzles[s % m.rig.muzzles.length];
          muz.getWorldPosition(origin);
          const tgt = new THREE.Vector3(
            strikeBase.x + (Math.random() - 0.5) * 18,
            1.2,
            strikeBase.z + (Math.random() - 0.5) * 18,
          );
          p.active = true;
          p.fromEnemy = false;
          p.isMissile = true;
          p.position.copy(origin);
          p.velocity.set((tgt.x - origin.x) * 0.35, 56 + s * 2.5, (tgt.z - origin.z) * 0.35);
          p.targetSpeed = 168;
          p.damage = ALLIED_MLRS_CONFIG.rocketDamage;
          p.blastRadius = ALLIED_MLRS_CONFIG.rocketBlastRadius;
          p.homing = true;
          p.coldTimer = 0.16;
          p.turnRate = 5.6;
          p.targetEnemyId = null;
          p.targetWorldPos = tgt;
          p.life = 7.2;
          p.smokeTimer = 0;
          p.mesh.position.copy(origin);
          p.mesh.lookAt(_vecC.copy(origin).add(p.velocity));
          p.mesh.visible = true;
          this.fx.spawnLaunchPlume(origin, true);
          fired++;
        }
        if (fired > 0) {
          this.audio.playMlrsSalvoLaunch(fired);
        }
      }
    });
  }

  private updateSupportEntities(dt: number): void {
    // 1. Allied Swarm Drones
    for (let i = this.swarmDrones.length - 1; i >= 0; i--) {
      const d = this.swarmDrones[i];
      d.life -= dt;
      const airTgt =
        d.targetEnemyId !== null
          ? this.enemies.find((e) => e.id === d.targetEnemyId && !e.crashing)
          : null;
      if (airTgt) d.targetPos.copy(airTgt.position);

      const dir = _vecA.copy(d.targetPos).sub(d.position);
      const dist = dir.length();
      if (dist < 4.5 || d.life <= 0) {
        this.fx.spawnExplosion(d.position, 1.0, this.camera.position);
        this.audio.playExplosion(0.8);
        if (airTgt) this.damageEnemyAircraft(airTgt, 180);
        else this.damageWorldStructureAtPoint(d.position, 10, 145);
        this.scene.remove(d.mesh);
        this.swarmDrones.splice(i, 1);
        continue;
      }
      dir.normalize().multiplyScalar(58);
      d.velocity.lerp(dir, dt * 4.5);
      d.position.addScaledVector(d.velocity, dt);
      d.mesh.position.copy(d.position);
      d.mesh.lookAt(_vecB.copy(d.position).add(d.velocity));
    }

    // 2. Cargo Transport C-130 dropping Paratroopers
    for (let i = this.cargoPlanes.length - 1; i >= 0; i--) {
      const c = this.cargoPlanes[i];
      c.life -= dt;
      c.position.addScaledVector(c.velocity, dt);
      c.mesh.position.copy(c.position);
      c.dropTimer -= dt;
      if (c.dropsRemaining > 0 && c.dropTimer <= 0) {
        c.dropsRemaining--;
        c.dropTimer = 0.65;
        const pMesh = buildParatrooperRig();
        const dropPos = c.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 14, -4, 0));
        pMesh.position.copy(dropPos);
        this.scene.add(pMesh);
        this.paratroopers.push({ position: dropPos, mesh: pMesh });
      }
      if (c.life <= 0) {
        this.scene.remove(c.mesh);
        this.cargoPlanes.splice(i, 1);
      }
    }

    // 3. Paratroopers drifting down and joining allied squad
    for (let i = this.paratroopers.length - 1; i >= 0; i--) {
      const pt = this.paratroopers[i];
      pt.position.y -= 13.5 * dt;
      pt.position.x += Math.sin(this.elapsedTime * 2 + i) * 1.2 * dt;
      pt.mesh.position.copy(pt.position);
      if (pt.position.y <= 0.1) {
        this.scene.remove(pt.mesh);
        this.paratroopers.splice(i, 1);
        this.spawnGroundSoldier(
          'ally',
          i % 2 === 0 ? 'infantry' : 'sniper',
          new THREE.Vector3(pt.position.x, 0.04, pt.position.z),
        );
      }
    }
  }

  private spawnSoldierTracer(
    muzzle: THREE.Object3D | THREE.Vector3,
    targetPos: THREE.Vector3,
    fromEnemy: boolean,
  ): void {
    const p = this.acquireProjectile(false, fromEnemy, false, true);
    if (!p) return;
    if (muzzle instanceof THREE.Vector3) {
      p.position.copy(muzzle);
    } else {
      muzzle.getWorldPosition(p.position);
    }
    const dir = _vecB
      .copy(targetPos)
      .add(new THREE.Vector3(0, 1.1, 0))
      .sub(p.position)
      .normalize();
    p.active = true;
    p.fromEnemy = fromEnemy;
    p.isMissile = false;
    p.velocity.copy(dir).multiplyScalar(230);
    p.targetSpeed = 230;
    p.damage = 0;
    p.blastRadius = 1;
    p.homing = false;
    p.coldTimer = 0;
    p.turnRate = 0;
    p.targetEnemyId = null;
    p.targetWorldPos = null;
    p.life = 0.45;
    p.mesh.position.copy(p.position);
    p.mesh.lookAt(_vecC.copy(p.position).add(p.velocity));
    p.mesh.visible = true;
    this.fx.spawnFireGlow(p.position, 0xffd166, 0.35, 0.85, 0.08, 0.4);
  }

  private updateCiws(dt: number): void {
    if (!this.warDeclared) return;
    this.ciwsTimer -= dt;
    if (this.ciwsTimer > 0) return;

    const incomingMissile = this.projectiles.find((p) => p.active && p.fromEnemy);
    const closeEnemy = this.enemies.find(
      (e) => !e.crashing && e.position.distanceTo(this.playerPos) < 125,
    );
    const targetPos = incomingMissile
      ? incomingMissile.position
      : closeEnemy
      ? closeEnemy.position
      : null;

    if (!targetPos) return;

    this.ciwsTimer = Math.max(0.14, 0.32 - (this.upgrades.closeInLevel - 1) * 0.04);
    for (const turret of this.batteries.ciwsTurrets) {
      const worldBase = _vecA;
      turret.yawGroup.getWorldPosition(worldBase);
      const dx = targetPos.x - worldBase.x;
      const dy = targetPos.y - worldBase.y;
      const dz = targetPos.z - worldBase.z;
      turret.yawGroup.rotation.y = Math.atan2(-dx, -dz);
      turret.pitchGroup.rotation.x = Math.atan2(dy, Math.hypot(dx, dz));
      turret.barrelCluster.rotation.z += 1.4;

      const muz = _vecB;
      turret.muzzle.getWorldPosition(muz);
      this.fx.spawnFireGlow(muz, 0xfef08a, 0.5, 1.3, 0.1, 0.6);
    }

    if (incomingMissile) {
      incomingMissile.active = false;
      incomingMissile.mesh.visible = false;
      this.fx.spawnExplosion(targetPos, 0.72, this.camera.position);
      this.audio.playExplosion(0.65);
      this.kills++;
      this.credits += 45;
      this.score += 80;
      this.updateBestScore();
    } else if (closeEnemy) {
      this.damageEnemyAircraft(closeEnemy, 11 + this.upgrades.closeInLevel * 3);
    }
    this.audio.playCiwsBurst();
  }

  private interceptEnemyMissile(m: ActiveProjectile, pos: THREE.Vector3): void {
    m.active = false;
    m.mesh.visible = false;
    this.fx.spawnExplosion(pos, 0.75, this.camera.position);
    this.audio.playExplosion(0.65);
    this.audio.playHitMarker();
    this.kills++;
    this.credits += 45;
    this.score += 80;
    this.updateBestScore();
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      if (p.isAirDefenseSam && !p.fromEnemy) {
        // Resolve nearest alive airborne target (aircraft first, else high-altitude hostile missile)
        let airTargetPos: THREE.Vector3 | null = null;
        const lockedEnemy =
          p.targetEnemyId !== null
            ? this.enemies.find((e) => e.id === p.targetEnemyId && !e.crashing)
            : null;
        if (lockedEnemy) {
          airTargetPos = lockedEnemy.position;
        } else if (this.enemies.length > 0) {
          let bestEnemy: ActiveEnemy | null = null;
          let bestDist = Infinity;
          for (const e of this.enemies) {
            if (e.crashing) continue;
            const d = e.position.distanceTo(p.position);
            if (d < bestDist) {
              bestDist = d;
              bestEnemy = e;
            }
          }
          if (bestEnemy) airTargetPos = bestEnemy.position;
        }
        if (!airTargetPos) {
          for (const em of this.projectiles) {
            if (em.active && em.fromEnemy && em.isMissile && em.position.y >= 12) {
              airTargetPos = em.position;
              break;
            }
          }
        }

        const step = computeSamFlightStep({
          pos: p.position,
          vel: p.velocity,
          targetSpeed: p.targetSpeed,
          turnRate: p.turnRate,
          climbTimer: p.samClimbTimer,
          dt,
          aerialTarget: airTargetPos,
          minSkyFloor: 22,
        });
        p.samClimbTimer = step.climbTimer;
        p.position.set(step.pos.x, step.pos.y, step.pos.z);
        p.velocity.set(step.vel.x, step.vel.y, step.vel.z);
        p.mesh.position.copy(p.position);
        p.mesh.lookAt(_vecA.copy(p.position).add(p.velocity));

        p.smokeTimer -= dt;
        if (p.smokeTimer <= 0) {
          p.smokeTimer = p.isHypersonic ? 0.024 : 0.04;
          this.fx.spawnSmokePuff(
            p.position,
            p.isHypersonic ? 0xbae6fd : 0xe2e8f0,
            p.isHypersonic ? 0.65 : 0.5,
            2.4,
            0.55,
            0.48,
            0.8,
            0.5,
          );
        }

        if (step.shouldAirburst) {
          this.fx.spawnExplosion(
            p.position,
            p.isHypersonic ? 1.15 : 0.85,
            this.camera.position,
          );
          this.audio.playExplosion(0.65);
          p.active = false;
          p.mesh.visible = false;
          continue;
        }
      } else {
        if (p.coldTimer > 0) {
          p.coldTimer -= dt;
          p.position.addScaledVector(p.velocity, dt);
          p.mesh.position.copy(p.position);
          p.mesh.lookAt(_vecA.copy(p.position).add(p.velocity));
          if (p.coldTimer <= 0) {
            this.fx.spawnLaunchPlume(p.position, true);
          }
          continue;
        }

        if (p.homing) {
          const tgt =
            p.targetEnemyId !== null
              ? this.enemies.find((e) => e.id === p.targetEnemyId && !e.crashing)
              : null;
          const steerTarget = tgt ? tgt.position : p.targetWorldPos;
          if (steerTarget) {
            _vecA.copy(steerTarget).sub(p.position).normalize().multiplyScalar(p.targetSpeed);
            p.velocity.lerp(_vecA, Math.min(1, p.turnRate * dt));
          }
        }

        // Apply gravity arc for hostile ballistic MLRS rockets
        if (p.fromEnemy && p.isMissile && !p.homing && p.blastRadius >= 7) {
          p.velocity.y -= 14.5 * dt;
        }

        if (p.isMissile) {
          p.smokeTimer -= dt;
          if (p.smokeTimer <= 0) {
            p.smokeTimer = p.isHypersonic ? 0.025 : 0.045;
            this.fx.spawnSmokePuff(
              p.position,
              p.fromEnemy ? 0x6b7280 : p.isHypersonic ? 0xbae6fd : 0xe2e8f0,
              p.isHypersonic ? 0.65 : 0.5,
              2.4,
              0.55,
              0.48,
              0.8,
              0.5,
            );
          }
        }

        p.position.addScaledVector(p.velocity, dt);
        p.mesh.position.copy(p.position);
        p.mesh.lookAt(_vecA.copy(p.position).add(p.velocity));
      }

      if (p.position.y <= 0.45 && !p.isAirDefenseSam) {
        p.active = false;
        p.mesh.visible = false;
        if (p.fromEnemy) {
          this.lastBombardmentPos.copy(p.position);
          this.bombardmentCoverTimer = 5.5;
          this.fx.spawnExplosion(p.position, 0.9, this.camera.position);
          this.fx.spawnBlastCraterAndRubble(p.position, 0.85);
          this.addActiveFire(p.position, 0.9, 14);
          this.audio.playExplosion(0.75);
          this.damageWorldStructureAtPoint(p.position, 4.5, p.damage * 2.5);

          if (Math.hypot(p.position.x, p.position.z - 24) <= 28) {
            this.damageHqComplex(p.position, p.damage * 2.2);
          }

          if (this.combatMode === 'tank' && this.playerTankPos.distanceTo(p.position) < 12) {
            this.playerTankHp = Math.max(0, this.playerTankHp - p.damage * 0.7);
            if (this.playerTankHp <= 0) {
              this.returnToGroundDefense();
            }
          } else {
            this.baseHp = applyBaseDamage(this.baseHp, p.damage).nextHp;
          }
          for (const at of this.tanks) {
            if (at.faction === 'ally' && at.alive && at.position.distanceTo(p.position) < 9.5) {
              at.hp -= p.damage * 3.5;
              if (at.hp <= 0) at.hp = 420;
            }
          }
        } else if (p.damage > 0) {
          const hitStruct = this.damageWorldStructureAtPoint(p.position, p.blastRadius, p.damage);
          if (p.isMissile) {
            if (!hitStruct) {
              this.fx.spawnTankShellBlast(p.position, this.camera.position);
              this.addActiveFire(p.position, 0.95, 14);
              this.audio.playExplosion(0.85);
            }
            for (const t of this.tanks) {
              if (t.faction === 'enemy' && t.alive && t.position.distanceTo(p.position) <= p.blastRadius + 3) {
                this.damageEnemyTank(t, p.damage);
              }
            }
            for (const m of this.enemyMlrsUnits) {
              if (m.alive && m.position.distanceTo(p.position) <= p.blastRadius + 4) {
                this.damageEnemyMlrs(m, p.damage);
              }
            }
            for (const s of this.groundUnits) {
              if (s.faction === 'enemy' && s.alive && !s.dying && s.position.distanceTo(p.position) <= p.blastRadius + 2) {
                s.hp -= p.damage;
                if (s.hp <= 0) {
                  s.dying = true;
                  s.collapseProgress = 0;
                  this.kills++;
                  this.credits += 75;
                  this.score += 110;
                  this.updateBestScore();
                }
              }
            }
          }
        }
        continue;
      }

      if (p.fromEnemy) {
        // Enemy missiles can impact skyscrapers mid-flight!
        if (p.isMissile && p.position.y <= 46) {
          this.damageWorldStructureAtPoint(p.position, 2.2, p.damage * 2.2);
        }
        continue;
      }

      let hitSomething = false;

      // 1. Mid-air missile interception against incoming hostile missiles
      for (const em of this.projectiles) {
        if (!em.active || !em.fromEnemy || !em.isMissile) continue;
        const interceptRad = p.isMissile ? 7.5 : 3.2;
        if (em.position.distanceTo(p.position) <= interceptRad) {
          this.interceptEnemyMissile(em, em.position);
          p.active = false;
          p.mesh.visible = false;
          hitSomething = true;
          break;
        }
      }
      if (hitSomething) continue;

      // 2. Hostile Aircraft
      for (const e of this.enemies) {
        if (e.crashing) continue;
        const hitRad = p.isMissile ? Math.max(4.8, p.blastRadius * 0.55) : 4.2;
        if (e.position.distanceTo(p.position) <= hitRad) {
          this.damageEnemyAircraft(e, p.damage);
          if (p.isMissile) {
            this.fx.spawnExplosion(p.position, p.isHypersonic ? 1.45 : 1.0, this.camera.position);
            this.audio.playExplosion(p.isHypersonic ? 1.2 : 0.8);
          }
          p.active = false;
          p.mesh.visible = false;
          hitSomething = true;
          break;
        }
      }
      if (hitSomething) continue;

      // Air-Defense SAMs stay strictly in high sky and NEVER hit ground targets or city buildings
      if (p.isAirDefenseSam) continue;

      // 3. Enemy Tanks & MLRS Launchers
      if (p.damage > 0) {
        for (const t of this.tanks) {
          if (t.faction === 'enemy' && t.alive && t.position.distanceTo(p.position) <= (p.isMissile ? p.blastRadius : 3.8)) {
            this.damageEnemyTank(t, p.damage);
            p.active = false;
            p.mesh.visible = false;
            hitSomething = true;
            break;
          }
        }
        if (hitSomething) continue;

        for (const m of this.enemyMlrsUnits) {
          if (m.alive && m.position.distanceTo(p.position) <= (p.isMissile ? p.blastRadius : 4.5)) {
            this.damageEnemyMlrs(m, p.damage);
            p.active = false;
            p.mesh.visible = false;
            hitSomething = true;
            break;
          }
        }
      }
      if (hitSomething) continue;

      // 4. Enemy Ground Soldiers
      if (p.damage > 0) {
        for (const s of this.groundUnits) {
          if (s.faction === 'enemy' && s.alive && !s.dying) {
            if (s.position.distanceTo(p.position) <= (p.isMissile ? p.blastRadius : 2.2)) {
              s.hp -= p.damage;
              this.audio.playHitMarker();
              if (s.hp <= 0) {
                s.dying = true;
                s.collapseProgress = 0;
                this.kills++;
                this.credits += 75;
                this.score += 110;
                this.updateBestScore();
              }
              p.active = false;
              p.mesh.visible = false;
              hitSomething = true;
              break;
            }
          }
        }
      }
      if (hitSomething) continue;

      // 5. Buildings, Embassies, Palaces & Strategic Infrastructure
      if (
        p.damage > 0 &&
        this.damageWorldStructureAtPoint(p.position, p.isMissile ? 4 : 1.5, p.damage)
      ) {
        p.active = false;
        p.mesh.visible = false;
      }
    }
  }

  private updateSeekerLock(dt: number): void {
    let bestId: number | null = null;
    let bestNdcDist = 0.28;
    let bestInfo: LockedTargetInfo | null = null;

    for (const e of this.enemies) {
      if (e.crashing) continue;
      _vecA.copy(e.position).project(this.camera);
      if (_vecA.z > 1) continue;
      const sx = (_vecA.x + 1) * 0.5;
      const sy = (1 - _vecA.y) * 0.5;
      const ndcDist = Math.hypot(_vecA.x, _vecA.y);
      if (ndcDist < bestNdcDist) {
        bestNdcDist = ndcDist;
        bestId = e.id;
        bestInfo = {
          id: e.id,
          codeName: ENEMY_CONFIGS[e.type].codeName,
          distance: Math.round(e.position.distanceTo(this.camera.position)),
          hp: Math.max(0, Math.round(e.hp)),
          maxHp: e.maxHp,
          lockProgress: 0,
          isLocked: false,
          screenX: sx,
          screenY: sy,
          onScreen: sx >= 0.05 && sx <= 0.95 && sy >= 0.05 && sy <= 0.95,
        };
      }
    }

    if (bestId !== this.seekerCandidateId) {
      this.seekerCandidateId = bestId;
      this.seekerLockProgress = 0;
    }

    const cand = bestId !== null ? this.enemies.find((e) => e.id === bestId) : null;
    this.seekerLockProgress = advanceSeekerLock({
      currentLock: this.seekerLockProgress,
      hasTargetInCone: cand !== null && cand !== undefined,
      ndcDist: bestNdcDist,
      isStealth: cand?.type === 'stealth',
      canHardLockStealth: Boolean(cand?.canLockHoming),
      radarLevel: this.upgrades.radarLevel,
      dt,
    });

    if (bestInfo) {
      bestInfo.lockProgress = this.seekerLockProgress;
      bestInfo.isLocked = this.seekerLockProgress >= 0.85;
      if (this.activeWeapon === 'manpads' && bestInfo.lockProgress > 0.25) {
        this.audio.playSeekerTone(bestInfo.isLocked);
      }
    }
    this.lockedTarget = bestInfo;
  }

  private emitHud(): void {
    const radarBlips: RadarBlip[] = [];

    for (const rig of this.batteries.embassies) {
      const emb = this.embassies.find((e) => e.id === rig.id);
      const dx = rig.worldPos.x - this.playerPos.x;
      const dz = rig.worldPos.z - this.playerPos.z;
      radarBlips.push({
        id: rig.id === 'us_embassy' ? -1 : rig.id === 'ru_embassy' ? -2 : -3,
        kind: 'embassy',
        x: THREE.MathUtils.clamp(dx / RADAR_MAX_RANGE, -0.92, 0.92),
        z: THREE.MathUtils.clamp(dz / RADAR_MAX_RANGE, -0.92, 0.92),
        atWar: Boolean(emb?.atWar),
        detectedStrength: 1,
      });
    }

    // Naval Carrier blip
    radarBlips.push({
      id: -10,
      kind: 'naval',
      x: THREE.MathUtils.clamp((this.batteries.carrierDeckOrigin.x - this.playerPos.x) / RADAR_MAX_RANGE, -0.94, 0.94),
      z: THREE.MathUtils.clamp((this.batteries.carrierDeckOrigin.z - this.playerPos.z) / RADAR_MAX_RANGE, -0.94, 0.94),
      atWar: false,
      detectedStrength: 0.95,
    });

    for (const e of this.enemies) {
      if (e.crashing || e.radarStrength < 0.14) continue;
      const dx = e.position.x - this.playerPos.x;
      const dz = e.position.z - this.playerPos.z;
      radarBlips.push({
        id: e.id,
        kind: 'aircraft',
        x: THREE.MathUtils.clamp(dx / RADAR_MAX_RANGE, -0.94, 0.94),
        z: THREE.MathUtils.clamp(dz / RADAR_MAX_RANGE, -0.94, 0.94),
        atWar: true,
        detectedStrength: e.radarStrength,
      });
    }

    for (const t of this.tanks) {
      if (t.faction !== 'enemy' || !t.alive) continue;
      const dx = t.position.x - this.playerPos.x;
      const dz = t.position.z - this.playerPos.z;
      radarBlips.push({
        id: t.id + 7000,
        kind: 'armor',
        x: THREE.MathUtils.clamp(dx / RADAR_MAX_RANGE, -0.94, 0.94),
        z: THREE.MathUtils.clamp(dz / RADAR_MAX_RANGE, -0.94, 0.94),
        atWar: true,
        detectedStrength: 0.95,
      });
    }

    for (const s of this.groundUnits) {
      if (s.faction !== 'enemy' || !s.alive || s.dying) continue;
      const dx = s.position.x - this.playerPos.x;
      const dz = s.position.z - this.playerPos.z;
      radarBlips.push({
        id: s.id + 5000,
        kind: 'soldier',
        x: THREE.MathUtils.clamp(dx / RADAR_MAX_RANGE, -0.94, 0.94),
        z: THREE.MathUtils.clamp(dz / RADAR_MAX_RANGE, -0.94, 0.94),
        atWar: true,
        detectedStrength: 0.9,
      });
    }

    for (const site of this.secretSites) {
      if (!site.revealed || site.destroyed) continue;
      const dx = site.position[0] - this.playerPos.x;
      const dz = site.position[2] - this.playerPos.z;
      radarBlips.push({
        id: 9200 + this.secretSites.indexOf(site),
        kind: 'secret',
        x: THREE.MathUtils.clamp(dx / RADAR_MAX_RANGE, -0.94, 0.94),
        z: THREE.MathUtils.clamp(dz / RADAR_MAX_RANGE, -0.94, 0.94),
        atWar: true,
        detectedStrength: 1.0,
      });
    }

    for (let ni = 0; ni < this.nations.length; ni++) {
      const n = this.nations[ni];
      const spec = getNationSpec(n.id);
      const dx = spec.palacePos[0] - this.playerPos.x;
      const dz = spec.palacePos[2] - this.playerPos.z;
      radarBlips.push({
        id: -100 - ni,
        kind: 'nation',
        x: THREE.MathUtils.clamp(dx / (RADAR_MAX_RANGE * 2.4), -0.94, 0.94),
        z: THREE.MathUtils.clamp(dz / (RADAR_MAX_RANGE * 2.4), -0.94, 0.94),
        atWar: n.atWar,
        detectedStrength: 0.85,
      });
    }

    const insideEmbassy =
      isInsideOurEmbassy(this.playerPos.x, this.playerPos.z) ||
      isInsideCityEmbassy(this.playerPos.x, this.playerPos.z) !== null;
    const nearIntelConsole = isNearIntelConsole(this.playerPos.x, this.playerPos.z);
    const nearHqDesk = isNearHqDesk(this.playerPos.x, this.playerPos.z);
    const nearConvoyVehicle = this.combatMode === 'ground' && this.isPlayerNearConvoy();
    const insideForeignPalace = isInsideForeignPalace(this.playerPos.x, this.playerPos.z);
    const nearForeignChair = isNearForeignPalaceChair(this.playerPos.x, this.playerPos.z);

    this.onHudUpdate({
      screenState: this.screenState,
      combatMode: this.combatMode,
      selectedJet: this.selectedJet,
      squadOrder: this.squadOrder,
      tankOrder: this.tankOrder,
      tankTargetPoint: this.tankTargetPoint
        ? { x: Math.round(this.tankTargetPoint.x), z: Math.round(this.tankTargetPoint.z) }
        : null,
      timeOfDay: this.timeOfDay,
      weather: this.weather,
      thermalActive: this.thermalActive,
      warDeclared: this.warDeclared,
      ewJamActive: this.ewJamTimer > 0,
      weaponHolstered: this.weaponHolstered,
      reservesMobilized: this.reservesMobilized,
      convoyDriveMode: this.convoyDriveMode,
      convoyDestination: this.convoyDestination,
      convoySpeedKmh: Math.round(Math.abs(this.convoySpeed) * 3.4),
      poetryTrackIndex: this.poetryTrackIndex,
      insideEmbassy,
      nearIntelConsole,
      nearHqDesk,
      nearConvoyVehicle,
      hqSeated: this.hqSeated,
      insideForeignPalace,
      nearForeignChair,
      foreignSeatedNation: this.foreignSeatedNation,
      listeningActive: this.listeningActive,
      truceActive: this.truceTimer > 0,
      truceRemainingSec: Math.ceil(this.truceTimer),
      hqIntegrityPct: Math.round(this.hqIntegrity),
      secretSitesRevealed: this.secretSites.filter((s) => s.revealed).length,
      secretSitesTotal: this.secretSites.length,
      secretSitesDestroyed: this.secretSites.filter((s) => s.destroyed).length,
      nations: this.nations.map((n) => {
        const wallsForNation = this.nationWalls.filter((w) => w.nationId === n.id);
        return {
          ...n,
          presidentWelcoming: this.activePresidentNation === n.id,
          wallsTotal: wallsForNation.length || n.wallsTotal,
          wallsIntact: wallsForNation.length ? wallsForNation.filter((w) => !w.destroyed).length : n.wallsIntact,
        };
      }),
      activePresidentNation: this.activePresidentNation,
      nukeReady: this.nukeCooldown <= 0 && !this.activeNuclearIcbm,
      nukeCooldownPct: Math.min(1, Math.max(0, this.nukeCooldown / NUKE_COOLDOWN_SECONDS)),
      nukeTargetingActive: this.nukeTargetingActive,
      nukeTargetPoint: this.nukeTargetingActive
        ? { x: Math.round(this.nukeTargetPoint.x), z: Math.round(this.nukeTargetPoint.z) }
        : null,
      sleeperReady: this.sleeperCooldown <= 0,
      sleeperCooldownPct: Math.min(1, Math.max(0, this.sleeperCooldown / SLEEPER_CELL_COOLDOWN)),
      supportCooldownPct: {
        joint_strike: Math.min(1, this.supportCooldowns.joint_strike / SUPPORT_OP_COOLDOWNS.joint_strike),
        reinforce_50: Math.min(1, this.supportCooldowns.reinforce_50 / SUPPORT_OP_COOLDOWNS.reinforce_50),
        swarm_drones: Math.min(1, this.supportCooldowns.swarm_drones / SUPPORT_OP_COOLDOWNS.swarm_drones),
        paratroopers: Math.min(1, this.supportCooldowns.paratroopers / SUPPORT_OP_COOLDOWNS.paratroopers),
        ew_jam: Math.min(1, this.supportCooldowns.ew_jam / SUPPORT_OP_COOLDOWNS.ew_jam),
        naval_barrage: Math.min(1, this.supportCooldowns.naval_barrage / SUPPORT_OP_COOLDOWNS.naval_barrage),
        artillery_barrage: Math.min(
          1,
          this.supportCooldowns.artillery_barrage / SUPPORT_OP_COOLDOWNS.artillery_barrage,
        ),
        desert_tunnels: Math.min(
          1,
          this.supportCooldowns.desert_tunnels / SUPPORT_OP_COOLDOWNS.desert_tunnels,
        ),
      },
      embassies: this.embassies.map((e) => ({ ...e })),
      infrastructure: this.infra.map((i) => ({ ...i })),
      airSpeedKts: Math.round(this.jetSpeed * 9.5),
      airAltitudeM: Math.round(this.jetPos.y * 10),
      playerAltitudeM: Math.max(0, Math.round(this.playerFootY)),
      tankHp: Math.round(this.playerTankHp),
      maxTankHp: PLAYER_TANK_CONFIG.maxHp,
      alliedSoldiersAlive: this.groundUnits.filter((u) => u.faction === 'ally' && u.alive).length,
      enemySoldiersAlive: this.groundUnits.filter((u) => u.faction === 'enemy' && u.alive).length,
      baseHp: Math.round(this.baseHp),
      maxBaseHp: MAX_BASE_HP,
      credits: this.credits,
      score: this.score,
      bestScore: this.bestScore,
      kills: this.kills,
      activeWeapon: this.activeWeapon,
      weaponMag: { ...this.weaponMag },
      isZoomed: this.isZoomed,
      upgrades: { ...this.upgrades },
      radarAngle: this.radarAngle,
      lockedTarget: this.lockedTarget ? { ...this.lockedTarget } : null,
      radarBlips,
      muted: this.audio.isMuted(),
      elapsedTime: this.elapsedTime,
    });
  }

  public dispose(): void {
    this.destroyed = true;
    this.audio.stopConvoyPoetry();
    cancelAnimationFrame(this.frameId);
    if (this.afterDrawTimerId !== null) {
      clearTimeout(this.afterDrawTimerId);
      this.afterDrawTimerId = null;
    }
    this.unbindListeners();
    this.composer?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
