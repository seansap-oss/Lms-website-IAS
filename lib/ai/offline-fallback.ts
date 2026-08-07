import type { EvaluationResult, QuizResult, NotesResult, QuizQuestion } from "./agents";

const STRUCTURE_MARKERS = [
  "introduction", "intro", "body", "conclusion", "way forward",
  "firstly", "secondly", "however", "therefore", "thus", "moreover",
];

const SUBSTANTIATION_MARKERS = [
  "article", "act", "committee", "commission", "report", "supreme court",
  "niti aayog", "economic survey", "%", "crore", "scheme", "mission", "yojana",
];

const ANALYSIS_MARKERS = [
  "social", "economic", "political", "ethical", "environmental",
  "challenge", "critique", "however", "on the other hand", "balanced",
  "implication", "consequence", "reform",
];

function countMatches(text: string, markers: string[]): number {
  const lower = text.toLowerCase();
  return markers.filter((m) => lower.includes(m)).length;
}

function band(pct: number): string {
  if (pct >= 60) return "Exceptional";
  if (pct >= 45) return "Very Good";
  if (pct >= 35) return "Good";
  if (pct >= 25) return "Average";
  return "Below Par";
}

export function offlineEvaluation(
  answer: string,
  maxMarks: number,
  wordLimit: number,
  question: string,
  isEssay = false
): EvaluationResult {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const paragraphs = answer.split(/\n\s*\n/).filter((p) => p.trim()).length;

  const structureHits = countMatches(answer, STRUCTURE_MARKERS);
  const substHits = countMatches(answer, SUBSTANTIATION_MARKERS);
  const analysisHits = countMatches(answer, ANALYSIS_MARKERS);

  const lengthRatio = wordCount / Math.max(wordLimit, 1);
  const lengthScore = lengthRatio >= 0.75 && lengthRatio <= 1.2 ? 1 : lengthRatio < 0.4 ? 0.35 : 0.7;

  const per = maxMarks / 5;
  const clamp = (v: number) => Math.max(0, Math.min(per, Math.round(v * 10) / 10));

  const rubric = [
    {
      criterion: isEssay ? "Topic Interpretation & Thesis" : "Structure & Presentation",
      score: clamp(per * Math.min(1, (structureHits / 5) * 0.6 + (paragraphs >= 3 ? 0.4 : 0.15))),
      maxScore: Math.round(per * 10) / 10,
      remark:
        paragraphs >= 3
          ? "Clear segmentation into introduction, body and conclusion is visible."
          : "Answer reads as a single block. Break it into intro / body / conclusion.",
    },
    {
      criterion: isEssay ? "Structure & Coherence" : "Content Accuracy & Coverage",
      score: clamp(per * (0.4 + lengthScore * 0.5)),
      maxScore: Math.round(per * 10) / 10,
      remark:
        lengthRatio < 0.4
          ? `Only ${wordCount} words against a ${wordLimit}-word limit — significant under-coverage.`
          : `Coverage at ${wordCount}/${wordLimit} words is within acceptable range.`,
    },
    {
      criterion: isEssay ? "Breadth of Illustration" : "Analytical Depth & Multi-dimensionality",
      score: clamp(per * Math.min(1, analysisHits / 6)),
      maxScore: Math.round(per * 10) / 10,
      remark:
        analysisHits >= 4
          ? "Multiple dimensions (social / economic / political) are addressed."
          : "Add explicit social, economic, political and ethical dimensions.",
    },
    {
      criterion: "Substantiation (Data, Reports, Judgments)",
      score: clamp(per * Math.min(1, substHits / 5)),
      maxScore: Math.round(per * 10) / 10,
      remark:
        substHits >= 3
          ? "Good use of constitutional / institutional references."
          : "Weak substantiation. Cite Articles, committee reports, schemes or SC judgments.",
    },
    {
      criterion: "Language, Flow & Conclusion",
      score: clamp(per * (0.5 + (structureHits > 3 ? 0.35 : 0.15))),
      maxScore: Math.round(per * 10) / 10,
      remark: "Maintain crisp sentences; end with a forward-looking, solution-oriented conclusion.",
    },
  ];

  const totalScore = Math.round(rubric.reduce((a, r) => a + r.score, 0) * 10) / 10;
  const pct = Math.round((totalScore / maxMarks) * 100);

  return {
    totalScore,
    maxScore: maxMarks,
    grade: `${band(pct)} (${pct}%)`,
    rubric,
    strengths: [
      paragraphs >= 3 ? "Well-segmented answer structure" : "Attempted the full question",
      substHits >= 3 ? "Cites institutional / constitutional sources" : "Readable and on-topic",
      analysisHits >= 4 ? "Multi-dimensional treatment of the issue" : "Clear central argument",
    ],
    improvements: [
      lengthRatio < 0.75 ? `Expand to approximately ${wordLimit} words` : "Tighten word economy — avoid repetition",
      substHits < 3 ? "Add at least 2 data points, reports or Supreme Court judgments" : "Add one recent (last 12 months) example",
      analysisHits < 4 ? "Explicitly cover social, economic, political and ethical angles" : "Add a counter-argument for balance",
      "Close with a Way Forward citing a committee recommendation",
    ],
    modelAnswerOutline: [
      `Introduction (~15%): Define the core term in ${question ? `"${question.slice(0, 70)}"` : "the question"} with a constitutional/statutory anchor`,
      "Body Part 1 (~35%): Present the affirmative dimension with 2-3 substantiated examples",
      "Body Part 2 (~30%): Present challenges, criticisms and counter-perspectives",
      "Analysis (~10%): Link to a recent report, judgment or committee recommendation",
      "Conclusion (~10%): Balanced, futuristic Way Forward aligned with SDG / governance reform",
    ],
    examinerRemark: `Deterministic offline evaluation. Word count ${wordCount}/${wordLimit}. Structure signals: ${structureHits}, substantiation: ${substHits}, analysis: ${analysisHits}. Configure an AI provider key for full semantic grading.`,
  };
}

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 8);
}

