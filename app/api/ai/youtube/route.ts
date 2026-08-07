import { NextRequest, NextResponse } from "next/server";
import { fetchYoutubeTranscript, segmentsToVtt } from "@/lib/ai/youtube";
import { runWithFallback, extractJson } from "@/lib/ai/router";
import { SYSTEM_PROMPTS, buildUserPrompt } from "@/lib/ai/agents";
import { offlineNotes, offlineQuiz } from "@/lib/ai/offline-fallback";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const started = Date.now();

  try {
    const { url, generateQuiz = true, quizCount = 8 } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 });
    }

    const yt = await fetchYoutubeTranscript(url);

    if (yt.source === "unavailable" || !yt.transcript) {
      return NextResponse.json(
        {
          success: false,
          error: "No captions available for this video",
          detail:
            "This video has captions disabled. Download the audio and use the /api/transcribe Whisper pipeline instead.",
          videoId: yt.videoId,
          title: yt.title,
        },
        { status: 422 }
      );
    }

    const notesRun = await runWithFallback(
      SYSTEM_PROMPTS.ingest_youtube,
      buildUserPrompt("ingest_youtube", {
        url,
        videoTitle: yt.title,
        transcript: yt.transcript,
      }),
      { jsonMode: true }
    );

    const notes = notesRun.degraded
      ? offlineNotes(yt.transcript, yt.title)
      : extractJson(notesRun.text) ?? offlineNotes(yt.transcript, yt.title);

    let quiz = null;
    let quizServedBy: string | null = null;

    if (generateQuiz) {
      const quizRun = await runWithFallback(
        SYSTEM_PROMPTS.generate_quiz,
        buildUserPrompt("generate_quiz", {
          count: quizCount,
          sourceType: "youtube_transcript",
          topic: yt.title,
          sourceText: yt.transcript,
        }),
        { jsonMode: true }
      );

      quiz = quizRun.degraded
        ? offlineQuiz(yt.transcript, quizCount, yt.title)
        : extractJson(quizRun.text) ?? offlineQuiz(yt.transcript, quizCount, yt.title);
      quizServedBy = quizRun.degraded
        ? "Ibemhal Deterministic Engine"
        : quizRun.servedBy;
    }

    return NextResponse.json({
      success: true,
      videoId: yt.videoId,
      title: yt.title,
      wordCount: yt.transcript.split(/\s+/).length,
      segmentCount: yt.segments.length,
      durationSeconds: Math.round(
        yt.segments.length
          ? yt.segments[yt.segments.length - 1].start +
              (yt.segments[yt.segments.length - 1].duration || 0)
          : 0
      ),
      transcript: yt.transcript,
      vtt: segmentsToVtt(yt.segments),
      notes,
      quiz,
      servedBy: notesRun.degraded ? "Ibemhal Deterministic Engine" : notesRun.servedBy,
      quizServedBy,
      degraded: notesRun.degraded,
      trace: notesRun.trace,
      elapsedMs: Date.now() - started,
    });
  } catch (error) {
    console.error("[ai/youtube] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "YouTube ingestion failed",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}
