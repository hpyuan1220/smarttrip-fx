"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GenerateResponse, TierKey } from "@/lib/types";
import {
  DESTINATIONS,
  defaultCurrencyForDestination,
  type CurrencyCode,
} from "@/lib/currency";
import { addTrip, buildSavedTrip } from "@/lib/storage";
import NavBar from "@/components/NavBar";
import InputBar, { type InputField } from "@/components/InputBar";
import TierSelector from "@/components/TierSelector";
import ItineraryTimeline from "@/components/ItineraryTimeline";
import FinancialPanel from "@/components/FinancialPanel";

const CUSTOM = "__custom__";

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);

  const [destination, setDestination] = useState(DESTINATIONS[0].label);
  const [isCustomDestination, setIsCustomDestination] = useState(false);
  const [spendingCurrency, setSpendingCurrency] = useState<CurrencyCode>(
    DESTINATIONS[0].defaultCurrency
  );
  const [homeCurrency, setHomeCurrency] = useState<CurrencyCode>("TWD");
  const [startDate, setStartDate] = useState(() => addDays(today, 14));
  const [endDate, setEndDate] = useState(() => addDays(today, 17));
  const [budgetMin, setBudgetMin] = useState("20000");
  const [budgetMax, setBudgetMax] = useState("60000");
  const [mood, setMood] = useState("escape");
  const [theme, setTheme] = useState("");
  const [companions, setCompanions] = useState("");
  const [headcount, setHeadcount] = useState("1");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierKey>("mid");
  const [savedId, setSavedId] = useState<string | null>(null);

  const handleChange = (field: InputField, value: string) => {
    setError(null);
    switch (field) {
      case "destinationPreset":
        if (value === CUSTOM) {
          setIsCustomDestination(true);
          setDestination("");
        } else {
          setIsCustomDestination(false);
          setDestination(value);
          setSpendingCurrency(defaultCurrencyForDestination(value));
        }
        break;
      case "destination": setDestination(value); break;
      case "spendingCurrency": setSpendingCurrency(value as CurrencyCode); break;
      case "homeCurrency": setHomeCurrency(value as CurrencyCode); break;
      case "startDate": setStartDate(value); break;
      case "endDate": setEndDate(value); break;
      case "budgetMin": setBudgetMin(value); break;
      case "budgetMax": setBudgetMax(value); break;
      case "mood": setMood(value); break;
      case "theme": setTheme(value); break;
      case "companions": setCompanions(value); break;
      case "headcount": setHeadcount(value); break;
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSavedId(null);
    if (!destination.trim()) return setError("請選擇或輸入旅遊目的地。");
    if (!startDate || !endDate) return setError("請選擇出發與回程日期。");
    if (new Date(endDate) < new Date(startDate)) return setError("回程日期不可早於出發日期。");
    const min = Number(budgetMin);
    const max = Number(budgetMax);
    if (!min || min <= 0 || !max || max <= 0) return setError("請輸入有效的預算範圍。");
    if (max < min) return setError("預算上限不可小於下限。");

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          startDate,
          endDate,
          homeCurrency,
          spendingCurrency,
          budgetMin: min,
          budgetMax: max,
          mood: mood || undefined,
          theme: theme || undefined,
          companions: companions || undefined,
          headcount: Number(headcount) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "產生行程失敗");
      setResult(data as GenerateResponse);
      setSelectedTier("mid");
    } catch (err: any) {
      setError(err?.message || "發生未知錯誤");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    const trip = buildSavedTrip(result, selectedTier);
    addTrip(trip);
    setSavedId(trip.id);
  };

  const selectedPlan = result?.tiers.find((t) => t.tier === selectedTier) ?? result?.tiers[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <NavBar />
      <p className="mb-4 -mt-2 text-sm text-slate-500">
        想臨時逃離一下？挑個心情與預算範圍，立刻生成 Low / Mid / High 三種方案。
      </p>

      <InputBar
        destination={destination}
        isCustomDestination={isCustomDestination}
        spendingCurrency={spendingCurrency}
        homeCurrency={homeCurrency}
        startDate={startDate}
        endDate={endDate}
        budgetMin={budgetMin}
        budgetMax={budgetMax}
        mood={mood}
        theme={theme}
        companions={companions}
        headcount={headcount}
        loading={loading}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />

      {error ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {!result && !loading ? <EmptyState /> : null}
      {loading && !result ? <LoadingState /> : null}

      {result && selectedPlan ? (
        <div className="mt-5 space-y-5">
          {/* 三級距選擇 */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">選擇你的方案</h2>
              <span className="text-[11px] text-slate-400">
                {result.generatedBy === "openai" ? "由 AI 生成" : "示範行程"}
              </span>
            </div>
            <TierSelector
              tiers={result.tiers}
              selected={selectedTier}
              homeCurrency={result.homeCurrency}
              onSelect={(t) => {
                setSelectedTier(t);
                setSavedId(null);
              }}
            />
          </div>

          {/* 行程 + 財務 */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  {result.destination}・{selectedPlan.itinerary.days.length} 天（{selectedPlan.label}）
                </h2>
                <button
                  onClick={handleSave}
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-700"
                >
                  💾 儲存此行程
                </button>
              </div>
              {savedId ? (
                <div className="mb-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <span>已儲存到「我的行程」。</span>
                  <button onClick={() => router.push("/trips")} className="font-semibold underline">
                    前往查看 →
                  </button>
                </div>
              ) : null}
              <ItineraryTimeline itinerary={selectedPlan.itinerary} />
            </div>
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-6">
                <FinancialPanel
                  finance={selectedPlan.finance}
                  fx={result.fx}
                  budget={selectedPlan.budgetHome}
                  homeCurrency={result.homeCurrency}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="mt-10 text-center text-[11px] text-slate-400">
        匯率與燈號僅供參考，實際換匯請以銀行牌告為準。資料僅儲存在本機瀏覽器。
      </footer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
      <div className="text-3xl">🏃💨</div>
      <p className="mt-2 text-sm font-medium text-slate-600">
        設定心情、同行、人數與預算範圍，按上方按鈕一鍵生成三種方案。
      </p>
      <p className="mt-1 text-xs text-slate-400">
        系統會標註每筆花費的支付方式，並算出最精準的現金換匯量。
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mt-8 space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200/70" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200/70" />
          ))}
        </div>
        <div className="lg:col-span-1">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
        </div>
      </div>
    </div>
  );
}
