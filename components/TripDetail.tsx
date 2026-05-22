"use client";

import { useEffect, useState } from "react";
import type { PaymentMethod, SavedTrip } from "@/lib/types";
import { formatMoney } from "@/lib/currency";
import { COMPANIONS, MOODS, THEMES, optionEmoji, optionLabel } from "@/lib/planning";
import {
  addExpense,
  deleteExpense,
  deleteTrip,
  expenseTotals,
  setReview,
  setStory,
} from "@/lib/storage";
import ItineraryTimeline from "./ItineraryTimeline";

type Tab = "itinerary" | "expenses" | "review" | "story";

const TABS: { key: Tab; label: string }[] = [
  { key: "itinerary", label: "行程" },
  { key: "expenses", label: "開支紀錄" },
  { key: "review", label: "旅程回顧" },
  { key: "story", label: "心情故事" },
];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-blue-200";

export default function TripDetail({
  trip,
  onChanged,
  onDeleted,
}: {
  trip: SavedTrip;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [tab, setTab] = useState<Tab>("itinerary");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">{trip.destination}</h2>
          <p className="text-xs text-slate-500">
            {trip.startDate} → {trip.endDate}・{trip.itinerary.days.length} 天・{trip.tierLabel}方案・
            {trip.spendingCurrency}/{trip.homeCurrency}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {trip.context.mood ? <Chip>{optionEmoji(MOODS, trip.context.mood)} {optionLabel(MOODS, trip.context.mood)}</Chip> : null}
            {trip.context.theme ? <Chip>{optionEmoji(THEMES, trip.context.theme)} {optionLabel(THEMES, trip.context.theme)}</Chip> : null}
            {trip.context.companions ? <Chip>{optionEmoji(COMPANIONS, trip.context.companions)} {optionLabel(COMPANIONS, trip.context.companions)}</Chip> : null}
            <Chip>👥 {trip.context.headcount} 人</Chip>
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm("確定要刪除這個行程嗎？")) {
              deleteTrip(trip.id);
              onDeleted();
            }
          }}
          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
        >
          刪除
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 rounded-lg bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
              tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "itinerary" ? <ItineraryTimeline itinerary={trip.itinerary} /> : null}
        {tab === "expenses" ? <ExpenseTab trip={trip} onChanged={onChanged} /> : null}
        {tab === "review" ? <ReviewTab trip={trip} onChanged={onChanged} /> : null}
        {tab === "story" ? <StoryTab trip={trip} onChanged={onChanged} /> : null}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
      {children}
    </span>
  );
}

// ---------------- 開支紀錄 ----------------

