// OpenAI 行程生成模組
//
// 使用嚴格的 response_format: { type: "json_object" }，要求模型回傳
// 帶有 payment_method: "cash_only" | "card_acceptable" 標籤的行程。
// 未設定 OPENAI_API_KEY 時，回傳內建的關西示範行程，讓 App 可離線展示。

import type { ActivityItem, DayPlan, Itinerary, PaymentMethod } from "./types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = `你是一位專精日本自由行的旅遊規劃師，同時也是熟悉日本支付習慣的理財顧問。
你必須只輸出「合法的 JSON 物件」，不得包含任何 JSON 以外的文字、註解或 markdown 標記。

請嚴格遵循以下 JSON Schema：
{
  "destination": string,            // 旅遊地區
  "days": [
    {
      "day": number,                // 第幾天，從 1 開始
      "title": string,              // 當日主題（例如「大阪市區」）
      "activities": [
        {
          "time": string,           // 24 小時制 "HH:MM"
          "name": string,           // 景點 / 行程名稱
          "description": string,    // 一句話說明
          "estimated_cost_jpy": number,        // 每人預估花費（日幣，整數，含交通/餐食/門票）
          "payment_method": "cash_only" | "card_acceptable"
        }
      ]
    }
  ]
}

判斷 payment_method 的準則：
- "cash_only"：小型神社/寺廟賽錢、路邊攤與屋台、傳統市場、地方小店、部分巴士與在地交通、章魚燒/拉麵等小餐館、扭蛋與寺廟御守。
- "card_acceptable"：百貨公司、連鎖餐廳與大型餐廳、飯店、JR/私鐵交通票券、藥妝大型門市、主要觀光設施門票。

其他要求：
- 每天安排 3~5 個行程，時間由早到晚排序。
- 全程預估總花費應盡量貼近（但不超過）使用者預算。
- 金額為整數日幣，務實合理。`;

function buildUserPrompt(params: {
  destination: string;
  days: number;
  startDate: string;
  budgetJpy: number;
}): string {
  return `請規劃一份「${params.destination}」的 ${params.days} 天自由行行程。
