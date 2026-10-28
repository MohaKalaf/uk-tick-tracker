import type { Db } from "@/lib/db/db";
import { countSightings, getSyncState, recordSyncFailure, replaceSourceSightings } from "@/lib/db/queries";
import { cleanSightings } from "@/lib/source/clean";
import { type FetchFn, SourceError, fetchAllSightings } from "@/lib/source/client";

// The source changes slowly; re-fetching more often only spends its rate limit
export const FRESH_FOR_MS = 6 * 60 * 60 * 1000;
// After a failure, wait before trying again, so an outage isn't hammered by every request
export const RETRY_AFTER_MS = 2 * 60 * 1000;

export interface Freshness {
  lastSuccessAt: string | null;
  lastError: string | null;
  // true when the source could not be reached and older data is being served
  stale: boolean;
}

interface Deps {
  sourceUrl?: string;
  fetchFn?: FetchFn;
  now?: () => Date;
}

export async function syncNow(db: Db, deps: Deps = {}): Promise<void> {
  const now = (deps.now ?? (() => new Date()))().toISOString();
  try {
    const raw = await fetchAllSightings({ baseUrl: deps.sourceUrl, fetchFn: deps.fetchFn });
    const { sightings, report } = cleanSightings(raw);
    // An empty or wholly invalid response would wipe good data; keep what we have
    if (sightings.length === 0) throw new SourceError("Source returned no usable sightings", "bad_response");
    await replaceSourceSightings(db, sightings, report, now);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recordSyncFailure(db, message, now);
    throw err;
  }
}

// One sync at a time per isolate; concurrent requests share it
let inFlight: Promise<void> | null = null;

export async function ensureFresh(db: Db, deps: Deps = {}): Promise<Freshness> {
  const now = (deps.now ?? (() => new Date()))().getTime();
  const state = await getSyncState(db);
  const age = (iso: string | null) => (iso ? now - Date.parse(iso) : Infinity);

  const fresh = age(state.lastSuccessAt) < FRESH_FOR_MS;
  const recentlyFailed = state.lastError !== null && age(state.lastAttemptAt) < RETRY_AFTER_MS;
  if (fresh) return { lastSuccessAt: state.lastSuccessAt, lastError: null, stale: false };
  if (recentlyFailed) {
    // Backing off: serve stored data, but an empty database is an outage, not "no sightings"
    if (state.lastSuccessAt === null && (await countSightings(db)) === 0) {
      throw new SourceError(state.lastError ?? "Source API unavailable", "network");
    }
    return { lastSuccessAt: state.lastSuccessAt, lastError: state.lastError, stale: true };
  }

  inFlight ??= syncNow(db, deps).finally(() => {
    inFlight = null;
  });
  try {
    await inFlight;
    const after = await getSyncState(db);
    return { lastSuccessAt: after.lastSuccessAt, lastError: null, stale: false };
  } catch (err) {
    // Serve what we already have; only fail when there is nothing at all
    if ((await countSightings(db)) === 0) throw err;
    return { lastSuccessAt: state.lastSuccessAt, lastError: err instanceof Error ? err.message : String(err), stale: true };
  }
}
