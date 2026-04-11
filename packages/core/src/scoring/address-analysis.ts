import type {
  AddressProfile,
  AddressProfileRecentToken,
  AddressScore,
  TrackedAddressConfig,
  TokenBrief,
} from "../types";
import { attachAddressDisplay } from "./live-contract";

type HistoryLaunchpad = Exclude<AddressScore["launchpadBias"], "mixed">;
type RiskAppetiteLabel = "cautious" | "balanced" | "aggressive";
type HoldingStyle = "sniper" | "scalper" | "swing-trader" | "holder" | "unknown";
type ActivityLabel = "low-frequency" | "active" | "high-frequency";
type ConvictionPattern = "repeat-buyer" | "one-shot-rotator";

export interface AddressHistoryTradeInput {
  tokenAddress?: string | null;
  token_address?: string | null;
  symbol?: string | null;
  launchpad?: string | null;
  narrativeTags?: string[] | null;
  narrative_tags?: string[] | null;
  openedAt?: string | null;
  opened_at?: string | null;
  closedAt?: string | null;
  closed_at?: string | null;
  holdMinutes?: number | null;
  hold_minutes?: number | null;
  buyAmountUsd?: number | null;
  buy_amount_usd?: number | null;
  sellAmountUsd?: number | null;
  sell_amount_usd?: number | null;
  roiPct?: number | null;
  roi_pct?: number | null;
}

export interface NormalizedAddressHistoryInput {
  address: string;
  chain?: "bsc";
  source?: string;
  trades: AddressHistoryTradeInput[];
}

export interface AddressAnalysisSubject {
  id?: string;
  label?: string;
  address?: string;
}

export interface AnalyzeAddressAffinityInput {
  token: TokenBrief;
  history: NormalizedAddressHistoryInput;
  subject?: AddressAnalysisSubject;
  tokenAgeMinutes?: number | null;
  sourceStatus?: AddressScore["sourceStatus"];
  trackedAddressConfig?: Pick<TrackedAddressConfig, "logoKey" | "logoMode">;
  top100Rank?: number | null;
  top100Percentage?: number | null;
}

export interface NormalizedAddressTrade {
  tokenAddress: string | null;
  symbol: string | null;
  launchpad: HistoryLaunchpad;
  narrativeTags: string[];
  openedAt: string | null;
  closedAt: string | null;
  holdMinutes: number | null;
  buyAmountUsd: number | null;
  sellAmountUsd: number | null;
  roiPct: number | null;
}

export interface AddressStyleProfile {
  address: string;
  chain: "bsc";
  source: string;
  tradeCount: number;
  launchpadBias: AddressScore["launchpadBias"];
  launchpadCounts: Record<HistoryLaunchpad, number>;
  launchpadShares: Record<HistoryLaunchpad, number>;
  medianHoldMinutes: number | null;
  medianBuyAmountUsd: number | null;
  holdingStyle: HoldingStyle;
  activityLabel: ActivityLabel;
  convictionPattern: ConvictionPattern;
  riskAppetiteScore: number;
  riskAppetiteLabel: RiskAppetiteLabel;
  quickFlipRatio: number;
  sizingVolatilityRatio: number;
  launchpadRatio: number;
  styleLabels: string[];
  tagPreferences: Record<string, number>;
  favoriteNarratives: string[];
}

export interface AddressAffinityBreakdown {
  narrativeAffinityScore: number;
  launchpadMatchScore: number;
  ageFitScore: number;
  riskFitScore: number;
  buyLikelihoodScore: number;
}

function clamp(value: number, low = 0, high = 100): number {
  return Math.max(low, Math.min(high, value));
}

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function roundScore(value: number): number {
  return Math.round(clamp(value));
}

function coerceFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function trimString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeTag(value: string): string | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return normalized || null;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeLaunchpad(value: unknown): HistoryLaunchpad {
  const normalized = trimString(value)?.toLowerCase();

  if (normalized === "fourmeme") {
    return "fourmeme";
  }

  if (normalized === "flap" || normalized === "xflap") {
    return "flap";
  }

  return "unknown";
}

