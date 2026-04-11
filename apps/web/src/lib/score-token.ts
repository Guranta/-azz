import {
  analyzeAddressAffinity,
  attachAddressDisplay,
  AveApiError,
  AveConfigurationError,
  buildRecommendation,
  buildSmartMoneyScore,
  createAveDataClient,
  getMiniMaxFailureCode,
  getMiniMaxFailureDetail,
  createMiniMaxScorer,
  getDisplayLevelFromScore,
  isMiniMaxEnabled,
  MiniMaxApiError,
  MiniMaxConfigurationError,
  scoreCzAffinity,
  type AddressHistoryTradeInput,
  type AddressScore,
  type AveAddressTransaction,
  type AveSmartWallet,
  type AveTopHolder,
  type NormalizedAddressHistoryInput,
  type PersonaScore,
  type ScoreTokenResponse,
  type ScoreTokenRequest,
  type SmartMoneyMatch,
  type TokenBrief,
  type TrackedAddressConfig,
  type AveDataClient,
} from "@meme-affinity/core";
import {
  getEnabledPersonas,
  getEnabledTrackedAddresses,
} from "@/lib/project-config";
import {
  getSnapshot as getSmartMoneySnapshot,
  isSnapshotValid,
  type SmartMoneySnapshot,
} from "@/lib/smartmoney-snapshot";
import { createMetricsRecorder } from "@/lib/runtime-metrics";

const RECENT_HISTORY_PAGE_SIZE = 100;
const DEFAULT_AVE_BASE_URL = "https://prod.ave-api.com";
const DEFAULT_AVE_TIMEOUT_MS = 10_000;
const MINIMAX_SCORING_TIMEOUT_MS = 8_000;

