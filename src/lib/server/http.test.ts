import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { SourceError } from "@/lib/source/client";
import { HttpError, handle } from "./http";

const call = (fn: () => Promise<Response>) => handle(fn)(new Request("http://test/"), {});

describe("handle", () => {
  it("passes successful responses through", async () => {
    const res = await call(async () => Response.json({ ok: true }));
    expect(res.status).toBe(200);
  });

  it("turns HttpError into the standard error shape", async () => {
    const res = await call(async () => {
      throw new HttpError(404, "not_found", "No sighting with that id.");
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "not_found", message: "No sighting with that id." } });
  });

  it("lists each invalid field for validation errors", async () => {
    const res = await call(async () => {
      z.object({ year: z.number() }).parse({ year: "soon" });
      return new Response();
    });
    const body = (await res.json()) as { error: { details: { field: string }[] } };
    expect(res.status).toBe(400);
    expect(body.error.details[0].field).toBe("year");
  });

  it("answers 503 with Retry-After when the source is down and nothing is stored", async () => {
    const res = await call(async () => {
      throw new SourceError("Source API rate limit reached", "rate_limited", 429);
    });
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBe("60");
  });

  it("hides unexpected errors behind a generic 500", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call(async () => {
      throw new Error("database password is hunter2");
    });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("hunter2");
    log.mockRestore();
  });
});
