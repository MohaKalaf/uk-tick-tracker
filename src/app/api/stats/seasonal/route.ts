import { seasonal } from "@/lib/db/queries";
import { parseFilters, parseYear } from "@/lib/params";
import { freshnessHeaders, readyContext } from "@/lib/server/context";
import { handle } from "@/lib/server/http";

// GET /api/stats/seasonal?year=2024&city=Leeds: sightings per month of one year
export const GET = handle(async (request) => {
  const params = new URL(request.url).searchParams;
  const year = parseYear(params);
  const filters = parseFilters(params);
  const { db, freshness } = await readyContext();
  return Response.json({ year, city: filters.city ?? null, months: await seasonal(db, filters, year) },
    { headers: freshnessHeaders(freshness) });
});
