"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ApiError, apiJson } from "@/lib/client/api";
import { PLACES, REGIONS, distanceKm, findPlace } from "@/lib/geo/places";
import { MAX_NOTES, SPECIES_CHOICES, type Warning, reportSchema, reportWarnings } from "@/lib/report";
import type { Sighting } from "@/lib/sightings";
import { resizeImage } from "./resizeImage";

const PointPicker = dynamic(() => import("./PointPicker"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-md bg-fern-soft" />,
});

type Field = "date" | "time" | "city" | "lat" | "species" | "notes" | "image";
type Errors = Partial<Record<Field, string>>;

const LABELS: Record<Field, string> = {
  date: "Date",
  time: "Time",
  city: "Nearest city",
  lat: "Exact location",
  species: "Species",
  notes: "Notes",
  image: "Photo",
};

const today = () => new Date().toISOString().slice(0, 10);

function nearestCity(lat: number, lng: number) {
  return PLACES.reduce((best, p) => (distanceKm(lat, lng, p.lat, p.lng) < distanceKm(lat, lng, best.lat, best.lng) ? p : best)).name;
}

export function ReportForm({ initialCity }: { initialCity?: string }) {
  const [values, setValues] = useState({
    date: today(),
    time: "",
    city: initialCity && findPlace(initialCity) ? findPlace(initialCity)!.name : "",
    species: "",
    notes: "",
    website: "",
  });
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [summary, setSummary] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "locating">("idle");
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [done, setDone] = useState<{ sighting: Sighting; warnings: Warning[] } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const input = useMemo(() => ({ ...values, lat: point?.lat, lng: point?.lng }), [values, point]);
  const warnings = useMemo(() => {
    const ok = reportSchema.safeParse(input);
    return ok.success ? reportWarnings(ok.data) : reportWarnings({ date: values.date, city: values.city, lat: point?.lat, lng: point?.lng });
  }, [input, values.date, values.city, point]);

  function validate(): Errors {
    const result = reportSchema.safeParse(input);
    const next: Errors = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const f = (issue.path[0] === "lng" ? "lat" : issue.path[0]) as Field;
        if (f in LABELS) next[f] ??= issue.message;
      }
    }
    if (errors.image) next.image = errors.image;
    return next;
  }

  // Re-check a field once the person has moved on from it
  function blur(field: Field) {
    const all = validate();
    setErrors((e) => ({ ...e, [field]: all[field] }));
  }

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key as Field]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function pickPhoto(file: File | undefined) {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
    setErrors((e) => ({ ...e, image: undefined }));
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((e) => ({ ...e, image: "Choose a photo (JPEG, PNG or WebP)." }));
      return;
    }
    try {
      const blob = await resizeImage(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch (err) {
      setErrors((e) => ({ ...e, image: err instanceof Error ? err.message : "Couldn't read that photo." }));
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      setGeoMessage("Your browser can't share its location. Click the map instead.");
      setShowMap(true);
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setStatus("idle");
        setShowMap(true);
        pickPoint(lat, lng);
        setGeoMessage(null);
      },
      () => {
        setStatus("idle");
        setShowMap(true);
        setGeoMessage("We couldn't get your location. Click the map to mark the spot instead.");
      },
      { timeout: 10_000 },
    );
  }

  function pickPoint(lat: number, lng: number) {
    setPoint({ lat, lng });
    setErrors((e) => ({ ...e, lat: undefined }));
    // Fill in the city for them if they haven't chosen one
    setValues((v) => (v.city ? v : { ...v, city: nearestCity(lat, lng) }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      setSummary(true);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setSummary(false);
    setStatus("sending");
    const form = new FormData();
    for (const [k, v] of Object.entries(values)) form.set(k, v);
    if (point) {
      form.set("lat", String(point.lat));
      form.set("lng", String(point.lng));
    }
    if (photo) form.set("image", photo.blob, "photo.jpg");
    try {
      const result = await apiJson<{ sighting: Sighting; warnings: Warning[] }>("/api/sightings", { method: "POST", body: form });
      setDone(result);
      window.scrollTo({ top: 0 });
    } catch (err) {
      const next: Errors = {};
      if (err instanceof ApiError && err.details) {
        for (const d of err.details) {
          const f = (d.field === "lng" ? "lat" : d.field) as Field;
          if (f in LABELS) next[f] ??= d.message;
        }
      }
      if (err instanceof ApiError && err.code.includes("image")) next.image = err.message;
      // Field problems go next to the fields; anything else (offline, rate limit) in the summary
      setErrors(next);
      setSummary(true);
      setServerError(Object.keys(next).length ? null : err instanceof Error ? err.message : "Something went wrong.");
      requestAnimationFrame(() => summaryRef.current?.focus());
    } finally {
      setStatus("idle");
    }
  }
  function reset() {
    setDone(null);
    setValues((v) => ({ ...v, time: "", species: "", notes: "" }));
    setPoint(null);
    setShowMap(false);
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  if (done) {
    const s = done.sighting;
    return (
      <div role="status" className="rounded-lg border-l-4 border-fern bg-fern-soft p-6">
        <h2 className="text-2xl font-bold">Thanks, your sighting is on the map</h2>
        <p className="mt-2">
          {s.species} in {s.city} on {new Date(`${s.date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}.
        </p>
        {done.warnings.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-sm">
            {done.warnings.map((w) => (
              <li key={w.message}>{w.message}</li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={`/?city=${encodeURIComponent(s.city)}`} className="rounded-md bg-fern px-4 py-2 font-bold text-on-fern">
            See it on the map
          </Link>
          <button type="button" onClick={reset} className="rounded-md border border-rule bg-panel px-4 py-2">
            Report another sighting
          </button>
        </div>
      </div>
    );
  }

  const field = "w-full rounded-md border bg-panel px-3 py-2 aria-[invalid=true]:border-plum aria-[invalid=true]:border-2";
  const describe = (f: Field, hint?: boolean) =>
    [hint ? `${f}-hint` : null, errors[f] ? `${f}-error` : null].filter(Boolean).join(" ") || undefined;
  const ErrorText = ({ f }: { f: Field }) =>
    errors[f] ? (
      <p id={`${f}-error`} className="mt-1.5 font-bold text-plum">
        <span className="sr-only">Error: </span>
        {errors[f]}
      </p>
    ) : null;
  const errorList = (Object.entries(errors) as [Field, string | undefined][]).filter(([, m]) => m);

  return (
    <form onSubmit={submit} noValidate className="space-y-7">
      {summary && (errorList.length > 0 || serverError) && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-lg border-2 border-plum bg-error-soft p-5">
          <h2 className="text-lg font-bold">{serverError ? "Your report wasn't sent" : "Check these before sending"}</h2>
          {serverError && <p className="mt-1">{serverError}</p>}
          <ul className="mt-2 list-disc pl-5">
            {errorList.map(([f, m]) => (
              <li key={f}>
                <a href={`#${f === "lat" ? "locate" : f}`} className="underline underline-offset-4">
                  {LABELS[f]}: {m}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="date" className="font-bold">Date you saw it</label>
          <input
            id="date" type="date" max={today()} value={values.date} required
            onChange={(e) => set("date", e.target.value)} onBlur={() => blur("date")}
            aria-invalid={!!errors.date} aria-describedby={describe("date")}
            className={`${field} mt-1.5 border-rule`}
          />
          <ErrorText f="date" />
        </div>
        <div>
          <label htmlFor="time" className="font-bold">
            Time <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="time" type="time" value={values.time}
            onChange={(e) => set("time", e.target.value)} onBlur={() => blur("time")}
            aria-invalid={!!errors.time} aria-describedby={describe("time")}
            className={`${field} mt-1.5 border-rule`}
          />
          <ErrorText f="time" />
        </div>
      </div>

      <div>
        <label htmlFor="city" className="font-bold">Nearest city</label>
        <p id="city-hint" className="text-sm text-muted">Sightings are mapped by city. Add an exact spot below if you know it.</p>
        <select
          id="city" value={values.city} required
          onChange={(e) => set("city", e.target.value)} onBlur={() => blur("city")}
          aria-invalid={!!errors.city} aria-describedby={describe("city", true)}
          className={`${field} mt-1.5 border-rule`}
        >
          <option value="">Choose a city</option>
          {REGIONS.map((r) => (
            <optgroup key={r} label={r}>
              {PLACES.filter((p) => p.region === r).sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <ErrorText f="city" />
      </div>

      <fieldset>
        <legend className="font-bold">
          Exact location <span className="font-normal text-muted">(optional)</span>
        </legend>
        <p id="lat-hint" className="text-sm text-muted">Helps others see exactly where ticks are. Only the point is saved, never your address.</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button id="locate" type="button" onClick={locate} disabled={status === "locating"} className="rounded-md border border-rule bg-panel px-3 py-1.5 hover:border-fern disabled:opacity-60">
            {status === "locating" ? "Finding you…" : "Use my location"}
          </button>
          {!showMap && (
            <button type="button" onClick={() => setShowMap(true)} className="text-fern underline underline-offset-4">
              Pick on a map
            </button>
          )}
          {point && (
            <span className="text-sm">
              Marked at {point.lat}, {point.lng}.{" "}
              <button type="button" onClick={() => setPoint(null)} className="text-fern underline underline-offset-4">Remove</button>
            </span>
          )}
        </div>
        {geoMessage && <p className="mt-2 text-sm" role="status">{geoMessage}</p>}
        {showMap && (
          <div className="mt-3">
            <PointPicker
              point={point}
              centre={findPlace(values.city) ?? { lat: 54.4, lng: -3.4 }}
              onPick={pickPoint}
            />
            <p className="mt-1 text-sm text-muted">Click or tap where you saw the tick.</p>
          </div>
        )}
        <ErrorText f="lat" />
      </fieldset>

      <div>
        <label htmlFor="species" className="font-bold">Species</label>
        <p id="species-hint" className="text-sm text-muted">
          Not sure? Choose &ldquo;Unknown species&rdquo;, or check the <Link href="/learn#species" className="text-fern underline underline-offset-4">species guide</Link>.
        </p>
        <select
          id="species" value={values.species} required
          onChange={(e) => set("species", e.target.value)} onBlur={() => blur("species")}
          aria-invalid={!!errors.species} aria-describedby={describe("species", true)}
          className={`${field} mt-1.5 border-rule`}
        >
          <option value="">Choose a species</option>
          {SPECIES_CHOICES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <ErrorText f="species" />
      </div>

      <div>
        <label htmlFor="notes" className="font-bold">
          Notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <p id="notes-hint" className="text-sm text-muted">For example: found on my dog after a walk through bracken.</p>
        <textarea
          id="notes" rows={3} value={values.notes} maxLength={MAX_NOTES + 50}
          onChange={(e) => set("notes", e.target.value)} onBlur={() => blur("notes")}
          aria-invalid={!!errors.notes} aria-describedby={describe("notes", true)}
          className={`${field} mt-1.5 border-rule`}
        />
        <p className={`text-right text-sm ${values.notes.length > MAX_NOTES ? "font-bold text-plum" : "text-muted"}`} aria-live="polite">
          {values.notes.length} / {MAX_NOTES}
        </p>
        <ErrorText f="notes" />
      </div>

      <div>
        <label htmlFor="image" className="font-bold">
          Photo <span className="font-normal text-muted">(optional)</span>
        </label>
        <p id="image-hint" className="text-sm text-muted">A clear close-up helps confirm the species. Large photos are shrunk before upload.</p>
        <input
          ref={fileRef} id="image" type="file" accept="image/jpeg,image/png,image/webp"
          onChange={(e) => pickPhoto(e.target.files?.[0])}
          aria-invalid={!!errors.image} aria-describedby={describe("image", true)}
          className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-md file:border file:border-rule file:bg-panel file:px-3 file:py-1.5"
        />
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
          <img src={photo.url} alt="Preview of your photo" className="mt-3 max-h-48 rounded-md border border-rule" />
        )}
        <ErrorText f="image" />
      </div>

      {/* Hidden from people; bots tend to fill every field */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set("website", e.target.value)} name="website" />
        </label>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-lg border-l-4 border-ochre bg-warn-soft p-4" aria-live="polite">
          <p className="font-bold">Worth a second look</p>
          <ul className="mt-1 list-disc pl-5">
            {warnings.map((w) => (
              <li key={w.message}>{w.message}</li>
            ))}
          </ul>
          <p className="mt-1 text-sm text-muted">You can still send the report.</p>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-md bg-fern px-5 py-2.5 text-lg font-bold text-on-fern hover:opacity-90 disabled:opacity-60"
      >
        {status === "sending" ? "Sending report…" : "Send report"}
      </button>
    </form>
  );
}