出發日期：${params.startDate}
本次可用預算約 ${Math.round(params.budgetJpy).toLocaleString()} 日幣（請讓總花費貼近此金額但不超過）。
請依系統指示的 JSON Schema 回傳，並務必為每個行程標註正確的 payment_method。`;
}

function clampPayment(value: unknown): PaymentMethod {
  return value === "cash_only" ? "cash_only" : "card_acceptable";
}

/** 將模型回傳的任意 JSON 正規化為安全的 Itinerary 結構。 */
export function normalizeItinerary(
  raw: any,
  fallback: { destination: string; days: number }
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
          estimated_cost_jpy: Math.max(0, Math.round(Number(a?.estimated_cost_jpy) || 0)),
          payment_method: clampPayment(a?.payment_method),
        }))
      : [];
    return {
      day: Number(d?.day) || i + 1,
      title: typeof d?.title === "string" ? d.title : `第 ${i + 1} 天`,
      activities,
    };
  });

  return { destination, days: days.length ? days : [] };
}

/** 呼叫 OpenAI 生成行程；失敗或無金鑰時拋出 / 由呼叫端決定 fallback。 */
export async function generateItineraryWithOpenAI(params: {
  destination: string;
  days: number;
  startDate: string;
  budgetJpy: number;
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
        { role: "system", content: SYSTEM_PROMPT },
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
  return normalizeItinerary(parsed, { destination: params.destination, days: params.days });
}

// --- 內建關西示範行程（無金鑰時使用），混合現金 / 刷卡標籤 ---

const KANSAI_TEMPLATES: Omit<DayPlan, "day">[] = [
  {
    title: "大阪・道頓堀美食",
    activities: [
      { time: "10:00", name: "大阪城公園", description: "天守閣與護城河散步", estimated_cost_jpy: 600, payment_method: "card_acceptable" },
      { time: "12:30", name: "道頓堀章魚燒", description: "本場章魚燒與大阪燒", estimated_cost_jpy: 1500, payment_method: "cash_only" },
      { time: "15:00", name: "心齋橋購物", description: "藥妝與服飾血拼", estimated_cost_jpy: 5000, payment_method: "card_acceptable" },
      { time: "19:00", name: "屋台串炸", description: "新世界區在地串炸", estimated_cost_jpy: 2000, payment_method: "cash_only" },
    ],
  },
  {
    title: "京都・東山古都",
    activities: [
      { time: "09:00", name: "清水寺", description: "清水舞台與地主神社", estimated_cost_jpy: 500, payment_method: "cash_only" },
      { time: "11:30", name: "二年坂三年坂", description: "石板坂道與抹茶點心", estimated_cost_jpy: 1200, payment_method: "cash_only" },
      { time: "14:00", name: "祇園和服體驗", description: "花見小路漫步拍照", estimated_cost_jpy: 4000, payment_method: "card_acceptable" },
      { time: "18:00", name: "先斗町晚餐", description: "鴨川旁京料理", estimated_cost_jpy: 3500, payment_method: "card_acceptable" },
    ],
  },
  {
    title: "京都・嵐山自然",
    activities: [
      { time: "09:30", name: "竹林之道", description: "嵯峨野竹林散策", estimated_cost_jpy: 0, payment_method: "cash_only" },
      { time: "10:30", name: "渡月橋", description: "桂川風景與小火車", estimated_cost_jpy: 880, payment_method: "cash_only" },
      { time: "12:30", name: "嵐山豆腐料理", description: "湯豆腐定食", estimated_cost_jpy: 2500, payment_method: "card_acceptable" },
      { time: "15:00", name: "天龍寺庭園", description: "世界遺產枯山水", estimated_cost_jpy: 800, payment_method: "cash_only" },
    ],
  },
  {
    title: "奈良・古寺與鹿",
    activities: [
      { time: "09:00", name: "奈良公園餵鹿", description: "購買鹿仙貝與梅花鹿互動", estimated_cost_jpy: 200, payment_method: "cash_only" },
      { time: "10:30", name: "東大寺大佛殿", description: "世界最大木造建築", estimated_cost_jpy: 600, payment_method: "cash_only" },
      { time: "13:00", name: "近鐵奈良站午餐", description: "釜飯與柿葉壽司", estimated_cost_jpy: 1800, payment_method: "card_acceptable" },
      { time: "15:30", name: "春日大社", description: "朱紅燈籠參道", estimated_cost_jpy: 500, payment_method: "cash_only" },
    ],
  },
  {
    title: "神戶・港町風情",
    activities: [
      { time: "10:00", name: "北野異人館", description: "西洋洋館街散步", estimated_cost_jpy: 750, payment_method: "card_acceptable" },
      { time: "12:30", name: "神戶牛午餐", description: "鐵板燒神戶牛", estimated_cost_jpy: 6000, payment_method: "card_acceptable" },
      { time: "15:00", name: "南京町商店街", description: "中華街小吃巡禮", estimated_cost_jpy: 1500, payment_method: "cash_only" },
      { time: "18:30", name: "馬賽克港夜景", description: "神戶港燈光與摩天輪", estimated_cost_jpy: 900, payment_method: "cash_only" },
    ],
  },
  {
    title: "大阪・環球影城",
    activities: [
      { time: "09:00", name: "USJ 入園", description: "一日券（含哈利波特園區）", estimated_cost_jpy: 8600, payment_method: "card_acceptable" },
      { time: "12:30", name: "園內午餐", description: "主題餐廳簡餐", estimated_cost_jpy: 2000, payment_method: "card_acceptable" },
      { time: "16:00", name: "園區紀念品", description: "限定周邊小物", estimated_cost_jpy: 3000, payment_method: "cash_only" },
      { time: "20:00", name: "環球城站拉麵", description: "收工宵夜拉麵", estimated_cost_jpy: 1100, payment_method: "cash_only" },
    ],
  },
  {
    title: "大阪・採購與返程",
    activities: [
      { time: "10:00", name: "黑門市場", description: "海鮮與水果現吃", estimated_cost_jpy: 2500, payment_method: "cash_only" },
      { time: "12:00", name: "難波 CITY 伴手禮", description: "名產與零食採買", estimated_cost_jpy: 4000, payment_method: "card_acceptable" },
      { time: "14:30", name: "前往關西機場", description: "南海電鐵 rapi:t", estimated_cost_jpy: 1450, payment_method: "card_acceptable" },
      { time: "16:00", name: "機場最後採買", description: "免稅店與便當", estimated_cost_jpy: 1200, payment_method: "cash_only" },
    ],
  },
];

/** 產生內建關西示範行程（依天數循環取用模板）。 */
export function buildSampleItinerary(destination: string, days: number): Itinerary {
  const dayPlans: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const tpl = KANSAI_TEMPLATES[i % KANSAI_TEMPLATES.length];
    dayPlans.push({
      day: i + 1,
      title: tpl.title,
      activities: tpl.activities.map((a) => ({ ...a })),
    });
  }
  return { destination: destination || "關西", days: dayPlans };
}
