"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart } from "@/components/BarChart";
import { ACTIVITY, activityOf } from "@/lib/activity";
import type { CityStat } from "@/lib/db/queries";
import { formatDay, formatMonth, numberFormat, plural } from "@/lib/format";
import type { Sighting } from "@/lib/sightings";

export interface TrendPoint {
  period: string;
  count: number;
}

export function trendBars(points: TrendPoint[]) {
  if (points[0]?.period.length === 4) {
    // Yearly: label every year if there's room, otherwise every other one
    const step = points.length > 8 ? 2 : 1;
    return points.map((p, i) => ({ label: i % step === 0 ? p.period : "", title: p.period, value: p.count }));
  }
  return points.map((p) => ({
    // Non-breaking space keeps "Jan 2024" on one line
    label: p.period.endsWith("-01") || points.length <= 12 ? formatMonth(p.period).replace(" ", "\u00a0") : "",
    title: formatMonth(p.period),
    value: p.count,
  }));
}

// Months for up to three years, years beyond that: 150 monthly bars don't fit a side panel
export function trendInterval(from: string | undefined, to: string | undefined, years: number[]): "month" | "year" {
  const first = from ? Number(from.slice(0, 4)) : years[0];
  const last = to ? Number(to.slice(0, 4)) : years.at(-1);
  return first !== undefined && last !== undefined && last - first >= 3 ? "year" : "month";
}

