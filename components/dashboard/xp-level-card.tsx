"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getLevel, getNextLevel, getLevelProgress, LEVELS } from "@/lib/gamification";

export function XpLevelCard({ xp }: { xp: number }) {
  const level = getLevel(xp);
  const next = getNextLevel(xp);
  const progress = getLevelProgress(xp);

  return (
    <Card className="overflow-hidden">
      <div className={`h-1.5 w-full bg-gradient-to-r ${level.color}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={`h-12 w-12 rounded-xl bg-gradient-to-br ${level.color} flex items-center justify-center text-2xl shadow-lg`}
            >
              {level.icon}
            </motion.div>
            <div>
              <p className="font-semibold leading-tight">{level.name}</p>
              <p className="text-xs text-muted-foreground">Level {level.index + 1} of {LEVELS.length}</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            {xp.toLocaleString()} XP
          </Badge>
        </div>

        {next ? (
          <>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Next: {next.icon} {next.name}</span>
              <span className="font-medium">{(next.minXp - xp).toLocaleString()} XP to go</span>
            </div>
            <Progress value={progress} indicatorClassName={`bg-gradient-to-r ${level.color}`} />
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <TrendingUp className="h-4 w-4" />
            Maximum level reached — you are IAS Select!
          </div>
        )}

        <div className="mt-4 grid grid-cols-5 gap-1">
          {LEVELS.map((l) => (
            <div
              key={l.index}
              className={`h-1.5 rounded-full transition-colors ${
                xp >= l.minXp ? `bg-gradient-to-r ${l.color}` : "bg-muted"
              }`}
              title={`${l.name} — ${l.minXp} XP`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
