import { findPlace } from "@/lib/geo/places";
import type { Sighting } from "@/lib/sightings";
import { parseSourceDate, todayIso } from "./dates";
import { UNKNOWN_SPECIES, findSpecies } from "./species";

// What cleaning did, so the app can show its working (and so a bad feed is noticed)
export interface QualityReport {
  received: number;
  kept: number;
  dropped: {
    notAnObject: number;
    missingLocation: number;
    unknownLocation: number;
    missingDate: number;
    invalidDate: number;
    futureDate: number;
    duplicateId: number;
    duplicateContent: number;
  };
  fixed: {
    locationSpelling: number;
    speciesFromLatin: number;
    latinCorrected: number;
    unknownSpecies: number;
    generatedId: number;
  };
  // A few raw values per problem, for the Data page
  examples: Record<string, string[]>;
}

export interface CleanResult {
  sightings: Sighting[];
  report: QualityReport;
}

const text = (v: unknown): string | null => {
  if (typeof v === "number") return String(v);
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t === "" ? null : t;
};

// Stable id for rows that arrive without one, so re-syncing doesn't create copies
function contentId(parts: string[]): string {
  let h = 2166136261;
  for (const ch of parts.join("|")) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return `gen-${h.toString(36)}`;
}

export function cleanSightings(raw: unknown[], now = new Date()): CleanResult {
  const report: QualityReport = {
    received: raw.length,
    kept: 0,
    dropped: { notAnObject: 0, missingLocation: 0, unknownLocation: 0, missingDate: 0, invalidDate: 0, futureDate: 0, duplicateId: 0, duplicateContent: 0 },
    fixed: { locationSpelling: 0, speciesFromLatin: 0, latinCorrected: 0, unknownSpecies: 0, generatedId: 0 },
    examples: {},
  };
  const example = (issue: string, value: unknown) => {
    const list = (report.examples[issue] ??= []);
    const shown = typeof value === "string" ? value : JSON.stringify(value);
    if (list.length < 5 && !list.includes(shown)) list.push(shown);
  };

  // A day of slack for clock and timezone differences
  const latestAllowed = todayIso(new Date(now.getTime() + 86_400_000));
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  const sightings: Sighting[] = [];

  for (const row of raw) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      report.dropped.notAnObject++;
      example("notAnObject", row);
      continue;
    }
    const r = row as Record<string, unknown>;

    const location = text(r.location);
    if (!location) {
      report.dropped.missingLocation++;
      example("missingLocation", r);
      continue;
    }
    const place = findPlace(location);
    if (!place) {
      report.dropped.unknownLocation++;
      example("unknownLocation", location);
      continue;
    }
    if (place.name !== location) {
      report.fixed.locationSpelling++;
      example("locationSpelling", `${location} → ${place.name}`);
    }

    const rawDate = text(r.date);
    if (!rawDate) {
      report.dropped.missingDate++;
      example("missingDate", r);
      continue;
    }
    const parsed = parseSourceDate(rawDate);
    if (!parsed) {
      report.dropped.invalidDate++;
      example("invalidDate", rawDate);
      continue;
    }
    if (parsed.date > latestAllowed) {
      report.dropped.futureDate++;
      example("futureDate", rawDate);
      continue;
    }

    const rawName = text(r.species);
    const rawLatin = text(r.latinName);
    const species = findSpecies(rawName, rawLatin);
    if (!species) {
      report.fixed.unknownSpecies++;
      example("unknownSpecies", `${rawName ?? "(none)"} / ${rawLatin ?? "(none)"}`);
    } else if (rawName !== species.name) {
      report.fixed.speciesFromLatin++;
      example("speciesFromLatin", `${rawName ?? "(none)"} → ${species.name}`);
    } else if (rawLatin !== species.latinName) {
      // Common name recognised but paired with a wrong or missing Latin name
      report.fixed.latinCorrected++;
      example("latinCorrected", `${rawLatin ?? "(none)"} → ${species.latinName}`);
    }
    const speciesName = species?.name ?? UNKNOWN_SPECIES;

    // Same time, place and species under two ids is one sighting reported twice
    const contentKey = `${parsed.observedAt}|${place.name}|${speciesName}`;
    let id = text(r.id);
    if (!id) {
      id = contentId([contentKey]);
      report.fixed.generatedId++;
    }
    if (seenIds.has(id)) {
      report.dropped.duplicateId++;
      example("duplicateId", id);
      continue;
    }
    if (seenContent.has(contentKey)) {
      report.dropped.duplicateContent++;
      example("duplicateContent", contentKey);
      continue;
    }
    seenIds.add(id);
    seenContent.add(contentKey);

    sightings.push({
      id,
      source: "elanco",
      observedAt: parsed.observedAt,
      date: parsed.date,
      hasTime: parsed.hasTime,
      city: place.name,
      region: place.region,
      lat: place.lat,
      lng: place.lng,
      species: speciesName,
      latinName: species?.latinName ?? rawLatin,
      notes: null,
      imageKey: null,
      createdAt: null,
    });
  }

  report.kept = sightings.length;
  return { sightings, report };
}
