export const numberFormat = new Intl.NumberFormat("en-GB");

const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthFormat = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const shortMonth = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

export const formatDay = (iso: string) => dayFormat.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
export const formatMonth = (period: string) => monthFormat.format(new Date(`${period}-01T00:00:00Z`));
export const monthName = (month: number) => shortMonth.format(new Date(Date.UTC(2000, month - 1, 1)));

export function plural(n: number, one: string, many = `${one}s`) {
  return `${numberFormat.format(n)} ${n === 1 ? one : many}`;
}
