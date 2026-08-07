"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Quote, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MOTIVATIONAL_QUOTES, getQuoteOfTheDay } from "@/lib/gamification";

export function QuoteCard() {
  const [quote, setQuote] = React.useState(getQuoteOfTheDay());
  const [key, setKey] = React.useState(0);

  const shuffle = () => {
    const next = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    setQuote(next);
    setKey((k) => k + 1);
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 border-0 text-white">
      <div className="absolute inset-0 grid-overlay opacity-20" />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <Quote className="h-6 w-6 text-white/50" />
          <button
            onClick={shuffle}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="New quote"
          >
            <RefreshCw className="h-3.5 w-3.5 text-white/70" />
          </button>
        </div>
        <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm leading-relaxed italic">&ldquo;{quote.text}&rdquo;</p>
          <p className="text-xs text-white/70 mt-3">— {quote.author}</p>
        </motion.div>
      </CardContent>
    </Card>
  );
}
