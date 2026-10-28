import { getSyncState } from "@/lib/db/queries";
import { serverContext } from "@/lib/server/context";
import { HttpError, handle } from "@/lib/server/http";
import { syncNow } from "@/lib/sync";

// POST /api/sync forces a refresh from the source API. Needs the SYNC_TOKEN secret
// in production; open in local development.
export const POST = handle(async (request) => {
  const ctx = await serverContext();
  const auth = request.headers.get("authorization");
  const allowed = ctx.syncToken ? auth === `Bearer ${ctx.syncToken}` : process.env.NODE_ENV === "development";
  if (!allowed) throw new HttpError(401, "unauthorised", "A valid sync token is required.");

  await syncNow(ctx.db, { sourceUrl: ctx.sourceUrl });
  return Response.json(await getSyncState(ctx.db));
});
