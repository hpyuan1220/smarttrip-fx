// 財務計算模組（純函式、可獨立單元測試）
//
// 核心規則：
//   1. 統計行程中所有 payment_method === "cash_only" 的花費總和（消費幣別）。
//   2. 乘以 1.1（10% 預備金）作為「最終建議換匯量」。
//   3. 依幣別進位至合理的提領單位（JPY=1000、KRW=10000、THB=100、USD=20、EUR=10…）。

import type { CurrencyCode, FinanceSummary, Itinerary } from "./types";
import { baseRate, getCurrency } from "./currency";

export const DEFAULT_BUFFER_RATE = 1.1;

/** 無條件進位至指定的提領單位。 */
export function roundUpToDenomination(amount: number, denomination: number): number {
  const d = denomination > 0 ? denomination : 1;
  return Math.ceil(amount / d) * d;
}

/**
 * 依據行程計算換匯與花費摘要。
 *
 * @param itinerary       行程（含消費幣別）
 * @param spendingCurrency 消費幣別
 * @param homeCurrency     本國幣別
 * @param rate             今日匯率（1 spending = ? home）；未提供時用基準匯率
 * @param bufferRate       預備金倍率，預設 1.1
 */
export function computeFinance(
  itinerary: Itinerary,
  spendingCurrency: CurrencyCode,
  homeCurrency: CurrencyCode,
  rate?: number,
  bufferRate: number = DEFAULT_BUFFER_RATE
): FinanceSummary {
  let cashOnlySpending = 0;
  let cardSpending = 0;

  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      const cost = Number(activity.estimated_cost) || 0;
      if (cost <= 0) continue;
      if (activity.payment_method === "cash_only") {
        cashOnlySpending += cost;
      } else {
        cardSpending += cost;
      }
    }
  }

  const totalSpending = cashOnlySpending + cardSpending;
  const denomination = getCurrency(spendingCurrency).cashDenomination;
  const recommendedCashSpending = roundUpToDenomination(cashOnlySpending * bufferRate, denomination);

  const effectiveRate = rate && rate > 0 ? rate : baseRate(spendingCurrency, homeCurrency);
  const estimatedHomeForCash = Math.round(recommendedCashSpending * effectiveRate);

  return {
    currency: spendingCurrency,
    homeCurrency,
    totalSpending,
    cashOnlySpending,
    cardSpending,
    bufferRate,
    recommendedCashSpending,
    estimatedHomeForCash,
  };
}
