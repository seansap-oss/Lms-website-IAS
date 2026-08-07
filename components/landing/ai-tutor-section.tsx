"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Bot, MessageCircle, BookOpen, FileText, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const features = [
  {
    icon: FileText,
    title: "Mains Answer Evaluator",
    description: "Get instant AI-powered evaluation of your Mains answers with detailed feedback on structure, content, and presentation.",
  },
  {
    icon: BookOpen,
    title: "UPSC Syllabus Querying",
    description: "Ask any question about the UPSC syllabus, exam pattern, or preparation strategy and get accurate, contextual answers.",
  },
  {
    icon: MessageCircle,
    title: "Daily Current Affairs QA",
    description: "Practice daily current affairs questions with explanations linked to UPSC relevance and previous year patterns.",
  },
];

export function AITutorSection() {
  return (
    <section id="ai-tutor" className="relative py-24 bg-gradient-to-b from-background to-blue-950/20">
      <div className="absolute inset-0 grid-overlay opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 mb-4">
            <Bot className="h-4 w-4" />
            24/7 AI Assistance
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Meet Your <span className="gradient-text">AI Study Buddy</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powered by advanced AI, available round the clock to help you with UPSC preparation, answer evaluation, and doubt clearing
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <Card className="glass-card p-5 flex gap-4 items-start">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
            <div className="pt-4">
              <Link href="/ai-tutor">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Try AI Tutor Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <Card className="glass-card p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold">Ibemhal AI Tutor</h4>
                  <Badge variant="success" className="text-xs">Online 24/7</Badge>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm">
                    How should I structure my GS-2 answer on federalism?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm">
                    <p className="font-medium mb-2">Here&apos;s a proven structure:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Introduction: Define federalism with relevant article</li>
                      <li>Body: Constitutional provisions + examples</li>
                      <li>Analysis: Current challenges & Supreme Court views</li>
                      <li>Conclusion: Way forward with balanced approach</li>
                    </ol>
                    <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">Tip: Always include a recent committee recommendation!</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm">
                    Can you evaluate my answer on this topic?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm">
                    <p>Sure! Paste your answer and I&apos;ll evaluate it on:</p>
                    <ul className="mt-2 space-y-1">
                      <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Content accuracy</li>
                      <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Structure & flow</li>
                      <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Multi-dimensional analysis</li>
                      <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Word limit adherence</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