function parseIsoToEpoch(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const epoch = Date.parse(value);
  return Number.isNaN(epoch) ? null : epoch;
}

function deriveHoldMinutes(
  explicitHoldMinutes: number | null,
  openedAt: string | null,
  closedAt: string | null
): number | null {
  if (explicitHoldMinutes !== null) {
    return explicitHoldMinutes >= 0 ? explicitHoldMinutes : null;
  }

  const openedAtEpoch = parseIsoToEpoch(openedAt);
  const closedAtEpoch = parseIsoToEpoch(closedAt);
  if (openedAtEpoch === null || closedAtEpoch === null || closedAtEpoch < openedAtEpoch) {
    return null;
  }

  return roundTo((closedAtEpoch - openedAtEpoch) / 60_000);
}

function normalizeTrade(input: AddressHistoryTradeInput): NormalizedAddressTrade {
  const openedAt = trimString(input.openedAt ?? input.opened_at);
  const closedAt = trimString(input.closedAt ?? input.closed_at);
  const explicitHoldMinutes = coerceFiniteNumber(input.holdMinutes ?? input.hold_minutes);

  return {
    tokenAddress: trimString(input.tokenAddress ?? input.token_address),
    symbol: trimString(input.symbol),
    launchpad: normalizeLaunchpad(input.launchpad),
    narrativeTags: uniqueStrings(
      (input.narrativeTags ?? input.narrative_tags ?? [])
        .map((tag) => trimString(tag))
        .filter((tag): tag is string => Boolean(tag))
        .map((tag) => normalizeTag(tag))
        .filter((tag): tag is string => Boolean(tag))
    ),
    openedAt,
    closedAt,
    holdMinutes: deriveHoldMinutes(explicitHoldMinutes, openedAt, closedAt),
    buyAmountUsd: coerceFiniteNumber(input.buyAmountUsd ?? input.buy_amount_usd),
    sellAmountUsd: coerceFiniteNumber(input.sellAmountUsd ?? input.sell_amount_usd),
    roiPct: coerceFiniteNumber(input.roiPct ?? input.roi_pct),
  };
}

function median(values: number[]): number | null {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return roundTo((sorted[middle - 1] + sorted[middle]) / 2);
  }

  return roundTo(sorted[middle]);
}

function coefficientOfVariation(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (average === 0) {
    return 0;
  }

  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;

  return Math.sqrt(variance) / average;
}

function getHoldingStyle(holdMinutesValues: number[]): HoldingStyle {
  const medianHoldMinutes = median(holdMinutesValues);
  if (medianHoldMinutes === null) {
    return "unknown";
  }

  if (medianHoldMinutes <= 60) {
    return "sniper";
  }

  if (medianHoldMinutes <= 360) {
    return "scalper";
  }

  if (medianHoldMinutes <= 2_880) {
    return "swing-trader";
  }

  return "holder";
}

function getActivityLabel(tradeCount: number): ActivityLabel {
  if (tradeCount >= 20) {
    return "high-frequency";
  }

  if (tradeCount >= 8) {
    return "active";
  }

  return "low-frequency";
}

function getLaunchpadBias(
  launchpadCounts: Record<HistoryLaunchpad, number>,
  tradeCount: number
): AddressScore["launchpadBias"] {
  if (!tradeCount) {
    return "unknown";
  }

  const fourmemeShare = launchpadCounts.fourmeme / tradeCount;
  const flapShare = launchpadCounts.flap / tradeCount;

  if (fourmemeShare >= 0.6) {
    return "fourmeme";
  }

  if (flapShare >= 0.6) {
    return "flap";
  }

  if (launchpadCounts.fourmeme > 0 || launchpadCounts.flap > 0) {
    return "mixed";
  }

  return "unknown";
}

function getRiskAppetiteLabel(score: number): RiskAppetiteLabel {
  if (score >= 65) {
    return "aggressive";
  }

  if (score >= 35) {
    return "balanced";
  }

  return "cautious";
}

