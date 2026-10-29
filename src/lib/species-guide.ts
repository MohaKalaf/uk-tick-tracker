// Field-guide notes for the Learn page, keyed by the species names used in the data.
// Kept to well-established basics; see the sources on the page.

export interface GuideEntry {
  look: string;
  hosts: string;
  where: string;
  risk: string;
}

export const GUIDE: Record<string, GuideEntry> = {
  "Sheep tick": {
    look: "Dark reddish-brown with a small black shield behind the head. Unfed adults are about 3 mm; nymphs are the size of a poppy seed.",
    hosts: "Almost anything: deer, sheep, small mammals, birds, dogs and people.",
    where: "The UK's most widespread tick: woodland, heath, moorland, rough grassland and urban parks.",
    risk: "The main UK carrier of the bacteria behind Lyme disease, and of tick-borne encephalitis virus.",
  },
  "Hedgehog tick": {
    look: "Similar to the sheep tick, but its shield is six-sided, which gives it its Latin name.",
    hosts: "Hedgehogs, and an important parasite of pet cats and dogs.",
    where: "Wherever hedgehogs live, including gardens and towns.",
    risk: "Common on pets, and reports of it biting people are increasing.",
  },
  "Fox/badger tick": {
    look: "Small and reddish-brown, with no markings on its shield.",
    hosts: "Badgers, foxes and pet dogs.",
    where: "Widespread across the UK. It lives mostly in dens rather than out in vegetation.",
    risk: "Mainly a pest of dogs and wildlife.",
  },
  "Southern rodent tick": {
    look: "A small Ixodes tick; hard to tell from its relatives without a microscope.",
    hosts: "Small rodents such as mice and voles.",
    where: "Rodent burrows, mainly in southern England, including Cornwall, Devon and the Isles of Scilly.",
    risk: "Rarely meets people or pets because it stays in burrows.",
  },
  "Tree-hole tick": {
    look: "A small Ixodes tick, usually found engorged on birds.",
    hosts: "Birds that nest in tree holes, such as great and blue tits.",
    where: "Tree holes and nest boxes, mostly in England, with a few records in Wales and Scotland.",
    risk: "Very rarely meets people or pets.",
  },
  "Passerine tick": {
    look: "A small Ixodes tick, usually seen attached to a bird's head.",
    hosts: "Songbirds, picked up while feeding on the ground under roosts.",
    where: "England, with newer records in Wales.",
    risk: "Sometimes bites people, and is linked to a bleeding disorder in birds.",
  },
  "Seabird tick": {
    look: "An Ixodes tick specialised for seabirds, rarely seen away from their colonies.",
    hosts: "Colonial seabirds such as puffins and guillemots.",
    where: "Seabird colonies on cliffs and islands.",
    risk: "Can bite people who visit or work at colonies.",
  },
  "Marsh tick": {
    look: "A small Ixodes tick that is hard to tell from its relatives without a microscope.",
    hosts: "Water voles (and, in the past, coypu).",
    where: "Wetlands. UK records come from Kent, the Norfolk Broads and Wicken Fen.",
    risk: "A rare wetland tick that seldom meets people or pets.",
  },
  "Ornate cow tick": {
    look: "The easiest UK tick to recognise: its shield has a pale, enamel-like pattern. Also called the ornate dog tick.",
    hosts: "Sheep and cattle, and occasionally dogs and people.",
    where: "Mostly Wales and south-west England, and recently established in Essex.",
    risk: "Can carry canine babesiosis, a serious blood disease in dogs, which has caused a UK outbreak.",
  },
  "Red sheep tick": {
    look: "Reddish-brown, with no eyes and a short, broad mouth.",
    hosts: "Sheep, cattle and other livestock, and birds.",
    where: "Coastal grassland, mainly in southern and eastern England and Wales.",
    risk: "Mostly a livestock tick. It can carry blood parasites of cattle and sheep.",
  },
  "Brown dog tick": {
    look: "Plain reddish-brown with a six-sided base to its mouthparts.",
    hosts: "Dogs, almost exclusively.",
    where: "Not established outdoors in the UK. It arrives on dogs that have travelled and can infest homes and kennels.",
    risk: "Carries serious dog diseases from abroad. Check dogs carefully after travel.",
  },
  "Pigeon tick": {
    look: "A soft tick: flat, oval and leathery, with no hard shield.",
    hosts: "Pigeons.",
    where: "Pigeon roosts in buildings.",
    risk: "Can bite people living near abandoned roosts.",
  },
};

export const PREVENTION = {
  outdoors: [
    "Keep to clear paths and avoid brushing through long grass and bracken.",
    "Wear long trousers tucked into socks, in a light colour so ticks are easy to spot.",
    "Use an insect repellent; products containing DEET work best on skin and clothes.",
  ],
  afterwards: [
    "Check yourself, children and pets when you get home. Children are often bitten around the hairline and scalp.",
    "Brush off clothing and pets before going indoors.",
    "Ask your vet about tick treatments for dogs and cats, especially in spring and autumn.",
  ],
  removal: [
    "Use a tick-removal tool or fine-tipped tweezers. Don't use eyebrow tweezers, which can squash the tick.",
    "Grip the tick as close to the skin as you can.",
    "Pull upwards slowly and steadily, without twisting hard or crushing it.",
    "Clean the bite with antiseptic, or soap and water.",
  ],
  symptoms:
    "Contact your GP or NHS 111 if you feel unwell with flu-like symptoms, or notice a round or oval rash, within three months of a bite. Tell them you may have been bitten.",
};

export const SOURCES = [
  { name: "NHS 111 Wales: Lyme disease", url: "https://111.wales.nhs.uk/lymedisease/" },
  { name: "Lyme Disease Action: About ticks", url: "https://www.lymediseaseaction.org.uk/about-ticks/" },
  { name: "ESCCAP UK & Ireland: Tick identification", url: "https://www.esccapuk.org.uk/page/Tick+ID/48/" },
  { name: "UKHSA: Tick species profiles", url: "https://www.gov.uk/guidance/tick-species-profiles" },
  { name: "UKHSA: Tick Surveillance Scheme", url: "https://www.gov.uk/guidance/tick-surveillance-scheme" },
];
