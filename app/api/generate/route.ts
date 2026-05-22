// POST /api/generate
//
// 流程：
//   1. 接收 { destination, startDate, endDate, homeCurrency, spendingCurrency,
//             budgetMin, budgetMax, mood, theme, companions, headcount }。
//   2. 取得該貨幣對的匯率分析（今日匯率 / MA30 / 燈號）。
//   3. 由預算範圍推算 Low / Mid / High 三個級距，各自生成行程與財務。
//   4. 回傳 tiers[] 給前端挑選。

import { NextResponse } from "next/server";
import type {
  GenerateRequest,
  GenerateResponse,
  Itinerary,
  TierKey,
  TierPlan,
  TripContext,
} from "@/lib/types";
import { getFxAnalysis } from "@/lib/fx";
import { computeFinance } from "@/lib/finance";
import {
  generateItineraryWithOpenAI,
  buildSampleItinerary,
  scaleItineraryToTarget,
  type GenContext,
} from "@/lib/openai";
import {
  CURRENCIES,
  baseRate,
  defaultCurrencyForDestination,
  type CurrencyCode,
} from "@/lib/currency";
import {
  MOODS,
  THEMES,
  COMPANIONS,
  TIERS,
  TIER_RICHNESS,
  tierBudgets,
  optionLabel,
} from "@/lib/planning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_DAYS = 1;
const MAX_DAYS = 14;

function isCurrency(code: unknown): code is CurrencyCode {
  return typeof code === "string" && code in CURRENCIES;
}

function diffDaysInclusive(start: string, end: string, fallback = 7): number {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return fallback;
  const days = Math.floor((e.getTime() - s.getTime()) / 86_400_000) + 1;
  if (!Number.isFinite(days)) return fallback;
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, days));
}

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
  const homeCurrency: CurrencyCode = isCurrency(body.homeCurrency) ? body.homeCurrency : "TWD";
  const spendingCurrency: CurrencyCode = isCurrency(body.spendingCurrency)
    ? body.spendingCurrency
    : defaultCurrencyForDestination(destination);

  const budgetMin = Math.max(0, Math.round(Number(body.budgetMin) || 0));
  const budgetMaxRaw = Math.max(0, Math.round(Number(body.budgetMax) || 0));
  const budgetMax = Math.max(budgetMin, budgetMaxRaw);
  const headcount = Math.max(1, Math.round(Number(body.headcount) || 1));
  const mood = body.mood ? String(body.mood) : undefined;
  const theme = body.theme ? String(body.theme) : undefined;
  const companions = body.companions ? String(body.companions) : undefined;

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "請提供出發與回程日期" }, { status: 400 });
  }
  if (budgetMin <= 0 || budgetMax <= 0) {
    return NextResponse.json({ error: "請提供有效的預算範圍" }, { status: 400 });
  }

  const days = diffDaysInclusive(startDate, endDate, 7);
  const budgets = tierBudgets(budgetMin, budgetMax);

  // 將選項 id 轉為人類可讀標籤，供 AI prompt 使用
  const genContext: GenContext = {
    mood: optionLabel(MOODS, mood),
    theme: optionLabel(THEMES, theme),
    companions: optionLabel(COMPANIONS, companions),
    headcount,
  };

  try {
    const fx = await getFxAnalysis(spendingCurrency, homeCurrency);
    const rate = fx.currentRate > 0 ? fx.currentRate : baseRate(spendingCurrency, homeCurrency);

    let generatedBy: GenerateResponse["generatedBy"] = "openai";
    const tierItineraries: Record<TierKey, Itinerary> = {} as Record<TierKey, Itinerary>;

    try {
      // OpenAI：三個級距各生成一次（任何一次失敗即整體退回示範行程）
      await Promise.all(
        TIERS.map(async ({ key }) => {
          const budgetSpending = rate > 0 ? budgets[key] / rate : budgets[key];
          const it = await generateItineraryWithOpenAI({
            destination,
            days,
            startDate,
            budgetSpending,
            currency: spendingCurrency,
            context: genContext,
          });
          if (!it.days.length) throw new Error("EMPTY_ITINERARY");
          tierItineraries[key] = it;
        })
      );
    } catch {
      // 示範行程：建立一份基底，依「豐富度倍率」差異化，再以各級距預算為上限
      generatedBy = "sample";
      const base = buildSampleItinerary(destination, days, spendingCurrency);
      const baseTotal = base.days.reduce(
        (s, d) => s + d.activities.reduce((x, a) => x + (a.estimated_cost || 0), 0),
        0
      );
      for (const { key } of TIERS) {
        const budgetCap = (rate > 0 ? budgets[key] / rate : budgets[key]) * 0.9;
        const desired = baseTotal * TIER_RICHNESS[key];
        const finalTarget = Math.min(desired, budgetCap);
        tierItineraries[key] = scaleItineraryToTarget(base, finalTarget);
      }
    }

    const tiers: TierPlan[] = TIERS.map(({ key, label, tagline }) => {
      const itinerary = applyDates(tierItineraries[key], startDate);
      const finance = computeFinance(itinerary, spendingCurrency, homeCurrency, fx.currentRate);
      return { tier: key, label, tagline, budgetHome: budgets[key], itinerary, finance };
    });

    const context: TripContext = {
      mood,
      theme,
      companions,
      headcount,
      budgetMin,
      budgetMax,
    };

    const response: GenerateResponse = {
      tiers,
      fx,
      context,
      homeCurrency,
      spendingCurrency,
      destination,
      startDate,
      endDate,
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
