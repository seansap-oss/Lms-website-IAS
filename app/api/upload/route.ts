import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const contentType = formData.get("contentType") as string;
    const lessonId = formData.get("lessonId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];
    const allowedAudioTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"];

    if (contentType === "video" && !allowedVideoTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid video format. Supported: MP4, WebM, MOV" },
        { status: 400 }
      );
    }

    if (contentType === "audio" && !allowedAudioTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid audio format. Supported: MP3, WAV, OGG" },
        { status: 400 }
      );
    }

    // In production, this would:
    // 1. Upload to Supabase Storage or Mux directly
    // 2. For video: Trigger Mux HLS transcoding
    // 3. For audio: Convert to HLS format
    // 4. Trigger transcription pipeline automatically

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: `${fileSizeMB} MB`,
      contentType: file.type,
      uploadUrl: `/uploads/${lessonId}/${file.name}`,
      message: "File uploaded successfully. Transcription queued.",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
