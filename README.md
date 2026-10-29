# Tick Tracker UK

A full-stack MVP for mapping tick sightings across the UK, built by **Mohammad Kalaf** for Elanco's 2026
placement task. Pet owners and vets can see where ticks have been reported, learn to identify them, and report
their own sightings.

Live at **https://ticks.mohammadkalaf.com** (currently inactive)

Video walkthrough (about 10 minutes): **(still making it)**

![Map with sightings by city and the details panel for one city](docs/screenshots/map.png)

## Run it locally

You need [Node.js](https://nodejs.org) 22 or newer. No accounts or keys.

```bash
npm install
npm run dev        # http://localhost:3000
```

On the first request the app fetches Elanco's API, cleans the data and stores it in a local SQLite database
(Cloudflare D1 running locally, under `.wrangler/`). Photos attached to reports go into local key-value storage
the same way.

```bash
npm test           # unit tests: cleaning, API client, queries, sync, validation
npm run lint
npm run typecheck
npm run build
```

## What it does

| Requirement in the brief | Where |
| --- | --- |
| Plan for consuming the API, handling large datasets, duplicates and incomplete data | [How the data is handled](#how-the-data-is-handled), `src/lib/source/` |
| Endpoint to accept new sighting reports | `POST /api/sightings` |
| Search and filter by time range and location | `GET /api/sightings?from&to&city&region&near=lat,lng&radiusKm` |
| Aggregate insights: per region, trends over time | `/api/stats/regions`, `/api/stats/cities`, `/api/stats/trends?interval=week\|month\|year` |
| Error handling for API failures, bad data and invalid submissions | [Error handling](#error-handling) |
| Map of sightings across the UK | Map page |
| Markers with visual indicators | Size shows how many sightings, colour shows how recent the latest one is (compared with the newest data) |
| Filter controls | Date range and species, kept in the URL so views can be shared |
| Detail panel when a marker is clicked | City panel: activity, species mix, latest sightings, photos |
| Timeline of activity in an area | Timeline in the city panel: by year across the whole dataset, by month for shorter ranges |
| Quick actions | Report a sighting here, Get directions, Share |
| Species identification guide | Learn page |
| Prevention tips | Learn page, with tick removal steps and when to see a GP |
| Seasonal activity chart | Learn page, with dropdowns for city and year |
| Report form | Report page |
| Validation with error, warning and success messages | Errors block sending; warnings (e.g. a winter date) don't |
| Image upload | Optional photo, resized in the browser, checked on the server |
| Documentation (optional) | This README and [ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Wireframes (optional) | [docs/wireframes](docs/wireframes) |
| Accessibility (optional) | [Accessibility](#accessibility) |

The **Data** page also shows when the data was last synced, exactly what the cleaning step fixed or dropped,
and the site's own API.

## Technical choices

| Part | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript | Frontend and API in one project, typed end to end. It is also the stack Elanco's Software Engineer role lists. |
| Styling | Tailwind CSS 4 | Styles next to the markup; light and dark themes from one set of colour tokens |
| Map | Leaflet with OpenStreetMap tiles | Free, no API key, widely used. I started with CARTO's tiles, but CARTO began requiring a key in autumn 2026, so I switched and muted the OpenStreetMap tiles with CSS to keep the markers readable. |
| Database | Cloudflare D1 (SQLite) | Real SQL with indexes, and runs locally with no setup. Tests run the same SQL on Node's built-in SQLite. |
| Photo storage | Cloudflare Workers KV | Free tier and no extra service. R2 would be the choice at scale. |
| Validation | Zod | One schema checks the report form in the browser and again on the server |
| Hosting | Cloudflare Workers via OpenNext | Free tier, runs close to users, same platform as my other projects |
| Tests | Vitest | Fast, TypeScript-native |
| CI | GitHub Actions | Lint, type check, tests and build on every push |

Charts are plain HTML and CSS rather than a chart library: lighter, themeable, and each one includes a hidden
table so screen readers get the numbers.

## How the data is handled

The Elanco API is the source; this app keeps its own cleaned copy.

1. **Sync, not proxy.** `src/lib/sync.ts` fetches `GET /tick-sightings` (the whole dataset in one call),
   cleans it and stores it in D1. Pages and endpoints then query the database, never the source directly. That
   keeps the app fast, keeps it working when the source is down, and stays well inside the source's rate limit.
2. **Refresh window.** Data is refreshed at most every six hours, triggered by the first request after the
   window ends. Requests arriving during a sync wait for it rather than each starting their own (per server
   instance; a scheduled sync would remove the overlap entirely, see below).
3. **Atomic swap.** A sync deletes the old source rows and inserts the new ones in one transaction (a D1 batch),
   so readers never see half a dataset. Public reports are stored in the same table, with `source = 'user'`,
   and a sync never touches them.
4. **Cleaning** (`src/lib/source/clean.ts`), with every decision counted in a quality report shown on the Data
   page:
   - **Duplicates:** a repeated `id` is dropped. So is the same sighting under a new id (same time, city and
     species), since that is one tick reported twice.
   - **Locations:** names are matched to a list of UK cities with coordinates and ONS regions, ignoring case,
     spacing and punctuation, with known alternatives ("Kingston upon Hull" is Hull) and typo correction
     ("Manchster"). It picks the single closest match and gives up on a tie rather than guess. Unmappable
     places are dropped.
   - **Dates:** ISO, date-only and UK-style formats are accepted. Impossible dates (30 February) and future
     dates are dropped, as they can't go on a timeline.
   - **Species:** matched on the Latin name first, since common names vary. Unrecognised species are kept as
     "Unknown species" rather than thrown away.
   - **Missing ids** get a stable generated id, so re-syncing doesn't create copies.
   - **Safety net:** if a sync produces no usable rows, the old data is kept rather than wiped.
5. **Queries** (`src/lib/db/queries.ts`) use bound parameters throughout, indexes on date, city and species,
   and SQL `GROUP BY` for the insights. Radius search uses a bounding box in SQL, then exact distance.

**What the real data showed.** The current dataset has 1,000 sightings from 14 cities, January 2012 to
December 2024. None needed dropping, but a few things shaped the design:

- **226 Latin names didn't match their species.** Every Passerine tick is labelled *Dermacentor frontalis*;
  the species is *Ixodes frontalis*. The cleaning step corrects it and counts the fix on the Data page rather
  than changing it silently.
- **Names follow UKHSA.** The data includes the Marsh tick (*Ixodes apronophorus*), so the guide uses UKHSA's
  names throughout to avoid two ticks sharing one common name.
- **The newest sighting is from 30 December 2024.** Measured against today, every city would look quiet, so
  marker colours compare each city with the newest date in the data instead, and the legend says so.
- **Thirteen years of data.** 156 monthly bars don't fit a side panel, so the timeline switches to yearly bars
  when the range covers more than three years.
- **No seasonal pattern.** Real tick activity peaks in spring and early autumn, but here every month has a
  similar count and December has the most. There are also no Sheep ticks, the UK's commonest species. Both
  suggest the data is generated, so the Learn page states the real seasonal pattern rather than reading one
  from the chart.

**Larger datasets.** The source returns everything in one response, which is fine at about 1,000 rows. At
millions of rows I would change three things: page through the source (or use its per-city endpoints) instead
of one call; sync incrementally by id or date instead of replacing everything; and pre-compute the daily
aggregates in a table so the insight endpoints read summaries rather than scanning rows.

## Error handling

- **Source API:** 10-second timeout; server errors and network failures are retried with backoff. A 429 is
  not retried, because the source asks callers to wait a minute. When a sync fails, the last good copy keeps
  being served (marked with an `X-Data-Stale` header), and the source isn't asked again for two minutes. Only
  if there is no data at all does the API return 503 with a `Retry-After`.
- **Our API:** every error has the same shape, `{ "error": { "code", "message", "details" } }`, with a matching
  status: 400 for bad filters or reports (with the field and reason), 404, 413 for oversized photos, 415, and
  429 for too many reports.
- **Reports:** validated in the browser and again on the server with the same schema. Photos are identified by
  their bytes, not their file name, so a renamed script can't pass as an image. A hidden honeypot field and a
  limit of 10 reports per hour per IP address keep spam down.

## Accessibility

- Every map marker is a focusable button, and the same data is available as a list in the side panel.
- Charts include hidden data tables for screen readers.
- Form errors follow the GOV.UK pattern: a summary that takes focus and links to each field, plus a message on
  the field itself (`aria-invalid`, `aria-describedby`).
- Colour is never the only signal: markers carry their count, and the legend explains colour and size.
- Light, dark and system themes; reduced motion respected; visible focus; works from 320px wide.
- The [Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/) font, designed for low-vision readers.
- Checked with axe-core: no violations on any page, in light or dark mode.

## Project structure

```
src/
  app/
    page.tsx              map page
    learn/ report/ data/  other pages
    api/                  route handlers (one folder per endpoint)
  components/             map, panels, charts, report form
  lib/
    source/               Elanco API client, cleaning, dates, species
    db/                   database interface, schema, queries
    geo/places.ts         UK cities, regions, distance
    sync.ts               when and how to refresh from the source
    params.ts             parsing search filters
    report.ts             report validation, shared by form and API
docs/                     architecture notes, wireframes, screenshots
```

## Deploying

The app runs on Cloudflare Workers. One-time setup, from this folder:

```bash
npx wrangler login
npx wrangler d1 create uk-tick-tracker          # copy the database_id into wrangler.jsonc
npx wrangler kv namespace create UPLOADS        # copy the id into wrangler.jsonc
npx wrangler kv namespace create NEXT_INC_CACHE_KV
npx wrangler secret put SYNC_TOKEN              # optional: allows POST /api/sync to force a refresh
npm run deploy
```

After that, GitHub Actions can deploy on every push to `main`: add the `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` secrets and set the repository variable `DEPLOY_ENABLED` to `true`.

## What I would do with more time

- **Moderation** for public reports (a review queue, and a way to flag bad ones) before they count in totals.
- **Postcode-level locations** for reports, and clustering markers when zoomed out, instead of one marker per
  city.
- **R2** for photos, with automatic thumbnails.
- **A production map tile provider.** OpenStreetMap's own tile servers are fine for a demo but ask heavy users
  to use a commercial provider or host their own.
- **End-to-end tests** in a real browser (Playwright) for the report flow and the map.
- **A scheduled sync** (a Cloudflare Cron Trigger) so the first visitor after the refresh window never waits.
- **Proper risk modelling**: sighting counts reflect how many people report, not just how many ticks there
  are. Comparing against population or footfall would make "high activity" more honest.

## Data and disclaimer

Sighting data comes from Elanco's placement task API, which is for educational use only and is not an official
record of tick activity. Health information on the Learn page is general guidance from the NHS and UK tick
charities, not medical or veterinary advice.
