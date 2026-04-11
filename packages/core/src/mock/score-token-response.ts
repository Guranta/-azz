import type { ScoreTokenResponse, TrackedAddressConfig } from "../types";
import {
  attachAddressDisplay,
  attachPersonaDisplay,
  buildRecommendation,
  buildSmartMoneyScore,
} from "../scoring";

function createTrackedAddressScore(
  trackedAddress: TrackedAddressConfig,
  index: number
) {
  const mockProfiles = [
    {
      narrativeAffinityScore: 82,
      buyLikelihoodScore: 78,
      styleLabels: ["fourmeme-launchpad", "scalper", "aggressive"],
      launchpadBias: "fourmeme" as const,
      confidence: "medium" as const,
      summary:
        "This wallet historically rotates fast into early Fourmeme animal memes and would likely check this token.",
      evidence: [
        "Past wins cluster around animal meme tags.",
        "Hold times suggest fast entries and quick exits.",
        "Launchpad bias lines up with this token's source.",
      ],
      sourceStatus: "mock" as const,
      top100Rank: 17,
      top100Percentage: 1.42,
    },
    {
      narrativeAffinityScore: 58,
      buyLikelihoodScore: 49,
      styleLabels: ["mixed-launchpad", "swing-trader", "balanced"],
      launchpadBias: "mixed" as const,
      confidence: "low" as const,
      summary:
        "This wallet is less launchpad-specific and may wait for stronger confirmation before entering.",
      evidence: [
        "Narrative overlap exists but is not dominant.",
        "Historical entries are less aggressive.",
        "Risk tolerance appears lower than the token profile.",
      ],
      sourceStatus: "mock" as const,
      top100Rank: null,
      top100Percentage: null,
    },
  ];

  const profile = mockProfiles[index % mockProfiles.length];

  return attachAddressDisplay({
    score: {
      id: trackedAddress.id,
      label: trackedAddress.label,
      address: trackedAddress.address,
      narrativeAffinityScore: profile.narrativeAffinityScore,
      buyLikelihoodScore: profile.buyLikelihoodScore,
      styleLabels: profile.styleLabels,
      launchpadBias: profile.launchpadBias,
      confidence: profile.confidence,
      summary: profile.summary,
      evidence: profile.evidence,
      sourceStatus: profile.sourceStatus,
    },
    config: trackedAddress,
    top100Rank: profile.top100Rank,
    top100Percentage: profile.top100Percentage,
  });
}

export function createMockScoreTokenResponse(
  tokenAddress: string,
  trackedAddresses: TrackedAddressConfig[] = []
): ScoreTokenResponse {
  const personaScores = [
    attachPersonaDisplay({
      persona: {
        id: "cz",
        label: "CZ",
        affinityScore: 74,
        confidence: "medium",
        summary:
          "The token leans simple, community-led, and growth-oriented, which fits a CZ-style preference for clear utility and strong user pull.",
        evidence: [
          "Launchpad momentum is strong without looking completely random.",
          "Narrative is simple enough to explain quickly.",
          "Risk is elevated but not automatically disqualifying in a meme context.",
        ],
      },
      config: {
        logoKey: "persona-cz",
        logoMode: "asset",
      },
    }),
  ];

  const addressScores = trackedAddresses
    .filter((trackedAddress) => trackedAddress.enabled)
    .map((trackedAddress, index) =>
      createTrackedAddressScore(trackedAddress, index)
    );
  const smartMoney = buildSmartMoneyScore([
    {
      address: "0xa11fa0000000000000000000000000000000001",
      rank: 12,
      percentage: 1.81,
      tag: "swing",
    },
    {
      address: "0xa11fa0000000000000000000000000000000002",
      rank: 37,
      percentage: 0.76,
      tag: "momentum",
    },
  ]);

  return {
    token: {
      address: tokenAddress,
      chain: "bsc",
      name: "Lobster Signal",
      symbol: "LOB",
      marketCapUsd: 2_250_000,
      launchpad: "fourmeme",
      narrativeTags: ["meme", "community", "animal"],
      risk: {
        riskLevel: "MEDIUM",
        riskScore: 61,
      },
    },
    personaScores,
    addressScores,
    smartMoney,
    recommendation: buildRecommendation({
      personaScores,
      addressScores,
      smartMoney,
    }),
    cache: {
      hit: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    },
    errors: [],
  };
}
