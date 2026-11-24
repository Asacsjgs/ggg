import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { TacticalAudio, type MissileAudioProfile } from './audio';
import { TacticalFxSystem } from './fx';
import {
  buildAirbaseWorld,
  buildDetailedMissileMesh,
  buildEnemyModel,
  buildFirstPersonRig,
  buildPlayerJetMesh,
  buildSkyDome,
  buildSoldierUnitRig,
  createProceduralTextures,
  type EnemyVisualRig,
  type FirstPersonRig,
  type PlayerJetRig,
  type SoldierRig,
  type WorldDefenseBatteries,
} from './models';
import {
  ENEMY_CONFIGS,
  MAX_BASE_HP,
  MAX_OUTPOST_HP,
  NATION_CONFIGS,
  PLAYER_JET_CONFIGS,
  RADAR_MAX_RANGE,
  WEAPON_ORDER,
  advanceSeekerLock,
  applyBaseDamage,
  applyOutpostDamageAndRepair,
  buildWaveSpawnQueue,
  checkWaveOutcome,
  computeRadarDetection,
  createInitialUpgrades,
  getCombinedForcesStats,
  getWaveDefinition,
  getWeaponStats,
  purchaseUpgrade,
  type UpgradeSlotKey,
} from './rules';
import type {
  CombatMode,
  EnemyType,
  GameScreenState,
  HudSnapshot,
  LockedTargetInfo,
  NationFaction,
  PlayerJetType,
  RadarBlip,
  UpgradeState,
  WeaponType,
} from './types';

// Zero-GC reusable scratch objects
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _vecD = new THREE.Vector3();
const _projScreenMatrix = new THREE.Matrix4();
const _frustum = new THREE.Frustum();

interface ActiveEnemy {
  id: number;
  type: EnemyType;
  hp: number;
  maxHp: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  phase: number;
  orbitSign: number;
  strafeAngle: number;
  attackTimer: number;
  windupTimer: number;
  hasAttackToken: boolean;
  radarStrength: number;
  canLockHoming: boolean;
  hitFlashTimer: number;
  koTimer: number;
  flareCooldown: number;
  flybyPlayed: boolean;
  rig: EnemyVisualRig;
}

interface ActiveProjectile {
  active: boolean;
  fromEnemy: boolean;
  isMissile: boolean;
  isArtillery: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetSpeed: number;
  damage: number;
  blastRadius: number;
  homing: boolean;
  coldTimer: number;
  turnRate: number;
  targetEnemyId: number | null;
  life: number;
  smokeTimer: number;
  mesh: THREE.Group;
}

interface GroundSoldierUnit {
  faction: 'ally' | 'enemy';
  role: 'sniper' | 'infantry';
  hp: number;
  maxHp: number;
  position: THREE.Vector3;
  fireCooldown: number;
  respawnTimer: number;
  alive: boolean;
  rig: SoldierRig;
}

const PROJECTILE_POOL_SIZE = 88;
const BEST_SCORE_STORAGE_KEY = 'sky_aegis_skylock_best_v3';

export class SkyDefenseEngine {
  private container: HTMLElement;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  public audio = new TacticalAudio();

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private fx!: TacticalFxSystem;
  private isSoftwareGl = false;
  private resizeObserver: ResizeObserver | null = null;

  private frameId = 0;
  private lastTimestamp = 0;
  private destroyed = false;

  // World Actors
  private batteries!: WorldDefenseBatteries;
  private fpRig!: FirstPersonRig;
  private batteryFireCycles: Record<string, number> = {
    patriot: 0,
    thaad: 0,
    s400: 0,
    pantsir: 0,
    hq9: 0,
  };

  // Pooled projectiles & active enemies
  private projectiles: ActiveProjectile[] = [];
  private enemies: ActiveEnemy[] = [];
  private nextEnemyId = 1;

  // Game State (Invincible Endless Defense — No Defeat!)
  private screenState: GameScreenState = 'title';
  private commanderLevel = 45;
  private wave = 1;
  private spawnQueue: EnemyType[] = [];
  private spawnTimer = 0;
  private waveBannerTimer = 0;
  private waveClearPauseTimer = 0;
  private baseHp = MAX_BASE_HP;
  private credits = 12500;
  private score = 0;
  private bestScore = 0;
  private kills = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private elapsedTime = 0;

  private activeWeapon: WeaponType = 'manpads';
  private upgrades: UpgradeState = createInitialUpgrades();
  private weaponCooldowns: Record<WeaponType, number> = {
    manpads: 0,
    heavy_aa: 0,
    patriot: 0,
    thaad: 0,
    s400: 0,
    pantsir: 0,
    hq9: 0,
  };
  private weaponMag: Record<WeaponType, number> = {
    manpads: 4,
    heavy_aa: 60,
    patriot: 4,
    thaad: 2,
    s400: 4,
    pantsir: 6,
    hq9: 4,
  };
  private reloadTimers: Record<WeaponType, number> = {
    manpads: 0,
    heavy_aa: 0,
    patriot: 0,
    thaad: 0,
    s400: 0,
    pantsir: 0,
    hq9: 0,
  };

  private isZoomed = false;
  private ciwsTimer = 0;
  private ciwsActiveBurst = false;
  private weaponRecoil = 0;
  private radarAngle = 0;
  private hitstopTimer = 0;
  private trauma = 0;
  private hudEmitTimer = 0;

  // Nation, Combined-Arms Ground Forces, MLRS & Flyable Jet State
  private nation: NationFaction = 'joint';
  private combatMode: CombatMode = 'ground';
  private selectedJet: PlayerJetType = 'f22';
  private playerJetRig: PlayerJetRig | null = null;
  private jetPos = new THREE.Vector3(76, 1.25, 22);
  private jetYaw = 0;
  private jetPitch = 0;
  private jetRoll = 0;
  private jetSpeed = 0;
  private takeoffTimer = 0;
  private airCannonCooldown = 0;
  private airMissileCooldown = 0;

  private groundUnits: GroundSoldierUnit[] = [];
  private mlrsCooldown = 0;
  private mlrsQueuedShots = 0;
  private mlrsShotTimer = 0;
  private enemyMlrsTimer = 8.5;
  private outpostHp = MAX_OUTPOST_HP;

  // SkyLock Camera & Seeker State
  private aimYaw = 0;
  private aimPitch = 0.08;
  private targetYaw = 0;
  private targetPitch = 0.08;
  private camPos = new THREE.Vector3(0, 5.95, 5.2);
  private camLook = new THREE.Vector3(0, 12, -60);
  private seekerCandidateId: number | null = null;
  private seekerLockProgress = 0;
  private lockedTarget: LockedTargetInfo | null = null;

  // Input State
  private keysHeld = new Set<string>();
  private fireHeld = false;
  private virtualSlew = { x: 0, y: 0 };
  private touchDragging = false;
  private lastTouchPos = { x: 0, y: 0 };
  private ambientShowcaseTimer = 1.6;

  constructor(container: HTMLElement, onHudUpdate: (snapshot: HudSnapshot) => void) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    try {
      const saved = localStorage.getItem(BEST_SCORE_STORAGE_KEY);
      if (saved) this.bestScore = Number(saved) || 0;
    } catch {
      // ignore
    }

    this.initScene();
    this.bindEvents();
    this.spawnTitleShowcase();
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
    this.renderer.toneMappingExposure = 1.06;
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
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const textures = createProceduralTextures(maxAniso);

    // Outdoor Daylight HDRI-style Equirectangular Sky Environment Reflection
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.scene.environment = pmrem.fromEquirectangular(textures.envSkyTex).texture;
    pmrem.dispose();

