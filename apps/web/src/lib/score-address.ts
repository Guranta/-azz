import {
  AveApiError,
  AveConfigurationError,
  buildAddressProfile,
  buildFallbackAddressProfile,
  createAveDataClient,
  createMiniMaxScorerFromEnv,
  getMiniMaxFailureCode,
  getMiniMaxFailureDetail,
  isBscAddress,
  isMiniMaxEnabled,
  MiniMaxApiError,
  MiniMaxConfigurationError,
  type AddressHistoryTradeInput,
  type AddressProfile,
  type AddressProfileArchetype,
  type AddressProfileRecentToken,
  type AveAddressTransaction,
  type AveDataClient,
  type NormalizedAddressHistoryInput,
  type ScoreAddressProfile,
  type ScoreAddressResponse,
  type TokenBrief,
} from "@meme-affinity/core";
import { createMetricsRecorder } from "@/lib/runtime-metrics";

const RECENT_HISTORY_PAGE_SIZE = 100;
const RECENT_TOKEN_LOOKUP_LIMIT = 8;
const ADDRESS_CACHE_TTL_MS = 300_000;
const DEFAULT_AVE_BASE_URL = "https://prod.ave-api.com";
const DEFAULT_AVE_TIMEOUT_MS = 10_000;
const INSUFFICIENT_PROFILE_TRADE_COUNT = 3;

const BASE_ASSET_SYMBOLS = new Set([
  "BNB",
  "WBNB",
  "USDT",
  "USDC",
  "FDUSD",
  "BUSD",
]);

const addressProfileCache = new Map<
  string,
  {
    profile: ScoreAddressProfile;
    errors: string[];
    expiresAtEpochMs: number;
  }
>();

type TokenEvent = {
  side: "buy" | "sell";
  tokenAddress: string | null;
  symbol: string | null;
  time: string | null;
  usdValue: number | null;
};

type RecentTokenContext = {
  token: TokenBrief;
  tradeCount: number;
  lastTradedAt: string | null;
};

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

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
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
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
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

function buildRecentTokenCandidates(events: TokenEvent[]): string[] {
  const seen = new Set<string>();
  const addresses: string[] = [];

  for (const event of [...events].sort((left, right) => parseTime(right.time) - parseTime(left.time))) {
    const tokenAddress = normalizeTokenAddress(event.tokenAddress);
    if (!tokenAddress || seen.has(tokenAddress)) {
      continue;
    }

    seen.add(tokenAddress);
    addresses.push(tokenAddress);

    if (addresses.length >= RECENT_TOKEN_LOOKUP_LIMIT) {
      break;
    }
  }

  return addresses;
}

function inferLaunchpadFromAddressSuffix(
  tokenAddress: string
): TokenBrief["launchpad"] {
  const normalized = tokenAddress.toLowerCase();

  if (normalized.endsWith("4444")) {
    return "fourmeme";
  }

  if (normalized.endsWith("7777") || normalized.endsWith("8888")) {
    return "flap";
  }

  return "unknown";
}

function resolveTokenLaunchpad(token: TokenBrief): TokenBrief {
  if (token.launchpad !== "unknown") {
    return token;
  }

  const inferredLaunchpad = inferLaunchpadFromAddressSuffix(token.address);
  if (inferredLaunchpad === "unknown") {
    return token;
  }

  return {
    ...token,
    launchpad: inferredLaunchpad,
  };
}

async function buildEligibleTokenLookup(input: {
  candidateAddresses: string[];
  aveClient: AveDataClient;
}): Promise<{
  tokenLookup: Map<string, TokenBrief>;
  errors: string[];
}> {
  const errors: string[] = [];
  if (input.candidateAddresses.length === 0) {
    return {
      tokenLookup: new Map<string, TokenBrief>(),
      errors,
    };
  }

  const settled = await Promise.allSettled(
    input.candidateAddresses.map((tokenAddress) =>
      input.aveClient.fetchTokenBrief({
        tokenAddress,
        chain: "bsc",
      })
    )
  );
  const tokenLookup = new Map<string, TokenBrief>();
  let rejectedCount = 0;

  settled.forEach((result) => {
    if (result.status === "rejected") {
      rejectedCount += 1;
      return;
    }

    const resolvedToken = resolveTokenLaunchpad(result.value);
    if (
      resolvedToken.launchpad === "fourmeme" ||
      resolvedToken.launchpad === "flap"
    ) {
      tokenLookup.set(resolvedToken.address.toLowerCase(), resolvedToken);
    }
  });

  if (tokenLookup.size === 0 && rejectedCount > 0) {
    errors.push(
      "Recent token metadata was temporarily unavailable, so the wallet profile stayed conservative."
    );
  } else if (tokenLookup.size > 0 && rejectedCount > 0) {
    errors.push(
      "Some recent token metadata could not be resolved, so the wallet profile uses partial context."
    );
  }

  return {
    tokenLookup,
    errors,
  };
}

