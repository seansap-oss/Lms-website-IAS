import { NextRequest, NextResponse } from "next/server";
import { addDays, addMinutes, formatISO, parseISO, set } from "date-fns";
import { runWithFallback, extractJson } from "@/lib/ai/router";
import type { CalendarEvent, EventCategory, StudyPlanRequest } from "@/types/calendar";

export const maxDuration = 60;

const SYSTEM = `You are the Ibemhal IAS academic planner — a senior UPSC mentor who builds realistic, exam-calibrated study timetables.

Rules:
- Respect the student's stated daily study hours exactly. Never over-schedule.
- Always start the day with a 1-hour current affairs slot (newspaper/PIB).
- Interleave subjects; never place the same subject on consecutive days more than twice.
- Apply spaced repetition: revise a topic 3 days, 10 days and 30 days after first study.
- Schedule one full-length mock test every 7 days, followed by a 1-hour analysis slot.
- Schedule answer-writing practice at least 4 times a week.
- Include one lighter day per week to prevent burnout.
- Use 24-hour times between 05:00 and 23:00.

Return STRICT JSON ONLY:
{
  "planTitle": "string",
  "strategy": "string (3-4 sentences on the approach taken)",
  "events": [
    {
      "title": "string",
      "category": "study" | "revision" | "mock-test" | "live-class" | "answer-writing" | "current-affairs" | "break",
      "subject": "string",
      "dayOffset": number (0 = start date),
      "startHour": number (5-23),
      "durationHours": number (0.5-4),
      "description": "string"
    }
  ]
}`;

interface AiEvent {
  title: string;
  category: EventCategory;
  subject?: string;
  dayOffset: number;
  startHour: number;
  durationHours: number;
  description?: string;
}

interface AiPlan {
  planTitle: string;
  strategy: string;
  events: AiEvent[];
}

