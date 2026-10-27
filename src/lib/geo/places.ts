// The source data only names a city, so every sighting is placed at its city centre.
// Regions are the ONS International Territorial Level 1 (ITL1) regions.

export const REGIONS = [
  "North East",
  "North West",
  "Yorkshire and the Humber",
  "East Midlands",
  "West Midlands",
  "East of England",
  "London",
  "South East",
  "South West",
  "Wales",
  "Scotland",
  "Northern Ireland",
] as const;

export type Region = (typeof REGIONS)[number];

export interface Place {
  name: string;
  region: Region;
  lat: number;
  lng: number;
  aliases?: string[];
}

export const PLACES: Place[] = [
  // London
  { name: "London", region: "London", lat: 51.5074, lng: -0.1278, aliases: ["City of London", "Westminster", "Greater London"] },

  // South East
  { name: "Brighton", region: "South East", lat: 50.8225, lng: -0.1372, aliases: ["Brighton and Hove", "Brighton & Hove"] },
  { name: "Canterbury", region: "South East", lat: 51.2802, lng: 1.0789 },
  { name: "Chichester", region: "South East", lat: 50.8376, lng: -0.7749 },
  { name: "Guildford", region: "South East", lat: 51.2362, lng: -0.5704 },
  { name: "Milton Keynes", region: "South East", lat: 52.0406, lng: -0.7594 },
  { name: "Oxford", region: "South East", lat: 51.752, lng: -1.2577 },
  { name: "Portsmouth", region: "South East", lat: 50.8198, lng: -1.088 },
  { name: "Reading", region: "South East", lat: 51.4543, lng: -0.9781 },
  { name: "Southampton", region: "South East", lat: 50.9097, lng: -1.4044 },
  { name: "Winchester", region: "South East", lat: 51.0598, lng: -1.3101 },
  { name: "Basingstoke", region: "South East", lat: 51.2665, lng: -1.0924 },
  { name: "Maidstone", region: "South East", lat: 51.2704, lng: 0.5227 },

  // South West
  { name: "Bath", region: "South West", lat: 51.3811, lng: -2.359 },
  { name: "Bournemouth", region: "South West", lat: 50.7192, lng: -1.8808 },
  { name: "Bristol", region: "South West", lat: 51.4545, lng: -2.5879 },
  { name: "Exeter", region: "South West", lat: 50.7184, lng: -3.5339 },
  { name: "Gloucester", region: "South West", lat: 51.8642, lng: -2.2382 },
  { name: "Plymouth", region: "South West", lat: 50.3755, lng: -4.1427 },
  { name: "Salisbury", region: "South West", lat: 51.0688, lng: -1.7945 },
  { name: "Swindon", region: "South West", lat: 51.5558, lng: -1.7797 },
  { name: "Truro", region: "South West", lat: 50.2632, lng: -5.051 },
  { name: "Wells", region: "South West", lat: 51.2094, lng: -2.645 },

  // East of England
  { name: "Cambridge", region: "East of England", lat: 52.2053, lng: 0.1218 },
  { name: "Chelmsford", region: "East of England", lat: 51.7356, lng: 0.4685 },
  { name: "Colchester", region: "East of England", lat: 51.8959, lng: 0.8919 },
  { name: "Ely", region: "East of England", lat: 52.399, lng: 0.2624 },
  { name: "Ipswich", region: "East of England", lat: 52.0567, lng: 1.1482 },
  { name: "Luton", region: "East of England", lat: 51.8787, lng: -0.42 },
  { name: "Norwich", region: "East of England", lat: 52.6309, lng: 1.2974 },
  { name: "Peterborough", region: "East of England", lat: 52.5695, lng: -0.2405 },
  { name: "St Albans", region: "East of England", lat: 51.7527, lng: -0.3394, aliases: ["St. Albans", "Saint Albans"] },
  { name: "Southend-on-Sea", region: "East of England", lat: 51.5459, lng: 0.7077, aliases: ["Southend"] },

  // East Midlands
  { name: "Derby", region: "East Midlands", lat: 52.9225, lng: -1.4746 },
  { name: "Leicester", region: "East Midlands", lat: 52.6369, lng: -1.1398 },
  { name: "Lincoln", region: "East Midlands", lat: 53.2307, lng: -0.5406 },
  { name: "Northampton", region: "East Midlands", lat: 52.2405, lng: -0.9027 },
  { name: "Nottingham", region: "East Midlands", lat: 52.9548, lng: -1.1581 },

  // West Midlands
  { name: "Birmingham", region: "West Midlands", lat: 52.4862, lng: -1.8904 },
  { name: "Coventry", region: "West Midlands", lat: 52.4068, lng: -1.5197 },
  { name: "Hereford", region: "West Midlands", lat: 52.0565, lng: -2.716 },
  { name: "Lichfield", region: "West Midlands", lat: 52.6816, lng: -1.8317 },
  { name: "Stoke-on-Trent", region: "West Midlands", lat: 53.0027, lng: -2.1794, aliases: ["Stoke on Trent", "Stoke"] },
  { name: "Wolverhampton", region: "West Midlands", lat: 52.5862, lng: -2.1288 },
  { name: "Worcester", region: "West Midlands", lat: 52.1936, lng: -2.2216 },

  // Yorkshire and the Humber
  { name: "Bradford", region: "Yorkshire and the Humber", lat: 53.796, lng: -1.7594 },
  { name: "Doncaster", region: "Yorkshire and the Humber", lat: 53.5228, lng: -1.1285 },
  { name: "Hull", region: "Yorkshire and the Humber", lat: 53.7676, lng: -0.3274, aliases: ["Kingston upon Hull", "Kingston-upon-Hull"] },
  { name: "Leeds", region: "Yorkshire and the Humber", lat: 53.8008, lng: -1.5491 },
  { name: "Ripon", region: "Yorkshire and the Humber", lat: 54.1381, lng: -1.524 },
  { name: "Sheffield", region: "Yorkshire and the Humber", lat: 53.3811, lng: -1.4701 },
  { name: "Wakefield", region: "Yorkshire and the Humber", lat: 53.6833, lng: -1.4977 },
  { name: "York", region: "Yorkshire and the Humber", lat: 53.96, lng: -1.0873 },

  // North West
  { name: "Blackpool", region: "North West", lat: 53.8175, lng: -3.0357 },
  { name: "Bolton", region: "North West", lat: 53.5769, lng: -2.4282 },
  { name: "Carlisle", region: "North West", lat: 54.8925, lng: -2.9329 },
  { name: "Chester", region: "North West", lat: 53.1934, lng: -2.8931 },
  { name: "Lancaster", region: "North West", lat: 54.0466, lng: -2.8007 },
  { name: "Liverpool", region: "North West", lat: 53.4084, lng: -2.9916 },
  { name: "Manchester", region: "North West", lat: 53.4808, lng: -2.2426 },
  { name: "Preston", region: "North West", lat: 53.7632, lng: -2.7031 },
  { name: "Salford", region: "North West", lat: 53.4875, lng: -2.2901 },
  { name: "Kendal", region: "North West", lat: 54.3281, lng: -2.7463 },

  // North East
  { name: "Durham", region: "North East", lat: 54.7761, lng: -1.5733 },
  { name: "Middlesbrough", region: "North East", lat: 54.5742, lng: -1.235 },
  { name: "Newcastle", region: "North East", lat: 54.9783, lng: -1.6178, aliases: ["Newcastle upon Tyne", "Newcastle-upon-Tyne"] },
  { name: "Sunderland", region: "North East", lat: 54.9069, lng: -1.3838 },

  // Wales
  { name: "Aberystwyth", region: "Wales", lat: 52.4153, lng: -4.0829 },
  { name: "Bangor", region: "Wales", lat: 53.2274, lng: -4.1293 },
  { name: "Cardiff", region: "Wales", lat: 51.4816, lng: -3.1791 },
  { name: "Newport", region: "Wales", lat: 51.5842, lng: -2.9977 },
  { name: "St Davids", region: "Wales", lat: 51.8812, lng: -5.266, aliases: ["St David's", "St. Davids"] },
  { name: "Swansea", region: "Wales", lat: 51.6214, lng: -3.9436 },
  { name: "Wrexham", region: "Wales", lat: 53.0466, lng: -2.9925 },

  // Scotland
  { name: "Aberdeen", region: "Scotland", lat: 57.1497, lng: -2.0943 },
  { name: "Dundee", region: "Scotland", lat: 56.462, lng: -2.9707 },
  { name: "Dunfermline", region: "Scotland", lat: 56.0717, lng: -3.452 },
  { name: "Edinburgh", region: "Scotland", lat: 55.9533, lng: -3.1883 },
  { name: "Fort William", region: "Scotland", lat: 56.8198, lng: -5.1052 },
  { name: "Glasgow", region: "Scotland", lat: 55.8642, lng: -4.2518 },
  { name: "Inverness", region: "Scotland", lat: 57.4778, lng: -4.2247 },
  { name: "Perth", region: "Scotland", lat: 56.395, lng: -3.4308 },
  { name: "Stirling", region: "Scotland", lat: 56.1165, lng: -3.9369 },

  // Northern Ireland
  { name: "Armagh", region: "Northern Ireland", lat: 54.3503, lng: -6.6528 },
  { name: "Belfast", region: "Northern Ireland", lat: 54.5973, lng: -5.9301 },
  { name: "Derry", region: "Northern Ireland", lat: 54.9966, lng: -7.3086, aliases: ["Londonderry", "Derry/Londonderry"] },
  { name: "Lisburn", region: "Northern Ireland", lat: 54.5162, lng: -6.058 },
  { name: "Newry", region: "Northern Ireland", lat: 54.1751, lng: -6.3402 },
];

