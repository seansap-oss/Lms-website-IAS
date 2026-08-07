"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Youtube,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Sparkles,
  ListChecks,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api-base";

interface QuizQ {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: string;
  topic: string;
}

interface NotesData {
  title: string;
  summary: string;
  keyPoints: string[];
  sections: Array<{ heading: string; content: string }>;
  upscRelevance: string;
  probableQuestions: string[];
}

interface IngestResult {
  success: boolean;
  title?: string;
  wordCount?: number;
  segmentCount?: number;
  transcript?: string;
  vtt?: string;
  notes?: NotesData;
  quiz?: { title: string; sourceSummary: string; questions: QuizQ[] };
  servedBy?: string;
  degraded?: boolean;
  error?: string;
  detail?: string;
}

export default function AdminIngestPage() {
  const [url, setUrl] = React.useState("");
  const [quizCount, setQuizCount] = React.useState(8);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<IngestResult | null>(null);

  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [pdfResult, setPdfResult] = React.useState<IngestResult | null>(null);

  const ingestYoutube = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await apiFetch("/api/ai/youtube", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, generateQuiz: true, quizCount }),
      });
      setResult(await res.json());
    } catch {
      setResult({ success: false, error: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const ingestPdf = async () => {
    if (!pdfFile) return;
    setPdfLoading(true);
    setPdfResult(null);
    try {
      const form = new FormData();
      form.append("file", pdfFile);
      form.append("count", String(quizCount));
      const res = await apiFetch("/api/ai/quiz", { method: "POST", body: form });
      const json = await res.json();
      setPdfResult({ ...json, quiz: json.quiz });
    } catch {
      setPdfResult({ success: false, error: "Network error" });
    } finally {
      setPdfLoading(false);
    }
  };

  const download = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Content Ingestion</h1>
        <p className="text-muted-foreground">
          Auto-generate study notes and Prelims MCQs from YouTube lectures or PDF material
        </p>
      </div>

      <Tabs defaultValue="youtube">
        <TabsList>
          <TabsTrigger value="youtube"><Youtube className="h-4 w-4 mr-2" />YouTube</TabsTrigger>
          <TabsTrigger value="pdf"><FileText className="h-4 w-4 mr-2" />PDF</TabsTrigger>
        </TabsList>

        <TabsContent value="youtube">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">YouTube Lecture Ingestion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>YouTube URL</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <div className="space-y-2 max-w-[180px]">
                <Label>MCQs to generate</Label>
                <Input type="number" min={5} max={20} value={quizCount} onChange={(e) => setQuizCount(Number(e.target.value))} />
              </div>
              <Button onClick={ingestYoutube} disabled={!url.trim() || loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Pulling transcript & generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Ingest & Generate Module</>}
              </Button>

              {result && <ResultPanel result={result} onDownload={download} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pdf">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PDF Quiz Generation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium">{pdfFile ? pdfFile.name : "Click to upload a PDF"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Text-based PDFs only. Scanned PDFs need OCR first.</p>
                </label>
              </div>
              <Button onClick={ingestPdf} disabled={!pdfFile || pdfLoading}>
                {pdfLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Extracting & generating...</> : <><ListChecks className="mr-2 h-4 w-4" />Generate MCQs from PDF</>}
              </Button>

              {pdfResult && <ResultPanel result={pdfResult} onDownload={download} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResultPanel({
  result,
  onDownload,
}: {
  result: IngestResult;
  onDownload: (c: string, f: string) => void;
}) {
  if (!result.success) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">{result.error}</p>
            {result.detail && <p className="text-xs text-muted-foreground mt-1">{result.detail}</p>}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Ingested</Badge>
        {result.wordCount && <Badge variant="outline">{result.wordCount.toLocaleString()} words</Badge>}
        {result.segmentCount && <Badge variant="outline">{result.segmentCount} caption cues</Badge>}
        {result.servedBy && <Badge variant="secondary">{result.servedBy}</Badge>}
        {result.degraded && <Badge variant="warning">Offline engine</Badge>}
      </div>

      {result.title && <p className="font-semibold">{result.title}</p>}

      <div className="flex gap-2 flex-wrap">
        {result.transcript && (
          <Button size="sm" variant="outline" onClick={() => onDownload(result.transcript!, "transcript.txt")}>
            <Download className="h-3.5 w-3.5 mr-1.5" />Transcript
          </Button>
        )}
        {result.vtt && (
          <Button size="sm" variant="outline" onClick={() => onDownload(result.vtt!, "captions.vtt")}>
            <Download className="h-3.5 w-3.5 mr-1.5" />WebVTT
          </Button>
        )}
        {result.notes && (
          <Button size="sm" variant="outline" onClick={() => onDownload(JSON.stringify(result.notes, null, 2), "notes.json")}>
            <Download className="h-3.5 w-3.5 mr-1.5" />Notes JSON
          </Button>
        )}
        {result.quiz && (
          <Button size="sm" variant="outline" onClick={() => onDownload(JSON.stringify(result.quiz, null, 2), "quiz.json")}>
            <Download className="h-3.5 w-3.5 mr-1.5" />Quiz JSON
          </Button>
        )}
      </div>

      {result.notes && (
        <Card className="bg-muted/30">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">Generated Study Notes</p>
            <p className="text-xs text-muted-foreground">{result.notes.summary}</p>
            <div>
              <p className="text-xs font-medium mb-1">Key Points</p>
              <ul className="space-y-1">
                {result.notes.keyPoints?.slice(0, 6).map((k, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {k}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-2.5">
              <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400">UPSC Relevance</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{result.notes.upscRelevance}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result.quiz && (
        <Card className="bg-muted/30">
          <CardContent className="p-4 space-y-3 max-h-96 overflow-y-auto">
            <p className="text-sm font-semibold">{result.quiz.title}</p>
            {result.quiz.questions?.map((q) => (
              <div key={q.id} className="rounded-lg border bg-background p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-medium whitespace-pre-wrap">Q{q.id}. {q.question}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0">{q.difficulty}</Badge>
                </div>
                <ul className="space-y-1 mb-2">
                  {q.options.map((o, oi) => (
                    <li
                      key={oi}
                      className={`text-[11px] px-2 py-1 rounded ${
                        oi === q.correctIndex
                          ? "bg-green-500/15 text-green-700 dark:text-green-400 font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {String.fromCharCode(97 + oi)}) {o}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-muted-foreground border-t pt-2">{q.explanation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
