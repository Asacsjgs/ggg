import React, { useState } from 'react';
import { useBrowserFullscreen, useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.currentTarget.blur();
          void install();
        }}
        className={
          compact
            ? 'w-full py-2 sm:py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-400/70 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer'
            : 'px-4 py-2.5 sm:py-3 bg-emerald-700/95 hover:bg-emerald-600 text-white font-bold text-xs sm:text-base border border-emerald-400/80 shadow-[0_4px_14px_rgba(0,0,0,0.55)] flex items-center gap-2 transition-colors cursor-pointer'
        }
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>تثبيت للعب بدون نت</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            setShowIOSGuide(true);
          }}
          className={
            compact
              ? 'w-full py-2 sm:py-2.5 bg-emerald-800/85 hover:bg-emerald-700 text-white border border-emerald-400/60 font-bold text-xs sm:text-sm cursor-pointer'
              : 'px-4 py-2.5 sm:py-3 bg-[rgba(15,23,34,0.9)] hover:bg-[rgba(28,40,56,0.95)] text-emerald-300 font-bold text-xs sm:text-base border border-emerald-500/65 shadow-[0_4px_14px_rgba(0,0,0,0.55)] transition-colors cursor-pointer'
          }
        >
          تثبيت على iPhone (بدون نت)
        </button>

        {showIOSGuide && (
          <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-sm bg-[#0b121b] border-2 border-emerald-500/80 p-5 shadow-2xl text-right">
              <h3 className="text-base font-black text-white">تثبيت درع السماء للعمل بدون نت</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                1. اضغط على زر <strong>المشاركة (Share)</strong> في متصفح Safari.<br />
                2. اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong> لتشغيل اللعبة بملء الشاشة وبدون إنترنت.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const FullscreenToggleButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isFullscreen, toggleFullscreen } = useBrowserFullscreen();

  return (
    <button
      type="button"
      aria-label={isFullscreen ? 'إنهاء ملء الشاشة' : 'تشغيل بملء الشاشة'}
      onClick={(e) => {
        e.currentTarget.blur();
        void toggleFullscreen();
      }}
      className={
        compact
          ? 'w-full py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/50 font-bold text-xs sm:text-sm cursor-pointer'
          : 'px-3.5 py-2.5 sm:py-3 bg-[rgba(15,23,34,0.88)] hover:bg-[rgba(28,40,56,0.95)] text-sky-200 font-bold text-xs sm:text-base border border-sky-500/60 shadow-[0_4px_14px_rgba(0,0,0,0.55)] flex items-center gap-1.5 transition-colors cursor-pointer'
      }
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        {isFullscreen ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0v4m0-4h4m6 5l5-5m0 0v4m0-4h-4m-6 6l-5 5m0 0h4m-4 0v-4m10 1l5 5m0 0h-4m4 0v-4" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5" />
        )}
      </svg>
      <span>{isFullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}</span>
    </button>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      dir="rtl"
      role="status"
      className="pointer-events-none fixed bottom-2.5 right-2.5 z-40 flex items-center gap-1.5 bg-amber-500/95 px-2.5 py-1 text-[11px] font-black text-slate-950 shadow-lg border border-amber-200"
    >
      <span className="h-2 w-2 rounded-full bg-slate-950 animate-pulse" />
      <span>وضع بدون نت — اللعب مستمر محلياً</span>
    </div>
  );
};
