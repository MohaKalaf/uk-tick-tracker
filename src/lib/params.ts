import { z } from "zod";
import type { Filters, Interval, Sort } from "@/lib/db/queries";
import { REGIONS, findPlace } from "@/lib/geo/places";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s),
    "Not a real date");

// Optional query values arrive as "" from HTML forms; treat that as absent
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

const filterSchema = z
  .object({
    from: optional(isoDate),
    to: optional(isoDate),
    city: optional(z.string().max(80)),
    region: optional(z.enum(REGIONS)),
    species: z.array(z.string().max(80)).max(20).default([]),
    source: optional(z.enum(["elanco", "user"])),
    near: optional(z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, "Use lat,lng")),
    radiusKm: optional(z.coerce.number().min(1).max(500)),
  })
  .refine((f) => !(f.from && f.to) || f.from <= f.to, { message: "from must be on or before to", path: ["from"] })
  .refine((f) => !f.radiusKm || f.near, { message: "radiusKm needs near", path: ["radiusKm"] });

// species may be repeated (?species=a&species=b) or comma-free single values
function raw(params: URLSearchParams) {
  const obj: Record<string, unknown> = Object.fromEntries(params);
  obj.species = params.getAll("species").filter(Boolean);
  return obj;
}

export function parseFilters(params: URLSearchParams): Filters {
  const f = filterSchema.parse(raw(params));
  let city: string | undefined;
  if (f.city) {
    const place = findPlace(f.city);
    if (!place) throw new z.ZodError([{ code: "custom", path: ["city"], message: `Unknown city "${f.city}"`, input: f.city }]);
    city = place.name;
  }
  let near: Filters["near"];
  if (f.near) {
    const [lat, lng] = f.near.split(",").map(Number);
    near = { lat, lng, radiusKm: f.radiusKm ?? 25 };
  }
  return { from: f.from, to: f.to, city, region: f.region, species: f.species, source: f.source, near };
}

const pageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});

export function parsePage(params: URLSearchParams): { limit: number; offset: number; sort: Sort } {
  return pageSchema.parse({
    limit: params.get("limit") ?? undefined,
    offset: params.get("offset") ?? undefined,
    sort: params.get("sort") ?? undefined,
  });
}

export function parseInterval(params: URLSearchParams): Interval {
  return z.enum(["week", "month", "year"]).default("month").parse(params.get("interval") ?? undefined);
}

export function parseYear(params: URLSearchParams): number {
  return z.coerce.number().int().min(1900).max(2100).parse(params.get("year") ?? undefined);
}

// The reverse: Filters -> query string, for the frontend and for share links
export function filtersToParams(f: Partial<Filters>): URLSearchParams {
  const p = new URLSearchParams();
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.city) p.set("city", f.city);
  if (f.region) p.set("region", f.region);
  if (f.source) p.set("source", f.source);
  for (const s of f.species ?? []) p.append("species", s);
  if (f.near) {
    p.set("near", `${f.near.lat},${f.near.lng}`);
    p.set("radiusKm", String(f.near.radiusKm));
  }
  return p;
}
