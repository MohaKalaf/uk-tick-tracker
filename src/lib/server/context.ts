import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type Db, d1 } from "@/lib/db/db";
import { ensureSchema } from "@/lib/db/schema";
import { DEFAULT_SOURCE_URL } from "@/lib/source/client";
import { type Freshness, ensureFresh } from "@/lib/sync";

export interface ServerContext {
  db: Db;
  uploads: KVNamespace;
  sourceUrl: string;
  syncToken: string | undefined;
}

export async function serverContext(): Promise<ServerContext> {
  const { env } = await getCloudflareContext({ async: true });
  const db = d1(env.DB);
  await ensureSchema(db);
  return {
    db,
    uploads: env.UPLOADS,
    sourceUrl: env.SOURCE_API_URL || DEFAULT_SOURCE_URL,
    syncToken: (env as { SYNC_TOKEN?: string }).SYNC_TOKEN,
  };
}

// For read endpoints: database ready and data no older than the sync window
export async function readyContext(): Promise<ServerContext & { freshness: Freshness }> {
  const ctx = await serverContext();
  const freshness = await ensureFresh(ctx.db, { sourceUrl: ctx.sourceUrl });
  return { ...ctx, freshness };
}

export function freshnessHeaders(f: Freshness): HeadersInit {
  return {
    "X-Data-Synced-At": f.lastSuccessAt ?? "never",
    ...(f.stale ? { "X-Data-Stale": "true" } : {}),
    // Short shared cache: new reports should show up within a minute
    "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
  };
}
