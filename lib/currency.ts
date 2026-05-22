// 幣別與目的地設定（前後端共用，純資料 / 純函式）

export interface CurrencyMeta {
  code: string;
  label: string; // 顯示用，如「日圓 JPY」
  locale: string; // Intl 格式化用
  usdPerUnit: number; // 1 單位該幣別 ≈ 多少美元（用來換算任意貨幣對）
  cashDenomination: number; // 換匯 / 提領的進位單位
}

// 常見旅遊幣別大清單（usdPerUnit 為約略基準值，串接 EXCHANGE_API_KEY 後以即時匯率為準）
export const CURRENCIES = {
  USD: { code: "USD", label: "美元 USD", locale: "en-US", usdPerUnit: 1, cashDenomination: 20 },
  EUR: { code: "EUR", label: "歐元 EUR", locale: "de-DE", usdPerUnit: 1.08, cashDenomination: 10 },
  GBP: { code: "GBP", label: "英鎊 GBP", locale: "en-GB", usdPerUnit: 1.27, cashDenomination: 10 },
  JPY: { code: "JPY", label: "日圓 JPY", locale: "ja-JP", usdPerUnit: 0.0067, cashDenomination: 1000 },
  CNY: { code: "CNY", label: "人民幣 CNY", locale: "zh-CN", usdPerUnit: 0.138, cashDenomination: 100 },
  KRW: { code: "KRW", label: "韓元 KRW", locale: "ko-KR", usdPerUnit: 0.00073, cashDenomination: 10000 },
  THB: { code: "THB", label: "泰銖 THB", locale: "th-TH", usdPerUnit: 0.0275, cashDenomination: 100 },
  TWD: { code: "TWD", label: "新台幣 TWD", locale: "zh-TW", usdPerUnit: 0.0312, cashDenomination: 100 },
  HKD: { code: "HKD", label: "港幣 HKD", locale: "zh-HK", usdPerUnit: 0.128, cashDenomination: 100 },
  SGD: { code: "SGD", label: "新加坡幣 SGD", locale: "en-SG", usdPerUnit: 0.74, cashDenomination: 10 },
  MYR: { code: "MYR", label: "馬來西亞令吉 MYR", locale: "ms-MY", usdPerUnit: 0.212, cashDenomination: 50 },
  VND: { code: "VND", label: "越南盾 VND", locale: "vi-VN", usdPerUnit: 0.0000395, cashDenomination: 100000 },
  IDR: { code: "IDR", label: "印尼盾 IDR", locale: "id-ID", usdPerUnit: 0.0000625, cashDenomination: 50000 },
  PHP: { code: "PHP", label: "菲律賓披索 PHP", locale: "en-PH", usdPerUnit: 0.0177, cashDenomination: 500 },
  INR: { code: "INR", label: "印度盧比 INR", locale: "en-IN", usdPerUnit: 0.012, cashDenomination: 500 },
  AUD: { code: "AUD", label: "澳幣 AUD", locale: "en-AU", usdPerUnit: 0.66, cashDenomination: 20 },
  NZD: { code: "NZD", label: "紐西蘭幣 NZD", locale: "en-NZ", usdPerUnit: 0.6, cashDenomination: 20 },
  CAD: { code: "CAD", label: "加幣 CAD", locale: "en-CA", usdPerUnit: 0.73, cashDenomination: 20 },
  CHF: { code: "CHF", label: "瑞士法郎 CHF", locale: "de-CH", usdPerUnit: 1.11, cashDenomination: 10 },
  MOP: { code: "MOP", label: "澳門幣 MOP", locale: "zh-MO", usdPerUnit: 0.124, cashDenomination: 100 },
  SEK: { code: "SEK", label: "瑞典克朗 SEK", locale: "sv-SE", usdPerUnit: 0.094, cashDenomination: 100 },
  NOK: { code: "NOK", label: "挪威克朗 NOK", locale: "nb-NO", usdPerUnit: 0.092, cashDenomination: 100 },
  DKK: { code: "DKK", label: "丹麥克朗 DKK", locale: "da-DK", usdPerUnit: 0.145, cashDenomination: 100 },
  CZK: { code: "CZK", label: "捷克克朗 CZK", locale: "cs-CZ", usdPerUnit: 0.043, cashDenomination: 500 },
  PLN: { code: "PLN", label: "波蘭茲羅提 PLN", locale: "pl-PL", usdPerUnit: 0.25, cashDenomination: 50 },
  HUF: { code: "HUF", label: "匈牙利福林 HUF", locale: "hu-HU", usdPerUnit: 0.0027, cashDenomination: 5000 },
  TRY: { code: "TRY", label: "土耳其里拉 TRY", locale: "tr-TR", usdPerUnit: 0.03, cashDenomination: 100 },
  AED: { code: "AED", label: "阿聯酋迪拉姆 AED", locale: "ar-AE", usdPerUnit: 0.272, cashDenomination: 50 },
  SAR: { code: "SAR", label: "沙烏地里亞爾 SAR", locale: "ar-SA", usdPerUnit: 0.267, cashDenomination: 50 },
  ZAR: { code: "ZAR", label: "南非蘭特 ZAR", locale: "en-ZA", usdPerUnit: 0.054, cashDenomination: 100 },
  MXN: { code: "MXN", label: "墨西哥披索 MXN", locale: "es-MX", usdPerUnit: 0.058, cashDenomination: 200 },
  BRL: { code: "BRL", label: "巴西里爾 BRL", locale: "pt-BR", usdPerUnit: 0.19, cashDenomination: 50 },
  EGP: { code: "EGP", label: "埃及鎊 EGP", locale: "ar-EG", usdPerUnit: 0.02, cashDenomination: 100 },
} satisfies Record<string, CurrencyMeta>;

