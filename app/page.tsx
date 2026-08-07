import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { ToppersSection } from "@/components/landing/toppers-section";
import { CoursesSection } from "@/components/landing/courses-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { FacilitiesSection } from "@/components/landing/facilities-section";
import { AITutorSection } from "@/components/landing/ai-tutor-section";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <ToppersSection />
      <CoursesSection />
      <PricingSection />
      <FacilitiesSection />
      <AITutorSection />
      <Footer />
    </main>
  );
}
