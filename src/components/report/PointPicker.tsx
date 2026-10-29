"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL } from "@/components/map/tiles";

interface Props {
  point: { lat: number; lng: number } | null;
  centre: { lat: number; lng: number };
  onPick: (lat: number, lng: number) => void;
}

function ClickToPick({ onPick }: { onPick: Props["onPick"] }) {
  useMapEvents({ click: (e) => onPick(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5))) });
  return null;
}

function Recentre({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 11));
  }, [map, lat, lng]);
  return null;
}

export default function PointPicker({ point, centre, onPick }: Props) {
  const focus = point ?? centre;
  return (
    <MapContainer center={[focus.lat, focus.lng]} zoom={11} className="h-64 w-full rounded-md border border-rule" aria-label="Map: click to mark where you saw the tick">
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={TILE_MAX_ZOOM} />
      <Recentre lat={focus.lat} lng={focus.lng} />
      <ClickToPick onPick={onPick} />
      {point && (
        <CircleMarker center={[point.lat, point.lng]} radius={9} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#8e1f3d", fillOpacity: 1 }} />
      )}
    </MapContainer>
  );
}
