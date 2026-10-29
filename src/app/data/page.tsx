import type { Metadata } from "next";
import { connection } from "next/server";
import { TrendChart } from "@/components/TrendChart";
import { getSyncState, overview, regionStats } from "@/lib/db/queries";
import { formatDay, numberFormat } from "@/lib/format";
import { readyContext } from "@/lib/server/context";
import type { QualityReport } from "@/lib/source/clean";

export const metadata: Metadata = {
  title: "Data",
  description: "Where the sighting data comes from, how it is cleaned, and the API behind this site.",
};

const DROPPED: Record<keyof QualityReport["dropped"], string> = {
  duplicateId: "Same id appeared twice",
  duplicateContent: "Same time, place and species under a different id",
  missingDate: "No date",
  invalidDate: "Date that doesn't exist (e.g. 30 February)",
  futureDate: "Date in the future",
  missingLocation: "No location",
  unknownLocation: "Location that isn't a UK city we can map",
  notAnObject: "Not a sighting record at all",
};

const FIXED: Record<keyof QualityReport["fixed"], string> = {
  locationSpelling: "City name tidied (case, spacing, spelling, alternative names)",
  speciesFromLatin: "Species name filled in or corrected from the Latin name",
  latinCorrected: "Latin name corrected to match the species",
  unknownSpecies: "Species not recognised, kept as “Unknown species”",
  generatedId: "Missing id, given a stable one",
};

const ENDPOINTS = [
  ["GET", "/api/sightings", "Search sightings. Filters: from, to, city, region, species, source, near=lat,lng with radiusKm. Paged with limit and offset."],
  ["GET", "/api/sightings/{id}", "One sighting."],
  ["POST", "/api/sightings", "Report a sighting (form data, optional photo)."],
  ["GET", "/api/stats/cities", "Sightings per city with coordinates and species mix. Takes the same filters."],
  ["GET", "/api/stats/regions", "Sightings per region."],
  ["GET", "/api/stats/trends", "Sightings per week, month or year (interval=week|month|year)."],
  ["GET", "/api/stats/seasonal", "Sightings per month of one year (year=2024, optional city)."],
  ["GET", "/api/meta", "Totals, species, years and the latest cleaning report."],
  ["GET", "/api/health", "Is there data, and when was it last synced."],
];

function Row({ label, value, examples }: { label: string; value: number; examples?: string[] }) {
  return (
    <tr className="border-t border-rule align-top">
      <td className="py-2 pr-4">
        {label}
        {examples && examples.length > 0 && value > 0 && (
          <span className="mt-0.5 block text-sm break-all text-muted">e.g. {examples.slice(0, 2).join("; ")}</span>
        )}
      </td>
      <td className={`py-2 text-right ${value > 0 ? "font-bold" : "text-muted"}`}>{numberFormat.format(value)}</td>
    </tr>
  );
}

async function load() {
  try {
    const { db, freshness } = await readyContext();
    const [data, sync, regions] = await Promise.all([overview(db), getSyncState(db), regionStats(db, {})]);
    return { freshness, data, sync, regions };
  } catch {
    return null;
  }
}

function Unavailable() {
  return (
    <p className="mt-10 rounded-md bg-error-soft p-4">
      Sighting data is unavailable right now because the source API couldn&apos;t be reached. Please try again in a minute.
    </p>
  );
}

