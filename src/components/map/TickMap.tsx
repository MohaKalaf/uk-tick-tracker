"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import { ACTIVITY, activityOf } from "@/lib/activity";
import type { CityStat } from "@/lib/db/queries";
import { formatDay, plural } from "@/lib/format";
import type { Sighting } from "@/lib/sightings";
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL } from "./tiles";

const UK_CENTRE: [number, number] = [54.4, -3.4];
const UK_LIMITS = L.latLngBounds([48.5, -12], [61.5, 4.5]);

// Report dots follow the page theme, including the in-page toggle
function subscribeTheme(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener("themechange", onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener("themechange", onChange);
  };
}
function isDark() {
  const set = document.documentElement.dataset.theme;
  return set ? set === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Square root so area, not width, follows the count; the base keeps small cities clickable
function size(count: number, max: number) {
  return Math.round(20 + 14 * Math.sqrt(count / Math.max(max, 1)));
}

function cityIcon(stat: CityStat, max: number, selected: boolean, reference: string | null) {
  const d = size(stat.count, max);
  const colour = ACTIVITY[activityOf(stat.latest, reference)].color;
  const ring = selected ? "box-shadow:0 0 0 3px var(--panel),0 0 0 6px var(--ink);" : "box-shadow:0 0 0 2px var(--panel);";
  return L.divIcon({
    className: "tick-marker",
    iconSize: [d, d],
    html: `<span style="display:flex;align-items:center;justify-content:center;width:${d}px;height:${d}px;border-radius:50%;background:${colour};color:#fff;font-weight:700;font-size:${d > 36 ? 13 : 11}px;${ring}">${stat.count}</span>`,
  });
}

// Zoom to where the sightings are, once, when they first load
function FitToData({ cities }: { cities: CityStat[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || cities.length < 2) return;
    fitted.current = true;
    map.fitBounds(L.latLngBounds(cities.map((c) => [c.lat, c.lng] as [number, number])), { padding: [40, 40], maxZoom: 8 });
  }, [map, cities]);
  return null;
}

function FlyTo({ target }: { target: CityStat | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (target && !map.getBounds().pad(-0.15).contains([target.lat, target.lng])) {
      map.panTo([target.lat, target.lng]);
    }
  }, [map, target]);
  return null;
}

interface Props {
  cities: CityStat[];
  reports: Sighting[];
  selected: string | null;
  referenceDate: string | null;
  onSelect: (city: string) => void;
}

export default function TickMap({ cities, reports, selected, referenceDate, onSelect }: Props) {
  const dark = useSyncExternalStore(subscribeTheme, isDark, () => false);
  const max = useMemo(() => Math.max(1, ...cities.map((c) => c.count)), [cities]);
  const selectedStat = cities.find((c) => c.city === selected);

  return (
    <MapContainer
      center={UK_CENTRE}
      zoom={6}
      minZoom={5}
      maxBounds={UK_LIMITS}
      className="h-full w-full"
      aria-label="Map of tick sightings by city"
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={TILE_MAX_ZOOM} />
      <FitToData cities={cities} />
      <FlyTo target={selectedStat} />

      {reports.map((r) => (
        <CircleMarker
          key={r.id}
          center={[r.lat, r.lng]}
          radius={6}
          // SVG attributes can't read CSS variables, so the theme colours are spelled out
          pathOptions={{ color: dark ? "#18211c" : "#fbfcf8", weight: 2, fillColor: dark ? "#7fc29b" : "#2e5e45", fillOpacity: 1 }}
          eventHandlers={{ click: () => onSelect(r.city) }}
        >
          <Tooltip>
            Public report: {r.species}, {formatDay(r.date)}
          </Tooltip>
        </CircleMarker>
      ))}

      {cities.map((c) => (
        <Marker
          key={`${c.city}-${c.city === selected}`}
          position={[c.lat, c.lng]}
          icon={cityIcon(c, max, c.city === selected, referenceDate)}
          title={`${c.city}: ${plural(c.count, "sighting")}, latest ${formatDay(c.latest)}`}
          alt={`${c.city}: ${plural(c.count, "sighting")}`}
          keyboard
          zIndexOffset={c.city === selected ? 1000 : c.count}
          eventHandlers={{ click: () => onSelect(c.city) }}
        />
      ))}
    </MapContainer>
  );
}
