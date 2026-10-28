import { connection } from "next/server";
import { Suspense } from "react";
import { Explorer } from "@/components/explorer/Explorer";
import { overview } from "@/lib/db/queries";
import { readyContext } from "@/lib/server/context";
import { SPECIES_CHOICES } from "@/lib/report";

export default async function MapPage() {
  await connection();
  let speciesOptions = SPECIES_CHOICES;
  let years: number[] = [];
  let referenceDate: string | null = null;
  try {
    const { db } = await readyContext();
    const data = await overview(db);
    // Offer only species and years that appear in the data
    speciesOptions = data.species.map((s) => s.species);
    years = data.years;
    referenceDate = data.latestSourceDate;
  } catch {
    // The client shows the error when its own requests fail
  }

  return (
    <Suspense>
      <Explorer speciesOptions={speciesOptions} years={years} referenceDate={referenceDate} />
    </Suspense>
  );
}
