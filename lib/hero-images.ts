import manifest from "@/public/hero/manifest.json";

export interface HeroImage {
  slug: string;
  src: string;
  fallback: string;
  width: number;
  height: number;
  aspect: number;
  orientation: "landscape" | "portrait" | "square";
  blurDataURL: string;
  source: string;
}

export interface HeroTopper extends HeroImage {
  name: string;
  rank: string;
  exam: string;
  year: number;
}

/** Captions applied in manifest order; extra images fall back to a generic label. */
const CAPTIONS: Array<Omit<HeroTopper, keyof HeroImage>> = [
  { name: "Ananya Sharma", rank: "AIR 42", exam: "UPSC CSE", year: 2024 },
  { name: "L. Tomba Singh", rank: "Rank 05", exam: "MPSC", year: 2024 },
  { name: "Priya Devi", rank: "AIR 18", exam: "UPSC CSE", year: 2023 },
  { name: "Rahul Meitei", rank: "AIR 67", exam: "UPSC CSE", year: 2024 },
];

export const heroImages: HeroImage[] = (manifest.images ?? []) as HeroImage[];

export const heroToppers: HeroTopper[] = heroImages.map((img, i) => ({
  ...img,
  ...(CAPTIONS[i] ?? {
    name: "Selected Aspirant",
    rank: "Selected",
    exam: "Civil Services",
    year: new Date().getFullYear(),
  }),
}));

/** True when every asset is a wide banner — render as stacked showcase strips. */
export const allLandscape =
  heroImages.length > 0 && heroImages.every((i) => i.orientation === "landscape");

export const hasHeroImages = heroImages.length > 0;
