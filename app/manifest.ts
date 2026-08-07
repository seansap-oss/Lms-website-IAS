import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ibemhal IAS — Premier Civil Services Coaching",
    short_name: "Ibemhal IAS",
    description:
      "Manipur's #1 IAS coaching institute. UPSC/MPSC courses, AI tutor, answer evaluation and study planner.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#0f172a",
    theme_color: "#1e3a8a",
    categories: ["education", "productivity"],
    lang: "en-IN",
    dir: "ltr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Dashboard", short_name: "Dashboard", url: "/dashboard", description: "Your study dashboard" },
      { name: "AI Tutor", short_name: "AI Tutor", url: "/ai-tutor", description: "24/7 UPSC doubt solver" },
      { name: "Calendar", short_name: "Calendar", url: "/dashboard/calendar", description: "AI study planner" },
    ],
  };
}
