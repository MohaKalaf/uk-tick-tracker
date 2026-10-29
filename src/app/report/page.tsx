import type { Metadata } from "next";
import { ReportForm } from "@/components/report/ReportForm";

export const metadata: Metadata = {
  title: "Report a sighting",
  description: "Tell others where you found a tick. Your report appears on the map straight away.",
};

export default async function ReportPage({ searchParams }: PageProps<"/report">) {
  const city = (await searchParams).city;
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-4xl font-bold">Report a tick sighting</h1>
      <p className="mt-3 mb-10 text-lg text-muted">
        Found a tick on yourself, your pet or out walking? Add it to the map so others nearby know to check.
      </p>
      <ReportForm initialCity={typeof city === "string" ? city : undefined} />
    </main>
  );
}
