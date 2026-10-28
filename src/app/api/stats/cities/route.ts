import { cityStats } from "@/lib/db/queries";
import { parseFilters } from "@/lib/params";
import { freshnessHeaders, readyContext } from "@/lib/server/context";
import { handle } from "@/lib/server/http";

// Sightings per city with coordinates and species mix: one map marker each
export const GET = handle(async (request) => {
  const filters = parseFilters(new URL(request.url).searchParams);
  const { db, freshness } = await readyContext();
  return Response.json(await cityStats(db, filters), { headers: freshnessHeaders(freshness) });
});