function getConvictionPattern(trades: NormalizedAddressTrade[]): ConvictionPattern {
  const tokenCounts = new Map<string, number>();

  for (const trade of trades) {
    const key = trade.tokenAddress ?? trade.symbol?.toLowerCase();
    if (!key) {
      continue;
    }

    tokenCounts.set(key, (tokenCounts.get(key) ?? 0) + 1);
  }

  return Array.from(tokenCounts.values()).some((count) => count >= 2)
    ? "repeat-buyer"
    : "one-shot-rotator";
}

function buildTagPreferenceMap(trades: NormalizedAddressTrade[]): Record<string, number> {
  const rawScores = new Map<string, number>();

  for (const trade of trades) {
    const roiBonus = trade.roiPct !== null ? Math.max(trade.roiPct, 0) / 50 : 0;

    for (const tag of trade.narrativeTags) {
      rawScores.set(tag, (rawScores.get(tag) ?? 0) + 1 + roiBonus);
    }
  }

  const topScore = Math.max(...rawScores.values(), 0);
  if (!topScore) {
    return {};
  }

  return Object.fromEntries(
    [...rawScores.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([tag, score]) => [tag, roundTo((score / topScore) * 100)])
  );
}

function buildStyleLabels(profile: {
  launchpadBias: AddressScore["launchpadBias"];
  holdingStyle: HoldingStyle;
  activityLabel: ActivityLabel;
  convictionPattern: ConvictionPattern;
  riskAppetiteLabel: RiskAppetiteLabel;
}): string[] {
  return [
    `${profile.launchpadBias}-launchpad`,
    profile.holdingStyle,
    profile.activityLabel,
    profile.convictionPattern,
    profile.riskAppetiteLabel,
  ];
}

function resolveSourceStatus(
  history: NormalizedAddressHistoryInput,
  tradeCount: number,
  override: AddressScore["sourceStatus"] | undefined
): AddressScore["sourceStatus"] {
  if (override) {
    return override;
  }

  if (!tradeCount) {
    return "unavailable";
  }

  return /mock|manual/i.test(history.source ?? "") ? "mock" : "live";
}

function resolveSubject(
  history: NormalizedAddressHistoryInput,
  subject: AddressAnalysisSubject | undefined
): Required<AddressAnalysisSubject> {
  const address = subject?.address?.trim() || history.address.trim();
  const label = subject?.label?.trim() || address;
  const id = subject?.id?.trim() || address.toLowerCase();

  return { id, label, address };
}

function getLaunchpadBiasAnalysis(
  trades: NormalizedAddressTrade[]
): Pick<
  AddressStyleProfile,
  "launchpadBias" | "launchpadCounts" | "launchpadShares" | "launchpadRatio"
> {
  const launchpadCounts: Record<HistoryLaunchpad, number> = {
    fourmeme: 0,
    flap: 0,
    unknown: 0,
  };

  for (const trade of trades) {
    launchpadCounts[trade.launchpad] += 1;
  }

  const tradeCount = trades.length;
  const launchpadShares: Record<HistoryLaunchpad, number> = {
    fourmeme: tradeCount ? roundTo(launchpadCounts.fourmeme / tradeCount) : 0,
    flap: tradeCount ? roundTo(launchpadCounts.flap / tradeCount) : 0,
    unknown: tradeCount ? roundTo(launchpadCounts.unknown / tradeCount) : 0,
  };

  return {
    launchpadBias: getLaunchpadBias(launchpadCounts, tradeCount),
    launchpadCounts,
    launchpadShares,
    launchpadRatio: tradeCount
      ? roundTo((launchpadCounts.fourmeme + launchpadCounts.flap) / tradeCount)
      : 0,
  };
}

function getRiskAppetiteScore(input: {
  launchpadRatio: number;
  quickFlipRatio: number;
  sizingVolatilityRatio: number;
}): number {
  return roundTo(
    clamp(
      30 +
        input.launchpadRatio * 30 +
        input.quickFlipRatio * 30 +
        input.sizingVolatilityRatio * 10
    )
  );
}

