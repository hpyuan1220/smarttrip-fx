# SmartTrip FX

為精打細算的旅客設計的 Web App：一鍵生成行程，並精算「不浪費、不匯損」的精準日幣現金換匯量。

## 功能

- **儀表板**：輸入目的地（預設關西）、出發 / 回程日期、台幣預算總額。
- **行程時間軸（左側）**：每日行程卡片標註景點名、預估花費（¥）與支付標籤（刷卡 / 現金）。
- **財務面板（右側）**：大字顯示「建議換匯日幣」、FX 換匯紅綠燈（STRONG_BUY / BUY / HOLD）與文字建議。
- **AI 行程生成**：`/api/generate` 以嚴格 `json_object` 提示詞呼叫 OpenAI，回傳帶 `payment_method` 標籤的行程。
- **財務演算法**：統計 `cash_only` 項目總和 × 1.1（10% 預備金）並進位至千元，得出最終換匯值。
- **匯率燈號**：讀取 30 天 TWD/JPY 歷史，與 MA30 比較產生燈號（可串接真實 API 或使用模擬資料）。

## 技術

Next.js 14（App Router）、React 18、TypeScript、Tailwind CSS。零額外執行階段相依，OpenAI 與匯率皆以原生 `fetch` 呼叫。

## 開始使用

```bash
npm install
cp .env.example .env.local   # 填入 OPENAI_API_KEY（選填）
npm run dev
```

開啟 http://localhost:3000

### 環境變數

| 變數 | 說明 |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI 金鑰。未設定時自動改用內建關西示範行程。 |
| `OPENAI_MODEL` | 模型名稱，預設 `gpt-4o-mini`。 |
| `EXCHANGE_API_KEY` | exchangerate.host 金鑰。未設定時使用本機模擬的 30 天歷史資料。 |

> 不需任何金鑰即可完整體驗：行程使用內建關西範本，匯率使用可重現的模擬資料。

## 架構

```
app/
  page.tsx                  儀表板（前端主畫面）
  layout.tsx / globals.css
  api/generate/route.ts     Serverless Function：整合行程 + 匯率 + 財務
components/
  InputBar / ItineraryTimeline / ItineraryCard / FinancialPanel / FxLight
lib/
  types.ts      共用型別
  openai.ts     OpenAI 行程生成（嚴格 json_object）＋ 關西示範行程
  finance.ts    財務模組：cash_only × 1.1，進位千元
  fx.ts         匯率模組：30 天歷史、MA30、燈號
```

## 燈號邏輯

匯率以「1 日圓 = ? 台幣」表示，數值越低代表日圓越便宜：

- **STRONG_BUY**：今日比 MA30 低 1.5% 以上（日圓相對低點）。
- **BUY**：今日不高於 MA30 + 0.5%（合理區間）。
- **HOLD**：今日高於 MA30（日圓偏貴，建議觀望）。
