import { NextRequest, NextResponse } from "next/server";
import { runWithFallback, extractJson } from "@/lib/ai/router";
import { getProviderStatus } from "@/lib/ai/providers";
import {
  SYSTEM_PROMPTS,
  JSON_TASKS,
  buildUserPrompt,
  type AgentTask,
} from "@/lib/ai/agents";
import {
  offlineEvaluation,
  offlineQuiz,
  offlineNotes,
  offlineChat,
} from "@/lib/ai/offline-fallback";

export const maxDuration = 60;

const VALID_TASKS: AgentTask[] = [
  "chat",
  "evaluate_answer",
  "evaluate_essay",
  "generate_quiz",
  "ingest_youtube",
  "generate_notes",
];

export async function GET() {
  const providers = getProviderStatus();
  const configured = providers.filter((p) => p.configured);

  return NextResponse.json({
    route: "/api/ai/agent",
    healthy: true,
    tiersConfigured: configured.length,
    tiersTotal: providers.length,
    activePrimary: configured[0]?.name ?? "none (deterministic offline engine active)",
    offlineEngineReady: true,
    providers,
    supportedTasks: VALID_TASKS,
  });
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = await request.json();
    const task: AgentTask = VALID_TASKS.includes(body.task) ? body.task : "chat";
    const payload = (body.payload ?? body) as Record<string, unknown>;

    const system = SYSTEM_PROMPTS[task];
    const user = buildUserPrompt(task, payload);
    const jsonMode = JSON_TASKS.includes(task);

    if (!user.trim()) {
      return NextResponse.json(
        { error: "Empty prompt payload" },
        { status: 400 }
      );
    }

    const result = await runWithFallback(system, user, { jsonMode });

    if (result.degraded) {
      const offline = buildOffline(task, payload);
      return NextResponse.json({
        success: true,
        task,
        servedBy: "Ibemhal Deterministic Engine (offline fallback)",
        servedByTier: 6,
        degraded: true,
        data: offline,
        raw: typeof offline === "string" ? offline : JSON.stringify(offline),
        trace: result.trace,
        elapsedMs: Date.now() - startedAt,
      });
    }

    const data = jsonMode ? extractJson(result.text) ?? result.text : result.text;

    return NextResponse.json({
      success: true,
      task,
      servedBy: result.servedBy,
      servedByTier: result.servedByTier,
      degraded: false,
      data,
      raw: result.text,
      trace: result.trace,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[ai/agent] fatal:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Agent pipeline failure",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}

function buildOffline(task: AgentTask, payload: Record<string, unknown>) {
  switch (task) {
    case "evaluate_answer":
      return offlineEvaluation(
        String(payload.answer ?? ""),
        Number(payload.maxMarks ?? 10),
        Number(payload.wordLimit ?? 150),
        String(payload.question ?? "")
      );
    case "evaluate_essay":
      return offlineEvaluation(
        String(payload.essay ?? payload.answer ?? ""),
        125,
        1200,
        String(payload.topic ?? ""),
        true
      );
    case "generate_quiz":
      return offlineQuiz(
        String(payload.sourceText ?? ""),
        Number(payload.count ?? 8),
        String(payload.topic ?? "General Studies")
      );
    case "ingest_youtube":
    case "generate_notes":
      return offlineNotes(
        String(payload.transcript ?? payload.sourceText ?? ""),
        String(payload.videoTitle ?? payload.title ?? "Study Module")
      );
    case "chat":
    default:
      return offlineChat(String(payload.message ?? payload.prompt ?? ""));
  }
}
