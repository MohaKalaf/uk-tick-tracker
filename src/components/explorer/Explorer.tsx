"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { ACTIVITY } from "@/lib/activity";
import { useApi } from "@/lib/client/api";
import type { CityStat } from "@/lib/db/queries";
import { formatDay, plural } from "@/lib/format";
import type { Sighting } from "@/lib/sightings";
import { FilterBar, type ViewFilters } from "./FilterBar";
import { CityPanel, Overview, type TrendPoint, trendInterval } from "./panels";

// Leaflet touches `window` on import, so the map only loads in the browser
const TickMap = dynamic(() => import("@/components/map/TickMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-fern-soft" />,
});

interface Props {
  speciesOptions: string[];
  years: number[];
  referenceDate: string | null;
}

function readFilters(params: URLSearchParams): ViewFilters {
  return {
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    species: params.getAll("species"),
  };
}

function toQuery(f: ViewFilters, city: string | null, extra: Record<string, string> = {}) {
  const p = new URLSearchParams();
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  for (const s of f.species) p.append("species", s);
  if (city) p.set("city", city);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.toString();
}

export function Explorer({ speciesOptions, years, referenceDate }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = useMemo(() => readFilters(new URLSearchParams(params)), [params]);
  const city = params.get("city");

  // Filters and the selected city live in the URL, so any view can be shared or bookmarked
  const go = useCallback(
    (f: ViewFilters, c: string | null) => router.replace(`${pathname}?${toQuery(f, c)}`, { scroll: false }),
    [router, pathname],
  );

  const base = toQuery(filters, null);
  const cities = useApi<CityStat[]>(`/api/stats/cities?${base}`);
  const reports = useApi<{ items: Sighting[] }>(`/api/sightings?${toQuery(filters, null, { source: "user", limit: "500" })}`);
  const interval = trendInterval(filters.from, filters.to, years);
  const trend = useApi<{ points: TrendPoint[] }>(`/api/stats/trends?${toQuery(filters, city, { interval })}`);
  const latest = useApi<{ items: Sighting[]; total: number }>(city ? `/api/sightings?${toQuery(filters, city, { limit: "20" })}` : null);

  const cityList = cities.data ?? [];
  const total = cityList.reduce((n, c) => n + c.count, 0);
  const selected = cityList.find((c) => c.city === city);
  const error = cities.error ?? trend.error ?? latest.error;
  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}${pathname}?${toQuery(filters, city)}`;

  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-rule px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-[90rem]">
          <h1 className="sr-only">Tick sightings map</h1>
          <FilterBar filters={filters} speciesOptions={speciesOptions} years={years} referenceDate={referenceDate} onChange={(f) => go(f, city)} />
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[90rem] flex-1 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_26rem]">
        <section aria-label="Map" className="relative flex flex-col">
          <div className="h-[60vh] min-h-[22rem] lg:h-auto lg:min-h-[36rem] lg:flex-1">
            <TickMap
              cities={cityList}
              reports={reports.data?.items ?? []}
              selected={city}
              referenceDate={referenceDate}
              onSelect={(c) => go(filters, c)}
            />
          </div>
          {/* On phones the key sits under the map so it doesn't hide the southern cities */}
          <div className="mx-4 mt-3 rounded-md border border-rule bg-panel/95 px-3 py-2 text-xs shadow-sm sm:pointer-events-none sm:absolute sm:bottom-3 sm:left-3 sm:z-[1000] sm:m-0">
            <p className="font-bold">Latest sighting</p>
            {referenceDate && <p className="mb-1 text-muted">compared with the newest data, {formatDay(referenceDate)}</p>}
            <ul className="space-y-0.5">
              {Object.values(ACTIVITY).map((a) => (
                <li key={a.label} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: a.color }} aria-hidden="true" />
                  {a.label}: {a.description}
                </li>
              ))}
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border-2 border-panel bg-fern" aria-hidden="true" />
                Public report, exact spot
              </li>
            </ul>
            <p className="mt-1 text-muted">Bigger circle, more sightings.</p>
          </div>
        </section>

        <aside aria-label={selected ? `Details for ${selected.city}` : "Overview"} className="border-rule p-4 sm:p-6 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:border-l">
          <p role="status" className="sr-only">
            {cities.loading ? "Loading sightings" : `${plural(total, "sighting")} match the filters`}
          </p>
          {error && (
            <p className="mb-4 rounded-md bg-error-soft p-3 text-sm">
              {error.message}
            </p>
          )}
          {selected ? (
            <CityPanel
              stat={selected}
              trend={trend.data?.points ?? []}
              sightings={latest.data?.items ?? []}
              totalSightings={latest.data?.total ?? 0}
              shareUrl={shareUrl}
              referenceDate={referenceDate}
              onBack={() => go(filters, null)}
            />
          ) : city && !cities.loading ? (
            <div className="space-y-3">
              <p>No sightings in {city} match these filters.</p>
              <button type="button" className="text-fern underline underline-offset-4" onClick={() => go(filters, null)}>
                Back to the UK overview
              </button>
            </div>
          ) : cities.data ? (
            <Overview cities={cityList} trend={trend.data?.points ?? []} total={total} onSelect={(c) => go(filters, c)} />
          ) : error ? null : (
            <p className="text-muted">Loading sightings…</p>
          )}
        </aside>
      </div>
    </main>
  );
}
