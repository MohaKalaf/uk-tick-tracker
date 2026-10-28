import { z } from "zod";
import { distanceKm, findPlace, inUk } from "@/lib/geo/places";
import { SPECIES, UNKNOWN_SPECIES } from "@/lib/source/species";

export const MAX_NOTES = 500;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // after the browser has resized it
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const SPECIES_CHOICES = [...SPECIES.map((s) => s.name), UNKNOWN_SPECIES];

const today = () => new Date().toISOString().slice(0, 10);

const coord = z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().optional());

// Shared by the form (instant feedback) and the API (the real check)
export const reportSchema = z
  .object({
    date: z
      .string({ error: "Enter the date you saw the tick." })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date you saw the tick.")
      .refine((d) => !Number.isNaN(Date.parse(d)), "That date does not exist.")
      .refine((d) => d <= today(), "The date can't be in the future.")
      .refine((d) => d >= "2000-01-01", "Please report sightings from 2000 onwards."),
    time: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time, like 14:30.").optional(),
    ),
    city: z
      .string({ error: "Choose the nearest city." })
      .min(1, "Choose the nearest city.")
      .refine((c) => !!findPlace(c), "Choose a city from the list."),
    lat: coord,
    lng: coord,
    species: z.enum(SPECIES_CHOICES as [string, ...string[]], { error: "Choose a species, or \"Unknown species\" if you're not sure." }),
    notes: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() || undefined : v),
      z.string().max(MAX_NOTES, `Keep notes under ${MAX_NOTES} characters.`).optional(),
    ),
    // Hidden from people; bots tend to fill every field
    website: z.preprocess((v) => v ?? "", z.literal("", { error: "Spam check failed." })),
  })
  .superRefine((r, ctx) => {
    const hasLat = r.lat !== undefined;
    if (hasLat !== (r.lng !== undefined)) {
      ctx.addIssue({ code: "custom", path: ["lat"], message: "Both latitude and longitude are needed." });
    } else if (hasLat && !inUk(r.lat!, r.lng!)) {
      ctx.addIssue({ code: "custom", path: ["lat"], message: "That point is outside the UK." });
    }
  });

export type ReportInput = z.infer<typeof reportSchema>;

export interface Warning {
  field: string;
  message: string;
}

// Plausible but worth a second look. They never block a report.
export function reportWarnings(r: Partial<ReportInput>, now = new Date()): Warning[] {
  const out: Warning[] = [];
  if (r.date) {
    const days = (now.getTime() - Date.parse(r.date)) / 86_400_000;
    if (days > 365) out.push({ field: "date", message: "This was over a year ago. Older sightings are still useful, but check the date." });
    const month = Number(r.date.slice(5, 7));
    if (month === 12 || month <= 2) out.push({ field: "date", message: "Ticks are rarely active in winter. Please double-check the date." });
  }
  if (r.city && r.lat !== undefined && r.lng !== undefined) {
    const place = findPlace(r.city);
    if (place) {
      const km = distanceKm(place.lat, place.lng, r.lat, r.lng);
      if (km > 50) out.push({ field: "city", message: `Your map point is ${Math.round(km)} km from ${place.name}. Is that the nearest city?` });
    }
  }
  return out;
}

// Check the file's first bytes, not just its claimed type
export function sniffImage(bytes: Uint8Array): (typeof IMAGE_TYPES)[number] | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}
