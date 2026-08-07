export interface YoutubeTranscript {
  videoId: string;
  title: string;
  transcript: string;
  segments: Array<{ start: number; duration: number; text: string }>;
  source: "timedtext" | "unavailable";
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/live\/)([\w-]{11})/,
    /^([\w-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.trim().match(p);
    if (m) return m[1];
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;#39;/g, "'")
    .replace(/&amp;quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

async function fetchWithTimeout(url: string, ms = 9000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseTimedTextXml(xml: string) {
  const segments: Array<{ start: number; duration: number; text: string }> = [];
  const re = /<text start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const text = decodeEntities(m[3].replace(/<[^>]+>/g, "")).trim();
    if (text) {
      segments.push({
        start: parseFloat(m[1]),
        duration: parseFloat(m[2] || "0"),
        text,
      });
    }
  }
  return segments;
}

export async function fetchYoutubeTranscript(url: string): Promise<YoutubeTranscript> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL — could not extract an 11-character video ID.");
  }

  let title = `YouTube Video ${videoId}`;

  try {
    const oembed = await fetchWithTimeout(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (oembed.ok) {
      const meta = (await oembed.json()) as { title?: string };
      if (meta.title) title = meta.title;
    }
  } catch {
    // title stays as fallback
  }

  const langs = ["en", "en-US", "en-GB", "hi"];
  for (const lang of langs) {
    for (const extra of ["", "&kind=asr"]) {
      try {
        const res = await fetchWithTimeout(
          `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}${extra}`
        );
        if (!res.ok) continue;
        const xml = await res.text();
        if (!xml.includes("<text")) continue;
        const segments = parseTimedTextXml(xml);
        if (segments.length) {
          return {
            videoId,
            title,
            transcript: segments.map((s) => s.text).join(" "),
            segments,
            source: "timedtext",
          };
        }
      } catch {
        continue;
      }
    }
  }

  return {
    videoId,
    title,
    transcript: "",
    segments: [],
    source: "unavailable",
  };
}

export function segmentsToVtt(
  segments: Array<{ start: number; duration: number; text: string }>
): string {
  const fmt = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  };

  let vtt = "WEBVTT\n\n";
  segments.forEach((seg, i) => {
    const end = seg.start + (seg.duration || 3);
    vtt += `${i + 1}\n${fmt(seg.start)} --> ${fmt(end)}\n${seg.text}\n\n`;
  });
  return vtt;
}
