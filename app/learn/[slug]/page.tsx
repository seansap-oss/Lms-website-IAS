"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Play,
  Lock,
  FileText,
  Download,
  MessageCircle,
  Bot,
  CheckCircle2,
  Clock,
  List,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { sampleModules, sampleLessons } from "@/lib/mock-data";
import { formatDuration } from "@/lib/utils";
import Link from "next/link";

export default function CoursePlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [expandedModules, setExpandedModules] = React.useState<string[]>([sampleModules[0].id]);
  const [activeLesson, setActiveLesson] = React.useState(sampleLessons[0]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const totalDuration = sampleLessons.reduce((acc, l) => acc + l.duration_seconds, 0);
  const completedLessons = sampleLessons.slice(0, 3);
  const progressPercent = Math.round((completedLessons.length / sampleLessons.length) * 100);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Link>
            <div className="h-5 w-px bg-border" />
            <h1 className="font-semibold text-sm sm:text-base truncate">UPSC Foundation Course 2025</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{progressPercent}% Complete</Badge>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            className="hidden lg:block border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-muted/20"
          >
            <div className="p-4">
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Course Progress</span>
                  <span className="font-medium">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} />
              </div>
              <div className="space-y-2">
                {sampleModules.map((module) => (
                  <div key={module.id} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <h4 className="font-medium text-sm">{module.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sampleLessons.filter((l) => l.module_id === module.id).length} lessons
                        </p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          expandedModules.includes(module.id) ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {expandedModules.includes(module.id) && (
                      <div className="border-t bg-background">
                        {sampleLessons
                          .filter((l) => l.module_id === module.id)
                          .map((lesson) => {
                            const isCompleted = completedLessons.some((c) => c.id === lesson.id);
                            const isActive = activeLesson.id === lesson.id;
                            return (
                              <button
                                key={lesson.id}
                                onClick={() => setActiveLesson(lesson)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors ${
                                  isActive ? "bg-primary/5 border-l-2 border-primary" : "border-l-2 border-transparent"
                                }`}
                              >
                                <div className="shrink-0">
                                  {isCompleted ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : !lesson.is_free_preview ? (
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Play className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <span className={`flex-1 truncate ${isActive ? "font-medium" : ""}`}>
                                  {lesson.title}
                                </span>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {formatDuration(lesson.duration_seconds)}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.aside>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden mb-6 flex items-center justify-center relative">
              <div className="absolute inset-0 grid-overlay opacity-20" />
              <div className="relative text-center">
                <div className="h-20 w-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border border-white/20">
                  <Play className="h-8 w-8 text-white ml-1" />
                </div>
                <p className="text-white text-lg font-medium">{activeLesson.title}</p>
                <p className="text-gray-400 text-sm mt-1">Mux HLS Player • {formatDuration(activeLesson.duration_seconds)}</p>
              </div>
            </div>

            <Tabs defaultValue="notes" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="notes">
                  <FileText className="h-4 w-4 mr-2" />
                  Notes
                </TabsTrigger>
                <TabsTrigger value="resources">
                  <Download className="h-4 w-4 mr-2" />
                  Resources
                </TabsTrigger>
                <TabsTrigger value="ai-tutor">
                  <Bot className="h-4 w-4 mr-2" />
                  AI Doubt Solver
                </TabsTrigger>
                <TabsTrigger value="qa">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Q&A
                </TabsTrigger>
              </TabsList>

              <TabsContent value="notes">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-3">Lesson Notes</h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-muted-foreground leading-relaxed">
                        This lesson covers the fundamental concepts of the UPSC exam pattern and syllabus structure.
                        Understanding the exam framework is crucial for effective preparation planning.
                      </p>
                      <ul className="mt-4 space-y-2 text-muted-foreground">
                        <li>• UPSC CSE consists of three stages: Prelims, Mains, and Interview</li>
                        <li>• Prelims is qualifying in nature with two papers: GS and CSAT</li>
                        <li>• Mains has 9 papers including 4 GS papers, 2 optional, 1 essay, and 2 qualifying</li>
                        <li>• Total marks for ranking: Mains (1750) + Interview (275) = 2025</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="resources">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-4">Downloadable Resources</h3>
                    <div className="space-y-3">
                      {[
                        { name: "UPSC Syllabus Complete PDF", size: "2.4 MB" },
                        { name: "NCERT Booklist - Priority Order", size: "890 KB" },
                        { name: "Preparation Strategy Guide", size: "1.8 MB" },
                        { name: "Monthly Study Planner Template", size: "450 KB" },
                      ].map((resource, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <div>
                              <p className="text-sm font-medium">{resource.name}</p>
                              <p className="text-xs text-muted-foreground">{resource.size}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ai-tutor">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">AI Doubt Solver</h3>
                        <p className="text-xs text-muted-foreground">Ask about this lesson</p>
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 mb-4 min-h-[120px] flex items-center justify-center">
                      <p className="text-sm text-muted-foreground text-center">
                        Type your question about &quot;{activeLesson.title}&quot;
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ask anything..."
                        className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <Button>Send</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="qa">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-4">Questions & Answers</h3>
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">No questions yet. Be the first to ask!</p>
                      <Button variant="outline" className="mt-4">Ask a Question</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button variant="outline" size="sm">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Lesson {activeLesson.order_index} of {sampleLessons.filter((l) => l.module_id === activeLesson.module_id).length}
              </span>
              <Button size="sm">
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
