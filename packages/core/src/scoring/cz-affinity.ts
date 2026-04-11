import type { PersonaConfig, PersonaScore, TokenBrief } from "../types";
import { attachPersonaDisplay } from "./live-contract";

const POSITIVE_TAG_WEIGHTS: Record<string, number> = {
  utility: 12,
  payments: 12,
  infrastructure: 10,
  exchange: 10,
  community: 6,
  ai: 4,
  global: 4,
  meme: 2,
  "classic-meme": 1,
};

const CAUTION_TAG_WEIGHTS: Record<string, number> = {
  casino: -10,
  ponzi: -20,
  leverage: -8,
  opaque: -12,
  exploit: -18,
};

function clamp(value: number, low = 0, high = 100): number {
  return Math.max(low, Math.min(high, value));
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function getRiskAdjustment(token: TokenBrief): number {
  switch (token.risk.riskLevel) {
    case "LOW":
      return 18;
    case "MEDIUM":
      return 8;
    case "HIGH":
      return -14;
    case "CRITICAL":
      return -30;
    default:
      return -4;
  }
}

function getLaunchpadAdjustment(token: TokenBrief): number {
  switch (token.launchpad) {
    case "fourmeme":
      return 8;
    case "flap":
      return 6;
    default:
      return 0;
  }
}

function getNarrativeAdjustment(tags: string[]): number {
  if (!tags.length) {
    return -6;
  }

  return tags.reduce((score, tag) => {
    return score + (POSITIVE_TAG_WEIGHTS[tag] ?? 0) + (CAUTION_TAG_WEIGHTS[tag] ?? 0);
  }, 0);
}

function getConfidence(token: TokenBrief): PersonaScore["confidence"] {
  const signalCount =
    (token.launchpad !== "unknown" ? 1 : 0) +
    (token.risk.riskScore !== null || token.risk.riskLevel !== "unknown" ? 1 : 0) +
    (token.narrativeTags.length >= 2 ? 1 : 0);

  if (signalCount >= 3) {
    return "high";
  }

  if (signalCount >= 2) {
    return "medium";
  }

  return "low";
}

function buildSummary(token: TokenBrief, affinityScore: number): string {
  if (affinityScore >= 80) {
    return `${token.symbol} reads as a relatively strong CZ-style fit: the setup is simple enough to explain quickly, and the current token signals do not immediately break trust.`;
  }

  if (affinityScore >= 60) {
    return `${token.symbol} lands in the cautious-yes bucket for a CZ-style read: there is enough structure to watch, but not enough clarity yet for a strong endorsement.`;
  }

  if (affinityScore >= 40) {
    return `${token.symbol} looks mixed from a CZ-style perspective: there are a few usable signals, but the token still feels noisy or under-validated.`;
  }

  return `${token.symbol} likely scores poorly for a CZ-style read right now because the current signal mix looks too weak, too risky, or too hard to defend.`;
}

function buildEvidence(token: TokenBrief, normalizedTags: string[]): string[] {
  const evidence: string[] = [];

  if (token.launchpad === "unknown") {
    evidence.push("Launchpad attribution is unclear, which weakens the institutional-read story.");
  } else {
    evidence.push(
      `Launchpad context points to ${token.launchpad}, which makes the token easier to place than a completely orphan launch.`
    );
  }

  if (token.risk.riskScore !== null) {
    evidence.push(
      `AVE risk currently reads ${token.risk.riskLevel.toLowerCase()} at ${Math.round(
        token.risk.riskScore
      )}/100.`
    );
  } else {
    evidence.push("Risk metadata is incomplete, so user-protection confidence is capped.");
  }

  if (normalizedTags.length) {
    evidence.push(
      `Narrative tags lean ${normalizedTags.slice(0, 3).join(", ")}, which keeps the story relatively concise.`
    );
  } else {
    evidence.push("Narrative tags are thin, so the token lacks a sharp one-line story.");
  }

  if (normalizedTags.length > 5) {
    evidence.push("The narrative stack is broad enough to feel unfocused, which hurts simplicity.");
  } else if (normalizedTags.length >= 2) {
    evidence.push("The narrative stack is compact enough to pitch quickly without sounding chaotic.");
  }

  if (token.risk.riskLevel === "HIGH" || token.risk.riskLevel === "CRITICAL") {
    evidence.push("The current risk posture would likely trigger a stronger user-protection filter.");
  }

  return uniqueStrings(evidence).slice(0, 5);
}

export interface ScoreCzAffinityOptions {
  persona?: Pick<PersonaConfig, "id" | "label" | "logoKey" | "logoMode">;
}

export function scoreCzAffinity(
  token: TokenBrief,
  options: ScoreCzAffinityOptions = {}
): PersonaScore {
  const normalizedTags = uniqueStrings(token.narrativeTags.map(normalizeTag));
  const baseScore = 55;
  const namePenalty =
    token.name === "Unknown Token" || token.symbol === "UNKNOWN" ? -10 : 0;
  const narrativeSpreadPenalty = normalizedTags.length > 5 ? -5 : 0;

  const affinityScore = Math.round(
    clamp(
      baseScore +
        getLaunchpadAdjustment(token) +
        getRiskAdjustment(token) +
        getNarrativeAdjustment(normalizedTags) +
        namePenalty +
        narrativeSpreadPenalty
    )
  );

  return attachPersonaDisplay({
    persona: {
      id: options.persona?.id ?? "cz",
      label: options.persona?.label ?? "CZ",
      affinityScore,
      confidence: getConfidence(token),
      summary: buildSummary(token, affinityScore),
      evidence: buildEvidence(token, normalizedTags),
    },
    config: options.persona,
  });
}
