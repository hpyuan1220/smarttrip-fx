"use client";

import {
  CURRENCIES,
  DESTINATIONS,
  HOME_CURRENCIES,
  SPENDING_CURRENCIES,
  type CurrencyCode,
} from "@/lib/currency";
import { COMPANIONS, MOODS, THEMES } from "@/lib/planning";

export type InputField =
  | "destinationPreset"
  | "destination"
  | "spendingCurrency"
  | "homeCurrency"
  | "startDate"
  | "endDate"
  | "budgetMin"
  | "budgetMax"
  | "mood"
  | "theme"
  | "companions"
  | "headcount";

interface InputBarProps {
  destination: string;
  isCustomDestination: boolean;
  spendingCurrency: CurrencyCode;
  homeCurrency: CurrencyCode;
  startDate: string;
  endDate: string;
  budgetMin: string;
  budgetMax: string;
  mood: string;
  theme: string;
  companions: string;
  headcount: string;
  loading: boolean;
  onChange: (field: InputField, value: string) => void;
  onSubmit: () => void;
}

const CUSTOM = "__custom__";

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-blue-200";
const labelClass = "mb-1 block text-xs font-medium text-slate-500";

export default function InputBar({
  destination,
  isCustomDestination,
  spendingCurrency,
  homeCurrency,
  startDate,
  endDate,
  budgetMin,
  budgetMax,
  mood,
  theme,
  companions,
  headcount,
  loading,
  onChange,
  onSubmit,
}: InputBarProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {/* 目的地 */}
        <div className="md:col-span-2">
          <label className={labelClass}>旅遊目的地</label>
          <select
            className={fieldClass}
            value={isCustomDestination ? CUSTOM : destination}
            onChange={(e) => onChange("destinationPreset", e.target.value)}
          >
            {DESTINATIONS.map((d) => (
              <option key={d.id} value={d.label}>
                {d.label}
              </option>
            ))}
            <option value={CUSTOM}>自訂…</option>
          </select>
          {isCustomDestination ? (
            <input
              className={`${fieldClass} mt-2`}
              value={destination}
              placeholder="輸入目的地，例如：北海道、新加坡、倫敦"
              onChange={(e) => onChange("destination", e.target.value)}
            />
          ) : null}
        </div>

        {/* 消費幣別 */}
        <div>
          <label className={labelClass}>消費幣別</label>
          <select
            className={fieldClass}
            value={spendingCurrency}
            onChange={(e) => onChange("spendingCurrency", e.target.value)}
          >
            {SPENDING_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCIES[c].label}
              </option>
            ))}
          </select>
        </div>

        {/* 本國幣別 */}
        <div>
          <label className={labelClass}>本國幣別</label>
          <select
            className={fieldClass}
            value={homeCurrency}
            onChange={(e) => onChange("homeCurrency", e.target.value)}
          >
            {HOME_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCIES[c].label}
              </option>
            ))}
          </select>
        </div>

        {/* 出發 / 回程 */}
        <div>
          <label className={labelClass}>出發日期</label>
          <input
            type="date"
            className={fieldClass}
            value={startDate}
            onChange={(e) => onChange("startDate", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>回程日期</label>
          <input
            type="date"
            className={fieldClass}
            value={endDate}
            onChange={(e) => onChange("endDate", e.target.value)}
          />
        </div>

        {/* 預算範圍 */}
        <div>
          <label className={labelClass}>預算下限（{homeCurrency}）</label>
          <input
            type="number"
            min={0}
            step={1000}
            className={fieldClass}
            value={budgetMin}
            placeholder="20000"
            onChange={(e) => onChange("budgetMin", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>預算上限（{homeCurrency}）</label>
          <input
            type="number"
            min={0}
            step={1000}
            className={fieldClass}
            value={budgetMax}
            placeholder="60000"
            onChange={(e) => onChange("budgetMax", e.target.value)}
          />
        </div>

        {/* 心情 / 主題 / 同行 / 人數 */}
        <div>
          <label className={labelClass}>心情</label>
          <select className={fieldClass} value={mood} onChange={(e) => onChange("mood", e.target.value)}>
            <option value="">不限</option>
            {MOODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.emoji} {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>主題</label>
          <select className={fieldClass} value={theme} onChange={(e) => onChange("theme", e.target.value)}>
            <option value="">不限</option>
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>同行</label>
          <select
            className={fieldClass}
            value={companions}
            onChange={(e) => onChange("companions", e.target.value)}
          >
            <option value="">不限</option>
            {COMPANIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>人數</label>
          <input
            type="number"
            min={1}
            step={1}
            className={fieldClass}
            value={headcount}
            placeholder="1"
            onChange={(e) => onChange("headcount", e.target.value)}
          />
        </div>
      </div>

      {/* 送出 */}
      <button
        onClick={onSubmit}
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-brand-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "規劃中…" : "✨ 一鍵生成 Low / Mid / High 行程"}
      </button>
    </div>
  );
}
