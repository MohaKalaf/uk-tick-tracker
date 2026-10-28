import { distanceKm, placeNamed, type Region } from "@/lib/geo/places";
import type { Sighting } from "@/lib/sightings";
import type { QualityReport } from "@/lib/source/clean";
import type { Db, Param, Statement } from "./db";

export interface Filters {
  from?: string; // YYYY-MM-DD, inclusive
  to?: string;
  city?: string;
  region?: Region;
  species?: string[];
  source?: "elanco" | "user";
  near?: { lat: number; lng: number; radiusKm: number };
}

interface Row {
  id: string;
  source: "elanco" | "user";
  observed_at: string;
  date: string;
  has_time: number;
  city: string;
  region: Region;
  lat: number;
  lng: number;
  species: string;
  latin_name: string | null;
  notes: string | null;
  image_key: string | null;
  created_at: string | null;
}

const COLUMNS = "id, source, observed_at, date, has_time, city, region, lat, lng, species, latin_name, notes, image_key, created_at";

function toSighting(r: Row): Sighting {
  return {
    id: r.id,
    source: r.source,
    observedAt: r.observed_at,
    date: r.date,
    hasTime: r.has_time === 1,
    city: r.city,
    region: r.region,
    lat: r.lat,
    lng: r.lng,
    species: r.species,
    latinName: r.latin_name,
    notes: r.notes,
    imageKey: r.image_key,
    createdAt: r.created_at,
  };
}

function values(s: Sighting): Param[] {
  return [s.id, s.source, s.observedAt, s.date, s.hasTime ? 1 : 0, s.city, s.region, s.lat, s.lng,
    s.species, s.latinName, s.notes, s.imageKey, s.createdAt];
}

export function where(f: Filters): { sql: string; params: Param[] } {
  const parts: string[] = [];
  const params: Param[] = [];
  if (f.from) { parts.push("date >= ?"); params.push(f.from); }
  if (f.to) { parts.push("date <= ?"); params.push(f.to); }
  if (f.city) { parts.push("city = ?"); params.push(f.city); }
  if (f.region) { parts.push("region = ?"); params.push(f.region); }
  if (f.source) { parts.push("source = ?"); params.push(f.source); }
  if (f.species?.length) {
    parts.push(`species IN (${f.species.map(() => "?").join(", ")})`);
    params.push(...f.species);
  }
  if (f.near) {
    // Bounding box in SQL (index-friendly); exact distance is checked afterwards
    const dLat = f.near.radiusKm / 111;
    const dLng = f.near.radiusKm / (111 * Math.cos((f.near.lat * Math.PI) / 180));
    parts.push("lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?");
    params.push(f.near.lat - dLat, f.near.lat + dLat, f.near.lng - dLng, f.near.lng + dLng);
  }
  return { sql: parts.length ? `WHERE ${parts.join(" AND ")}` : "", params };
}

// --- writes -------------------------------------------------------------------

// 14 columns x 7 rows stays under D1's 100 bound parameters per statement
const ROWS_PER_INSERT = 7;

function insertStatements(rows: Sighting[]): Statement[] {
  const out: Statement[] = [];
  for (let i = 0; i < rows.length; i += ROWS_PER_INSERT) {
    const chunk = rows.slice(i, i + ROWS_PER_INSERT);
    out.push({
      sql: `INSERT INTO sightings (${COLUMNS}) VALUES ${chunk.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}`,
      params: chunk.flatMap(values),
    });
  }
  return out;
}

// Swap in a fresh copy of the source data in one transaction: readers see the old
// set or the new one, never a half-written mix. User reports are untouched.
export async function replaceSourceSightings(db: Db, rows: Sighting[], report: QualityReport, now: string) {
  await db.batch([
    { sql: "DELETE FROM sightings WHERE source = 'elanco'" },
    ...insertStatements(rows),
    {
      sql: `INSERT INTO sync_state (id, last_success_at, last_attempt_at, last_error, report) VALUES (1, ?, ?, NULL, ?)
            ON CONFLICT (id) DO UPDATE SET last_success_at = excluded.last_success_at,
              last_attempt_at = excluded.last_attempt_at, last_error = NULL, report = excluded.report`,
      params: [now, now, JSON.stringify(report)],
    },
  ]);
}