function getAgeFitScore(holdingStyle: HoldingStyle, ageMinutes: number | null | undefined): number {
  if (ageMinutes === null || ageMinutes === undefined) {
    return 50;
  }

  if (holdingStyle === "sniper" || holdingStyle === "scalper") {
    if (ageMinutes <= 120) {
      return 90;
    }

    if (ageMinutes <= 720) {
      return 65;
    }

    return 35;
  }

  if (holdingStyle === "swing-trader") {
    if (ageMinutes <= 240) {
      return 75;
    }

    if (ageMinutes <= 2_880) {
      return 85;
    }

    return 55;
  }

  if (holdingStyle === "holder") {
    if (ageMinutes <= 240) {
      return 45;
    }

    if (ageMinutes <= 2_880) {
      return 70;
    }

    return 85;
  }

  return 50;
}

function getRiskFitScore(walletRiskScore: number, tokenRiskScore: number | null): number {
  if (tokenRiskScore === null) {
    return 50;
  }

  return roundScore(100 - Math.abs(walletRiskScore - tokenRiskScore));
}

function describeBuyLikelihood(score: number): string {
  if (score >= 75) {
    return "looks like a strong fit";
  }

  if (score >= 60) {
    return "looks like a plausible fit";
  }

  if (score >= 45) {
    return "is possible but not especially strong";
  }

  return "looks weak on current wallet behavior";
}

function percentageLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function joinTags(tags: string[]): string {
  if (!tags.length) {
    return "no repeating narratives";
  }

  if (tags.length === 1) {
    return tags[0];
  }

  if (tags.length === 2) {
    return `${tags[0]} and ${tags[1]}`;
  }

  return `${tags.slice(0, -1).join(", ")}, and ${tags[tags.length - 1]}`;
}

function describeLaunchpadBias(value: AddressScore["launchpadBias"]): string {
  switch (value) {
    case "fourmeme":
      return "fourmeme-biased";
    case "flap":
      return "flap-biased";
    case "mixed":
      return "mixed-launchpad";
    default:
      return "venue-agnostic";
  }
}

function getRecentTokenName(token: AddressProfileRecentToken): string {
  return token.symbol || token.tokenAddress;
}

function sortRecentTokens(
  recentTokens: AddressProfileRecentToken[]
): AddressProfileRecentToken[] {
  return [...recentTokens].sort((left, right) =>
    getRecentTokenName(left).localeCompare(getRecentTokenName(right))
  );
}

function buildAddressProfileStyle(profile: AddressStyleProfile): string {
  return [
    describeLaunchpadBias(profile.launchpadBias),
    profile.holdingStyle,
    profile.activityLabel,
    profile.convictionPattern,
  ].join(" / ");
}

function determineAddressProfileConfidence(input: {
  tradeCount: number;
  recentTokenCount: number;
}): AddressProfile["confidence"] {
  if (input.tradeCount >= 10 && input.recentTokenCount >= 3) {
    return "high";
  }

  if (input.tradeCount >= 4 && input.recentTokenCount >= 1) {
    return "medium";
  }

  return "low";
}

function buildAddressProfileSummary(input: {
  profile: AddressStyleProfile;
  recentTokens: AddressProfileRecentToken[];
}): string {
  const { profile, recentTokens } = input;
  const recentFocus = recentTokens.length
    ? `Recent focus includes ${joinTags(
        recentTokens.slice(0, 3).map((token) => getRecentTokenName(token))
      )}.`
    : "Recent token focus is still thin in the sampled history.";

  return `This wallet reads as a ${describeLaunchpadBias(
    profile.launchpadBias
  )} ${profile.holdingStyle} with ${profile.riskAppetiteLabel} risk appetite across ${
    profile.tradeCount
  } recent meme trades. ${recentFocus}`;
}

