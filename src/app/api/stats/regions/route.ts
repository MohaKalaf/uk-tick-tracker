import { regionStats } from "@/lib/db/queries";
import { parseFilters } from "@/lib/params";
import { freshnessHeaders, readyContext } from "@/lib/server/context";
import { handle } from "@/lib/server/http";

export const GET = handle(async (request) => {
  const filters = parseFilters(new URL(request.url).searchParams);
  const { db, freshness } = await readyContext();
  return Response.json(await regionStats(db, filters), { headers: freshnessHeaders(freshness) });
});
