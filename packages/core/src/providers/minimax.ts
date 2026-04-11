import type {
  AddressProfile,
  AddressProfileRecentToken,
  AddressScore,
  DisplayLevel,
  PersonaConfig,
  PersonaScore,
  TokenBrief,
  TrackedAddressConfig,
} from "../types";
import { attachPersonaDisplay, getDisplayLevelFromScore } from "../scoring/live-contract";

const DEFAULT_MINIMAX_API_HOST = "https://api.minimaxi.com";
const DEFAULT_MINIMAX_BASE_URL = "https://api.minimaxi.com/anthropic";
const DEFAULT_MINIMAX_API_STYLE = "anthropic";
const DEFAULT_MINIMAX_PLAN = "token";
const DEFAULT_TOKEN_PLAN_MODEL = "MiniMax-M2.7";
const DEFAULT_CODING_PLAN_MODEL = "MiniMax-M2.5";
const DEFAULT_TIMEOUT_MS = 16_000;

type FetchLike = typeof fetch;
type MiniMaxApiStyle = "anthropic" | "openai";
type MiniMaxPlan = "token" | "coding";
export type MiniMaxFailureCode =
  | "auth_failure"
  | "timeout"
  | "rate_limit"
  | "invalid_json"
  | "incomplete_response"
  | "upstream_5xx"
  | "client_4xx"
  | "configuration";

type AnthropicContentBlock = {
  type?: string;
  text?: string;
  thinking?: string;
};

type AnthropicMessageResponse = {
  content?: AnthropicContentBlock[];
  stop_reason?: string | null;
};

type OpenAiChatChoice = {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
  };
};

type OpenAiChatResponse = {
  choices?: OpenAiChatChoice[];
};

type MiniMaxPersonaDraft = Pick<
  PersonaScore,
  "affinityScore" | "confidence" | "summary" | "evidence"
>;

export interface MiniMaxTrackedAddressDraft {
  displayLevel: DisplayLevel;
  narrativeAffinityScore: number;
  buyLikelihoodScore: number;
  confidence: AddressScore["confidence"];
  summary: string;
  evidence: string[];
}

export interface MiniMaxAddressProfileDraft {
  style: string[];
  riskAppetite: AddressProfile["riskAppetite"];
  favoriteNarratives: string[];
  confidence: AddressProfile["confidence"];
  summary: string;
  evidence: string[];
}

export interface MiniMaxPersonaScorerOptions {
  apiKey: string;
  apiHost?: string;
  baseUrl?: string;
  apiStyle?: MiniMaxApiStyle;
  plan?: MiniMaxPlan;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

export interface ScorePersonaWithMiniMaxInput {
  token: TokenBrief;
  persona?: Pick<PersonaConfig, "id" | "label" | "logoKey" | "logoMode">;
}

export interface ScoreTrackedAddressWithMiniMaxInput {
  token: TokenBrief;
  trackedAddress: Pick<
    TrackedAddressConfig,
    "id" | "label" | "address" | "logoKey" | "logoMode"
  >;
  deterministicScore: AddressScore;
  recentTradeCount: number;
  top100Rank: number | null;
  top100Percentage: number | null;
  isSmartWallet: boolean;
  smartMoneyMatchedCount: number;
}

export interface RefineAddressProfileWithMiniMaxInput {
  address: string;
  deterministicProfile: AddressProfile;
  recentTokenContext: AddressProfileRecentToken[];
}

export interface MiniMaxScorer {
  scoreCzAffinity(input: ScorePersonaWithMiniMaxInput): Promise<PersonaScore>;
  scoreTrackedAddressAffinity(
    input: ScoreTrackedAddressWithMiniMaxInput
  ): Promise<MiniMaxTrackedAddressDraft>;
  refineAddressProfile(
    input: RefineAddressProfileWithMiniMaxInput
  ): Promise<MiniMaxAddressProfileDraft>;
}

export type MiniMaxPersonaScorer = MiniMaxScorer;

export class MiniMaxConfigurationError extends Error {
  readonly code = "configuration";