function buildAddressProfileEvidence(input: {
  profile: AddressStyleProfile;
  recentTokens: AddressProfileRecentToken[];
  confidence: AddressProfile["confidence"];
}): string[] {
  const { profile, recentTokens, confidence } = input;
  const evidence: string[] = [];

  if (profile.launchpadBias === "mixed") {
    evidence.push(
      `Recent meme activity is split across Fourmeme ${percentageLabel(
        profile.launchpadShares.fourmeme
      )} and Flap ${percentageLabel(profile.launchpadShares.flap)}.`
    );
  } else if (profile.launchpadBias === "unknown") {
    evidence.push(
      "Recent activity did not show a strong launchpad bias after filtering for Fourmeme and Flap tokens."
    );
  } else {
    evidence.push(
      `Recent meme activity leans ${profile.launchpadBias}, with ${percentageLabel(
        profile.launchpadShares[profile.launchpadBias]
      )} of sampled trades on that venue.`
    );
  }

  if (profile.medianHoldMinutes !== null && profile.holdingStyle !== "unknown") {
    evidence.push(
      `Median hold time is ${profile.medianHoldMinutes} minutes, which maps to a ${profile.holdingStyle} style.`
    );
  } else {
    evidence.push(
      "Hold-time coverage is sparse, so style labeling stays conservative."
    );
  }

  evidence.push(
    `The sample contains ${profile.tradeCount} recent meme trades, with ${profile.activityLabel} activity and a ${profile.convictionPattern} pattern.`
  );
  evidence.push(
    profile.favoriteNarratives.length
      ? `Favorite narratives are ${joinTags(profile.favoriteNarratives.slice(0, 3))}.`
      : "Narrative tagging is thin, so the profile stays close to neutral defaults."
  );

  if (recentTokens.length) {
    evidence.push(
      `Recent token focus includes ${joinTags(
        recentTokens.slice(0, 3).map((token) => getRecentTokenName(token))
      )}.`
    );
  }

  if (confidence === "low") {
    evidence.push(
      "Confidence stays low because recent meme-history coverage is limited."
    );
  } else if (confidence === "high") {
    evidence.push(
      "Confidence is high because the sampled meme-history is both recent and diverse enough to form a stable pattern."
    );
  }

  return evidence.slice(0, 5);
}

export function buildFallbackAddressProfile(input: {
  address: string;
  chain?: "bsc";
  sourceStatus?: AddressProfile["sourceStatus"];
  message: string;
  recentTokens?: AddressProfileRecentToken[];
  evidence?: string[];
}): AddressProfile {
  const recentTokens = sortRecentTokens(input.recentTokens ?? []).slice(0, 6);
  const evidence = uniqueStrings(
    (input.evidence?.length
      ? input.evidence
      : [
          input.message,
          recentTokens.length
            ? `Recent token context is limited to ${joinTags(
                recentTokens
                  .slice(0, 3)
                  .map((token) => getRecentTokenName(token))
              )}.`
            : "Only recent Fourmeme and Flap meme activity is profiled in this view.",
        ]
    ).filter(Boolean)
  ).slice(0, 5);

  return {
    address: input.address,
    chain: input.chain ?? "bsc",
    style: [],
    riskAppetite: "unknown",
    recentTradeCount: 0,
    favoriteNarratives: [],
    launchpadBias: "unknown",
    recentTokens,
    summary: input.message,
    evidence,
    confidence: "low",
    sourceStatus: input.sourceStatus ?? "unavailable",
    refinementSource: "deterministic",
  };
}