export type CurrencyCode = keyof typeof CURRENCIES;

// 消費幣別下拉（依旅遊熱門度排序）
export const SPENDING_CURRENCIES: CurrencyCode[] = [
  "JPY", "KRW", "THB", "EUR", "USD", "GBP", "CNY", "HKD", "SGD", "MYR",
  "VND", "IDR", "PHP", "INR", "AUD", "NZD", "CAD", "CHF", "MOP", "SEK",
  "NOK", "DKK", "CZK", "PLN", "HUF", "TRY", "AED", "SAR", "ZAR", "MXN",
  "BRL", "EGP", "TWD",
];

// 本國幣別下拉（依常見出發地排序）
export const HOME_CURRENCIES: CurrencyCode[] = [
  "TWD", "USD", "JPY", "EUR", "CNY", "HKD", "GBP", "KRW", "SGD", "AUD",
  "CAD", "CHF", "THB", "MYR",
];

export function getCurrency(code: string | undefined): CurrencyMeta {
  return CURRENCIES[(code as CurrencyCode)] ?? CURRENCIES.USD;
}

/** 基準匯率：1 單位 spending ≈ 多少 home（透過美元做交叉匯率）。 */
export function baseRate(spending: string, home: string): number {
  const s = getCurrency(spending);
  const h = getCurrency(home);
  return s.usdPerUnit / h.usdPerUnit;
}

/** 以幣別格式化金額（行程花費皆為整數的當地貨幣單位）。 */
export function formatMoney(amount: number, code: string, fractionDigits = 0): string {
  const meta = getCurrency(code);
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: meta.code,
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${meta.code} ${Math.round(amount).toLocaleString()}`;
  }
}

// --- 目的地預設 ---

export interface DestinationPreset {
  id: string;
  label: string; // 同時作為送往 API 的 destination 字串
  defaultCurrency: CurrencyCode;
}

export const DESTINATIONS: DestinationPreset[] = [
  { id: "kansai", label: "日本・關西", defaultCurrency: "JPY" },
  { id: "tokyo", label: "日本・東京", defaultCurrency: "JPY" },
  { id: "seoul", label: "韓國・首爾", defaultCurrency: "KRW" },
  { id: "bangkok", label: "泰國・曼谷", defaultCurrency: "THB" },
  { id: "paris", label: "法國・巴黎", defaultCurrency: "EUR" },
  { id: "rome", label: "義大利・羅馬", defaultCurrency: "EUR" },
  { id: "barcelona", label: "西班牙・巴塞隆納", defaultCurrency: "EUR" },
  { id: "london", label: "英國・倫敦", defaultCurrency: "GBP" },
  { id: "zurich", label: "瑞士・蘇黎世", defaultCurrency: "CHF" },
  { id: "istanbul", label: "土耳其・伊斯坦堡", defaultCurrency: "TRY" },
  { id: "dubai", label: "阿聯酋・杜拜", defaultCurrency: "AED" },
  { id: "newyork", label: "美國・紐約", defaultCurrency: "USD" },
  { id: "vancouver", label: "加拿大・溫哥華", defaultCurrency: "CAD" },
  { id: "sydney", label: "澳洲・雪梨", defaultCurrency: "AUD" },
  { id: "shanghai", label: "中國・上海", defaultCurrency: "CNY" },
  { id: "hongkong", label: "香港", defaultCurrency: "HKD" },
  { id: "macau", label: "澳門", defaultCurrency: "MOP" },
  { id: "singapore", label: "新加坡", defaultCurrency: "SGD" },
  { id: "kualalumpur", label: "馬來西亞・吉隆坡", defaultCurrency: "MYR" },
  { id: "hochiminh", label: "越南・胡志明市", defaultCurrency: "VND" },
  { id: "bali", label: "印尼・峇里島", defaultCurrency: "IDR" },
];

/** 由目的地字串推斷地區 key（用於挑選示範行程模板）。 */
export function regionKeyFromDestination(destination: string): string {
  const d = (destination || "").toLowerCase();
  if (/關西|大阪|京都|奈良|神戶|kansai|osaka|kyoto/.test(d)) return "kansai";
  if (/東京|tokyo/.test(d)) return "tokyo";
  if (/首爾|首尔|韓|韩|seoul|korea/.test(d)) return "seoul";
  if (/曼谷|泰|bangkok|thai/.test(d)) return "bangkok";
  if (/巴黎|法|paris|france/.test(d)) return "paris";
  return "generic";
}

/** 由目的地推斷預設消費幣別：先比對預設清單，再比對地區關鍵字，最後預設美元。 */
export function defaultCurrencyForDestination(destination: string): CurrencyCode {
  const exact = DESTINATIONS.find((d) => d.label === destination);
  if (exact) return exact.defaultCurrency;
  const key = regionKeyFromDestination(destination);
  const preset = DESTINATIONS.find((x) => x.id === key);
  return preset?.defaultCurrency ?? "USD";
}
