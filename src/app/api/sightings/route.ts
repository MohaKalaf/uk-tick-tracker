import { insertSighting, searchSightings } from "@/lib/db/queries";
import { findPlace } from "@/lib/geo/places";
import { parseFilters, parsePage } from "@/lib/params";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, reportSchema, reportWarnings, sniffImage } from "@/lib/report";
import { freshnessHeaders, readyContext, serverContext } from "@/lib/server/context";
import { HttpError, fromZod, handle } from "@/lib/server/http";
import type { Sighting } from "@/lib/sightings";
import { SPECIES } from "@/lib/source/species";

// GET /api/sightings?from&to&city&region&species&source&near=lat,lng&radiusKm&limit&offset&sort
export const GET = handle(async (request) => {
  const params = new URL(request.url).searchParams;
  const filters = parseFilters(params);
  const page = parsePage(params);
  const { db, freshness } = await readyContext();
  const result = await searchSightings(db, filters, page);
  return Response.json({ ...result, limit: page.limit, offset: page.offset }, { headers: freshnessHeaders(freshness) });
});

const REPORTS_PER_HOUR = 10;

async function checkRateLimit(uploads: KVNamespace, ip: string) {
  const key = `rate:${ip}:${new Date().toISOString().slice(0, 13)}`;
  const used = Number((await uploads.get(key)) ?? 0);
  if (used >= REPORTS_PER_HOUR) {
    throw new HttpError(429, "too_many_reports", "You've sent a lot of reports this hour. Please try again later.");
  }
  // KV is eventually consistent, so this is a soft limit, which is fine for spam control
  await uploads.put(key, String(used + 1), { expirationTtl: 3600 });
}

// POST /api/sightings (multipart/form-data): a new user report, optionally with a photo
export const POST = handle(async (request) => {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("multipart/form-data") && !type.includes("application/x-www-form-urlencoded")) {
    throw new HttpError(415, "unsupported_media_type", "Send the report as form data.");
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new HttpError(400, "invalid_request", "Could not read the form data.");
  }

  const fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = reportSchema.safeParse(fields);
  if (!parsed.success) throw fromZod(parsed.error, "invalid_report");
  const report = parsed.data;

  const image = form.get("image");
  let imageBytes: Uint8Array | null = null;
  let imageType: string | null = null;
  if (image instanceof File && image.size > 0) {
    if (image.size > MAX_IMAGE_BYTES) {
      throw new HttpError(413, "image_too_large", "The photo is too large. Please use one under 2 MB.");
    }
    imageBytes = new Uint8Array(await image.arrayBuffer());
    imageType = sniffImage(imageBytes);
    if (!imageType || !(IMAGE_TYPES as readonly string[]).includes(imageType)) {
      throw new HttpError(400, "invalid_image", "The photo must be a JPEG, PNG or WebP image.");
    }
  }

  const ctx = await serverContext();
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  await checkRateLimit(ctx.uploads, ip);

  const id = `user-${crypto.randomUUID()}`;
  let imageKey: string | null = null;
  if (imageBytes && imageType) {
    imageKey = `img:${id}`;
    await ctx.uploads.put(imageKey, imageBytes, { metadata: { contentType: imageType } });
  }

  const place = findPlace(report.city)!;
  const species = SPECIES.find((s) => s.name === report.species);
  const sighting: Sighting = {
    id,
    source: "user",
    observedAt: `${report.date}T${report.time ?? "00:00"}`,
    date: report.date,
    hasTime: report.time !== undefined,
    city: place.name,
    region: place.region,
    // Exact point if the reporter gave one, otherwise the city centre
    lat: report.lat ?? place.lat,
    lng: report.lng ?? place.lng,
    species: report.species,
    latinName: species?.latinName ?? null,
    notes: report.notes ?? null,
    imageKey,
    createdAt: new Date().toISOString(),
  };
  await insertSighting(ctx.db, sighting);

  return Response.json({ sighting, warnings: reportWarnings(report) }, {
    status: 201,
    headers: { Location: `/api/sightings/${encodeURIComponent(id)}` },
  });
});
