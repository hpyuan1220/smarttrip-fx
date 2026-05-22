// 共用型別定義（前後端共用）

import type { CurrencyCode } from "./currency";

// 方便其他模組從 types 取用幣別型別
export type { CurrencyCode } from "./currency";

export type PaymentMethod = "cash_only" | "card_acceptable";

export type TierKey = "low" | "mid" | "high";

export interface ActivityItem {
  time: string; // "HH:MM"
  name: string; // 景點 / 行程名
  description?: string;
  estimated_cost: number; // 預估花費（消費幣別）
  payment_method: PaymentMethod; // 支付標籤
}

export interface DayPlan {
  day: number; // 1..N
  date?: string; // "YYYY-MM-DD"
  title: string; // 當日主題
  activities: ActivityItem[];
}

export interface Itinerary {
  destination: string;
  currency: CurrencyCode; // 消費幣別
  days: DayPlan[];
}

export type FxSignal = "STRONG_BUY" | "BUY" | "HOLD";

export interface FxHistoryPoint {
  date: string; // "YYYY-MM-DD"
  rate: number; // 1 單位 spending = ? home
}

export interface FxAnalysis {
  spendingCurrency: CurrencyCode;
  homeCurrency: CurrencyCode;
  signal: FxSignal;
  currentRate: number; // 今日匯率（1 spending = ? home）
  ma30: number; // 30 天均線
  deviationPct: number; // 今日相對 MA30 偏離百分比
  advice: string; // 文字建議
  history: FxHistoryPoint[]; // 30 天歷史資料
  source: "live" | "simulated";
}

export interface FinanceSummary {
  currency: CurrencyCode; // 消費幣別
  homeCurrency: CurrencyCode; // 本國幣別
  totalSpending: number; // 全程預估總花費（消費幣別）
  cashOnlySpending: number; // 僅收現金項目總和
  cardSpending: number; // 可刷卡項目總和
  bufferRate: number; // 預備金倍率（1.1）
  recommendedCashSpending: number; // 建議換匯（消費幣別，含 10% 預備金、進位）
  estimatedHomeForCash: number; // 換這些現金約需多少本國幣別
}

// 規劃情境（心情 / 主題 / 同行 / 人數 / 預算範圍）
export interface TripContext {
  mood?: string;
  theme?: string;
  companions?: string;
  headcount: number;
  budgetMin: number; // 本國幣別
  budgetMax: number; // 本國幣別
}

export interface TierPlan {
  tier: TierKey;
  label: string; // 輕簡 / 標準 / 盡興
  tagline: string;
  budgetHome: number; // 此級距對應的本國幣別預算
  itinerary: Itinerary;
  finance: FinanceSummary;
}

export interface GenerateRequest {
  destination: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  homeCurrency: CurrencyCode;
  spendingCurrency: CurrencyCode;
  budgetMin: number; // 本國幣別
  budgetMax: number; // 本國幣別
  mood?: string;
  theme?: string;
  companions?: string;
  headcount: number;
}

export interface GenerateResponse {
  tiers: TierPlan[];
  fx: FxAnalysis;
  context: TripContext;
  homeCurrency: CurrencyCode;
  spendingCurrency: CurrencyCode;
  destination: string;
  startDate: string;
  endDate: string;
  generatedBy: "openai" | "sample";
}

// ---------------- 已儲存的行程（localStorage） ----------------

export interface Expense {
  id: string;
  date: string; // "YYYY-MM-DD"
  name: string;
  amount: number; // 消費幣別
  method: PaymentMethod;
  note?: string;
  createdAt: number;
}

export interface TripReview {
  rating: number; // 1..5
  wentWell?: string;
  overUnder?: string;
  notes?: string;
  updatedAt: number;
}

export interface MoodStory {
  mood?: string;
  title?: string;
  body?: string;
  updatedAt: number;
}

export interface SavedTrip {
  id: string;
  createdAt: number;
  destination: string;
  startDate: string;
  endDate: string;
  homeCurrency: CurrencyCode;
  spendingCurrency: CurrencyCode;
  context: TripContext;
  tier: TierKey;
  tierLabel: string;
  itinerary: Itinerary;
  finance: FinanceSummary;
  fxSnapshot: {
    signal: FxSignal;
    currentRate: number;
    ma30: number;
    deviationPct: number;
  };
  expenses: Expense[];
  review?: TripReview;
  story?: MoodStory;
}
