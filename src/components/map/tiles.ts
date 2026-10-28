// OpenStreetMap's own tiles: free and keyless. CARTO's need a key since autumn 2026.
// globals.css mutes them, and inverts them in dark mode, so the markers stand out.
export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const TILE_MAX_ZOOM = 19;
