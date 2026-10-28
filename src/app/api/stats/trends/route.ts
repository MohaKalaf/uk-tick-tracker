import { trend } from "@/lib/db/queries";
import { parseFilters, parseInterval } from "@/lib/params";
import { freshnessHeaders, readyContext } from "@/lib/server/context";
import { handle } from "@/lib/server/http";

// GET /api/stats/trends?interval=week|month|year plus any search filters
export const GET = handle(async (request) => {
  const params = new URL(request.url).searchParams;
  const filters = parseFilters(params);
  const interval = parseInterval(params);
  const { db, freshness } = await readyContext();
  return Response.json({ interval, points: await trend(db, filters, interval) }, { headers: freshnessHeaders(freshness) });
});
