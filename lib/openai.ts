// OpenAI 行程生成模組（多目的地 + 多幣別）
//
// 使用嚴格的 response_format: { type: "json_object" }，要求模型回傳
// 帶有 payment_method: "cash_only" | "card_acceptable" 標籤、且金額為「消費幣別」的行程。
// 未設定 OPENAI_API_KEY 時，回傳內建示範行程（依目的地挑選模板，找不到則用通用模板並換算金額）。

import type { ActivityItem, DayPlan, Itinerary, PaymentMethod } from "./types";
import { CurrencyCode, getCurrency, regionKeyFromDestination } from "./currency";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function buildSystemPrompt(currency: CurrencyCode): string {
  return `你是一位專精國際自由行的旅遊規劃師，同時也是熟悉各國支付習慣的理財顧問。
你必須只輸出「合法的 JSON 物件」，不得包含任何 JSON 以外的文字、註解或 markdown 標記。

請嚴格遵循以下 JSON Schema：
{
  "destination": string,
  "currency": "${currency}",
  "days": [
    {
      "day": number,
      "title": string,
      "activities": [
        {
          "time": string,
          "name": string,
          "description": string,
          "estimated_cost": number,
          "payment_method": "cash_only" | "card_acceptable"
        }
      ]
    }
  ]
}

重要：所有 estimated_cost 必須以「${currency}」為單位的整數金額（不要混用其他貨幣、不要加符號）。

判斷 payment_method 的準則：
- "cash_only"：小型寺廟/神社賽錢、路邊攤與夜市、傳統市場、地方小店、部分在地交通、街頭小吃、紀念品攤。
- "card_acceptable"：百貨公司、連鎖與大型餐廳、飯店、主要交通票券、大型藥妝/超市、主要觀光景點門票。

其他要求：
- 每天安排 3~5 個行程，時間由早到晚排序。
- 全程預估總花費應盡量貼近（但不超過）使用者提供的預算。
- 金額務實合理，符合該目的地與幣別的物價水準。`;
}

export interface GenContext {
  mood?: string;
  theme?: string;
  companions?: string;
  headcount?: number;
}

function contextLine(ctx: GenContext): string {
  const parts: string[] = [];
  if (ctx.mood) parts.push(`心情：${ctx.mood}`);
  if (ctx.theme) parts.push(`主題：${ctx.theme}`);
  if (ctx.companions) parts.push(`同行：${ctx.companions}`);
  if (ctx.headcount && ctx.headcount > 0) parts.push(`人數：${ctx.headcount} 人`);
  return parts.length ? `\n本次旅程偏好 → ${parts.join("、")}（請讓行程風格貼合這些偏好）。` : "";
}

function buildUserPrompt(params: {
  destination: string;
  days: number;
  startDate: string;
  budgetSpending: number;
  currency: CurrencyCode;
  context: GenContext;
}): string {
  return `請規劃一份「${params.destination}」的 ${params.days} 天自由行行程。
出發日期：${params.startDate}
本次可用預算約 ${Math.round(params.budgetSpending).toLocaleString()} ${params.currency}（請讓總花費貼近此金額但不超過）。${contextLine(params.context)}
請依系統指示的 JSON Schema 回傳，所有金額以 ${params.currency} 計，並為每個行程標註正確的 payment_method。`;
}

function clampPayment(value: unknown): PaymentMethod {
  return value === "cash_only" ? "cash_only" : "card_acceptable";
}

