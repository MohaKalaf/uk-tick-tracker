import { describe, expect, it, vi } from "vitest";
import { SourceError, fetchAllSightings } from "./client";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const noSleep = async () => {};

describe("fetchAllSightings", () => {
  it("returns the list from /tick-sightings", async () => {
    const fetchFn = vi.fn(async () => json([{ id: "1" }]));
    await expect(fetchAllSightings({ fetchFn, baseUrl: "https://api.test" })).resolves.toEqual([{ id: "1" }]);
    expect(fetchFn).toHaveBeenCalledWith("https://api.test/tick-sightings", expect.anything());
  });

  it("retries server errors, then succeeds", async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(json({ error: "Internal server error" }, 500))
      .mockResolvedValueOnce(json([]));
    await expect(fetchAllSightings({ fetchFn, sleep: noSleep })).resolves.toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("gives up after the retry budget", async () => {
    const fetchFn = vi.fn(async () => json({ error: "down" }, 503));
    await expect(fetchAllSightings({ fetchFn, sleep: noSleep, retries: 2 })).rejects.toMatchObject({ kind: "server", status: 503 });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("does not retry a rate limit", async () => {
    const fetchFn = vi.fn(async () => json({ error: "Rate limit exceeded" }, 429));
    await expect(fetchAllSightings({ fetchFn, sleep: noSleep })).rejects.toMatchObject({ kind: "rate_limited" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("reports timeouts and network failures as source errors", async () => {
    const timeout = vi.fn(async () => { throw new DOMException("timed out", "TimeoutError"); });
    await expect(fetchAllSightings({ fetchFn: timeout, sleep: noSleep, retries: 0 })).rejects.toMatchObject({ kind: "timeout" });
    const offline = vi.fn(async () => { throw new TypeError("fetch failed"); });
    await expect(fetchAllSightings({ fetchFn: offline, sleep: noSleep, retries: 0 })).rejects.toBeInstanceOf(SourceError);
  });

  it("rejects a body that is not a list", async () => {
    const fetchFn = vi.fn(async () => json({ message: "hi" }));
    await expect(fetchAllSightings({ fetchFn })).rejects.toMatchObject({ kind: "bad_response" });
  });
});
