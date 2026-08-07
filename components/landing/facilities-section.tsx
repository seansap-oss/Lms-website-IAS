"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { facilities } from "@/lib/mock-data";

export function FacilitiesSection() {
  return (
    <section id="campus" className="relative py-24 bg-gradient-to-b from-muted/30 to-background">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 px-4 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-400 mb-4">
            <MapPin className="h-4 w-4" />
            Our Centers
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Campus & <span className="gradient-text">Facilities</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            State-of-the-art infrastructure across multiple centers in Imphal to support your preparation
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((facility, i) => (
            <motion.div
              key={facility.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="glass-card-hover overflow-hidden group h-full">
                <div className="relative aspect-[3/2] overflow-hidden">
                  <img
                    src={facility.image_url}
                    alt={facility.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <Badge className="bg-white/90 text-gray-900 hover:bg-white/90">
                      {facility.location}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-lg mb-2">{facility.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {facility.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
