"use client";

import type { ActivityItem } from "@/lib/types";

const yen = (n: number) => `¥${n.toLocaleString()}`;

function PaymentTag({ method }: { method: ActivityItem["payment_method"] }) {
  const isCash = method === "cash_only";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        isCash
          ? "bg-amber-100 text-amber-700"
          : "bg-sky-100 text-sky-700"
      }`}
    >
      <span aria-hidden>{isCash ? "💴" : "💳"}</span>
      {isCash ? "現金" : "刷卡"}
    </span>
  );
}

export default function ItineraryCard({ activity }: { activity: ActivityItem }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md">
      <div className="mt-0.5 w-12 shrink-0 text-sm font-semibold tabular-nums text-brand-accent">
        {activity.time}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="truncate text-sm font-semibold text-slate-900">{activity.name}</h4>
          <PaymentTag method={activity.payment_method} />
        </div>
        {activity.description ? (
          <p className="mt-0.5 truncate text-xs text-slate-500">{activity.description}</p>
        ) : null}
      </div>
      <div className="shrink-0 text-right text-sm font-semibold tabular-nums text-slate-700">
        {yen(activity.estimated_cost_jpy)}
      </div>
    </div>
  );
}