function buildRecentTokenContext(input: {
  events: TokenEvent[];
  tokenLookup: Map<string, TokenBrief>;
  trades: AddressHistoryTradeInput[];
}): AddressProfileRecentToken[] {
  const context = new Map<string, RecentTokenContext>();

  for (const event of input.events) {
    const tokenAddress = normalizeTokenAddress(event.tokenAddress);
    if (!tokenAddress) {
      continue;
    }

    const token = input.tokenLookup.get(tokenAddress);
    if (!token) {
      continue;
    }

    const current = context.get(tokenAddress);
    const eventEpoch = parseTime(event.time);
    const currentEpoch = parseTime(current?.lastTradedAt ?? null);

    context.set(tokenAddress, {
      token,
      tradeCount: (current?.tradeCount ?? 0) + 1,
      lastTradedAt:
        eventEpoch > currentEpoch ? event.time : (current?.lastTradedAt ?? event.time),
    });
  }

  const tokenTradeStats = new Map<
    string,
    { roiPct: number | null; holdMinutes: number | null }
  >();
  for (const trade of input.trades) {
    const tokenAddress = normalizeTokenAddress(
      trade.tokenAddress ?? trade.token_address
    );
    if (!tokenAddress) {
      continue;
    }

    const roiPct = coerceNumber(trade.roiPct ?? trade.roi_pct);
    const holdMinutes = coerceNumber(trade.holdMinutes ?? trade.hold_minutes);
    const existing = tokenTradeStats.get(tokenAddress);

    if (roiPct !== null || holdMinutes !== null) {
      tokenTradeStats.set(tokenAddress, {
        roiPct: roiPct ?? existing?.roiPct ?? null,
        holdMinutes: holdMinutes ?? existing?.holdMinutes ?? null,
      });
    } else if (!existing) {
      tokenTradeStats.set(tokenAddress, {
        roiPct: null,
        holdMinutes: null,
      });
    }
  }

  return [...context.entries()]
    .sort((left, right) => {
      const timeDelta = parseTime(right[1].lastTradedAt) - parseTime(left[1].lastTradedAt);
      if (timeDelta !== 0) {
        return timeDelta;
      }

      const tradeDelta = right[1].tradeCount - left[1].tradeCount;
      if (tradeDelta !== 0) {
        return tradeDelta;
      }

      return left[1].token.symbol.localeCompare(right[1].token.symbol);
    })
    .slice(0, 10)
    .map(([tokenAddress, item]) => {
      const stats = tokenTradeStats.get(tokenAddress) ?? {
        roiPct: null,
        holdMinutes: null,
      };

      return {
        tokenAddress,
        symbol: item.token.symbol,
        launchpad: item.token.launchpad,
        narrativeTags: item.token.narrativeTags.slice(0, 5),
        roiPct: stats.roiPct,
        holdMinutes: stats.holdMinutes,
      };
    });
}

