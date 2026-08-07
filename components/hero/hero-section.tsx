"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Rocket,
  Bot,
  Sparkles,
  Trophy,
  Users,
  BookOpen,
  Star,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  heroToppers,
  allLandscape,
  hasHeroImages,
  type HeroTopper,
} from "@/lib/hero-images";
import {
  UpiCheckoutModal,
  type CheckoutCourse,
} from "@/components/checkout/upi-checkout-modal";
import { courses } from "@/lib/mock-data";

const STATS = [
  { icon: Trophy, value: "500+", label: "Selections" },
  { icon: Users, value: "10,000+", label: "Aspirants" },
  { icon: BookOpen, value: "100+", label: "Courses" },
  { icon: Star, value: "4.9/5", label: "Rating" },
];

export function HeroSection() {
  const [checkout, setCheckout] = React.useState<CheckoutCourse | null>(null);

  const openCourses = () => {
    const flagship = courses[0];
    if (flagship) {
      setCheckout({ id: flagship.id, title: flagship.title, price: flagship.price });
    } else {
      document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#FAF8F6] dark:bg-slate-950">
      {/* Ultra-light texture + tint */}
      <div className="absolute inset-0 bg-slate-50/50 dark:bg-transparent" />
      <div className="absolute inset-0 grid-overlay opacity-[0.35] dark:opacity-20" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-200/25 blur-3xl dark:bg-blue-500/10" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-indigo-200/25 blur-3xl dark:bg-indigo-500/10" />

      <div className="relative mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 lg:px-8 lg:pt-32 lg:pb-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-10 lg:gap-8 xl:gap-12">
          {/* ── LEFT 30% ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3 flex flex-col justify-center"
          >
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-blue-200/70 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-700 shadow-sm backdrop-blur dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300">
              <Sparkles className="h-3 w-3" />
              Ibemhal IAS · Low-Fee Institute
            </span>

            <h1 className="mt-5 text-[2rem] font-bold leading-[1.12] tracking-tight text-slate-900 sm:text-4xl lg:text-[2.6rem] dark:text-white text-balance">
              From Foundation to{" "}
              <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-blue-300">
                IAS/MPSC
              </span>
              .
              <br />
              We Guide, You Achieve.
            </h1>

            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
              <strong className="font-semibold text-slate-800 dark:text-slate-200">
                100+ comprehensive courses
              </strong>{" "}
              built by experienced faculty, paired with{" "}
              <strong className="font-semibold text-slate-800 dark:text-slate-200">
                24/7 AI-driven answer feedback
              </strong>{" "}
              — so every aspirant in Manipur gets top-tier preparation at a fee that never
              stands in the way.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button
                size="lg"
                onClick={openCourses}
                className="h-12 bg-slate-900 px-6 text-[15px] font-semibold text-white shadow-lg shadow-slate-900/15 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <Rocket className="mr-2 h-4 w-4" />
                Explore Courses
              </Button>
              <Link href="/ai-tutor">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full border-slate-300 bg-white/70 px-6 text-[15px] font-semibold text-slate-800 backdrop-blur hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
                >
                  <Bot className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Try 24/7 AI Tutor
                </Button>
              </Link>
            </div>

            <dl className="mt-9 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-slate-200/80 pt-6 dark:border-slate-800 sm:grid-cols-4 lg:grid-cols-2">
              {STATS.map((s) => (
                <div key={s.label}>
                  <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
                    <s.icon className="h-3 w-3" />
                    {s.label}
                  </dt>
                  <dd className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>

          {/* ── RIGHT 70% ────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12 }}
            className="lg:col-span-7"
          >
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Our Selected Aspirants
              </h2>
              <Link
                href="#toppers"
                className="group inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 dark:text-blue-400"
              >
                View all
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {!hasHeroImages ? (
              <EmptyState />
            ) : allLandscape ? (
              <BannerShowcase toppers={heroToppers} />
            ) : (
              <PortraitGrid toppers={heroToppers} />
            )}
          </motion.div>
        </div>
      </div>

      <UpiCheckoutModal
        open={checkout !== null}
        onClose={() => setCheckout(null)}
        course={checkout}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Wide banner assets — full width, object-contain, never stretched.   */
/* ------------------------------------------------------------------ */
function BannerShowcase({ toppers }: { toppers: HeroTopper[] }) {
  return (
    <div className="space-y-4">
      {toppers.map((t, i) => (
        <motion.figure
          key={t.slug}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 + i * 0.1 }}
          className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <div
            className="relative w-full bg-slate-100 dark:bg-slate-800"
            style={{ aspectRatio: `${t.width} / ${t.height}` }}
          >
            <Image
              src={t.src}
              alt={`Ibemhal IAS selected aspirants — results panel ${i + 1}`}
              fill
              sizes="(max-width: 1024px) 100vw, 70vw"
              placeholder="blur"
              blurDataURL={t.blurDataURL}
              className="object-contain"
              priority={i === 0}
            />
          </div>
          <figcaption className="flex items-center gap-2 border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Ibemhal IAS Hall of Fame
            </span>
            <span className="ml-auto rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-950/50 dark:text-green-400">
              Verified Selections
            </span>
          </figcaption>
        </motion.figure>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Portrait/square assets — 1 / 2 / 4 column responsive grid.          */
/* ------------------------------------------------------------------ */
function PortraitGrid({ toppers }: { toppers: HeroTopper[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {toppers.map((t, i) => (
        <motion.figure
          key={t.slug}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 + i * 0.08 }}
          className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="relative aspect-[3/4] w-full bg-slate-100 dark:bg-slate-800">
            <Image
              src={t.src}
              alt={`${t.name} — ${t.rank}, ${t.exam} ${t.year}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 18vw"
              placeholder="blur"
              blurDataURL={t.blurDataURL}
              className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
              priority={i < 2}
            />
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-slate-900/85 via-slate-900/35 to-transparent" />
            <span className="absolute left-2.5 top-2.5 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              {t.rank}
            </span>
            <figcaption className="absolute inset-x-0 bottom-0 p-3">
              <p className="truncate text-sm font-bold leading-tight text-white">{t.name}</p>
              <p className="text-[11px] text-white/80">
                {t.exam} · {t.year}
              </p>
            </figcaption>
          </div>
        </motion.figure>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function EmptyState() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl",
            "border-2 border-dashed border-slate-300 bg-white/60 dark:border-slate-700 dark:bg-slate-900/40"
          )}
        >
          <Users className="h-6 w-6 text-slate-400" />
          <p className="px-2 text-center text-[10px] leading-tight text-slate-500">
            Add photo {i + 1} to
            <br />
            <code className="text-[9px]">public/Hero</code>
          </p>
        </div>
      ))}
    </div>
  );
}
