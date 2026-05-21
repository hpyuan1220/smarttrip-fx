"use client";

interface InputBarProps {
  destination: string;
  startDate: string;
  endDate: string;
  budgetTwd: string;
  loading: boolean;
  onChange: (field: "destination" | "startDate" | "endDate" | "budgetTwd", value: string) => void;
  onSubmit: () => void;
}

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-blue-200";
const labelClass = "mb-1 block text-xs font-medium text-slate-500";

export default function InputBar({
  destination,
  startDate,
  endDate,
  budgetTwd,
  loading,
  onChange,
  onSubmit,
}: InputBarProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5 md:items-end">
        <div className="md:col-span-1">
          <label className={labelClass}>旅遊目的地</label>
          <input
            className={fieldClass}
            value={destination}
            placeholder="關西"
            onChange={(e) => onChange("destination", e.target.value)}
          />
        </div>
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
        <div>
          <label className={labelClass}>台幣預算總額</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              NT$
            </span>
            <input
              type="number"
              min={0}
              step={1000}
              className={`${fieldClass} pl-10`}
              value={budgetTwd}
              placeholder="40000"
              onChange={(e) => onChange("budgetTwd", e.target.value)}
            />
          </div>
        </div>
        <div>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="w-full rounded-lg bg-brand-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "規劃中…" : "一鍵生成行程"}
          </button>
        </div>
      </div>
    </div>
  );
}
