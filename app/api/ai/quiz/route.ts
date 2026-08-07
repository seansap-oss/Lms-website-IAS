import { NextRequest, NextResponse } from "next/server";
import { extractPdfText } from "@/lib/ai/pdf";
import { fetchYoutubeTranscript } from "@/lib/ai/youtube";
import { runWithFallback, extractJson } from "@/lib/ai/router";
import { SYSTEM_PROMPTS, buildUserPrompt } from "@/lib/ai/agents";
import { offlineQuiz } from "@/lib/ai/offline-fallback";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const started = Date.now();

  try {
    const contentType = request.headers.get("content-type") || "";
    let sourceText = "";
    let topic = "General Studies";
    let count = 8;
    let sourceType = "text";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file") as File | null;
      count = Number(form.get("count") ?? 8);
      topic = String(form.get("topic") ?? "General Studies");

      if (!file) {
        return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
      }
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: "Only PDF files are supported on this endpoint" },
          { status: 400 }
        );
      }

      const buffer = await file.arrayBuffer();
      const parsed = extractPdfText(buffer);
      sourceText = parsed.text;
      sourceType = "pdf";
      if (topic === "General Studies") topic = file.name.replace(/\.pdf$/i, "");

      if (!sourceText || sourceText.split(/\s+/).length < 40) {
        return NextResponse.json(
          {
            success: false,
            error: "Could not extract readable text from this PDF",
            detail:
              "The PDF appears to be scanned or image-based. Run it through OCR first, or paste the text directly.",
            pages: parsed.pages,
            extractionMethod: parsed.method,
          },
          { status: 422 }
        );
      }
    } else {
      const body = await request.json();
      count = Number(body.count ?? 8);
      topic = String(body.topic ?? "General Studies");

      if (body.youtubeUrl) {
        const yt = await fetchYoutubeTranscript(String(body.youtubeUrl));
        if (!yt.transcript) {
          return NextResponse.json(
            { success: false, error: "No captions available for this video" },
            { status: 422 }
          );
        }
        sourceText = yt.transcript;
        sourceType = "youtube";
        if (topic === "General Studies") topic = yt.title;
      } else {
        sourceText = String(body.sourceText ?? body.text ?? "");
        sourceType = "text";
      }
    }

    if (!sourceText.trim()) {
      return NextResponse.json({ error: "No source text to work with" }, { status: 400 });
    }

    const run = await runWithFallback(
      SYSTEM_PROMPTS.generate_quiz,
      buildUserPrompt("generate_quiz", { count, sourceType, topic, sourceText }),
      { jsonMode: true }
    );

    const quiz = run.degraded
      ? offlineQuiz(sourceText, count, topic)
      : extractJson(run.text) ?? offlineQuiz(sourceText, count, topic);

    return NextResponse.json({
      success: true,
      sourceType,
      topic,
      wordCount: sourceText.split(/\s+/).length,
      quiz,
      servedBy: run.degraded ? "Ibemhal Deterministic Engine" : run.servedBy,
      servedByTier: run.degraded ? 6 : run.servedByTier,
      degraded: run.degraded,
      trace: run.trace,
      elapsedMs: Date.now() - started,
    });
  } catch (error) {
    console.error("[ai/quiz] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Quiz generation failed",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}