export async function POST(request: NextRequest) {
  const started = Date.now();

  try {
    const body = (await request.json()) as StudyPlanRequest;
    const {
      targetExam = "UPSC Prelims",
      targetYear = new Date().getFullYear() + 1,
      dailyHours = 6,
      topics = [],
      optionalSubject,
      startDate = formatISO(new Date(), { representation: "date" }),
      weeks = 4,
    } = body;

    if (!topics.length) {
      return NextResponse.json(
        { success: false, error: "Select at least one syllabus topic" },
        { status: 400 }
      );
    }

    const days = Math.min(weeks * 7, 120);

    const user = [
      `TARGET EXAM: ${targetExam} ${targetYear}`,
      `DAILY STUDY HOURS: ${dailyHours}`,
      `PLAN LENGTH: ${days} days (${weeks} weeks)`,
      `START DATE: ${startDate}`,
      optionalSubject ? `OPTIONAL SUBJECT: ${optionalSubject}` : "",
      `SYLLABUS TOPICS TO COVER: ${topics.join(", ")}`,
      "",
      `Produce a complete day-by-day schedule for all ${days} days.`,
    ]
      .filter(Boolean)
      .join("\n");

    const run = await runWithFallback(SYSTEM, user, { jsonMode: true });

    const plan: AiPlan = run.degraded
      ? deterministicPlan(targetExam, targetYear, dailyHours, topics, days, optionalSubject)
      : extractJson<AiPlan>(run.text) ??
        deterministicPlan(targetExam, targetYear, dailyHours, topics, days, optionalSubject);

    const base = parseISO(`${startDate}T00:00:00`);
    const events: CalendarEvent[] = (plan.events ?? []).map((e, i) => {
      const day = addDays(base, Math.max(0, Math.floor(e.dayOffset ?? 0)));
      const hour = Math.min(23, Math.max(5, Math.floor(e.startHour ?? 9)));
      const minutes = Math.round((e.startHour ?? 9) % 1 * 60);
      const start = set(day, { hours: hour, minutes, seconds: 0, milliseconds: 0 });
      const end = addMinutes(start, Math.round((e.durationHours ?? 1) * 60));

      return {
        id: `ai-${Date.now()}-${i}`,
        title: e.title,
        description: e.description,
        category: (e.category ?? "study") as EventCategory,
        subject: e.subject,
        start: formatISO(start),
        end: formatISO(end),
        completed: false,
        aiGenerated: true,
      };
    });

    return NextResponse.json({
      success: true,
      planTitle: plan.planTitle,
      strategy: plan.strategy,
      eventCount: events.length,
      events,
      servedBy: run.degraded ? "Ibemhal Deterministic Planner" : run.servedBy,
      servedByTier: run.degraded ? 6 : run.servedByTier,
      degraded: run.degraded,
      trace: run.trace,
      elapsedMs: Date.now() - started,
    });
  } catch (error) {
    console.error("[ai/calendar] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Study plan generation failed",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}

function deterministicPlan(
  exam: string,
  year: number,
  dailyHours: number,
  topics: string[],
  days: number,
  optionalSubject?: string
): AiPlan {
  const events: AiEvent[] = [];
  const pool = optionalSubject ? [...topics, optionalSubject] : topics;
  const studied: Array<{ topic: string; day: number }> = [];

  for (let d = 0; d < days; d++) {
    const dow = d % 7;
    const isMockDay = d > 0 && d % 7 === 2;
    const isLightDay = dow === 6;

    events.push({
      title: "The Hindu / PIB — Current Affairs",
      category: "current-affairs",
      subject: "Current Affairs",
      dayOffset: d,
      startHour: 6,
      durationHours: 1,
      description: "Editorial analysis, note-making, and syllabus linkage.",
    });

    if (isMockDay) {
      events.push({
        title: `${exam} Mock Test #${Math.ceil(d / 7)}`,
        category: "mock-test",
        subject: exam,
        dayOffset: d,
        startHour: 9,
        durationHours: 2,
        description: "Full-length timed paper under exam conditions.",
      });
      events.push({
        title: "Mock Analysis & Error Log",
        category: "revision",
        subject: exam,
        dayOffset: d,
        startHour: 11.5,
        durationHours: 1,
        description: "Classify errors: conceptual, silly, or guess-based.",
      });
      continue;
    }

    const blocks = Math.max(1, Math.floor((isLightDay ? dailyHours * 0.6 : dailyHours) / 2));
    for (let b = 0; b < blocks; b++) {
      const topic = pool[(d * 2 + b) % pool.length];
      studied.push({ topic, day: d });
      events.push({
        title: `${topic} — Core Study Block ${b + 1}`,
        category: "study",
        subject: topic,
        dayOffset: d,
        startHour: 9 + b * 3,
        durationHours: 2,
        description: `Read standard source, make short notes, map to ${exam} syllabus.`,
      });
    }

    for (const gap of [3, 10, 30]) {
      const prior = studied.find((s) => s.day === d - gap);
      if (prior) {
        events.push({
          title: `Spaced Revision (D+${gap}): ${prior.topic}`,
          category: "revision",
          subject: prior.topic,
          dayOffset: d,
          startHour: 19,
          durationHours: 0.5,
          description: `Active recall of ${prior.topic} studied ${gap} days ago.`,
        });
        break;
      }
    }

    if ([0, 1, 3, 4].includes(dow)) {
      events.push({
        title: "Answer Writing Practice (2 questions)",
        category: "answer-writing",
        subject: "Mains",
        dayOffset: d,
        startHour: 16,
        durationHours: 1,
        description: "Write within word limit, then self-evaluate against the rubric.",
      });
    }

    if (isLightDay) {
      events.push({
        title: "Rest & Recovery",
        category: "break",
        dayOffset: d,
        startHour: 17,
        durationHours: 1.5,
        description: "Walk, exercise, or light reading. Protects long-term retention.",
      });
    }
  }

  return {
    planTitle: `${exam} ${year} — ${Math.round(days / 7)}-Week Study Plan`,
    strategy: `Deterministic planner: ${dailyHours}h/day across ${pool.length} subjects with interleaved scheduling. Spaced repetition applied at D+3, D+10 and D+30. Weekly full-length mock on day 3 of each cycle followed by error-log analysis. Answer writing four times per week; Sunday reserved as a light recovery day. Configure an AI provider key for a fully personalised, semantically-sequenced plan.`,
    events,
  };
}
