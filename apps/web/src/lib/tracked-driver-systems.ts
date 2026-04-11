import {
  attachAddressDisplay,
  AveApiError,
  AveConfigurationError,
  type AddressScore,
  type TokenBrief,
  type TrackedAddressConfig,
} from "@meme-affinity/core";
import {
  FROZEN_TRACKED_DRIVER_SYSTEMS,
  type DriverMarketCapBand,
  type DriverNameStyle,
  type FrozenTrackedDriverSystem,
} from "@/lib/tracked-driver-systems.data";
import { createMetricsRecorder } from "@/lib/runtime-metrics";

const DEFAULT_AVE_BASE_URL = "https://prod.ave-api.com";

type DriverRiskLevel = "low" | "medium" | "high" | "critical" | "unknown";

export type FrozenDriverTokenContext = {
  token: TokenBrief;
  marketCapBand: DriverMarketCapBand;
  marketCapUsd: number | null;
  nameStyles: DriverNameStyle[];
};

export type FrozenDriverMiniMaxContext = {
  sampledTradeCount: number;
  driverProfileSummary: string;
  driverFavoriteNarratives: string[];
  preferredBuySizeBand: string;
  preferredCapBand: DriverMarketCapBand | "unknown";
  preferredNameStyles: DriverNameStyle[];
  tokenCurrentCapBand: DriverMarketCapBand;
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeAveBaseUrl(value: string | undefined): string {
  const baseUrl = (value || DEFAULT_AVE_BASE_URL).trim();
  return baseUrl.replace(/\/+$/, "");
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectValuesForKeys(
  input: unknown,
  keyCandidates: string[],
  depth = 0
): unknown[] {
  if (depth > 4 || input === null || input === undefined) {
    return [];
  }

  if (Array.isArray(input)) {
    return input.flatMap((item) =>
      collectValuesForKeys(item, keyCandidates, depth + 1)
    );
  }

  if (!isRecord(input)) {
    return [];
  }

  const matches: unknown[] = [];

  for (const [key, value] of Object.entries(input)) {
    const normalizedKey = key.toLowerCase();
    if (keyCandidates.includes(normalizedKey)) {
      matches.push(value);
    }

    if (Array.isArray(value) || isRecord(value)) {
      matches.push(...collectValuesForKeys(value, keyCandidates, depth + 1));
    }
  }

  return matches;
}

function marketCapToBand(value: number | null): DriverMarketCapBand {
  if (value === null || value <= 0) {
    return "unknown";
  }

  if (value < 100_000) {
    return "micro";
  }

  if (value < 1_000_000) {
    return "small";
  }

  if (value < 10_000_000) {
    return "mid";
  }

  return "large";
}

export function classifyMarketCapBand(
  value: number | null
): DriverMarketCapBand {
  return marketCapToBand(value);
}

export function inferTokenNameStyles(token: TokenBrief): DriverNameStyle[] {
  const source = `${token.name} ${token.symbol}`;
  const styles: DriverNameStyle[] = [];

  if (/[\u4e00-\u9fff]/u.test(source)) {
    styles.push("chinese");
  }

  if (source.includes("#")) {
    styles.push("hashtag");
  }

  if (/ai/i.test(source)) {
    styles.push("ai");
  }

  if (/meme|dog|cat|frog|pepe|bonk|pup|inu/i.test(source)) {
    styles.push("meme");
  }

  if (/binance|bnb|cz|chain/i.test(source)) {
    styles.push("bnb-meta");
  }

  if (styles.length === 0) {
    styles.push("plain");
  }

  return Array.from(new Set(styles));
}

function getDominantValue<T extends string>(
  values: Array<{ value: T; count: number }>
): T | "unknown" {
  return values[0]?.value ?? "unknown";
}

function getTopValues<T extends string>(
  values: Array<{ value: T; count: number }>,
  limit = 3
): T[] {
  return values.slice(0, limit).map((item) => item.value);
}

function describeTicketSize(medianBuyUsd: number | null): string {
  if (medianBuyUsd === null) {
    return "unknown-ticket";
  }

  if (medianBuyUsd >= 1_000) {
    return "mid-large-ticket";
  }

  if (medianBuyUsd >= 300) {
    return "mid-ticket";
  }

  if (medianBuyUsd >= 100) {
    return "small-mid-ticket";
  }

  return "small-ticket";
}

function inferDriverRiskAppetite(
  driver: FrozenTrackedDriverSystem
): "cautious" | "balanced" | "aggressive" {
  if (
    driver.holdDurationBias.medianMinutes !== null &&
    driver.holdDurationBias.medianMinutes >= 1_440
  ) {
    return "balanced";
  }

  if ((driver.riskAppetite.medianBuyUsd ?? 0) >= 1_000) {
    return "aggressive";
  }

  if ((driver.riskAppetite.medianBuyUsd ?? 0) <= 120) {
    return "cautious";
  }

  if (driver.tradingRhythm.buyEventCount >= 40) {
    return "aggressive";
  }

  return "balanced";
}

function inferTradingRhythmLabel(driver: FrozenTrackedDriverSystem):
  | "fast-flip"
  | "slow-hold"
  | "selective"
  | "low-frequency" {
  if (driver.tradingRhythm.buyEventCount >= 60) {
    return "fast-flip";
  }

  if (
    driver.holdDurationBias.medianMinutes !== null &&
    driver.holdDurationBias.medianMinutes >= 1_440
  ) {
    return "slow-hold";
  }

  if (driver.tradingRhythm.buyEventCount >= 8) {
    return "selective";
  }

  return "low-frequency";
}

function scoreBandFit(
  band: DriverMarketCapBand,
  driver: FrozenTrackedDriverSystem
): number {
  if (band === "unknown") {
    return 8;
  }

  const ranked = driver.buyInMarketCapBand;
  const found = ranked.findIndex((item) => item.value === band);

  if (found === 0) {
    return 28;
  }

  if (found === 1) {
    return 18;
  }

  if (found === 2) {
    return 10;
  }

  const dominant = ranked[0]?.value ?? "unknown";
  if (
    (dominant === "micro" && band === "small") ||
    (dominant === "small" && band === "micro") ||
    (dominant === "mid" && band === "large") ||
    (dominant === "large" && band === "mid")
  ) {
    return 8;
  }

  return 0;
}

function scoreNameStyleFit(
  currentStyles: DriverNameStyle[],
  driver: FrozenTrackedDriverSystem
): number {
  const preferred = new Set(getTopValues(driver.tokenNameStyle, 4));
  const overlap = currentStyles.filter((style) => preferred.has(style)).length;

  if (overlap >= 2) {
    return 22;
  }

  if (overlap === 1) {
    return 12;
  }

  return preferred.has("plain") ? 6 : 0;
}

function scoreNarrativeFit(
  token: TokenBrief,
  driver: FrozenTrackedDriverSystem
): number {
  const preferredNarratives = getTopValues(driver.narrativePreference, 4);

  if (preferredNarratives.length === 0) {
    return 6;
  }

  const overlap = token.narrativeTags.filter((tag) =>
    preferredNarratives.includes(tag)
  ).length;

  if (overlap >= 2) {
    return 18;
  }

  if (overlap === 1) {
    return 10;
  }

  return 0;
}

function scoreLaunchpadFit(
  token: TokenBrief,
  driver: FrozenTrackedDriverSystem
): number {
  const dominant = getDominantValue(driver.launchpadBias);

  if (dominant === "unknown") {
    return 6;
  }

  return dominant === token.launchpad ? 12 : 0;
}

function scoreRiskFit(
  token: TokenBrief,
  driver: FrozenTrackedDriverSystem
): number {
  const appetite = inferDriverRiskAppetite(driver);
  const riskLevel = token.risk.riskLevel.toLowerCase() as DriverRiskLevel;

  if (appetite === "aggressive") {
    if (riskLevel === "high" || riskLevel === "critical") {
      return 12;
    }

    if (riskLevel === "medium") {
      return 10;
    }

    return 6;
  }

  if (appetite === "cautious") {
    if (riskLevel === "low") {
      return 12;
    }

    if (riskLevel === "medium") {
      return 7;
    }

    return 2;
  }

  if (riskLevel === "medium") {
    return 10;
  }

  if (riskLevel === "low") {
    return 8;
  }

  return 5;
}

function scoreRhythmFit(
  tokenContext: FrozenDriverTokenContext,
  driver: FrozenTrackedDriverSystem
): number {
  const rhythm = inferTradingRhythmLabel(driver);

  if (rhythm === "fast-flip") {
    if (tokenContext.marketCapBand === "micro") {
      return 10;
    }

    if (tokenContext.marketCapBand === "small") {
      return 6;
    }

    return 2;
  }

  if (rhythm === "slow-hold") {
    if (
      tokenContext.marketCapBand === "large" ||
      tokenContext.marketCapBand === "mid"
    ) {
      return 10;
    }

    return 3;
  }

  return 6;
}

function buildDriverEvidence(
  driver: FrozenTrackedDriverSystem,
  tokenContext: FrozenDriverTokenContext,
  options: {
    top100Rank: number | null;
    isSmartWallet: boolean;
    smartMoneyMatchedCount: number;
  }
): string[] {
  const evidence = [
    `Frozen driver sample: ${driver.sampledTradeCount} recent meme transactions, captured ${driver.sampledAt}.`,
    `Preferred market-cap bands: ${getTopValues(driver.buyInMarketCapBand).join(", ") || "unknown"}. Current token band: ${tokenContext.marketCapBand}.`,
    `Preferred naming styles: ${getTopValues(driver.tokenNameStyle).join(", ") || "unknown"}. Current token styles: ${tokenContext.nameStyles.join(", ")}.`,
    `Observed rhythm: ${inferTradingRhythmLabel(driver)} with ${describeTicketSize(driver.riskAppetite.medianBuyUsd)} sizing.`,
  ];

  if (options.top100Rank !== null) {
    evidence.push(
      `This tracked address is already in the token top100 at rank #${options.top100Rank}.`
    );
  }

  if (options.isSmartWallet) {
    evidence.push("AVE tags this tracked address as a smart wallet.");
  }

  if (options.smartMoneyMatchedCount >= 1) {
    evidence.push(
      `Token smart-money matchedCount is ${options.smartMoneyMatchedCount}.`
    );
  }

  return evidence.slice(0, 6);
}

function buildDriverSummary(
  driver: FrozenTrackedDriverSystem,
  tokenContext: FrozenDriverTokenContext,
  buyLikelihoodScore: number
): string {
  const appetite = inferDriverRiskAppetite(driver);
  const rhythm = inferTradingRhythmLabel(driver);
  const dominantBand = getDominantValue(driver.buyInMarketCapBand);
  const tone =
    buyLikelihoodScore >= 70
      ? "strong fit"
      : buyLikelihoodScore >= 40
        ? "partial fit"
        : "weak fit";

  return `${driver.id} frozen profile shows ${rhythm}, ${appetite} risk appetite, and a ${dominantBand} market-cap bias. The current token looks like a ${tone} against that archived playbook.`;
}

function buildDriverStyleLabels(
  driver: FrozenTrackedDriverSystem
): string[] {
  return Array.from(
    new Set([
      "frozen-driver",
      `driver-band:${getDominantValue(driver.buyInMarketCapBand)}`,
      `driver-rhythm:${inferTradingRhythmLabel(driver)}`,
      `driver-ticket:${describeTicketSize(driver.riskAppetite.medianBuyUsd)}`,
    ])
  );
}

function buildFrozenDriverMiniMaxContext(
  driver: FrozenTrackedDriverSystem,
  tokenContext: FrozenDriverTokenContext,
  buyLikelihoodScore: number
): FrozenDriverMiniMaxContext {
  return {
    sampledTradeCount: driver.sampledTradeCount,
    driverProfileSummary: buildDriverSummary(
      driver,
      tokenContext,
      buyLikelihoodScore
    ),
    driverFavoriteNarratives: getTopValues(driver.narrativePreference, 4),
    preferredBuySizeBand: describeTicketSize(driver.riskAppetite.medianBuyUsd),
    preferredCapBand: getDominantValue(driver.buyInMarketCapBand),
    preferredNameStyles: getTopValues(driver.tokenNameStyle, 4),
    tokenCurrentCapBand: tokenContext.marketCapBand,
  };
}

function getDriverConfidence(
  driver: FrozenTrackedDriverSystem
): AddressScore["confidence"] {
  if (driver.sampledTradeCount >= 80) {
    return "high";
  }

  if (driver.sampledTradeCount >= 20) {
    return "medium";
  }

  return "low";
}

export function getFrozenTrackedDriver(
  trackedAddress: Pick<TrackedAddressConfig, "id">
): FrozenTrackedDriverSystem | null {
  return FROZEN_TRACKED_DRIVER_SYSTEMS.drivers[trackedAddress.id] ?? null;
}

export async function buildFrozenDriverTokenContext(input: {
  token: TokenBrief;
  metricsRecorder: ReturnType<typeof createMetricsRecorder>;
}): Promise<FrozenDriverTokenContext> {
  const apiKey = process.env.AVE_API_KEY?.trim();
  const fallbackContext: FrozenDriverTokenContext = {
    token: input.token,
    marketCapBand: "unknown",
    marketCapUsd: null,
    nameStyles: inferTokenNameStyles(input.token),
  };

  if (!apiKey) {
    return fallbackContext;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  const path = `/v2/tokens/${input.token.address.toLowerCase()}-bsc`;

  try {
    const response = await fetch(
      `${normalizeAveBaseUrl(process.env.AVE_DATA_BASE_URL)}${path}`,
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
      throw new AveApiError("AVE token detail request failed", {
        path,
        statusCode: response.status,
        body: bodyText,
      });
    }

    const parsed = JSON.parse(bodyText) as unknown;
    const marketCapUsd =
      collectValuesForKeys(parsed, [
        "market_cap",
        "marketcap",
        "mcap",
        "fdv",
        "fdv_usd",
      ])
        .map((value) => coerceNumber(value))
        .find((value): value is number => value !== null) ?? null;

    input.metricsRecorder.recordTokenDetail();

    return {
      token: input.token,
      marketCapBand: marketCapToBand(marketCapUsd),
      marketCapUsd,
      nameStyles: inferTokenNameStyles(input.token),
    };
  } catch (error) {
    if (
      error instanceof AveApiError ||
      error instanceof AveConfigurationError ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      return fallbackContext;
    }

    return fallbackContext;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function scoreFrozenTrackedDriver(input: {
  trackedAddress: TrackedAddressConfig;
  tokenContext: FrozenDriverTokenContext;
  top100Rank: number | null;
  top100Percentage: number | null;
  isSmartWallet: boolean;
  smartMoneyMatchedCount: number;
}): {
  score: AddressScore;
  sampledTradeCount: number;
  minimaxContext: FrozenDriverMiniMaxContext;
} | null {
  const driver = getFrozenTrackedDriver(input.trackedAddress);

  if (!driver) {
    return null;
  }

  const marketCapFit = scoreBandFit(input.tokenContext.marketCapBand, driver);
  const nameStyleFit = scoreNameStyleFit(input.tokenContext.nameStyles, driver);
  const narrativeFit = scoreNarrativeFit(input.tokenContext.token, driver);
  const launchpadFit = scoreLaunchpadFit(input.tokenContext.token, driver);
  const riskFit = scoreRiskFit(input.tokenContext.token, driver);
  const rhythmFit = scoreRhythmFit(input.tokenContext, driver);

  const narrativeAffinityScore = clamp(
    Math.round(10 + marketCapFit + nameStyleFit + narrativeFit + launchpadFit)
  );

  let buyLikelihoodScore = clamp(
    Math.round(
      8 +
        marketCapFit +
        nameStyleFit +
        narrativeFit +
        launchpadFit +
        riskFit +
        rhythmFit
    )
  );

  if (input.top100Rank !== null) {
    buyLikelihoodScore += input.top100Rank <= 20 ? 14 : 9;
  }

  if (input.isSmartWallet) {
    buyLikelihoodScore += 10;
  }

  if (input.smartMoneyMatchedCount >= 3) {
    buyLikelihoodScore += 8;
  } else if (input.smartMoneyMatchedCount >= 1) {
    buyLikelihoodScore += 4;
  }

  const finalBuyLikelihood = clamp(buyLikelihoodScore);

  const score = attachAddressDisplay({
    score: {
      id: input.trackedAddress.id,
      label: input.trackedAddress.label,
      address: input.trackedAddress.address,
      narrativeAffinityScore,
      buyLikelihoodScore: finalBuyLikelihood,
      styleLabels: buildDriverStyleLabels(driver),
      launchpadBias: getDominantValue(driver.launchpadBias),
      confidence: getDriverConfidence(driver),
      summary: buildDriverSummary(
        driver,
        input.tokenContext,
        finalBuyLikelihood
      ),
      evidence: buildDriverEvidence(driver, input.tokenContext, {
        top100Rank: input.top100Rank,
        isSmartWallet: input.isSmartWallet,
        smartMoneyMatchedCount: input.smartMoneyMatchedCount,
      }),
      sourceStatus: "manual",
    },
    config: input.trackedAddress,
    top100Rank: input.top100Rank,
    top100Percentage: input.top100Percentage,
  });

  return {
    score,
    sampledTradeCount: driver.sampledTradeCount,
    minimaxContext: buildFrozenDriverMiniMaxContext(
      driver,
      input.tokenContext,
      finalBuyLikelihood
    ),
  };
}

export function buildFrozenDriverUnavailableScore(input: {
  trackedAddress: TrackedAddressConfig;
  top100Rank: number | null;
  top100Percentage: number | null;
  isSmartWallet: boolean;
  smartMoneyMatchedCount: number;
}): AddressScore {
  let buyLikelihoodScore = 0;
  const evidence = [
    "Frozen tracked-driver snapshot is unavailable, so this address falls back to holder context only.",
  ];

  if (input.top100Rank !== null) {
    buyLikelihoodScore += input.top100Rank <= 20 ? 32 : 24;
    evidence.push(
      `${input.trackedAddress.label} is already in the token top100 at rank #${input.top100Rank}.`
    );
  }

  if (input.isSmartWallet) {
    buyLikelihoodScore += 18;
    evidence.push(
      `${input.trackedAddress.label} is tagged by AVE as a smart wallet.`
    );
  }

  if (input.smartMoneyMatchedCount >= 3) {
    buyLikelihoodScore += 10;
    evidence.push("The token already has strong smart-money overlap.");
  } else if (input.smartMoneyMatchedCount >= 1) {
    buyLikelihoodScore += 4;
  }

  return attachAddressDisplay({
    score: {
      id: input.trackedAddress.id,
      label: input.trackedAddress.label,
      address: input.trackedAddress.address,
      narrativeAffinityScore: input.top100Rank !== null ? 42 : 12,
      buyLikelihoodScore: clamp(buyLikelihoodScore),
      styleLabels: ["frozen-driver-missing"],
      launchpadBias: "unknown",
      confidence: "low",
      summary:
        "Frozen tracked-driver data is missing, so only holder and smart-wallet context can be used.",
      evidence,
      sourceStatus: "unavailable",
    },
    config: input.trackedAddress,
    top100Rank: input.top100Rank,
    top100Percentage: input.top100Percentage,
  });
}
