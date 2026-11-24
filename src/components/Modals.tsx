import React from 'react';
import {
  canPurchaseUpgrade,
  getUpgradeCost,
  getUpgradeMaxLevel,
  type UpgradeSlotKey,
} from '../game/rules';
import type { HudSnapshot } from '../game/types';
import { FullscreenToggleButton, PWAInstallButton } from './PWAInstallUI';

export const PauseModal: React.FC<{
  onResume: () => void;
  onOpenUpgrades: () => void;
  onOpenPlan: () => void;
  onRestart: () => void;
  onTitle: () => void;
}> = ({ onResume, onOpenUpgrades, onOpenPlan, onRestart, onTitle }) => (
  <div dir="rtl" className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-2 sm:p-4">
    <div className="modal-card w-full max-w-sm bg-[#0b121b] border-2 border-amber-500/80 p-3.5 sm:p-6 shadow-2xl text-center max-h-[94%] overflow-y-auto">
      <h2 className="text-lg sm:text-2xl font-black text-white">إيقاف مؤقت</h2>
      <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
        منظومات الدفاع الجوي في وضع الجاهزية القصوى
      </p>

      <div className="mt-3 sm:mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onResume}
          className="w-full py-2 sm:py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm cursor-pointer"
        >
          متابعة القتال [P]
        </button>
        <button
          type="button"
          onClick={onOpenUpgrades}
          className="w-full py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/50 font-bold text-xs sm:text-sm cursor-pointer"
        >
          ترقية المنظومات الأمريكية والروسية والصينية [U]
        </button>
        <button
          type="button"
          onClick={onOpenPlan}
          className="w-full py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 font-bold text-xs sm:text-sm cursor-pointer"
        >
          خطة التنفيذ والمحرك والتكلفة
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="w-full py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 font-bold text-xs sm:text-sm cursor-pointer"
        >
          إعادة تشغيل المهمة
        </button>
        <FullscreenToggleButton compact />
        <PWAInstallButton compact />
        <button
          type="button"
          onClick={onTitle}
          className="w-full py-2 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
        >
          العودة للشاشة الرئيسية
        </button>
      </div>
    </div>
  </div>
);

