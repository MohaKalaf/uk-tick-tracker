import { numberFormat } from "@/lib/format";

export interface Bar {
  label: string; // shown under the axis (when there's room) and in the table
  value: number;
  title?: string; // longer label for hover and screen readers
}

interface Props {
  bars: Bar[];
  caption: string; // what the chart shows, for screen readers
  height?: number;
  // Show every nth axis label; long series get crowded otherwise
  labelEvery?: number;
  colour?: string;
}

// Plain HTML columns rather than a chart library: server-rendered, themeable, and the
// numbers are in a real table for screen readers.
export function BarChart({
  bars,
  caption,
  height = 140,
  labelEvery = 1,
  colour = "var(--fern)",
}: Props) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  // Long series (six years of months) must still fit a 320px phone
  const gap = bars.length > 40 ? "gap-px" : "gap-[2px]";
  if (bars.length === 0)
    return (
      <p className="text-sm text-muted">No sightings match these filters.</p>
    );

  return (
    <figure>
      <div aria-hidden="true">
        <div
          className="flex items-end gap-[2px] border-b border-rule"
          style={{ height }}
        >
          {bars.map((b, i) => (
            <div
              key={i}
              title={`${b.title ?? b.label}: ${numberFormat.format(b.value)}`}
              className="min-w-0 flex-1 rounded-t-[2px]"
              style={{
                height: `${(b.value / max) * 100}%`,
                background: colour,
                minHeight: b.value > 0 ? 2 : 0,
              }}
            />
          ))}
        </div>
        <div className={`mt-1 flex ${gap} overflow-hidden text-[11px] text-muted`}>
          {bars.map((b, i) => (
            <span
              key={i}
              className="min-w-0 flex-1 overflow-visible whitespace-nowrap"
            >
              {i % labelEvery === 0 ? b.label : ""}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
      {/* Tables ignore sr-only's 1px size, so the wrapper does the hiding */}
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">Sightings</th>
            </tr>
          </thead>
          <tbody>
            {bars.map((b, i) => (
              <tr key={i}>
                <th scope="row">{b.title ?? b.label}</th>
                <td>{b.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
