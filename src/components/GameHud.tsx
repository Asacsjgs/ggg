import React, { useEffect, useRef, useState } from 'react';
import {
  UNIFIED_FIGHTER_CODE,
  WEAPON_ORDER,
  getWeaponStats,
} from '../game/rules';
import type {
  ConvoyDriveMode,
  HudSnapshot,
  NationId,
  PlayerJetType,
  SquadOrder,
  SupportOpId,
  TankOrder,
  WeaponType,
} from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  onSelectWeapon: (w: WeaponType) => void;
  onSelectSquadOrder: (order: SquadOrder) => void;
  onTankOrder: (order: TankOrder, useCrosshair?: boolean) => void;
  onCycleTimeOfDay: () => void;
  onCycleWeather: () => void;
  onTriggerSupportOp: (op: SupportOpId) => void;
  onToggleMute: () => void;
  onToggleZoom: () => void;
  onOpenUpgrades: () => void;
  onPause: () => void;
  onVirtualFire: (firing: boolean) => void;
  onWalkInput: (x: number, y: number) => void;
  onFireSalvo: () => void;
  onLaunchJet: (jet: PlayerJetType) => void;
  onReturnGround: () => void;
  onJump: () => void;
  onToggleTank: () => void;
  onToggleThermal: () => void;
  onDeploySmoke: () => void;
  onLaunchNuke: () => void;
  onCancelNukeTargeting: () => void;
  onActivateSleeperCell: () => void;
  onToggleHqSeat: () => void;
  onToggleListening: () => void;
  onNegotiate: (stance: 'truce' | 'escalate') => void;
  onScanSecretSites: () => void;
  onToggleWeaponHolster: () => void;
  onMobilizeReserves: () => void;
  onToggleConvoy: () => void;
  onSetConvoyDriveMode: (mode: ConvoyDriveMode) => void;
  onStartDiplomaticConvoy: (dest: NationId | 'home') => void;
  onDeclareWarNation: (id: NationId) => void;
  onMakePeaceNation: (id: NationId) => void;
  onSetPoetryTrack: (track: number) => void;
  onConvoyHorn: () => void;
  onToggleForeignSeat: () => void;
  onTalkForeignPresident: (topic: 'greet' | 'alliance' | 'trade') => void;
}

const MilitaryMissileSvg: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M21 3L15.2 4.8L12.6 7.4L7.5 6.8L5.2 9.1L9.2 11.2L7.3 13.1L4.3 12.6L2.8 14.1L5.8 16.2L7.9 19.2L9.4 17.7L8.9 14.7L10.8 12.8L12.9 16.8L15.2 14.5L14.6 9.4L17.2 6.8L21 3Z" />
  </svg>
);

