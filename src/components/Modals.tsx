import React from 'react';
import { getPeaceUpgradeCostMultiplier } from '../game/nations';
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
        منظومات الدفاع والأسطول البحري والمدرعات في وضع الجاهزية
      </p>

      <div className="mt-3 sm:mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onResume}
          className="w-full py-2 sm:py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm cursor-pointer"
        >
          متابعة اللعب [P]
        </button>
        <button
          type="button"
          onClick={onOpenUpgrades}
          className="w-full py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/50 font-bold text-xs sm:text-sm cursor-pointer"
        >
          ترقية المنظومات والقوات [U]
        </button>
        <button
          type="button"
          onClick={onOpenPlan}
          className="w-full py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 font-bold text-xs sm:text-sm cursor-pointer"
        >
          الدليل ومواصفات المنظومات
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
      title: 'البندقية + مانباد + رشاش 23mm + CIWS [1-3]',
      desc: 'يرفع ضرر القتال القريب وصواريخ الكتف ومعدل اعتراض فالانكس',
      level: hud.upgrades.closeInLevel,
    },
    {
      slot: 'usLevel',
      badge: 'أمريكي US',
      badgeColor: 'text-sky-300 border-sky-500/50',
      title: 'باتريوت PAC-3 + ثاد THAAD [4-5]',
      desc: 'يزيد سرعة التتبع ومدى الانفجار وسعة البطاريات الأمريكية',
      level: hud.upgrades.usLevel,
    },
    {
      slot: 'ruLevel',
      badge: 'روسي RU',
      badgeColor: 'text-orange-300 border-orange-500/50',
      title: 'منظومة S-400 العمودية [6]',
      desc: 'يعزز قوة الإطلاق البارد بعيد المدى لبطاريات إس-400',
      level: hud.upgrades.ruLevel,
    },
    {
      slot: 'cnLevel',
      badge: 'صيني CN',
      badgeColor: 'text-amber-300 border-amber-500/50',
      title: 'منظومة HQ-9B الصينية [7]',
      desc: 'يزيد قدرة المناورة والضرر التدميري لبطاريات HQ-9',
      level: hud.upgrades.cnLevel,
    },
    {
      slot: 'radarLevel',
      badge: 'ليزر + رادار',
      badgeColor: 'text-cyan-300 border-cyan-500/50',
      title: 'رادار المصفوفة + منظومة الليزر [8]',
      desc: 'يسرّع إقفال SkyLock ويرفع طاقة شعاع الليزر المضاد للصواريخ',
      level: hud.upgrades.radarLevel,
    },
    {
      slot: 'forcesLevel',
      badge: 'القوات + فرط صوتي',
      badgeColor: 'text-rose-300 border-rose-500/50',
      title: 'الدبابات + المشاة + الصواريخ فرط الصوتية [9]',
      desc: 'يرفع قوة الصواريخ فرط الصوتية وكثافة نيران الفصيل والمدرعات',
      level: hud.upgrades.forcesLevel,
    },
  ];

  return (
    <div dir="rtl" className="absolute inset-0 z-30 flex items-center justify-center bg-black/78 p-2 sm:p-4">
      <div className="w-full max-w-3xl bg-[#0b121b] border-2 border-emerald-500/80 p-3.5 sm:p-5 shadow-2xl max-h-[94%] overflow-y-auto text-right">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-2.5">
          <div>
            <h2 className="text-base sm:text-xl font-black text-white">
              مركز التطوير والمنظومات
            </h2>
            <p className="text-[11px] sm:text-xs text-emerald-400 font-bold">
              {hud.warDeclared
                ? 'حماية مستمرة للقاعدة بدون خسارة نهائياً'
                : 'خصم السلام -20% على جميع الترقيات'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 border border-amber-500/60 px-2.5 py-1 text-xs sm:text-sm font-black text-amber-300 font-mono-tactical">
              $ {hud.credits}
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
            const costMult = getPeaceUpgradeCostMultiplier(hud.warDeclared);
            const cost = getUpgradeCost(item.slot, item.level, costMult);
            const canBuy = canPurchaseUpgrade(item.slot, hud.upgrades, hud.credits, costMult);

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
              دليل الميدان والمنظومات «درع السماء 3D»
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              تعمل اللعبة بالكامل بدون إنترنت مع أصوات ومؤثرات مدمجة
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
            <h3 className="font-black text-emerald-300 text-sm">1. العالم المفتوح والدبلوماسية والتحصينات</h3>
            <p>
              • تبدأ المدينة والقصور الرئاسية المحصنة في سلام تام. تحيط بالسفارات الأجنبية أسلاك شائكة وسياج كهربائي وأبراج دفاعية ترد النار فور اندلاع الحرب.
            </p>
            <p>
              • مجمعات التدريب العسكرية تخرّج جنوداً تلقائياً، ويمكنك إنزال دعم 50 جندي أو تفعيل الخلية النائمة لضرب السفارات من الخلف، أو تحديد مكان سقوط القنبلة النووية على الخريطة قبل إطلاقها.
            </p>
          </div>

          <div className="bg-[#111a26] border border-slate-700 p-3">
            <h3 className="font-black text-amber-300 text-sm mb-2">2. اختصارات التحكم والمنظومات</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-600 text-slate-300 text-xs">
                    <th className="py-1.5 px-2">المنظومة / الإجراء</th>
                    <th className="py-1.5 px-2">الوظيفة</th>
                    <th className="py-1.5 px-2">الاختصار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  <tr>
                    <td className="py-2 px-2 font-bold text-white">بندقية · مانباد · رشاش 23mm</td>
                    <td className="py-2 px-2">أسلحة قريبة للاشتباك البري والجوي</td>
                    <td className="py-2 px-2 font-mono-tactical text-amber-300">1 · 2 · 3</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-bold text-white">Patriot · THAAD · S-400 · HQ-9</td>
                    <td className="py-2 px-2">منظومات صواريخ بعيدة المدى + وابل مشترك</td>
                    <td className="py-2 px-2 font-mono-tactical text-amber-300">4 · 5 · 6 · 7 · F</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-bold text-white">الليزر الدفاعي + فرط صوتي</td>
                    <td className="py-2 px-2">إسقاط الصواريخ فورياً وضرب الأهداف المحصنة</td>
                    <td className="py-2 px-2 font-mono-tactical text-amber-300">8 · 9</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-bold text-white">الوقت والطقس + الطيران + النووي + الخلية</td>
                    <td className="py-2 px-2">نهار/ليل · مطر · طيران · تحديد النووي · خلية نائمة</td>
                    <td className="py-2 px-2 font-mono-tactical text-amber-300">T · Y · G · N · K</td>
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