function Details({ loaded }: { loaded: NonNullable<Awaited<ReturnType<typeof load>>> }) {
  const { freshness, data, sync, regions } = loaded;
  const report = sync.report;
  const regionMax = Math.max(1, ...regions.map((r) => r.count));
  return (
    <>
      <section aria-labelledby="sync-h" className="mt-10">
        <h2 id="sync-h" className="text-2xl font-bold">Where the data comes from</h2>
        <p className="mt-3 max-w-2xl">
          The site copies Elanco&apos;s tick sighting API into its own database, cleans it, and adds reports from
          people using this site. It refreshes at most every six hours, so the source isn&apos;t asked on every
          visit. If the source is down or rate-limited, the last good copy keeps being served.
        </p>
        <dl className="mt-5 grid max-w-2xl grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
          <dt className="text-muted">Last synced</dt>
          <dd>{sync.lastSuccessAt ? new Date(sync.lastSuccessAt).toLocaleString("en-GB", { timeZone: "Europe/London" }) : "Never"}</dd>
          <dt className="text-muted">Status</dt>
          <dd>{freshness.stale ? `Showing saved data. The source couldn't be reached (${freshness.lastError}).` : "Up to date"}</dd>
          <dt className="text-muted">Sightings</dt>
          <dd>
            {numberFormat.format(data.total)}, from {data.firstDate ? formatDay(data.firstDate) : "?"} to{" "}
            {data.lastDate ? formatDay(data.lastDate) : "?"}, including {numberFormat.format(data.userReports)} public reports
          </dd>
        </dl>
      </section>

      {report && (
        <section aria-labelledby="clean-h" className="mt-12">
          <h2 id="clean-h" className="text-2xl font-bold">How it was cleaned</h2>
          <p className="mt-3 max-w-2xl">
            The last sync received {numberFormat.format(report.received)} records and kept{" "}
            {numberFormat.format(report.kept)}. Records are dropped only when they can&apos;t be placed on the map or
            timeline, or would count the same sighting twice. Everything else is fixed and kept.
          </p>
          <div className="mt-6 grid gap-10 lg:grid-cols-2">
            <table className="w-full">
              <caption className="mb-2 text-left font-bold">Dropped</caption>
              <tbody>
                {(Object.keys(DROPPED) as (keyof typeof DROPPED)[]).map((k) => (
                  <Row key={k} label={DROPPED[k]} value={report.dropped[k]} examples={report.examples[k]} />
                ))}
              </tbody>
            </table>
            <table className="w-full">
              <caption className="mb-2 text-left font-bold">Fixed and kept</caption>
              <tbody>
                {(Object.keys(FIXED) as (keyof typeof FIXED)[]).map((k) => (
                  <Row key={k} label={FIXED[k]} value={report.fixed[k]} examples={report.examples[k]} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="trend-h" className="mt-12">
        <h2 id="trend-h" className="mb-4 text-2xl font-bold">Sightings over time</h2>
        <TrendChart lastDate={data.latestSourceDate} />
      </section>

      <section aria-labelledby="region-h" className="mt-12">
        <h2 id="region-h" className="text-2xl font-bold">Sightings by region</h2>
        <table className="mt-4 w-full max-w-3xl">
          <thead className="text-left text-sm text-muted">
            <tr>
              <th scope="col" className="py-2 font-normal">Region</th>
              <th scope="col" className="w-2/5 py-2 font-normal"><span className="sr-only">Share</span></th>
              <th scope="col" className="py-2 text-right font-normal">Cities</th>
              <th scope="col" className="py-2 text-right font-normal">Sightings</th>
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => (
              <tr key={r.region} className="border-t border-rule">
                <th scope="row" className="py-2 pr-4 text-left font-normal">{r.region}</th>
                <td className="py-2 pr-4" aria-hidden="true">
                  <span className="block h-2 rounded-full bg-fern" style={{ width: `${(r.count / regionMax) * 100}%` }} />
                </td>
                <td className="py-2 text-right text-muted">{r.cities}</td>
                <td className="py-2 text-right font-bold">{numberFormat.format(r.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export default async function DataPage() {
  await connection();
  const loaded = await load();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-4xl font-bold sm:text-5xl">About the data</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        How sightings get from Elanco&apos;s API onto the map, what was wrong with them, and the API you can use too.
      </p>
      {loaded ? <Details loaded={loaded} /> : <Unavailable />}
      <section aria-labelledby="api-h" className="mt-12">
        <h2 id="api-h" className="text-2xl font-bold">This site&apos;s API</h2>
        <p className="mt-3 max-w-2xl">
          The pages above use these endpoints, and you can call them directly. Errors always come back as{" "}
          <code className="rounded bg-fern-soft px-1">{"{ error: { code, message, details } }"}</code> with a matching
          status code.
        </p>
        <ul className="mt-5 max-w-3xl divide-y divide-rule border-y border-rule">
          {ENDPOINTS.map(([method, path, what]) => (
            <li key={method + path} className="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[4rem_15rem_1fr]">
              <span className="text-sm font-bold text-fern">{method}</span>
              <code className="text-sm break-all">{path}</code>
              <span className="text-sm text-muted">{what}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
