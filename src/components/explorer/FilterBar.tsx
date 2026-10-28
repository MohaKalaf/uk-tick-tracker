"use client";

import { useId } from "react";

export interface ViewFilters {
  from?: string;
  to?: string;
  species: string[];
}

interface Props {
  filters: ViewFilters;
  speciesOptions: string[];
  years: number[];
  // Newest date in the source data; "latest 12 months" counts back from here
  referenceDate: string | null;
  onChange: (next: ViewFilters) => void;
}

const isoDaysBefore = (end: string | null, days: number) =>
  new Date((end ? Date.parse(`${end}T00:00:00Z`) : Date.now()) - days * 86_400_000).toISOString().slice(0, 10);

type Range = { key: string; label: string; from?: string; to?: string };

function ranges(years: number[], reference: string | null): Range[] {
  return [
    { key: "all", label: "All time" },
    { key: "12m", label: "Latest 12 months", from: isoDaysBefore(reference, 365), to: reference ?? undefined },
    ...[...years].reverse().map((y) => ({ key: `y${y}`, label: String(y), from: `${y}-01-01`, to: `${y}-12-31` })),
  ];
}

function currentRange(f: ViewFilters, options: Range[]): string {
  if (!f.from && !f.to) return "all";
  const match = options.find((o) => o.from === f.from && o.to === f.to);
  return match?.key ?? "custom";
}

export function FilterBar({ filters, speciesOptions, years, referenceDate, onChange }: Props) {
  const id = useId();
  const options = ranges(years, referenceDate);
  const range = currentRange(filters, options);
  const toggleSpecies = (s: string) =>
    onChange({
      ...filters,
      species: filters.species.includes(s) ? filters.species.filter((x) => x !== s) : [...filters.species, s],
    });

  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">When</span>
          <select
            value={range}
            onChange={(e) => {
              const picked = options.find((o) => o.key === e.target.value);
              if (picked) onChange({ ...filters, from: picked.from, to: picked.to });
              else onChange({ ...filters, from: filters.from ?? isoDaysBefore(referenceDate, 90), to: filters.to ?? isoDaysBefore(referenceDate, 0) });
            }}
            className="rounded-md border border-rule bg-panel px-2.5 py-1.5"
          >
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
            <option value="custom">Choose dates…</option>
          </select>
        </label>
        {range === "custom" && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">From</span>
              <input
                type="date"
                value={filters.from ?? ""}
                max={filters.to}
                onChange={(e) => onChange({ ...filters, from: e.target.value || undefined })}
                className="rounded-md border border-rule bg-panel px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">To</span>
              <input
                type="date"
                value={filters.to ?? ""}
                min={filters.from}
                onChange={(e) => onChange({ ...filters, to: e.target.value || undefined })}
                className="rounded-md border border-rule bg-panel px-2 py-1"
              />
            </label>
          </>
        )}
      </div>

      <fieldset className="flex flex-col gap-1 text-sm">
        <legend className="mb-1 text-muted" id={`${id}-species`}>
          Species {filters.species.length === 0 && <span className="sr-only">(all shown)</span>}
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {speciesOptions.map((s) => {
            const on = filters.species.includes(s);
            return (
              <label
                key={s}
                className={`cursor-pointer rounded-full border px-3 py-1 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-fern ${
                  on ? "border-fern bg-fern text-on-fern" : "border-rule bg-panel hover:border-fern"
                }`}
              >
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleSpecies(s)} />
                {s}
              </label>
            );
          })}
        </div>
      </fieldset>

      {(filters.from || filters.to || filters.species.length > 0) && (
        <button
          type="button"
          onClick={() => onChange({ species: [] })}
          className="text-sm text-fern underline underline-offset-4"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
