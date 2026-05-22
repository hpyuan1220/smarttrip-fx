// 幣別與目的地設定（前後端共用，純資料 / 純函式）

export type CurrencyCode = "JPY" | "KRW" | "THB" | "EUR" | "USD" | "TWD";

export interface CurrencyMeta {
  code: CurrencyCode;
  label: string; // 顯示用，如「日圓 JPY」
  locale: string; // Intl 格式化用
  usdPerUnit: number; // 1 單位該幣別 ≈ 多少美元（用來換算任意貨幣對）
  cashDenomination: number; // 換匯 / 提領的進位單位
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  JPY: { code: "JPY", label: "日圓 JPY", locale: "ja-JP", usdPerUnit: 0.0067, cashDenomination: 1000 },
  KRW: { code: "KRW", label: "韓元 KRW", locale: "ko-KR", usdPerUnit: 0.00073, cashDenomination: 10000 },
  THB: { code: "THB", label: "泰銖 THB", locale: "th-TH", usdPerUnit: 0.0275, cashDenomination: 100 },
  EUR: { code: "EUR", label: "歐元 EUR", locale: "de-DE", usdPerUnit: 1.08, cashDenomination: 10 },
  USD: { code: "USD", label: "美元 USD", locale: "en-US", usdPerUnit: 1, cashDenomination: 20 },
  TWD: { code: "TWD", label: "新台幣 TWD", locale: "zh-TW", usdPerUnit: 0.0312, cashDenomination: 100 },
};

export const SPENDING_CURRENCIES: CurrencyCode[] = ["JPY", "KRW", "THB", "EUR", "USD"];
export const HOME_CURRENCIES: CurrencyCode[] = ["TWD", "USD", "JPY", "EUR", "KRW"];

export function getCurrency(code: string | undefined): CurrencyMeta {
  return CURRENCIES[(code as CurrencyCode)] ?? CURRENCIES.JPY;
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
  { id: "newyork", label: "美國・紐約", defaultCurrency: "USD" },
];

/** 由目的地字串推斷地區 key（用於挑選示範行程模板）。 */
export function regionKeyFromDestination(destination: string): string {
  const d = (destination || "").toLowerCase();
  if (/關西|大阪|京都|奈良|神戶|kansai|osaka|kyoto/.test(d)) return "kansai";
  if (/東京|tokyo/.test(d)) return "tokyo";
  if (/首爾|首尔|韓|韩|seoul|korea/.test(d)) return "seoul";
  if (/曼谷|泰|bangkok|thai/.test(d)) return "bangkok";
  if (/巴黎|法|paris|france/.test(d)) return "paris";
  if (/紐約|纽约|美國|美国|new\s*york|usa|america/.test(d)) return "newyork";
  return "generic";
}

/** 由目的地推斷預設消費幣別。 */
export function defaultCurrencyForDestination(destination: string): CurrencyCode {
  const key = regionKeyFromDestination(destination);
  const preset = DESTINATIONS.find((x) => x.id === key);
  return preset?.defaultCurrency ?? "USD";
}
