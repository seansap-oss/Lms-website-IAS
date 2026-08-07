"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Quote, Award } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toppers } from "@/lib/mock-data";

export function ToppersSection() {
  return (
    <section id="toppers" className="relative py-24 bg-background">
      <div className="absolute inset-0 grid-overlay opacity-30" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 mb-4">
            <Award className="h-4 w-4" />
            Hall of Fame
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Our <span className="gradient-text">Selected Aspirants</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Meet the dedicated individuals who achieved their dreams through hard work and our structured guidance
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {toppers.map((topper, i) => (
            <motion.div
              key={topper.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="glass-card-hover p-6 h-full flex flex-col">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar
                    src={topper.avatar_url}
                    alt={topper.name}
                    fallback={topper.name.charAt(0)}
                    size="lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{topper.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="success" className="font-bold">{topper.rank}</Badge>
                      <span className="text-sm text-muted-foreground">{topper.exam} {topper.year}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex items-start gap-2 mt-2">
                  <Quote className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground italic leading-relaxed">
                    {topper.quote}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
