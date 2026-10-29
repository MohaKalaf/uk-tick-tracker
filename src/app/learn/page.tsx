import type { Metadata } from "next";
import { connection } from "next/server";
import { SeasonalChart } from "@/components/SeasonalChart";
import { overview } from "@/lib/db/queries";
import { numberFormat } from "@/lib/format";
import { readyContext } from "@/lib/server/context";
import { SPECIES } from "@/lib/source/species";
import { GUIDE, PREVENTION, SOURCES } from "@/lib/species-guide";

export const metadata: Metadata = {
  title: "Learn",
  description: "Identify UK ticks, avoid bites, remove a tick safely, and see when ticks are most active.",
};

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-fern">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

export default async function LearnPage() {
  await connection();
  let counts = new Map<string, number>();
  let cities: string[] = [];
  let years: number[] = [];
  let defaultYear = new Date().getFullYear();
  try {
    const { db } = await readyContext();
    const data = await overview(db);
    counts = new Map(data.species.map((s) => [s.species, s.count]));
    cities = data.cities.map((c) => c.city);
    years = data.years;
    if (data.latestSourceDate) defaultYear = Number(data.latestSourceDate.slice(0, 4));
  } catch {
    // The guide still works without data; the chart shows its own error
  }

  // Species in the data first, most-reported first
  const species = [...SPECIES].sort((a, b) => (counts.get(b.name) ?? 0) - (counts.get(a.name) ?? 0));
  const seen = species.filter((s) => counts.has(s.name));
  const others = species.filter((s) => !counts.has(s.name));

  const entry = (s: (typeof SPECIES)[number]) => {
    const g = GUIDE[s.name];
    const n = counts.get(s.name);
    return (
      <article key={s.name} className="border-t border-rule py-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-xl font-bold">
            {s.name} <i className="ml-1 text-base font-normal text-muted">{s.latinName}</i>
          </h3>
          {n !== undefined && <span className="text-sm text-muted">{numberFormat.format(n)} sightings in the data</span>}
        </div>
        {g && (
          <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted">Looks like</dt>
            <dd>{g.look}</dd>
            <dt className="text-muted">Feeds on</dt>
            <dd>{g.hosts}</dd>
            <dt className="text-muted">Found in</dt>
            <dd>{g.where}</dd>
            <dt className="text-muted">Why it matters</dt>
            <dd>
              {g.risk}
            </dd>
          </dl>
        )}
      </article>
    );
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="max-w-2xl text-4xl font-bold sm:text-5xl">Know your ticks</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Ticks are small blood-feeding relatives of spiders. Most UK species stay in nests and burrows, but a few
        wait on vegetation for a passing dog or walker. Here is how to tell them apart and stay safe.
      </p>

      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-fern">
        <a href="#season" className="underline underline-offset-4">When ticks are active</a>
        <a href="#prevention" className="underline underline-offset-4">Avoiding bites</a>
        <a href="#removal" className="underline underline-offset-4">Removing a tick</a>
        <a href="#species" className="underline underline-offset-4">Species guide</a>
      </nav>

      <section id="season" aria-labelledby="season-h" className="mt-14 scroll-mt-6">
        <h2 id="season-h" className="text-2xl font-bold">When ticks are active</h2>
        <p className="mt-2 mb-6 max-w-2xl text-muted">
          Ticks are most active from March to October, but can feed on mild winter days. Choose a place and year to
          see when sightings were reported there.
        </p>
        {years.length > 0 ? <SeasonalChart cities={cities} years={years} defaultYear={defaultYear} /> : <p>Sighting data isn&apos;t available right now.</p>}
      </section>

      <div className="mt-14 grid gap-10 md:grid-cols-2">
        <section id="prevention" aria-labelledby="prevention-h" className="scroll-mt-6">
          <h2 id="prevention-h" className="text-2xl font-bold">Avoiding bites</h2>
          <h3 className="mt-4 mb-2 font-bold">Out walking</h3>
          <List items={PREVENTION.outdoors} />
          <h3 className="mt-5 mb-2 font-bold">Back home</h3>
          <List items={PREVENTION.afterwards} />
        </section>
        <section id="removal" aria-labelledby="removal-h" className="scroll-mt-6">
          <h2 id="removal-h" className="text-2xl font-bold">Removing a tick</h2>
          <ol className="mt-4 list-decimal space-y-1.5 pl-5 marker:font-bold marker:text-fern">
            {PREVENTION.removal.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-5 rounded-md border-l-4 border-plum bg-error-soft p-4">{PREVENTION.symptoms}</p>
        </section>
      </div>

      <section id="species" aria-labelledby="species-h" className="mt-14 scroll-mt-6">
        <h2 id="species-h" className="text-2xl font-bold">Species guide</h2>
        <p className="mt-2 mb-4 max-w-2xl text-muted">
          The species found in the sighting data, most reported first. Many look alike, so if you&apos;re not sure,
          report it as &ldquo;Unknown species&rdquo;.
        </p>
        {seen.map(entry)}
        {others.length > 0 && (
          <details className="mt-4 border-t border-rule pt-4">
            <summary className="cursor-pointer font-bold text-fern">Other ticks found in the UK ({others.length})</summary>
            {others.map(entry)}
          </details>
        )}
      </section>

      <section aria-labelledby="sources-h" className="mt-14 text-sm text-muted">
        <h2 id="sources-h" className="font-bold text-ink">Sources</h2>
        <ul className="mt-2 space-y-1">
          {SOURCES.map((s) => (
            <li key={s.url}>
              <a href={s.url} className="underline underline-offset-4 hover:text-ink">
                {s.name}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3">This page is general information, not medical or veterinary advice.</p>
      </section>
    </main>
  );
}