export function offlineQuiz(sourceText: string, count: number, topic: string): QuizResult {
  const sents = sentences(sourceText);
  const n = Math.max(1, Math.min(count, Math.max(1, sents.length)));
  const questions: QuizQuestion[] = [];

  for (let i = 0; i < n; i++) {
    const s = sents[i % Math.max(1, sents.length)] || `Key concept ${i + 1} from the source material.`;
    const truncated = s.length > 180 ? `${s.slice(0, 180)}...` : s;
    const correctIndex = i % 4;
    const options = [
      "Only statement 1 is correct",
      "Only statement 2 is correct",
      "Both statements are correct",
      "Neither statement is correct",
    ];
    options[correctIndex] = "As stated in the source material — this is correct";

    questions.push({
      id: i + 1,
      question: `Consider the following statement regarding ${topic}:\n\n"${truncated}"\n\nWhich of the following is correct with reference to the above?`,
      options,
      correctIndex,
      explanation: `The source material explicitly states: "${truncated}". The other options either invert the relationship or introduce facts not present in the source. For Prelims, always verify each statement independently before eliminating options.`,
      difficulty: i % 5 === 0 ? "hard" : i % 3 === 0 ? "easy" : "medium",
      topic,
    });
  }

  return {
    title: `${topic} — Prelims Practice Set (${n} Questions)`,
    sourceSummary: `Deterministic quiz generated from ${sourceText.split(/\s+/).length} words of source material. Configure an AI provider key for semantically richer, UPSC-calibrated MCQs.`,
    questions,
  };
}

export function offlineNotes(sourceText: string, title: string): NotesResult {
  const sents = sentences(sourceText);
  const chunk = Math.max(1, Math.ceil(sents.length / 4));

  const sections = [0, 1, 2, 3]
    .map((i) => ({
      heading: ["Overview & Context", "Core Concepts", "Analysis & Implications", "Conclusion & Exam Angle"][i],
      content: sents.slice(i * chunk, (i + 1) * chunk).join(" ") || "Content pending — source material was short.",
    }))
    .filter((s) => s.content.length > 20);

  return {
    title,
    summary:
      sents.slice(0, 3).join(" ") ||
      "Structured study module generated from the supplied source material.",
    keyPoints: sents.slice(0, 8).map((s) => (s.length > 160 ? `${s.slice(0, 160)}...` : s)),
    sections,
    upscRelevance:
      "Maps primarily to GS Paper II (Polity & Governance) and GS Paper III (Economy & Development). Cross-reference with the current affairs compilation for the relevant month.",
    probableQuestions: [
      `Critically examine the issues discussed in "${title}". (250 words, 15 marks)`,
      `Discuss the policy implications arising from ${title}. (150 words, 10 marks)`,
      `"${title}" — evaluate its significance for Indian governance. (250 words, 15 marks)`,
    ],
  };
}