// Rough UK bounding box, for checking reported coordinates
export const UK_BOUNDS = { south: 49.8, north: 60.9, west: -8.7, east: 1.8 };

export function inUk(lat: number, lng: number): boolean {
  return lat >= UK_BOUNDS.south && lat <= UK_BOUNDS.north && lng >= UK_BOUNDS.west && lng <= UK_BOUNDS.east;
}

// "st. albans " and "St Albans" should match, so compare on letters and digits only
export function placeKey(name: string): string {
  return name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
}

const BY_KEY = new Map<string, Place>();
for (const place of PLACES) {
  for (const name of [place.name, ...(place.aliases ?? [])]) BY_KEY.set(placeKey(name), place);
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// Exact match on the normalised name, else a typo fix ("Manchster") when exactly
// one known name is close. Short names get no fuzzy match: one wrong letter is too
// much of a three-letter name to guess from.
export function findPlace(name: string): Place | undefined {
  const k = placeKey(name);
  const exact = BY_KEY.get(k);
  if (exact || k.length < 5) return exact;
  const maxEdits = k.length >= 9 ? 2 : 1;
  let best = maxEdits + 1;
  let matches = new Set<Place>();
  for (const [candidate, place] of BY_KEY) {
    if (Math.abs(candidate.length - k.length) > maxEdits) continue;
    const d = editDistance(k, candidate);
    if (d < best) {
      best = d;
      matches = new Set([place]);
    } else if (d === best) {
      matches.add(place);
    }
  }
  // "Manchster" is 1 edit from Manchester and 2 from Lancaster: take the closest,
  // but give up on a tie
  return matches.size === 1 ? [...matches][0] : undefined;
}

export function placeNamed(name: string): Place | undefined {
  return PLACES.find((p) => p.name === name);
}

// Great-circle distance, used for "sightings near me"
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
