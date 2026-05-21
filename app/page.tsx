"use client";

import { useMemo, useState } from "react";
import type { GenerateResponse } from "@/lib/types";
import InputBar from "@/components/InputBar";
import ItineraryTimeline from "@/components/ItineraryTimeline";
import FinancialPanel from "@/components/FinancialPanel";

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const today = useMemo(() => new Date(), []);
  const [destination, setDestination] = useState("關西");
  const [startDate, setStartDate] = useState(() => addDays(today, 30));
  const [endDate, setEndDate] = useState(() => addDays(today, 36));
  const [budgetTwd, setBudgetTwd] = useState("40000");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  const handleChange = (
    field: "destination" | "startDate" | "endDate" | "budgetTwd",
    value: string
  ) => {
    setError(null);
    if (field === "destination") setDestination(value);
    else if (field === "startDate") setStartDate(value);
    else if (field === "endDate") setEndDate(value);
    else if (field === "budgetTwd") setBudgetTwd(value);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!startDate || !endDate) {
      setError("請選擇出發與回程日期。");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError("回程日期不可早於出發日期。");
      return;
    }
    const budget = Number(budgetTwd);
    if (!budget || budget <= 0) {
      setError("請輸入有效的台幣預算總額。");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, startDate, endDate, budgetTwd: budget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "產生行程失敗");
      setResult(data as GenerateResponse);
    } catch (err: any) {
      setError(err?.message || "發生未知錯誤");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✈️</span>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
            SmartTrip <span className="text-brand-accent">FX</span>
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          一鍵生成行程，精算「不浪費、不匯損」的精準日幣現金換匯量。
        </p>
      </header>

      {/* 輸入列 */}
      <InputBar
        destination={destination}
        startDate={startDate}
        endDate={endDate}
        budgetTwd={budgetTwd}
        loading={loading}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />

      {error ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* 主內容區 */}
      {!result && !loading ? (
        <EmptyState />
      ) : null}

      {loading && !result ? <LoadingState /> : null}

      {result ? (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* 左：行程時間軸 */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {result.itinerary.destination}・{result.itinerary.days.length} 天行程
              </h2>
              <span className="text-[11px] text-slate-400">
                {result.generatedBy === "openai" ? "由 AI 生成" : "示範行程"}
              </span>
            </div>
            <ItineraryTimeline itinerary={result.itinerary} />
          </div>

          {/* 右：財務面板（黏性） */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6">
              <FinancialPanel
                finance={result.finance}
                fx={result.fx}
                budgetTwd={result.budgetTwd}
              />
            </div>
          </div>
        </div>
      ) : null}

      <footer className="mt-10 text-center text-[11px] text-slate-400">
        匯率與燈號僅供參考，實際換匯請以銀行牌告為準。
      </footer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
      <div className="text-3xl">🗾</div>
      <p className="mt-2 text-sm font-medium text-slate-600">
        輸入目的地、日期與預算，按「一鍵生成行程」開始規劃。
      </p>
      <p className="mt-1 text-xs text-slate-400">
        系統會自動標註每筆花費的支付方式，並算出最精準的現金換匯量。
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200/70" />
        ))}
      </div>
      <div className="lg:col-span-1">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
      </div>
    </div>
  );
}
