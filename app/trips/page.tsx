"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SavedTrip } from "@/lib/types";
import { formatMoney } from "@/lib/currency";
import { expenseTotals, getTrips } from "@/lib/storage";
import NavBar from "@/components/NavBar";
import TripDetail from "@/components/TripDetail";

export default function TripsPage() {
  const [mounted, setMounted] = useState(false);
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reload = () => setTrips(getTrips());

  useEffect(() => {
    setMounted(true);
    reload();
  }, []);

  const selected = trips.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <NavBar />

      {!mounted ? null : trips.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* 清單 */}
          <div className="space-y-2 lg:col-span-1">
            <h2 className="mb-1 text-sm font-bold text-slate-900">我的行程（{trips.length}）</h2>
            {trips.map((t) => {
              const totals = expenseTotals(t);
              const active = t.id === selectedId;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full rounded-xl border bg-white p-3 text-left shadow-sm transition hover:shadow-md ${
                    active ? "border-brand-accent ring-2 ring-blue-200" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{t.destination}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {t.tierLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {t.startDate} → {t.endDate}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      計畫 {formatMoney(t.finance.totalSpending, t.spendingCurrency)}
                    </span>
                    <span className="text-slate-500">
                      實際 {formatMoney(totals.actualTotal, t.spendingCurrency)}
                    </span>
                  </div>
                  {t.review ? (
                    <div className="mt-1 text-xs text-amber-400">
                      {"★".repeat(t.review.rating)}
                      <span className="text-slate-200">{"★".repeat(5 - t.review.rating)}</span>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* 詳情 */}
          <div className="lg:col-span-2">
            {selected ? (
              <TripDetail
                trip={selected}
                onChanged={reload}
                onDeleted={() => {
                  setSelectedId(null);
                  reload();
                }}
              />
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-sm text-slate-400">
                從左側選一個行程查看細節、記錄開支、寫下回顧與心情故事。
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
      <div className="text-3xl">🧳</div>
      <p className="mt-2 text-sm font-medium text-slate-600">還沒有儲存的行程。</p>
      <p className="mt-1 text-xs text-slate-400">先去規劃一趟說走就走的旅程，再按「儲存此行程」吧。</p>
      <Link
        href="/"
        className="mt-4 inline-block rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        開始規劃 →
      </Link>
    </div>
  );
}
