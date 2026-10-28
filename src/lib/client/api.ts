"use client";

import { useEffect, useState } from "react";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: { field: string; message: string }[],
  ) {
    super(message);
  }
}

export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError(0, "offline", "Couldn't reach the server. Check your connection and try again.");
  }
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; details?: { field: string; message: string }[] } } | null;
  if (!res.ok) {
    const e = body?.error;
    throw new ApiError(res.status, e?.code ?? "error", e?.message ?? `Request failed (${res.status})`, e?.details);
  }
  return body as T;
}

interface Loaded<T> {
  url: string;
  data?: T;
  error?: ApiError;
}

// Fetches when the URL changes and keeps showing the previous data while the next loads.
// `null` means "nothing to fetch".
export function useApi<T>(url: string | null) {
  const [state, setState] = useState<Loaded<T> | null>(null);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    apiJson<T>(url, { signal: controller.signal })
      .then((data) => setState({ url, data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((prev) => ({ url, data: prev?.data, error: error instanceof ApiError ? error : new ApiError(0, "error", String(error)) }));
      });
    return () => controller.abort();
  }, [url]);

  return {
    data: state?.data,
    error: state?.url === url ? state.error : undefined,
    loading: url !== null && state?.url !== url,
  };
}