  constructor(message: string) {
    super(message);
    this.name = "MiniMaxConfigurationError";
  }
}

export class MiniMaxApiError extends Error {
  code: Exclude<MiniMaxFailureCode, "configuration">;
  statusCode?: number;
  retryable: boolean;
  detail?: string;

  constructor(
    message: string,
    options: {
      code: Exclude<MiniMaxFailureCode, "configuration">;
      statusCode?: number;
      retryable?: boolean;
      detail?: string;
    }
  ) {
    super(message);
    this.name = "MiniMaxApiError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
    this.detail = options.detail;
  }
}

type AnthropicTextExtractionResult = {
  text: string;
  hasText: boolean;
  hasThinking: boolean;
  stopReason: string | null;
};

function normalizeApiStyle(value: string | undefined): MiniMaxApiStyle {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "openai") {
    return "openai";
  }

  return "anthropic";
}

function inferApiStyleFromBaseUrl(value: string | undefined): MiniMaxApiStyle | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.includes("/anthropic")) {
    return "anthropic";
  }

  if (normalized.includes("/chat") || normalized.endsWith("/v1") || normalized.includes("/openai")) {
    return "openai";
  }

  return null;
}

function normalizePlan(value: string | undefined): MiniMaxPlan {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "coding") {
    return "coding";
  }

  return "token";
}

function resolveBaseUrl(input: {
  baseUrl?: string;
  apiHost?: string;
  apiStyle: MiniMaxApiStyle;
}): string {
  if (input.baseUrl?.trim()) {
    return input.baseUrl.trim().replace(/\/+$/, "");
  }

  if (!input.apiHost?.trim()) {
    return input.apiStyle === "anthropic"
      ? DEFAULT_MINIMAX_BASE_URL
      : `${DEFAULT_MINIMAX_API_HOST}/v1`;
  }

  const apiHost = input.apiHost.trim();
  const normalizedHost = apiHost.replace(/\/+$/, "");
  return input.apiStyle === "anthropic"
    ? `${normalizedHost}/anthropic`
    : `${normalizedHost}/v1`;
}

function normalizeTimeout(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_TIMEOUT_MS;
  }

  if (!Number.isFinite(value) || value <= 0) {
    throw new MiniMaxConfigurationError(
      "MiniMax timeout must be a positive number"
    );
  }

  return value;
}

function normalizeModel(value: string | undefined, plan: MiniMaxPlan): string {
  const fallbackModel =
    plan === "coding" ? DEFAULT_CODING_PLAN_MODEL : DEFAULT_TOKEN_PLAN_MODEL;
  const model = (value || fallbackModel).trim();
  if (!model) {
    throw new MiniMaxConfigurationError("MiniMax model must not be empty");
  }

  return model;
}

function readRequiredApiKey(value: string | undefined): string {
  const apiKey = value?.trim();
  if (!apiKey) {
    throw new MiniMaxConfigurationError(
      "MINIMAX_API_KEY is required (ANTHROPIC_API_KEY is also supported)"
    );
  }

  return apiKey;
}

function resolveApiKeyFromEnv(
  env: Record<string, string | undefined>
): string | undefined {
  return env.MINIMAX_API_KEY?.trim() || env.ANTHROPIC_API_KEY?.trim();
}

function resolveBaseUrlFromEnv(
  env: Record<string, string | undefined>
): string | undefined {
  return env.MINIMAX_BASE_URL?.trim() || env.ANTHROPIC_BASE_URL?.trim();
}

export function getMiniMaxFailureCode(
  error: unknown
): MiniMaxFailureCode | "unknown" {
  if (error instanceof MiniMaxConfigurationError) {
    return error.code;
  }

  if (error instanceof MiniMaxApiError) {
    return error.code;
  }

  return "unknown";
}

export function getMiniMaxFailureDetail(error: unknown): string | null {
  if (error instanceof MiniMaxApiError) {
    return error.detail ?? null;
  }

  return null;
}

