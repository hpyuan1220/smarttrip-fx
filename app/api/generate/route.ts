// POST /api/generate
//
// 流程：
//   1. 接收 { destination, startDate, endDate, budget, homeCurrency, spendingCurrency }。
//   2. 取得該貨幣對的匯率分析（今日匯率 / MA30 / 燈號）。
//   3. 將本國幣別預算換算為消費幣別，呼叫 OpenAI 生成帶支付標籤的行程；無金鑰則用示範行程。
//   4. 用財務模組計算「建議換匯量」（cash_only 總和 × 1.1，依幣別進位）。
//   5. 回傳整合結果給前端。

import { NextResponse } from "next/server";
import type { GenerateRequest, GenerateResponse, Itinerary } from "@/lib/types";
import { getFxAnalysis } from "@/lib/fx";
import { computeFinance } from "@/lib/finance";
import { generateItineraryWithOpenAI, buildSampleItinerary } from "@/lib/openai";
import {
  CURRENCIES,
  baseRate,
  defaultCurrencyForDestination,
  type CurrencyCode,
} from "@/lib/currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_DAYS = 1;
const MAX_DAYS = 14;

function isCurrency(code: unknown): code is CurrencyCode {
  return typeof code === "string" && code in CURRENCIES;
}

/** 計算兩個日期之間的天數（含頭尾）。無效時回傳預設值。 */
function diffDaysInclusive(start: string, end: string, fallback = 7): number {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return fallback;
  const days = Math.floor((e.getTime() - s.getTime()) / 86_400_000) + 1;
  if (!Number.isFinite(days)) return fallback;
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, days));
}

/** 為行程每天填上實際日期。 */
function applyDates(itinerary: Itinerary, startDate: string): Itinerary {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return itinerary;
  return {
    ...itinerary,
    days: itinerary.days.map((d, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return { ...d, date: date.toISOString().slice(0, 10) };
    }),
  };
}

export async function POST(req: Request) {
  let body: Partial<GenerateRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤（非合法 JSON）" }, { status: 400 });
  }

  const destination = (body.destination || "關西").toString().trim() || "關西";
  const startDate = (body.startDate || "").toString();
  const endDate = (body.endDate || "").toString();
  const budget = Math.max(0, Math.round(Number(body.budget) || 0));
  const homeCurrency: CurrencyCode = isCurrency(body.homeCurrency) ? body.homeCurrency : "TWD";
  const spendingCurrency: CurrencyCode = isCurrency(body.spendingCurrency)
    ? body.spendingCurrency
    : defaultCurrencyForDestination(destination);

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "請提供出發與回程日期" }, { status: 400 });
  }
  if (budget <= 0) {
    return NextResponse.json({ error: "請提供有效的預算總額" }, { status: 400 });
  }

  const days = diffDaysInclusive(startDate, endDate, 7);

  try {
    // 1) 匯率分析（同時拿到換算用的今日匯率：1 spending = ? home）
    const fx = await getFxAnalysis(spendingCurrency, homeCurrency);

    // 2) 將本國幣別預算換算為消費幣別，作為 AI 規劃花費的上限參考
    const rate = fx.currentRate > 0 ? fx.currentRate : baseRate(spendingCurrency, homeCurrency);
    const budgetSpending = rate > 0 ? budget / rate : budget;

    // 3) 生成行程（OpenAI；失敗則退回示範行程）
    let itinerary: Itinerary;
    let generatedBy: GenerateResponse["generatedBy"] = "openai";
    try {
      itinerary = await generateItineraryWithOpenAI({
        destination,
        days,
        startDate,
        budgetSpending,
        currency: spendingCurrency,
      });
      if (!itinerary.days.length) throw new Error("EMPTY_ITINERARY");
    } catch {
      itinerary = buildSampleItinerary(destination, days, spendingCurrency);
      generatedBy = "sample";
    }

    itinerary = applyDates(itinerary, startDate);

    // 4) 財務計算（cash_only × 1.1，依幣別進位）
    const finance = computeFinance(itinerary, spendingCurrency, homeCurrency, fx.currentRate);

    const response: GenerateResponse = {
      itinerary,
      finance,
      fx,
      budget,
      homeCurrency,
      generatedBy,
    };

    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      { error: "產生行程時發生錯誤", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
