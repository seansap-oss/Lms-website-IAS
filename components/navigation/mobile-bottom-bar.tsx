"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, LayoutDashboard, CalendarDays, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticSelection } from "@/lib/native";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (p: string) => p === "/dashboard" || p.startsWith("/learn"),
  },
  {
    href: "/dashboard/calendar",
    label: "Calendar",
    icon: CalendarDays,
    match: (p: string) => p.startsWith("/dashboard/calendar"),
  },
  { href: "/ai-tutor", label: "AI Tutor", icon: Bot, match: (p: string) => p.startsWith("/ai-tutor") },
  { href: "/profile", label: "Profile", icon: User, match: (p: string) => p.startsWith("/profile") },
];

const HIDDEN_PREFIXES = ["/admin", "/offline"];

export function MobileBottomBar() {
  const pathname = usePathname() || "/";

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      role="navigation"
      aria-label="Primary mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-[80] bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 pb-safe"
    >
      <ul className="flex items-stretch justify-around h-14">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                onClick={hapticSelection}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative h-14 w-full flex flex-col items-center justify-center gap-0.5 transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-nav-indicator"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                  />
                )}
                <Icon className={cn("h-[18px] w-[18px] transition-transform", active && "scale-110")} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileBottomBarSpacer() {
  const pathname = usePathname() || "/";
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  return <div aria-hidden className="md:hidden h-14 pb-safe" />;
}