export async function recordSyncFailure(db: Db, error: string, now: string) {
  await db.run(
    `INSERT INTO sync_state (id, last_attempt_at, last_error) VALUES (1, ?, ?)
     ON CONFLICT (id) DO UPDATE SET last_attempt_at = excluded.last_attempt_at, last_error = excluded.last_error`,
    [now, error],
  );
}

export async function insertSighting(db: Db, s: Sighting) {
  await db.batch(insertStatements([s]));
}

// --- reads ----------------------------------------------------------------------

export interface SyncState {
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  report: QualityReport | null;
}

export async function getSyncState(db: Db): Promise<SyncState> {
  const row = await db.first<{ last_success_at: string | null; last_attempt_at: string | null; last_error: string | null; report: string | null }>(
    "SELECT last_success_at, last_attempt_at, last_error, report FROM sync_state WHERE id = 1",
  );
  return {
    lastSuccessAt: row?.last_success_at ?? null,
    lastAttemptAt: row?.last_attempt_at ?? null,
    lastError: row?.last_error ?? null,
    report: row?.report ? (JSON.parse(row.report) as QualityReport) : null,
  };
}

export async function countSightings(db: Db): Promise<number> {
  return (await db.first<{ n: number }>("SELECT COUNT(*) AS n FROM sightings"))?.n ?? 0;
}

export async function getSighting(db: Db, id: string): Promise<Sighting | null> {
  const row = await db.first<Row>(`SELECT ${COLUMNS} FROM sightings WHERE id = ?`, [id]);
  return row ? toSighting(row) : null;
}

export type Sort = "newest" | "oldest";