export function isRetryableMiniMaxError(error: unknown): boolean {
  return error instanceof MiniMaxApiError && error.retryable;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function isConfidence(value: unknown): value is PersonaScore["confidence"] {
  return value === "low" || value === "medium" || value === "high";
}

function isDisplayLevel(value: unknown): value is DisplayLevel {
  return value === "NO_LOVE" || value === "LOVE" || value === "LOVE_LOVE";
}

function isAddressProfileRiskAppetite(
  value: unknown
): value is AddressProfile["riskAppetite"] {
  return (
    value === "unknown" ||
    value === "cautious" ||
    value === "balanced" ||
    value === "aggressive"
  );
}

function readOpenAiContent(choice: OpenAiChatChoice | undefined): string {
  const content = choice?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }

  return "";
}

function readAnthropicTextContent(
  response: AnthropicMessageResponse
): AnthropicTextExtractionResult {
  const blocks = response.content ?? [];
  const text = blocks
    .filter(
      (block) => block.type === "text" && typeof block.text === "string"
    )
    .map((block) => block.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();

  return {
    text,
    hasText: text.length > 0,
    hasThinking: blocks.some(
      (block) =>
        block.type === "thinking" || typeof block.thinking === "string"
    ),
    stopReason: response.stop_reason ?? null,
  };
}

function extractFirstJsonObject(value: string): string {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new MiniMaxApiError("MiniMax returned invalid structured JSON", {
      code: "invalid_json",
    });
  }

  return value.slice(start, end + 1);
}

function coerceEvidence(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 5);
}

function coerceShortStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 5);
}

function buildPersonaPrompt(token: TokenBrief): string {
  return [
    "Analyze this BSC meme token using CZ's decision framework.",
    "",
    `Token: ${token.name} (${token.symbol})`,
    `Chain: ${token.chain}`,
    `Launchpad: ${token.launchpad}`,
    `Narrative tags: ${token.narrativeTags.join(", ") || "unknown"}`,
    `Risk level: ${token.risk.riskLevel}`,
    `Risk score: ${token.risk.riskScore ?? "unknown"}`,
    "",
    "Rules:",
    "- Protect users above all.",
    "- Simplicity beats complexity.",
    "- Fast trust signals matter.",
    "- Clear narrative and lower risk should score higher.",
    "- Be conservative when evidence is thin.",
    "",
    "Return valid JSON only:",
    '{',
    '  "affinityScore": 0-100 number,',
    '  "confidence": "low" | "medium" | "high",',
    '  "summary": "1-2 sentence judgment",',
    '  "evidence": ["reason 1", "reason 2", "reason 3"]',
    '}',
  ].join("\n");
}

function buildTrackedAddressPrompt(
  input: ScoreTrackedAddressWithMiniMaxInput
): string {
  const score = input.deterministicScore;

  return [
    "Evaluate whether this fixed tracked address would buy or love the token.",
    "",
    "The deterministic rule engine already extracted the features below.",
    "Use them as the primary signal, add judgment, and stay conservative.",
    "",
    `Token: ${input.token.name} (${input.token.symbol})`,
    `Launchpad: ${input.token.launchpad}`,
    `Narrative tags: ${input.token.narrativeTags.join(", ") || "unknown"}`,
    `Risk: ${input.token.risk.riskLevel} (${input.token.risk.riskScore ?? "unknown"})`,
    "",
    `Tracked address: ${input.trackedAddress.label} (${input.trackedAddress.address})`,
    `Recent token-scoped trades: ${input.recentTradeCount}`,
    `Deterministic narrativeAffinityScore: ${score.narrativeAffinityScore}`,
    `Deterministic buyLikelihoodScore: ${score.buyLikelihoodScore}`,
    `Deterministic displayLevel: ${score.displayLevel}`,
    `Launchpad bias: ${score.launchpadBias}`,
    `Style labels: ${score.styleLabels.join(", ") || "none"}`,
    `Top100 holder rank: ${input.top100Rank ?? "none"}`,
    `Top100 holder percentage: ${input.top100Percentage ?? "none"}`,
    `Is AVE smart wallet: ${input.isSmartWallet ? "yes" : "no"}`,
    `Token smart-money matchedCount: ${input.smartMoneyMatchedCount}`,
    `Deterministic confidence: ${score.confidence}`,
    `Deterministic summary: ${score.summary}`,
    `Deterministic evidence: ${score.evidence.join(" | ")}`,
    "",
    "Rules:",
    "- Keep the final level aligned with the evidence.",
    "- If recentTradeCount is 0 or evidence is thin, be conservative.",
    "- Top100 holder state and AVE smart-wallet state can raise conviction, but should not overpower weak history.",
    "- Return a final displayLevel and final scores.",
    "",
    "Return valid JSON only:",
    '{',
    '  "displayLevel": "NO_LOVE" | "LOVE" | "LOVE_LOVE",',
    '  "narrativeAffinityScore": 0-100 number,',
    '  "buyLikelihoodScore": 0-100 number,',
    '  "confidence": "low" | "medium" | "high",',
    '  "summary": "1-2 sentence judgment",',
    '  "evidence": ["reason 1", "reason 2", "reason 3"]',
    '}',
  ].join("\n");
}

