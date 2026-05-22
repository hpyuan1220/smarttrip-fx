"use client";

import type { TierKey } from "@/lib/types";
import { formatMoney, type CurrencyCode } from "@/lib/currency";
import { bookingLinks, estimateTravel } from "@/lib/travel";

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-slate-500">
        {label}
        {hint ? <span className="ml-1 text-[10px] text-slate-400">{hint}</span> : null}
      </span>
      <span className="text-sm font-semibold tabular-nums text-slate-800">{value}</span>
    </div>
  );
}

export default function TravelPanel({
  destination,
  startDate,
  endDate,
  headcount,
  tier,
  spendingCurrency,
  homeCurrency,
  rate,
  activitiesTotalSpending,
  budgetHome,
}: {
  destination: string;
  startDate: string;
  endDate: string;
  headcount: number;
  tier: TierKey;
  spendingCurrency: CurrencyCode;
  homeCurrency: CurrencyCode;
  rate: number;
  activitiesTotalSpending: number;
  budgetHome?: number;
}) {
  const nights = Math.max(
    0,
    Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000)
  );
  const est = estimateTravel({
    destination,
    tier,
    spendingCurrency,
    homeCurrency,
    nights,
    headcount,
    rate,
  });
  const links = bookingLinks(destination, startDate, endDate, headcount);

  const activitiesHome = Math.round(activitiesTotalSpending * (rate > 0 ? rate : 1));
  const grandTotalHome = activitiesHome + est.travelTotalHome;
  const overBudget = budgetHome != null && grandTotalHome > budgetHome;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">機票 + 住宿</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
          估計值
        </span>
      </div>

      <Row
        label="機票"
        value={formatMoney(est.flightTotalHome, homeCurrency)}
        hint={`${formatMoney(est.flightPerPersonHome, homeCurrency)} × ${headcount} 人`}
      />
      <Row
        label="住宿"
        value={formatMoney(est.hotelTotalHome, homeCurrency)}
        hint={`${formatMoney(est.hotelPerNightSpending, spendingCurrency)} × ${est.nights} 晚 × ${est.rooms} 房`}
      />
      <div className="my-1 border-t border-slate-100" />
      <Row label="機票 + 住宿小計" value={formatMoney(est.travelTotalHome, homeCurrency)} />

      <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">行前預估總計</span>
          <span className={`text-base font-extrabold tabular-nums ${overBudget ? "text-rose-600" : "text-slate-900"}`}>
            {formatMoney(grandTotalHome, homeCurrency)}
          </span>
        </div>
        <div className="mt-0.5 text-[10px] text-slate-400">
          含當地行程 {formatMoney(activitiesHome, homeCurrency)} + 機票住宿{" "}
          {formatMoney(est.travelTotalHome, homeCurrency)}
          {budgetHome != null ? (
            <span className={overBudget ? "text-rose-500" : "text-emerald-600"}>
              {" "}
              ・{overBudget ? "超出" : "在"}此級距預算 {formatMoney(budgetHome, homeCurrency)}
              {overBudget ? "" : "內"}
            </span>
          ) : null}
        </div>
      </div>

      {/* 快速搜尋（外部網站） */}
      <div className="mt-3">
        <div className="mb-1.5 text-[11px] font-medium text-slate-500">快速搜尋（外部網站）</div>
        <div className="grid grid-cols-2 gap-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-accent hover:text-brand-accent"
            >
              <span>{l.emoji}</span>
              {l.label}
            </a>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
        機票/住宿為粗估值，僅供抓預算參考；實際價格與空房請點上方連結查詢。機票、住宿多以刷卡 / 預付，
        不計入現金換匯量。
      </p>
    </div>
  );
}
