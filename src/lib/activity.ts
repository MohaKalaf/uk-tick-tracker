// How recent a city's latest sighting is, compared with the newest data rather than today:
// Elanco's data ends in December 2024, and against today every city would look the same.
// Drives marker colour and the badge in the panel.
export type Activity = "recent" | "year" | "older";

export const ACTIVITY: Record<Activity, { label: string; color: string; description: string }> = {
  recent: { label: "Active", color: "var(--mark-recent)", description: "within 30 days" },
  year: { label: "Recent", color: "var(--mark-year)", description: "within a year" },
  older: { label: "Quiet", color: "var(--mark-quiet)", description: "over a year before" },
};

export function activityOf(latest: string, reference: string | null): Activity {
  const ref = reference ? Date.parse(`${reference}T00:00:00Z`) : Date.now();
  const days = (ref - Date.parse(`${latest}T00:00:00Z`)) / 86_400_000;
  if (days <= 30) return "recent";
  if (days <= 365) return "year";
  return "older";
}