function buildAddressProfilePrompt(
  input: RefineAddressProfileWithMiniMaxInput
): string {
  const profile = input.deterministicProfile;
  const recentTokens = input.recentTokenContext.length
    ? input.recentTokenContext
        .slice(0, 6)
        .map(
          (token, index) =>
            `${index + 1}. ${token.symbol} (${token.tokenAddress}) | ${token.launchpad} | roiPct=${token.roiPct ?? "unknown"} | holdMinutes=${token.holdMinutes ?? "unknown"} | narratives=${token.narrativeTags.join(", ") || "none"}`
        )
        .join("\n")
    : "none";

  return [
    "Refine this BSC wallet profile for recent Fourmeme and Flap meme activity.",
    "",
    "Use the deterministic profile as the primary source of truth.",
    "Recent token context is already filtered to recent meme activity and should only refine wording and emphasis.",
    "",
    `Address: ${input.address}`,
    `Deterministic style: ${profile.style}`,
    `Deterministic risk appetite: ${profile.riskAppetite}`,
    `Deterministic recentTradeCount: ${profile.recentTradeCount}`,
    `Deterministic launchpadBias: ${profile.launchpadBias}`,
    `Deterministic favoriteNarratives: ${profile.favoriteNarratives.join(", ") || "none"}`,
    `Deterministic confidence: ${profile.confidence}`,
    `Deterministic sourceStatus: ${profile.sourceStatus}`,
    `Deterministic summary: ${profile.summary}`,
    `Deterministic evidence: ${profile.evidence.join(" | ")}`,
    "",
    "Recent token context:",
    recentTokens,
    "",
    "Rules:",
    "- Stay conservative when recentTradeCount is low or sourceStatus is unavailable.",
    "- Do not invent token recommendations or trading calls.",
    "- Keep the structure stable and concise.",
    "- Return JSON only in the final text block.",
    "",
    "Return valid JSON only:",
    "{",
    '  "style": "short wallet style label",',
    '  "riskAppetite": "unknown" | "cautious" | "balanced" | "aggressive",',
    '  "favoriteNarratives": ["tag 1", "tag 2"],',
    '  "confidence": "low" | "medium" | "high",',
    '  "summary": "1-2 sentence wallet profile",',
    '  "evidence": ["reason 1", "reason 2", "reason 3"]',
    "}",
  ].join("\n");
}

function normalizePersonaDraft(result: unknown): MiniMaxPersonaDraft {
  const record =
    typeof result === "object" && result !== null && !Array.isArray(result)
      ? (result as Record<string, unknown>)
      : {};
  const rawScore =
    typeof record.affinityScore === "number"
      ? record.affinityScore
      : Number(record.affinityScore);
  const affinityScore = Number.isFinite(rawScore) ? rawScore : 50;

  return {
    affinityScore: Math.round(clamp(affinityScore)),
    confidence: isConfidence(record.confidence) ? record.confidence : "medium",
    summary:
      typeof record.summary === "string" && record.summary.trim()
        ? record.summary.trim()
        : "MiniMax returned an incomplete persona summary.",
    evidence:
      coerceEvidence(record.evidence).length > 0
        ? coerceEvidence(record.evidence)
        : ["MiniMax returned incomplete structured evidence."],
  };
}

