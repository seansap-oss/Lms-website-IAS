"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, X, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLongPress } from "@/hooks/use-long-press";
import { LocalAdminAuthModal } from "@/components/admin/local-admin-auth-modal";
import { LONG_PRESS_MS, hasLocalAdminSession } from "@/lib/local-admin";

const navLinks = [
  { href: "#courses", label: "Courses" },
  { href: "#toppers", label: "Toppers" },
  { href: "#pricing", label: "Pricing" },
  { href: "#campus", label: "Campus" },
  { href: "#ai-tutor", label: "AI Tutor" },
];

export function Navbar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Stealth: hold the logo for 5 seconds to reveal the local institute console.
  const { handlers, progress, isPressing } = useLongPress({
    durationMs: LONG_PRESS_MS,
    onLongPress: () => {
      if (hasLocalAdminSession()) router.push("/local-admin");
      else setAuthOpen(true);
    },
    onClick: () => router.push("/"),
  });

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-lg border-b border-gray-200/50 dark:border-gray-700/50"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div
          {...handlers}
          role="link"
          tabIndex={0}
          aria-label="Ibemhal IAS home"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") router.push("/");
          }}
          className="relative flex items-center gap-2 group cursor-pointer select-none no-tap-highlight"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg group-hover:shadow-blue-500/25 transition-shadow overflow-hidden">
            <GraduationCap className="h-6 w-6 text-white relative z-10" />
            {isPressing && (
              <span
                className="absolute inset-x-0 bottom-0 bg-amber-400/70 transition-[height] duration-100 ease-linear"
                style={{ height: `${progress}%` }}
                aria-hidden
              />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight">Ibemhal</span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium -mt-0.5">IAS ACADEMY</span>
          </div>
          {isPressing && progress > 35 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -bottom-7 left-0 whitespace-nowrap rounded-full bg-amber-500/95 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg"
            >
              {progress >= 99 ? "Unlocking…" : `Hold ${Math.ceil((100 - progress) / 20)}s…`}
            </motion.span>
          )}
        </div>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">Student Login</Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              Get Started
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 px-4 py-4 space-y-1"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">Student Login</Button>
            </Link>
            <Link href="/dashboard">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600">Get Started</Button>
            </Link>
          </div>
        </motion.div>
      )}

      <LocalAdminAuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </motion.header>
  );
}
