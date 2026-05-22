// 匯率與燈號模組（支援任意貨幣對）
//
// 規則：
//   - 讀取 30 天 spending/home 歷史資料（1 單位消費幣別 = ? 本國幣別）。
//   - 計算 30 天均線（MA30）。
//   - 以「今日匯率」對比 MA30 的偏離程度產生紅綠燈訊號：
//       今日明顯低於均線（消費幣別較便宜） → STRONG_BUY（綠燈）
//       今日略低於 / 接近均線               → BUY（黃燈）
//       今日高於均線（消費幣別較貴）         → HOLD（紅燈）
//
// 資料來源：若設定 EXCHANGE_API_KEY 則串接 exchangerate.host，
//          否則使用本機可重現的模擬資料（符合「模擬或串接」需求）。

import type { CurrencyCode, FxAnalysis, FxHistoryPoint, FxSignal } from "./types";
import { baseRate } from "./currency";

const DAYS = 30;

/** STRONG_BUY 門檻：今日比 MA30 低於此百分比（消費幣別更便宜）。 */
const STRONG_BUY_THRESHOLD = -1.5;
/** BUY 門檻：今日不高於 MA30 此百分比。 */
const BUY_THRESHOLD = 0.5;

function toSignal(deviationPct: number): FxSignal {
  if (deviationPct <= STRONG_BUY_THRESHOLD) return "STRONG_BUY";
  if (deviationPct <= BUY_THRESHOLD) return "BUY";
  return "HOLD";
}

function buildAdvice(
  signal: FxSignal,
  deviationPct: number,
  spending: CurrencyCode,
  home: CurrencyCode
): string {
  const dev = Math.abs(deviationPct).toFixed(2);
  switch (signal) {
    case "STRONG_BUY":
      return `今日 ${spending}/${home} 明顯低於 30 天均線（便宜約 ${dev}%），${spending} 正處於相對低點，建議一次換足所需現金。`;
    case "BUY":
      return `今日 ${spending}/${home} 接近 / 略低於 30 天均線（偏離 ${dev}%），屬合理區間，可分批換入所需現金。`;
    case "HOLD":
    default:
      return `今日 ${spending}/${home} 高於 30 天均線（貴約 ${dev}%），${spending} 偏貴，建議先換最低必要現金、其餘觀望。`;
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** 依匯率量級決定四捨五入的小數位數，避免大/小幣別顯示失真。 */
function precisionFor(rate: number): number {
  if (rate >= 100) return 2;
  if (rate >= 1) return 3;
  if (rate >= 0.01) return 4;
  return 6;
}

// --- 模擬資料（可重現：以「當天日期 + 貨幣對」為種子，同一天結果穩定） ---

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

function pairSeed(spending: string, home: string): number {
  let h = 0;
  const s = `${spending}_${home}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function simulateHistory(spending: CurrencyCode, home: CurrencyCode): FxHistoryPoint[] {
  const today = new Date();
  const base = baseRate(spending, home);
  const rand = mulberry32(dateSeed(today) ^ pairSeed(spending, home));
  const prec = precisionFor(base);
  const points: FxHistoryPoint[] = [];

  // 正弦緩慢波動 + 雜訊（幅度相對 base 約 ±1.2%），最後讓「今日」略低於近期均值。
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const idx = DAYS - 1 - i; // 0..DAYS-1（由舊到新）
    const wave = Math.sin(idx / 4) * base * 0.012;
    const noise = (rand() - 0.5) * base * 0.008;
    let rate = base + wave + noise;
    if (idx === DAYS - 1) rate -= base * 0.01; // 讓今日偏低，傾向 BUY / STRONG_BUY
    points.push({ date: isoDate(d), rate: Number(rate.toFixed(prec)) });
  }
  return points;
}

// --- 真實資料（exchangerate.host，需 EXCHANGE_API_KEY） ---

async function fetchLiveHistory(
  apiKey: string,
  spending: CurrencyCode,
  home: CurrencyCode
): Promise<FxHistoryPoint[] | null> {
  try {
    const end = new Date();
    const start = new Date();
    start.setUTCDate(end.getUTCDate() - (DAYS - 1));
    const url =
      `https://api.exchangerate.host/timeframe` +
      `?access_key=${encodeURIComponent(apiKey)}` +
      `&start_date=${isoDate(start)}&end_date=${isoDate(end)}` +
      `&source=${spending}&currencies=${home}`;

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.success === false || !data.quotes) return null;

    const key = `${spending}${home}`;
    const points: FxHistoryPoint[] = Object.keys(data.quotes)
      .sort()
      .map((date) => ({ date, rate: Number(data.quotes[date]?.[key]) }))
      .filter((p) => Number.isFinite(p.rate) && p.rate > 0);

    return points.length >= 5 ? points.slice(-DAYS) : null;
  } catch {
    return null;
  }
}