function buildNormalizedHistoryFromTransactions(input: {
  walletAddress: string;
  transactions: AveAddressTransaction[];
  tokenLookup: Map<string, TokenBrief>;
}): NormalizedAddressHistoryInput {
  const orderedEvents = input.transactions
    .flatMap((transaction) => buildTokenEvents(transaction))
    .filter((event) => {
      const tokenAddress = normalizeTokenAddress(event.tokenAddress);
      return Boolean(tokenAddress && input.tokenLookup.has(tokenAddress));
    })
    .sort((left, right) => parseTime(left.time) - parseTime(right.time));
  const openBuys = new Map<string, TokenEvent[]>();
  const trades: AddressHistoryTradeInput[] = [];

  for (const event of orderedEvents) {
    const key = getTokenKey(event);
    const tokenAddress = normalizeTokenAddress(event.tokenAddress);
    if (!key || !tokenAddress) {
      continue;
    }

    const token = input.tokenLookup.get(tokenAddress);
    if (!token) {
      continue;
    }

    if (event.side === "buy") {
      const queue = openBuys.get(key) ?? [];
      queue.push({
        ...event,
        tokenAddress,
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
      tokenAddress,
      symbol: token.symbol,
      launchpad: token.launchpad,
      narrativeTags: token.narrativeTags,
      openedAt: matchedBuy?.time ?? null,
      closedAt: event.time,
      buyAmountUsd: matchedBuy?.usdValue ?? null,
      sellAmountUsd: event.usdValue,
      roiPct,
    });
  }

  for (const [key, queue] of openBuys.entries()) {
    const tokenAddress = normalizeTokenAddress(queue[0]?.tokenAddress);
    const token = tokenAddress ? input.tokenLookup.get(tokenAddress) : null;
    if (!token) {
      continue;
    }

    for (const event of queue) {
      trades.push({
        tokenAddress: tokenAddress ?? key,
        symbol: token.symbol,
        launchpad: token.launchpad,
        narrativeTags: token.narrativeTags,
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

function buildAddressCachePayload(input: {
  hit: boolean;
  expiresAtEpochMs: number;
}) {
  return {
    hit: input.hit,
    expiresAt: new Date(input.expiresAtEpochMs).toISOString(),
  };
}

function getMiniMaxScorerState(): {
  scorer: ReturnType<typeof createMiniMaxScorerFromEnv> | null;
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
    return {
      scorer: createMiniMaxScorerFromEnv(process.env),
      errors,
    };
  } catch (error) {
    logMiniMaxFallback("address profile provider setup", error);
    errors.push("MiniMax address-profile refinement is not configured correctly.");
    return {
      scorer: null,
      errors,
    };
  }
}

function mergeAddressProfile(
  deterministicProfile: AddressProfile,
  refinedProfile: Awaited<
    ReturnType<ReturnType<typeof createMiniMaxScorerFromEnv>["refineAddressProfile"]>
  >
): AddressProfile {
  return {
    ...deterministicProfile,
    style:
      refinedProfile.style.length > 0
        ? refinedProfile.style
        : deterministicProfile.style,
    riskAppetite: refinedProfile.riskAppetite,
    favoriteNarratives:
      refinedProfile.favoriteNarratives.length > 0
        ? refinedProfile.favoriteNarratives
        : deterministicProfile.favoriteNarratives,
    confidence: refinedProfile.confidence,
    summary: refinedProfile.summary,
    evidence: Array.from(
      new Set([...refinedProfile.evidence, ...deterministicProfile.evidence])
    ).slice(0, 6),
    refinementSource: "minimax",
  };
}

function hasStyle(profile: AddressProfile, styleLabel: string): boolean {
  return profile.style.includes(styleLabel);
}

function deriveProfileArchetype(
  profile: AddressProfile
): AddressProfileArchetype {
  const isUnavailable = profile.sourceStatus === "unavailable";
  const hasFastStyle =
    hasStyle(profile, "sniper") || hasStyle(profile, "scalper");
  const hasHolderStyle = hasStyle(profile, "holder");
  const hasRepeatBuyer = hasStyle(profile, "repeat-buyer");
  const isAggressive = profile.riskAppetite === "aggressive";
  const isDiamondRiskProfile =
    profile.riskAppetite === "cautious" || profile.riskAppetite === "balanced";

  if (
    profile.recentTradeCount < INSUFFICIENT_PROFILE_TRADE_COUNT ||
    isUnavailable
  ) {
    return "数据不足";
  }

  if (hasHolderStyle && isDiamondRiskProfile && hasRepeatBuyer) {
    return "钻石手";
  }

  if (hasFastStyle && isAggressive) {
    return "畜生";
  }

  if (hasHolderStyle && isDiamondRiskProfile) {
    return "钻石手";
  }

  if (hasFastStyle) {
    return "畜生";
  }

  return "P子";
}

function toScoreAddressProfile(profile: AddressProfile): ScoreAddressProfile {
  return {
    ...profile,
    archetype: deriveProfileArchetype(profile),
  };
}

export function createAddressErrorResponse(
  address: string,
  message: string
): ScoreAddressResponse {
  const expiresAtEpochMs = Date.now() + ADDRESS_CACHE_TTL_MS;
  const fallback = buildFallbackAddressProfile({
    address,
    sourceStatus: "unavailable",
    message,
  });

  return {
    address: { address, chain: "bsc" },
    profile: toScoreAddressProfile(fallback),
    cache: buildAddressCachePayload({
      hit: false,
      expiresAtEpochMs,
    }),
    errors: [message],
  };
}

export async function scoreAddressRequest(input: {
  address: string;
  chain?: "bsc";
}): Promise<ScoreAddressResponse> {
  if (input.chain && input.chain !== "bsc") {
    throw new AveConfigurationError(
      `Only the bsc chain is supported in v2. Received: ${input.chain}`
    );
  }

  const normalizedAddress = normalizeAddress(input.address);
  if (!isBscAddress(normalizedAddress)) {
    throw new AveConfigurationError(
      `Invalid BSC wallet address: ${normalizedAddress}`
    );
  }

  const cached = addressProfileCache.get(normalizedAddress);
  if (cached && cached.expiresAtEpochMs > Date.now()) {
    return {
      address: { address: normalizedAddress, chain: "bsc" },
      profile: cached.profile,
      cache: buildAddressCachePayload({
        hit: true,
        expiresAtEpochMs: cached.expiresAtEpochMs,
      }),
      errors: cached.errors,
    };
  }

  const { client: aveClient, metrics } = createAveClientWithMetrics();
  const transactions = await fetchAddressTransactionsLive({
    walletAddress: normalizedAddress,
    pageSize: RECENT_HISTORY_PAGE_SIZE,
    metricsRecorder: metrics,
  });
  const tokenEvents = transactions.flatMap((transaction) => buildTokenEvents(transaction));
  const candidateAddresses = buildRecentTokenCandidates(tokenEvents);
  const tokenLookupResult = await buildEligibleTokenLookup({
    candidateAddresses,
    aveClient,
  });
  const normalizedHistory = buildNormalizedHistoryFromTransactions({
    walletAddress: normalizedAddress,
    transactions,
    tokenLookup: tokenLookupResult.tokenLookup,
  });
  const recentTokens = buildRecentTokenContext({
    events: tokenEvents,
    tokenLookup: tokenLookupResult.tokenLookup,
    trades: normalizedHistory.trades,
  });
  const sourceStatus =
    transactions.length > 0 || candidateAddresses.length > 0 ? "live" : "unavailable";
  let profile: AddressProfile =
    normalizedHistory.trades.length > 0
      ? buildAddressProfile({
          history: normalizedHistory,
          recentTokens,
          sourceStatus,
        })
      : buildFallbackAddressProfile({
          address: normalizedAddress,
          sourceStatus,
          recentTokens,
          message:
            transactions.length > 0
              ? "No recent Fourmeme or Flap meme history was found for this address."
              : "AVE returned no recent history for this address.",
          evidence:
            transactions.length > 0
              ? [
                  "Recent address activity exists, but none of the sampled tokens resolved to Fourmeme or Flap meme activity.",
                  "This profile intentionally ignores non-Fourmeme and non-Flap activity.",
                ]
              : undefined,
        });

  const minimaxScorerState = getMiniMaxScorerState();
  const errors = [...minimaxScorerState.errors, ...tokenLookupResult.errors];

  if (minimaxScorerState.scorer && profile.recentTradeCount > 0) {
    try {
      const refinedProfile = await minimaxScorerState.scorer.refineAddressProfile({
        address: normalizedAddress,
        deterministicProfile: profile,
        recentTokenContext: recentTokens,
      });
      profile = mergeAddressProfile(profile, refinedProfile);
    } catch (error) {
      logMiniMaxFallback(`address profile ${normalizedAddress}`, error);
      errors.push("Address profile refinement fell back to deterministic rules.");
      profile = { ...profile, refinementSource: "minimax-fallback" };
    }
  }

  const apiProfile = toScoreAddressProfile(profile);
  const expiresAtEpochMs = Date.now() + ADDRESS_CACHE_TTL_MS;
  const response: ScoreAddressResponse = {
    address: { address: normalizedAddress, chain: "bsc" },
    profile: apiProfile,
    cache: buildAddressCachePayload({
      hit: false,
      expiresAtEpochMs,
    }),
    errors: Array.from(new Set(errors)),
  };

  addressProfileCache.set(normalizedAddress, {
    profile: apiProfile,
    errors: response.errors,
    expiresAtEpochMs,
  });

  return response;
}

export { AveApiError, AveConfigurationError };