export function offlineChat(message: string): string {
  const q = message.toLowerCase();

  if (q.includes("federalism") || q.includes("gs-2") || q.includes("gs2")) {
    return `**Structuring a GS-2 answer on Federalism**

**Introduction (~20 words)**
Anchor with Article 1 — "India, that is Bharat, shall be a Union of States" — and note the SC's "quasi-federal" characterisation in *State of West Bengal v. Union of India*.

**Body**
- Constitutional scheme: Seventh Schedule, Article 246, Articles 245-263
- Cooperative federalism: GST Council (Art. 279A), NITI Aayog, Inter-State Council (Art. 263)
- Competitive federalism: Ease of Doing Business rankings, Aspirational Districts
- Friction points: Governor's discretion (Art. 163), Article 356, cess/surcharge shrinking the divisible pool

**Analysis**
- *S.R. Bommai* (1994) — federalism as basic structure
- 15th Finance Commission on vertical devolution
- Punchhi Commission on Centre-State relations

**Conclusion (~20 words)**
Way forward: institutionalise the Inter-State Council, codify Governor's discretion, strengthen fiscal federalism.

**Exam tip:** Always name one committee AND one judgment — it instantly lifts you into the 45%+ band.`;
  }

  if (q.includes("article") || q.includes("polity") || q.includes("prelims")) {
    return `**High-yield Articles for Prelims**

**Fundamental Rights (12-35)**
- Art. 14 Equality • Art. 19 Six Freedoms • Art. 21 Life & Personal Liberty
- Art. 21A Education • Art. 32 Constitutional Remedies (Ambedkar's "heart and soul")

**DPSP (36-51)**
- Art. 39A Equal Justice • Art. 44 UCC • Art. 48A Environment • Art. 50 Separation of Judiciary

**Constitutional Bodies**
- Art. 324 ECI • Art. 315-323 UPSC/SPSC • Art. 280 Finance Commission • Art. 148 CAG

**Emergency**
- Art. 352 National • Art. 356 President's Rule • Art. 360 Financial

**Exam tip:** For each Article, memorise one landmark judgment. UPSC increasingly frames statement-based questions around judgment + Article pairs.`;
  }

  if (q.includes("essay")) {
    return `**UPSC Essay Paper — Scoring Framework**

**Structure (1000-1200 words per essay)**
1. **Hook (80-100 w):** anecdote, quote, or paradox — never a dictionary definition
2. **Thesis (50 w):** state your position explicitly
3. **Body (700-800 w):** 4-5 dimensions — historical, social, economic, political, ethical, global
4. **Counter-view (100 w):** demonstrates balance — this is what separates 120+ scores
5. **Conclusion (100-120 w):** visionary, quotable, forward-looking

**Illustration bank to build:** 2 historical figures, 2 SC judgments, 2 schemes, 2 global examples, 2 literary/philosophical quotes.

**Exam tip:** Examiners reward *breadth of illustration* more than depth in a single domain. Never let an essay stay within one discipline.`;
  }

  return `**Ibemhal AI Study Buddy**

I can help you with:

- **Mains Answer Evaluation** — paste your answer with the question and word limit for rubric-based marking
- **Essay Evaluation** — full 125-mark breakdown across 5 criteria
- **Quiz Generation** — upload a PDF or paste a YouTube URL to auto-generate Prelims MCQs
- **Syllabus Queries** — any GS I-IV topic, Prelims facts or Mains analytical framing
- **Current Affairs** — linkage of news to static syllabus

Your query: *"${message.slice(0, 120)}"*

For a full semantic response, configure at least one AI provider key (\`ANTHROPIC_API_KEY\`, \`OPENAI_API_KEY\`, \`GOOGLE_API_KEY\`, \`DEEPSEEK_API_KEY\`, or \`GROQ_API_KEY\`). The deterministic engine is currently serving this response so the platform never returns an error.`;
}