function alignScoreToDisplayLevel(
  value: number | null,
  displayLevel: DisplayLevel
): number {
  const fallback =
    displayLevel === "LOVE_LOVE"
      ? 82
      : displayLevel === "LOVE"
        ? 55
        : 25;

  if (value === null) {
    return fallback;
  }

  const normalized = Math.round(clamp(value));
  switch (displayLevel) {
    case "LOVE_LOVE":
      return Math.max(normalized, 70);
    case "LOVE":
      return Math.max(40, Math.min(normalized, 69));
    default:
      return Math.min(normalized, 39);
  }
}

function normalizeTrackedAddressDraft(
  result: unknown,
  fallback: AddressScore
): MiniMaxTrackedAddressDraft {
  const record =
    typeof result === "object" && result !== null && !Array.isArray(result)
      ? (result as Record<string, unknown>)
      : {};
  const rawBuyScore =
    typeof record.buyLikelihoodScore === "number"
      ? record.buyLikelihoodScore
      : Number(record.buyLikelihoodScore);
  const rawNarrativeScore =
    typeof record.narrativeAffinityScore === "number"
      ? record.narrativeAffinityScore
      : Number(record.narrativeAffinityScore);
  const narrativeAffinityScore = Number.isFinite(rawNarrativeScore)
    ? Math.round(clamp(rawNarrativeScore))
    : fallback.narrativeAffinityScore;
  const inferredDisplayLevel = Number.isFinite(rawBuyScore)
    ? getDisplayLevelFromScore(rawBuyScore)
    : fallback.displayLevel;
  const displayLevel = isDisplayLevel(record.displayLevel)
    ? record.displayLevel
    : inferredDisplayLevel;
  const buyLikelihoodScore = alignScoreToDisplayLevel(
    Number.isFinite(rawBuyScore) ? rawBuyScore : null,
    displayLevel
  );

  return {
    displayLevel,
    narrativeAffinityScore,
    buyLikelihoodScore,
    confidence: isConfidence(record.confidence)
      ? record.confidence
      : fallback.confidence,
    summary:
      typeof record.summary === "string" && record.summary.trim()
        ? record.summary.trim()
        : fallback.summary,
    evidence:
      coerceEvidence(record.evidence).length > 0
        ? coerceEvidence(record.evidence)
        : fallback.evidence.slice(0, 5),
  };
}

function normalizeAddressProfileDraft(
  result: unknown,
  fallback: AddressProfile
): MiniMaxAddressProfileDraft {
  const record =
    typeof result === "object" && result !== null && !Array.isArray(result)
      ? (result as Record<string, unknown>)
      : {};
  const favoriteNarratives = coerceShortStringList(record.favoriteNarratives);
  const rawStyle = Array.isArray(record.style)
    ? (record.style as unknown[]).filter((s): s is string => typeof s === "string" && Boolean(s.trim()))
    : [];
  const style = rawStyle.length > 0 ? rawStyle : fallback.style;

  return {
    style,
    riskAppetite: isAddressProfileRiskAppetite(record.riskAppetite)
      ? record.riskAppetite
      : fallback.riskAppetite,
    favoriteNarratives:
      favoriteNarratives.length > 0
        ? favoriteNarratives
        : fallback.favoriteNarratives.slice(0, 5),
    confidence: isConfidence(record.confidence)
      ? record.confidence
      : fallback.confidence,
    summary:
      typeof record.summary === "string" && record.summary.trim()
        ? record.summary.trim()
        : fallback.summary,
    evidence:
      coerceEvidence(record.evidence).length > 0
        ? coerceEvidence(record.evidence)
        : fallback.evidence.slice(0, 5),
  };
}

function buildStatusCodeError(statusCode: number): MiniMaxApiError {
  if (statusCode === 401 || statusCode === 403) {
    return new MiniMaxApiError("MiniMax authentication failed", {
      code: "auth_failure",
      statusCode,
    });
  }

  if (statusCode === 429) {
    return new MiniMaxApiError("MiniMax rate limit hit", {
      code: "rate_limit",
      statusCode,
      retryable: true,
    });
  }

  if (statusCode >= 500) {
    return new MiniMaxApiError("MiniMax upstream request failed", {
      code: "upstream_5xx",
      statusCode,
      retryable: statusCode === 502 || statusCode === 503 || statusCode === 504,
    });
  }

  return new MiniMaxApiError("MiniMax request failed", {
    code: "client_4xx",
    statusCode,
  });
}