// --- 真實資料（免金鑰：fawazahmed0 currency-api，支援 TWD 等多數幣別、含每日歷史） ---

async function fetchRateForDate(date: string, base: string, quote: string): Promise<number | null> {
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${base}.json`,
    `https://${date}.currency-api.pages.dev/v1/currencies/${base}.json`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(4500),
        next: { revalidate: 3600 },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const r = data?.[base]?.[quote];
      if (Number.isFinite(r) && r > 0) return Number(r);
    } catch {
      /* try next host */
    }
  }
  return null;
}

async function fetchKeylessHistory(
  spending: CurrencyCode,
  home: CurrencyCode
): Promise<FxHistoryPoint[] | null> {
  const base = spending.toLowerCase();
  const quote = home.toLowerCase();
  const today = new Date();

  // 取樣：近 28 天每 2 天一點（約 15 點）估算 MA；另抓 latest 當今日值
  const targets: string[] = [];
  for (let i = 28; i >= 0; i -= 2) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    targets.push(isoDate(d));
  }

  const sampled = await Promise.all(
    targets.map(async (ds) => {
      const r = await fetchRateForDate(ds, base, quote);
      return r != null ? { date: ds, rate: r } : null;
    })
  );
  const latest = await fetchRateForDate("latest", base, quote);

  const byDate = new Map<string, number>();
  for (const p of sampled) if (p) byDate.set(p.date, p.rate);
  if (latest != null) byDate.set(isoDate(today), latest);

  const points: FxHistoryPoint[] = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, rate]) => ({ date, rate: Number(rate.toFixed(8)) }));

  return points.length >= 5 ? points : null;
}

/** 取得匯率分析：今日匯率、MA30、偏離百分比、燈號與文字建議。 */
export async function getFxAnalysis(
  spendingCurrency: CurrencyCode,
  homeCurrency: CurrencyCode
): Promise<FxAnalysis> {
  let history: FxHistoryPoint[] | null = null;
  let source: "live" | "simulated" = "simulated";

  if (spendingCurrency !== homeCurrency) {
    // 1) 免金鑰即時匯率（主要來源）
    history = await fetchKeylessHistory(spendingCurrency, homeCurrency);
    if (history) source = "live";

    // 2) 備援：若有設定 EXCHANGE_API_KEY
    const apiKey = process.env.EXCHANGE_API_KEY;
    if (!history && apiKey) {
      history = await fetchLiveHistory(apiKey, spendingCurrency, homeCurrency);
      if (history) source = "live";
    }
  }

  // 3) 最後退回模擬（會在 UI 標示為「模擬資料」）
  if (!history) history = simulateHistory(spendingCurrency, homeCurrency);

  const rates = history.map((h) => h.rate);
  const currentRate = rates[rates.length - 1];
  const ma30 = average(rates);
  const deviationPct = ma30 > 0 ? ((currentRate - ma30) / ma30) * 100 : 0;
  const signal = toSignal(deviationPct);
  const advice = buildAdvice(signal, deviationPct, spendingCurrency, homeCurrency);

  return {
    spendingCurrency,
    homeCurrency,
    signal,
    currentRate,
    ma30,
    deviationPct,
    advice,
    history,
    source,
  };
}
