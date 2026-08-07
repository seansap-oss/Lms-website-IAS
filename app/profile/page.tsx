"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Settings,
  Bell,
  Download,
  Shield,
  LogOut,
  ChevronRight,
  Flame,
  Sparkles,
  BookOpen,
  Smartphone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DEFAULT_STATE, getLevel, getNextLevel, getLevelProgress } from "@/lib/gamification";
import { isStandalonePwa } from "@/lib/native";

const MENU = [
  { icon: Settings, label: "Account Settings", href: "#" },
  { icon: Bell, label: "Notifications", href: "#" },
  { icon: Download, label: "Downloaded Lessons", href: "#" },
  { icon: Shield, label: "Privacy & Security", href: "#" },
];

export default function ProfilePage() {
  const s = DEFAULT_STATE;
  const level = getLevel(s.xp);
  const next = getNextLevel(s.xp);
  const progress = getLevelProgress(s.xp);
  const [installed, setInstalled] = React.useState(false);

  React.useEffect(() => setInstalled(isStandalonePwa()), []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b pt-safe">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-semibold">Profile</h1>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className={`h-20 bg-gradient-to-r ${level.color}`} />
            <CardContent className="p-5 -mt-10">
              <Avatar fallback="S" size="xl" className="ring-4 ring-background mb-3" />
              <h2 className="text-xl font-bold">Student</h2>
              <p className="text-sm text-muted-foreground">student@ibemhal.ias</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge className={`bg-gradient-to-r ${level.color} text-white border-0`}>
                  {level.icon} {level.name}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  {s.xp.toLocaleString()} XP
                </Badge>
              </div>
              {next && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Next: {next.name}</span>
                    <span className="font-medium">{(next.minXp - s.xp).toLocaleString()} XP</span>
                  </div>
                  <Progress value={progress} indicatorClassName={`bg-gradient-to-r ${level.color}`} />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Flame, value: s.streakDays, label: "Streak", color: "text-orange-500" },
            { icon: BookOpen, value: s.lessonsCompleted, label: "Lessons", color: "text-green-500" },
            { icon: Sparkles, value: s.quizzesCompleted, label: "Quizzes", color: "text-purple-500" },
          ].map((st) => (
            <Card key={st.label}>
              <CardContent className="p-4 text-center">
                <st.icon className={`h-5 w-5 mx-auto mb-1.5 ${st.color}`} />
                <p className="text-xl font-bold">{st.value}</p>
                <p className="text-[11px] text-muted-foreground">{st.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0 divide-y">
            {MENU.map((m) => (
              <Link
                key={m.label}
                href={m.href}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors"
              >
                <m.icon className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm">{m.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className={installed ? "border-green-500/30" : "border-dashed"}>
          <CardContent className="p-4 flex items-center gap-3">
            <Smartphone className={`h-5 w-5 ${installed ? "text-green-500" : "text-muted-foreground"}`} />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {installed ? "Running as installed app" : "Install Ibemhal IAS"}
              </p>
              <p className="text-xs text-muted-foreground">
                {installed
                  ? "You're in standalone mode — offline lessons enabled."
                  : "Tap Share → Add to Home Screen for offline access."}
              </p>
            </div>
            {installed && <Badge variant="success" className="text-[10px]">PWA</Badge>}
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full text-destructive hover:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