function parseStructuredJson(value: string): unknown {
  try {
    return JSON.parse(extractFirstJsonObject(value));
  } catch (error) {
    if (error instanceof MiniMaxApiError) {
      throw error;
    }

    throw new MiniMaxApiError("MiniMax returned invalid structured JSON", {
      code: "invalid_json",
    });
  }
}

function ensureAnthropicTextResponse(
  response: AnthropicMessageResponse
): string {
  const extracted = readAnthropicTextContent(response);
  if (extracted.hasText) {
    return extracted.text;
  }

  const detail = extracted.hasThinking
    ? "thinking_only"
    : extracted.stopReason === "max_tokens"
      ? "max_tokens_without_text"
      : "no_text_block";
  const retryable =
    extracted.hasThinking || extracted.stopReason === "max_tokens";

  throw new MiniMaxApiError("MiniMax returned incomplete response", {
    code: "incomplete_response",
    retryable,
    detail,
  });
}

async function waitBeforeRetry(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 250));
}

function buildRetryRequestInput(input: {
  system: string;
  prompt: string;
  maxTokens: number;
}, error: unknown): {
  system: string;
  prompt: string;
  maxTokens: number;
} {
  if (
    error instanceof MiniMaxApiError &&
    error.code === "incomplete_response" &&
    (error.detail === "thinking_only" ||
      error.detail === "max_tokens_without_text")
  ) {
    return {
      ...input,
      maxTokens: Math.max(input.maxTokens * 2, input.maxTokens + 300),
    };
  }

  return input;
}

export function isMiniMaxEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  const apiKey = resolveApiKeyFromEnv(env);
  if (!apiKey) {
    return false;
  }

  const primaryProvider = env.AI_PRIMARY_PROVIDER?.trim().toLowerCase();
  const hasDeepSeekKey = Boolean(env.DEEPSEEK_API_KEY?.trim());

  return (
    primaryProvider === undefined ||
    primaryProvider === "" ||
    primaryProvider === "minimax" ||
    !hasDeepSeekKey
  );
}

