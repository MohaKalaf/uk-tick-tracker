import { getSighting } from "@/lib/db/queries";
import { serverContext } from "@/lib/server/context";
import { HttpError, handle } from "@/lib/server/http";

export const GET = handle(async (_request, ctx: RouteContext<"/api/sightings/[id]/image">) => {
  const { id } = await ctx.params;
  const { db, uploads } = await serverContext();
  const sighting = await getSighting(db, id);
  if (!sighting?.imageKey) throw new HttpError(404, "not_found", "This sighting has no photo.");

  const { value, metadata } = await uploads.getWithMetadata<{ contentType: string }>(sighting.imageKey, "arrayBuffer");
  if (!value) throw new HttpError(404, "not_found", "This sighting has no photo.");
  return new Response(value, {
    headers: {
      "Content-Type": metadata?.contentType ?? "application/octet-stream",
      // Photos never change once uploaded
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
