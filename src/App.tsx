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
import {
  MAX_BASE_HP,
  MAX_OUTPOST_HP,
  createInitialUpgrades,
  type UpgradeSlotKey,
} from './game/rules';
import type { HudSnapshot, NationFaction, PlayerJetType, WeaponType } from './game/types';

const INITIAL_HUD: HudSnapshot = {
  screenState: 'title',
  nation: 'joint',
  combatMode: 'ground',
  selectedJet: 'f22',
  airSpeedKts: 0,
  airAltitudeM: 0,
  mlrsCooldownPct: 0,
  outpostHpPct: MAX_OUTPOST_HP,
  alliedUnitsAlive: 6,
  enemyGroundAlive: 6,
  commanderLevel: 45,
  wave: 1,
  waveEnemiesRemaining: 0,
  waveBannerTimer: 0,
  baseHp: MAX_BASE_HP,
  maxBaseHp: MAX_BASE_HP,
  credits: 12500,
  score: 0,
  bestScore: 0,
  kills: 0,
  shotsFired: 0,
  shotsHit: 0,
  activeWeapon: 'manpads',
  weaponMag: {
    manpads: 4,
    heavy_aa: 60,
    patriot: 4,
    thaad: 2,
    s400: 4,
    pantsir: 6,
    hq9: 4,
  },
  weaponCooldownPct: {
    manpads: 0,
    heavy_aa: 0,
    patriot: 0,
    thaad: 0,
    s400: 0,
    pantsir: 0,
    hq9: 0,
  },
  isZoomed: false,
  ciwsActiveBurst: false,
  upgrades: createInitialUpgrades(),
  radarAngle: 0,
  stealthWarning: false,
  incomingThreatWarning: false,
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

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (showPlanModal) {
          setShowPlanModal(false);
        } else if (showArmory) {
          setShowArmory(false);
          eng.setPaused(false);
        } else if (hud.screenState === 'playing') {
          eng.setPaused(true);
        } else if (hud.screenState === 'paused') {
          eng.setPaused(false);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.screenState, showPlanModal, showArmory, handleStart, handleToggleArmory]);

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
            selectedNation={hud.nation}
            onSelectNation={(n: NationFaction) => engineRef.current?.setNation(n)}
            onStart={handleStart}
            onOpenPlan={() => setShowPlanModal(true)}
          />
        )}

        {(hud.screenState === 'playing' || hud.screenState === 'paused') && (
          <GameHud
            hud={hud}
            onSelectWeapon={(w: WeaponType) => engineRef.current?.selectWeapon(w)}
            onToggleMute={() => engineRef.current?.toggleMute()}
            onToggleZoom={() => engineRef.current?.toggleZoom()}
            onOpenUpgrades={handleToggleArmory}
            onPause={() => engineRef.current?.setPaused(true)}
            onVirtualFire={(firing) => engineRef.current?.setVirtualFire(firing)}
            onVirtualSlew={(x, y) => engineRef.current?.setVirtualSlew(x, y)}
            onFireSalvo={() => engineRef.current?.fireBatterySalvo()}
            onFireMlrs={() => engineRef.current?.fireMlrsBarrage()}
            onLaunchJet={(jet: PlayerJetType) => engineRef.current?.launchFighterTakeoff(jet)}
            onReturnGround={() => engineRef.current?.returnToGroundDefense()}
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