export const ArmoryModal: React.FC<{
  hud: HudSnapshot;
  onUpgrade: (slot: UpgradeSlotKey) => void;
  onClose: () => void;
}> = ({ hud, onUpgrade, onClose }) => {
  const items: Array<{
    slot: UpgradeSlotKey;
    badge: string;
    badgeColor: string;
    title: string;
    desc: string;
    level: number;
  }> = [
    {
      slot: 'closeInLevel',
      badge: 'قريب + CIWS',
      badgeColor: 'text-emerald-300 border-emerald-500/50',
      title: 'مانباد + رشاش 23mm + Phalanx CIWS [1-2]',
      desc: 'يرفع ضرر صواريخ الكتف والرشاش الثقيل ومعدل اعتراض فالانكس التلقائي',
      level: hud.upgrades.closeInLevel,
    },
    {
      slot: 'usLevel',
      badge: 'أمريكي US',
      badgeColor: 'text-sky-300 border-sky-500/50',
      title: 'باتريوت PAC-3 + ثاد THAAD [3-4]',
      desc: 'يزيد سرعة التتبع ومدى الانفجار وسعة صواريخ الباتريوت والثاد الأمريكية',
      level: hud.upgrades.usLevel,
    },
    {
      slot: 'ruLevel',
      badge: 'روسي RU',
      badgeColor: 'text-orange-300 border-orange-500/50',
      title: 'إس-400 / إس-300 + بانتسير-S1 [5-6]',
      desc: 'يعزز قوة الإطلاق العمودي البارد لـ S-400 وسرعة صواريخ بانتسير الروسية',
      level: hud.upgrades.ruLevel,
    },
    {
      slot: 'cnLevel',
      badge: 'صيني CN',
      badgeColor: 'text-amber-300 border-amber-500/50',
      title: 'منظومة HQ-9B الصينية [7]',
      desc: 'يزيد قدرة المناورة الحادة والضرر التدميري لبطاريات HQ-9 العمودية',
      level: hud.upgrades.cnLevel,
    },
    {
      slot: 'radarLevel',
      badge: 'استطلاع',
      badgeColor: 'text-cyan-300 border-cyan-500/50',
      title: 'رادار المصفوفة وإقفال SkyLock',
      desc: 'يسرّع الإقفال الحراري ويكشف المقاتلات الشبحية (F-35 / J-20) عن بُعد',
      level: hud.upgrades.radarLevel,
    },
    {
      slot: 'forcesLevel',
      badge: 'قوات + راجمة',
      badgeColor: 'text-rose-300 border-rose-500/50',
      title: 'القناصين + المشاة + راجمة الصواريخ [R]',
      desc: 'يزيد دقة وضرر القناصين، عدد صواريخ الراجمة وسرعة إصلاح السواتر الأمامية',
      level: hud.upgrades.forcesLevel,
    },
  ];

  return (
    <div dir="rtl" className="absolute inset-0 z-30 flex items-center justify-center bg-black/78 p-2 sm:p-4">
      <div className="w-full max-w-3xl bg-[#0b121b] border-2 border-emerald-500/80 p-3.5 sm:p-5 shadow-2xl max-h-[94%] overflow-y-auto text-right">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-2.5">
          <div>
            <h2 className="text-base sm:text-xl font-black text-white">
              مركز تطوير منظومات الدفاع الجوي والقوات المشتركة
            </h2>
            <p className="text-[11px] sm:text-xs text-emerald-400 font-bold">
              درع الحماية الدائم نشط — لا توجد خسارة نهائياً
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 border border-amber-500/60 px-2.5 py-1 text-xs sm:text-sm font-black text-amber-300 font-mono-tactical">
              الذهب: {hud.credits}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              إغلاق [U]
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {items.map((item) => {
            const maxLv = getUpgradeMaxLevel(item.slot);
            const isMax = item.level >= maxLv;
            const cost = getUpgradeCost(item.slot, item.level);
            const canBuy = canPurchaseUpgrade(item.slot, hud.upgrades, hud.credits);

            return (
              <div
                key={item.slot}
                className="flex flex-col justify-between bg-[#111a26] border border-slate-700 p-2.5 sm:p-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-black border px-1.5 py-0.5 ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                    <span className="font-mono-tactical text-xs font-bold text-emerald-400">
                      Lv.{item.level}/{maxLv}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-black text-white mt-1.5">{item.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">{item.desc}</p>
                </div>

                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={() => onUpgrade(item.slot)}
                  className={`mt-2.5 w-full py-1.5 sm:py-2 text-xs font-black border transition-colors ${
                    isMax
                      ? 'bg-slate-900 border-slate-700 text-emerald-400 cursor-default'
                      : canBuy
                      ? 'bg-emerald-500 hover:bg-emerald-400 border-emerald-300 text-slate-950 cursor-pointer'
                      : 'bg-slate-900 border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isMax ? 'الحد الأقصى مكتمل' : `ترقية إلى Lv.${item.level + 1} (${cost})`}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-3 bg-[#111a26] border border-slate-700 p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <span>
            الإسقاطات: <strong className="font-mono-tactical text-white">{hud.kills}</strong> · النقاط:{' '}
            <strong className="font-mono-tactical text-amber-300">{hud.score}</strong>
          </span>
          <span className="text-emerald-400 font-bold">
            حالة القاعدة: حماية مستمرة وإصلاح تلقائي
          </span>
        </div>
      </div>
    </div>
  );
};

export const ProjectPlanModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  return (
    <div dir="rtl" className="absolute inset-0 z-40 flex items-center justify-center bg-black/82 p-2 sm:p-4">
      <div className="w-full max-w-3xl bg-[#0b121b] border-2 border-amber-500/80 p-4 sm:p-6 shadow-2xl max-h-[92%] overflow-y-auto text-right">
        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
          <div>
            <h2 className="text-base sm:text-xl font-black text-amber-400">
              مواصفات المحرك الواقعي «درع السماء 3D — SkyLock»
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              دفاع جوي + مطار ومقاتلات قابلة للقيادة + راجمات وقناصين بمساحة لعب متكاملة وبدون نت
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs sm:text-sm text-slate-200 leading-relaxed">
          <div className="bg-[#111a26] border border-slate-700 p-3 space-y-2">
            <h3 className="font-black text-emerald-300 text-sm">
              1. الأنظمة المدمجة داخل الميدان
            </h3>
            <p>
              • <strong>المطار والطيران الحربي (F-22 · Su-57 · J-20):</strong> مدرج مطار متكامل يتيح اختيار مقاتلة حربية والإقلاع نحو السماء للاشتباك المباشر بالمدفع والجو-جو والعودة للدفاع الأرضي بأي لحظة.
            </p>
            <p>
              • <strong>القناصين والراجمات ومعسكر العدو:</strong> قوات مشاة وقناصين وراجمة صواريخ حليفة تقصف مواقع العدو البعيدة، مقابل معسكر معادي يطلق صواريخ وقذائف قابلة للاعتراض مع تدمير وإصلاح مستمر للسواتر.
            </p>
            <p>
              • <strong>السماء والإضاءة والخامات والأصوات:</strong> إضاءة HDRI وخامات PBR و3 مستويات LOD وأصوات مدمجة بالكامل (صواريخ، قناصين، راجمات، طائرات) بدون نت وبثبات إطارات عالٍ على الموبايل.
            </p>
          </div>

          <div className="bg-[#111a26] border border-slate-700 p-3">
            <h3 className="font-black text-amber-300 text-sm mb-2">
              2. جدول المنظومات والضوابط المعتمدة داخل الميدان
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-600 text-slate-300 text-xs">
                    <th className="py-1.5 px-2">المنظومة / المحور</th>
                    <th className="py-1.5 px-2">الدور القتالي والتفاصيل</th>
                    <th className="py-1.5 px-2">الاختصار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  <tr>
                    <td className="py-2 px-2 font-bold text-white">الدفاع القريب + Phalanx CIWS</td>
                    <td className="py-2 px-2">صواريخ كتف مانباد + رشاش 23mm + اعتراض تلقائي بـ Phalanx</td>
                    <td className="py-2 px-2 font-mono-tactical text-amber-300">1 · 2</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-bold text-white">الأمريكية Patriot &amp; THAAD</td>
                    <td className="py-2 px-2">اعتراض متوسط وعالي الارتفاع مع تتبع المنصة للهدف</td>
                    <td className="py-2 px-2 font-mono-tactical text-amber-300">3 · 4</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-bold text-white">الروسية S-400 &amp; Pantsir &amp; الصينية HQ-9</td>
                    <td className="py-2 px-2">إطلاق عمودي بارد بعيد المدى + بانتسير + وابل مشترك</td>
                    <td className="py-2 px-2 font-mono-tactical text-amber-300">5 · 6 · 7 · F</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-bold text-white">المطار والمقاتلات + الراجمة</td>
                    <td className="py-2 px-2">إقلاع بالمقاتلة للقتال الجوي + قصف راجمة الصواريخ على العدو</td>
                    <td className="py-2 px-2 font-mono-tactical text-amber-300">G · V · R</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
