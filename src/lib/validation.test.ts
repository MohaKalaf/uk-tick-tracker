import { describe, expect, it } from "vitest";
import { findPlace, inUk } from "@/lib/geo/places";
import { filtersToParams, parseFilters, parsePage } from "@/lib/params";
import { reportSchema, reportWarnings, sniffImage } from "@/lib/report";

const params = (q: string) => new URLSearchParams(q);

describe("places", () => {
  it("matches aliases and small typos but not ambiguous ones", () => {
    expect(findPlace("Brighton & Hove")?.name).toBe("Brighton");
    expect(findPlace("Edinbrugh")?.name).toBe("Edinburgh");
    expect(findPlace("Ely")?.name).toBe("Ely");
    expect(findPlace("Elx")).toBeUndefined();
  });

  it("knows roughly where the UK is", () => {
    expect(inUk(51.5, -0.12)).toBe(true);
    expect(inUk(48.85, 2.35)).toBe(false); // Paris
  });
});

describe("parseFilters", () => {
  it("parses a full query and normalises the city", () => {
    expect(parseFilters(params("from=2025-01-01&to=2025-12-31&city=leeds&species=Sheep%20tick&species=Hedgehog%20tick"))).toEqual({
      from: "2025-01-01", to: "2025-12-31", city: "Leeds", region: undefined,
      species: ["Sheep tick", "Hedgehog tick"], source: undefined, near: undefined,
    });
  });

  it("treats empty values as not set", () => {
    expect(parseFilters(params("from=&city=&region="))).toMatchObject({ from: undefined, city: undefined, region: undefined });
  });

  it("rejects bad input with a clear reason", () => {
    expect(() => parseFilters(params("from=2025-02-30"))).toThrow(/Not a real date/);
    expect(() => parseFilters(params("from=2025-06-01&to=2025-01-01"))).toThrow(/on or before/);
    expect(() => parseFilters(params("city=Atlantis"))).toThrow(/Unknown city/);
    expect(() => parseFilters(params("region=Mars"))).toThrow();
  });

  it("round-trips through the query string", () => {
    const f = parseFilters(params("from=2025-01-01&city=York&near=53.9,-1.08&radiusKm=30"));
    expect(parseFilters(filtersToParams(f))).toEqual(f);
  });

  it("caps page size", () => {
    expect(parsePage(params(""))).toEqual({ limit: 100, offset: 0, sort: "newest" });
    expect(() => parsePage(params("limit=10000"))).toThrow();
  });
});

describe("report validation", () => {
  const good = { date: "2026-06-01", city: "Leeds", species: "Sheep tick", website: "" };

  it("accepts a minimal report", () => {
    expect(reportSchema.safeParse(good).success).toBe(true);
  });

  it("explains each problem", () => {
    const r = reportSchema.safeParse({ date: "2999-01-01", city: "Atlantis", species: "Dragon", time: "25:00", website: "spam" });
    expect(r.success).toBe(false);
    const fields = r.error!.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["date", "city", "species", "time", "website"]));
  });

  it("needs both coordinates, inside the UK", () => {
    expect(reportSchema.safeParse({ ...good, lat: "53.8" }).success).toBe(false);
    expect(reportSchema.safeParse({ ...good, lat: "48.85", lng: "2.35" }).success).toBe(false);
    expect(reportSchema.safeParse({ ...good, lat: "53.8", lng: "-1.55" }).success).toBe(true);
  });

  it("warns, without blocking, about unlikely details", () => {
    const now = new Date("2026-10-27");
    expect(reportWarnings({ date: "2026-01-10" }, now).map((w) => w.message).join(" ")).toMatch(/winter/);
    expect(reportWarnings({ date: "2024-06-01" }, now).map((w) => w.message).join(" ")).toMatch(/over a year/);
    expect(reportWarnings({ city: "Leeds", lat: 51.5, lng: -0.12 }, now)[0].message).toMatch(/km from Leeds/);
    expect(reportWarnings({ date: "2026-06-01", city: "Leeds" }, now)).toEqual([]);
  });

  it("identifies images by their bytes", () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe("image/png");
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});

describe("activity", () => {
  it("measures recency against the newest data, not today", async () => {
    const { activityOf } = await import("@/lib/activity");
    expect(activityOf("2024-12-20", "2024-12-30")).toBe("recent");
    expect(activityOf("2024-06-01", "2024-12-30")).toBe("year");
    expect(activityOf("2023-06-01", "2024-12-30")).toBe("older");
  });
});
