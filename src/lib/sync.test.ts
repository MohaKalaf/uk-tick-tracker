import { describe, expect, it, vi } from "vitest";
import { memoryDb } from "@/test/sqlite";
import { countSightings, getSyncState } from "@/lib/db/queries";
import { FRESH_FOR_MS, RETRY_AFTER_MS, ensureFresh } from "./sync";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const DATA = [{ id: "1", date: "2025-08-14T17:30:00", location: "London", species: "Sheep tick", latinName: "Ixodes ricinus" }];
const at = (ms: number) => () => new Date(Date.UTC(2026, 9, 27) + ms);

describe("ensureFresh", () => {
  it("syncs on first use, then not again while fresh", async () => {
    const db = memoryDb();
    const fetchFn = vi.fn(async () => json(DATA));
    await ensureFresh(db, { fetchFn, now: at(0) });
    await ensureFresh(db, { fetchFn, now: at(FRESH_FOR_MS - 1000) });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(await countSightings(db)).toBe(1);

    await ensureFresh(db, { fetchFn, now: at(FRESH_FOR_MS + 1000) });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("serves stored data when the source is down, and backs off", async () => {
    const db = memoryDb();
    await ensureFresh(db, { fetchFn: async () => json(DATA), now: at(0) });

    const down = vi.fn(async () => json({ error: "Rate limit exceeded" }, 429));
    const result = await ensureFresh(db, { fetchFn: down, now: at(FRESH_FOR_MS + 1) });
    expect(result.stale).toBe(true);
    expect(result.lastError).toMatch(/rate limit/i);
    expect(await countSightings(db)).toBe(1);

    // Within the back-off window the source isn't asked again
    await ensureFresh(db, { fetchFn: down, now: at(FRESH_FOR_MS + RETRY_AFTER_MS / 2) });
    expect(down).toHaveBeenCalledTimes(1);
  });

  it("fails only when there is no stored data to fall back on", async () => {
    const db = memoryDb();
    const down = vi.fn(async () => json({ error: "x" }, 429));
    await expect(ensureFresh(db, { fetchFn: down, now: at(0) })).rejects.toThrow();
    expect((await getSyncState(db)).lastError).toMatch(/rate limit/i);
    // Still an error while backing off, rather than an empty "no sightings" answer
    await expect(ensureFresh(db, { fetchFn: down, now: at(RETRY_AFTER_MS / 2) })).rejects.toThrow(/rate limit/i);
    expect(down).toHaveBeenCalledTimes(1);
  });

  it("keeps the old data if the source returns nothing usable", async () => {
    const db = memoryDb();
    await ensureFresh(db, { fetchFn: async () => json(DATA), now: at(0) });
    const result = await ensureFresh(db, { fetchFn: async () => json([{ location: "Atlantis" }]), now: at(FRESH_FOR_MS + 1) });
    expect(result.stale).toBe(true);
    expect(await countSightings(db)).toBe(1);
  });
});
