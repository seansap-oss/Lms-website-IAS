import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mediaUrl, mediaType, lessonId } = body;

    if (!mediaUrl) {
      return NextResponse.json(
        { error: "Media URL is required" },
        { status: 400 }
      );
    }

    // In production, this would:
    // 1. Download the media file from the provided URL
    // 2. Send it to OpenAI Whisper API for transcription
    // 3. Generate WebVTT captions from the transcription
    // 4. Upload VTT file to Supabase Storage
    // 5. Update the lesson record with transcript_text and vtt_caption_url

    // Simulated transcription pipeline
    const simulatedTranscript = await simulateTranscription(mediaType);
    const vttCaptions = generateWebVTT(simulatedTranscript);

    return NextResponse.json({
      success: true,
      transcript: simulatedTranscript.text,
      vttCaptions,
      vttUrl: `/captions/${lessonId || "new"}.vtt`,
      message: "Transcription completed successfully",
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}

async function simulateTranscription(mediaType: string): Promise<{ text: string; segments: Array<{ start: number; end: number; text: string }> }> {
  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const segments = [
    { start: 0, text: "Welcome to this lesson. In today's session, we will cover the fundamental concepts." },
    { start: 8, text: "Let me begin by explaining the key terminology and why it matters for your preparation." },
    { start: 18, text: "The first concept you need to understand is the basic framework that governs this subject." },
    { start: 30, text: "Many aspirants make the mistake of memorizing without understanding the underlying principles." },
    { start: 42, text: "Instead, focus on building a strong conceptual foundation first." },
    { start: 52, text: "Let me give you a practical example to illustrate this point." },
    { start: 62, text: "Consider the case of policy implementation at the grassroots level." },
    { start: 74, text: "This is where theoretical knowledge meets practical governance challenges." },
    { start: 86, text: "For the Mains examination, you need to analyze such scenarios from multiple dimensions." },
    { start: 98, text: "Social, economic, political, and ethical perspectives all need to be considered." },
    { start: 110, text: "Let me now walk you through a model answer structure for this type of question." },
    { start: 122, text: "Remember, the introduction should be crisp and directly address the question asked." },
    { start: 134, text: "The body should present balanced arguments with relevant examples and data." },
    { start: 148, text: "Finally, the conclusion should offer a constructive way forward." },
    { start: 160, text: "Thank you for watching. Practice writing answers on this topic and review the transcript for key points." },
  ];

  // Add timestamps
  const segmentsWithTimestamps = segments.map((seg, i) => ({
    start: seg.start,
    end: seg.start + (segments[i + 1]?.start || seg.start + 10) - seg.start - 0.5,
    text: seg.text,
  }));

  return {
    text: segments.map((s) => s.text).join("\n\n"),
    segments: segmentsWithTimestamps,
  };
}

function generateWebVTT(segments: { segments: Array<{ start: number; end: number; text: string }> }): string {
  let vtt = "WEBVTT\n\n";

  segments.segments.forEach((seg, i) => {
    const startTime = formatTimestamp(seg.start);
    const endTime = formatTimestamp(seg.end);
    vtt += `${i + 1}\n`;
    vtt += `${startTime} --> ${endTime}\n`;
    vtt += `${seg.text}\n\n`;
  });

  return vtt;
}

function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}
