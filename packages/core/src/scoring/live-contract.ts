import type {
  AddressScore,
  DisplayLevel,
  PersonaConfig,
  PersonaScore,
  Recommendation,
  RecommendationValue,
  SmartMoneyMatch,
  SmartMoneyScore,
  TrackedAddressConfig,
} from "../types";

const DISPLAY_EMOJI_BY_LEVEL: Record<DisplayLevel, string> = {
  NO_LOVE: "🧊",
  LOVE: "💛",
  LOVE_LOVE: "🚀",
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function levelToWeight(level: DisplayLevel): number {
  switch (level) {
    case "LOVE_LOVE":
      return 2;
    case "LOVE":
      return 1;
    default:
      return 0;
  }
}

export function getDisplayLevelFromScore(score: number): DisplayLevel {
  const normalized = clamp(Math.round(score));

  if (normalized >= 70) {
    return "LOVE_LOVE";
  }

  if (normalized >= 40) {
    return "LOVE";
  }

  return "NO_LOVE";
}

export function getDisplayEmoji(level: DisplayLevel): string {
  return DISPLAY_EMOJI_BY_LEVEL[level];
}

export function getSmartMoneyDisplayLevel(matchedCount: number): DisplayLevel {
  if (matchedCount >= 3) {
    return "LOVE_LOVE";
  }

  if (matchedCount >= 1) {
    return "LOVE";
  }

  return "NO_LOVE";
}

export function getHolderEmoji(rank: number | null): string {
  if (rank === null) {
    return "◌";
  }

  if (rank <= 10) {
    return "🐋";
  }

  if (rank <= 50) {
    return "🐬";
  }

  return "🐟";
}

export function attachPersonaDisplay(input: {
  persona: Pick<
    PersonaScore,
    "id" | "label" | "affinityScore" | "confidence" | "summary" | "evidence"
  >;
  config?: Pick<PersonaConfig, "logoKey" | "logoMode">;
}): PersonaScore {
  const displayLevel = getDisplayLevelFromScore(input.persona.affinityScore);

  return {
    ...input.persona,
    displayLevel,
    displayEmoji: getDisplayEmoji(displayLevel),
    logoKey: input.config?.logoKey ?? input.persona.id,
    logoMode: input.config?.logoMode ?? "emoji",
  };
}

export function attachAddressDisplay(input: {
  score: Pick<
    AddressScore,
    | "id"
    | "label"
    | "address"
    | "narrativeAffinityScore"
    | "buyLikelihoodScore"
    | "styleLabels"
    | "launchpadBias"
    | "confidence"
    | "summary"
    | "evidence"
    | "sourceStatus"
  >;
  config?: Pick<TrackedAddressConfig, "logoKey" | "logoMode">;
  top100Rank?: number | null;
  top100Percentage?: number | null;
}): AddressScore {
  const top100Rank = input.top100Rank ?? null;
  const top100Percentage =
    input.top100Percentage === undefined ? null : input.top100Percentage;
  const displayLevel = getDisplayLevelFromScore(input.score.buyLikelihoodScore);

  return {
    ...input.score,
    displayLevel,
    displayEmoji: getDisplayEmoji(displayLevel),
    isTop100Holder: top100Rank !== null,
    top100Rank,
    top100Percentage,
    holderEmoji: getHolderEmoji(top100Rank),
    logoKey: input.config?.logoKey ?? input.score.id,
    logoMode: input.config?.logoMode ?? "emoji",
  };
}

export function buildSmartMoneyScore(matches: SmartMoneyMatch[]): SmartMoneyScore {
  const rankedMatches = [...matches]
    .sort((left, right) => {
      if (left.rank === null && right.rank === null) {
        return left.address.localeCompare(right.address);
      }

      if (left.rank === null) {
        return 1;
      }

      if (right.rank === null) {
        return -1;
      }

      return left.rank - right.rank;
    })
    .slice(0, 12)
    .map((match) => ({
      ...match,
      percentage:
        match.percentage === null ? null : round(clamp(match.percentage, 0, 100)),
    }));
  const matchedCount = rankedMatches.length;
  const displayLevel = getSmartMoneyDisplayLevel(matchedCount);

  let summary = "No AVE smart-money holders are currently visible in the token top100 set.";
  if (matchedCount >= 3) {
    summary = `${matchedCount} AVE smart-money wallets are already in the token top100 set, which is a strong confirmation signal.`;
  } else if (matchedCount >= 1) {
    summary = `${matchedCount} AVE smart-money wallet${matchedCount > 1 ? "s are" : " is"} already in the token top100 set.`;
  }

  const evidence =
    rankedMatches.length > 0
      ? rankedMatches.slice(0, 5).map((match) => {
          const parts = [`${match.address}`];

          if (match.rank !== null) {
            parts.push(`rank #${match.rank}`);
          }

          if (match.percentage !== null) {
            parts.push(`${round(match.percentage)}% supply`);
          }

          if (match.tag) {
            parts.push(match.tag);
          }

          return parts.join(" | ");
        })
      : ["Top100 holders and AVE smart-wallet coverage do not currently overlap."];

  return {
    displayLevel,
    displayEmoji: getDisplayEmoji(displayLevel),
    matchedCount,
    summary,
    evidence,
    matches: rankedMatches,
  };
}

export function buildRecommendation(input: {
  personaScores: PersonaScore[];
  addressScores: AddressScore[];
  smartMoney: SmartMoneyScore;
}): Recommendation {
  const topPersonaLevel = input.personaScores.reduce<DisplayLevel>(
    (best, score) =>
      levelToWeight(score.displayLevel) > levelToWeight(best)
        ? score.displayLevel
        : best,
    "NO_LOVE"
  );
  const bestAddressLevel = input.addressScores.reduce<DisplayLevel>(
    (best, score) =>
      levelToWeight(score.displayLevel) > levelToWeight(best)
        ? score.displayLevel
        : best,
    "NO_LOVE"
  );

  const personaLove = levelToWeight(topPersonaLevel) >= 1;
  const fixedLove = levelToWeight(bestAddressLevel) >= 1;
  const smartLove = levelToWeight(input.smartMoney.displayLevel) >= 1;

  const strongBuy =
    topPersonaLevel === "LOVE_LOVE" &&
    bestAddressLevel === "LOVE_LOVE" &&
    input.smartMoney.displayLevel === "LOVE_LOVE";
  const buy = personaLove && fixedLove && smartLove;
  const watch = [personaLove, fixedLove, smartLove].filter(Boolean).length >= 2;

  let value: RecommendationValue = "DO_NOT_BUY";
  let summary =
    "The three scoring pillars do not align strongly enough yet, so the token stays below the buy line.";

  if (strongBuy) {
    value = "STRONG_BUY";
    summary =
      "Persona, fixed-address conviction, and smart-money overlap all land at the highest tier, so the token qualifies as a strong-buy setup.";
  } else if (buy) {
    value = "BUY";
    summary =
      "Persona, fixed-address, and smart-money pillars all clear the love threshold, which upgrades the token to buy.";
  } else if (watch) {
    value = "WATCH";
    summary =
      "At least two of the three pillars are positive, but the full buy gate is not met yet, so this remains a watch setup.";
  }

  return { value, summary };
}
