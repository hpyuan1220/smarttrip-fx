// 本機儲存模組（localStorage）
//
// 定位：簡單、快速的個人規劃器 —— 不需登入，資料存在使用者瀏覽器。
// 所有函式皆在用戶端執行，並對 SSR / 無 localStorage 環境做防護。

"use client";

import type {
  Expense,
  GenerateResponse,
  MoodStory,
  SavedTrip,
  TierKey,
  TripReview,
} from "./types";

const STORAGE_KEY = "smarttrip.savedTrips.v1";

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function readAll(): SavedTrip[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedTrip[]) : [];
  } catch {
    return [];
  }
}

function writeAll(trips: SavedTrip[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  } catch {
    /* 容量已滿或被封鎖時靜默失敗 */
  }
}

/** 取得所有已儲存行程（最新在前）。 */
export function getTrips(): SavedTrip[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function getTrip(id: string): SavedTrip | undefined {
  return readAll().find((t) => t.id === id);
}

export function deleteTrip(id: string): void {
  writeAll(readAll().filter((t) => t.id !== id));
}

/** 由生成結果與選定級距建立一筆可儲存的行程。 */
export function buildSavedTrip(resp: GenerateResponse, tier: TierKey): SavedTrip {
  const plan = resp.tiers.find((t) => t.tier === tier) ?? resp.tiers[0];
  return {
    id: genId(),
    createdAt: Date.now(),
    destination: resp.destination,
    startDate: resp.startDate,
    endDate: resp.endDate,
    homeCurrency: resp.homeCurrency,
    spendingCurrency: resp.spendingCurrency,
    context: resp.context,
    tier: plan.tier,
    tierLabel: plan.label,
    itinerary: plan.itinerary,
    finance: plan.finance,
    fxSnapshot: {
      signal: resp.fx.signal,
      currentRate: resp.fx.currentRate,
      ma30: resp.fx.ma30,
      deviationPct: resp.fx.deviationPct,
    },
    expenses: [],
  };
}

/** 新增一筆已儲存行程，回傳其 id。 */
export function addTrip(trip: SavedTrip): string {
  const all = readAll();
  all.push(trip);
  writeAll(all);
  return trip.id;
}

function mutate(id: string, fn: (t: SavedTrip) => SavedTrip): SavedTrip | undefined {
  const all = readAll();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  const updated = fn(all[idx]);
  all[idx] = updated;
  writeAll(all);
  return updated;
}

// --- 開支紀錄 ---

export function addExpense(
  tripId: string,
  expense: Omit<Expense, "id" | "createdAt">
): SavedTrip | undefined {
  const full: Expense = { ...expense, id: genId(), createdAt: Date.now() };
  return mutate(tripId, (t) => ({ ...t, expenses: [...t.expenses, full] }));
}

export function deleteExpense(tripId: string, expenseId: string): SavedTrip | undefined {
  return mutate(tripId, (t) => ({
    ...t,
    expenses: t.expenses.filter((e) => e.id !== expenseId),
  }));
}

// --- 旅程回顧 ---

export function setReview(
  tripId: string,
  review: Omit<TripReview, "updatedAt">
): SavedTrip | undefined {
  return mutate(tripId, (t) => ({ ...t, review: { ...review, updatedAt: Date.now() } }));
}

// --- 心情故事 ---

export function setStory(
  tripId: string,
  story: Omit<MoodStory, "updatedAt">
): SavedTrip | undefined {
  return mutate(tripId, (t) => ({ ...t, story: { ...story, updatedAt: Date.now() } }));
}

// --- 開支統計 ---

export interface ExpenseTotals {
  actualCash: number;
  actualCard: number;
  actualTotal: number;
}

export function expenseTotals(trip: SavedTrip): ExpenseTotals {
  let actualCash = 0;
  let actualCard = 0;
  for (const e of trip.expenses) {
    if (e.method === "cash_only") actualCash += e.amount;
    else actualCard += e.amount;
  }
  return { actualCash, actualCard, actualTotal: actualCash + actualCard };
}