/** 將模型回傳的任意 JSON 正規化為安全的 Itinerary 結構。 */
export function normalizeItinerary(
  raw: any,
  fallback: { destination: string; days: number; currency: CurrencyCode }
): Itinerary {
  const destination =
    typeof raw?.destination === "string" && raw.destination.trim()
      ? raw.destination.trim()
      : fallback.destination;

  const rawDays = Array.isArray(raw?.days) ? raw.days : [];
  const days: DayPlan[] = rawDays.map((d: any, i: number): DayPlan => {
    const activities: ActivityItem[] = Array.isArray(d?.activities)
      ? d.activities.map((a: any): ActivityItem => ({
          time: typeof a?.time === "string" ? a.time : "09:00",
          name: typeof a?.name === "string" ? a.name : "自由行程",
          description: typeof a?.description === "string" ? a.description : "",
          // 同時容錯舊欄位 estimated_cost_jpy
          estimated_cost: Math.max(0, Math.round(Number(a?.estimated_cost ?? a?.estimated_cost_jpy) || 0)),
          payment_method: clampPayment(a?.payment_method),
        }))
      : [];
    return {
      day: Number(d?.day) || i + 1,
      title: typeof d?.title === "string" ? d.title : `第 ${i + 1} 天`,
      activities,
    };
  });

  return { destination, currency: fallback.currency, days };
}

/** 呼叫 OpenAI 生成行程；失敗或無金鑰時拋出，由呼叫端決定 fallback。 */
export async function generateItineraryWithOpenAI(params: {
  destination: string;
  days: number;
  startDate: string;
  budgetSpending: number;
  currency: CurrencyCode;
  context: GenContext;
}): Promise<Itinerary> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("MISSING_OPENAI_KEY");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [
        { role: "system", content: buildSystemPrompt(params.currency) },
        { role: "user", content: buildUserPrompt(params) },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI 回傳內容為空");

  const parsed = JSON.parse(content);
  return normalizeItinerary(parsed, {
    destination: params.destination,
    days: params.days,
    currency: params.currency,
  });
}

// =====================================================================
// 內建示範行程（無金鑰時使用）
// =====================================================================

interface ActivityTemplate {
  time: string;
  name: string;
  description: string;
  cost: number;
  payment_method: PaymentMethod;
}
interface DayTemplate {
  title: string;
  activities: ActivityTemplate[];
}