const SoldierHelmetSvg: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 3a8 8 0 0 0-8 8v3h16v-3a8 8 0 0 0-8-8Zm-6 13v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-2H6Z" />
  </svg>
);

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  onSelectWeapon,
  onSelectSquadOrder,
  onTankOrder,
  onCycleTimeOfDay,
  onCycleWeather,
  onTriggerSupportOp,
  onToggleMute,
  onToggleZoom,
  onOpenUpgrades,
  onPause,
  onVirtualFire,
  onWalkInput,
  onFireSalvo,
  onLaunchJet,
  onReturnGround,
  onJump,
  onToggleTank,
  onToggleThermal,
  onDeploySmoke,
  onLaunchNuke,
  onCancelNukeTargeting,
  onActivateSleeperCell,
  onToggleHqSeat,
  onToggleListening,
  onNegotiate,
  onScanSecretSites,
  onToggleWeaponHolster,
  onMobilizeReserves,
  onToggleConvoy,
  onSetConvoyDriveMode,
  onStartDiplomaticConvoy,
  onDeclareWarNation,
  onMakePeaceNation,
  onSetPoetryTrack,
  onConvoyHorn,
  onToggleForeignSeat,
  onTalkForeignPresident,
}) => {
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stickRef = useRef<HTMLDivElement | null>(null);
  const stickPointerIdRef = useRef<number | null>(null);
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });
  const [showArsenalDrawer, setShowArsenalDrawer] = useState(false);
  const [showOpsDrawer, setShowOpsDrawer] = useState(false);
  const [showNationsDrawer, setShowNationsDrawer] = useState(false);

  // Compact Top-Right Tactical Radar Scope
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const rMax = cx - 3;

    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(12, 20, 28, 0.58)';
    ctx.beginPath();
    ctx.arc(cx, cy, rMax, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, rMax, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, rMax * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - rMax, cy);
    ctx.lineTo(cx + rMax, cy);
    ctx.moveTo(cx, cy - rMax);
    ctx.lineTo(cx, cy + rMax);
    ctx.stroke();

    const sweepAngle = hud.radarAngle - Math.PI / 2;
    ctx.fillStyle = 'rgba(74, 222, 128, 0.24)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, rMax, sweepAngle - 0.55, sweepAngle);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(134, 239, 172, 0.85)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * rMax, cy + Math.sin(sweepAngle) * rMax);
    ctx.stroke();

    for (const blip of hud.radarBlips) {
      if (blip.detectedStrength < 0.12) continue;
      const bx = cx + blip.x * (rMax - 7);
      const by = cy + blip.z * (rMax - 7);

      ctx.globalAlpha = Math.min(1, Math.max(0.4, blip.detectedStrength));
      if (blip.kind === 'embassy' || blip.kind === 'nation') {
        ctx.fillStyle = blip.atWar ? '#ef4444' : blip.kind === 'nation' ? '#fbbf24' : '#38bdf8';
        ctx.fillRect(bx - 2.5, by - 2.5, 5, 5);
      } else if (blip.kind === 'secret') {
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(bx, by - 3.6);
        ctx.lineTo(bx + 3.6, by);
        ctx.lineTo(bx, by + 3.6);
        ctx.lineTo(bx - 3.6, by);
        ctx.closePath();
        ctx.fill();
      } else if (blip.kind === 'naval') {
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(bx - 3, by - 2, 6, 4);
      } else if (blip.kind === 'armor') {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(bx - 2.5, by - 2.5, 5, 5);
      } else {
        ctx.fillStyle = blip.kind === 'soldier' ? '#fb923c' : '#ef4444';
        ctx.beginPath();
        ctx.arc(bx, by, blip.kind === 'soldier' ? 2.0 : 2.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }, [hud.radarAngle, hud.radarBlips]);

  const handleStickMove = (clientX: number, clientY: number) => {
    const el = stickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.36;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setStickOffset({ x: dx, y: dy });
    onWalkInput(dx / maxR, -dy / maxR);
  };

  const resetStick = (pointerId?: number) => {
    if (pointerId !== undefined && stickPointerIdRef.current !== pointerId) return;
    stickPointerIdRef.current = null;
    setStickOffset({ x: 0, y: 0 });
    onWalkInput(0, 0);
  };

  const hpPct = Math.max(15, Math.min(100, (hud.baseHp / hud.maxBaseHp) * 100));
  const activeStats = getWeaponStats(hud.activeWeapon, hud.upgrades);
  const locked = hud.lockedTarget;
  const lockPct = locked ? Math.round(locked.lockProgress * 100) : 0;

  const cycleNextWeapon = () => {
    const idx = WEAPON_ORDER.indexOf(hud.activeWeapon);
    onSelectWeapon(WEAPON_ORDER[(idx + 1) % WEAPON_ORDER.length]);
  };

  const squadButtons: Array<{ id: SquadOrder; label: string }> = [
    { id: 'follow', label: 'اتبعني' },
    { id: 'advance', label: 'تقدّم' },
    { id: 'attack', label: 'هاجم' },
  ];

  const tankCommandButtons: Array<{
    id: TankOrder;
    label: string;
    dataAttr: Record<string, string>;
    activeCls: string;
  }> = [
    {
      id: 'hold',
      label: 'تثبيت',
      dataAttr: { 'data-tank-order-hold': 'true' },
      activeCls: 'bg-amber-400 border-amber-200 text-slate-950',
    },
    {
      id: 'move',
      label: 'تحرك',
      dataAttr: { 'data-tank-order-move': 'true' },
      activeCls: 'bg-sky-400 border-sky-200 text-slate-950',
    },
    {
      id: 'strike',
      label: 'قصف',
      dataAttr: { 'data-tank-order-strike': 'true' },
      activeCls: 'bg-red-500 border-red-200 text-white',
    },
  ];

  const opsItems: Array<{ id: SupportOpId; label: string }> = [
    { id: 'desert_tunnels', label: 'أنفاق 2km' },
    { id: 'joint_strike', label: 'عملية مشتركة' },
    { id: 'reinforce_50', label: 'دعم 50 جندي' },
    { id: 'swarm_drones', label: 'سرب مسيّرات' },
    { id: 'paratroopers', label: 'إنزال مظلي' },
    { id: 'artillery_barrage', label: 'قصف مدفعي' },
    { id: 'ew_jam', label: 'تشويش رادار' },
    { id: 'naval_barrage', label: 'قصف بحري' },
  ];

  const activePresidentInfo = hud.activePresidentNation
    ? hud.nations.find((n) => n.id === hud.activePresidentNation) ?? null
    : null;
  const activeForeignNationId = hud.foreignSeatedNation ?? hud.nearForeignChair ?? hud.insideForeignPalace;
  const activeForeignNation = activeForeignNationId
    ? hud.nations.find((n) => n.id === activeForeignNationId) ?? null
    : null;

  return (
    <div
      dir="ltr"
      className="hud-scale-layer pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-2 sm:p-3.5"
    >
      {/* Thermal FLIR Visor Rim */}
      {hud.thermalActive && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 border-2 sm:border-4 border-emerald-400/45 shadow-[inset_0_0_70px_rgba(16,185,129,0.22)]"
        />
      )}

      {/* Optical ADS Zoom Vignette */}
      {hud.isZoomed && (hud.combatMode === 'ground' || hud.combatMode === 'tank') && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 border-[12px] sm:border-[24px] border-black/38 shadow-[inset_0_0_80px_rgba(0,0,0,0.65)]"
        />
      )}

      {/* TOP ROW — Clean Counters (Top-Left) + Radar & Icon Controls (Top-Right) */}
      <div className="relative z-10 flex items-start justify-between gap-2 w-full">
        {/* TOP-LEFT: Base HP%, Kills, Credits $, Allied Soldiers Count */}
        <div className="flex items-start gap-1.5 sm:gap-2">
          <div className="hud-top-destroyed flex flex-col bg-[rgba(15,23,36,0.58)] border border-white/15 px-2 py-1 text-white min-w-[82px] sm:min-w-[112px]">
            <div className="flex items-center justify-between gap-2 text-[9.5px] sm:text-xs font-extrabold">
              <span className="font-mono-tactical text-emerald-300">{Math.round(hpPct)}% HP</span>
              <span className="font-mono-tactical text-white">{hud.kills} K</span>
            </div>
            <div className="w-full h-1 bg-black/45 mt-1 overflow-hidden">
              <div className="h-full bg-[#4ade80]" style={{ width: `${hpPct}%` }} />
            </div>
          </div>

          <div className="hud-credits-pill flex items-center gap-1.5 bg-[rgba(15,23,36,0.58)] border border-white/15 px-2 py-1 text-white self-start">
            <span className="w-4 h-4 sm:w-5 sm:h-5 bg-[#22c55e] text-slate-950 font-mono-tactical font-black text-xs sm:text-sm flex items-center justify-center leading-none">
              $
            </span>
            <span className="font-mono-tactical text-xs sm:text-sm font-extrabold tabular-nums">
              {hud.credits}
            </span>
          </div>

          <div
            data-testid="allied-soldier-count"
            className="flex items-center gap-1 bg-[rgba(15,23,36,0.58)] border border-white/15 px-2 py-1 text-emerald-300 self-start"
            aria-label={`الجنود الحلفاء ${hud.alliedSoldiersAlive}`}
          >
            <SoldierHelmetSvg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
            <span className="font-mono-tactical text-xs sm:text-sm font-extrabold tabular-nums text-white">
              {hud.alliedSoldiersAlive}
            </span>
          </div>

          {hud.warDeclared && hud.enemySoldiersAlive > 0 && (
            <div
              data-testid="enemy-soldier-count"
              className="flex items-center gap-1 bg-[rgba(45,12,16,0.72)] border border-red-400/45 px-2 py-1 text-red-400 self-start"
              aria-label={`جنود العدو ${hud.enemySoldiersAlive}`}
            >
              <SoldierHelmetSvg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
              <span className="font-mono-tactical text-xs sm:text-sm font-extrabold tabular-nums text-red-100">
                {hud.enemySoldiersAlive}
              </span>
            </div>
          )}

          {hud.combatMode === 'ground' && hud.playerAltitudeM >= 1 && (
            <div
              data-testid="player-altitude"
              className="bg-[rgba(15,23,36,0.68)] border border-amber-400/50 px-2 py-1 text-[9px] sm:text-[11px] font-mono-tactical font-bold text-amber-300 whitespace-nowrap"
            >
              +{hud.playerAltitudeM}m
            </div>
          )}

          {hud.hqIntegrityPct < 100 && (
            <div
              data-testid="hq-integrity-badge"
              className={`px-2 py-1 text-[9px] sm:text-[11px] font-mono-tactical font-bold whitespace-nowrap border ${
                hud.hqIntegrityPct < 45
                  ? 'bg-[rgba(65,12,16,0.78)] border-red-400/70 text-red-200'
                  : 'bg-[rgba(15,23,36,0.72)] border-amber-400/55 text-amber-200'
              }`}
            >
              HQ {hud.hqIntegrityPct}%
            </div>
          )}

          {hud.combatMode === 'tank' && (
            <div
              data-testid="tank-armor-badge"
              className="bg-[rgba(15,23,36,0.72)] border border-emerald-400/55 px-2 py-1 text-[9px] sm:text-[11px] font-mono-tactical font-bold text-emerald-300 whitespace-nowrap"
            >
              M1A2 · {Math.max(0, Math.round((hud.tankHp / Math.max(1, hud.maxTankHp)) * 100))}%
            </div>
          )}

          {hud.combatMode === 'convoy' && (
            <div
              data-testid="convoy-speed-badge"
              className="bg-[rgba(15,23,36,0.78)] border border-amber-400/65 px-2 py-1 text-[9px] sm:text-[11px] font-mono-tactical font-bold text-amber-200 whitespace-nowrap"
            >
              {hud.convoySpeedKmh} KM/H · {hud.convoyDriveMode === 'chauffeur' ? 'سائق' : 'يدوي'}
            </div>
          )}

          {activePresidentInfo && (
            <div
              data-testid="president-welcome-badge"
              dir="rtl"
              className="bg-[rgba(18,32,20,0.86)] border border-amber-300/80 px-2 py-1 text-[9px] sm:text-[11px] font-black text-amber-200 whitespace-nowrap"
            >
              استقبال {activePresidentInfo.nameAr}
            </div>
          )}

          {(hud.combatMode === 'air' || hud.combatMode === 'takeoff' || hud.combatMode === 'landing') && (
            <div
              data-testid="air-telemetry-badge"
              className="bg-[rgba(15,23,36,0.68)] border border-sky-400/50 px-2 py-1 text-[9px] sm:text-[11px] font-mono-tactical font-bold text-sky-200 whitespace-nowrap"
            >
              {UNIFIED_FIGHTER_CODE} · {hud.airSpeedKts} KTS · {hud.airAltitudeM}m
            </div>
          )}
        </div>

        {/* TOP-RIGHT: Radar + Compact Circular Controls */}
        <div data-hud-interactive="true" className="pointer-events-auto flex items-start gap-1.5 sm:gap-2">
          <div className="hud-radar-box rounded-full bg-black/25 p-0.5 border border-white/20">
            <canvas
              ref={radarCanvasRef}
              width={96}
              height={96}
              className="hud-radar-canvas w-11 h-11 sm:w-16 sm:h-16 block rounded-full"
              aria-label="الرادار التكتيكي"
            />
          </div>

          {/* Column 1: Time of Day [T] + Weather [Y] */}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              tabIndex={-1}
              aria-label="تبديل الوقت نهار غروب ليل [T]"
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleTimeOfDay();
              }}
              className={`hud-mini-circle w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center cursor-pointer transition-colors ${
                hud.timeOfDay === 'night'
                  ? 'bg-indigo-500/75 border-indigo-200 text-white'
                  : hud.timeOfDay === 'sunset'
                  ? 'bg-orange-500/75 border-amber-200 text-white'
                  : 'bg-[rgba(12,18,28,0.48)] hover:bg-white/25 border-white/60 text-amber-300'
              }`}
            >
              {hud.timeOfDay === 'night' ? (
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="تبديل الطقس صحو ضباب مطر عاصفة [Y]"
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleWeather();
              }}
              className={`hud-mini-circle w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center cursor-pointer transition-colors ${
                hud.weather !== 'clear'
                  ? 'bg-sky-500/75 border-sky-200 text-white'
                  : 'bg-[rgba(12,18,28,0.48)] hover:bg-white/25 border-white/60 text-white'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.5 19H7a4 4 0 0 1-.8-7.92A5.5 5.5 0 0 1 16.8 9.2 3.5 3.5 0 0 1 17.5 19z" />
                {(hud.weather === 'rain' || hud.weather === 'storm') && (
                  <path d="M9 21l-1 2M13 21l-1 2M17 21l-1 2" />
                )}
              </svg>
            </button>
          </div>

          {/* Column 2: Zoom [Z] + Thermal FLIR [X] */}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              tabIndex={-1}
              aria-label="تقريب المنظار [Z]"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleZoom();
              }}
              className={`hud-mini-circle w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center cursor-pointer transition-colors ${
                hud.isZoomed
                  ? 'bg-amber-400/85 border-amber-200 text-slate-950'
                  : 'bg-[rgba(12,18,28,0.48)] hover:bg-white/25 border-white/60 text-white'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="6" />
                <line x1="16" y1="16" x2="21" y2="21" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              data-thermal-trigger="true"
              aria-label="الرؤية الحرارية [X]"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleThermal();
              }}
              className={`hud-mini-circle w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center cursor-pointer transition-colors ${
                hud.thermalActive
                  ? 'bg-emerald-400/90 border-emerald-100 text-slate-950'
                  : 'bg-[rgba(12,18,28,0.48)] hover:bg-white/25 border-white/60 text-emerald-300'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            </button>
          </div>

          {/* Column 3: Mute [M] + Armory [U] */}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              tabIndex={-1}
              aria-label={hud.muted ? 'تشغيل الصوت [M]' : 'كتم الصوت [M]'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="hud-mini-circle w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[rgba(12,18,28,0.48)] hover:bg-white/25 border border-white/60 flex items-center justify-center text-white cursor-pointer"
            >
              {hud.muted ? (
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="22" y1="9" x2="16" y2="15" />
                  <line x1="16" y1="9" x2="22" y2="15" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="مركز التطوير [U]"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenUpgrades();
              }}
              className="hud-mini-circle relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[rgba(12,18,28,0.48)] hover:bg-white/25 border border-white/60 flex items-center justify-center text-white cursor-pointer"
            >
              <svg viewBox="0 0 28 28" className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                <polygon points="14,5 24,21 4,21" fill="rgba(255,255,255,0.2)" />
                <path d="M14 5 L14 21" />
              </svg>
              <span className="absolute top-0 left-0.5 w-1.5 h-1.5 rounded-full bg-amber-300" />
            </button>
          </div>

          {/* Column 4: Pause [P] */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="إيقاف مؤقت [P]"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="hud-top-circle w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[rgba(12,18,28,0.48)] hover:bg-white/25 border-2 border-white/70 flex items-center justify-center text-white cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor">
              <rect x="6.5" y="5" width="3.5" height="14" rx="1" />
              <rect x="14" y="5" width="3.5" height="14" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* LOCKED TARGET BRACKET (Reticle bracket only) */}
      {locked && locked.onScreen && (
        <div
          className="hud-skylock-box pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          style={{
            left: `${(locked.screenX * 100).toFixed(1)}%`,
            top: `${(locked.screenY * 100).toFixed(1)}%`,
          }}
        >
          <div className="relative w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center">
            <span className={`absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 ${locked.isLocked ? 'border-red-400' : 'border-amber-300'}`} />
            <span className={`absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 ${locked.isLocked ? 'border-red-400' : 'border-amber-300'}`} />
            <span className={`absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 ${locked.isLocked ? 'border-red-400' : 'border-amber-300'}`} />
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 ${locked.isLocked ? 'border-red-400' : 'border-amber-300'}`} />
            <span className={`font-mono-tactical text-[8px] sm:text-[9px] font-black px-1 bg-black/50 ${locked.isLocked ? 'text-red-400' : 'text-amber-300'}`}>
              {locked.isLocked ? 'LOCK' : `${lockPct}%`}
            </span>
          </div>
          <div className="mt-0.5 px-1.5 py-0.5 bg-black/55 whitespace-nowrap flex flex-col items-center gap-0.5">
            <span className="font-mono-tactical text-[8px] sm:text-[9px] font-bold text-white">
              {locked.codeName} · {locked.distance}m
            </span>
          </div>
        </div>
      )}

      {/* CENTER CROSSHAIR (Shifts cleanly to Nuke Target Reticle when nukeTargetingActive) */}
      <div
        className="hud-center-sight pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" className="hud-reticle-svg w-10 h-10 sm:w-13 sm:h-13">
          <circle
            cx="32"
            cy="32"
            r="22"
            fill="none"
            stroke={hud.nukeTargetingActive ? '#f59e0b' : 'rgba(255,255,255,0.78)'}
            strokeWidth={hud.nukeTargetingActive ? '2.4' : '1.8'}
            strokeDasharray={hud.nukeTargetingActive ? '6 4' : undefined}
          />
          <circle
            cx="32"
            cy="32"
            r="2.4"
            fill={hud.nukeTargetingActive ? '#ef4444' : locked?.isLocked ? '#ef4444' : '#4ade80'}
          />
          <line x1="32" y1="4" x2="32" y2="14" stroke={hud.nukeTargetingActive ? '#fbbf24' : 'rgba(255,255,255,0.8)'} strokeWidth="1.6" />
          <line x1="32" y1="50" x2="32" y2="60" stroke={hud.nukeTargetingActive ? '#fbbf24' : 'rgba(255,255,255,0.8)'} strokeWidth="1.6" />
          <line x1="4" y1="32" x2="14" y2="32" stroke={hud.nukeTargetingActive ? '#fbbf24' : 'rgba(255,255,255,0.8)'} strokeWidth="1.6" />
          <line x1="50" y1="32" x2="60" y2="32" stroke={hud.nukeTargetingActive ? '#fbbf24' : 'rgba(255,255,255,0.8)'} strokeWidth="1.6" />
          {locked && !hud.nukeTargetingActive && (
            <circle
              cx="32"
              cy="32"
              r="22"
              fill="none"
              stroke={locked.isLocked ? '#ef4444' : '#facc15'}
              strokeWidth="2.4"
              strokeDasharray="138"
              strokeDashoffset={138 * (1 - locked.lockProgress)}
            />
          )}
        </svg>
      </div>

      {/* BOTTOM ROW — Bottom-Left Walk Stick & Squad Orders + Bottom-Right Tactical Ops, Nuke, Tank, Jets, Jump & Fire */}
      <div className="relative z-10 flex items-end justify-between w-full gap-2">
        {/* BOTTOM-LEFT: Multi-Touch Safe Walk Thumbstick + 3 Compact Squad Orders */}
        <div data-hud-interactive="true" className="pointer-events-auto flex items-end gap-2 sm:gap-2.5">
          <div
            ref={stickRef}
            aria-label="عصا الحركة"
            onPointerDown={(e) => {
              e.stopPropagation();
              stickPointerIdRef.current = e.pointerId;
              e.currentTarget.setPointerCapture(e.pointerId);
              handleStickMove(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (stickPointerIdRef.current !== e.pointerId) return;
              handleStickMove(e.clientX, e.clientY);
            }}
            onPointerUp={(e) => resetStick(e.pointerId)}
            onPointerCancel={(e) => resetStick(e.pointerId)}
            className="touch-none relative w-16 h-16 sm:w-22 sm:h-22 rounded-full bg-white/10 border-2 border-white/45 flex items-center justify-center cursor-pointer"
          >
            <div
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/65 border border-white shadow-md pointer-events-none"
              style={{
                transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)`,
              }}
            />
          </div>

          {hud.combatMode === 'ground' && (
            <div dir="rtl" className="flex flex-col gap-1 mb-0.5">
              {squadButtons.map((btn) => {
                const active = hud.squadOrder === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onSelectSquadOrder(btn.id);
                    }}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-black border cursor-pointer transition-colors ${
                      active
                        ? 'bg-emerald-400 border-emerald-200 text-slate-950'
                        : 'bg-black/50 border-white/35 text-white hover:bg-white/20'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          )}

          {(hud.combatMode === 'ground' || hud.combatMode === 'tank') && (
            <div dir="rtl" className="flex flex-col gap-1 mb-0.5">
              {tankCommandButtons.map((btn) => {
                const active = hud.tankOrder === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    tabIndex={-1}
                    {...btn.dataAttr}
                    aria-label={`أمر الدبابات ${btn.label}`}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onTankOrder(btn.id, btn.id !== 'hold');
                    }}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-black border cursor-pointer transition-colors ${
                      active
                        ? btn.activeCls
                        : 'bg-black/50 border-amber-300/40 text-amber-100 hover:bg-white/20'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* BOTTOM-RIGHT: Clean Two-Row Tactical Cluster (Ops/Nuke/Tank/Jets + Weapons/Jump/Fire) */}
        <div data-hud-interactive="true" className="pointer-events-auto flex flex-col items-end gap-1">
          {/* Contextual HQ & Intelligence Room Bar */}
          {hud.combatMode === 'ground' &&
            (hud.insideEmbassy || hud.nearIntelConsole || hud.nearHqDesk || hud.hqSeated) && (
              <div dir="rtl" className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
                {(hud.nearHqDesk || hud.hqSeated) && (
                  <button
                    type="button"
                    tabIndex={-1}
                    data-hq-seat="true"
                    aria-label={hud.hqSeated ? 'القيام من كرسي القيادة [C]' : 'الجلوس على كرسي القيادة [C]'}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onToggleHqSeat();
                    }}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border text-[9px] sm:text-[11px] font-black cursor-pointer transition-colors whitespace-nowrap ${
                      hud.hqSeated
                        ? 'bg-amber-400 border-amber-100 text-slate-950'
                        : 'bg-amber-900/85 hover:bg-amber-700 border-amber-300/75 text-amber-100'
                    }`}
                  >
                    {hud.hqSeated ? 'قيام [C]' : 'كرسي [C]'}
                  </button>
                )}

                <button
                  type="button"
                  tabIndex={-1}
                  data-listen-trigger="true"
                  aria-label="التنصّت والاستماع الاستخباراتي"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleListening();
                  }}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border text-[9px] sm:text-[11px] font-black cursor-pointer transition-colors whitespace-nowrap ${
                    hud.listeningActive
                      ? 'bg-emerald-400 border-emerald-100 text-slate-950'
                      : 'bg-[rgba(12,24,38,0.85)] hover:bg-emerald-800/80 border-emerald-300/60 text-emerald-100'
                  }`}
                >
                  تنصّت
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-truce-trigger="true"
                  aria-label="تفاوض وهدنة مؤقتة"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onNegotiate('truce');
                  }}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border text-[9px] sm:text-[11px] font-black cursor-pointer transition-colors whitespace-nowrap ${
                    hud.truceActive
                      ? 'bg-sky-400 border-sky-100 text-slate-950'
                      : 'bg-[rgba(12,24,38,0.85)] hover:bg-sky-700/80 border-sky-300/60 text-sky-100'
                  }`}
                >
                  {hud.truceActive ? `هدنة ${hud.truceRemainingSec}s` : 'هدنة'}
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-escalate-trigger="true"
                  aria-label="تصعيد ورفع المعنويات"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onNegotiate('escalate');
                  }}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border bg-rose-900/85 hover:bg-rose-700 border-rose-300/70 text-rose-100 text-[9px] sm:text-[11px] font-black cursor-pointer transition-colors whitespace-nowrap"
                >
                  تصعيد
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-scan-secret="true"
                  aria-label="رصد المواقع السرية"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onScanSecretSites();
                  }}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border bg-indigo-900/85 hover:bg-indigo-700 border-indigo-300/70 text-indigo-100 text-[9px] sm:text-[11px] font-black cursor-pointer transition-colors whitespace-nowrap"
                >
                  رصد سري {hud.secretSitesRevealed}/{hud.secretSitesTotal}
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-joint-strike="true"
                  disabled={hud.supportCooldownPct.joint_strike > 0}
                  aria-label="قصف مشترك على المواقع السرية"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onTriggerSupportOp('joint_strike');
                  }}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border text-[9px] sm:text-[11px] font-black cursor-pointer transition-colors whitespace-nowrap ${
                    hud.supportCooldownPct.joint_strike <= 0
                      ? 'bg-amber-600/90 hover:bg-amber-500 border-amber-200 text-white'
                      : 'bg-black/55 border-white/25 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  قصف مشترك
                </button>
              </div>
            )}

          {/* Contextual Foreign Presidential Palace Guest Chair & Diplomacy Bar */}
          {hud.combatMode === 'ground' && (hud.nearForeignChair !== null || hud.foreignSeatedNation !== null) && (
            <div dir="rtl" className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
              <button
                type="button"
                tabIndex={-1}
                data-foreign-seat="true"
                aria-label={hud.foreignSeatedNation ? 'القيام من كرسي الضيف [C]' : 'الجلوس أمام الرئيس [C]'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleForeignSeat();
                }}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border text-[9px] sm:text-[11px] font-black cursor-pointer transition-colors whitespace-nowrap ${
                  hud.foreignSeatedNation
                    ? 'bg-amber-400 border-amber-100 text-slate-950'
                    : 'bg-amber-900/85 hover:bg-amber-700 border-amber-300/75 text-amber-100'
                }`}
              >
                {hud.foreignSeatedNation ? 'قيام [C]' : 'جلوس [C]'}
              </button>

              {hud.foreignSeatedNation && activeForeignNation && !activeForeignNation.atWar && (
                <>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-foreign-talk="greet"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onTalkForeignPresident('greet');
                    }}
                    className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border bg-[rgba(12,24,38,0.88)] hover:bg-sky-700/85 border-sky-300/65 text-sky-100 text-[9px] sm:text-[11px] font-black cursor-pointer transition-colors whitespace-nowrap"
                  >
                    حديث
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-foreign-talk="alliance"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onTalkForeignPresident('alliance');
                    }}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border text-[9px] sm:text-[11px] font-black cursor-pointer transition-colors whitespace-nowrap ${
                      activeForeignNation.allied
                        ? 'bg-emerald-400 border-emerald-100 text-slate-950'
                        : 'bg-emerald-800/85 hover:bg-emerald-700 border-emerald-300/70 text-emerald-100'
                    }`}
                  >
                    {activeForeignNation.allied ? 'حليف ✓' : 'تحالف'}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-foreign-talk="trade"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onTalkForeignPresident('trade');
                    }}
                    className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border bg-amber-700/85 hover:bg-amber-600 border-amber-300/70 text-amber-100 text-[9px] sm:text-[11px] font-black cursor-pointer transition-colors whitespace-nowrap"
                  >
                    اتفاق
                  </button>
                </>
              )}
            </div>
          )}

            {/* Contextual Convoy Mode Bar (3 Humvees + 5 Tahoes) */}
            {hud.combatMode === 'convoy' && (
              <div dir="rtl" className="flex items-center gap-1 flex-wrap justify-end">
                <button
                  type="button"
                  tabIndex={-1}
                  data-convoy-trigger="true"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleConvoy();
                  }}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border bg-amber-500 hover:bg-amber-400 border-amber-200 text-slate-950 text-[9px] sm:text-[11px] font-black cursor-pointer whitespace-nowrap"
                >
                  ترجّل [C]
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  data-convoy-drive-mode="true"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSetConvoyDriveMode(hud.convoyDriveMode === 'chauffeur' ? 'manual' : 'chauffeur');
                  }}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border text-[9px] sm:text-[11px] font-black cursor-pointer whitespace-nowrap ${
                    hud.convoyDriveMode === 'chauffeur'
                      ? 'bg-emerald-400 border-emerald-100 text-slate-950'
                      : 'bg-slate-800/85 border-white/45 text-white'
                  }`}
                >
                  {hud.convoyDriveMode === 'chauffeur' ? 'سائق آلي' : 'قيادة يدوية'}
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  data-poetry-trigger="true"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSetPoetryTrack((hud.poetryTrackIndex + 1) % 5);
                  }}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border text-[9px] sm:text-[11px] font-black cursor-pointer whitespace-nowrap ${
                    hud.poetryTrackIndex > 0
                      ? 'bg-amber-400 border-amber-100 text-slate-950'
                      : 'bg-slate-800/85 border-amber-300/60 text-amber-200'
                  }`}
                >
                  {hud.poetryTrackIndex > 0 ? `قصيدة ${hud.poetryTrackIndex}` : 'قصيدة'}
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  data-convoy-horn="true"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onConvoyHorn();
                  }}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border bg-slate-800/85 hover:bg-slate-700 border-white/45 text-white text-[9px] sm:text-[11px] font-black cursor-pointer whitespace-nowrap"
                >
                  بوق
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  data-convoy-home="true"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onStartDiplomaticConvoy('home');
                  }}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border bg-sky-700/85 hover:bg-sky-600 border-sky-300/60 text-white text-[9px] sm:text-[11px] font-black cursor-pointer whitespace-nowrap"
                >
                  المقر
                </button>
              </div>
            )}

          {/* Sub-Row 1: Nuke Target/Confirm, Sleeper Cell, Reserves, Nations, Ops, Tank, Runway */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Interactive Nuclear Strike Button (Step 1: Select Ground Point, Step 2: Launch ICBM) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                tabIndex={-1}
                data-nuke-trigger="true"
                disabled={!hud.nukeReady && !hud.nukeTargetingActive}
                aria-label={hud.nukeTargetingActive ? 'تأكيد الضربة النووية [N]' : 'تحديد مكان القنبلة النووية [N]'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onLaunchNuke();
                }}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border text-[9px] sm:text-[11px] font-black cursor-pointer transition-all whitespace-nowrap ${
                  hud.nukeTargetingActive
                    ? 'bg-amber-400 hover:bg-amber-300 border-red-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.9)]'
                    : hud.nukeReady
                    ? 'bg-red-700/85 hover:bg-red-600 border-amber-300/80 text-white'
                    : 'bg-black/55 border-white/25 text-slate-400 cursor-not-allowed'
                }`}
              >
                {hud.nukeTargetingActive ? 'تأكيد نووي' : 'نووي'}
              </button>
              {hud.nukeTargetingActive && (
                <button
                  type="button"
                  tabIndex={-1}
                  data-nuke-cancel="true"
                  aria-label="إلغاء التحديد النووي"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onCancelNukeTargeting();
                  }}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-black/75 border border-white/40 text-white text-[10px] font-black flex items-center justify-center cursor-pointer hover:bg-red-600"
                >
                  ×
                </button>
              )}
            </div>

            {/* Sleeper Cell Covert Strike */}
            <button
              type="button"
              tabIndex={-1}
              data-sleeper-trigger="true"
              disabled={!hud.sleeperReady}
              aria-label="تفعيل الخلية النائمة [K]"
              onClick={(e) => {
                e.currentTarget.blur();
                onActivateSleeperCell();
              }}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border text-[9px] sm:text-[11px] font-black cursor-pointer transition-colors whitespace-nowrap ${
                hud.sleeperReady
                  ? 'bg-rose-900/85 hover:bg-rose-700 border-rose-300/75 text-white'
                  : 'bg-black/55 border-white/25 text-slate-400 cursor-not-allowed'
              }`}
            >
              الخلية النائمة
            </button>

            {/* Quick Desert Reserve Mobilization */}
            <button
              type="button"
              tabIndex={-1}
              data-reserves-trigger="true"
              aria-label="تعبئة قوات الاحتياط"
              onClick={(e) => {
                e.currentTarget.blur();
                onMobilizeReserves();
              }}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border text-[9px] sm:text-[11px] font-black cursor-pointer transition-colors whitespace-nowrap ${
                hud.reservesMobilized
                  ? 'bg-emerald-500 border-emerald-200 text-slate-950'
                  : 'bg-emerald-800/85 hover:bg-emerald-600 border-emerald-300/75 text-white'
              }`}
            >
              احتياط
            </button>

            {/* 13 Nations Diplomacy & Convoy Drawer */}
            <div className="relative">
              <button
                type="button"
                tabIndex={-1}
                data-nations-trigger="true"
                aria-label="الدول والدبلوماسية والمواكب"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShowNationsDrawer((v) => !v);
                  setShowOpsDrawer(false);
                  setShowArsenalDrawer(false);
                }}
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-[rgba(15,23,42,0.78)] hover:bg-amber-500/85 border border-amber-300/70 text-amber-200 text-[9px] sm:text-[11px] font-extrabold cursor-pointer whitespace-nowrap"
              >
                الدول ▾
              </button>

              {showNationsDrawer && (
                <div
                  dir="rtl"
                  className="absolute bottom-full right-0 mb-1.5 bg-[rgba(10,16,26,0.96)] border border-amber-400/65 p-1.5 flex flex-col gap-1 w-[212px] sm:w-[244px] max-h-[210px] overflow-y-auto shadow-2xl z-40"
                >
                  {hud.nations.map((nation) => (
                    <div
                      key={nation.id}
                      data-nation-row={nation.id}
                      className="flex items-center justify-between gap-1 bg-slate-900/90 border border-slate-700/80 px-1.5 py-1 text-[9.5px] sm:text-[11px]"
                    >
                      <span className="font-black text-white truncate flex items-center gap-1">
                        <span>{nation.code} · {nation.nameAr}</span>
                        {nation.allied && !nation.atWar && (
                          <span className="px-1 bg-emerald-500/25 border border-emerald-300/60 text-emerald-200 text-[8px] font-black">
                            حليف
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {!nation.atWar ? (
                          <>
                            <button
                              type="button"
                              tabIndex={-1}
                              data-nation-convoy={nation.id}
                              onClick={(e) => {
                                e.currentTarget.blur();
                                onStartDiplomaticConvoy(nation.id);
                                setShowNationsDrawer(false);
                              }}
                              className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9px] cursor-pointer"
                            >
                              موكب
                            </button>
                            <button
                              type="button"
                              tabIndex={-1}
                              data-nation-war={nation.id}
                              onClick={(e) => {
                                e.currentTarget.blur();
                                onDeclareWarNation(nation.id);
                              }}
                              className="px-1.5 py-0.5 bg-red-700 hover:bg-red-600 text-white font-black text-[9px] cursor-pointer"
                            >
                              حرب
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            tabIndex={-1}
                            data-nation-peace={nation.id}
                            onClick={(e) => {
                              e.currentTarget.blur();
                              onMakePeaceNation(nation.id);
                            }}
                            className="px-1.5 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[9px] cursor-pointer"
                          >
                            سلام
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tactical Ops Drawer */}
            <div className="relative">
              <button
                type="button"
                tabIndex={-1}
                data-ops-trigger="true"
                aria-label="قائمة الدعم التكتيكي"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShowOpsDrawer((v) => !v);
                  setShowArsenalDrawer(false);
                  setShowNationsDrawer(false);
                }}
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-[rgba(15,23,42,0.75)] hover:bg-emerald-500/80 border border-emerald-300/65 text-white text-[9px] sm:text-[11px] font-extrabold cursor-pointer whitespace-nowrap"
              >
                دعم ▾
              </button>

              {showOpsDrawer && (
                <div
                  dir="rtl"
                  className="absolute bottom-full right-0 mb-1.5 bg-[rgba(10,16,26,0.95)] border border-emerald-400/60 p-1.5 flex flex-col gap-1 w-[142px] sm:w-[168px] max-h-[210px] overflow-y-auto shadow-2xl z-30"
                >
                  {opsItems.map((op) => {
                    const pct = hud.supportCooldownPct[op.id];
                    const ready = pct <= 0;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        tabIndex={-1}
                        data-op-id={op.id}
                        disabled={!ready}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          onTriggerSupportOp(op.id);
                          setShowOpsDrawer(false);
                        }}
                        className={`px-2 py-1 text-right text-[9.5px] sm:text-xs font-extrabold border flex items-center justify-between gap-1.5 ${
                          ready
                            ? 'bg-slate-800/90 hover:bg-emerald-500 hover:text-slate-950 text-white border-slate-600 cursor-pointer'
                            : 'bg-slate-900/75 text-slate-500 border-slate-800 cursor-not-allowed'
                        }`}
                      >
                        <span>{op.label}</span>
                        {op.id === 'reinforce_50' ? (
                          <SoldierHelmetSvg className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <MilitaryMissileSvg className="w-3.5 h-3.5 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drivable Battle Tank Toggle [B] + Tank Smoke [Q] */}
            <button
              type="button"
              tabIndex={-1}
              data-tank-trigger="true"
              aria-label={hud.combatMode === 'tank' ? 'ترجّل من الدبابة [B]' : 'قيادة الدبابة [B]'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleTank();
              }}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border text-[9px] sm:text-[11px] font-black cursor-pointer transition-colors whitespace-nowrap ${
                hud.combatMode === 'tank'
                  ? 'bg-emerald-500 hover:bg-emerald-400 border-emerald-200 text-slate-950'
                  : 'bg-[rgba(15,23,42,0.75)] hover:bg-emerald-600/80 border-emerald-300/65 text-white'
              }`}
            >
              {hud.combatMode === 'tank' ? 'ترجّل' : 'دبابة'}
            </button>

            {hud.combatMode === 'tank' && (
              <button
                type="button"
                tabIndex={-1}
                data-smoke-trigger="true"
                aria-label="دخان تمويه الدبابة [Q]"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onDeploySmoke();
                }}
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-slate-700/85 hover:bg-slate-600 border border-slate-300/70 text-white text-[9px] sm:text-[11px] font-black cursor-pointer whitespace-nowrap"
              >
                دخان
              </button>
            )}

            {/* Unified Carrier Jet Launch / Glideslope Landing */}
            <div className="relative">
              {hud.combatMode === 'ground' || hud.combatMode === 'tank' || hud.combatMode === 'convoy' ? (
                <button
                  type="button"
                  tabIndex={-1}
                  data-flight-trigger="true"
                  aria-label="إقلاع المقاتلة [G]"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setShowOpsDrawer(false);
                    setShowArsenalDrawer(false);
                    setShowNationsDrawer(false);
                    onLaunchJet('stealth_jet');
                  }}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-[rgba(15,23,42,0.75)] hover:bg-sky-500/80 border border-sky-300/70 text-white text-[9px] sm:text-[11px] font-extrabold cursor-pointer whitespace-nowrap"
                >
                  طيران
                </button>
              ) : (
                <button
                  type="button"
                  tabIndex={-1}
                  data-flight-trigger="true"
                  aria-label="هبوط على الحاملة [V]"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onReturnGround();
                  }}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-500/90 hover:bg-amber-400 border border-amber-200 text-slate-950 text-[9px] sm:text-[11px] font-black cursor-pointer whitespace-nowrap"
                >
                  هبوط
                </button>
              )}
            </div>
          </div>

          {/* Sub-Row 2: Active Weapon Selector, Weapon Holster, Convoy Quick Board, Salvo, Swap, Jump, and Fire Circle */}
          <div className="flex items-end gap-1.5 sm:gap-2">
            <div className="relative flex flex-col items-end gap-1 mb-0.5">
              {hud.combatMode === 'ground' && (
                <div className="flex items-center gap-1">
                  {hud.nearConvoyVehicle && (
                    <button
                      type="button"
                      tabIndex={-1}
                      data-convoy-trigger="true"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onToggleConvoy();
                      }}
                      className="px-2 py-0.5 bg-amber-500/90 hover:bg-amber-400 border border-amber-200 text-[8.5px] sm:text-[10.5px] font-black text-slate-950 whitespace-nowrap cursor-pointer"
                    >
                      موكب [C]
                    </button>
                  )}

                  <button
                    type="button"
                    tabIndex={-1}
                    data-holster-trigger="true"
                    aria-label={hud.weaponHolstered ? 'إظهار السلاح [R]' : 'إخفاء السلاح [R]'}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onToggleWeaponHolster();
                    }}
                    className={`px-2 py-0.5 border text-[8.5px] sm:text-[10.5px] font-black whitespace-nowrap cursor-pointer transition-colors ${
                      hud.weaponHolstered
                        ? 'bg-emerald-500 border-emerald-200 text-slate-950'
                        : 'bg-black/65 border-white/45 text-white hover:bg-white/20'
                    }`}
                  >
                    {hud.weaponHolstered ? 'إظهار [R]' : 'إخفاء [R]'}
                  </button>

                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="قائمة الأسلحة [1-9]"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setShowArsenalDrawer((v) => !v);
                      setShowOpsDrawer(false);
                      setShowNationsDrawer(false);
                    }}
                    className="px-2 py-0.5 bg-black/65 border border-white/40 text-[8.5px] sm:text-[10.5px] font-extrabold text-amber-300 whitespace-nowrap cursor-pointer"
                  >
                    [{activeStats.keyHint}] {activeStats.shortLabel} ▾
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                {hud.combatMode === 'ground' && (
                  <button
                    type="button"
                    tabIndex={-1}
                    data-jump-trigger="true"
                    aria-label="قفز وصعود [Shift]"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.currentTarget.blur();
                      onJump();
                    }}
                    className="hud-med-circle w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-emerald-500/35 border-2 border-white/65 text-white flex items-center justify-center cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2.3">
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  </button>
                )}

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="وابل المنظومات [F]"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onFireSalvo();
                  }}
                  className="hud-med-circle w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 border-2 border-white/65 text-white flex items-center justify-center cursor-pointer"
                >
                  <MilitaryMissileSvg className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="تبديل السلاح [E]"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    cycleNextWeapon();
                  }}
                  className="hud-med-circle relative w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 border-2 border-white/65 text-white flex items-center justify-center cursor-pointer"
                >
                  <svg viewBox="0 0 32 32" className="w-5 h-5 sm:w-6 sm:h-6" fill="rgba(255,255,255,0.85)" aria-hidden="true">
                    <path d="M5 13 H22 L25 10 H28 L26 14 L29 16 L26 18 L28 22 H25 L22 19 H5 L8 16 Z" />
                  </svg>
                  <span className="font-mono-tactical absolute -top-1 -right-1 bg-black/75 border border-white/60 px-1 text-[8px] font-black text-amber-300 rounded">
                    {hud.weaponMag[hud.activeWeapon]}
                  </span>
                </button>
              </div>

              {showArsenalDrawer && (
                <div className="absolute bottom-full right-0 mb-2 bg-[rgba(10,16,26,0.95)] border border-white/40 p-1.5 flex flex-wrap gap-1 w-[224px] sm:w-[290px] max-h-[200px] overflow-y-auto shadow-2xl z-30">
                  {WEAPON_ORDER.map((w) => {
                    const s = getWeaponStats(w, hud.upgrades);
                    const selected = hud.activeWeapon === w;
                    return (
                      <button
                        key={w}
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          onSelectWeapon(w);
                          setShowArsenalDrawer(false);
                        }}
                        className={`px-2 py-1 text-[10px] font-extrabold border cursor-pointer ${
                          selected
                            ? 'bg-amber-400 border-amber-200 text-slate-950'
                            : 'bg-slate-800/85 border-slate-600 text-white hover:bg-slate-700'
                        }`}
                      >
                        [{s.keyHint}] {s.shortLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Fire Circle */}
            <button
              type="button"
              tabIndex={-1}
              data-fire-trigger="true"
              aria-label={hud.nukeTargetingActive ? 'تأكيد إطلاق النووي [Space]' : 'إطلاق النار [Space]'}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.blur();
                onVirtualFire(true);
              }}
              onPointerUp={() => onVirtualFire(false)}
              onPointerLeave={() => onVirtualFire(false)}
              onPointerCancel={() => onVirtualFire(false)}
              className={`hud-fire-circle w-15 h-15 sm:w-22 sm:h-22 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                hud.nukeTargetingActive
                  ? 'bg-amber-500/80 border-red-400 text-slate-950 shadow-[0_0_18px_rgba(245,158,11,0.8)]'
                  : 'bg-white/12 active:bg-amber-400/50 border-white/75 text-white'
              }`}
            >
              <MilitaryMissileSvg className="w-7 h-7 sm:w-10 sm:h-10" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