export function buildAddressProfile(input: {
  history: NormalizedAddressHistoryInput;
  recentTokens?: AddressProfileRecentToken[];
  sourceStatus?: AddressProfile["sourceStatus"];
}): AddressProfile {
  const profile = buildAddressStyleProfile(input.history);
  const recentTokens = sortRecentTokens(input.recentTokens ?? []).slice(0, 6);
  const sourceStatus = resolveSourceStatus(
    input.history,
    profile.tradeCount,
    input.sourceStatus
  );

  if (profile.tradeCount === 0) {
    return buildFallbackAddressProfile({
      address: input.history.address,
      chain: input.history.chain,
      sourceStatus,
      recentTokens,
      message: "No recent Fourmeme or Flap meme history was available for this address.",
    });
  }

  const confidence = determineAddressProfileConfidence({
    tradeCount: profile.tradeCount,
    recentTokenCount: recentTokens.length,
  });

  return {
    address: input.history.address,
    chain: input.history.chain ?? "bsc",
    style: profile.styleLabels,
    riskAppetite: profile.riskAppetiteLabel,
    recentTradeCount: profile.tradeCount,
    favoriteNarratives: profile.favoriteNarratives.slice(0, 5),
    launchpadBias: profile.launchpadBias,
    recentTokens,
    summary: buildAddressProfileSummary({
      profile,
      recentTokens,
    }),
    evidence: buildAddressProfileEvidence({
      profile,
      recentTokens,
      confidence,
    }),
    confidence,
    sourceStatus,
    refinementSource: "deterministic",
  };
}

export function buildAddressStyleProfile(
  history: NormalizedAddressHistoryInput
): AddressStyleProfile {
  const trades = history.trades.map(normalizeTrade);
  const tradeCount = trades.length;
  const holdMinutesValues = trades
    .map((trade) => trade.holdMinutes)
    .filter((value): value is number => value !== null);
  const buyAmounts = trades
    .map((trade) => trade.buyAmountUsd)
    .filter((value): value is number => value !== null && value >= 0);
  const quickFlipRatio = holdMinutesValues.length
    ? roundTo(
        holdMinutesValues.filter((holdMinutes) => holdMinutes <= 120).length /
          holdMinutesValues.length
      )
    : 0;
  const sizingVolatilityRatio = roundTo(
    Math.min(coefficientOfVariation(buyAmounts), 1)
  );
  const launchpadAnalysis = getLaunchpadBiasAnalysis(trades);
  const holdingStyle = getHoldingStyle(holdMinutesValues);
  const riskAppetiteScore = getRiskAppetiteScore({
    launchpadRatio: launchpadAnalysis.launchpadRatio,
    quickFlipRatio,
    sizingVolatilityRatio,
  });
  const riskAppetiteLabel = getRiskAppetiteLabel(riskAppetiteScore);
  const activityLabel = getActivityLabel(tradeCount);
  const convictionPattern = getConvictionPattern(trades);
  const tagPreferences = buildTagPreferenceMap(trades);

  return {
    address: history.address,
    chain: history.chain ?? "bsc",
    source: history.source ?? "unknown",
    tradeCount,
    launchpadBias: launchpadAnalysis.launchpadBias,
    launchpadCounts: launchpadAnalysis.launchpadCounts,
    launchpadShares: launchpadAnalysis.launchpadShares,
    medianHoldMinutes: median(holdMinutesValues),
    medianBuyAmountUsd: median(buyAmounts),
    holdingStyle,
    activityLabel,
    convictionPattern,
    riskAppetiteScore,
    riskAppetiteLabel,
    quickFlipRatio,
    sizingVolatilityRatio,
    launchpadRatio: launchpadAnalysis.launchpadRatio,
    styleLabels: buildStyleLabels({
      launchpadBias: launchpadAnalysis.launchpadBias,
      holdingStyle,
      activityLabel,
      convictionPattern,
      riskAppetiteLabel,
    }),
    tagPreferences,
    favoriteNarratives: Object.keys(tagPreferences).slice(0, 5),
  };
}

export function scoreNarrativeAffinity(
  token: TokenBrief,
  profile: AddressStyleProfile
): number {
  const candidateTags = uniqueStrings(
    token.narrativeTags
      .map((tag) => normalizeTag(tag))
      .filter((tag): tag is string => Boolean(tag))
  );

  if (!candidateTags.length) {
    return 50;
  }

  const tagScores = candidateTags.map((tag) => profile.tagPreferences[tag] ?? 35);
  return roundScore(
    tagScores.reduce((sum, score) => sum + score, 0) / tagScores.length
  );
}

