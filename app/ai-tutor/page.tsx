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
  ArrowLeft,
  MessageCircle,
  FileCheck,
  PenLine,
  Loader2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { apiFetch } from "@/lib/api-base";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  servedBy?: string;
}

interface RubricRow {
  criterion: string;
  score: number;
  maxScore: number;
  remark: string;
}

interface EvaluationData {
  totalScore: number;
  maxScore: number;
  grade: string;
  rubric: RubricRow[];
  strengths: string[];
  improvements: string[];
  modelAnswerOutline: string[];
  examinerRemark: string;
}

const suggested = [
  "How to structure a GS-2 answer on federalism?",
  "Important articles in Indian Polity for Prelims",
  "How do I score above 120 in the Essay paper?",
  "Explain cooperative vs competitive federalism",
];

export default function AITutorPage() {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content:
        "Namaste! I'm the Ibemhal AI Study Buddy. I can answer syllabus doubts, evaluate your Mains answers against the UPSC rubric, and grade full essays out of 125. Pick a tab above or just ask me anything.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [maxMarks, setMaxMarks] = React.useState(10);
  const [wordLimit, setWordLimit] = React.useState(150);
  const [evaluating, setEvaluating] = React.useState(false);
  const [evaluation, setEvaluation] = React.useState<EvaluationData | null>(null);
  const [evalServedBy, setEvalServedBy] = React.useState<string>("");

  const [essayTopic, setEssayTopic] = React.useState("");
  const [essayBody, setEssayBody] = React.useState("");

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function callAgent(task: string, payload: Record<string, unknown>) {
    const res = await apiFetch("/api/ai/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task, payload }),
    });
    return res.json();
  }

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);

    try {
      const json = await callAgent("chat", { message: userMsg.content });
      setMessages((m) => [
        ...m,
        {
          id: `${Date.now()}-a`,
          role: "assistant",
          content: typeof json.data === "string" ? json.data : JSON.stringify(json.data, null, 2),
          servedBy: json.servedBy,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: `${Date.now()}-e`, role: "assistant", content: "Connection issue. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleEvaluate = async (isEssay: boolean) => {
    setEvaluating(true);
    setEvaluation(null);
    try {
      const json = isEssay
        ? await callAgent("evaluate_essay", { topic: essayTopic, essay: essayBody })
        : await callAgent("evaluate_answer", { question, answer, maxMarks, wordLimit });

      if (json.data && typeof json.data === "object") {
        setEvaluation(json.data as EvaluationData);
        setEvalServedBy(json.servedBy ?? "");
      }
    } finally {
      setEvaluating(false);
    }
  };

  const renderMarkdown = (text: string) =>
    text.split("\n").map((line, i) => {
      const bold = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
      if (!line.trim()) return <div key={i} className="h-2" />;
      return <p key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: bold }} />;
    });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-sm">Ibemhal AI</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs gap-1">
            <Zap className="h-3 w-3 text-amber-500" />
            5-Tier Failover
          </Badge>
        </div>
      </nav>

      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="chat"><MessageCircle className="h-4 w-4 mr-2" />Doubt Solver</TabsTrigger>
            <TabsTrigger value="answer"><FileCheck className="h-4 w-4 mr-2" />Answer Evaluator</TabsTrigger>
            <TabsTrigger value="essay"><PenLine className="h-4 w-4 mr-2" />Essay Grader</TabsTrigger>
          </TabsList>

          <TabsContent value="chat">
            <Card className="flex flex-col h-[calc(100vh-260px)] min-h-[420px]">
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {m.role === "assistant" && (
                      <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted rounded-tl-sm"
                    }`}>
                      <div className="space-y-1">{renderMarkdown(m.content)}</div>
                      {m.servedBy && (
                        <p className="text-[10px] text-muted-foreground/70 mt-2 pt-2 border-t border-border/50">
                          served by {m.servedBy}
                        </p>
                      )}
                    </div>
                    {m.role === "user" && (
                      <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </motion.div>
                ))}
                {sending && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Routing through provider chain...
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </CardContent>

              {messages.length <= 1 && (
                <div className="px-4 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggested.map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="text-left p-2.5 rounded-lg border hover:bg-muted/50 transition-colors text-xs text-muted-foreground"
                    >
                      <Lightbulb className="h-3 w-3 inline mr-1.5 text-amber-500" />{q}
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t p-3 flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask about the syllabus, current affairs, or answer writing..."
                  disabled={sending}
                />
                <Button onClick={handleSend} disabled={sending} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="answer">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label>Question</Label>
                    <Textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="e.g., Examine the role of the GST Council in strengthening cooperative federalism."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Max Marks</Label>
                      <Input type="number" value={maxMarks} onChange={(e) => setMaxMarks(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Word Limit</Label>
                      <Input type="number" value={wordLimit} onChange={(e) => setWordLimit(Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Your Answer</Label>
                    <Textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Paste your handwritten answer transcription here..."
                      rows={12}
                    />
                    <p className="text-xs text-muted-foreground">
                      {answer.trim().split(/\s+/).filter(Boolean).length} words
                    </p>
                  </div>
                  <Button onClick={() => handleEvaluate(false)} disabled={!answer.trim() || evaluating} className="w-full">
                    {evaluating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Evaluating...</> : <><FileCheck className="mr-2 h-4 w-4" />Evaluate Answer</>}
                  </Button>
                </CardContent>
              </Card>

              <EvaluationPanel evaluation={evaluation} servedBy={evalServedBy} loading={evaluating} />
            </div>
          </TabsContent>

          <TabsContent value="essay">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label>Essay Topic</Label>
                    <Input
                      value={essayTopic}
                      onChange={(e) => setEssayTopic(e.target.value)}
                      placeholder="e.g., Ships in harbour are safe, but that is not what ships are built for."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Your Essay</Label>
                    <Textarea
                      value={essayBody}
                      onChange={(e) => setEssayBody(e.target.value)}
                      placeholder="Paste your full essay (1000-1200 words)..."
                      rows={18}
                    />
                    <p className="text-xs text-muted-foreground">
                      {essayBody.trim().split(/\s+/).filter(Boolean).length} / 1200 words
                    </p>
                  </div>
                  <Button onClick={() => handleEvaluate(true)} disabled={!essayBody.trim() || evaluating} className="w-full">
                    {evaluating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Grading...</> : <><PenLine className="mr-2 h-4 w-4" />Grade Essay (out of 125)</>}
                  </Button>
                </CardContent>
              </Card>

              <EvaluationPanel evaluation={evaluation} servedBy={evalServedBy} loading={evaluating} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EvaluationPanel({
  evaluation,
  servedBy,
  loading,
}: {
  evaluation: EvaluationData | null;
  servedBy: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-sm text-muted-foreground">Examiner is reviewing your submission...</p>
        </CardContent>
      </Card>
    );
  }

  if (!evaluation) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center">
          <FileCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Your rubric-based evaluation will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pct = Math.round((evaluation.totalScore / evaluation.maxScore) * 100);

  return (
    <Card className="overflow-hidden">
      <div className={`h-1.5 ${pct >= 45 ? "bg-green-500" : pct >= 35 ? "bg-amber-500" : "bg-red-500"}`} />
      <CardContent className="p-5 space-y-5 max-h-[calc(100vh-260px)] overflow-y-auto">
        <div className="text-center">
          <p className="text-4xl font-bold">
            {evaluation.totalScore}
            <span className="text-lg text-muted-foreground">/{evaluation.maxScore}</span>
          </p>
          <Badge className="mt-2" variant={pct >= 45 ? "success" : pct >= 35 ? "warning" : "destructive"}>
            {evaluation.grade}
          </Badge>
          {servedBy && <p className="text-[10px] text-muted-foreground mt-2">Graded by {servedBy}</p>}
        </div>

        <div className="space-y-3">
          {evaluation.rubric?.map((r) => (
            <div key={r.criterion}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">{r.criterion}</span>
                <span className="text-muted-foreground">{r.score}/{r.maxScore}</span>
              </div>
              <Progress value={(r.score / r.maxScore) * 100} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground mt-1">{r.remark}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-sm font-semibold mb-2 text-green-600 dark:text-green-400">Strengths</p>
          <ul className="space-y-1">
            {evaluation.strengths?.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-2"><span className="text-green-500">✓</span>{s}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold mb-2 text-amber-600 dark:text-amber-400">Improvements</p>
          <ul className="space-y-1">
            {evaluation.improvements?.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-2"><span className="text-amber-500">→</span>{s}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold mb-2">Model Answer Outline</p>
          <ol className="space-y-1">
            {evaluation.modelAnswerOutline?.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground">{i + 1}. {s}</li>
            ))}
          </ol>
        </div>

        <div className="rounded-lg bg-muted/60 p-3">
          <p className="text-[11px] font-semibold mb-1">Examiner Remark</p>
          <p className="text-[11px] text-muted-foreground">{evaluation.examinerRemark}</p>
        </div>
      </CardContent>
    </Card>
  );
}
