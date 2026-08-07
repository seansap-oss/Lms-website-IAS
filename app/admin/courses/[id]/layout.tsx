import { courses } from "@/lib/mock-data";

export function generateStaticParams() {
  return courses.map((c) => ({ id: c.id }));
}

export default function CourseIdLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
