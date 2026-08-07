"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Award, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BADGES, type GamificationState } from "@/lib/gamification";

export function BadgesCard({ state }: { state: GamificationState }) {
  const unlocked = BADGES.filter((b) => b.requirement(state));
  const locked = BADGES.filter((b) => !b.requirement(state));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            Achievements
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {unlocked.length}/{BADGES.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {unlocked.map((badge, i) => (
            <motion.div
              key={badge.id}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}
              className="group relative aspect-square rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/40 flex items-center justify-center text-xl cursor-help"
              title={`${badge.name} — ${badge.description}`}
            >
              {badge.icon}
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-40 rounded-lg bg-popover border p-2 shadow-lg">
                <p className="text-xs font-semibold">{badge.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{badge.description}</p>
              </div>
            </motion.div>
          ))}
          {locked.map((badge) => (
            <div
              key={badge.id}
              className="group relative aspect-square rounded-xl bg-muted/50 border border-dashed flex items-center justify-center cursor-help"
              title={`Locked — ${badge.description}`}
            >
              <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-40 rounded-lg bg-popover border p-2 shadow-lg">
                <p className="text-xs font-semibold">{badge.icon} {badge.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
