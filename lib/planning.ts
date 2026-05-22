// 規劃選項與級距設定（前後端共用，純資料 / 純函式）
//
// 定位：簡單、快速的個人規劃器，給「想臨時逃離一下」的人。

import type { TierKey } from "./types";

export interface Option {
  id: string;
  label: string;
  emoji: string;
}

// 心情
export const MOODS: Option[] = [
  { id: "relax", label: "放空療癒", emoji: "🛀" },
  { id: "adventure", label: "興奮探險", emoji: "🧗" },
  { id: "romantic", label: "浪漫約會", emoji: "💞" },
  { id: "foodie", label: "美食慾望", emoji: "🍜" },
  { id: "culture", label: "文青藝術", emoji: "🎨" },
  { id: "shopping", label: "購物血拼", emoji: "🛍️" },
  { id: "nature", label: "親近自然", emoji: "🌿" },
  { id: "escape", label: "說走就走", emoji: "🏃" },
];

// 主題
export const THEMES: Option[] = [
  { id: "food", label: "美食巡禮", emoji: "🍱" },
  { id: "history", label: "文化歷史", emoji: "🏛️" },
  { id: "outdoor", label: "自然戶外", emoji: "🏞️" },
  { id: "shopping", label: "購物時尚", emoji: "👜" },
  { id: "wellness", label: "放鬆療癒", emoji: "💆" },
  { id: "nightlife", label: "夜生活", emoji: "🌃" },
  { id: "family", label: "親子同樂", emoji: "👨‍👩‍👧" },
  { id: "photo", label: "攝影打卡", emoji: "📸" },
];

// 同行（伴侶成分）
export const COMPANIONS: Option[] = [
  { id: "solo", label: "一個人", emoji: "🧍" },
  { id: "couple", label: "情侶", emoji: "👩‍❤️‍👨" },
  { id: "friends", label: "朋友", emoji: "👯" },
  { id: "family", label: "家人", emoji: "👪" },
  { id: "colleagues", label: "同事", emoji: "🧑‍🤝‍🧑" },
];

export function optionLabel(options: Option[], id?: string): string | undefined {
  if (!id) return undefined;
  return options.find((o) => o.id === id)?.label;
}

export function optionEmoji(options: Option[], id?: string): string {
  if (!id) return "";
  return options.find((o) => o.id === id)?.emoji ?? "";
}

// 級距
export const TIERS: { key: TierKey; label: string; tagline: string }[] = [
  { key: "low", label: "輕簡", tagline: "省錢逃離" },
  { key: "mid", label: "標準", tagline: "剛剛好" },
  { key: "high", label: "盡興", tagline: "寵愛自己" },
];

// 各級距相對基底行程的「豐富度」倍率（示範行程用，會再以該級距預算為上限）
export const TIER_RICHNESS: Record<TierKey, number> = {
  low: 0.75,
  mid: 1.05,
  high: 1.6,
};

/** 由預算範圍推算三個級距對應的本國幣別預算。 */
export function tierBudgets(budgetMin: number, budgetMax: number): Record<TierKey, number> {
  const lo = Math.min(budgetMin, budgetMax);
  const hi = Math.max(budgetMin, budgetMax);
  return {
    low: Math.round(lo),
    mid: Math.round((lo + hi) / 2),
    high: Math.round(hi),
  };
}
