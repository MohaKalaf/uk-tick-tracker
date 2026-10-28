import { countSightings, getSyncState } from "@/lib/db/queries";
import { serverContext } from "@/lib/server/context";
import { handle } from "@/lib/server/http";

// Never calls the source API, so it stays cheap and answers during a source outage
export const GET = handle(async () => {
  const { db } = await serverContext();
  const [sightings, sync] = await Promise.all([countSightings(db), getSyncState(db)]);
  return Response.json(
    { status: sightings > 0 ? "ok" : "empty", sightings, lastSyncAt: sync.lastSuccessAt, lastError: sync.lastError },
    { headers: { "Cache-Control": "no-store" } },
  );
});
