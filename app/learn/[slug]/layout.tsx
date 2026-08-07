import { courses } from "@/lib/mock-data";

export function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

export default function LearnSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
