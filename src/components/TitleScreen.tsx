import React from 'react';

interface TitleScreenProps {
  bestScore: number;
  onStart: () => void;
  onOpenPlan: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  bestScore,
  onStart,
  onOpenPlan,
}) => {
  return (
    <div
      dir="rtl"
      className="title-screen-wrap pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-8"
    >
      <div className="flex flex-col items-start gap-2.5 sm:gap-4 max-w-xl">
        <div className="flex items-center gap-3 sm:gap-4">
          <svg
            viewBox="0 0 84 84"
            className="title-logo-svg w-12 h-12 sm:w-20 sm:h-20 shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]"
            aria-hidden="true"
          >
            <polygon
              points="42,4 72,18 80,46 64,74 42,80 20,74 4,46 12,18"
              fill="rgba(12, 18, 26, 0.9)"
              stroke="#eab308"
              strokeWidth="2.5"
            />
            <circle cx="42" cy="44" r="21" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx="42" cy="44" r="11" fill="none" stroke="#ef4444" strokeWidth="1.2" opacity="0.85" />
            <path
              d="M42 18 L48 39 L56 48 L46 47 L42 61 L38 47 L28 48 L36 39 Z"
              fill="#facc15"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          </svg>

          <div>
            <h1 className="title-heading text-2xl sm:text-5xl font-black tracking-tight text-[#f8fafc] hud-stroke leading-none">
              درع السماء <span className="text-amber-400 font-mono-tactical text-xl sm:text-3xl">3D</span>
            </h1>
            <p className="title-sub mt-1 sm:mt-1.5 text-[11px] sm:text-base font-bold text-slate-200 hud-stroke">
              مدينة وقصور محصنة · أسطول بحري ومدرعات · دفاع جوي وفرط صوتي
            </p>
          </div>
        </div>

        <div className="title-cta-row pointer-events-auto flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className="px-5 py-2 sm:px-7 sm:py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-sm sm:text-lg tracking-wide border-2 border-amber-300 shadow-[0_6px_20px_rgba(0,0,0,0.65)] transition-transform active:scale-95 cursor-pointer"
          >
            ابدأ المهمة
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenPlan();
            }}
            className="px-4 py-2 sm:py-3 bg-[rgba(15,23,34,0.9)] hover:bg-[rgba(28,40,56,0.95)] text-slate-100 font-bold text-xs sm:text-base border border-slate-500/80 shadow-[0_4px_14px_rgba(0,0,0,0.55)] transition-colors cursor-pointer"
          >
            الدليل والمنظومات
          </button>
        </div>

        {bestScore > 0 && (
          <div className="text-xs sm:text-sm font-bold text-amber-300 hud-stroke font-mono-tactical">
            BEST: {bestScore}
          </div>
        )}
      </div>

      <div className="w-full text-center">
        <p className="title-hint-line text-[10px] sm:text-sm font-bold text-slate-200/95 hud-stroke tracking-wide">
          الحركة WASD أو العصا · الإطلاق Space · المنظومات 1-9 · الوقت والطقس T/Y · المقاتلة G · النووي N
        </p>
      </div>
    </div>
  );
};