export async function searchSightings(
  db: Db,
  f: Filters,
  page: { limit: number; offset: number; sort: Sort },
): Promise<{ total: number; items: Sighting[] }> {
  const w = where(f);
  const order = page.sort === "oldest" ? "observed_at ASC, id" : "observed_at DESC, id";
  if (!f.near) {
    const total = (await db.first<{ n: number }>(`SELECT COUNT(*) AS n FROM sightings ${w.sql}`, w.params))?.n ?? 0;
    const rows = await db.all<Row>(`SELECT ${COLUMNS} FROM sightings ${w.sql} ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...w.params, page.limit, page.offset]);
    return { total, items: rows.map(toSighting) };
  }
  // Radius search: the box over-selects corners, so trim by true distance before paging
  const rows = (await db.all<Row>(`SELECT ${COLUMNS} FROM sightings ${w.sql} ORDER BY ${order}`, w.params))
    .filter((r) => distanceKm(f.near!.lat, f.near!.lng, r.lat, r.lng) <= f.near!.radiusKm);
  return { total: rows.length, items: rows.slice(page.offset, page.offset + page.limit).map(toSighting) };
}

export interface CityStat {
  city: string;
  region: Region;
  lat: number;
  lng: number;
  count: number;
  latest: string;
  species: { species: string; count: number }[];
}

// One map marker per city. User reports with exact coordinates still count towards
// their city here; the map draws them separately as well.
export async function cityStats(db: Db, f: Filters): Promise<CityStat[]> {
  const w = where(f);
  const [cities, bySpecies] = await Promise.all([
    db.all<{ city: string; region: Region; count: number; latest: string }>(
      `SELECT city, region, COUNT(*) AS count, MAX(date) AS latest FROM sightings ${w.sql}
       GROUP BY city, region ORDER BY count DESC, city`, w.params),
    db.all<{ city: string; species: string; count: number }>(
      `SELECT city, species, COUNT(*) AS count FROM sightings ${w.sql}
       GROUP BY city, species ORDER BY count DESC, species`, w.params),
  ]);
  return cities.flatMap((c) => {
    const place = placeNamed(c.city);
    if (!place) return [];
    return [{
      ...c,
      lat: place.lat,
      lng: place.lng,
      species: bySpecies.filter((s) => s.city === c.city).map(({ species, count }) => ({ species, count })),
    }];
  });
}

export async function regionStats(db: Db, f: Filters): Promise<{ region: Region; count: number; cities: number }[]> {
  const w = where(f);
  return db.all(
    `SELECT region, COUNT(*) AS count, COUNT(DISTINCT city) AS cities FROM sightings ${w.sql}
     GROUP BY region ORDER BY count DESC, region`, w.params);
}

export type Interval = "week" | "month" | "year";

// Week buckets start on Monday: step back six days, then forward to the next Monday
const BUCKET: Record<Interval, string> = {
  week: "date(date, '-6 days', 'weekday 1')",
  month: "substr(date, 1, 7)",
  year: "substr(date, 1, 4)",
};

export async function trend(db: Db, f: Filters, interval: Interval): Promise<{ period: string; count: number }[]> {
  const w = where(f);
  const rows = await db.all<{ period: string; count: number }>(
    `SELECT ${BUCKET[interval]} AS period, COUNT(*) AS count FROM sightings ${w.sql} GROUP BY period ORDER BY period`,
    w.params);
  return fillGaps(rows, interval);
}

// Periods with no sightings are missing from GROUP BY; a chart needs them as zeros
export function fillGaps(rows: { period: string; count: number }[], interval: Interval) {
  if (rows.length < 2) return rows;
  const counts = new Map(rows.map((r) => [r.period, r.count]));
  const out: { period: string; count: number }[] = [];
  const last = rows[rows.length - 1].period;
  if (interval === "year") {
    for (let y = Number(rows[0].period); y <= Number(last); y++) out.push({ period: String(y), count: counts.get(String(y)) ?? 0 });
  } else if (interval === "month") {
    let [y, m] = rows[0].period.split("-").map(Number);
    for (let p = rows[0].period; p <= last; ) {
      out.push({ period: p, count: counts.get(p) ?? 0 });
      m++;
      if (m > 12) { m = 1; y++; }
      p = `${y}-${String(m).padStart(2, "0")}`;
    }
  } else {
    const d = new Date(`${rows[0].period}T00:00:00Z`);
    for (let p = rows[0].period; p <= last; ) {
      out.push({ period: p, count: counts.get(p) ?? 0 });
      d.setUTCDate(d.getUTCDate() + 7);
      p = d.toISOString().slice(0, 10);
    }
  }
  return out;
}

// Sightings per calendar month for one year, always 12 entries
export async function seasonal(db: Db, f: Filters, year: number): Promise<{ month: number; count: number }[]> {
  const w = where({ ...f, from: `${year}-01-01`, to: `${year}-12-31` });
  const rows = await db.all<{ month: number; count: number }>(
    `SELECT CAST(substr(date, 6, 2) AS INTEGER) AS month, COUNT(*) AS count FROM sightings ${w.sql} GROUP BY month`,
    w.params);
  const byMonth = new Map(rows.map((r) => [r.month, r.count]));
  return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: byMonth.get(i + 1) ?? 0 }));
}

export interface Overview {
  total: number;
  firstDate: string | null;
  lastDate: string | null;
  // Latest date in Elanco's data, ignoring public reports: a sensible default for charts
  latestSourceDate: string | null;
  years: number[];
  species: { species: string; latinName: string | null; count: number }[];
  cities: { city: string; region: Region; count: number }[];
  userReports: number;
}

export async function overview(db: Db): Promise<Overview> {
  const [range, years, species, cities, users, source] = await Promise.all([
    db.first<{ total: number; first: string | null; last: string | null }>(
      "SELECT COUNT(*) AS total, MIN(date) AS first, MAX(date) AS last FROM sightings"),
    db.all<{ year: number }>("SELECT DISTINCT CAST(substr(date, 1, 4) AS INTEGER) AS year FROM sightings ORDER BY year"),
    db.all<{ species: string; latinName: string | null; count: number }>(
      "SELECT species, MAX(latin_name) AS latinName, COUNT(*) AS count FROM sightings GROUP BY species ORDER BY count DESC, species"),
    db.all<{ city: string; region: Region; count: number }>(
      "SELECT city, region, COUNT(*) AS count FROM sightings GROUP BY city, region ORDER BY city"),
    db.first<{ n: number }>("SELECT COUNT(*) AS n FROM sightings WHERE source = 'user'"),
    db.first<{ last: string | null }>("SELECT MAX(date) AS last FROM sightings WHERE source = 'elanco'"),
  ]);
  return {
    total: range?.total ?? 0,
    firstDate: range?.first ?? null,
    lastDate: range?.last ?? null,
    latestSourceDate: source?.last ?? null,
    years: years.map((y) => y.year),
    species,
    cities,
    userReports: users?.n ?? 0,
  };
}
