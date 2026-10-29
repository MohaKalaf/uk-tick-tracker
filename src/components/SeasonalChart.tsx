"use client";

import { useState } from "react";
import { BarChart } from "@/components/BarChart";
import { useApi } from "@/lib/client/api";
import { monthName, numberFormat } from "@/lib/format";

interface Props {
  cities: string[];
  years: number[];
  defaultYear: number;
}

export function SeasonalChart({ cities, years, defaultYear }: Props) {
  const [city, setCity] = useState("");
  const [year, setYear] = useState(defaultYear);
  const query = new URLSearchParams({ year: String(year), ...(city ? { city } : {}) });
  const { data, error, loading } = useApi<{ months: { month: number; count: number }[] }>(`/api/stats/seasonal?${query}`);

  const months = data?.months ?? [];
  const total = months.reduce((n, m) => n + m.count, 0);
  const peak = months.reduce((a, b) => (b.count > a.count ? b : a), { month: 0, count: 0 });
  const place = city || "the UK";

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Place</span>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-md border border-rule bg-panel px-2.5 py-1.5">
            <option value="">All of the UK</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Year</span>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-md border border-rule bg-panel px-2.5 py-1.5">
            {[...years].reverse().map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-md bg-error-soft p-3 text-sm">{error.message}</p>
      ) : (
        <div aria-busy={loading} className={loading ? "opacity-60" : ""}>
          <p role="status" className="mb-4">
            {total === 0
              ? `No sightings were reported in ${place} in ${year}.`
              : `${numberFormat.format(total)} sightings in ${place} in ${year}, most in ${monthName(peak.month)}.`}
          </p>
          <BarChart
            height={180}
            caption={`Tick sightings per month in ${place}, ${year}`}
            colour="var(--ochre)"
            bars={months.map((m) => ({ label: monthName(m.month), value: m.count }))}
          />
        </div>
      )}
    </div>
  );
}
