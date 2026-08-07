export type ProviderTier = 1 | 2 | 3 | 4 | 5;

export interface AIProvider {
  tier: ProviderTier;
  id: string;
  name: string;
  model: string;
  endpoint: string;
  envKey: string;
  strength: string;
  costPer1MInput: number;
  costPer1MOutput: number;
  buildHeaders: (apiKey: string) => Record<string, string>;
  buildBody: (system: string, user: string, jsonMode: boolean) => unknown;
  parseResponse: (data: unknown) => string;
}

interface OpenAIShape {
  choices?: Array<{ message?: { content?: string } }>;
}

interface AnthropicShape {
  content?: Array<{ text?: string }>;
}

interface GeminiShape {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

const openAICompatibleBody = (
  model: string,
  system: string,
  user: string,
  jsonMode: boolean
) => ({
  model,
  messages: [
    { role: "system", content: system },
    { role: "user", content: user },
  ],
  temperature: 0.3,
  max_tokens: 4096,
  ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
});

const openAICompatibleParse = (data: unknown): string =>
  (data as OpenAIShape)?.choices?.[0]?.message?.content ?? "";

export const PROVIDERS: AIProvider[] = [
  {
    tier: 1,
    id: "anthropic",
    name: "Anthropic Claude 3.5 Sonnet",
    model: "claude-3-5-sonnet-20241022",
    endpoint: "https://api.anthropic.com/v1/messages",
    envKey: "ANTHROPIC_API_KEY",
    strength: "Best-in-class essay grading & complex analytical reasoning",
    costPer1MInput: 3.0,
    costPer1MOutput: 15.0,
    buildHeaders: (apiKey) => ({
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    }),
    buildBody: (system, user) => ({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      temperature: 0.3,
      system,
      messages: [{ role: "user", content: user }],
    }),
    parseResponse: (data) => (data as AnthropicShape)?.content?.[0]?.text ?? "",
  },
  {
    tier: 2,
    id: "openai",
    name: "OpenAI GPT-4o",
    model: "gpt-4o",
    endpoint: "https://api.openai.com/v1/chat/completions",
    envKey: "OPENAI_API_KEY",
    strength: "High speed, reliable structured JSON & quiz generation",
    costPer1MInput: 2.5,
    costPer1MOutput: 10.0,
    buildHeaders: (apiKey) => ({
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    }),
    buildBody: (system, user, jsonMode) =>
      openAICompatibleBody("gpt-4o", system, user, jsonMode),
    parseResponse: openAICompatibleParse,
  },
  {
    tier: 3,
    id: "google",
    name: "Google Gemini 1.5 Pro",
    model: "gemini-1.5-pro-latest",
    endpoint:
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent",
    envKey: "GOOGLE_API_KEY",
    strength: "2M token context window for long PDF & transcript parsing",
    costPer1MInput: 1.25,
    costPer1MOutput: 5.0,
    buildHeaders: (apiKey) => ({
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    }),
    buildBody: (system, user, jsonMode) => ({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        ...(jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }),
    parseResponse: (data) =>
      (data as GeminiShape)?.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
  },
  {
    tier: 4,
    id: "deepseek",
    name: "DeepSeek V3",
    model: "deepseek-chat",
    endpoint: "https://api.deepseek.com/chat/completions",
    envKey: "DEEPSEEK_API_KEY",
    strength: "Extremely affordable, strong reasoning engine",
    costPer1MInput: 0.27,
    costPer1MOutput: 1.1,
    buildHeaders: (apiKey) => ({
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    }),
    buildBody: (system, user, jsonMode) =>
      openAICompatibleBody("deepseek-chat", system, user, jsonMode),
    parseResponse: openAICompatibleParse,
  },
  {
    tier: 5,
    id: "groq",
    name: "Groq Llama 3.3 70B",
    model: "llama-3.3-70b-versatile",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    envKey: "GROQ_API_KEY",
    strength: "Ultra-fast inference (~500 tok/s) emergency fallback",
    costPer1MInput: 0.59,
    costPer1MOutput: 0.79,
    buildHeaders: (apiKey) => ({
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    }),
    buildBody: (system, user, jsonMode) =>
      openAICompatibleBody("llama-3.3-70b-versatile", system, user, jsonMode),
    parseResponse: openAICompatibleParse,
  },
];

export function getConfiguredProviders(): AIProvider[] {
  return PROVIDERS.filter((p) => Boolean(process.env[p.envKey]));
}

export function getProviderStatus() {
  return PROVIDERS.map((p) => ({
    tier: p.tier,
    id: p.id,
    name: p.name,
    model: p.model,
    strength: p.strength,
    envKey: p.envKey,
    configured: Boolean(process.env[p.envKey]),
    costPer1MInput: p.costPer1MInput,
    costPer1MOutput: p.costPer1MOutput,
  }));
}
