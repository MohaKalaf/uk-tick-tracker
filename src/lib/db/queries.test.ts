import { describe, expect, it } from "vitest";
import { memoryDb } from "@/test/sqlite";
import type { Sighting } from "@/lib/sightings";
import { cleanSightings } from "@/lib/source/clean";
import {
  cityStats, fillGaps, getSyncState, insertSighting, overview, regionStats, replaceSourceSightings,
  searchSightings, seasonal, trend,
} from "./queries";

const NOW = new Date("2026-10-27T12:00:00Z");
const raw = (id: string, date: string, location: string, latinName = "Ixodes ricinus") =>
  ({ id, date: `${date}T10:00:00`, location, species: "", latinName });

async function seeded() {
  const db = memoryDb();
  const { sightings, report } = cleanSightings([
    raw("1", "2025-03-03", "London"),
    raw("2", "2025-03-20", "London", "Ixodes hexagonus"),
    raw("3", "2025-05-02", "Leeds"),
    raw("4", "2025-05-30", "York"),
    raw("5", "2024-07-15", "Glasgow"),
  ], NOW);
  await replaceSourceSightings(db, sightings, report, NOW.toISOString());
  return db;
}

const page = { limit: 50, offset: 0, sort: "newest" as const };

describe("search", () => {
  it("filters by date range, newest first", async () => {
    const db = await seeded();
    const r = await searchSightings(db, { from: "2025-03-01", to: "2025-04-30" }, page);
    expect(r.total).toBe(2);
    expect(r.items.map((s) => s.id)).toEqual(["2", "1"]);
  });

  it("filters by city, region and species", async () => {
    const db = await seeded();
    expect((await searchSightings(db, { city: "London" }, page)).total).toBe(2);
    expect((await searchSightings(db, { region: "Yorkshire and the Humber" }, page)).total).toBe(2);
    expect((await searchSightings(db, { species: ["Hedgehog tick"] }, page)).items[0].id).toBe("2");
  });

  it("finds sightings within a radius", async () => {
    const db = await seeded();
    // Leeds to York is about 35 km
    const near = await searchSightings(db, { near: { lat: 53.8008, lng: -1.5491, radiusKm: 40 } }, page);
    expect(near.items.map((s) => s.city).sort()).toEqual(["Leeds", "York"]);
    const tight = await searchSightings(db, { near: { lat: 53.8008, lng: -1.5491, radiusKm: 10 } }, page);
    expect(tight.items.map((s) => s.city)).toEqual(["Leeds"]);
  });

  it("pages through results", async () => {
    const db = await seeded();
    const r = await searchSightings(db, {}, { limit: 2, offset: 2, sort: "oldest" });
    expect(r.total).toBe(5);
    expect(r.items.map((s) => s.id)).toEqual(["2", "3"]);
  });
});

describe("aggregates", () => {
  it("counts per city with coordinates and species mix", async () => {
    const db = await seeded();
    const london = (await cityStats(db, {})).find((c) => c.city === "London")!;
    expect(london).toMatchObject({ count: 2, latest: "2025-03-20", region: "London" });
    expect(london.species).toEqual(expect.arrayContaining([{ species: "Sheep tick", count: 1 }, { species: "Hedgehog tick", count: 1 }]));
  });

  it("counts per region", async () => {
    const db = await seeded();
    expect(await regionStats(db, {})).toEqual(expect.arrayContaining([
      { region: "Yorkshire and the Humber", count: 2, cities: 2 },
      { region: "Scotland", count: 1, cities: 1 },
    ]));
  });

  it("groups monthly trends and fills empty months with zero", async () => {
    const db = await seeded();
    const points = await trend(db, { from: "2025-01-01" }, "month");
    expect(points).toEqual([
      { period: "2025-03", count: 2 },
      { period: "2025-04", count: 0 },
      { period: "2025-05", count: 2 },
    ]);
  });

  it("groups weekly trends by the Monday each week starts", async () => {
    const db = await seeded();
    // 2025-03-03 is a Monday; 2025-03-20 is the Thursday of the week starting 17 March
    const points = await trend(db, { city: "London" }, "week");
    expect(points[0]).toEqual({ period: "2025-03-03", count: 1 });
    expect(points.at(-1)).toEqual({ period: "2025-03-17", count: 1 });
    expect(points).toHaveLength(3);
  });

  it("gives all twelve months for the seasonal chart", async () => {
    const db = await seeded();
    const months = await seasonal(db, { city: "London" }, 2025);
    expect(months).toHaveLength(12);
    expect(months[2]).toEqual({ month: 3, count: 2 });
    expect(months[4]).toEqual({ month: 5, count: 0 });
  });

  it("fills gaps across a year boundary", () => {
    expect(fillGaps([{ period: "2024-11", count: 1 }, { period: "2025-02", count: 3 }], "month").map((p) => p.period))
      .toEqual(["2024-11", "2024-12", "2025-01", "2025-02"]);
  });
});

describe("sync storage", () => {
  it("replaces source data but keeps user reports", async () => {
    const db = await seeded();
    const user: Sighting = {
      id: "user-1", source: "user", observedAt: "2026-10-01T09:00", date: "2026-10-01", hasTime: true,
      city: "Leeds", region: "Yorkshire and the Humber", lat: 53.8, lng: -1.55, species: "Sheep tick",
      latinName: "Ixodes ricinus", notes: "On my dog", imageKey: null, createdAt: NOW.toISOString(),
    };
    await insertSighting(db, user);

    const next = cleanSightings([raw("9", "2026-06-01", "Bristol")], NOW);
    await replaceSourceSightings(db, next.sightings, next.report, NOW.toISOString());

    const all = await searchSightings(db, {}, page);
    expect(all.items.map((s) => s.id).sort()).toEqual(["9", "user-1"]);
    expect((await overview(db)).userReports).toBe(1);
    expect((await getSyncState(db)).report?.kept).toBe(1);
  });

  it("writes in chunks small enough for D1's parameter limit", async () => {
    const db = memoryDb();
    const rows = Array.from({ length: 50 }, (_, i) => raw(String(i), `2025-06-${String((i % 28) + 1).padStart(2, "0")}`, "Leeds"));
    const { sightings, report } = cleanSightings(rows.map((r, i) => ({ ...r, date: `2025-06-01T${String(i % 24).padStart(2, "0")}:${String(i).padStart(2, "0")}:00` })), NOW);
    await replaceSourceSightings(db, sightings, report, NOW.toISOString());
    expect((await overview(db)).total).toBe(50);
  });
});

describe("yearly trends", () => {
  it("groups by year and fills empty years", async () => {
    const db = await seeded();
    expect(await trend(db, {}, "year")).toEqual([
      { period: "2024", count: 1 },
      { period: "2025", count: 4 },
    ]);
    expect(fillGaps([{ period: "2019", count: 2 }, { period: "2022", count: 1 }], "year").map((p) => p.period))
      .toEqual(["2019", "2020", "2021", "2022"]);
  });
});