function formatMiniMaxInternalReason(error: unknown): string {
  if (error instanceof MiniMaxConfigurationError) {
    return "configuration";
  }

  if (error instanceof MiniMaxApiError) {
    const detail = getMiniMaxFailureDetail(error);
    const statusCode = error.statusCode ? ` status=${error.statusCode}` : "";
    return detail
      ? `${getMiniMaxFailureCode(error)}:${detail}${statusCode}`
      : `${getMiniMaxFailureCode(error)}${statusCode}`;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "unknown";
}

function logMiniMaxFallback(scope: string, error: unknown): void {
  console.warn(
    `[MiniMax] ${scope} fallback: ${formatMiniMaxInternalReason(error)}`
  );
}

function createAveClientWithMetrics() {
  const metrics = createMetricsRecorder();
  const client = createAveDataClient({
    apiKey: process.env.AVE_API_KEY || "",
    baseUrl: process.env.AVE_DATA_BASE_URL,
    timeoutMs: process.env.AVE_REQUEST_TIMEOUT_MS
      ? Number(process.env.AVE_REQUEST_TIMEOUT_MS)
      : undefined,
    metricsRecorder: metrics,
  });
  return { client, metrics };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceString(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeAveBaseUrl(value: string | undefined): string {
  const baseUrl = (value || DEFAULT_AVE_BASE_URL).trim();
  return baseUrl.replace(/\/+$/, "");
}

function normalizeAveTimeoutMs(value: string | undefined): number {
  const parsed = value ? Number(value) : DEFAULT_AVE_TIMEOUT_MS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AVE_TIMEOUT_MS;
}

function extractArrayPayload(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return [];
  }

  const nestedKeys = ["data", "result", "items", "list", "rows"];
  for (const key of nestedKeys) {
    if (!(key in value)) {
      continue;
    }

    const nestedValue = value[key];
    if (Array.isArray(nestedValue)) {
      return nestedValue;
    }

    const nestedArray = extractArrayPayload(nestedValue);
    if (nestedArray.length > 0) {
      return nestedArray;
    }
  }

  return [];
}

function normalizeAveAddressTransaction(item: unknown): AveAddressTransaction | null {
  if (!isRecord(item)) {
    return null;
  }

  return {
    id: coerceString(item.id),
    time: coerceString(item.time),
    chain: coerceString(item.chain),
    transactionHash: coerceString(item.transaction),
    walletAddress: normalizeTokenAddress(coerceString(item.wallet_address)),
    fromAddress: normalizeTokenAddress(coerceString(item.from_address)),
    fromSymbol: coerceString(item.from_symbol),
    fromAmount: coerceNumber(item.from_amount),
    fromPriceUsd: coerceNumber(item.from_price_usd),
    toAddress: normalizeTokenAddress(coerceString(item.to_address)),
    toSymbol: coerceString(item.to_symbol),
    toAmount: coerceNumber(item.to_amount),
    toPriceUsd: coerceNumber(item.to_price_usd),
  };
}

async function fetchAddressTransactionsLive(input: {
  walletAddress: string;
  tokenAddress?: string;
  pageSize?: number;
  metricsRecorder: ReturnType<typeof createMetricsRecorder>;
}): Promise<AveAddressTransaction[]> {
  const apiKey = process.env.AVE_API_KEY?.trim();
  if (!apiKey) {
    throw new AveConfigurationError("AVE_API_KEY is required");
  }

  const params = new URLSearchParams({
    wallet_address: input.walletAddress.trim().toLowerCase(),
    chain: "bsc",
    page_size: String(input.pageSize ?? RECENT_HISTORY_PAGE_SIZE),
  });
  if (input.tokenAddress?.trim()) {
    params.set("token_address", input.tokenAddress.trim().toLowerCase());
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    normalizeAveTimeoutMs(process.env.AVE_REQUEST_TIMEOUT_MS)
  );

  try {
    const response = await fetch(
      `${normalizeAveBaseUrl(process.env.AVE_DATA_BASE_URL)}/v2/address/tx?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }
    );
    const bodyText = await response.text();

    if (!response.ok) {
      throw new AveApiError("AVE address history request failed", {
        path: `/v2/address/tx?${params.toString()}`,
        statusCode: response.status,
        body: bodyText,
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      throw new AveApiError("AVE address history returned invalid JSON", {
        path: `/v2/address/tx?${params.toString()}`,
        statusCode: response.status,
        body: bodyText,
      });
    }

    input.metricsRecorder.recordAddressTx();

    return extractArrayPayload(parsed)
      .map((item) => normalizeAveAddressTransaction(item))
      .filter((item): item is AveAddressTransaction => Boolean(item));
  } catch (error) {
    if (error instanceof AveApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AveApiError("AVE address history request timed out", {
        path: `/v2/address/tx?${params.toString()}`,
      });
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
const BASE_ASSET_SYMBOLS = new Set([
  "BNB",
  "WBNB",
  "USDT",
  "USDC",
  "FDUSD",
  "BUSD",
]);

type TokenEvent = {
  side: "buy" | "sell";
  tokenAddress: string | null;
  symbol: string | null;
  time: string | null;
  usdValue: number | null;
};

type HolderLookup = Map<
  string,
  {
    rank: number;
    percentage: number | null;
  }
>;

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function normalizeSymbol(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized || null;
}

function normalizeTokenAddress(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function parseTime(value: string | null): number {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function estimateUsdValue(
  primaryAmount: number | null,
  primaryPriceUsd: number | null,
  fallbackAmount: number | null,
  fallbackPriceUsd: number | null
): number | null {
  if (primaryAmount !== null && primaryPriceUsd !== null) {
    return round(primaryAmount * primaryPriceUsd, 2);
  }

  if (fallbackAmount !== null && fallbackPriceUsd !== null) {
    return round(fallbackAmount * fallbackPriceUsd, 2);
  }

  return null;
}

function isBaseAsset(input: {
  symbol: string | null;
  tokenAddress: string | null;
}): boolean {
  if (input.symbol && BASE_ASSET_SYMBOLS.has(input.symbol)) {
    return true;
  }

  return false;
}

function buildTokenEvents(transaction: AveAddressTransaction): TokenEvent[] {
  const fromSymbol = normalizeSymbol(transaction.fromSymbol);
  const toSymbol = normalizeSymbol(transaction.toSymbol);
  const fromAddress = normalizeTokenAddress(transaction.fromAddress);
  const toAddress = normalizeTokenAddress(transaction.toAddress);
  const fromIsBase = isBaseAsset({
    symbol: fromSymbol,
    tokenAddress: fromAddress,
  });
  const toIsBase = isBaseAsset({
    symbol: toSymbol,
    tokenAddress: toAddress,
  });
  const events: TokenEvent[] = [];

  if (!toIsBase && (toAddress || toSymbol)) {
    events.push({
      side: "buy",
      tokenAddress: toAddress,
      symbol: toSymbol,
      time: transaction.time,
      usdValue: estimateUsdValue(
        transaction.toAmount,
        transaction.toPriceUsd,
        transaction.fromAmount,
        transaction.fromPriceUsd
      ),
    });
  }

  if (!fromIsBase && (fromAddress || fromSymbol)) {
    events.push({
      side: "sell",
      tokenAddress: fromAddress,
      symbol: fromSymbol,
      time: transaction.time,
      usdValue: estimateUsdValue(
        transaction.fromAmount,
        transaction.fromPriceUsd,
        transaction.toAmount,
        transaction.toPriceUsd
      ),
    });
  }

  return events;
}

function getTokenKey(event: TokenEvent): string | null {
  return event.tokenAddress ?? event.symbol?.toLowerCase() ?? null;
}

function isCurrentTokenEvent(event: TokenEvent, token: TokenBrief): boolean {
  if (event.tokenAddress && event.tokenAddress === token.address.toLowerCase()) {
    return true;
  }

  return Boolean(
    !event.tokenAddress &&
      event.symbol &&
      event.symbol.toUpperCase() === token.symbol.toUpperCase()
  );
}

function buildNormalizedHistoryFromTransactions(input: {
  walletAddress: string;
  token: TokenBrief;
  transactions: AveAddressTransaction[];
}): NormalizedAddressHistoryInput {
  const orderedEvents = input.transactions
    .flatMap((transaction) => buildTokenEvents(transaction))
    .sort((left, right) => parseTime(left.time) - parseTime(right.time));
  const openBuys = new Map<string, TokenEvent[]>();
  const trades: AddressHistoryTradeInput[] = [];

  for (const event of orderedEvents) {
    const key = getTokenKey(event);
    if (!key) {
      continue;
    }

    const normalizedTokenAddress = isCurrentTokenEvent(event, input.token)
      ? input.token.address.toLowerCase()
      : event.tokenAddress;
    const launchpad = isCurrentTokenEvent(event, input.token)
      ? input.token.launchpad
      : "unknown";
    const narrativeTags = isCurrentTokenEvent(event, input.token)
      ? input.token.narrativeTags
      : [];

    if (event.side === "buy") {
      const queue = openBuys.get(key) ?? [];
      queue.push({
        ...event,
        tokenAddress: normalizedTokenAddress,
      });
      openBuys.set(key, queue);
      continue;
    }

    const queue = openBuys.get(key) ?? [];
    const matchedBuy = queue.shift();
    if (queue.length > 0) {
      openBuys.set(key, queue);
    } else {
      openBuys.delete(key);
    }

    const roiPct =
      matchedBuy?.usdValue && event.usdValue
        ? round(((event.usdValue - matchedBuy.usdValue) / matchedBuy.usdValue) * 100, 2)
        : null;

    trades.push({
      tokenAddress: normalizedTokenAddress,
      symbol: event.symbol,
      launchpad,
      narrativeTags,
      openedAt: matchedBuy?.time ?? null,
      closedAt: event.time,
      buyAmountUsd: matchedBuy?.usdValue ?? null,
      sellAmountUsd: event.usdValue,
      roiPct,
    });
  }

  for (const queue of openBuys.values()) {
    for (const event of queue) {
      const currentToken = isCurrentTokenEvent(event, input.token);

      trades.push({
        tokenAddress: currentToken
          ? input.token.address.toLowerCase()
          : event.tokenAddress,
        symbol: event.symbol,
        launchpad: currentToken ? input.token.launchpad : "unknown",
        narrativeTags: currentToken ? input.token.narrativeTags : [],
        openedAt: event.time,
        closedAt: null,
        buyAmountUsd: event.usdValue,
        sellAmountUsd: null,
        roiPct: null,
      });
    }
  }

  return {
    address: input.walletAddress,
    chain: "bsc",
    source: "ave:/v2/address/tx",
    trades,
  };
}

function buildHolderLookup(topHolders: AveTopHolder[]): HolderLookup {
  const lookup: HolderLookup = new Map();

  for (const holder of topHolders) {
    lookup.set(holder.address.toLowerCase(), {
      rank: holder.rank,
      percentage: holder.percentage,
    });
  }

  return lookup;
}

function buildSmartMoneyMatches(
  topHolders: AveTopHolder[],
  smartWallets: AveSmartWallet[]
): SmartMoneyMatch[] {
  const smartWalletLookup = new Map(
    smartWallets.map((wallet) => [wallet.address.toLowerCase(), wallet] as const)
  );

  return topHolders
    .filter((holder) => smartWalletLookup.has(holder.address.toLowerCase()))
    .map((holder) => {
      const smartWallet = smartWalletLookup.get(holder.address.toLowerCase())!;
      return {
        address: holder.address,
        rank: holder.rank,
        percentage: holder.percentage,
        tag: smartWallet.tag ?? smartWallet.tagItems[0] ?? null,
      };
    });
}

function buildUnavailableAddressScore(
  trackedAddress: TrackedAddressConfig,
  message: string,
  options: {
    top100Rank: number | null;
    top100Percentage: number | null;
    isSmartWallet: boolean;
    smartMoneyMatchedCount: number;
  }
): AddressScore {
  let buyLikelihoodScore = 0;
  const evidence = [message];

  if (options.top100Rank !== null) {
    buyLikelihoodScore += options.top100Rank <= 20 ? 32 : 24;
    evidence.push(
      `${trackedAddress.label} is already in the token top100 at rank #${options.top100Rank}.`
    );
  }

  if (options.isSmartWallet) {
    buyLikelihoodScore += 18;
    evidence.push(`${trackedAddress.label} is tagged by AVE as a smart wallet.`);
  }

  if (options.smartMoneyMatchedCount >= 3) {
    buyLikelihoodScore += 10;
    evidence.push(
      "The token already has strong smart-money overlap, which keeps this address on watch even without recent history."
    );
  } else if (options.smartMoneyMatchedCount >= 1) {
    buyLikelihoodScore += 4;
  }

  return attachAddressDisplay({
    score: {
      id: trackedAddress.id,
      label: trackedAddress.label,
      address: trackedAddress.address,
      narrativeAffinityScore: options.top100Rank !== null ? 42 : 12,
      buyLikelihoodScore: clamp(buyLikelihoodScore),
      styleLabels: options.isSmartWallet
        ? ["history-unavailable", "ave-smart-wallet"]
        : ["history-unavailable"],
      launchpadBias: "unknown",
      confidence: "low",
      summary:
        options.top100Rank !== null || options.isSmartWallet
          ? "Recent address history is unavailable, but holder and smart-wallet context still make this address worth monitoring."
          : "No usable recent address history is available yet for this tracked address.",
      evidence,
      sourceStatus: "unavailable",
    },
    config: trackedAddress,
    top100Rank: options.top100Rank,
    top100Percentage: options.top100Percentage,
  });
}

function buildAddressSummaryWithContext(
  score: AddressScore,
  options: {
    top100Rank: number | null;
    top100Percentage: number | null;
    isSmartWallet: boolean;
    smartMoneyMatchedCount: number;
  }
): string {
  const clauses = [score.summary];

  if (options.top100Rank !== null) {
    clauses.push(
      `This address is also a token top100 holder at rank #${options.top100Rank}.`
    );
  }

  if (options.isSmartWallet) {
    clauses.push("AVE also tags this address as a smart wallet.");
  }

  if (options.smartMoneyMatchedCount >= 3) {
    clauses.push("The token already shows strong smart-money participation.");
  }

  return clauses.join(" ");
}

function applyTrackedAddressContext(input: {
  trackedAddress: TrackedAddressConfig;
  baseScore: AddressScore;
  top100Rank: number | null;
  top100Percentage: number | null;
  isSmartWallet: boolean;
  smartMoneyMatchedCount: number;
}): AddressScore {
  let adjustedBuyLikelihood = input.baseScore.buyLikelihoodScore;
  const styleLabels = [...input.baseScore.styleLabels];
  const evidence = [...input.baseScore.evidence];

  if (input.top100Rank !== null) {
    adjustedBuyLikelihood += input.top100Rank <= 20 ? 14 : 9;
    styleLabels.push("top100-holder");
    evidence.unshift(
      `This tracked address is already in the token top100 at rank #${input.top100Rank}.`
    );
  }

  if (input.isSmartWallet) {
    adjustedBuyLikelihood += 10;
    styleLabels.push("ave-smart-wallet");
    evidence.unshift("AVE tags this tracked address as a smart wallet.");
  } else if (input.smartMoneyMatchedCount >= 3) {
    adjustedBuyLikelihood += 6;
    evidence.push(
      "The token already has strong smart-money overlap, which supports the buy case."
    );
  } else if (input.smartMoneyMatchedCount >= 1) {
    adjustedBuyLikelihood += 3;
  }

  return attachAddressDisplay({
    score: {
      ...input.baseScore,
      buyLikelihoodScore: clamp(Math.round(adjustedBuyLikelihood)),
      styleLabels: Array.from(new Set(styleLabels)),
      summary: buildAddressSummaryWithContext(input.baseScore, {
        top100Rank: input.top100Rank,
        top100Percentage: input.top100Percentage,
        isSmartWallet: input.isSmartWallet,
        smartMoneyMatchedCount: input.smartMoneyMatchedCount,
      }),
      evidence: Array.from(new Set(evidence)).slice(0, 6),
    },
    config: input.trackedAddress,
    top100Rank: input.top100Rank,
    top100Percentage: input.top100Percentage,
  });
}

function getMiniMaxScorerState(): {
  scorer: ReturnType<typeof createMiniMaxScorer> | null;
  errors: string[];
} {
  const errors: string[] = [];

  if (!isMiniMaxEnabled(process.env)) {
    return {
      scorer: null,
      errors,
    };
  }

  try {
    const apiKey = process.env.MINIMAX_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim() || "";
    const baseUrl = process.env.MINIMAX_BASE_URL?.trim() || process.env.ANTHROPIC_BASE_URL?.trim();
    const apiStyle = process.env.MINIMAX_API_STYLE?.trim().toLowerCase() === "openai"
      ? "openai" as const
      : "anthropic" as const;
    const plan = process.env.MINIMAX_PLAN?.trim().toLowerCase() === "coding"
      ? "coding" as const
      : "token" as const;

    return {
      scorer: createMiniMaxScorer({
        apiKey,
        apiHost: process.env.MINIMAX_API_HOST,
        baseUrl,
        apiStyle,
        plan,
        model: process.env.MINIMAX_MODEL,
        fastModeTimeoutMs: MINIMAX_SCORING_TIMEOUT_MS,
      }),
      errors,
    };
  } catch (error) {
    logMiniMaxFallback("provider setup", error);
    errors.push("MiniMax scoring is not configured correctly.");
    return {
      scorer: null,
      errors,
    };
  }
}

async function scoreEnabledPersonas(
  token: TokenBrief,
  minimaxScorer: ReturnType<typeof createMiniMaxScorer> | null
): Promise<{
  personaScores: PersonaScore[];
  errors: string[];
}> {
  const personas = getEnabledPersonas();
  const errors: string[] = [];

  const personaScores = await Promise.all(
    personas.map(async (persona) => {
      if (persona.id !== "cz") {
        errors.push(`Unsupported persona config: ${persona.id}.`);
        return null;
      }

      if (!minimaxScorer) {
        return scoreCzAffinity(token, { persona });
      }

      const deterministic = scoreCzAffinity(token, { persona });
      try {
        return await minimaxScorer.scoreCzAffinity({ token, persona });
      } catch (error) {
        logMiniMaxFallback(`persona ${persona.id}`, error);
        errors.push(
          `Persona scoring for ${persona.label} fell back to deterministic rules.`
        );
        return deterministic;
      }
    })
  );

  return {
    personaScores: personaScores.filter(
      (persona): persona is PersonaScore => Boolean(persona)
    ),
    errors,
  };
}

async function fetchTrackedAddressScore(input: {
  token: TokenBrief;
  trackedAddress: TrackedAddressConfig;
  holderLookup: HolderLookup;
  smartWalletLookup: Map<string, AveSmartWallet>;
  smartMoneyMatchedCount: number;
  minimaxScorer: ReturnType<typeof createMiniMaxScorer> | null;
  aveClient: AveDataClient;
  metricsRecorder: ReturnType<typeof createMetricsRecorder>;
}): Promise<{ score: AddressScore; error?: string }> {
  const addressKey = input.trackedAddress.address.toLowerCase();
  const holderState = input.holderLookup.get(addressKey);
  const smartWallet = input.smartWalletLookup.get(addressKey);

  try {
    const transactions = await fetchAddressTransactionsLive({
      walletAddress: input.trackedAddress.address,
      tokenAddress: input.token.address,
      pageSize: RECENT_HISTORY_PAGE_SIZE,
      metricsRecorder: input.metricsRecorder,
    });
    const history = buildNormalizedHistoryFromTransactions({
      walletAddress: input.trackedAddress.address,
      token: input.token,
      transactions,
    });

    if (history.trades.length === 0) {
      return {
        score: buildUnavailableAddressScore(
          input.trackedAddress,
          `No recent address history was returned for ${input.trackedAddress.label}.`,
          {
            top100Rank: holderState?.rank ?? null,
            top100Percentage: holderState?.percentage ?? null,
            isSmartWallet: Boolean(smartWallet),
            smartMoneyMatchedCount: input.smartMoneyMatchedCount,
          }
        ),
      };
    }

    const extractedScore = analyzeAddressAffinity({
      token: input.token,
      history,
      subject: {
        id: input.trackedAddress.id,
        label: input.trackedAddress.label,
        address: input.trackedAddress.address,
      },
      sourceStatus: "live",
      trackedAddressConfig: input.trackedAddress,
      top100Rank: holderState?.rank ?? null,
      top100Percentage: holderState?.percentage ?? null,
    });
    const deterministicScore = applyTrackedAddressContext({
      trackedAddress: input.trackedAddress,
      baseScore: extractedScore,
      top100Rank: holderState?.rank ?? null,
      top100Percentage: holderState?.percentage ?? null,
      isSmartWallet: Boolean(smartWallet),
      smartMoneyMatchedCount: input.smartMoneyMatchedCount,
    });

    if (!input.minimaxScorer) {
      return {
        score: deterministicScore,
      };
    }

    try {
      const mmResult = await input.minimaxScorer.scoreTrackedAddressAffinity({
        token: input.token,
        trackedAddress: input.trackedAddress,
        deterministicScore,
        recentTradeCount: history.trades.length,
        top100Rank: holderState?.rank ?? null,
        top100Percentage: holderState?.percentage ?? null,
        isSmartWallet: Boolean(smartWallet),
        smartMoneyMatchedCount: input.smartMoneyMatchedCount,
      });

      return {
        score: attachAddressDisplay({
          score: {
            ...deterministicScore,
            narrativeAffinityScore: mmResult.narrativeAffinityScore,
            buyLikelihoodScore: mmResult.buyLikelihoodScore,
            confidence: mmResult.confidence,
            summary: mmResult.summary,
            evidence: Array.from(
              new Set([...mmResult.evidence, ...deterministicScore.evidence])
            ).slice(0, 6),
            styleLabels: Array.from(
              new Set([...deterministicScore.styleLabels, "minimax-final"])
            ),
          },
          config: input.trackedAddress,
          top100Rank: holderState?.rank ?? null,
          top100Percentage: holderState?.percentage ?? null,
        }),
      };
    } catch (error) {
      logMiniMaxFallback(`tracked address ${input.trackedAddress.id}`, error);
      return {
        score: deterministicScore,
        error: `Tracked address final scoring fell back to deterministic rules for ${input.trackedAddress.label}.`,
      };
    }
  } catch {
    return {
      score: buildUnavailableAddressScore(
        input.trackedAddress,
        `Recent address history is temporarily unavailable for ${input.trackedAddress.label}.`,
        {
          top100Rank: holderState?.rank ?? null,
          top100Percentage: holderState?.percentage ?? null,
          isSmartWallet: Boolean(smartWallet),
          smartMoneyMatchedCount: input.smartMoneyMatchedCount,
        }
      ),
      error: `Tracked address history failed for ${input.trackedAddress.label}.`,
    };
  }
}

async function fetchMarketContext(
  tokenAddress: string,
  aveClient: AveDataClient
): Promise<{
  topHolders: AveTopHolder[];
  smartSnapshot: SmartMoneySnapshot | null;
  smartWalletItems: AveSmartWallet[];
  errors: string[];
}> {
  const errors: string[] = [];

  const [topHoldersResult, smartWalletResult] = await Promise.allSettled([
    aveClient.fetchTokenTopHolders({
      tokenAddress,
      chain: "bsc",
      limit: 100,
    }),
    aveClient.fetchSmartWalletList({ chain: "bsc" }),
  ]);

  const topHolders =
    topHoldersResult.status === "fulfilled" ? topHoldersResult.value : [];
  if (topHoldersResult.status === "rejected") {
    errors.push("Top100 holder data is temporarily unavailable.");
  }

  const existingSnapshot = getSmartMoneySnapshot();
  const usableSnapshot =
    existingSnapshot &&
    isSnapshotValid(existingSnapshot) &&
    existingSnapshot.addresses.length > 0 &&
    existingSnapshot.wallets.length > 0
      ? existingSnapshot
      : null;

  const smartWalletItems =
    usableSnapshot !== null
      ? Object.values(usableSnapshot.walletMap)
      : smartWalletResult.status === "fulfilled"
        ? smartWalletResult.value.items
        : [];
  if (smartWalletResult.status === "rejected" && usableSnapshot === null) {
    errors.push("Smart-money snapshot is temporarily unavailable.");
  }

  return {
    topHolders,
    smartSnapshot: usableSnapshot,
    smartWalletItems,
    errors,
  };
}

export async function scoreTokenRequest(
  input: ScoreTokenRequest
): Promise<ScoreTokenResponse> {
  const chain = input.chain ?? "bsc";
  const { client: aveClient, metrics: metricsRecorder } = createAveClientWithMetrics();
  const token = await aveClient.fetchTokenBrief({
    tokenAddress: input.tokenAddress,
    chain,
  });
  const minimaxScorerState = getMiniMaxScorerState();

  const [{ personaScores, errors: personaErrors }, marketContext] =
    await Promise.all([
      scoreEnabledPersonas(token, minimaxScorerState.scorer),
      fetchMarketContext(token.address, aveClient),
    ]);

  const smartMoneyMatches = buildSmartMoneyMatches(
    marketContext.topHolders,
    marketContext.smartWalletItems
  );
  const smartMoney = buildSmartMoneyScore(smartMoneyMatches);
  const holderLookup = buildHolderLookup(marketContext.topHolders);
  const smartWalletLookup = new Map(
    marketContext.smartWalletItems.map((wallet) => [
      wallet.address.toLowerCase(),
      wallet,
    ] as const)
  );
  const trackedAddresses = getEnabledTrackedAddresses();
  const trackedAddressResults = await Promise.all(
    trackedAddresses.map((trackedAddress) =>
      fetchTrackedAddressScore({
        token,
        trackedAddress,
        holderLookup,
        smartWalletLookup,
        smartMoneyMatchedCount: smartMoney.matchedCount,
        minimaxScorer: minimaxScorerState.scorer,
        aveClient,
        metricsRecorder,
      })
    )
  );
  const addressScores = trackedAddressResults
    .map((result) => result.score)
    .sort((left, right) => {
      const leftLevel = getDisplayLevelFromScore(left.buyLikelihoodScore);
      const rightLevel = getDisplayLevelFromScore(right.buyLikelihoodScore);
      const leftWeight =
        leftLevel === "LOVE_LOVE" ? 2 : leftLevel === "LOVE" ? 1 : 0;
      const rightWeight =
        rightLevel === "LOVE_LOVE" ? 2 : rightLevel === "LOVE" ? 1 : 0;

      if (rightWeight !== leftWeight) {
        return rightWeight - leftWeight;
      }

      if (right.buyLikelihoodScore !== left.buyLikelihoodScore) {
        return right.buyLikelihoodScore - left.buyLikelihoodScore;
      }

      return left.label.localeCompare(right.label);
    });
  const errors = [
    ...minimaxScorerState.errors,
    ...personaErrors,
    ...marketContext.errors,
    ...trackedAddressResults
      .map((result) => result.error)
      .filter((error): error is string => Boolean(error)),
  ];

  const snapshotInfo = marketContext.smartSnapshot;
  const cacheExpiresAt = snapshotInfo
    ? snapshotInfo.expiresAt
    : new Date(Date.now() + 300_000).toISOString();

  return {
    token,
    personaScores,
    addressScores,
    smartMoney,
    recommendation: buildRecommendation({
      personaScores,
      addressScores,
      smartMoney,
    }),
    cache: {
      hit: snapshotInfo ? isSnapshotValid(snapshotInfo) : false,
      expiresAt: cacheExpiresAt,
    },
    errors,
  };
}

export { AveApiError, AveConfigurationError };
