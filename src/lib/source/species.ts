// UK tick species the app knows about. Matching on the Latin name first, because
// common names vary ("marsh tick" and "ornate dog tick" are the same animal).

export interface Species {
  name: string;
  latinName: string;
  aliases?: string[];
}

export const UNKNOWN_SPECIES = "Unknown species";

export const SPECIES: Species[] = [
  { name: "Sheep tick", latinName: "Ixodes ricinus", aliases: ["Castor bean tick", "Deer tick"] },
  { name: "Hedgehog tick", latinName: "Ixodes hexagonus" },
  { name: "Fox/badger tick", latinName: "Ixodes canisuga", aliases: ["Fox tick", "Badger tick", "Dog tick"] },
  { name: "Southern rodent tick", latinName: "Ixodes acuminatus" },
  { name: "Tree-hole tick", latinName: "Ixodes arboricola", aliases: ["Tree hole tick", "Bird tick"] },
  { name: "Seabird tick", latinName: "Ixodes uriae" },
  { name: "Passerine tick", latinName: "Ixodes frontalis" },
  // Names follow UKHSA's tick species profiles. "Marsh tick" is Ixodes apronophorus there and in
  // Elanco's data, though Dermacentor reticulatus is sometimes called that too.
  { name: "Marsh tick", latinName: "Ixodes apronophorus" },
  { name: "Ornate cow tick", latinName: "Dermacentor reticulatus", aliases: ["Ornate dog tick", "Meadow tick"] },
  { name: "Red sheep tick", latinName: "Haemaphysalis punctata" },
  { name: "Brown dog tick", latinName: "Rhipicephalus sanguineus", aliases: ["Kennel tick"] },
  { name: "Pigeon tick", latinName: "Argas reflexus" },
];

const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

const BY_LATIN = new Map(SPECIES.map((s) => [key(s.latinName), s]));
const BY_NAME = new Map<string, Species>();
for (const s of SPECIES) for (const n of [s.name, ...(s.aliases ?? [])]) BY_NAME.set(key(n), s);

export function findSpecies(name: string | null, latinName: string | null): Species | undefined {
  return (latinName && BY_LATIN.get(key(latinName))) || (name ? BY_NAME.get(key(name)) : undefined);
}