// 各目的地原生幣別模板（金額為當地貨幣整數）
const REGION_TEMPLATES: Record<string, { currency: CurrencyCode; days: DayTemplate[] }> = {
  kansai: {
    currency: "JPY",
    days: [
      { title: "大阪・道頓堀美食", activities: [
        { time: "10:00", name: "大阪城公園", description: "天守閣與護城河散步", cost: 600, payment_method: "card_acceptable" },
        { time: "12:30", name: "道頓堀章魚燒", description: "本場章魚燒與大阪燒", cost: 1500, payment_method: "cash_only" },
        { time: "15:00", name: "心齋橋購物", description: "藥妝與服飾血拼", cost: 5000, payment_method: "card_acceptable" },
        { time: "19:00", name: "屋台串炸", description: "新世界區在地串炸", cost: 2000, payment_method: "cash_only" },
      ]},
      { title: "京都・東山古都", activities: [
        { time: "09:00", name: "清水寺", description: "清水舞台與地主神社", cost: 500, payment_method: "cash_only" },
        { time: "11:30", name: "二年坂三年坂", description: "石板坂道與抹茶點心", cost: 1200, payment_method: "cash_only" },
        { time: "14:00", name: "祇園和服體驗", description: "花見小路漫步拍照", cost: 4000, payment_method: "card_acceptable" },
        { time: "18:00", name: "先斗町晚餐", description: "鴨川旁京料理", cost: 3500, payment_method: "card_acceptable" },
      ]},
      { title: "京都・嵐山自然", activities: [
        { time: "09:30", name: "竹林之道", description: "嵯峨野竹林散策", cost: 0, payment_method: "cash_only" },
        { time: "10:30", name: "渡月橋", description: "桂川風景與小火車", cost: 880, payment_method: "cash_only" },
        { time: "12:30", name: "嵐山豆腐料理", description: "湯豆腐定食", cost: 2500, payment_method: "card_acceptable" },
        { time: "15:00", name: "天龍寺庭園", description: "世界遺產枯山水", cost: 800, payment_method: "cash_only" },
      ]},
      { title: "奈良・古寺與鹿", activities: [
        { time: "09:00", name: "奈良公園餵鹿", description: "鹿仙貝與梅花鹿互動", cost: 200, payment_method: "cash_only" },
        { time: "10:30", name: "東大寺大佛殿", description: "世界最大木造建築", cost: 600, payment_method: "cash_only" },
        { time: "13:00", name: "近鐵奈良站午餐", description: "釜飯與柿葉壽司", cost: 1800, payment_method: "card_acceptable" },
        { time: "15:30", name: "春日大社", description: "朱紅燈籠參道", cost: 500, payment_method: "cash_only" },
      ]},
      { title: "神戶・港町風情", activities: [
        { time: "10:00", name: "北野異人館", description: "西洋洋館街散步", cost: 750, payment_method: "card_acceptable" },
        { time: "12:30", name: "神戶牛午餐", description: "鐵板燒神戶牛", cost: 6000, payment_method: "card_acceptable" },
        { time: "15:00", name: "南京町商店街", description: "中華街小吃巡禮", cost: 1500, payment_method: "cash_only" },
        { time: "18:30", name: "馬賽克港夜景", description: "神戶港燈光與摩天輪", cost: 900, payment_method: "cash_only" },
      ]},
      { title: "大阪・環球影城", activities: [
        { time: "09:00", name: "USJ 入園", description: "一日券（含哈利波特園區）", cost: 8600, payment_method: "card_acceptable" },
        { time: "12:30", name: "園內午餐", description: "主題餐廳簡餐", cost: 2000, payment_method: "card_acceptable" },
        { time: "16:00", name: "園區紀念品", description: "限定周邊小物", cost: 3000, payment_method: "cash_only" },
        { time: "20:00", name: "環球城站拉麵", description: "收工宵夜拉麵", cost: 1100, payment_method: "cash_only" },
      ]},
      { title: "大阪・採購與返程", activities: [
        { time: "10:00", name: "黑門市場", description: "海鮮與水果現吃", cost: 2500, payment_method: "cash_only" },
        { time: "12:00", name: "難波 CITY 伴手禮", description: "名產與零食採買", cost: 4000, payment_method: "card_acceptable" },
        { time: "14:30", name: "前往關西機場", description: "南海電鐵 rapi:t", cost: 1450, payment_method: "card_acceptable" },
        { time: "16:00", name: "機場最後採買", description: "免稅店與便當", cost: 1200, payment_method: "cash_only" },
      ]},
    ],
  },
  tokyo: {
    currency: "JPY",
    days: [
      { title: "東京・淺草上野", activities: [
        { time: "09:00", name: "淺草寺", description: "雷門與本堂賽錢", cost: 500, payment_method: "cash_only" },
        { time: "11:00", name: "仲見世通小吃", description: "人形燒與煎餅", cost: 1500, payment_method: "cash_only" },
        { time: "14:00", name: "上野恩賜公園", description: "博物館與美術館", cost: 1000, payment_method: "card_acceptable" },
        { time: "18:00", name: "阿美橫丁", description: "在地居酒屋與小吃", cost: 2000, payment_method: "cash_only" },
      ]},
      { title: "東京・澀谷原宿", activities: [
        { time: "10:00", name: "明治神宮", description: "都心森林與參道", cost: 0, payment_method: "cash_only" },
        { time: "12:00", name: "竹下通可麗餅", description: "原宿潮流甜點", cost: 1200, payment_method: "cash_only" },
        { time: "15:00", name: "澀谷購物", description: "百貨與選物店", cost: 6000, payment_method: "card_acceptable" },
        { time: "19:00", name: "居酒屋晚餐", description: "串燒與生啤", cost: 3500, payment_method: "card_acceptable" },
      ]},
      { title: "東京・台場灣岸", activities: [
        { time: "10:00", name: "台場海濱公園", description: "彩虹橋與自由女神", cost: 0, payment_method: "cash_only" },
        { time: "12:30", name: "購物中心午餐", description: "灣岸景觀餐廳", cost: 1800, payment_method: "card_acceptable" },
        { time: "15:00", name: "teamLab 數位藝術", description: "沉浸式光影展", cost: 3800, payment_method: "card_acceptable" },
        { time: "19:00", name: "宵夜拉麵", description: "深夜濃厚豚骨", cost: 1100, payment_method: "cash_only" },
      ]},
      { title: "東京・新宿近郊", activities: [
        { time: "09:00", name: "新宿御苑", description: "和洋庭園散步", cost: 500, payment_method: "cash_only" },
        { time: "12:00", name: "百貨美食街", description: "深層美食午餐", cost: 2500, payment_method: "card_acceptable" },
        { time: "15:00", name: "歌舞伎町小店", description: "扭蛋與雜貨", cost: 1500, payment_method: "cash_only" },
        { time: "18:30", name: "都廳觀景台", description: "免費夜景眺望", cost: 1000, payment_method: "card_acceptable" },
      ]},
    ],
  },
  seoul: {
    currency: "KRW",
    days: [
      { title: "首爾・古宮巡禮", activities: [
        { time: "09:00", name: "景福宮", description: "韓服入場與守門將換崗", cost: 3000, payment_method: "cash_only" },
        { time: "11:30", name: "北村韓屋村", description: "傳統屋瓦巷弄", cost: 0, payment_method: "cash_only" },
        { time: "13:00", name: "廣藏市場小吃", description: "綠豆煎餅與生拌牛肉", cost: 12000, payment_method: "cash_only" },
        { time: "18:00", name: "明洞街頭美食", description: "辣炒年糕與烤串", cost: 15000, payment_method: "cash_only" },
      ]},
      { title: "首爾・弘大購物", activities: [
        { time: "10:00", name: "弘大商圈", description: "潮流服飾與彩妝", cost: 50000, payment_method: "card_acceptable" },
        { time: "13:00", name: "韓式炸雞", description: "啤酒炸雞 chimaek", cost: 25000, payment_method: "card_acceptable" },
        { time: "16:00", name: "文具雜貨店", description: "可愛小物採買", cost: 15000, payment_method: "cash_only" },
        { time: "20:00", name: "烤肉晚餐", description: "五花肉與燒酒", cost: 40000, payment_method: "card_acceptable" },
      ]},
      { title: "首爾・南山塔", activities: [
        { time: "09:30", name: "南山纜車", description: "登山纜車上行", cost: 14000, payment_method: "card_acceptable" },
        { time: "11:00", name: "N首爾塔", description: "觀景台與愛情鎖", cost: 21000, payment_method: "card_acceptable" },
        { time: "14:00", name: "梨泰院午餐", description: "異國料理街", cost: 18000, payment_method: "card_acceptable" },
        { time: "17:00", name: "路邊魚板年糕", description: "在地街頭點心", cost: 8000, payment_method: "cash_only" },
      ]},
      { title: "首爾・東大門", activities: [
        { time: "10:00", name: "東大門設計廣場", description: "DDP 建築與展覽", cost: 0, payment_method: "cash_only" },
        { time: "12:30", name: "東大門購物", description: "批發成衣與配件", cost: 60000, payment_method: "card_acceptable" },
        { time: "16:00", name: "咖啡甜點", description: "韓系網美咖啡廳", cost: 9000, payment_method: "cash_only" },
        { time: "19:00", name: "馬鈴薯排骨湯", description: "暖胃在地晚餐", cost: 20000, payment_method: "cash_only" },
      ]},
    ],
  },
  bangkok: {
    currency: "THB",
    days: [
      { title: "曼谷・大皇宮", activities: [
        { time: "09:00", name: "大皇宮與玉佛寺", description: "泰式宮廷建築群", cost: 500, payment_method: "card_acceptable" },
        { time: "12:00", name: "船麵午餐", description: "經典曼谷小碗船麵", cost: 120, payment_method: "cash_only" },
        { time: "15:00", name: "臥佛寺", description: "巨型臥佛與按摩學院", cost: 200, payment_method: "cash_only" },
        { time: "19:00", name: "河濱夜市", description: "Asiatique 河岸晚餐", cost: 400, payment_method: "cash_only" },
      ]},
      { title: "曼谷・市集潮流", activities: [
        { time: "10:00", name: "洽圖洽週末市集", description: "全球最大露天市集", cost: 600, payment_method: "cash_only" },
        { time: "13:00", name: "市集小吃", description: "椰子冰與烤肉串", cost: 150, payment_method: "cash_only" },
        { time: "16:00", name: "暹羅百貨", description: "Siam 商圈購物", cost: 1500, payment_method: "card_acceptable" },
        { time: "20:00", name: "天台酒吧", description: "高空夜景調酒", cost: 800, payment_method: "card_acceptable" },
      ]},
      { title: "曼谷・水上風情", activities: [
        { time: "09:30", name: "水上市場", description: "丹嫩莎朵長尾船", cost: 800, payment_method: "card_acceptable" },
        { time: "12:30", name: "椰子冰小吃", description: "船上現做甜點", cost: 120, payment_method: "cash_only" },
        { time: "15:00", name: "鄭王廟", description: "黎明寺登塔遠眺", cost: 100, payment_method: "cash_only" },
        { time: "18:30", name: "泰式按摩 SPA", description: "古法全身舒緩", cost: 700, payment_method: "card_acceptable" },
      ]},
      { title: "曼谷・購物美食", activities: [
        { time: "11:00", name: "MBK 購物中心", description: "電子與紀念品", cost: 1200, payment_method: "card_acceptable" },
        { time: "13:00", name: "美食街午餐", description: "打拋豬與綠咖哩", cost: 180, payment_method: "cash_only" },
        { time: "16:00", name: "路邊芒果糯米", description: "街頭甜點必吃", cost: 80, payment_method: "cash_only" },
        { time: "19:00", name: "海鮮餐廳", description: "咖哩螃蟹晚餐", cost: 1000, payment_method: "card_acceptable" },
      ]},
    ],
  },
  paris: {
    currency: "EUR",
    days: [
      { title: "巴黎・鐵塔塞納", activities: [
        { time: "09:30", name: "艾菲爾鐵塔", description: "登頂俯瞰巴黎", cost: 29, payment_method: "card_acceptable" },
        { time: "12:00", name: "河畔咖啡", description: "塞納河旁早午餐", cost: 18, payment_method: "card_acceptable" },
        { time: "15:00", name: "塞納河遊船", description: "經典水上觀光", cost: 16, payment_method: "card_acceptable" },
        { time: "19:00", name: "小酒館晚餐", description: "法式 bistro 三道式", cost: 35, payment_method: "card_acceptable" },
      ]},
      { title: "巴黎・羅浮瑪黎", activities: [
        { time: "09:00", name: "羅浮宮", description: "蒙娜麗莎與藝術珍藏", cost: 22, payment_method: "card_acceptable" },
        { time: "12:30", name: "杜樂麗花園小食", description: "公園野餐點心", cost: 8, payment_method: "cash_only" },
        { time: "15:00", name: "瑪黑區散步", description: "精品小店與巷弄", cost: 0, payment_method: "cash_only" },
        { time: "18:30", name: "街頭可麗餅", description: "現煎法式可麗餅", cost: 7, payment_method: "cash_only" },
      ]},
      { title: "巴黎・蒙馬特", activities: [
        { time: "10:00", name: "聖心堂", description: "山丘上的白色教堂", cost: 0, payment_method: "cash_only" },
        { time: "11:30", name: "畫家村", description: "帖特廣場速寫", cost: 15, payment_method: "cash_only" },
        { time: "13:30", name: "法式午餐", description: "洋蔥湯與油封鴨", cost: 24, payment_method: "card_acceptable" },
        { time: "16:30", name: "跳蚤市場", description: "古董與二手挖寶", cost: 20, payment_method: "cash_only" },
      ]},
      { title: "巴黎・凡爾賽", activities: [
        { time: "09:00", name: "凡爾賽宮", description: "鏡廳與宮殿導覽", cost: 21, payment_method: "card_acceptable" },
        { time: "13:00", name: "宮廷花園午餐", description: "花園旁餐廳", cost: 19, payment_method: "card_acceptable" },
        { time: "16:00", name: "紀念品採買", description: "明信片與小物", cost: 12, payment_method: "cash_only" },
        { time: "19:00", name: "麵包甜點", description: "可頌與馬卡龍", cost: 6, payment_method: "cash_only" },
      ]},
    ],
  },
};

