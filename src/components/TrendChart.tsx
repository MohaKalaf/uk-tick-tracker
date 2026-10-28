"use client";

import { useState } from "react";
import { BarChart } from "@/components/BarChart";
import { useApi } from "@/lib/client/api";
import { formatDay, formatMonth } from "@/lib/format";

type Interval = "week" | "month";

export function TrendChart({ lastDate }: { lastDate: string | null }) {
  const [interval, setInterval] = useState<Interval>("month");
  // Weekly bars over all years would be unreadably thin, so weeks cover the final year of data
  const from = interval === "week" && lastDate ? `${Number(lastDate.slice(0, 4)) - 1}${lastDate.slice(4)}` : undefined;
  const query = new URLSearchParams({ interval, ...(from ? { from } : {}) });
  const { data, error } = useApi<{ points: { period: string; count: number }[] }>(`/api/stats/trends?${query}`);
  const points = data?.points ?? [];

  return (
    <div>
      <div role="radiogroup" aria-label="Group by" className="mb-4 inline-flex rounded-md bg-fern-soft p-0.5 text-sm">
        {(["month", "week"] as const).map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={interval === i}
            onClick={() => setInterval(i)}
            className={`rounded px-3 py-1 ${interval === i ? "bg-panel font-bold shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {i === "month" ? "Monthly, all years" : "Weekly, last 12 months"}
          </button>
        ))}
      </div>
      {error ? (
        <p className="rounded-md bg-error-soft p-3 text-sm">{error.message}</p>
      ) : (
        <BarChart
          height={170}
          caption={interval === "month" ? "Sightings per month" : "Sightings per week over the last year of data"}
          bars={points.map((p) =>
            interval === "month"
              ? { label: p.period.endsWith("-01") ? p.period.slice(0, 4) : "", title: formatMonth(p.period), value: p.count }
              : { label: p.period.slice(8) === "01" || points.indexOf(p) % 8 === 0 ? formatDay(p.period).slice(0, -5) : "", title: `Week of ${formatDay(p.period)}`, value: p.count },
          )}
        />
      )}
    </div>
  );
}
