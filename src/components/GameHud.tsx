import React, { useEffect, useRef, useState } from 'react';
import {
  NATION_CONFIGS,
  PLAYER_JET_CONFIGS,
  PLAYER_JET_ORDER,
  WEAPON_ORDER,
  getWeaponStats,
} from '../game/rules';
import type { HudSnapshot, PlayerJetType, WeaponType } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  onSelectWeapon: (w: WeaponType) => void;
  onToggleMute: () => void;
  onToggleZoom: () => void;
  onOpenUpgrades: () => void;
  onPause: () => void;
  onVirtualFire: (firing: boolean) => void;
  onVirtualSlew: (x: number, y: number) => void;
  onFireSalvo: () => void;
  onFireMlrs: () => void;
  onLaunchJet: (jet: PlayerJetType) => void;
  onReturnGround: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  onSelectWeapon,
  onToggleMute,
  onToggleZoom,
  onOpenUpgrades,
  onPause,
  onVirtualFire,
  onFireSalvo,
  onFireMlrs,
  onLaunchJet,
  onReturnGround,
}) => {
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showArsenalDrawer, setShowArsenalDrawer] = useState(false);
  const [showRunwayDrawer, setShowRunwayDrawer] = useState(false);

  // Translucent Tactical Radar Scope (positioned in SkyLock bottom-left cluster)
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

    ctx.fillStyle = 'rgba(18, 28, 34, 0.52)';
    ctx.beginPath();
    ctx.arc(cx, cy, rMax, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, rMax, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
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
    ctx.fillStyle = 'rgba(74, 222, 128, 0.25)';
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
      if (blip.detectedStrength < 0.14) continue;
      const bx = cx + blip.x * (rMax - 7);
      const by = cy + blip.z * (rMax - 7);

      ctx.globalAlpha = Math.min(1, Math.max(0.35, blip.detectedStrength));
      ctx.fillStyle = blip.type === 'stealth' && !blip.isAttacking ? '#facc15' : '#ef4444';
      ctx.beginPath();
      ctx.arc(bx, by, 2.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }, [hud.radarAngle, hud.radarBlips]);

  const hpPct = Math.max(20, Math.min(100, (hud.baseHp / hud.maxBaseHp) * 100));
  const outpostPct = Math.max(15, Math.min(100, hud.outpostHpPct));
  const activeStats = getWeaponStats(hud.activeWeapon, hud.upgrades);
  const nationCfg = NATION_CONFIGS[hud.nation];
  const jetCfg = PLAYER_JET_CONFIGS[hud.selectedJet];
  const locked = hud.lockedTarget;
  const lockPct = locked ? Math.round(locked.lockProgress * 100) : 0;
  const hasHeliThreat = hud.radarBlips.some((b) => b.type === 'helicopter' || b.type === 'drone');
  const hasJetThreat = hud.radarBlips.some((b) => b.type === 'fighter' || b.type === 'stealth');
  const mlrsReady = hud.mlrsCooldownPct <= 0.01;

  const cycleNextWeapon = () => {
    const idx = WEAPON_ORDER.indexOf(hud.activeWeapon);
    onSelectWeapon(WEAPON_ORDER[(idx + 1) % WEAPON_ORDER.length]);
  };

  return (
    <div
      dir="ltr"
      className="hud-scale-layer pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-2 sm:p-3.5"
    >
      {/* Optical ADS Zoom Vignette */}
      {hud.isZoomed && hud.combatMode === 'ground' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 border-[12px] sm:border-[24px] border-black/38 shadow-[inset_0_0_80px_rgba(0,0,0,0.65)]"
        />
      )}

      {/* TOP ROW — Clean SkyLock layout + Compact Outpost Integrity & Airbase Takeoff Toggle */}
      <div className="relative z-10 flex items-start justify-between gap-2 w-full">
        {/* TOP-LEFT: Destroyed + Kills + Level + Base/Outpost HP */}
        <div className="hud-top-destroyed flex flex-col bg-[rgba(22,32,44,0.48)] px-2 py-1 text-white min-w-[92px] sm:min-w-[126px]">
          <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs font-bold leading-tight text-white/95 drop-shadow">
            <span>Destroyed</span>
            <span className="font-mono-tactical text-[8.5px] sm:text-[10px] text-amber-300">
              {nationCfg.flagCode}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1.5 my-0.5">
            <svg viewBox="0 0 40 16" className="w-7 h-3 sm:w-9 sm:h-3.5 text-emerald-200/90" fill="currentColor" aria-hidden="true">
              <path d="M4 5 H32 V7 H18 L24 10 H29 L31 12 H14 L11 10 L3 10 Z" />
            </svg>
            <span className="font-mono-tactical text-[10px] sm:text-xs font-extrabold">
              - {hud.kills}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1.5 text-[9px] sm:text-[11px] font-bold">
            <span className="font-mono-tactical">{hud.commanderLevel} LVL</span>
            <span className="font-mono-tactical text-emerald-300">{Math.round(hpPct)}%</span>
          </div>
          <div className="w-full h-1 bg-black/40 mt-0.5 overflow-hidden">
            <div className="h-full bg-[#4ade80]" style={{ width: `${hpPct}%` }} />
          </div>
          <div className="flex items-center justify-between gap-1 text-[8px] sm:text-[9px] text-slate-200/90 mt-0.5 font-mono-tactical">
            <span>OUTPOST</span>
            <span className={outpostPct < 65 ? 'text-amber-300 font-bold' : 'text-sky-300'}>
              {outpostPct}%
            </span>
          </div>
        </div>

        {/* TOP-MID-LEFT: Green $ Cash Pill */}
        <div className="hud-credits-pill pointer-events-auto flex items-center gap-1.5 bg-[rgba(22,32,44,0.48)] px-2 py-1 text-white self-start">
          <span className="w-4 h-4 sm:w-5 sm:h-5 bg-[#22c55e] text-slate-950 font-mono-tactical font-black text-xs sm:text-sm flex items-center justify-center leading-none">
            $
          </span>
          <span className="font-mono-tactical text-xs sm:text-base font-extrabold tabular-nums drop-shadow">
            {hud.credits}
          </span>
        </div>

        {/* TOP-CENTER: Level & Best Pill + Compact Flight Telemetry only when airborne */}
        <div className="flex flex-col items-center gap-1 self-start">
          <div className="hud-level-pill flex flex-col items-center bg-[rgba(15,23,42,0.58)] px-2.5 py-0.5 sm:px-3.5 sm:py-1 text-[10px] sm:text-xs font-bold leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-[#ff6b6b] font-extrabold">Level:</span>
              <span className="font-mono-tactical text-white">{hud.wave}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/95">Best:</span>
              <span className="font-mono-tactical text-white">{hud.bestScore}</span>
            </div>
          </div>

          {hud.combatMode !== 'ground' && (
            <div className="bg-[rgba(15,23,42,0.72)] border border-sky-400/60 px-2 py-0.5 text-[9px] sm:text-[11px] font-mono-tactical font-bold text-sky-200 whitespace-nowrap">
              {jetCfg.codeName} · {hud.airSpeedKts} KTS · {hud.airAltitudeM}m
            </div>
          )}
        </div>

        {/* TOP-RIGHT: Airbase Takeoff / Ground Return + Zoom / Mute + Pause / Armory */}
        <div className="pointer-events-auto relative flex items-start gap-1 sm:gap-1.5">
          {/* Runway / Air-Ground Toggle Button */}
          <div className="relative flex flex-col items-end">
            {hud.combatMode === 'ground' ? (
              <button
                type="button"
                tabIndex={-1}
                aria-label="المطار وإقلاع المقاتلات [G]"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShowRunwayDrawer((v) => !v);
                }}
                className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-[rgba(15,23,42,0.72)] hover:bg-sky-500/80 border border-sky-300/70 text-white text-[9.5px] sm:text-xs font-extrabold cursor-pointer whitespace-nowrap"
              >
                ✈️ المطار
              </button>
            ) : (
              <button
                type="button"
                tabIndex={-1}
                aria-label="العودة للدفاع الأرضي [V]"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onReturnGround();
                }}
                className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-amber-500/90 hover:bg-amber-400 border border-amber-200 text-slate-950 text-[9.5px] sm:text-xs font-black cursor-pointer whitespace-nowrap"
              >
                🛡️ دفاع
              </button>
            )}

            {showRunwayDrawer && hud.combatMode === 'ground' && (
              <div
                dir="rtl"
                className="absolute top-full right-0 mt-1.5 bg-[rgba(10,16,26,0.94)] border border-sky-400/60 p-1.5 flex flex-col gap-1 w-[155px] sm:w-[190px] shadow-2xl z-30"
              >
                {PLAYER_JET_ORDER.map((jetId) => {
                  const j = PLAYER_JET_CONFIGS[jetId];
                  return (
                    <button
                      key={jetId}
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        setShowRunwayDrawer(false);
                        onLaunchJet(jetId);
                      }}
                      className="px-2 py-1 text-right text-[10px] sm:text-xs font-extrabold bg-slate-800/90 hover:bg-sky-500 hover:text-slate-950 text-white border border-slate-600 cursor-pointer"
                    >
                      ✈️ إقلاع {j.nameAr}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

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
                  ? 'bg-amber-400/80 border-amber-200 text-slate-950'
                  : 'bg-white/10 hover:bg-white/25 border-white/55 text-white'
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
              aria-label={hud.muted ? 'تشغيل الصوت [M]' : 'كتم الصوت [M]'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="hud-mini-circle w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/25 border border-white/55 flex items-center justify-center text-white cursor-pointer"
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
          </div>

          <div className="flex flex-col items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              tabIndex={-1}
              aria-label="إيقاف مؤقت [P]"
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              className="hud-top-circle w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/12 hover:bg-white/25 border-2 border-white/65 flex items-center justify-center text-white cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor">
                <rect x="6.5" y="5" width="3.5" height="14" rx="1" />
                <rect x="14" y="5" width="3.5" height="14" rx="1" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="مركز التطوير والمنظومات [U]"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenUpgrades();
              }}
              className="hud-top-circle relative w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/12 hover:bg-white/25 border-2 border-white/65 flex items-center justify-center text-white cursor-pointer"
            >
              <svg viewBox="0 0 28 28" className="w-5 h-5 sm:w-7 sm:h-7" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <polygon points="14,5 24,21 4,21" fill="rgba(255,255,255,0.22)" />
                <path d="M14 5 L14 21 M11 21 L14 14 L17 21" />
              </svg>
              <span className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-300" />
            </button>
          </div>
        </div>
      </div>

      {/* SKYLOCK TRACKING BRACKET */}
      {locked && locked.onScreen && (
        <div
          className="hud-skylock-box pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          style={{
            left: `${(locked.screenX * 100).toFixed(1)}%`,
            top: `${(locked.screenY * 100).toFixed(1)}%`,
          }}
        >
          <div className="relative w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center">
            <span
              className={`absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 ${
                locked.isLocked ? 'border-red-400' : 'border-amber-300'
              }`}
            />
            <span
              className={`absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 ${
                locked.isLocked ? 'border-red-400' : 'border-amber-300'
              }`}
            />
            <span
              className={`absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 ${
                locked.isLocked ? 'border-red-400' : 'border-amber-300'
              }`}
            />
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 ${
                locked.isLocked ? 'border-red-400' : 'border-amber-300'
              }`}
            />
            <span
              className={`font-mono-tactical text-[8px] sm:text-[9px] font-black px-1 bg-black/50 ${
                locked.isLocked ? 'text-red-400' : 'text-amber-300'
              }`}
            >
              {locked.isLocked ? 'LOCK' : `${lockPct}%`}
            </span>
          </div>
          <div className="mt-0.5 px-1.5 py-0.5 bg-black/55 whitespace-nowrap flex flex-col items-center gap-0.5">
            <span className="font-mono-tactical text-[8px] sm:text-[9px] font-bold text-white">
              {locked.codeName} · {locked.distance}m
            </span>
            <div className="w-12 h-0.5 bg-white/25 overflow-hidden">
              <div
                className={locked.isLocked ? 'h-full bg-red-400' : 'h-full bg-emerald-400'}
                style={{ width: `${Math.max(8, Math.round((locked.hp / locked.maxHp) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* CENTER SKYLOCK CROSSHAIR CLUSTER */}
      <div
        className="hud-center-sight pointer-events-none absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
        aria-hidden="true"
      >
        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-950/60 border border-emerald-300/70 flex items-center justify-center">
          <div
            className={`w-2 h-2 rounded-full ${
              locked?.isLocked ? 'bg-red-400' : 'bg-emerald-400/85'
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 translate-x-1.5">
          <svg viewBox="0 0 64 64" className="hud-reticle-svg w-11 h-11 sm:w-14 sm:h-14">
            <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.88)" strokeWidth="2.4" />
            <circle cx="32" cy="32" r="11" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" />
            {locked && (
              <circle
                cx="32"
                cy="32"
                r="24"
                fill="none"
                stroke={locked.isLocked ? '#ef4444' : '#facc15'}
                strokeWidth="2.6"
                strokeDasharray="151"
                strokeDashoffset={151 * (1 - locked.lockProgress)}
              />
            )}
          </svg>

          <div className="w-1 sm:w-1.5 h-8 sm:h-11 bg-white/30 border border-white/75 flex flex-col justify-end overflow-hidden">
            <div
              className={locked?.isLocked ? 'bg-red-500' : 'bg-emerald-400'}
              style={{ height: `${locked ? Math.max(12, lockPct) : 18}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <div
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center ${
              hasHeliThreat
                ? 'bg-emerald-500/75 border-emerald-200 text-slate-950'
                : 'bg-emerald-950/45 border-emerald-400/50 text-emerald-300/70'
            }`}
          >
            <svg viewBox="0 0 20 12" className="w-3.5 h-2.5" fill="currentColor">
              <path d="M2 3 H16 V4.5 H9 L12 7 H16 V9 H7 L5 7 H2 Z" />
            </svg>
          </div>
          <div
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center ${
              hasJetThreat
                ? 'bg-emerald-500/75 border-emerald-200 text-slate-950'
                : 'bg-emerald-950/45 border-emerald-400/50 text-emerald-300/70'
            }`}
          >
            <svg viewBox="0 0 20 12" className="w-3.5 h-2.5" fill="currentColor">
              <path d="M18 6 L11 4 L7 1 L5 1 L7 4.5 L2 5 L1 3 L0 3 L1 6 L0 9 L1 9 L2 7 L7 7.5 L5 11 L7 11 L11 8 Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW — Clean SkyLock Bottom-Left Controls + Compact MLRS Salvo */}
      <div className="relative z-10 flex items-end justify-between w-full">
        <div className="pointer-events-auto flex items-end gap-2 sm:gap-3">
          {/* Column 1: Small Circular Radar above Large Translucent Fire Button */}
          <div className="flex flex-col items-start gap-1.5 sm:gap-2">
            <div className="hud-radar-box rounded-full bg-black/20 p-0.5 ml-1">
              <canvas
                ref={radarCanvasRef}
                width={96}
                height={96}
                className="hud-radar-canvas w-12 h-12 sm:w-18 sm:h-18 block rounded-full"
                aria-label="رادار الرصد الجوي"
              />
            </div>

            <button
              type="button"
              tabIndex={-1}
              aria-label={
                hud.combatMode === 'ground'
                  ? `إطلاق ${activeStats.labelAr} [Space]`
                  : `نيران المقاتلة ${jetCfg.codeName} [Space]`
              }
              onPointerDown={(e) => {
                e.currentTarget.blur();
                onVirtualFire(true);
              }}
              onPointerUp={() => onVirtualFire(false)}
              onPointerLeave={() => onVirtualFire(false)}
              className="hud-fire-circle w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-white/10 active:bg-amber-400/45 border-2 border-white/75 text-white flex items-center justify-center cursor-pointer"
            >
              <svg viewBox="0 0 40 40" className="w-9 h-9 sm:w-14 sm:h-14" aria-hidden="true">
                <path
                  d="M29 9 L22 10 L11 21 L14 24 L9 29 L11 31 L16 26 L19 29 L30 18 L31 11 Z"
                  fill="rgba(255,255,255,0.78)"
                />
              </svg>
            </button>
          </div>

          {/* Column 2: Switch 7 Systems + Coordinated Salvo [F] */}
          <div className="relative flex flex-col items-center gap-1.5 sm:gap-2 mb-0.5">
            {hud.combatMode === 'ground' && (
              <button
                type="button"
                tabIndex={-1}
                aria-label="عرض جميع المنظومات السبع [1-7]"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShowArsenalDrawer((v) => !v);
                }}
                className="px-1.5 py-0.5 bg-black/60 border border-white/40 text-[8.5px] sm:text-[10.5px] font-extrabold text-amber-300 whitespace-nowrap cursor-pointer"
              >
                [{activeStats.keyHint}] {activeStats.shortLabel} ▾
              </button>
            )}

            <button
              type="button"
              tabIndex={-1}
              aria-label={`تبديل المنظومة — الحالي: ${activeStats.labelAr} [E]`}
              onClick={(e) => {
                e.currentTarget.blur();
                cycleNextWeapon();
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowArsenalDrawer((v) => !v);
              }}
              className="hud-med-circle relative w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/10 hover:bg-white/25 border-2 border-white/65 text-white flex items-center justify-center cursor-pointer"
            >
              <svg viewBox="0 0 32 32" className="w-6 h-6 sm:w-8 sm:h-8" fill="rgba(255,255,255,0.78)" aria-hidden="true">
                <path d="M26 7 L19 9 L12 4 L10 6 L14 12 L8 18 L4 17 L3 19 L8 22 L10 27 L12 26 L11 22 L17 16 L24 20 L26 18 L21 11 Z" />
              </svg>
              <span className="font-mono-tactical absolute -top-1 -right-1 bg-black/75 border border-white/60 px-1 text-[8px] sm:text-[9px] font-black text-amber-300 rounded">
                {hud.weaponMag[hud.activeWeapon]}
              </span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="وابل صاروخي مشترك [F]"
              onClick={(e) => {
                e.currentTarget.blur();
                onFireSalvo();
              }}
              className="hud-med-circle w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/10 hover:bg-white/25 border-2 border-white/65 text-white flex items-center justify-center cursor-pointer"
            >
              <svg viewBox="0 0 32 32" className="w-6 h-6 sm:w-8 sm:h-8" fill="rgba(255,255,255,0.78)" aria-hidden="true">
                <path d="M5 13 H22 L25 10 H28 L26 14 L29 16 L26 18 L28 22 H25 L22 19 H5 L8 16 Z" />
              </svg>
            </button>

            {showArsenalDrawer && (
              <div className="absolute bottom-full left-0 mb-2 bg-[rgba(10,16,26,0.92)] border border-white/40 p-1.5 flex flex-wrap gap-1 w-[210px] sm:w-[270px] shadow-2xl">
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
                          : 'bg-slate-800/80 border-slate-600 text-white hover:bg-slate-700'
                      }`}
                    >
                      [{s.keyHint}] {s.shortLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 3: Compact MLRS Rocket Barrage Trigger [R] */}
          <div className="flex flex-col items-center mb-0.5">
            <button
              type="button"
              tabIndex={-1}
              disabled={!mlrsReady}
              aria-label="قصف راجمة الصواريخ [R]"
              onClick={(e) => {
                e.currentTarget.blur();
                onFireMlrs();
              }}
              className={`px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-full border text-[9px] sm:text-[11px] font-black cursor-pointer transition-colors ${
                mlrsReady
                  ? 'bg-amber-500/80 hover:bg-amber-400 border-amber-200 text-slate-950'
                  : 'bg-black/45 border-white/35 text-slate-400 cursor-not-allowed'
              }`}
            >
              🚀 راجمة
            </button>
          </div>
        </div>

        {/* Bottom-Right kept 100% open for the Soldier Helmet & Launcher */}
        <div aria-hidden="true" className="w-1 h-1" />
      </div>
    </div>
  );
};
