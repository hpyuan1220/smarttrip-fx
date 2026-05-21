"use client";

import type { FxSignal } from "@/lib/types";

const CONFIG: Record<
  FxSignal,
  { label: string; sub: string; dot: string; bg: string; text: string; ring: string }
> = {
  STRONG_BUY: {
    label: "STRONG BUY",
    sub: "強力買進",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
  },
  BUY: {
    label: "BUY",
    sub: "可買進",
    dot: "bg-amber-400",
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
  },
  HOLD: {
    label: "HOLD",
    sub: "建議觀望",
    dot: "bg-rose-500",
    bg: "bg-rose-50",
    text: "text-rose-700",
    ring: "ring-rose-200",
  },
};

const ORDER: FxSignal[] = ["STRONG_BUY", "BUY", "HOLD"];

export default function FxLight({ signal }: { signal: FxSignal }) {
  const c = CONFIG[signal];
  return (
    <div className={`rounded-xl ${c.bg} p-3 ring-1 ${c.ring}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* 紅綠燈三顆燈，僅當前訊號亮起 */}
          <div className="flex items-center gap-1.5 rounded-full bg-slate-900/90 px-2 py-1.5">
            {ORDER.map((s) => (
              <span
                key={s}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  s === signal ? CONFIG[s].dot : "bg-slate-600"
                } ${s === signal ? "shadow-[0_0_8px_currentColor]" : ""}`}
              />
            ))}
          </div>
          <div>
            <div className={`text-sm font-extrabold tracking-wide ${c.text}`}>{c.label}</div>
            <div className="text-xs text-slate-500">{c.sub}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
