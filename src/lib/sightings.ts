import type { Region } from "@/lib/geo/places";

export type Source = "elanco" | "user";

export interface Sighting {
  id: string;
  source: Source;
  observedAt: string; // YYYY-MM-DDTHH:mm
  date: string; // YYYY-MM-DD
  hasTime: boolean;
  city: string;
  region: Region;
  lat: number;
  lng: number;
  species: string;
  latinName: string | null;
  notes: string | null;
  imageKey: string | null;
  createdAt: string | null; // only set for user reports
}
