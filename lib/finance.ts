// 財務計算模組（純函式、可獨立單元測試）
//
// 核心規則：
//   1. 統計行程中所有 payment_method === "cash_only" 的花費總和。
//   2. 乘以 1.1（10% 預備金）作為「最終建議換匯日幣」。
//   3. 為了符合現金提領 / 換匯實務，進位至最接近的千元日幣。

import type { Itinerary, FinanceSummary } from "./types";

export const DEFAULT_BUFFER_RATE = 1.1;

/** 將日幣金額無條件進位至最接近的千元（換匯實務常以千元為單位）。 */
export function roundUpToThousandYen(amount: number): number {
  return Math.ceil(amount / 1000) * 1000;
}

/**
 * 依據行程計算換匯與花費摘要。
 *
 * @param itinerary  由 AI / 示範資料產生的行程
 * @param twdPerJpy  目前匯率（1 日圓 = ? 台幣），用來估算需要的台幣
 * @param bufferRate 預備金倍率，預設 1.1（保留 10% 緩衝）
 */
export function computeFinance(
  itinerary: Itinerary,
  twdPerJpy: number,
  bufferRate: number = DEFAULT_BUFFER_RATE
): FinanceSummary {
  let cashOnlyJpy = 0;
  let cardJpy = 0;

  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      const cost = Number(activity.estimated_cost_jpy) || 0;
      if (cost <= 0) continue;
      if (activity.payment_method === "cash_only") {
        cashOnlyJpy += cost;
      } else {
        cardJpy += cost;
      }
    }
  }

  const totalJpy = cashOnlyJpy + cardJpy;
  const recommendedCashJpy = roundUpToThousandYen(cashOnlyJpy * bufferRate);
  const estimatedTwdForCash = Math.round(recommendedCashJpy * twdPerJpy);

  return {
    totalJpy,
    cashOnlyJpy,
    cardJpy,
    bufferRate,
    recommendedCashJpy,
    estimatedTwdForCash,
  };
}
