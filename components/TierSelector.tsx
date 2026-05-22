"use client";

import type { TierKey, TierPlan } from "@/lib/types";
import { formatMoney } from "@/lib/currency";

const TIER_STYLE: Record<TierKey, { ring: string; chip: string; emoji: string }> = {
  low: { ring: "ring-emerald-300", chip: "bg-emerald-100 text-emerald-700", emoji: "🌱" },
  mid: { ring: "ring-blue-300", chip: "bg-blue-100 text-blue-700", emoji: "⭐" },
  high: { ring: "ring-amber-300", chip: "bg-amber-100 text-amber-700", emoji: "👑" },
};

export default function TierSelector({
  tiers,
  selected,
  homeCurrency,
  onSelect,
}: {
  tiers: TierPlan[];
  selected: TierKey;
  homeCurrency: string;
  onSelect: (tier: TierKey) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {tiers.map((plan) => {
        const style = TIER_STYLE[plan.tier];
        const active = plan.tier === selected;
        return (
          <button
            key={plan.tier}
            onClick={() => onSelect(plan.tier)}
            className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${
              active ? `border-transparent ring-2 ${style.ring}` : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.chip}`}>
                {style.emoji} {plan.label}
              </span>
              {active ? <span className="text-xs font-bold text-brand-accent">已選</span> : null}
            </div>
            <p className="mt-1 text-xs text-slate-500">{plan.tagline}</p>
            <div className="mt-3 text-2xl font-extrabold tabular-nums text-slate-900">
              {formatMoney(plan.finance.totalSpending, plan.finance.currency)}
            </div>
            <p className="text-[11px] text-slate-400">預估總花費</p>
            <div className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
              建議換現金{" "}
              <span className="font-semibold">
                {formatMoney(plan.finance.recommendedCashSpending, plan.finance.currency)}
              </span>
              <div className="text-[11px] text-slate-400">
                預算約 {formatMoney(plan.budgetHome, homeCurrency)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