export function scoreBuyLikelihood(input: {
  token: TokenBrief;
  profile: AddressStyleProfile;
  narrativeAffinityScore: number;
  tokenAgeMinutes?: number | null;
}): AddressAffinityBreakdown {
  const { token, profile, narrativeAffinityScore, tokenAgeMinutes } = input;

  const knownLaunchpadTrades =
    profile.launchpadCounts.fourmeme + profile.launchpadCounts.flap;
  const launchpadMatchScore =
    token.launchpad === "unknown" || knownLaunchpadTrades === 0
      ? 50
      : roundScore(
          (profile.launchpadCounts[token.launchpad] /
            Math.max(knownLaunchpadTrades, 1)) *
            100
        );
  const ageFitScore = getAgeFitScore(profile.holdingStyle, tokenAgeMinutes);
  const riskFitScore = getRiskFitScore(
    profile.riskAppetiteScore,
    token.risk.riskScore
  );
  const buyLikelihoodScore = roundScore(
    narrativeAffinityScore * 0.45 +
      launchpadMatchScore * 0.25 +
      ageFitScore * 0.15 +
      riskFitScore * 0.15
  );

  return {
    narrativeAffinityScore,
    launchpadMatchScore,
    ageFitScore,
    riskFitScore,
    buyLikelihoodScore,
  };
}

export function determineAddressAnalysisConfidence(input: {
  tradeCount: number;
  token: TokenBrief;
  tokenAgeMinutes?: number | null;
}): AddressScore["confidence"] {
  const candidateSignalCount =
    (input.token.narrativeTags.length ? 1 : 0) +
    (input.token.launchpad !== "unknown" ? 1 : 0) +
    (input.token.risk.riskScore !== null ? 1 : 0) +
    (input.tokenAgeMinutes !== null && input.tokenAgeMinutes !== undefined ? 1 : 0);

  if (input.tradeCount >= 10 && candidateSignalCount >= 2) {
    return "high";
  }

  if (input.tradeCount >= 5) {
    return "medium";
  }

  return "low";
}

export function buildAddressAnalysisEvidence(input: {
  token: TokenBrief;
  profile: AddressStyleProfile;
  breakdown: AddressAffinityBreakdown;
  confidence: AddressScore["confidence"];
}): string[] {
  const { token, profile, breakdown, confidence } = input;
  const overlapTags = uniqueStrings(
    token.narrativeTags
      .map((tag) => normalizeTag(tag))
      .filter((tag): tag is string => Boolean(tag))
      .filter((tag) => profile.tagPreferences[tag] !== undefined)
  ).slice(0, 3);
  const evidence: string[] = [];

  if (profile.tradeCount === 0) {
    evidence.push("No usable trade history was provided for this address.");
  } else if (profile.launchpadBias === "mixed") {
    evidence.push(
      `Launchpad history is mixed: Fourmeme ${percentageLabel(
        profile.launchpadShares.fourmeme
      )} and Flap ${percentageLabel(profile.launchpadShares.flap)} of sampled trades.`
    );
  } else if (profile.launchpadBias === "unknown") {
    evidence.push("Launchpad history is mostly unknown, which limits venue-specific scoring.");
  } else {
    evidence.push(
      `Launchpad history leans ${profile.launchpadBias}, with ${percentageLabel(
        profile.launchpadShares[profile.launchpadBias]
      )} of sampled trades on that venue.`
    );
  }

  if (profile.medianHoldMinutes !== null && profile.holdingStyle !== "unknown") {
    evidence.push(
      `Median hold time is ${profile.medianHoldMinutes} minutes, which maps to a ${profile.holdingStyle} style.`
    );
  } else {
    evidence.push("Hold-time data is sparse, so trading-style classification is conservative.");
  }

  if (profile.favoriteNarratives.length) {
    evidence.push(
      `Top recurring narratives are ${joinTags(profile.favoriteNarratives.slice(0, 3))}.`
    );
  } else {
    evidence.push("Narrative tagging history is thin, so affinity falls back to neutral defaults.");
  }

  evidence.push(
    `Quick flips account for ${percentageLabel(
      profile.quickFlipRatio
    )} of measurable trades, putting risk appetite at ${roundScore(
      profile.riskAppetiteScore
    )}/100.`
  );

  if (overlapTags.length) {
    evidence.push(
      `Narrative overlap with ${token.symbol} is strongest on ${joinTags(
        overlapTags
      )}, driving a ${breakdown.narrativeAffinityScore}/100 affinity score.`
    );
  } else {
    evidence.push(
      `${token.symbol} does not closely match the wallet's top narrative winners, so narrative affinity stays at ${breakdown.narrativeAffinityScore}/100.`
    );
  }

  if (confidence === "low") {
    evidence.push(
      `Confidence is low because only ${profile.tradeCount} trades were available or outcome coverage is limited.`
    );
  } else if (confidence === "high") {
    evidence.push(
      `Confidence is high because the sample includes ${profile.tradeCount} trades with enough token metadata for deterministic scoring.`
    );
  }

  return evidence.slice(0, 5);
}

