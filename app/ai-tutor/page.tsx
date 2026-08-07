"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Send,
  Bot,
  User,
  GraduationCap,
  Sparkles,
  Lightbulb,
  BookOpen,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  "How to structure a GS-2 answer on federalism?",
  "What are the important articles in Indian Polity for Prelims?",
  "Explain the difference between BPL and APL classification.",
  "How to prepare for CSAT along with GS?",
];

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Namaste! I'm Ibemhal AI Study Buddy, your 24/7 UPSC preparation assistant. I can help you with:\n\n• **Mains Answer Evaluation** - Paste your answer for detailed feedback\n• **Syllabus Queries** - Any topic from the UPSC syllabus\n• **Current Affairs** - Daily news analysis and practice\n• **Preparation Strategy** - Personalized study plans\n\nHow can I help you today?",
    timestamp: new Date(),
  },
];

export default function AITutorPage() {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateAIResponse(input),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-sm">Ibemhal AI</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Powered by AI
          </Badge>
        </div>
      </nav>

      <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted rounded-tl-sm"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content.split("\n").map((line, i) => {
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return <p key={i} className="font-semibold">{line.replace(/\*\*/g, "")}</p>;
                    }
                    if (line.startsWith("•")) {
                      return <p key={i} className="ml-2">{line}</p>;
                    }
                    if (line.startsWith("-")) {
                      return <p key={i} className="ml-2">{line}</p>;
                    }
                    return <p key={i}>{line}</p>;
                  })}
                </div>
              </div>
              {message.role === "user" && (
                <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
              )}
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 && (
          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground mb-3 text-center">Suggested questions:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestedQuestion(q)}
                  className="text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-sm text-muted-foreground"
                >
                  <Lightbulb className="h-3.5 w-3.5 inline mr-2 text-amber-500" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50 p-4">
          <div className="max-w-5xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about UPSC syllabus, answer writing, or current affairs..."
              className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button onClick={handleSend} size="icon" className="h-12 w-12 rounded-xl">
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateAIResponse(question: string): string {
  const lowerQ = question.toLowerCase();

  if (lowerQ.includes("federalism") || lowerQ.includes("gs-2") || lowerQ.includes("answer")) {
    return `Great question! Here's a proven structure for a GS-2 answer on Federalism:\n\n**Introduction (20 words)**\nDefine federalism citing Article 1 of the Indian Constitution - "India as a Union of States"\n\n**Body (120 words)**\n• Constitutional provisions: 7th Schedule, Article 246\n• Cooperative federalism examples: GST Council, NITI Aayog\n• Competitive federalism: State rankings\n• Challenges: Governor's role, Article 356 misuse\n\n**Critical Analysis (40 words)**\n• Recent Supreme Court observations on state autonomy\n• Finance Commission recommendations\n• Need for balanced power sharing\n\n**Conclusion (20 words)**\nWay forward with balanced federalism strengthening democracy and inclusive development.\n\n**Tip:** Always include a recent committee recommendation or Supreme Court judgment!`;
  }

  if (lowerQ.includes("polity") || lowerQ.includes("article") || lowerQ.includes("prelims")) {
    return `Here are the most important articles for Prelims:\n\n**Fundamental Rights (Article 12-35)**\n• Art 14 - Equality before law\n• Art 19 - Freedom of speech\n• Art 21 - Right to life\n• Art 32 - Constitutional remedies\n\n**DPSPs (Article 36-51)**\n• Art 39A - Equal justice\n• Art 44 - Uniform civil code\n• Art 48A - Environment protection\n\n**Constitutional Bodies**\n• Art 324 - Election Commission\n• Art 316 - UPSC\n• Art 280 - Finance Commission\n\n**Emergency Provisions**\n• Art 352 - National emergency\n• Art 356 - President's rule\n• Art 360 - Financial emergency\n\nFocus on landmark judgments related to each article!`;
  }

  return `I appreciate your question! Based on UPSC patterns, here's my analysis:\n\nThis is an important topic for both Prelims and Mains preparation. Let me break it down:\n\n**Key Concepts:**\n• Understand the fundamental principles involved\n• Connect with current affairs and government schemes\n• Note relevant constitutional provisions/articles\n\n**For Mains:**\nStructure your answer with introduction, body (multi-dimensional analysis), critical view, and conclusion.\n\n**For Prelims:**\nFocus on facts, years, articles, and landmark judgments.\n\nWould you like me to evaluate a practice answer on this topic?`;
}
