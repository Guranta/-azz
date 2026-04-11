import {
  attachAddressDisplay,
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
  type AddressScore,
  type AveSmartWallet,
  type AveTopHolder,
  type AveDataClient,
  type PersonaScore,
  type ScoreTokenResponse,
  type ScoreTokenRequest,
  type SmartMoneyMatch,
  type TokenBrief,
  type TrackedAddressConfig,
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
import {
  buildFrozenDriverTokenContext,
  buildFrozenDriverUnavailableScore,
  scoreFrozenTrackedDriver,
} from "@/lib/tracked-driver-systems";

const MINIMAX_SCORING_TIMEOUT_MS = 60_000;

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

type HolderLookup = Map<
  string,
  {
    rank: number;
    percentage: number | null;
  }
>;

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
  frozenTokenContext: Awaited<ReturnType<typeof buildFrozenDriverTokenContext>>;
  holderLookup: HolderLookup;
  smartWalletLookup: Map<string, AveSmartWallet>;
  smartMoneyMatchedCount: number;
  minimaxScorer: ReturnType<typeof createMiniMaxScorer> | null;
}): Promise<{ score: AddressScore; error?: string }> {
  const addressKey = input.trackedAddress.address.toLowerCase();
  const holderState = input.holderLookup.get(addressKey);
  const smartWallet = input.smartWalletLookup.get(addressKey);
  const deterministicResult = scoreFrozenTrackedDriver({
    trackedAddress: input.trackedAddress,
    tokenContext: input.frozenTokenContext,
    top100Rank: holderState?.rank ?? null,
    top100Percentage: holderState?.percentage ?? null,
    isSmartWallet: Boolean(smartWallet),
    smartMoneyMatchedCount: input.smartMoneyMatchedCount,
  });

  if (!deterministicResult) {
    return {
      score: buildFrozenDriverUnavailableScore({
        trackedAddress: input.trackedAddress,
        top100Rank: holderState?.rank ?? null,
        top100Percentage: holderState?.percentage ?? null,
        isSmartWallet: Boolean(smartWallet),
        smartMoneyMatchedCount: input.smartMoneyMatchedCount,
      }),
      error: `Frozen driver snapshot is missing for ${input.trackedAddress.label}.`,
    };
  }

  const deterministicScore = deterministicResult.score;

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
      sampledTradeCount: deterministicResult.sampledTradeCount,
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

  const [
    { personaScores, errors: personaErrors },
    marketContext,
    frozenTokenContext,
  ] = await Promise.all([
    scoreEnabledPersonas(token, minimaxScorerState.scorer),
    fetchMarketContext(token.address, aveClient),
    buildFrozenDriverTokenContext({
      token,
      metricsRecorder,
    }),
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
        frozenTokenContext,
        holderLookup,
        smartWalletLookup,
        smartMoneyMatchedCount: smartMoney.matchedCount,
        minimaxScorer: minimaxScorerState.scorer,
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

export { AveApiError, AveConfigurationError } from "@meme-affinity/core";
