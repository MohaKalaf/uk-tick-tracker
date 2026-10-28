import { z } from "zod";
import { SourceError } from "@/lib/source/client";

// Every error response has the same shape: { error: { code, message, details? } }
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function errorResponse(status: number, code: string, message: string, details?: unknown, headers?: HeadersInit) {
  return Response.json({ error: { code, message, ...(details === undefined ? {} : { details }) } }, { status, headers });
}

export function fromZod(error: z.ZodError, code = "invalid_request") {
  return new HttpError(400, code, "Some values are not valid.",
    error.issues.map((i) => ({ field: i.path.join(".") || "(request)", message: i.message })));
}

type Handler<C> = (request: Request, context: C) => Promise<Response>;

// Turns thrown errors into JSON responses, so no handler leaks a stack trace
export function handle<C>(fn: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (err) {
      if (err instanceof HttpError) return errorResponse(err.status, err.code, err.message, err.details);
      if (err instanceof z.ZodError) {
        const e = fromZod(err);
        return errorResponse(e.status, e.code, e.message, e.details);
      }
      if (err instanceof SourceError) {
        // Only reached when there is no stored data to fall back on
        return errorResponse(503, "source_unavailable",
          "Sighting data is temporarily unavailable. Please try again in a minute.", undefined, { "Retry-After": "60" });
      }
      console.error(err);
      return errorResponse(500, "internal_error", "Something went wrong on our side.");
    }
  };
}