// 通用模板（以美元定義，再換算為任意消費幣別）
const GENERIC_TEMPLATES_USD: DayTemplate[] = [
  { title: "市區地標巡禮", activities: [
    { time: "09:00", name: "市中心地標", description: "主要廣場與歷史建築", cost: 0, payment_method: "cash_only" },
    { time: "12:00", name: "在地餐廳午餐", description: "道地特色料理", cost: 15, payment_method: "card_acceptable" },
    { time: "15:00", name: "城市博物館", description: "歷史與藝術館藏", cost: 12, payment_method: "cash_only" },
    { time: "19:00", name: "夜市小吃", description: "街頭美食巡禮", cost: 10, payment_method: "cash_only" },
  ]},
  { title: "舊城與市集", activities: [
    { time: "10:00", name: "歷史舊城區", description: "古巷弄散步", cost: 0, payment_method: "cash_only" },
    { time: "11:30", name: "傳統市集", description: "在地食材與小物", cost: 8, payment_method: "cash_only" },
    { time: "13:00", name: "街邊午餐", description: "平價在地美食", cost: 7, payment_method: "cash_only" },
    { time: "16:00", name: "觀景台", description: "城市天際線眺望", cost: 20, payment_method: "card_acceptable" },
  ]},
  { title: "自然與近郊", activities: [
    { time: "09:30", name: "近郊一日遊", description: "鐵路 / 巴士前往", cost: 25, payment_method: "card_acceptable" },
    { time: "12:30", name: "特色風味餐", description: "當地名物午餐", cost: 18, payment_method: "card_acceptable" },
    { time: "15:00", name: "公園步道", description: "自然景觀健行", cost: 0, payment_method: "cash_only" },
    { time: "18:00", name: "咖啡甜點", description: "悠閒下午茶", cost: 6, payment_method: "cash_only" },
  ]},
  { title: "購物與美食", activities: [
    { time: "11:00", name: "購物大街", description: "品牌與在地設計", cost: 40, payment_method: "card_acceptable" },
    { time: "13:00", name: "美食街午餐", description: "多國料理選擇", cost: 12, payment_method: "cash_only" },
    { time: "16:00", name: "紀念品採買", description: "伴手禮與特產", cost: 15, payment_method: "cash_only" },
    { time: "20:00", name: "餐酒館晚餐", description: "在地酒館體驗", cost: 22, payment_method: "card_acceptable" },
  ]},
  { title: "文化體驗", activities: [
    { time: "09:00", name: "工作坊體驗", description: "手作 / 烹飪課程", cost: 30, payment_method: "card_acceptable" },
    { time: "12:00", name: "體驗後午餐", description: "在地家常菜", cost: 14, payment_method: "card_acceptable" },
    { time: "15:00", name: "在地小店", description: "獨立選物與書店", cost: 10, payment_method: "cash_only" },
    { time: "18:00", name: "表演 / 夜景", description: "演出或夜間散步", cost: 16, payment_method: "card_acceptable" },
  ]},
  { title: "海濱地標日", activities: [
    { time: "10:00", name: "地標門票", description: "代表性景點入場", cost: 28, payment_method: "card_acceptable" },
    { time: "12:30", name: "海鮮午餐", description: "在地海鮮料理", cost: 20, payment_method: "card_acceptable" },
    { time: "15:30", name: "海濱散步", description: "海岸線漫步", cost: 0, payment_method: "cash_only" },
    { time: "18:30", name: "小吃宵夜", description: "在地宵夜攤", cost: 9, payment_method: "cash_only" },
  ]},
];

