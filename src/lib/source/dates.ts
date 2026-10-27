export interface ParsedDate {
  observedAt: string; // YYYY-MM-DDTHH:mm, UK wall-clock time
  date: string; // YYYY-MM-DD
  hasTime: boolean;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?(Z|[+-]\d{2}:?\d{2})?$/;
const UK = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::\d{2})?)?$/;

const pad = (n: number) => String(n).padStart(2, "0");

function build(y: number, m: number, d: number, hh: number | null, mm: number | null): ParsedDate | null {
  if (m < 1 || m > 12 || d < 1 || hh !== null && (hh > 23 || mm! > 59)) return null;
  // Date.UTC rolls 31 Feb into March, so check it round-trips
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  const date = `${y}-${pad(m)}-${pad(d)}`;
  const hasTime = hh !== null;
  return { date, observedAt: `${date}T${hasTime ? `${pad(hh)}:${pad(mm!)}` : "00:00"}`, hasTime };
}

// Source dates are wall-clock times without a zone ("2025-08-14T17:30:00").
// A trailing Z or offset is accepted, and converted to UTC.
export function parseSourceDate(raw: string): ParsedDate | null {
  const text = raw.trim();
  const iso = ISO.exec(text);
  if (iso) {
    const [, y, m, d, hh, mm, , zone] = iso;
    if (zone && hh !== undefined) {
      const instant = new Date(text.replace(" ", "T"));
      if (Number.isNaN(instant.getTime())) return null;
      return build(instant.getUTCFullYear(), instant.getUTCMonth() + 1, instant.getUTCDate(),
        instant.getUTCHours(), instant.getUTCMinutes());
    }
    return build(+y, +m, +d, hh === undefined ? null : +hh, mm === undefined ? null : +mm);
  }
  const uk = UK.exec(text);
  if (uk) {
    const [, d, m, y, hh, mm] = uk;
    return build(+y, +m, +d, hh === undefined ? null : +hh, mm === undefined ? null : +mm);
  }
  return null;
}

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
