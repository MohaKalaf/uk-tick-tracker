import { getSyncState, overview } from "@/lib/db/queries";
import { freshnessHeaders, readyContext } from "@/lib/server/context";
import { handle } from "@/lib/server/http";

// Everything the UI needs to build its filters, plus the last sync's quality report
export const GET = handle(async () => {
  const { db, freshness } = await readyContext();
  const [data, sync] = await Promise.all([overview(db), getSyncState(db)]);
  return Response.json({ ...data, sync: { ...sync, stale: freshness.stale } }, { headers: freshnessHeaders(freshness) });
});
