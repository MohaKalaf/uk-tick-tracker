import { describe, expect, it } from "vitest";
import { cleanSightings } from "./clean";
import { parseSourceDate } from "./dates";

const NOW = new Date("2026-10-27T12:00:00Z");

const row = (over: Record<string, unknown> = {}) => ({
  id: "a1",
  date: "2025-08-14T17:30:00",
  location: "London",
  species: "Southern rodent tick",
  latinName: "Ixodes acuminatus",
  ...over,
});

describe("parseSourceDate", () => {
  it("reads the API's own format", () => {
    expect(parseSourceDate("2025-08-14T17:30:00")).toEqual({ date: "2025-08-14", observedAt: "2025-08-14T17:30", hasTime: true });
  });

  it("accepts date-only and UK-style dates", () => {
    expect(parseSourceDate("2025-08-14")).toMatchObject({ date: "2025-08-14", hasTime: false });
    expect(parseSourceDate("14/08/2025 17:30")).toMatchObject({ observedAt: "2025-08-14T17:30" });
  });

  it("converts a zoned time to UTC", () => {
    expect(parseSourceDate("2025-08-14T17:30:00+01:00")?.observedAt).toBe("2025-08-14T16:30");
  });

  it("rejects impossible dates instead of rolling them over", () => {
    expect(parseSourceDate("2025-02-30T10:00:00")).toBeNull();
    expect(parseSourceDate("2025-13-01")).toBeNull();
    expect(parseSourceDate("yesterday")).toBeNull();
  });
});

describe("cleanSightings", () => {
  it("keeps a clean row and places it in its city and region", () => {
    const { sightings, report } = cleanSightings([row()], NOW);
    expect(report.kept).toBe(1);
    expect(sightings[0]).toMatchObject({ city: "London", region: "London", species: "Southern rodent tick", source: "elanco" });
    expect(sightings[0].lat).toBeCloseTo(51.5, 1);
  });

  it("fixes spelling, case and whitespace in city names", () => {
    const { sightings, report } = cleanSightings([
      row({ id: "1", location: "  manchester " }),
      row({ id: "2", location: "Manchster", date: "2025-08-15T10:00:00" }),
      row({ id: "3", location: "Kingston upon Hull" }),
    ], NOW);
    expect(sightings.map((s) => s.city)).toEqual(["Manchester", "Manchester", "Hull"]);
    expect(report.fixed.locationSpelling).toBe(3);
  });

  it("drops rows it cannot place or date, and counts why", () => {
    const { report } = cleanSightings([
      row({ id: "1", location: "" }),
      row({ id: "2", location: "Atlantis" }),
      row({ id: "3", date: null }),
      row({ id: "4", date: "2025-02-30" }),
      row({ id: "5", date: "2027-01-01T10:00:00" }),
      "not a row",
    ], NOW);
    expect(report.kept).toBe(0);
    expect(report.dropped).toMatchObject({
      missingLocation: 1, unknownLocation: 1, missingDate: 1, invalidDate: 1, futureDate: 1, notAnObject: 1,
    });
    expect(report.examples.unknownLocation).toEqual(["Atlantis"]);
  });

  it("drops repeated ids and the same sighting under a new id", () => {
    const { sightings, report } = cleanSightings([
      row({ id: "1" }),
      row({ id: "1", species: "Hedgehog tick", latinName: "Ixodes hexagonus" }),
      row({ id: "2" }),
      row({ id: "3", date: "2025-08-15T09:00:00" }),
    ], NOW);
    expect(sightings.map((s) => s.id)).toEqual(["1", "3"]);
    expect(report.dropped.duplicateId).toBe(1);
    expect(report.dropped.duplicateContent).toBe(1);
  });

  it("trusts the Latin name when the common name is missing or different", () => {
    const { sightings, report } = cleanSightings([
      row({ id: "1", species: null, latinName: "Ixodes ricinus" }),
      row({ id: "2", species: "Castor bean tick", latinName: "Ixodes ricinus", date: "2025-08-15T10:00:00" }),
    ], NOW);
    expect(sightings.map((s) => s.species)).toEqual(["Sheep tick", "Sheep tick"]);
    expect(report.fixed.speciesFromLatin).toBe(2);
  });

  it("keeps sightings of an unrecognised species, labelled as unknown", () => {
    const { sightings, report } = cleanSightings([row({ species: "Mystery tick", latinName: "Ixodes nonsense" })], NOW);
    expect(sightings[0].species).toBe("Unknown species");
    expect(sightings[0].latinName).toBe("Ixodes nonsense");
    expect(report.fixed.unknownSpecies).toBe(1);
  });

  it("gives an id to rows without one, the same on every sync", () => {
    const first = cleanSightings([row({ id: undefined })], NOW).sightings[0].id;
    const again = cleanSightings([row({ id: "" })], NOW).sightings[0].id;
    expect(first).toMatch(/^gen-/);
    expect(again).toBe(first);
  });

  // Pairs as they appear in Elanco's real data
  it("corrects a Latin name that doesn't match its species, and counts it", () => {
    const { sightings, report } = cleanSightings([
      row({ id: "1", species: "Passerine tick", latinName: "Dermacentor frontalis" }),
      row({ id: "2", species: "Marsh tick", latinName: "Ixodes apronophorus", date: "2025-08-15T10:00:00" }),
    ], NOW);
    expect(sightings.map((s) => [s.species, s.latinName])).toEqual([
      ["Passerine tick", "Ixodes frontalis"],
      ["Marsh tick", "Ixodes apronophorus"],
    ]);
    expect(report.fixed.latinCorrected).toBe(1);
    expect(report.examples.latinCorrected).toEqual(["Dermacentor frontalis → Ixodes frontalis"]);
  });

  it("keeps the source's own city names when they are already right", () => {
    const { sightings, report } = cleanSightings([row({ location: "Newcastle" })], NOW);
    expect(sightings[0].city).toBe("Newcastle");
    expect(report.fixed.locationSpelling).toBe(0);
  });
});