function HBars({ rows, label }: { rows: { name: string; count: number; action?: () => void }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul aria-label={label} className="space-y-2">
      {rows.map((r) => {
        const inner = (
          <>
            <span className="flex justify-between gap-3 text-sm">
              <span className={r.action ? "underline decoration-rule underline-offset-4 group-hover:decoration-fern" : ""}>{r.name}</span>
              <span className="text-muted">{numberFormat.format(r.count)}</span>
            </span>
            <span className="mt-1 block h-1.5 rounded-full bg-fern-soft">
              <span className="block h-full rounded-full bg-fern" style={{ width: `${(r.count / max) * 100}%` }} />
            </span>
          </>
        );
        return (
          <li key={r.name}>
            {r.action ? (
              <button type="button" onClick={r.action} className="group block w-full text-left">
                {inner}
              </button>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ActivityBadge({ latest, reference }: { latest: string; reference: string | null }) {
  const a = ACTIVITY[activityOf(latest, reference)];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-0.5 text-sm">
      <span className="size-2.5 rounded-full" style={{ background: a.color }} aria-hidden="true" />
      {a.label}
      <span className="sr-only">: {a.description}</span>
    </span>
  );
}

export function Overview({
  cities,
  trend,
  total,
  onSelect,
}: {
  cities: CityStat[];
  trend: TrendPoint[];
  total: number;
  onSelect: (city: string) => void;
}) {
  const regions = new Map<string, number>();
  for (const c of cities) regions.set(c.region, (regions.get(c.region) ?? 0) + c.count);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">{plural(total, "sighting")} across the UK</h2>
        <p className="mt-1 text-muted">Choose a city on the map, or from the list below, to see what has been reported there.</p>
      </div>

      <section aria-labelledby="trend-heading">
        <h3 id="trend-heading" className="mb-3 font-bold">Sightings per {trend[0]?.period.length === 4 ? "year" : "month"}</h3>
        <BarChart bars={trendBars(trend)} caption="Sightings over time for the current filters" />
      </section>

      <section aria-labelledby="regions-heading">
        <h3 id="regions-heading" className="mb-3 font-bold">By region</h3>
        <HBars
          label="Sightings by region"
          rows={[...regions.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))}
        />
      </section>

      <section aria-labelledby="cities-heading">
        <h3 id="cities-heading" className="mb-3 font-bold">By city</h3>
        <HBars label="Sightings by city" rows={cities.map((c) => ({ name: c.city, count: c.count, action: () => onSelect(c.city) }))} />
      </section>
    </div>
  );
}

function SightingItem({ s }: { s: Sighting }) {
  const [open, setOpen] = useState(false);
  const hasMore = s.source === "user";
  const when = `${formatDay(s.date)}${s.hasTime ? `, ${s.observedAt.slice(11)}` : ""}`;
  return (
    <li className="border-b border-rule py-2.5 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <span>
          <span className="font-bold">{s.species}</span>
          {s.latinName && <i className="ml-1.5 text-sm text-muted">{s.latinName}</i>}
        </span>
        <span className="shrink-0 text-sm text-muted">{when}</span>
      </div>
      {hasMore && (
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="mt-1 text-sm text-fern underline underline-offset-4"
          >
            Public report{s.notes || s.imageKey ? (open ? ", hide details" : ", show details") : ""}
          </button>
          {open && (
            <div className="mt-2 space-y-2 text-sm">
              {s.notes && <p>{s.notes}</p>}
              {s.imageKey && (
                // eslint-disable-next-line @next/next/no-img-element -- user uploads, served from our own API
                <img
                  src={`/api/sightings/${encodeURIComponent(s.id)}/image`}
                  alt={`Photo of the ${s.species.toLowerCase()} reported in ${s.city}`}
                  className="max-h-56 rounded-md border border-rule"
                  loading="lazy"
                />
              )}
              <p className="text-muted">Reported {s.createdAt ? formatDay(s.createdAt) : ""}. Not verified by an expert.</p>
            </div>
          )}
        </>
      )}
    </li>
  );
}

export function CityPanel({
  stat,
  trend,
  sightings,
  totalSightings,
  shareUrl,
  referenceDate,
  onBack,
}: {
  referenceDate: string | null;
  stat: CityStat;
  trend: TrendPoint[];
  sightings: Sighting[];
  totalSightings: number;
  shareUrl: string;
  onBack: () => void;
}) {
  const [shared, setShared] = useState<string | null>(null);

  async function share() {
    const data = { title: `Tick sightings in ${stat.city}`, url: shareUrl };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setShared("Link copied");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setShared("Couldn't share. Copy the address bar instead.");
    }
  }

  const action = "rounded-md border border-rule bg-panel px-3 py-1.5 text-sm hover:border-fern";
  return (
    <div className="space-y-7">
      <button type="button" onClick={onBack} className="text-sm text-fern underline underline-offset-4">
        Back to the UK overview
      </button>

      <div>
        <h2 className="text-3xl font-bold">{stat.city}</h2>
        <p className="mt-1 text-muted">{stat.region}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ActivityBadge latest={stat.latest} reference={referenceDate} />
          <span>
            {plural(stat.count, "sighting")}, latest {formatDay(stat.latest)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={`/report?city=${encodeURIComponent(stat.city)}`} className="rounded-md bg-fern px-3 py-1.5 text-sm font-bold text-on-fern">
          Report a sighting here
        </Link>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${stat.lat},${stat.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className={action}
        >
          Get directions<span className="sr-only"> (opens Google Maps)</span>
        </a>
        <button type="button" onClick={share} className={action}>
          Share
        </button>
        <span role="status" className="self-center text-sm text-muted">
          {shared}
        </span>
      </div>

      <section aria-labelledby="city-trend">
        <h3 id="city-trend" className="mb-3 font-bold">Activity over time</h3>
        <BarChart bars={trendBars(trend)} caption={`Sightings over time in ${stat.city}`} colour="var(--plum)" />
      </section>

      <section aria-labelledby="city-species">
        <h3 id="city-species" className="mb-3 font-bold">Species reported</h3>
        <HBars label={`Species reported in ${stat.city}`} rows={stat.species.map((s) => ({ name: s.species, count: s.count }))} />
      </section>

      <section aria-labelledby="city-latest">
        <h3 id="city-latest" className="mb-1 font-bold">Latest sightings</h3>
        {totalSightings > sightings.length && (
          <p className="text-sm text-muted">The {sightings.length} most recent of {numberFormat.format(totalSightings)}.</p>
        )}
        <ul>
          {sightings.map((s) => (
            <SightingItem key={s.id} s={s} />
          ))}
        </ul>
      </section>
    </div>
  );
}
