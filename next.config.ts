import type { NextConfig } from "next";

const isStaticExport = process.env.BUILD_TARGET === "capacitor";

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: "export" as const,
        distDir: ".next-static",
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {
        images: {
          remotePatterns: [
            { protocol: "https" as const, hostname: "images.unsplash.com" },
            { protocol: "https" as const, hostname: "**.supabase.co" },
            { protocol: "https" as const, hostname: "**.mux.com" },
          ],
        },
      }),
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
