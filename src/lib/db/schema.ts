import type { Db } from "./db";

// Idempotent, so a fresh checkout works with no migration step.
// One table holds both the cleaned Elanco data and user reports; `source` tells them apart.
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS sightings (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL CHECK (source IN ('elanco', 'user')),
    observed_at TEXT NOT NULL,
    date TEXT NOT NULL,
    has_time INTEGER NOT NULL,
    city TEXT NOT NULL,
    region TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    species TEXT NOT NULL,
    latin_name TEXT,
    notes TEXT,
    image_key TEXT,
    created_at TEXT
  )`,
  "CREATE INDEX IF NOT EXISTS sightings_date ON sightings (date)",
  "CREATE INDEX IF NOT EXISTS sightings_city_date ON sightings (city, date)",
  "CREATE INDEX IF NOT EXISTS sightings_species ON sightings (species)",
  `CREATE TABLE IF NOT EXISTS sync_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_success_at TEXT,
    last_attempt_at TEXT,
    last_error TEXT,
    report TEXT
  )`,
];

let ready: Promise<void> | null = null;

// Once per isolate. A failure clears the promise so the next request tries again.
export function ensureSchema(db: Db): Promise<void> {
  ready ??= db.batch(SCHEMA.map((sql) => ({ sql }))).catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

export function resetSchemaCache() {
  ready = null;
}
