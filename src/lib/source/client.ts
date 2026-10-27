export const DEFAULT_SOURCE_URL = "https://dev-task.elancoapps.com/data";

export type FetchFn = typeof fetch;

export class SourceError extends Error {
  constructor(
    message: string,
    readonly kind: "rate_limited" | "server" | "network" | "timeout" | "bad_response",
    readonly status?: number,
  ) {
    super(message);
    this.name = "SourceError";
  }
}

interface Options {
  baseUrl?: string;
  fetchFn?: FetchFn;
  timeoutMs?: number;
  // 5xx, network errors and timeouts are retried; 429 is not, see below
  retries?: number;
  backoffMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function getJson(path: string, opts: Options): Promise<unknown> {
  const { baseUrl = DEFAULT_SOURCE_URL, fetchFn = fetch, timeoutMs = 10_000, retries = 2, backoffMs = 500 } = opts;
  const sleep = opts.sleep ?? wait;
  let lastError: SourceError | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(backoffMs * 2 ** (attempt - 1));
    try {
      const res = await fetchFn(`${baseUrl}${path}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      // The API asks callers to wait a minute after a 429. Retrying inside one request
      // would just hold the user up, so give up and let the caller fall back to stored data.
      if (res.status === 429) throw new SourceError("Source API rate limit reached", "rate_limited", 429);
      if (res.status >= 500) {
        lastError = new SourceError(`Source API error ${res.status}`, "server", res.status);
        continue;
      }
      if (!res.ok) throw new SourceError(`Source API returned ${res.status}`, "bad_response", res.status);
      try {
        return await res.json();
      } catch {
        throw new SourceError("Source API returned invalid JSON", "bad_response", res.status);
      }
    } catch (err) {
      if (err instanceof SourceError) {
        if (err.kind !== "server") throw err;
        lastError = err;
      } else if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
        lastError = new SourceError(`Source API timed out after ${timeoutMs}ms`, "timeout");
      } else {
        lastError = new SourceError(`Could not reach source API: ${String(err)}`, "network");
      }
    }
  }
  throw lastError ?? new SourceError("Source API request failed", "network");
}

// One call returns the whole dataset (about 1,000 rows), so a full fetch is cheaper
// on the rate limit than paging city by city.
export async function fetchAllSightings(opts: Options = {}): Promise<unknown[]> {
  const body = await getJson("/tick-sightings", opts);
  if (!Array.isArray(body)) throw new SourceError("Expected a list of sightings", "bad_response");
  return body;
}