/** 將美元金額換算為指定幣別並做合理進位。 */
function scaleUsdToCurrency(usd: number, code: CurrencyCode): number {
  if (usd <= 0) return 0;
  const local = usd / getCurrency(code).usdPerUnit;
  if (local >= 1000) return Math.round(local / 100) * 100;
  if (local >= 100) return Math.round(local / 10) * 10;
  if (local >= 10) return Math.round(local);
  return Math.max(1, Math.round(local));
}

function templateToDay(tpl: DayTemplate, day: number, mapCost: (c: number) => number): DayPlan {
  return {
    day,
    title: tpl.title,
    activities: tpl.activities.map((a) => ({
      time: a.time,
      name: a.name,
      description: a.description,
      estimated_cost: mapCost(a.cost),
      payment_method: a.payment_method,
    })),
  };
}

/**
 * 產生內建示範行程：
 *  - 若目的地有原生模板，且選擇的消費幣別與模板原生幣別相同 → 直接採用。
 *  - 否則使用通用模板，並把美元基準金額換算成所選幣別。
 */
export function buildSampleItinerary(
  destination: string,
  days: number,
  currency: CurrencyCode
): Itinerary {
  const key = regionKeyFromDestination(destination);
  const region = REGION_TEMPLATES[key];

  let templates: DayTemplate[];
  let mapCost: (c: number) => number;

  if (region && region.currency === currency) {
    templates = region.days;
    mapCost = (c) => c; // 原生幣別，金額直接使用
  } else {
    templates = GENERIC_TEMPLATES_USD;
    mapCost = (c) => scaleUsdToCurrency(c, currency); // 美元基準 → 換算
  }

  const dayPlans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const tpl = templates[i % templates.length];
    dayPlans.push(templateToDay(tpl, i + 1, mapCost));
  }
  return { destination: destination || "自訂目的地", currency, days: dayPlans };
}

/** 將當地金額做合理進位（依量級）。 */
function niceRoundLocal(v: number): number {
  if (v <= 0) return 0;
  if (v >= 1000) return Math.round(v / 100) * 100;
  if (v >= 100) return Math.round(v / 10) * 10;
  if (v >= 10) return Math.round(v);
  return Math.max(1, Math.round(v));
}

/**
 * 將示範行程的花費等比縮放，使總額貼近目標花費（消費幣別），
 * 用來產生 Low / Mid / High 三種級距的差異。
 */
export function scaleItineraryToTarget(itinerary: Itinerary, targetSpending: number): Itinerary {
  const baseTotal = itinerary.days.reduce(
    (sum, d) => sum + d.activities.reduce((s, a) => s + (a.estimated_cost || 0), 0),
    0
  );
  if (baseTotal <= 0 || targetSpending <= 0) return itinerary;

  let factor = targetSpending / baseTotal;
  factor = Math.max(0.2, Math.min(10, factor));

  return {
    ...itinerary,
    days: itinerary.days.map((d) => ({
      ...d,
      activities: d.activities.map((a) => ({
        ...a,
        estimated_cost: niceRoundLocal((a.estimated_cost || 0) * factor),
      })),
    })),
  };
}