export function createMiniMaxScorer(
  options: MiniMaxPersonaScorerOptions
): MiniMaxScorer {
  const apiKey = readRequiredApiKey(options.apiKey);
  const apiStyle = normalizeApiStyle(options.apiStyle ?? DEFAULT_MINIMAX_API_STYLE);
  const plan = normalizePlan(options.plan ?? DEFAULT_MINIMAX_PLAN);
  const baseUrl = resolveBaseUrl({
    baseUrl: options.baseUrl,
    apiHost: options.apiHost,
    apiStyle,
  });
  const model = normalizeModel(options.model, plan);
  const timeoutMs = normalizeTimeout(options.timeoutMs);
  const fetchImpl = options.fetchImpl ?? fetch;

  async function requestStructuredJsonOnce(input: {
    system: string;
    prompt: string;
    maxTokens: number;
  }): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (apiStyle === "anthropic") {
        const response = await fetchImpl(`${baseUrl}/v1/messages`, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.1,
            max_tokens: input.maxTokens,
            system: input.system,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: input.prompt,
                  },
                ],
              },
            ],
          }),
          signal: controller.signal,
        });

        const bodyText = await response.text();
        if (!response.ok) {
          throw buildStatusCodeError(response.status);
        }

        let parsedResponse: AnthropicMessageResponse;
        try {
          parsedResponse = JSON.parse(bodyText) as AnthropicMessageResponse;
        } catch {
          throw new MiniMaxApiError("MiniMax returned invalid JSON", {
            code: "invalid_json",
          });
        }

        return parseStructuredJson(ensureAnthropicTextResponse(parsedResponse));
      }

      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: input.maxTokens,
          messages: [
            {
              role: "system",
              content: input.system,
            },
            {
              role: "user",
              content: input.prompt,
            },
          ],
        }),
        signal: controller.signal,
      });

      const bodyText = await response.text();
      if (!response.ok) {
        throw buildStatusCodeError(response.status);
      }

      let parsedResponse: OpenAiChatResponse;
      try {
        parsedResponse = JSON.parse(bodyText) as OpenAiChatResponse;
      } catch {
        throw new MiniMaxApiError("MiniMax returned invalid JSON", {
          code: "invalid_json",
        });
      }

      const openAiText = readOpenAiContent(parsedResponse.choices?.[0]);
      if (!openAiText) {
        throw new MiniMaxApiError("MiniMax returned incomplete response", {
          code: "incomplete_response",
          detail: "no_text_block",
        });
      }

      return parseStructuredJson(openAiText);
    } catch (error) {
      if (error instanceof MiniMaxApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new MiniMaxApiError("MiniMax request timed out", {
          code: "timeout",
          retryable: true,
        });
      }

      if (error instanceof SyntaxError) {
        throw new MiniMaxApiError("MiniMax returned invalid structured JSON", {
          code: "invalid_json",
        });
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function requestStructuredJson(input: {
    system: string;
    prompt: string;
    maxTokens: number;
  }): Promise<unknown> {
    let lastError: unknown;
    let attemptInput = input;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await requestStructuredJsonOnce(attemptInput);
      } catch (error) {
        lastError = error;
        if (attempt === 0 && isRetryableMiniMaxError(error)) {
          attemptInput = buildRetryRequestInput(input, error);
          await waitBeforeRetry();
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  return {
    async scoreCzAffinity(input: ScorePersonaWithMiniMaxInput): Promise<PersonaScore> {
      const result = await requestStructuredJson({
        system:
          "You are a neutral token analyst. Return valid JSON only and keep outputs concise.",
        prompt: buildPersonaPrompt(input.token),
        maxTokens: 420,
      });
      const draft = normalizePersonaDraft(result);

      return attachPersonaDisplay({
        persona: {
          id: input.persona?.id ?? "cz",
          label: input.persona?.label ?? "CZ",
          ...draft,
        },
        config: input.persona,
      });
    },

    async scoreTrackedAddressAffinity(
      input: ScoreTrackedAddressWithMiniMaxInput
    ): Promise<MiniMaxTrackedAddressDraft> {
      const result = await requestStructuredJson({
        system:
          "You are a neutral wallet analyst. Use the deterministic features as the primary signal, stay conservative, and return valid JSON only.",
        prompt: buildTrackedAddressPrompt(input),
        maxTokens: 420,
      });

      return normalizeTrackedAddressDraft(result, input.deterministicScore);
    },

    async refineAddressProfile(
      input: RefineAddressProfileWithMiniMaxInput
    ): Promise<MiniMaxAddressProfileDraft> {
      const result = await requestStructuredJson({
        system:
          "You are a neutral wallet-profile analyst. Use the deterministic profile as the primary signal and return valid JSON only.",
        prompt: buildAddressProfilePrompt(input),
        maxTokens: 420,
      });

      return normalizeAddressProfileDraft(result, input.deterministicProfile);
    },
  };
}

export function createMiniMaxScorerFromEnv(
  env: Record<string, string | undefined> = process.env
): MiniMaxScorer {
  const baseUrl = resolveBaseUrlFromEnv(env);
  const inferredApiStyle =
    env.MINIMAX_API_STYLE !== undefined
      ? normalizeApiStyle(env.MINIMAX_API_STYLE)
      : inferApiStyleFromBaseUrl(baseUrl) ??
        normalizeApiStyle(undefined);

  return createMiniMaxScorer({
    apiKey: readRequiredApiKey(resolveApiKeyFromEnv(env)),
    apiHost: env.MINIMAX_API_HOST,
    baseUrl,
    apiStyle: inferredApiStyle,
    plan: normalizePlan(env.MINIMAX_PLAN),
    model: env.MINIMAX_MODEL,
    timeoutMs: env.MINIMAX_TIMEOUT_MS ? Number(env.MINIMAX_TIMEOUT_MS) : undefined,
  });
}

export function createMiniMaxPersonaScorer(
  options: MiniMaxPersonaScorerOptions
): MiniMaxPersonaScorer {
  return createMiniMaxScorer(options);
}

export function createMiniMaxPersonaScorerFromEnv(
  env: Record<string, string | undefined> = process.env
): MiniMaxPersonaScorer {
  return createMiniMaxScorerFromEnv(env);
}
