"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { feePackages } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-24 bg-background">
      <div className="absolute inset-0 grid-overlay opacity-20" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-1.5 text-sm font-medium text-green-700 dark:text-green-400 mb-4">
            <Sparkles className="h-4 w-4" />
            Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Fee <span className="gradient-text">Structure</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Invest in your future with our comprehensive programs. Easy EMI options available.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {feePackages.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card
                className={`relative h-full flex flex-col ${
                  pkg.popular ? "border-primary shadow-xl shadow-primary/10 scale-[1.02]" : ""
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <h3 className="text-xl font-bold">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-primary">{formatCurrency(pkg.price)}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      or {formatCurrency(pkg.emi_monthly)}/month × {pkg.emi_months} months
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6 flex-1">
                    {pkg.features.map((feature, fi) => (
                      <li key={fi} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/dashboard">
                    <Button className="w-full" variant={pkg.popular ? "default" : "outline"}>
                      Enroll Now
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