export function buildAddressAnalysisSummary(input: {
  token: TokenBrief;
  profile: AddressStyleProfile;
  breakdown: AddressAffinityBreakdown;
}): string {
  const { token, profile, breakdown } = input;
  const overlapTags = uniqueStrings(
    token.narrativeTags
      .map((tag) => normalizeTag(tag))
      .filter((tag): tag is string => Boolean(tag))
      .filter((tag) => profile.tagPreferences[tag] !== undefined)
  ).slice(0, 2);

  const launchpadPhrase =
    profile.launchpadBias === "mixed"
      ? "mixed-launchpad"
      : profile.launchpadBias === "unknown"
        ? "launchpad-agnostic"
        : `${profile.launchpadBias}-biased`;
  const overlapPhrase = overlapTags.length
    ? `Narrative overlap is strongest on ${joinTags(overlapTags)}.`
    : "Narrative overlap is limited, so the token depends more on general risk and venue fit.";

  return `This wallet reads as a ${launchpadPhrase} ${profile.holdingStyle} with ${profile.riskAppetiteLabel} risk appetite. ${token.symbol} ${describeBuyLikelihood(
    breakdown.buyLikelihoodScore
  )} at ${breakdown.buyLikelihoodScore}/100. ${overlapPhrase}`;
}

export function analyzeAddressAffinity(
  input: AnalyzeAddressAffinityInput
): AddressScore {
  const profile = buildAddressStyleProfile(input.history);
  const narrativeAffinityScore = scoreNarrativeAffinity(input.token, profile);
  const breakdown = scoreBuyLikelihood({
    token: input.token,
    profile,
    narrativeAffinityScore,
    tokenAgeMinutes: input.tokenAgeMinutes,
  });
  const confidence = determineAddressAnalysisConfidence({
    tradeCount: profile.tradeCount,
    token: input.token,
    tokenAgeMinutes: input.tokenAgeMinutes,
  });
  const subject = resolveSubject(input.history, input.subject);

  return attachAddressDisplay({
    score: {
      id: subject.id,
      label: subject.label,
      address: subject.address,
      narrativeAffinityScore: breakdown.narrativeAffinityScore,
      buyLikelihoodScore: breakdown.buyLikelihoodScore,
      styleLabels: profile.styleLabels,
      launchpadBias: profile.launchpadBias,
      confidence,
      summary: buildAddressAnalysisSummary({
        token: input.token,
        profile,
        breakdown,
      }),
      evidence: buildAddressAnalysisEvidence({
        token: input.token,
        profile,
        breakdown,
        confidence,
      }),
      sourceStatus: resolveSourceStatus(
        input.history,
        profile.tradeCount,
        input.sourceStatus
      ),
    },
    config: input.trackedAddressConfig,
    top100Rank: input.top100Rank,
    top100Percentage: input.top100Percentage,
  });
}