function ExpenseTab({ trip, onChanged }: { trip: SavedTrip; onChanged: () => void }) {
  const cur = trip.spendingCurrency;
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash_only");
  const [date, setDate] = useState(trip.startDate);
  const [note, setNote] = useState("");

  const totals = expenseTotals(trip);
  const planned = trip.finance.totalSpending;
  const diff = totals.actualTotal - planned;

  const submit = () => {
    const amt = Math.round(Number(amount) || 0);
    if (!name.trim() || amt <= 0) return;
    addExpense(trip.id, { date, name: name.trim(), amount: amt, method, note: note.trim() || undefined });
    setName("");
    setAmount("");
    setNote("");
    onChanged();
  };

  return (
    <div className="space-y-4">
      {/* 對比卡 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="計畫總花費" value={formatMoney(planned, cur)} />
        <Stat label="實際總花費" value={formatMoney(totals.actualTotal, cur)} />
        <Stat
          label={diff > 0 ? "超支" : "結餘"}
          value={formatMoney(Math.abs(diff), cur)}
          tone={diff > 0 ? "bad" : "good"}
        />
        <Stat
          label="現金：建議 / 實際"
          value={`${formatMoney(trip.finance.recommendedCashSpending, cur)} / ${formatMoney(totals.actualCash, cur)}`}
        />
      </div>

      {/* 新增開支 */}
      <div className="rounded-xl border border-slate-200 p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input className={`${inputClass} sm:col-span-2`} placeholder="項目名稱" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputClass} type="number" min={0} placeholder={`金額 (${cur})`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            <option value="cash_only">💴 現金</option>
            <option value="card_acceptable">💳 刷卡</option>
          </select>
        </div>
        <div className="mt-2 flex gap-2">
          <input className={inputClass} placeholder="備註（選填）" value={note} onChange={(e) => setNote(e.target.value)} />
          <button onClick={submit} className="shrink-0 rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
            新增
          </button>
        </div>
      </div>

      {/* 開支清單 */}
      {trip.expenses.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">還沒有開支紀錄，旅途中隨手記一筆吧。</p>
      ) : (
        <div className="space-y-2">
          {[...trip.expenses].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt).map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <span className="w-20 shrink-0 text-xs text-slate-400">{e.date}</span>
              <span className="text-sm">{e.method === "cash_only" ? "💴" : "💳"}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-800">{e.name}</div>
                {e.note ? <div className="truncate text-[11px] text-slate-400">{e.note}</div> : null}
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{formatMoney(e.amount, cur)}</span>
              <button onClick={() => { deleteExpense(trip.id, e.id); onChanged(); }} className="shrink-0 text-xs text-slate-300 hover:text-rose-500">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "bad" ? "text-rose-600" : tone === "good" ? "text-emerald-600" : "text-slate-800";
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

// ---------------- 旅程回顧 ----------------

function ReviewTab({ trip, onChanged }: { trip: SavedTrip; onChanged: () => void }) {
  const [rating, setRating] = useState(trip.review?.rating ?? 0);
  const [wentWell, setWentWell] = useState(trip.review?.wentWell ?? "");
  const [overUnder, setOverUnder] = useState(trip.review?.overUnder ?? "");
  const [notes, setNotes] = useState(trip.review?.notes ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setRating(trip.review?.rating ?? 0);
    setWentWell(trip.review?.wentWell ?? "");
    setOverUnder(trip.review?.overUnder ?? "");
    setNotes(trip.review?.notes ?? "");
    setSaved(false);
  }, [trip.id]);

  const save = () => {
    setReview(trip.id, { rating, wentWell: wentWell.trim(), overUnder: overUnder.trim(), notes: notes.trim() });
    setSaved(true);
    onChanged();
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 text-xs font-medium text-slate-500">整體評分</div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => { setRating(n); setSaved(false); }} className="text-2xl transition hover:scale-110" aria-label={`${n} 顆星`}>
              <span className={n <= rating ? "text-amber-400" : "text-slate-300"}>★</span>
            </button>
          ))}
        </div>
      </div>
      <Field label="最棒的部分">
        <textarea className={inputClass} rows={2} value={wentWell} onChange={(e) => { setWentWell(e.target.value); setSaved(false); }} placeholder="哪些行程讓你最難忘？" />
      </Field>
      <Field label="預算心得（超支 / 省錢）">
        <textarea className={inputClass} rows={2} value={overUnder} onChange={(e) => { setOverUnder(e.target.value); setSaved(false); }} placeholder="哪裡花超過？哪裡意外省錢？" />
      </Field>
      <Field label="其他備註">
        <textarea className={inputClass} rows={2} value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} placeholder="給下次的自己一些提醒…" />
      </Field>
      <div className="flex items-center gap-3">
        <button onClick={save} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">儲存回顧</button>
        {saved ? <span className="text-xs text-emerald-600">已儲存 ✓</span> : null}
      </div>
    </div>
  );
}

// ---------------- 心情故事 ----------------

function StoryTab({ trip, onChanged }: { trip: SavedTrip; onChanged: () => void }) {
  const [mood, setMood] = useState(trip.story?.mood ?? trip.context.mood ?? "");
  const [title, setTitle] = useState(trip.story?.title ?? "");
  const [body, setBody] = useState(trip.story?.body ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMood(trip.story?.mood ?? trip.context.mood ?? "");
    setTitle(trip.story?.title ?? "");
    setBody(trip.story?.body ?? "");
    setSaved(false);
  }, [trip.id]);

  const save = () => {
    setStory(trip.id, { mood, title: title.trim(), body: body.trim() });
    setSaved(true);
    onChanged();
  };

  return (
    <div className="space-y-3">
      <Field label="當下心情">
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMood(m.id); setSaved(false); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                mood === m.id ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="標題">
        <input className={inputClass} value={title} onChange={(e) => { setTitle(e.target.value); setSaved(false); }} placeholder="替這趟旅程下個標題…" />
      </Field>
      <Field label="故事">
        <textarea className={inputClass} rows={6} value={body} onChange={(e) => { setBody(e.target.value); setSaved(false); }} placeholder="記下這趟說走就走的心情與畫面…" />
      </Field>
      <div className="flex items-center gap-3">
        <button onClick={save} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">儲存故事</button>
        {saved ? <span className="text-xs text-emerald-600">已儲存 ✓</span> : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-500">{label}</div>
      {children}
    </div>
  );
}
