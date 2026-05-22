"use client";

import type { FinanceSummary, FxAnalysis } from "@/lib/types";
import { formatMoney, type CurrencyCode } from "@/lib/currency";
import FxLight from "./FxLight";

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

/** 依匯率量級選擇顯示「每 1」或「每 100」單位。 */
function rateDisplay(rate: number, spending: CurrencyCode, home: CurrencyCode) {
  const unit = rate < 1 ? 100 : 1;
  return `${unit} ${spending} = ${formatMoney(rate * unit, home, 2)}`;
}

export default function FinancialPanel({
  finance,
  fx,
  budget,
  homeCurrency,
}: {
  finance: FinanceSummary;
  fx: FxAnalysis;
  budget: number;
  homeCurrency: CurrencyCode;
}) {
  const spending = finance.currency;
  const bufferAmount = finance.recommendedCashSpending - finance.cashOnlySpending;

  return (
    <div className="space-y-4">
      {/* 主數字：建議換匯量 */}
      <div className="rounded-2xl bg-brand p-5 text-white shadow-sm">
        <div className="text-xs font-medium text-slate-300">建議換匯（{spending} 現金）</div>
        <div className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums">
          {formatMoney(finance.recommendedCashSpending, spending)}
        </div>
        <div className="mt-1 text-xs text-slate-300">
          約 {formatMoney(finance.estimatedHomeForCash, finance.homeCurrency)}（以今日匯率估算）
        </div>
        <div className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-[11px] leading-relaxed text-slate-200">
          僅收現金項目 {formatMoney(finance.cashOnlySpending, spending)} ＋ 10% 預備金{" "}
          {formatMoney(bufferAmount, spending)}，已依幣別進位，避免現場不足或多換造成匯損。
        </div>
      </div>

      {/* FX 換匯紅綠燈 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            FX 換匯訊號 · {fx.spendingCurrency}/{fx.homeCurrency}
          </h3>
          <span className="text-[10px] text-slate-400">
            {fx.source === "live" ? "即時資料" : "模擬資料"}
          </span>
        </div>
        <FxLight signal={fx.signal} />
        <p className="mt-3 text-xs leading-relaxed text-slate-600">{fx.advice}</p>
        <div className="mt-3 border-t border-slate-100 pt-2">
          <Row label="今日匯率" value={rateDisplay(fx.currentRate, fx.spendingCurrency, fx.homeCurrency)} />
          <Row label="30 天均線 (MA30)" value={rateDisplay(fx.ma30, fx.spendingCurrency, fx.homeCurrency)} />
          <Row
            label="相對均線偏離"
            value={`${fx.deviationPct >= 0 ? "+" : ""}${fx.deviationPct.toFixed(2)}%`}
          />
        </div>
      </div>

      {/* 花費結構 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-1 text-sm font-bold text-slate-900">花費結構</h3>
        <Row label="全程預估總花費" value={formatMoney(finance.totalSpending, spending)} />
        <Row label="現金支付項目" value={formatMoney(finance.cashOnlySpending, spending)} hint="cash_only" />
        <Row label="刷卡支付項目" value={formatMoney(finance.cardSpending, spending)} hint="card_acceptable" />
        <div className="my-2 border-t border-slate-100" />
        <Row label="預算總額" value={formatMoney(budget, homeCurrency)} />
      </div>
    </div>
  );
}
