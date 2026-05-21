"use client";

import type { Itinerary } from "@/lib/types";
import ItineraryCard from "./ItineraryCard";

const yen = (n: number) => `¥${n.toLocaleString()}`;

function dayTotal(activities: { estimated_cost_jpy: number }[]): number {
  return activities.reduce((sum, a) => sum + (a.estimated_cost_jpy || 0), 0);
}

export default function ItineraryTimeline({ itinerary }: { itinerary: Itinerary }) {
  return (
    <div className="space-y-5">
      {itinerary.days.map((day) => (
        <section key={day.day}>
          <div className="mb-2 flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                D{day.day}
              </span>
              <h3 className="text-sm font-bold text-slate-900">{day.title}</h3>
              {day.date ? <span className="text-xs text-slate-400">{day.date}</span> : null}
            </div>
            <span className="text-xs font-medium text-slate-500">
              當日預估 {yen(dayTotal(day.activities))}
            </span>
          </div>
          <div className="space-y-2 border-l-2 border-dashed border-slate-200 pl-3">
            {day.activities.map((activity, i) => (
              <ItineraryCard key={i} activity={activity} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
