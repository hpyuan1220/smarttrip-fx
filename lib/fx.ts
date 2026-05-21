// 匯率與燈號模組
//
// 規則：
//   - 讀取 30 天 TWD/JPY 歷史資料（1 日圓兌台幣）。
//   - 計算 30 天均線（MA30）。
//   - 以「今日匯率」對比 MA30 的偏離程度產生紅綠燈訊號：
//       今日明顯低於均線（日圓較便宜） → STRONG_BUY（綠燈）
//       今日略低於 / 接近均線           → BUY（黃燈）
//       今日高於均線（日圓較貴）         → HOLD（紅燈）
//
// 資料來源：若設定 EXCHANGE_API_KEY 則串接 exchangerate.host，
//          否則使用本機可重現的模擬資料（符合「模擬或串接」需求）。

import type { FxAnalysis, FxHistoryPoint, FxSignal } from "./types";

const DAYS = 30;
const BASE_RATE = 0.2150; // 1 日圓 ≈ 0.215 台幣（模擬基準）

/** STRONG_BUY 門檻：今日比 MA30 低於此百分比（日圓更便宜）。 */
const STRONG_BUY_THRESHOLD = -1.5;
/** BUY 門檻：今日不高於 MA30 此百分比。 */
const BUY_THRESHOLD = 0.5;

function toSignal(deviationPct: number): FxSignal {
  if (deviationPct <= STRONG_BUY_THRESHOLD) return "STRONG_BUY";
  if (deviationPct <= BUY_THRESHOLD) return "BUY";
  return "HOLD";
}

function buildAdvice(signal: FxSignal, deviationPct: number, current: number, ma30: number): string {
  const dev = Math.abs(deviationPct).toFixed(2);
  const c = current.toFixed(4);
  const m = ma30.toFixed(4);
  switch (signal) {
    case "STRONG_BUY":
      return `今日匯率 ${c} 明顯低於 30 天均線 ${m}（便宜約 ${dev}%），日圓正處於相對低點，建議一次換足所需現金。`;
    case "BUY":
      return `今日匯率 ${c} 接近 / 略低於 30 天均線 ${m}（偏離 ${dev}%），屬合理區間，可分批換入所需現金。`;
    case "HOLD":
    default:
      return `今日匯率 ${c} 高於 30 天均線 ${m}（貴約 ${dev}%），日圓偏貴，建議先換最低必要現金、其餘觀望。`;
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// --- 模擬資料（可重現：以「當天日期」為種子，同一天結果穩定） ---

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateSeed(d: Date): number {
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function simulateHistory(): FxHistoryPoint[] {
  const today = new Date();
  const rand = mulberry32(dateSeed(today));
  const points: FxHistoryPoint[] = [];

  // 以正弦緩慢波動 + 雜訊模擬市場，最後讓「今日」略低於近期均值，呈現可換匯時機。
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const idx = DAYS - 1 - i; // 0..DAYS-1（由舊到新）
    const wave = Math.sin(idx / 4) * 0.0025; // 緩慢趨勢
    const noise = (rand() - 0.5) * 0.0018; // 日常雜訊
    let rate = BASE_RATE + wave + noise;
    if (idx === DAYS - 1) rate -= 0.0022; // 讓今日偏低，傾向 BUY / STRONG_BUY
    points.push({ date: isoDate(d), rate: Number(rate.toFixed(4)) });
  }
  return points;
}

// --- 真實資料（exchangerate.host，需 EXCHANGE_API_KEY） ---

async function fetchLiveHistory(apiKey: string): Promise<FxHistoryPoint[] | null> {
  try {
    const end = new Date();
    const start = new Date();
    start.setUTCDate(end.getUTCDate() - (DAYS - 1));
    const url =
      `https://api.exchangerate.host/timeframe` +
      `?access_key=${encodeURIComponent(apiKey)}` +
      `&start_date=${isoDate(start)}&end_date=${isoDate(end)}` +
      `&source=JPY&currencies=TWD`;

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.success === false || !data.quotes) return null;

    const points: FxHistoryPoint[] = Object.keys(data.quotes)
      .sort()
      .map((date) => ({
        date,
        rate: Number(Number(data.quotes[date]?.JPYTWD).toFixed(4)),
      }))
      .filter((p) => Number.isFinite(p.rate) && p.rate > 0);

    return points.length >= 5 ? points.slice(-DAYS) : null;
  } catch {
    return null;
  }
}

/** 取得匯率分析：今日匯率、MA30、偏離百分比、燈號與文字建議。 */
export async function getFxAnalysis(): Promise<FxAnalysis> {
  const apiKey = process.env.EXCHANGE_API_KEY;
  let history: FxHistoryPoint[] | null = null;
  let source: "live" | "simulated" = "simulated";

  if (apiKey) {
    history = await fetchLiveHistory(apiKey);
    if (history) source = "live";
  }
  if (!history) history = simulateHistory();

  const rates = history.map((h) => h.rate);
  const currentRate = rates[rates.length - 1];
  const ma30 = average(rates);
  const deviationPct = ((currentRate - ma30) / ma30) * 100;
  const signal = toSignal(deviationPct);
  const advice = buildAdvice(signal, deviationPct, currentRate, ma30);

  return {
    signal,
    currentRate,
    ma30,
    deviationPct,
    advice,
    history,
    source,
  };
}
