"use client";

import type { FinanceSummary, FxAnalysis } from "@/lib/types";
import FxLight from "./FxLight";

const yen = (n: number) => `¥${n.toLocaleString()}`;
const twd = (n: number) => `NT$${n.toLocaleString()}`;

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

export default function FinancialPanel({
  finance,
  fx,
  budgetTwd,
}: {
  finance: FinanceSummary;
  fx: FxAnalysis;
  budgetTwd: number;
}) {
  const bufferJpy = finance.recommendedCashJpy - finance.cashOnlyJpy;
  const ratePer100 = (fx.currentRate * 100).toFixed(2);
  const maPer100 = (fx.ma30 * 100).toFixed(2);

  return (
    <div className="space-y-4">
      {/* 主數字：建議換匯日幣 */}
      <div className="rounded-2xl bg-brand p-5 text-white shadow-sm">
        <div className="text-xs font-medium text-slate-300">建議換匯日幣</div>
        <div className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums">
          {yen(finance.recommendedCashJpy)}
        </div>
        <div className="mt-1 text-xs text-slate-300">
          約 {twd(finance.estimatedTwdForCash)}（以今日匯率估算）
        </div>
        <div className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-[11px] leading-relaxed text-slate-200">
          僅收現金項目 {yen(finance.cashOnlyJpy)} ＋ 10% 預備金 {yen(bufferJpy)}，
          進位至千元，避免現場不足或多換造成匯損。
        </div>
      </div>

      {/* FX 換匯紅綠燈 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">FX 換匯訊號</h3>
          <span className="text-[10px] text-slate-400">
            {fx.source === "live" ? "即時資料" : "模擬資料"}
          </span>
        </div>
        <FxLight signal={fx.signal} />
        <p className="mt-3 text-xs leading-relaxed text-slate-600">{fx.advice}</p>
        <div className="mt-3 border-t border-slate-100 pt-2">
          <Row label="今日匯率" value={`¥100 = NT$${ratePer100}`} />
          <Row label="30 天均線 (MA30)" value={`¥100 = NT$${maPer100}`} />
          <Row
            label="相對均線偏離"
            value={`${fx.deviationPct >= 0 ? "+" : ""}${fx.deviationPct.toFixed(2)}%`}
          />
        </div>
      </div>

      {/* 花費結構 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-1 text-sm font-bold text-slate-900">花費結構</h3>
        <Row label="全程預估總花費" value={yen(finance.totalJpy)} />
        <Row label="現金支付項目" value={yen(finance.cashOnlyJpy)} hint="cash_only" />
        <Row label="刷卡支付項目" value={yen(finance.cardJpy)} hint="card_acceptable" />
        <div className="my-2 border-t border-slate-100" />
        <Row label="台幣預算總額" value={twd(budgetTwd)} />
      </div>
    </div>
  );
}