    const skyDome = buildSkyDome(textures);
    this.scene.add(skyDome);
    // Crisp clear atmospheric depth out to 450m+ horizon without washed-out haze
    this.scene.fog = new THREE.FogExp2(0xcfe4f5, 0.00046);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.15, 1150);
    this.camera.position.copy(this.camPos);
    this.scene.add(this.camera);

    // First-person SkyLock soldier helmet + weapon viewmodel neatly framed in lower-right corner
    this.fpRig = buildFirstPersonRig();
    this.fpRig.group.position.set(0.34, -0.25, -0.58);
    this.camera.add(this.fpRig.group);

    // Balanced Sunlight + Cool Sky Hemisphere + Rim Light
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x4f5a38, 0.8);
    this.scene.add(hemi);

    const sunLight = new THREE.DirectionalLight(0xfff0d4, 2.48);
    sunLight.position.set(60, 80, 48);
    sunLight.castShadow = !this.isSoftwareGl;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 175;
    const d = 48;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    this.scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x7cb8f7, 0.55);
    rimLight.position.set(-50, 35, -65);
    this.scene.add(rimLight);

    // World Defense Base + US/Russian/Chinese Batteries + Runway + MLRS
    this.batteries = buildAirbaseWorld(textures);
    this.scene.add(this.batteries.group);
    this.initGroundForces();

    // Pooled Soft Volumetric Smoke & Fire FX
    this.fx = new TacticalFxSystem(this.scene);

    // Pooled Projectiles (Tracers, Finned Missiles & MLRS Rockets)
    const tracerGeo = new THREE.CylinderGeometry(0.06, 0.11, 2.6, 6);
    tracerGeo.rotateX(Math.PI / 2);
    const tracerMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    for (let i = 0; i < PROJECTILE_POOL_SIZE; i++) {
      const isTracer = i < 42;
      const mesh = isTracer
        ? (() => {
            const g = new THREE.Group();
            g.add(new THREE.Mesh(tracerGeo, tracerMat));
            return g;
          })()
        : buildDetailedMissileMesh(i >= 70);

      mesh.visible = false;
      this.scene.add(mesh);
      this.projectiles.push({
        active: false,
        fromEnemy: false,
        isMissile: !isTracer,
        isArtillery: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        targetSpeed: 160,
        damage: 25,
        blastRadius: 4,
        homing: false,
        coldTimer: 0,
        turnRate: 0,
        targetEnemyId: null,
        life: 0,
        smokeTimer: 0,
        mesh,
      });
    }

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.28, 0.35, 0.92);
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(new OutputPass());
    }

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
  }

  private spawnTitleShowcase(): void {
    const showcase: Array<{ type: EnemyType; pos: [number, number, number] }> = [
      { type: 'fighter', pos: [-32, 46, -155] },
      { type: 'helicopter', pos: [38, 25, -118] },
      { type: 'drone', pos: [-52, 34, -130] },
      { type: 'stealth', pos: [26, 62, -188] },
    ];
    for (const item of showcase) {
      const rig = buildEnemyModel(item.type);
      const pos = new THREE.Vector3(...item.pos);
      rig.group.position.copy(pos);
      this.scene.add(rig.group);
      this.enemies.push({
        id: this.nextEnemyId++,
        type: item.type,
        hp: ENEMY_CONFIGS[item.type].maxHp,
        maxHp: ENEMY_CONFIGS[item.type].maxHp,
        position: pos,
        velocity: new THREE.Vector3(6, 0, 4),
        phase: Math.random() * 6,
        orbitSign: 1,
        strafeAngle: 0,
        attackTimer: 99,
        windupTimer: 0,
        hasAttackToken: false,
        radarStrength: 0.9,
        canLockHoming: true,
        hitFlashTimer: 0,
        koTimer: 0,
        flareCooldown: 99,
        flybyPlayed: false,
        rig,
      });
    }
  }

  private handleResize(): void {
    if (this.destroyed) return;
    const width = Math.max(320, this.container.clientWidth);
    const height = Math.max(180, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer?.setSize(width, height);
    this.bloomPass?.setSize(width, height);
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (this.keysHeld.has(e.code)) return;
      this.keysHeld.add(e.code);

      if (this.screenState === 'playing') {
        if (e.code === 'Digit1') this.selectWeapon('manpads');
        else if (e.code === 'Digit2') this.selectWeapon('heavy_aa');
        else if (e.code === 'Digit3') this.selectWeapon('patriot');
        else if (e.code === 'Digit4') this.selectWeapon('thaad');
        else if (e.code === 'Digit5') this.selectWeapon('s400');
        else if (e.code === 'Digit6') this.selectWeapon('pantsir');
        else if (e.code === 'Digit7') this.selectWeapon('hq9');
        else if (e.code === 'KeyZ') this.toggleZoom();
        else if (e.code === 'KeyF') this.fireBatterySalvo();
        else if (e.code === 'KeyR') this.fireMlrsBarrage();
        else if (e.code === 'KeyG') {
          if (this.combatMode === 'ground') this.launchFighterTakeoff(this.selectedJet);
          else this.returnToGroundDefense();
        } else if (e.code === 'KeyV' && this.combatMode !== 'ground') {
          this.returnToGroundDefense();
        } else if (e.code === 'KeyQ') this.cycleWeapon(-1);
        else if (e.code === 'KeyE' || e.code === 'Tab') {
          e.preventDefault();
          this.cycleWeapon(1);
        } else if (e.code === 'Space' || e.code === 'Enter') {
          if ((document.activeElement as HTMLElement)?.tagName !== 'BUTTON') {
            e.preventDefault();
            this.audio.unlock(true);
            this.fireHeld = true;
            this.tryFireActiveWeapon();
          }
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keysHeld.delete(e.code);
      if (e.code === 'Space' || e.code === 'Enter') {
        this.fireHeld = false;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (this.screenState !== 'playing') return;
      if (e.pointerType === 'touch') {
        if (!this.touchDragging) return;
        const dx = e.clientX - this.lastTouchPos.x;
        const dy = e.clientY - this.lastTouchPos.y;
        this.lastTouchPos.x = e.clientX;
        this.lastTouchPos.y = e.clientY;
        if (this.combatMode === 'air') {
          this.jetYaw -= dx * 0.0048;
          this.jetPitch = THREE.MathUtils.clamp(this.jetPitch - dy * 0.0035, -0.48, 0.55);
          return;
        }
        const sens = this.isZoomed ? 0.0024 : 0.0045;
        this.targetYaw = THREE.MathUtils.clamp(this.targetYaw - dx * sens, -1.25, 1.25);
        this.targetPitch = THREE.MathUtils.clamp(this.targetPitch - dy * sens * 0.85, 0.02, 0.68);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      if (this.combatMode === 'air') {
        this.virtualSlew.x = Math.abs(nx) > 0.12 ? -nx * 0.85 : 0;
        this.virtualSlew.y = Math.abs(ny) > 0.12 ? -ny * 0.75 : 0;
        return;
      }
      this.targetYaw = THREE.MathUtils.clamp(-nx * 1.05, -1.25, 1.25);
      this.targetPitch = THREE.MathUtils.clamp(0.2 - ny * 0.34, 0.02, 0.68);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (this.screenState !== 'playing') return;
      this.audio.unlock(true);
      if (e.pointerType === 'touch') {
        this.touchDragging = true;
        this.lastTouchPos.x = e.clientX;
        this.lastTouchPos.y = e.clientY;
      } else if (e.button === 0) {
        onPointerMove(e);
        this.fireHeld = true;
        this.tryFireActiveWeapon();
      } else if (e.button === 2) {
        this.toggleZoom();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        this.touchDragging = false;
      } else {
        this.fireHeld = false;
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const clearInputs = () => {
      this.keysHeld.clear();
      this.fireHeld = false;
      this.touchDragging = false;
      this.virtualSlew.x = 0;
      this.virtualSlew.y = 0;
    };

    const onVisibilityChange = () => {
      if (document.hidden) clearInputs();
    };

    const onWindowResize = () => this.handleResize();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('orientationchange', onWindowResize);
    document.addEventListener('visibilitychange', onVisibilityChange);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('pointerup', onPointerUp);

    this.cleanupListeners = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('orientationchange', onWindowResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }

  private cleanupListeners: () => void = () => {};

  // --- Public Controls API ---

  public setNation(nation: NationFaction): void {
    this.nation = nation;
    const cfg = NATION_CONFIGS[nation];
    this.selectedJet = cfg.defaultJet;
    this.audio.playUiClick();
    this.emitHud();
  }

  public startNewMission(fromGesture = true): void {
    this.audio.unlock(fromGesture);

    for (const enemy of this.enemies) {
      this.scene.remove(enemy.rig.group);
    }
    this.enemies = [];
    for (const p of this.projectiles) {
      p.active = false;
      p.mesh.visible = false;
    }

    const nationCfg = NATION_CONFIGS[this.nation];
    this.screenState = 'playing';
    this.combatMode = 'ground';
    this.commanderLevel = 45;
    this.wave = 1;
    this.baseHp = MAX_BASE_HP;
    this.outpostHp = MAX_OUTPOST_HP;
    this.credits = 12500 + nationCfg.startingCreditsBonus;
    this.score = 0;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.elapsedTime = 0;
    this.activeWeapon = nationCfg.preferredWeapon;
    this.selectedJet = nationCfg.defaultJet;
    this.upgrades = createInitialUpgrades();
    this.isZoomed = false;
    this.seekerCandidateId = null;
    this.seekerLockProgress = 0;
    this.lockedTarget = null;
    this.mlrsCooldown = 0;
    this.mlrsQueuedShots = 0;
    this.enemyMlrsTimer = 8.5;
    this.resetGroundForces();
    this.restoreAllParkedJets();
    if (this.playerJetRig) this.playerJetRig.group.visible = false;
    this.updateViewmodelVisibility();

    for (const w of WEAPON_ORDER) {
      const s = getWeaponStats(w, this.upgrades);
      this.weaponMag[w] = s.magSize;
      this.weaponCooldowns[w] = 0;
      this.reloadTimers[w] = 0;
    }

    this.aimYaw = 0;
    this.aimPitch = 0.08;
    this.targetYaw = 0;
    this.targetPitch = 0.08;
    this.hitstopTimer = 0;
    this.trauma = 0;
    this.keysHeld.clear();
    this.fireHeld = false;

    this.startWave(1);
    document.body.dataset.state = 'playing';
    this.emitHud();
  }

  private startWave(waveNum: number): void {
    this.wave = waveNum;
    this.spawnQueue = buildWaveSpawnQueue(waveNum);
    this.spawnTimer = 0.15;
    this.waveBannerTimer = 2.6;
    this.waveClearPauseTimer = 0;
  }

  public setPaused(paused: boolean): void {
    if (this.screenState !== 'playing' && this.screenState !== 'paused') return;
    this.screenState = paused ? 'paused' : 'playing';
    this.keysHeld.clear();
    this.fireHeld = false;
    document.body.dataset.state = this.screenState;
    this.emitHud();
  }

  public returnToTitle(): void {
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.rig.group);
    }
    this.enemies = [];
    for (const p of this.projectiles) {
      p.active = false;
      p.mesh.visible = false;
    }
    this.combatMode = 'ground';
    this.restoreAllParkedJets();
    if (this.playerJetRig) this.playerJetRig.group.visible = false;
    this.spawnTitleShowcase();
    this.screenState = 'title';
    this.isZoomed = false;
    this.keysHeld.clear();
    this.fireHeld = false;
    document.body.dataset.state = 'title';
    this.emitHud();
  }

  private restoreAllParkedJets(): void {
    this.batteries.parkedJets.f22.visible = true;
    this.batteries.parkedJets.su57.visible = true;
    this.batteries.parkedJets.j20.visible = true;
  }

  public launchFighterTakeoff(jet: PlayerJetType): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    this.selectedJet = jet;
    this.isZoomed = false;
    this.restoreAllParkedJets();
    this.batteries.parkedJets[jet].visible = false;

    if (this.playerJetRig) {
      this.scene.remove(this.playerJetRig.group);
    }
    this.playerJetRig = buildPlayerJetMesh(jet);
    this.scene.add(this.playerJetRig.group);

    this.jetPos.copy(this.batteries.runwayOrigin);
    this.jetYaw = 0;
    this.jetPitch = 0;
    this.jetRoll = 0;
    this.jetSpeed = 14;
    this.takeoffTimer = 0;
    this.airCannonCooldown = 0;
    this.airMissileCooldown = 0;
    this.combatMode = 'takeoff';

    this.playerJetRig.group.position.copy(this.jetPos);
    this.playerJetRig.group.rotation.set(0, 0, 0);
    this.audio.playJetTakeoffAfterburner();
    this.emitHud();
  }

  public returnToGroundDefense(): void {
    this.combatMode = 'ground';
    this.restoreAllParkedJets();
    if (this.playerJetRig) {
      this.playerJetRig.group.visible = false;
    }
    this.camera.fov = this.isZoomed ? 28 : 60;
    this.camera.updateProjectionMatrix();
    this.updateViewmodelVisibility();
    this.audio.playUiClick();
    this.emitHud();
  }

  public fireMlrsBarrage(): void {
    if (this.screenState !== 'playing') return;
    if (this.mlrsCooldown > 0) return;
    this.audio.unlock(true);
    const stats = getCombinedForcesStats(this.upgrades.forcesLevel);
    this.mlrsCooldown = stats.mlrsCooldown;
    this.mlrsQueuedShots = stats.mlrsRocketsPerSalvo;
    this.mlrsShotTimer = 0;
    this.audio.playMlrsSalvoLaunch(stats.mlrsRocketsPerSalvo);
    this.emitHud();
  }

  private updateViewmodelVisibility(): void {
    const show = this.combatMode === 'ground' && this.screenState === 'playing';
    this.fpRig.group.visible = show;
    this.fpRig.manpadsGroup.visible = this.activeWeapon === 'manpads';
    this.fpRig.heavyAaGroup.visible = this.activeWeapon === 'heavy_aa';
    this.fpRig.designatorGroup.visible =
      this.activeWeapon !== 'manpads' && this.activeWeapon !== 'heavy_aa';
  }

  public selectWeapon(type: WeaponType): void {
    this.activeWeapon = type;
    this.updateViewmodelVisibility();
    this.audio.playUiClick();
    this.emitHud();
  }

  public cycleWeapon(dir: 1 | -1): void {
    const idx = WEAPON_ORDER.indexOf(this.activeWeapon);
    this.selectWeapon(WEAPON_ORDER[(idx + dir + WEAPON_ORDER.length) % WEAPON_ORDER.length]);
  }

  public toggleZoom(): void {
    if (this.combatMode !== 'ground') return;
    this.isZoomed = !this.isZoomed;
    this.audio.playUiClick();
    this.emitHud();
  }

  public buyUpgrade(slot: UpgradeSlotKey): boolean {
    this.audio.unlock(true);
    const res = purchaseUpgrade(slot, this.upgrades, this.credits);
    if (!res.purchased) return false;
    this.upgrades = res.upgrades;
    this.credits = res.credits;
    this.audio.playUpgrade();

    for (const w of WEAPON_ORDER) {
      const s = getWeaponStats(w, this.upgrades);
      this.weaponMag[w] = s.magSize;
    }
    this.emitHud();
    return true;
  }

  /**
   * Fires a coordinated Patriot + S-400 + HQ-9 battery volley (or jet air-to-air missiles in air mode)!
   */
  public fireBatterySalvo(): void {
    if (this.screenState !== 'playing') return;
    this.audio.unlock(true);
    if (this.combatMode === 'air') {
      this.fireJetAirMissile();
      return;
    }
    const targets = this.enemies.filter((e) => e.koTimer <= 0);
    const tA = targets[0] ?? null;
    const tB = targets[1] ?? tA;
    this.launchBatteryMissile('patriot', tA?.id ?? null);
    this.launchBatteryMissile('s400', tB?.id ?? null);
    this.emitHud();
  }

  public setVirtualFire(firing: boolean): void {
    this.audio.unlock(true);
    this.fireHeld = firing;
    if (firing && this.screenState === 'playing') {
      this.tryFireActiveWeapon();
    }
  }

  public setVirtualSlew(x: number, y: number): void {
    this.virtualSlew.x = x;
    this.virtualSlew.y = y;
  }

  public toggleMute(): boolean {
    const m = this.audio.toggleMute();
    this.emitHud();
    return m;
  }

  // --- Main Loop ---

  private startLoop(): void {
    this.lastTimestamp = performance.now();
    const tick = () => {
      if (this.destroyed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      this.update(dt, now * 0.001);
      if (this.composer && !this.isSoftwareGl) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.destroyed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(dt: number, totalTime: number): void {
    if (this.screenState !== 'paused') {
      const radarSpeed = 1.4 + (this.upgrades.radarLevel - 1) * 0.35;
      this.radarAngle = (this.radarAngle + dt * radarSpeed) % (Math.PI * 2);
      this.batteries.radarRotator.rotation.y = -this.radarAngle;
      this.batteries.s400RadarRotator.rotation.y = this.radarAngle * 1.4;
    }

    if (this.screenState === 'title') {
      const sway = Math.sin(totalTime * 0.32) * 0.55;
      _vecA.set(sway, 6.2 + Math.sin(totalTime * 0.45) * 0.25, 6.5);
      this.camera.position.lerp(_vecA, 1 - Math.exp(-3 * dt));
      this.camera.lookAt(0, 14, -58);
      this.fpRig.group.visible = false;

      for (const e of this.enemies) {
        e.rig.lod.update(this.camera);
        for (const r of e.rig.rotors) r.rotation.y += dt * 30;
        e.phase += dt * 0.55;
        e.rig.group.position.x = e.position.x + Math.sin(e.phase) * 26;
        e.rig.group.position.y = e.position.y + Math.cos(e.phase * 0.7) * 4;
        e.rig.group.lookAt(
          e.rig.group.position.x + Math.cos(e.phase) * 6,
          e.rig.group.position.y,
          e.rig.group.position.z + 3,
        );
      }

      this.ambientShowcaseTimer -= dt;
      if (this.ambientShowcaseTimer <= 0) {
        this.ambientShowcaseTimer = 2.4;
        const cycle = (Math.floor(totalTime) % 3);
        this.launchBatteryMissile(cycle === 0 ? 'patriot' : cycle === 1 ? 's400' : 'hq9', null);
      }

      this.updateProjectiles(dt);
      this.fx.update(dt, this.camera.position);
      return;
    }

    if (this.screenState !== 'playing') return;
    this.fpRig.group.visible = this.combatMode === 'ground';

    this.elapsedTime += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.9);

    // Passive Shield Auto-Repair + Engineer Forward Outpost Auto-Repair (No Defeat Mode)
    if (this.baseHp < MAX_BASE_HP) {
      this.baseHp = Math.min(MAX_BASE_HP, this.baseHp + dt * 6.0);
    }
    const forcesStats = getCombinedForcesStats(this.upgrades.forcesLevel);
    if (this.outpostHp < MAX_OUTPOST_HP) {
      const rep = applyOutpostDamageAndRepair({
        currentHp: this.outpostHp,
        damage: 0,
        repairRate: forcesStats.engineerRepairRate,
        dt,
      });
      this.outpostHp = rep.nextHp;
    }
    this.updateOutpostVisualCondition();

    let simDt = dt;
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      simDt = 0;
    }

    // 1. Camera & Flight / Ground Control Update
    let slewX = this.virtualSlew.x;
    let slewY = this.virtualSlew.y;
    if (this.keysHeld.has('ArrowLeft') || this.keysHeld.has('KeyA')) slewX += 1;
    if (this.keysHeld.has('ArrowRight') || this.keysHeld.has('KeyD')) slewX -= 1;
    if (this.keysHeld.has('ArrowUp') || this.keysHeld.has('KeyW')) slewY += 1;
    if (this.keysHeld.has('ArrowDown') || this.keysHeld.has('KeyS')) slewY -= 1;

    if (this.combatMode === 'ground') {
      const slewRate = this.isZoomed ? 0.75 : 1.35;
      if (slewX !== 0 || slewY !== 0) {
        this.targetYaw = THREE.MathUtils.clamp(this.targetYaw + slewX * slewRate * dt, -1.25, 1.25);
        this.targetPitch = THREE.MathUtils.clamp(
          this.targetPitch + slewY * slewRate * 0.75 * dt,
          0.02,
          0.68,
        );
      }

      const damp = 1 - Math.exp(-13 * dt);
      this.aimYaw = THREE.MathUtils.lerp(this.aimYaw, this.targetYaw, damp);
      this.aimPitch = THREE.MathUtils.lerp(this.aimPitch, this.targetPitch, damp);

      const desiredFov = this.isZoomed ? 28 : 60;
      if (Math.abs(this.camera.fov - desiredFov) > 0.1) {
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, desiredFov, 1 - Math.exp(-10 * dt));
        this.camera.updateProjectionMatrix();
      }

      const lookDist = 80;
      const cosP = Math.cos(this.aimPitch);
      _vecA.set(
        -Math.sin(this.aimYaw) * cosP * lookDist,
        5.95 + Math.sin(this.aimPitch) * lookDist,
        5.2 - Math.cos(this.aimYaw) * cosP * lookDist,
      );
      this.camLook.copy(_vecA);
      this.camera.position.lerp(this.camPos, 1 - Math.exp(-12 * dt));
      this.camera.lookAt(this.camLook);

      if (this.trauma > 0.001) {
        const shake = this.trauma * this.trauma;
        this.camera.rotation.z += (Math.random() * 2 - 1) * 0.024 * shake;
        this.camera.rotation.x += (Math.random() * 2 - 1) * 0.018 * shake;
      }

      // Viewmodel breathing idle + aspect-aware lower-right corner framing + recoil kickback
      this.weaponRecoil = Math.max(0, this.weaponRecoil - dt * 8);
      const breathY = Math.sin(totalTime * 2.1) * 0.004;
      const breathX = Math.cos(totalTime * 1.3) * 0.002;
      const aspectScaleX = THREE.MathUtils.clamp(this.camera.aspect / 1.778, 0.44, 1.15);
      const rigScale = THREE.MathUtils.clamp(this.camera.aspect / 1.48, 0.54, 0.92);
      const rigX = (this.isZoomed ? 0.22 : 0.34) * aspectScaleX + breathX;
      const rigY = (this.isZoomed ? -0.2 : -0.25) * (rigScale * 0.35 + 0.65) + breathY;
      this.fpRig.group.scale.setScalar(rigScale);
      this.fpRig.group.position.set(
        THREE.MathUtils.lerp(this.fpRig.group.position.x, rigX, damp),
        THREE.MathUtils.lerp(this.fpRig.group.position.y, rigY, damp),
        -0.58 + this.weaponRecoil * 0.08,
      );
      this.fpRig.group.rotation.z = THREE.MathUtils.lerp(
        this.fpRig.group.rotation.z,
        -this.aimYaw * 0.04,
        damp,
      );
    } else {
      this.updatePlayerFlightMode(dt, slewX, slewY);
    }

    // Slew Patriot & Pantsir turret yaw + elevation pivots smoothly toward aim / locked target
    const targetTrackYaw = THREE.MathUtils.clamp(this.aimYaw * 0.55, -0.55, 0.55);
    const pitchLerp = 1 - Math.exp(-3.8 * dt);
    this.batteries.patriotRack.rotation.y = THREE.MathUtils.lerp(
      this.batteries.patriotRack.rotation.y,
      targetTrackYaw,
      1 - Math.exp(-3.2 * dt),
    );
    this.batteries.patriotElevPivot.rotation.x = THREE.MathUtils.lerp(
      this.batteries.patriotElevPivot.rotation.x,
      THREE.MathUtils.clamp(0.42 + this.aimPitch * 0.72, 0.38, 0.95),
      pitchLerp,
    );
    this.batteries.pantsirTurret.rotation.y = THREE.MathUtils.lerp(
      this.batteries.pantsirTurret.rotation.y,
      targetTrackYaw,
      1 - Math.exp(-4.5 * dt),
    );
    this.batteries.pantsirArmPod.rotation.x = THREE.MathUtils.lerp(
      this.batteries.pantsirArmPod.rotation.x,
      THREE.MathUtils.clamp(0.28 + this.aimPitch * 0.85, 0.25, 1.05),
      pitchLerp,
    );

    // 2. Cooldowns & Auto-Reload
    if (this.mlrsCooldown > 0) this.mlrsCooldown = Math.max(0, this.mlrsCooldown - dt);
    if (this.airCannonCooldown > 0) this.airCannonCooldown = Math.max(0, this.airCannonCooldown - dt);
    if (this.airMissileCooldown > 0) this.airMissileCooldown = Math.max(0, this.airMissileCooldown - dt);

    for (const w of WEAPON_ORDER) {
      if (this.weaponCooldowns[w] > 0) {
        this.weaponCooldowns[w] = Math.max(0, this.weaponCooldowns[w] - dt);
      }
      const stats = getWeaponStats(w, this.upgrades);
      if (this.weaponMag[w] < stats.magSize) {
        this.reloadTimers[w] += dt;
        if (this.reloadTimers[w] >= stats.reloadTime) {
          this.reloadTimers[w] = 0;
          this.weaponMag[w] += 1;
        }
      }
    }

    if (this.fireHeld && simDt > 0) {
      this.tryFireActiveWeapon();
    }

    if (simDt > 0) {
      this.updateWaveSpawning(simDt);
      this.updateEnemies(simDt);
      this.updatePhalanxCiws(simDt);
      this.updateGroundCombatAndMlrs(simDt);
      this.updateProjectiles(simDt);
      this.updateSkyLockSeeker(simDt);
    }

    this.fx.update(dt, this.camera.position);

    if (this.waveBannerTimer > 0) {
      this.waveBannerTimer = Math.max(0, this.waveBannerTimer - dt);
    }

    this.hudEmitTimer += dt;
    if (this.hudEmitTimer >= 0.08) {
      this.hudEmitTimer = 0;
      this.emitHud();
    }
  }

  private tryFireActiveWeapon(): void {
    if (this.combatMode === 'takeoff') return;
    if (this.combatMode === 'air') {
      this.fireJetWeapons();
      return;
    }

    const w = this.activeWeapon;
    const stats = getWeaponStats(w, this.upgrades);
    const dmgScale = NATION_CONFIGS[this.nation].damageMultiplier;
    if (this.weaponCooldowns[w] > 0) return;
    if (this.weaponMag[w] <= 0) return;

    this.weaponCooldowns[w] = stats.cooldown;
    this.weaponMag[w] -= 1;
    this.shotsFired += 1;
    this.weaponRecoil = 1.0;

    if (w === 'heavy_aa') {
      // Heavy 23mm AA Gun from player's mount
      this.fpRig.muzzlePoint.updateWorldMatrix(true, false);
      this.fpRig.muzzlePoint.getWorldPosition(_vecC);
      _vecD.copy(this.camLook).sub(this.camPos).normalize().multiplyScalar(140).add(this.camPos);
      const dir = _vecD.sub(_vecC).normalize();
      this.spawnTracer(
        _vecC,
        dir,
        stats.projectileSpeed,
        stats.damage * dmgScale,
        stats.blastRadius,
        false,
      );
      this.fx.spawnFireGlow(_vecC, 0xfde047, 0.85, 1.8, 0.08, 0.5);
      this.audio.playAutocannon();
      return;
    }

    if (w === 'manpads') {
      this.fpRig.muzzlePoint.updateWorldMatrix(true, false);
      this.fpRig.muzzlePoint.getWorldPosition(_vecC);
      const targetId =
        this.lockedTarget && this.seekerLockProgress >= 0.65 ? this.lockedTarget.id : null;
      const targetObj = targetId ? this.enemies.find((e) => e.id === targetId) : undefined;
      if (targetObj) {
        _vecD.copy(targetObj.position);
      } else {
        _vecD.copy(this.camLook).sub(this.camPos).normalize().multiplyScalar(140).add(this.camPos);
      }
      const dir = _vecD.sub(_vecC).normalize();
      this.spawnMissile({
        origin: _vecC,
        dir,
        speed: stats.projectileSpeed,
        damage: stats.damage * dmgScale,
        blastRadius: stats.blastRadius,
        homing: targetId !== null,
        coldLaunch: false,
        turnRate: stats.turnRate,
        targetEnemyId: targetId,
        audioProfile: 'manpads',
        scale: 0.72,
      });
      this.trauma = Math.min(1, this.trauma + 0.16);
      return;
    }

    // World Air Defense Batteries: Patriot, THAAD, S-400, Pantsir, HQ-9
    const target =
      (this.lockedTarget
        ? this.enemies.find((e) => e.id === this.lockedTarget!.id && e.koTimer <= 0)
        : undefined) ?? this.enemies.find((e) => e.koTimer <= 0);
    this.launchBatteryMissile(w, target ? target.id : null);
  }

  private launchBatteryMissile(
    batteryType: 'patriot' | 'thaad' | 's400' | 'pantsir' | 'hq9',
    targetEnemyId: number | null,
  ): void {
    const muzzles =
      batteryType === 'patriot'
        ? this.batteries.patriotMuzzles
        : batteryType === 'thaad'
        ? this.batteries.thaadMuzzles
        : batteryType === 's400'
        ? this.batteries.s400Muzzles
        : batteryType === 'pantsir'
        ? this.batteries.pantsirMuzzles
        : this.batteries.hq9Muzzles;

    const idx = this.batteryFireCycles[batteryType] % muzzles.length;
    this.batteryFireCycles[batteryType] += 1;
    const muzzle = muzzles[idx];
    muzzle.updateWorldMatrix(true, false);
    muzzle.getWorldPosition(_vecC);

    const stats = getWeaponStats(batteryType, this.upgrades);
    const targetObj = targetEnemyId
      ? this.enemies.find((e) => e.id === targetEnemyId && e.koTimer <= 0)
      : this.enemies.find((e) => e.koTimer <= 0);

    if (targetObj) {
      _vecD.copy(targetObj.position);
    } else {
      _vecD.copy(this.camLook);
    }

    const dir = _vecD.sub(_vecC).normalize();
    if (!stats.coldLaunch) {
      dir.y = Math.max(0.45, dir.y);
      dir.normalize();
    }

    const audioProfile: MissileAudioProfile = stats.coldLaunch ? 'cold_sam' : 'hot_sam';
    this.spawnMissile({
      origin: _vecC,
      dir,
      speed: stats.projectileSpeed,
      damage: stats.damage,
      blastRadius: stats.blastRadius,
      homing: true,
      coldLaunch: stats.coldLaunch,
      turnRate: stats.turnRate,
      targetEnemyId: targetObj ? targetObj.id : null,
      audioProfile,
      scale: batteryType === 's400' || batteryType === 'hq9' || batteryType === 'thaad' ? 1.25 : 1.0,
    });
    this.trauma = Math.min(1, this.trauma + 0.18);
  }

  private spawnTracer(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    speed: number,
    damage: number,
    blastRadius: number,
    isCiws: boolean,
    fromEnemy = false,
  ): void {
    let slot: ActiveProjectile | null = null;
    for (let i = 0; i < 42; i++) {
      if (!this.projectiles[i].active) {
        slot = this.projectiles[i];
        break;
      }
    }
    if (!slot) slot = this.projectiles[0];

    slot.active = true;
    slot.fromEnemy = fromEnemy;
    slot.isMissile = false;
    slot.isArtillery = false;
    slot.position.copy(origin);
    slot.velocity.copy(dir).multiplyScalar(speed);
    slot.targetSpeed = speed;
    slot.damage = damage;
    slot.blastRadius = blastRadius;
    slot.homing = false;
    slot.coldTimer = 0;
    slot.turnRate = 0;
    slot.targetEnemyId = null;
    slot.life = isCiws ? 0.75 : 1.3;
    slot.smokeTimer = 0;
    slot.mesh.position.copy(origin);
    _vecA.copy(origin).add(dir);
    slot.mesh.lookAt(_vecA);
    slot.mesh.scale.setScalar(1);
    slot.mesh.visible = true;
  }

  private spawnMissile(params: {
    origin: THREE.Vector3;
    dir: THREE.Vector3;
    speed: number;
    damage: number;
    blastRadius: number;
    homing: boolean;
    coldLaunch: boolean;
    turnRate: number;
    targetEnemyId: number | null;
    audioProfile: MissileAudioProfile;
    scale: number;
  }): void {
    let slot: ActiveProjectile | null = null;
    for (let i = 42; i < 70; i++) {
      if (!this.projectiles[i].active) {
        slot = this.projectiles[i];
        break;
      }
    }
    if (!slot) slot = this.projectiles[42];

    slot.active = true;
    slot.fromEnemy = false;
    slot.isMissile = true;
    slot.isArtillery = false;
    slot.position.copy(params.origin);
    if (params.coldLaunch) {
      // Cold-launch straight upward first, then ignite main rocket!
      slot.velocity.set(0, 38, 0);
      slot.coldTimer = 0.34;
    } else {
      slot.velocity.copy(params.dir).multiplyScalar(params.speed);
      slot.coldTimer = 0;
    }
    slot.targetSpeed = params.speed;
    slot.damage = params.damage;
    slot.blastRadius = params.blastRadius;
    slot.homing = params.homing;
    slot.turnRate = params.turnRate;
    slot.targetEnemyId = params.targetEnemyId;
    slot.life = 6.4;
    slot.smokeTimer = 0;
    slot.mesh.position.copy(slot.position);
    _vecA.copy(slot.position).add(slot.velocity);
    slot.mesh.lookAt(_vecA);
    slot.mesh.scale.setScalar(params.scale);
    slot.mesh.visible = true;

    this.fx.spawnLaunchPlume(params.origin, params.audioProfile !== 'manpads');
    this.audio.playMissileLaunch(params.audioProfile);
  }

  /**
   * Autonomous US Phalanx CIWS perimeter turrets defend the base from incoming ordnance & low drones!
   */
  private updatePhalanxCiws(dt: number): void {
    this.ciwsTimer -= dt;
    this.ciwsActiveBurst = false;

    // Look for highest-priority incoming missile or low drone/heli within 85m
    let priorityPos: THREE.Vector3 | null = null;
    let incomingMissile: ActiveProjectile | null = null;
    for (const p of this.projectiles) {
      if (p.active && p.fromEnemy && p.position.length() < 95) {
        incomingMissile = p;
        priorityPos = p.position;
        break;
      }
    }

    let closeEnemy: ActiveEnemy | null = null;
    if (!priorityPos) {
      for (const e of this.enemies) {
        if (e.koTimer <= 0 && (e.type === 'drone' || e.type === 'helicopter') && e.position.length() < 85) {
          closeEnemy = e;
          priorityPos = e.position;
          break;
        }
      }
    }

    if (!priorityPos) return;
    this.ciwsActiveBurst = true;

    for (const turret of this.batteries.ciwsTurrets) {
      turret.yawGroup.getWorldPosition(_vecA);
      _vecB.copy(priorityPos).sub(_vecA);
      const targetYaw = Math.atan2(-_vecB.x, -_vecB.z);
      const horiz = Math.hypot(_vecB.x, _vecB.z);
      const targetPitch = Math.atan2(_vecB.y, Math.max(1, horiz));
      turret.yawGroup.rotation.y = targetYaw;
      turret.pitchGroup.rotation.x = THREE.MathUtils.clamp(targetPitch, -0.1, 1.3);
      turret.barrelCluster.rotation.z += dt * 45;
    }

    if (this.ciwsTimer <= 0) {
      const fireRate = Math.max(0.08, 0.14 - (this.upgrades.closeInLevel - 1) * 0.015);
      this.ciwsTimer = fireRate;
      const turret = this.batteries.ciwsTurrets[Math.floor(this.elapsedTime * 8) % 2];
      turret.muzzle.updateWorldMatrix(true, false);
      turret.muzzle.getWorldPosition(_vecC);
      const dir = _vecD.copy(priorityPos).sub(_vecC).normalize();
      this.spawnTracer(_vecC, dir, 330, 12 + this.upgrades.closeInLevel * 4, 3.2, true);
      this.fx.spawnFireGlow(_vecC, 0xfef08a, 1.0, 2.0, 0.08, 0.5);
      this.audio.playCiwsBurst();

      if (incomingMissile && Math.random() < 0.36) {
        incomingMissile.active = false;
        incomingMissile.mesh.visible = false;
        this.fx.spawnExplosion(incomingMissile.position, 0.55, this.camera.position);
      } else if (closeEnemy) {
        closeEnemy.hp -= 10 + this.upgrades.closeInLevel * 3;
        closeEnemy.hitFlashTimer = 0.05;
        if (closeEnemy.hp <= 0) this.handleEnemyKilled(closeEnemy);
      }
    }
  }

  private updateWaveSpawning(dt: number): void {
    const waveDef = getWaveDefinition(this.wave);

    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.enemies.length < 11) {
        const nextType = this.spawnQueue.shift()!;
        this.spawnEnemy(nextType, waveDef.speedMultiplier);
        this.spawnTimer = waveDef.spawnInterval;
      }
    }

    const status = checkWaveOutcome({
      spawnQueueLength: this.spawnQueue.length,
      activeEnemiesCount: this.enemies.length,
    });

    if (status === 'wave_clear') {
      this.waveClearPauseTimer += dt;
      if (this.waveClearPauseTimer >= 1.8) {
        this.commanderLevel += 1;
        this.credits += 500 + this.wave * 180;
        this.audio.playUpgrade();
        this.startWave(this.wave + 1);
      }
    }
  }

  private spawnEnemy(type: EnemyType, speedMult: number): void {
    const cfg = ENEMY_CONFIGS[type];
    const rig = buildEnemyModel(type);
    const spawnAngle = (Math.random() - 0.5) * 1.44;
    // Start far out on the deep horizon (240m-440m) so aircraft approach gradually with real scale & depth
    const dist =
      type === 'drone'
        ? 245 + Math.random() * 50
        : type === 'helicopter'
        ? 260 + Math.random() * 48
        : type === 'fighter'
        ? 360 + Math.random() * 60
        : 380 + Math.random() * 60;
    const alt =
      type === 'fighter' || type === 'stealth'
        ? cfg.maxAltitude + Math.random() * 22
        : THREE.MathUtils.lerp(cfg.minAltitude, cfg.maxAltitude, Math.random());

    const pos = new THREE.Vector3(Math.sin(spawnAngle) * dist, alt, -Math.cos(spawnAngle) * dist);
    rig.group.position.copy(pos);
    this.scene.add(rig.group);

    const initDir = new THREE.Vector3(-Math.sin(spawnAngle), 0, Math.cos(spawnAngle)).multiplyScalar(
      cfg.speed * speedMult,
    );

    this.enemies.push({
      id: this.nextEnemyId++,
      type,
      hp: cfg.maxHp,
      maxHp: cfg.maxHp,
      position: pos,
      velocity: initDir,
      phase: Math.random() * Math.PI * 2,
      orbitSign: Math.random() < 0.5 ? -1 : 1,
      strafeAngle: spawnAngle,
      attackTimer: 3.4 + Math.random() * 2.8,
      windupTimer: 0,
      hasAttackToken: false,
      radarStrength: type === 'stealth' ? 0.15 : 0.85,
      canLockHoming: type !== 'stealth',
      hitFlashTimer: 0,
      koTimer: 0,
      flareCooldown: 3.0 + Math.random() * 4.0,
      flybyPlayed: false,
      rig,
    });
  }

  private updateEnemies(dt: number): void {
    const waveDef = getWaveDefinition(this.wave);
    let currentAttackers = this.enemies.filter((e) => e.hasAttackToken).length;

    this.camera.updateMatrixWorld();
    _projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_projScreenMatrix);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const cfg = ENEMY_CONFIGS[e.type];

      if (e.koTimer > 0) {
        e.rig.group.visible = true;
        e.koTimer -= dt;
        e.position.y -= 19 * dt;
        e.position.addScaledVector(e.velocity, dt * 0.45);
        e.rig.group.position.copy(e.position);
        e.rig.group.rotation.z += 5.8 * dt;
        e.rig.group.rotation.x += 3.2 * dt;
        if (Math.random() < 0.7) {
          this.fx.spawnSmokePuff(e.position, 0x333840, 2.0, 5.2, 0.9, 0.6, 1.5, 2.0);
        }
        if (e.koTimer <= 0 || e.position.y <= 1) {
          this.fx.spawnExplosion(e.position, 1.25, this.camera.position);
          this.scene.remove(e.rig.group);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      const inFrustum =
        _frustum.containsPoint(e.position) || e.position.distanceTo(this.camera.position) < 28;
      e.rig.group.visible = inFrustum;

      if (inFrustum) {
        e.rig.lod.update(this.camera);
        for (const r of e.rig.rotors) r.rotation.y += dt * 30;
      }

      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= dt;
        const flashOn = e.hitFlashTimer > 0;
        for (const m of e.rig.bodyMeshes) {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            mat.emissive.setHex(flashOn ? 0xffffff : 0x000000);
            mat.emissiveIntensity = flashOn ? 0.85 : 0;
          }
        }
      }

      const dist = Math.hypot(e.position.x, e.position.z);
      const bearing = Math.atan2(-e.position.x, -e.position.z);
      const normAngle = (bearing + Math.PI * 2) % (Math.PI * 2);

      // Progressive distant-horizon approach into tactical combat pass
      if (e.type === 'drone' || e.type === 'helicopter') {
        const desiredRadius = e.type === 'drone' ? 68 : 88;
        const radialStep =
          dist > desiredRadius + 10
            ? Math.max(desiredRadius, dist - cfg.speed * 0.85 * dt)
            : desiredRadius;
        e.strafeAngle += e.orbitSign * 0.22 * waveDef.speedMultiplier * dt;
        e.strafeAngle = THREE.MathUtils.clamp(e.strafeAngle, -1.08, 1.08);
        if (Math.abs(e.strafeAngle) >= 1.05) e.orbitSign *= -1;
        const tx = Math.sin(e.strafeAngle) * radialStep;
        const tz = -Math.cos(e.strafeAngle) * radialStep;
        const ty = cfg.minAltitude + 4 + Math.sin(this.elapsedTime * 1.3 + e.phase) * 3.0;
        _vecA.set(tx, ty, tz).sub(e.position).normalize().multiplyScalar(cfg.speed * waveDef.speedMultiplier);
        e.velocity.lerp(_vecA, 1 - Math.exp(-3.2 * dt));
      } else if (e.type === 'fighter') {
        if (dist < 74) {
          e.orbitSign *= -1;
          e.strafeAngle += e.orbitSign * 0.72;
          if (!e.flybyPlayed) {
            e.flybyPlayed = true;
            this.audio.playJetFlyby();
          }
        } else if (dist > 145) {
          e.flybyPlayed = false;
        }
        e.strafeAngle += e.orbitSign * 0.34 * waveDef.speedMultiplier * dt;
        const targetSweep = 128 + Math.sin(this.elapsedTime * 0.55 + e.phase) * 46;
        const sweepRadius =
          dist > 148 ? Math.max(targetSweep, dist - cfg.speed * 0.92 * dt) : targetSweep;
        const tx = Math.sin(THREE.MathUtils.clamp(e.strafeAngle, -1.12, 1.12)) * sweepRadius;
        const tz = -Math.cos(THREE.MathUtils.clamp(e.strafeAngle, -1.12, 1.12)) * sweepRadius;
        const altSlope = THREE.MathUtils.clamp((dist - 100) * 0.14, 0, 28);
        const ty = cfg.minAltitude + altSlope + Math.cos(this.elapsedTime * 0.9 + e.phase) * 9;
        _vecA.set(tx, ty, tz).sub(e.position).normalize().multiplyScalar(cfg.speed * waveDef.speedMultiplier);
        e.velocity.lerp(_vecA, 1 - Math.exp(-2.6 * dt));
      } else {
        e.phase += dt * 1.25;
        const approachRadius = Math.max(92, dist - 22.0 * waveDef.speedMultiplier * dt);
        const weaveAngle = e.strafeAngle + Math.sin(e.phase) * 0.36;
        const tx = Math.sin(THREE.MathUtils.clamp(weaveAngle, -1.08, 1.08)) * approachRadius;
        const tz = -Math.cos(THREE.MathUtils.clamp(weaveAngle, -1.08, 1.08)) * approachRadius;
        const altSlope = THREE.MathUtils.clamp((dist - 110) * 0.15, 0, 32);
        const ty = cfg.minAltitude + altSlope + Math.sin(e.phase * 0.7) * 6;
        _vecA.set(tx, ty, tz).sub(e.position).normalize().multiplyScalar(cfg.speed * waveDef.speedMultiplier);
        e.velocity.lerp(_vecA, 1 - Math.exp(-2.8 * dt));
      }

      e.position.addScaledVector(e.velocity, dt);
      e.rig.group.position.copy(e.position);

      // Subtle high-altitude jet contrail puffs on far approaching fighters/stealth jets
      if (inFrustum && dist > 145 && (e.type === 'fighter' || e.type === 'stealth') && Math.random() < 0.28) {
        this.fx.spawnSmokePuff(e.position, 0xf1f5f9, 0.75, 2.6, 1.1, 0.24, 0.8, 0.25);
      }
      if (e.velocity.lengthSq() > 0.2) {
        _vecB.copy(e.position).add(e.velocity);
        e.rig.group.lookAt(_vecB);
        // Realistic aerodynamic bank roll during turns
        const bankRoll =
          e.type === 'fighter' || e.type === 'stealth'
            ? THREE.MathUtils.clamp(-e.orbitSign * 0.42, -0.55, 0.55)
            : THREE.MathUtils.clamp(-e.orbitSign * 0.16, -0.25, 0.25);
        e.rig.airframeGroup.rotation.z = THREE.MathUtils.lerp(
          e.rig.airframeGroup.rotation.z,
          bankRoll,
          1 - Math.exp(-3.5 * dt),
        );
      }

      // Visual jet flare countermeasure puff occasionally on high-tier fighters
      if ((e.type === 'fighter' || e.type === 'stealth') && this.lockedTarget?.id === e.id) {
        e.flareCooldown -= dt;
        if (e.flareCooldown <= 0) {
          e.flareCooldown = 5.5;
          this.fx.spawnFireGlow(e.position, 0xfef08a, 1.4, 2.8, 0.45, 5.5);
          this.fx.spawnSmokePuff(e.position, 0xe2e8f0, 0.9, 3.0, 0.9, 0.45, 3.0, 0.8);
        }
      }

      const prevStrength = e.radarStrength;
      const rad = computeRadarDetection({
        enemyType: e.type,
        distance: dist,
        bearingRad: normAngle,
        radarAngleRad: this.radarAngle,
        radarLevel: this.upgrades.radarLevel,
        previousStrength: e.radarStrength,
        dt,
      });
      e.radarStrength = rad.strength;
      e.canLockHoming = rad.canLockHoming;

      if (e.type === 'stealth' && prevStrength < 0.5 && rad.strength >= 0.75) {
        this.audio.playRadarPing(true);
      }

      if (e.type === 'stealth') {
        const visOpacity = THREE.MathUtils.clamp(0.32 + e.radarStrength * 0.68, 0.32, 1.0);
        for (const m of e.rig.bodyMeshes) {
          (m.material as THREE.MeshStandardMaterial).opacity = visOpacity;
        }
      }

      if (e.hasAttackToken) {
        e.windupTimer -= dt;
        e.rig.telegraphRing.visible = true;
        e.rig.telegraphRing.lookAt(this.camera.position);
        e.rig.telegraphRing.scale.setScalar(1 + Math.sin(this.elapsedTime * 22) * 0.2);

        if (e.windupTimer <= 0) {
          e.hasAttackToken = false;
          e.rig.telegraphRing.visible = false;
          e.attackTimer = cfg.attackCooldown + Math.random() * 2;
          this.fireEnemyOrdnance(e);
        }
      } else {
        e.rig.telegraphRing.visible = false;
        e.attackTimer -= dt;
        if (
          e.attackTimer <= 0 &&
          dist < 135 &&
          currentAttackers < waveDef.maxConcurrentAttackers
        ) {
          e.hasAttackToken = true;
          e.windupTimer = cfg.windupDuration;
          currentAttackers += 1;
        }
      }
    }
  }

  private fireEnemyOrdnance(enemy: ActiveEnemy): void {
    const cfg = ENEMY_CONFIGS[enemy.type];
    let slot: ActiveProjectile | null = null;
    for (let i = 70; i < PROJECTILE_POOL_SIZE; i++) {
      if (!this.projectiles[i].active) {
        slot = this.projectiles[i];
        break;
      }
    }
    if (!slot) return;

    slot.active = true;
    slot.fromEnemy = true;
    slot.isMissile = true;
    slot.isArtillery = false;
    slot.position.copy(enemy.position);
    _vecA.set(0, 4.0, 0).sub(enemy.position).normalize().multiplyScalar(42);
    slot.velocity.copy(_vecA);
    slot.targetSpeed = 42;
    slot.damage = cfg.baseDamage;
    slot.blastRadius = 3;
    slot.homing = false;
    slot.coldTimer = 0;
    slot.turnRate = 0;
    slot.targetEnemyId = null;
    slot.life = 5.2;
    slot.smokeTimer = 0;
    slot.mesh.position.copy(slot.position);
    slot.mesh.lookAt(0, 4, 0);
    slot.mesh.scale.setScalar(1.0);
    slot.mesh.visible = true;
  }

  private updateProjectiles(dt: number): void {
    const forcesStats = getCombinedForcesStats(this.upgrades.forcesLevel);
    for (const p of this.projectiles) {
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      if (p.isArtillery) {
        // Ballistic MLRS rocket arc gravity
        p.velocity.y -= 28 * dt;
      } else if (p.coldTimer > 0) {
        p.coldTimer -= dt;
        if (p.coldTimer <= 0) {
          this.fx.spawnLaunchPlume(p.position, true);
          p.velocity.normalize().multiplyScalar(p.targetSpeed);
        }
      } else if (!p.fromEnemy && p.homing && p.targetEnemyId !== null) {
        const target = this.enemies.find((e) => e.id === p.targetEnemyId && e.koTimer <= 0);
        if (target) {
          _vecA.copy(target.position).sub(p.position).normalize();
          _vecB.copy(p.velocity).normalize();
          _vecB.lerp(_vecA, Math.min(1, p.turnRate * dt)).normalize();
          p.velocity.copy(_vecB).multiplyScalar(p.targetSpeed);
        }
      }

      p.position.addScaledVector(p.velocity, dt);
      p.mesh.position.copy(p.position);
      _vecA.copy(p.position).add(p.velocity);
      p.mesh.lookAt(_vecA);

      if (p.isMissile) {
        p.smokeTimer += dt;
        if (p.smokeTimer >= 0.025) {
          p.smokeTimer = 0;
          this.fx.spawnSmokePuff(
            p.position,
            p.fromEnemy ? 0x64748b : 0xe5e7eb,
            p.coldTimer > 0 ? 1.4 : 1.0,
            p.coldTimer > 0 ? 4.2 : 3.2,
            0.75,
            0.48,
            0.9,
            0.7,
          );
        }
      }

      if (p.fromEnemy) {
        // Check hit on forward perimeter outposts (Two-Way Destruction) or central bunker
        let hitOutpost = false;
        for (const node of this.batteries.outpostNodes) {
          if (p.position.distanceTo(node.position) < 6.5) {
            hitOutpost = true;
            break;
          }
        }
        if (hitOutpost || p.position.distanceTo(_vecD.set(0, 4, 2)) < 11 || p.position.y <= 0.6) {
          p.active = false;
          p.mesh.visible = false;
          this.fx.spawnExplosion(p.position, 0.9, this.camera.position);
          if (this.screenState === 'playing') {
            this.audio.playExplosion(0.95);
            this.trauma = Math.min(1, this.trauma + 0.36);
            if (hitOutpost || p.isArtillery) {
              const rep = applyOutpostDamageAndRepair({
                currentHp: this.outpostHp,
                damage: p.damage * 1.4,
                repairRate: 0,
                dt: 0,
              });
              this.outpostHp = rep.nextHp;
            } else {
              const dmgRes = applyBaseDamage(this.baseHp, p.damage);
              this.baseHp = dmgRes.nextHp;
            }
          }
        }
        continue;
      }

      if (this.screenState !== 'playing') continue;

      // Allied MLRS rocket or ground shot impacting Enemy Camp / Enemy Ground Forces
      if (p.isArtillery && p.position.y <= 1.2) {
        p.active = false;
        p.mesh.visible = false;
        this.fx.spawnExplosion(p.position, 1.3, this.camera.position);
        this.audio.playExplosion(1.1);
        for (const u of this.groundUnits) {
          if (u.faction === 'enemy' && u.alive && u.position.distanceTo(p.position) < 28) {
            this.damageGroundUnit(u, forcesStats.mlrsRocketDamage);
          }
        }
        continue;
      }

      // Ground sniper / rifleman shots hitting enemy ground units
      let consumed = false;
      for (const u of this.groundUnits) {
        if (u.faction === 'enemy' && u.alive && p.position.distanceTo(u.position) < 3.4) {
          p.active = false;
          p.mesh.visible = false;
          this.damageGroundUnit(u, p.damage);
          consumed = true;
          break;
        }
      }
      if (consumed) continue;

      for (const e of this.enemies) {
        if (e.koTimer > 0) continue;
        const hitDist = p.position.distanceTo(e.position);
        const hitRadius = p.blastRadius + 2.8;
        if (hitDist <= hitRadius) {
          p.active = false;
          p.mesh.visible = false;
          this.shotsHit += 1;

          e.hp -= p.damage;
          e.hitFlashTimer = 0.06;
          this.fx.spawnExplosion(p.position, p.isMissile ? 0.95 : 0.4, this.camera.position);

          if (e.hp <= 0) {
            this.handleEnemyKilled(e);
          } else {
            this.audio.playHitMarker();
          }
          break;
        }
      }
    }
  }

  private handleEnemyKilled(e: ActiveEnemy): void {
    const cfg = ENEMY_CONFIGS[e.type];
    e.koTimer = 0.44;
    e.hasAttackToken = false;
    e.rig.telegraphRing.visible = false;
    this.kills += 1;
    this.credits += cfg.rewardCredits;
    this.score += cfg.rewardScore;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(this.bestScore));
      } catch {
        // ignore
      }
    }

    this.hitstopTimer = 0.04;
    this.trauma = Math.min(1, this.trauma + 0.42);
    this.fx.spawnExplosion(e.position, 1.35, this.camera.position);
    this.audio.playExplosion(e.type === 'stealth' ? 1.35 : 1.05);
    this.emitHud();
  }

  private updateSkyLockSeeker(dt: number): void {
    let best: ActiveEnemy | null = null;
    let bestNdc = this.isZoomed ? 0.45 : 0.34;
    let bestScreenX = 0.5;
    let bestScreenY = 0.5;

    for (const e of this.enemies) {
      if (e.koTimer > 0) continue;
      _vecA.copy(e.position).project(this.camera);
      if (_vecA.z < -1 || _vecA.z > 1) continue;
      const ndcDist = Math.hypot(_vecA.x, _vecA.y);
      if (ndcDist < bestNdc) {
        bestNdc = ndcDist;
        best = e;
        bestScreenX = (_vecA.x + 1) * 0.5;
        bestScreenY = (1 - _vecA.y) * 0.5;
      }
    }

    if (!best) {
      this.seekerCandidateId = null;
      this.seekerLockProgress = Math.max(0, this.seekerLockProgress - dt * 2.2);
      this.lockedTarget = null;
      return;
    }

    if (this.seekerCandidateId !== best.id) {
      this.seekerCandidateId = best.id;
      this.seekerLockProgress = 0.15;
    }

    this.seekerLockProgress = advanceSeekerLock({
      currentLock: this.seekerLockProgress,
      hasTargetInCone: true,
      ndcDist: bestNdc,
      isStealth: best.type === 'stealth',
      canHardLockStealth: best.canLockHoming,
      radarLevel: this.upgrades.radarLevel,
      dt,
    });

    const isLocked = this.seekerLockProgress >= 0.99;
    if (this.activeWeapon === 'manpads' || this.activeWeapon === 'patriot' || this.activeWeapon === 's400') {
      this.audio.playSeekerTone(isLocked);
    }

    const cfg = ENEMY_CONFIGS[best.type];
    this.lockedTarget = {
      id: best.id,
      type: best.type,
      labelAr: cfg.labelAr,
      codeName: cfg.codeName,
      distance: Math.round(best.position.length()),
      hp: Math.max(0, Math.round(best.hp)),
      maxHp: cfg.maxHp,
      lockProgress: this.seekerLockProgress,
      isLocked,
      isStealthHardLock: best.type !== 'stealth' || best.canLockHoming,
      isAttacking: best.hasAttackToken,
      screenX: THREE.MathUtils.clamp(bestScreenX, 0.08, 0.92),
      screenY: THREE.MathUtils.clamp(bestScreenY, 0.12, 0.82),
      onScreen: true,
    };
  }

  private emitHud(): void {
    const blips: RadarBlip[] = this.enemies
      .filter((e) => e.koTimer <= 0)
      .map((e) => ({
        id: e.id,
        type: e.type,
        x: THREE.MathUtils.clamp(e.position.x / RADAR_MAX_RANGE, -1, 1),
        z: THREE.MathUtils.clamp(e.position.z / RADAR_MAX_RANGE, -1, 1),
        altitude: Math.round(e.position.y),
        detectedStrength: e.radarStrength,
        isAttacking: e.hasAttackToken,
        distance: Math.round(e.position.length()),
      }));

    const cooldownPct: Record<WeaponType, number> = {
      manpads: 0,
      heavy_aa: 0,
      patriot: 0,
      thaad: 0,
      s400: 0,
      pantsir: 0,
      hq9: 0,
    };
    for (const w of WEAPON_ORDER) {
      const s = getWeaponStats(w, this.upgrades);
      cooldownPct[w] = s.cooldown > 0 ? Math.min(1, this.weaponCooldowns[w] / s.cooldown) : 0;
    }

    const forcesStats = getCombinedForcesStats(this.upgrades.forcesLevel);
    const mlrsPct =
      forcesStats.mlrsCooldown > 0
        ? Math.min(1, this.mlrsCooldown / forcesStats.mlrsCooldown)
        : 0;

    this.onHudUpdate({
      screenState: this.screenState,
      nation: this.nation,
      combatMode: this.combatMode,
      selectedJet: this.selectedJet,
      airSpeedKts: this.combatMode === 'ground' ? 0 : Math.round(this.jetSpeed * 9.5),
      airAltitudeM: this.combatMode === 'ground' ? 0 : Math.round(Math.max(0, this.jetPos.y * 12)),
      mlrsCooldownPct: mlrsPct,
      outpostHpPct: Math.round(this.outpostHp),
      alliedUnitsAlive: this.groundUnits.filter((u) => u.faction === 'ally' && u.alive).length,
      enemyGroundAlive: this.groundUnits.filter((u) => u.faction === 'enemy' && u.alive).length,
      commanderLevel: this.commanderLevel,
      wave: this.wave,
      waveEnemiesRemaining: this.spawnQueue.length + this.enemies.filter((e) => e.koTimer <= 0).length,
      waveBannerTimer: this.waveBannerTimer,
      baseHp: Math.round(this.baseHp),
      maxBaseHp: MAX_BASE_HP,
      credits: Math.round(this.credits),
      score: Math.round(this.score),
      bestScore: Math.round(this.bestScore),
      kills: this.kills,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      activeWeapon: this.activeWeapon,
      weaponMag: { ...this.weaponMag },
      weaponCooldownPct: cooldownPct,
      isZoomed: this.isZoomed,
      ciwsActiveBurst: this.ciwsActiveBurst,
      upgrades: { ...this.upgrades },
      radarAngle: this.radarAngle,
      stealthWarning: this.enemies.some((e) => e.type === 'stealth' && e.koTimer <= 0),
      incomingThreatWarning: this.enemies.some((e) => e.hasAttackToken),
      lockedTarget: this.lockedTarget,
      radarBlips: blips,
      muted: this.audio.isMuted(),
      elapsedTime: this.elapsedTime,
    });
  }

  // ---------------------------------------------------------------------------
  // COMBINED ARMS: GROUND TROOPS, SNIPERS, MLRS ARTILLERY & FLIGHT COMBAT
  // ---------------------------------------------------------------------------

  private initGroundForces(): void {
    const specs: Array<{ faction: 'ally' | 'enemy'; role: 'sniper' | 'infantry'; pos: [number, number, number] }> = [
      // Allied Snipers on elevated bunker flanks + Forward Infantry
      { faction: 'ally', role: 'sniper', pos: [-14.5, 4.3, 2.4] },
      { faction: 'ally', role: 'sniper', pos: [14.5, 4.3, 2.4] },
      { faction: 'ally', role: 'infantry', pos: [-13.5, 0, -18.5] },
      { faction: 'ally', role: 'infantry', pos: [-5.5, 0, -18.8] },
      { faction: 'ally', role: 'infantry', pos: [5.5, 0, -18.8] },
      { faction: 'ally', role: 'infantry', pos: [13.5, 0, -18.5] },
      // Distant Enemy Forward Strike Camp Snipers & Infantry
      { faction: 'enemy', role: 'sniper', pos: [-19, 0, -193] },
      { faction: 'enemy', role: 'sniper', pos: [29, 0, -195] },
      { faction: 'enemy', role: 'infantry', pos: [-11, 0, -185] },
      { faction: 'enemy', role: 'infantry', pos: [2, 0, -188] },
      { faction: 'enemy', role: 'infantry', pos: [14, 0, -184] },
      { faction: 'enemy', role: 'infantry', pos: [25, 0, -187] },
    ];

    for (const sp of specs) {
      const rig = buildSoldierUnitRig(sp.faction, sp.role);
      const pos = new THREE.Vector3(...sp.pos);
      rig.group.position.copy(pos);
      if (sp.faction === 'enemy') rig.group.rotation.y = Math.PI;
      this.scene.add(rig.group);
      this.groundUnits.push({
        faction: sp.faction,
        role: sp.role,
        hp: sp.role === 'sniper' ? 95 : 80,
        maxHp: sp.role === 'sniper' ? 95 : 80,
        position: pos,
        fireCooldown: 1.0 + Math.random() * 2.5,
        respawnTimer: 0,
        alive: true,
        rig,
      });
    }
  }

  private resetGroundForces(): void {
    for (const u of this.groundUnits) {
      u.hp = u.maxHp;
      u.alive = true;
      u.rig.group.visible = true;
      u.fireCooldown = 1.0 + Math.random() * 2.5;
    }
  }

  private damageGroundUnit(unit: GroundSoldierUnit, dmg: number): void {
    if (!unit.alive) return;
    unit.hp -= dmg;
    if (unit.hp <= 0) {
      unit.alive = false;
      unit.rig.group.visible = false;
      unit.respawnTimer = 8.0;
      this.fx.spawnSmokePuff(unit.position, 0x334155, 0.8, 2.2, 0.8, 0.4, 0.8, 0.8);
      if (unit.faction === 'enemy') {
        this.kills += 1;
        this.credits += unit.role === 'sniper' ? 110 : 75;
        this.score += unit.role === 'sniper' ? 180 : 120;
      }
    }
  }

  private updateOutpostVisualCondition(): void {
    const ratio = THREE.MathUtils.clamp(this.outpostHp / MAX_OUTPOST_HP, 0.15, 1.0);
    const shade = 0.45 + 0.55 * ratio;
    for (const node of this.batteries.outpostNodes) {
      node.barrierMat.color.setRGB(shade, shade * (0.85 + 0.15 * ratio), shade * (0.78 + 0.22 * ratio));
      if (ratio < 0.65 && Math.random() < 0.08) {
        this.fx.spawnSmokePuff(node.position, 0x3f434a, 0.85, 2.4, 1.2, 0.35, 1.1, 0.7);
      }
    }
  }

  private updateGroundCombatAndMlrs(dt: number): void {
    const forcesStats = getCombinedForcesStats(this.upgrades.forcesLevel);

    // 1. Queued Allied MLRS Rocket Salvo Launches ("الراجمات")
    if (this.mlrsQueuedShots > 0) {
      this.mlrsShotTimer -= dt;
      if (this.mlrsShotTimer <= 0) {
        this.mlrsShotTimer = 0.12;
        const mIdx = this.mlrsQueuedShots % this.batteries.alliedMlrs.muzzles.length;
        const muzzle = this.batteries.alliedMlrs.muzzles[mIdx];
        muzzle.updateWorldMatrix(true, false);
        muzzle.getWorldPosition(_vecC);

        const targetEnemyUnit = this.groundUnits.find((u) => u.faction === 'enemy' && u.alive);
        const targetPt = targetEnemyUnit ? targetEnemyUnit.position : this.batteries.enemyCampAnchor;
        this.spawnArtilleryRocket(_vecC, targetPt, false, forcesStats.mlrsRocketDamage);
        this.mlrsQueuedShots -= 1;
      }
    }

    // 2. Enemy Forward Camp MLRS Launches toward our Forward Outposts (interceptable by Phalanx!)
    this.enemyMlrsTimer -= dt;
    if (this.enemyMlrsTimer <= 0) {
      this.enemyMlrsTimer = Math.max(8.0, 14.5 - this.wave * 0.5);
      const mIdx = Math.floor(Math.random() * this.batteries.enemyMlrs.muzzles.length);
      const muzzle = this.batteries.enemyMlrs.muzzles[mIdx];
      muzzle.updateWorldMatrix(true, false);
      muzzle.getWorldPosition(_vecC);
      const outIdx = Math.floor(Math.random() * this.batteries.outpostNodes.length);
      this.spawnArtilleryRocket(_vecC, this.batteries.outpostNodes[outIdx].position, true, 9);
    }

    // 3. Snipers & Infantry Combat Loop
    for (const u of this.groundUnits) {
      if (!u.alive) {
        u.respawnTimer -= dt;
        if (u.respawnTimer <= 0) {
          u.alive = true;
          u.hp = u.maxHp;
          u.rig.group.visible = true;
          u.fireCooldown = 2.0;
        }
        continue;
      }

      u.fireCooldown -= dt;
      if (u.fireCooldown > 0) continue;

      if (u.faction === 'ally') {
        // Allied snipers prioritize enemy snipers/infantry or low drones
        const enemyTarget = this.groundUnits.find((e) => e.faction === 'enemy' && e.alive);
        const lowAir = this.enemies.find((e) => e.koTimer <= 0 && e.position.y < 36 && e.position.length() < 230);
        const aimPos = enemyTarget ? enemyTarget.position : lowAir ? lowAir.position : null;
        if (!aimPos) {
          u.fireCooldown = 1.0;
          continue;
        }

        u.fireCooldown = u.role === 'sniper' ? forcesStats.sniperInterval : 1.4 + Math.random() * 0.8;
        u.rig.torso.lookAt(aimPos.x, u.position.y + 0.8, aimPos.z);
        u.rig.muzzle.updateWorldMatrix(true, false);
        u.rig.muzzle.getWorldPosition(_vecC);
        const dir = _vecD.copy(aimPos).sub(_vecC).normalize();
        const dmg = u.role === 'sniper' ? forcesStats.sniperDamage : 18 + this.upgrades.forcesLevel * 4;
        this.spawnTracer(_vecC, dir, u.role === 'sniper' ? 360 : 240, dmg, 2.2, false, false);
        this.fx.spawnFireGlow(_vecC, 0xfef08a, 0.5, 1.1, 0.06, 0.4);
        if (u.role === 'sniper') {
          this.audio.playSniperCrack();
        }
      } else {
        // Enemy snipers & infantry fire at forward outposts or allied forward troops
        u.fireCooldown = u.role === 'sniper' ? 3.2 + Math.random() * 1.4 : 2.6 + Math.random() * 1.5;
        const outNode = this.batteries.outpostNodes[Math.floor(Math.random() * this.batteries.outpostNodes.length)];
        u.rig.muzzle.updateWorldMatrix(true, false);
        u.rig.muzzle.getWorldPosition(_vecC);
        const dir = _vecD.copy(outNode.position).sub(_vecC).normalize();
        this.spawnTracer(_vecC, dir, 210, u.role === 'sniper' ? 4 : 2.5, 1.5, false, true);
      }
    }
  }

  private spawnArtilleryRocket(
    origin: THREE.Vector3,
    targetPos: THREE.Vector3,
    fromEnemy: boolean,
    damage: number,
  ): void {
    const startIdx = fromEnemy ? 70 : 42;
    const endIdx = fromEnemy ? PROJECTILE_POOL_SIZE : 70;
    let slot: ActiveProjectile | null = null;
    for (let i = startIdx; i < endIdx; i++) {
      if (!this.projectiles[i].active) {
        slot = this.projectiles[i];
        break;
      }
    }
    if (!slot) return;

    const dx = targetPos.x - origin.x + (Math.random() - 0.5) * 14;
    const dz = targetPos.z - origin.z + (Math.random() - 0.5) * 14;
    const flightTime = 3.2;
    const vx = dx / flightTime;
    const vz = dz / flightTime;
    const vy = (targetPos.y - origin.y + 0.5 * 28 * flightTime * flightTime) / flightTime;

    slot.active = true;
    slot.fromEnemy = fromEnemy;
    slot.isMissile = true;
    slot.isArtillery = true;
    slot.position.copy(origin);
    slot.velocity.set(vx, vy, vz);
    slot.targetSpeed = slot.velocity.length();
    slot.damage = damage;
    slot.blastRadius = 10;
    slot.homing = false;
    slot.coldTimer = 0;
    slot.turnRate = 0;
    slot.targetEnemyId = null;
    slot.life = flightTime + 0.8;
    slot.smokeTimer = 0;
    slot.mesh.position.copy(origin);
    _vecA.copy(origin).add(slot.velocity);
    slot.mesh.lookAt(_vecA);
    slot.mesh.scale.setScalar(0.9);
    slot.mesh.visible = true;
    this.fx.spawnLaunchPlume(origin, true);
  }

  private updatePlayerFlightMode(dt: number, slewX: number, slewY: number): void {
    if (!this.playerJetRig) return;
    const cfg = PLAYER_JET_CONFIGS[this.selectedJet];
    this.playerJetRig.group.visible = true;

    if (this.combatMode === 'takeoff') {
      this.takeoffTimer += dt;
      const t = Math.min(1, this.takeoffTimer / 2.2);
      this.jetSpeed = THREE.MathUtils.lerp(18, cfg.cruiseSpeed, t);
      this.jetPos.z -= this.jetSpeed * dt;
      if (this.takeoffTimer > 0.95) {
        this.jetPitch = THREE.MathUtils.lerp(this.jetPitch, 0.36, 1 - Math.exp(-3.5 * dt));
        this.jetPos.y += Math.sin(this.jetPitch) * this.jetSpeed * dt;
      }

      if (Math.random() < 0.6) {
        this.fx.spawnSmokePuff(this.jetPos, 0xe2e8f0, 0.7, 2.2, 0.6, 0.25, 0.7, 0.4);
      }

      this.playerJetRig.group.position.copy(this.jetPos);
      this.playerJetRig.group.rotation.set(this.jetPitch, this.jetYaw, 0, 'YXZ');

      // Runway chase camera behind fighter jet
      _vecA.set(0, 4.8, 15.5).applyAxisAngle(_vecB.set(0, 1, 0), this.jetYaw).add(this.jetPos);
      this.camera.position.lerp(_vecA, 1 - Math.exp(-8 * dt));
      _vecC.set(0, 1.5, -24).applyAxisAngle(_vecB.set(0, 1, 0), this.jetYaw).add(this.jetPos);
      this.camera.lookAt(_vecC);

      if (this.takeoffTimer >= 2.25) {
        this.combatMode = 'air';
        this.emitHud();
      }
      return;
    }

    // Air Dogfight Flight Mode
    this.jetYaw += slewX * cfg.turnRate * dt;
    this.jetPitch = THREE.MathUtils.clamp(this.jetPitch + slewY * 1.15 * dt, -0.48, 0.55);
    const targetRoll = THREE.MathUtils.clamp(-slewX * 0.65, -0.75, 0.75);
    this.jetRoll = THREE.MathUtils.lerp(this.jetRoll, targetRoll, 1 - Math.exp(-6.5 * dt));

    const cosP = Math.cos(this.jetPitch);
    _vecD.set(-Math.sin(this.jetYaw) * cosP, Math.sin(this.jetPitch), -Math.cos(this.jetYaw) * cosP);
    this.jetPos.addScaledVector(_vecD, cfg.cruiseSpeed * dt);
    this.jetPos.y = THREE.MathUtils.clamp(this.jetPos.y, 26, 175);

    // Keep jet inside active combat airspace (360m radius) with gentle inward auto-bank
    const distFromCenter = Math.hypot(this.jetPos.x, this.jetPos.z + 80);
    if (distFromCenter > 320) {
      const toCenterYaw = Math.atan2(this.jetPos.x, this.jetPos.z + 80);
      this.jetYaw = THREE.MathUtils.lerp(this.jetYaw, toCenterYaw, 1 - Math.exp(-1.5 * dt));
    }

    this.playerJetRig.group.position.copy(this.jetPos);
    this.playerJetRig.group.rotation.set(this.jetPitch, this.jetYaw, this.jetRoll, 'YXZ');

    // Flicker twin afterburners
    const abScale = 0.85 + Math.sin(this.elapsedTime * 42) * 0.22;
    for (const ab of this.playerJetRig.afterburners) {
      ab.scale.set(1, 1, abScale);
    }

    // Smooth Chase Camera
    _vecA.copy(_vecD).multiplyScalar(-15.5).add(this.jetPos);
    _vecA.y += 4.2;
    this.camera.position.lerp(_vecA, 1 - Math.exp(-10 * dt));
    _vecC.copy(_vecD).multiplyScalar(48).add(this.jetPos);
    this.camera.lookAt(_vecC);

    if (this.camera.fov !== 64) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 64, 1 - Math.exp(-8 * dt));
      this.camera.updateProjectionMatrix();
    }
  }

  private fireJetWeapons(): void {
    if (!this.playerJetRig || this.airCannonCooldown > 0) return;
    const cfg = PLAYER_JET_CONFIGS[this.selectedJet];
    this.airCannonCooldown = cfg.cannonCooldown;
    this.shotsFired += 1;

    _vecD
      .set(
        -Math.sin(this.jetYaw) * Math.cos(this.jetPitch),
        Math.sin(this.jetPitch),
        -Math.cos(this.jetYaw) * Math.cos(this.jetPitch),
      )
      .normalize();

    for (const muzzle of this.playerJetRig.muzzles) {
      muzzle.updateWorldMatrix(true, false);
      muzzle.getWorldPosition(_vecC);
      this.spawnTracer(_vecC, _vecD, 360, cfg.cannonDamage, 4.5, false, false);
    }
    this.audio.playJetCannon();

    if (this.lockedTarget && this.airMissileCooldown <= 0) {
      this.fireJetAirMissile();
    }
  }

  private fireJetAirMissile(): void {
    if (!this.playerJetRig || this.airMissileCooldown > 0) return;
    const cfg = PLAYER_JET_CONFIGS[this.selectedJet];
    this.airMissileCooldown = 1.1;
    const target =
      (this.lockedTarget
        ? this.enemies.find((e) => e.id === this.lockedTarget!.id && e.koTimer <= 0)
        : undefined) ?? this.enemies.find((e) => e.koTimer <= 0);

    const muzzle = this.playerJetRig.muzzles[0];
    muzzle.updateWorldMatrix(true, false);
    muzzle.getWorldPosition(_vecC);
    const dir = target
      ? _vecD.copy(target.position).sub(_vecC).normalize()
      : _vecD.set(-Math.sin(this.jetYaw), Math.sin(this.jetPitch), -Math.cos(this.jetYaw)).normalize();

    this.spawnMissile({
      origin: _vecC,
      dir,
      speed: cfg.missileSpeed,
      damage: cfg.missileDamage,
      blastRadius: 12,
      homing: true,
      coldLaunch: false,
      turnRate: 9.2,
      targetEnemyId: target ? target.id : null,
      audioProfile: 'manpads',
      scale: 0.9,
    });
  }

  public dispose(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.cleanupListeners();
    this.resizeObserver?.disconnect();
    this.composer?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
