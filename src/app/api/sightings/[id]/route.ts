import { getSighting } from "@/lib/db/queries";
import { freshnessHeaders, readyContext } from "@/lib/server/context";
import { HttpError, handle } from "@/lib/server/http";

export const GET = handle(async (_request, ctx: RouteContext<"/api/sightings/[id]">) => {
  const { id } = await ctx.params;
  const { db, freshness } = await readyContext();
  const sighting = await getSighting(db, id);
  if (!sighting) throw new HttpError(404, "not_found", "No sighting with that id.");
  return Response.json(sighting, { headers: freshnessHeaders(freshness) });
});
