// 共用型別定義（前後端共用）

export type PaymentMethod = "cash_only" | "card_acceptable";

export interface ActivityItem {
  time: string; // "HH:MM"
  name: string; // 景點 / 行程名
  description?: string;
  estimated_cost_jpy: number; // 預估花費（日幣）
  payment_method: PaymentMethod; // 支付標籤
}

export interface DayPlan {
  day: number; // 1..N
  date?: string; // "YYYY-MM-DD"
  title: string; // 當日主題，例如「大阪市區」
  activities: ActivityItem[];
}

export interface Itinerary {
  destination: string;
  days: DayPlan[];
}

export type FxSignal = "STRONG_BUY" | "BUY" | "HOLD";

export interface FxHistoryPoint {
  date: string; // "YYYY-MM-DD"
  rate: number; // TWD per 1 JPY
}

export interface FxAnalysis {
  signal: FxSignal;
  currentRate: number; // 今日匯率（1 日圓 = ? 台幣）
  ma30: number; // 30 天均線
  deviationPct: number; // 今日相對 MA30 偏離百分比
  advice: string; // 文字建議
  history: FxHistoryPoint[]; // 30 天歷史資料
  source: "live" | "simulated";
}

export interface FinanceSummary {
  totalJpy: number; // 全程預估總花費
  cashOnlyJpy: number; // 僅收現金項目總和
  cardJpy: number; // 可刷卡項目總和
  bufferRate: number; // 預備金倍率（1.1）
  recommendedCashJpy: number; // 建議換匯日幣（含 10% 預備金、進位至千元）
  estimatedTwdForCash: number; // 換這些現金約需台幣
}

export interface GenerateRequest {
  destination: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  budgetTwd: number;
}

export interface GenerateResponse {
  itinerary: Itinerary;
  finance: FinanceSummary;
  fx: FxAnalysis;
  budgetTwd: number;
  generatedBy: "openai" | "sample";
}
