import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import {
  ArmoryModal,
  PauseModal,
  ProjectPlanModal,
} from './components/Modals';
import { OfflineIndicator } from './components/PWAInstallUI';
import { TitleScreen } from './components/TitleScreen';
import { SkyDefenseEngine } from './game/engine';
import { createInitialNations } from './game/nations';
import {
  DEFAULT_TANK_ORDER,
  MAX_BASE_HP,
  PLAYER_TANK_CONFIG,
  createInitialEmbassies,
  createInitialInfrastructure,
  createInitialUpgrades,
  type UpgradeSlotKey,
} from './game/rules';
import type {
  ConvoyDriveMode,
  HudSnapshot,
  NationId,
  PlayerJetType,
  SquadOrder,
  SupportOpId,
  TankOrder,
  WeaponType,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  screenState: 'title',
  combatMode: 'ground',
  selectedJet: 'stealth_jet',
  squadOrder: 'follow',
  tankOrder: DEFAULT_TANK_ORDER,
  tankTargetPoint: null,
  timeOfDay: 'day',
  weather: 'clear',
  thermalActive: false,
  warDeclared: false,
  ewJamActive: false,
  weaponHolstered: false,
  reservesMobilized: false,
  convoyDriveMode: 'manual',
  convoyDestination: 'ae',
  convoySpeedKmh: 0,
  poetryTrackIndex: 0,
  insideEmbassy: false,
  nearIntelConsole: false,
  nearHqDesk: false,
  nearConvoyVehicle: false,
  hqSeated: false,
  insideForeignPalace: null,
  nearForeignChair: null,
  foreignSeatedNation: null,
  listeningActive: false,
  truceActive: false,
  truceRemainingSec: 0,
  hqIntegrityPct: 100,
  secretSitesRevealed: 0,
  secretSitesTotal: 4,
  secretSitesDestroyed: 0,
  nations: createInitialNations(),
  activePresidentNation: null,
  nukeReady: true,
  nukeCooldownPct: 0,
  nukeTargetingActive: false,
  nukeTargetPoint: null,
  sleeperReady: true,
  sleeperCooldownPct: 0,
  supportCooldownPct: {
    joint_strike: 0,
    reinforce_50: 0,
    swarm_drones: 0,
    paratroopers: 0,
    ew_jam: 0,
    naval_barrage: 0,
    artillery_barrage: 0,
    desert_tunnels: 0,
  },
  embassies: createInitialEmbassies(),
  infrastructure: createInitialInfrastructure(),
  airSpeedKts: 0,
  airAltitudeM: 0,
  playerAltitudeM: 0,
  tankHp: PLAYER_TANK_CONFIG.maxHp,
  maxTankHp: PLAYER_TANK_CONFIG.maxHp,
  alliedSoldiersAlive: 4,
  enemySoldiersAlive: 0,
  baseHp: MAX_BASE_HP,
  maxBaseHp: MAX_BASE_HP,
  credits: 12500,
  score: 0,
  bestScore: 0,
  kills: 0,
  activeWeapon: 'rifle',
  weaponMag: {
    rifle: 30,
    manpads: 4,
    heavy_aa: 60,
    patriot: 4,
    thaad: 2,
    s400: 4,
    hq9: 4,
    laser: 45,
    hypersonic: 2,
  },
  isZoomed: false,
  upgrades: createInitialUpgrades(),
  radarAngle: 0,
  lockedTarget: null,
  radarBlips: [],
  muted: false,
  elapsedTime: 0,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SkyDefenseEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [showArmory, setShowArmory] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    document.body.dataset.state = hud.screenState;
  }, [hud.screenState]);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const engine = new SkyDefenseEngine(mountEl, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.startNewMission(false);
    } else {
      document.body.dataset.state = 'title';
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStart = useCallback(() => {
    setShowPlanModal(false);
    setShowArmory(false);
    engineRef.current?.startNewMission(true);
  }, []);

  const handleToggleArmory = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    setShowArmory((prev) => {
      const next = !prev;
      eng.setPaused(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (!eng) return;

      if (hud.screenState === 'title') {
        if ((e.code === 'Enter' || e.code === 'Space') && !showPlanModal) {
          e.preventDefault();
          handleStart();
        } else if (e.code === 'Escape' && showPlanModal) {
          setShowPlanModal(false);
        }
        return;
      }

      if (e.code === 'KeyM') {
        eng.toggleMute();
        return;
      }

      if (e.code === 'KeyU' && (hud.screenState === 'playing' || hud.screenState === 'paused')) {
        e.preventDefault();
        handleToggleArmory();
        return;
      }

      if (e.code === 'KeyK' && hud.screenState === 'playing') {
        eng.activateSleeperCell();
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (showPlanModal) {
          setShowPlanModal(false);
        } else if (showArmory) {
          setShowArmory(false);
          eng.setPaused(false);
        } else if (hud.nukeTargetingActive && e.code === 'Escape') {
          eng.cancelNukeTargeting();
        } else if (hud.screenState === 'playing') {
          eng.setPaused(true);
        } else if (hud.screenState === 'paused') {
          eng.setPaused(false);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.screenState, hud.nukeTargetingActive, showPlanModal, showArmory, handleStart, handleToggleArmory]);

  return (
    <main className="w-screen h-dvh bg-[#070a0e] overflow-hidden">
      <div
        className="stage-16-9 relative w-full h-full bg-[#070a0e] overflow-hidden"
        data-testid="stage-16-9"
      >
        <div
          ref={mountRef}
          data-testid="game-canvas-mount"
          className="absolute inset-0 w-full h-full"
        />

        {hud.screenState === 'title' && (
          <TitleScreen
            bestScore={hud.bestScore}
            onStart={handleStart}
            onOpenPlan={() => setShowPlanModal(true)}
          />
        )}

        {(hud.screenState === 'playing' || hud.screenState === 'paused') && (
          <GameHud
            hud={hud}
            onSelectWeapon={(w: WeaponType) => engineRef.current?.selectWeapon(w)}
            onSelectSquadOrder={(order: SquadOrder) => engineRef.current?.setSquadOrder(order)}
            onTankOrder={(order: TankOrder, useCrosshair = true) =>
              engineRef.current?.issueTankOrder(order, useCrosshair)
            }
            onCycleTimeOfDay={() => engineRef.current?.cycleTimeOfDay()}
            onCycleWeather={() => engineRef.current?.cycleWeather()}
            onTriggerSupportOp={(op: SupportOpId) => engineRef.current?.triggerSupportOp(op)}
            onToggleMute={() => engineRef.current?.toggleMute()}
            onToggleZoom={() => engineRef.current?.toggleZoom()}
            onOpenUpgrades={handleToggleArmory}
            onPause={() => engineRef.current?.setPaused(true)}
            onVirtualFire={(firing) => engineRef.current?.setVirtualFire(firing)}
            onWalkInput={(x, y) => engineRef.current?.setWalkInput(x, y)}
            onFireSalvo={() => engineRef.current?.fireBatterySalvo()}
            onLaunchJet={(jet: PlayerJetType) => engineRef.current?.launchFighterTakeoff(jet)}
            onReturnGround={() => engineRef.current?.initiateCarrierLanding()}
            onJump={() => engineRef.current?.jump()}
            onToggleTank={() => engineRef.current?.toggleTankMode()}
            onToggleThermal={() => engineRef.current?.toggleThermal()}
            onDeploySmoke={() => engineRef.current?.deployTankSmokeScreen()}
            onLaunchNuke={() => engineRef.current?.launchNuclearStrike()}
            onCancelNukeTargeting={() => engineRef.current?.cancelNukeTargeting()}
            onActivateSleeperCell={() => engineRef.current?.activateSleeperCell()}
            onToggleHqSeat={() => engineRef.current?.toggleHqSeat()}
            onToggleListening={() => engineRef.current?.toggleListening()}
            onNegotiate={(stance) => engineRef.current?.negotiate(stance)}
            onScanSecretSites={() => engineRef.current?.scanSecretSites()}
            onToggleWeaponHolster={() => engineRef.current?.toggleWeaponHolster()}
            onMobilizeReserves={() => engineRef.current?.mobilizeReserves()}
            onToggleConvoy={() => engineRef.current?.toggleConvoyMode()}
            onSetConvoyDriveMode={(mode: ConvoyDriveMode) =>
              engineRef.current?.setConvoyDriveMode(mode)
            }
            onStartDiplomaticConvoy={(dest: NationId | 'home') =>
              engineRef.current?.startDiplomaticConvoy(dest)
            }
            onDeclareWarNation={(id: NationId) => engineRef.current?.declareWarOnNation(id)}
            onMakePeaceNation={(id: NationId) => engineRef.current?.makePeaceWithNation(id)}
            onSetPoetryTrack={(track: number) => engineRef.current?.setPoetryTrack(track)}
            onConvoyHorn={() => engineRef.current?.soundConvoyHorn()}
            onToggleForeignSeat={() => engineRef.current?.toggleForeignPalaceSeat()}
            onTalkForeignPresident={(topic) => engineRef.current?.talkToForeignPresident(topic)}
          />
        )}

        {showArmory && (hud.screenState === 'playing' || hud.screenState === 'paused') && (
          <ArmoryModal
            hud={hud}
            onUpgrade={(slot: UpgradeSlotKey) => engineRef.current?.buyUpgrade(slot)}
            onClose={() => {
              setShowArmory(false);
              engineRef.current?.setPaused(false);
            }}
          />
        )}

        {hud.screenState === 'paused' && !showArmory && !showPlanModal && (
          <PauseModal
            onResume={() => engineRef.current?.setPaused(false)}
            onOpenUpgrades={() => setShowArmory(true)}
            onOpenPlan={() => setShowPlanModal(true)}
            onRestart={handleStart}
            onTitle={() => {
              setShowArmory(false);
              engineRef.current?.returnToTitle();
            }}
          />
        )}

        {showPlanModal && (
          <ProjectPlanModal onClose={() => setShowPlanModal(false)} />
        )}

        <OfflineIndicator />
      </div>
    </main>
  );
}
