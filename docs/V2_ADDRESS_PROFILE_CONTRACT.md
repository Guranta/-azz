# V2 Arbitrary-Address Result Page Contract

This document defines the contract for the V2 address result page: a full scoring report for any BSC wallet address.

V1 只对 config 里固定的 3 个 tracked address 做画像，且画像结果是 token-scoped 的（"这个地址会不会买这枚币"）。V2 放开地址限制，允许对任意 BSC 地址生成一份完整的结果页报告，包含：自我画像、👍 CZ 评分、聪明钱状态、与固定 3 地址的相似度。

## Scope Boundary

This document does NOT:

- change token scoring (`scoreTokenRequest`)
- change the fixed 3 tracked-address config (`config/tracked-addresses.json`)
- extend the arbitrary-address profile to the public OpenClaw skill
- contain V3 trending-stream content

## A. V2 API Contract

### Endpoint

```
POST /api/score-address
```

### Request

```ts
interface ScoreAddressRequest {
  address: string;       // BSC address, 0x-prefixed, 42 chars
  chain: "bsc";         // V2 only supports BSC
}
```

### Response

```ts
interface ScoreAddressResponse {
  address: {
    address: string;
    chain: "bsc";
  };
  selfProfile: V2AddressProfile;
  czScore: V2CzScore;
  smartMoney: V2SmartMoney;
  trackedAddressScores: V2TrackedAddressSimilarity[];
  cache: {
    hit: boolean;
    expiresAt: string;   // ISO 8601
  };
  errors: string[];
}
```

## B. selfProfile

The self-profile is the core deterministic portrait of the queried wallet, optionally refined by MiniMax.

### selfProfile Output

```ts
interface V2AddressProfile {
  // identity
  address: string;
  chain: "bsc";

  // deterministic fields
  style: string[];                              // e.g. ["fourmeme-launchpad", "scalper", "active", "repeat-buyer", "aggressive"]
  riskAppetite: "cautious" | "balanced" | "aggressive";
  recentTradeCount: number;
  favoriteNarratives: string[];                 // top 5 narrative tags by weighted preference
  launchpadBias: "fourmeme" | "flap" | "mixed" | "unknown";

  // recent token snapshot (top 10 by recency)
  recentTokens: V2RecentToken[];

  // refinement fields (deterministic baseline, optionally overwritten by MiniMax)
  summary: string;
  evidence: string[];
  confidence: "low" | "medium" | "high";

  // source tracking
  sourceStatus: "live" | "mock" | "manual" | "unavailable";
  refinementSource: "deterministic" | "minimax" | "minimax-fallback";
}

interface V2RecentToken {
  tokenAddress: string;
  symbol: string;
  launchpad: string;
  narrativeTags: string[];
  roiPct: number | null;
  holdMinutes: number | null;
}
```

### selfProfile Deterministic Layer (always runs)

Uses the existing `buildAddressStyleProfile()` pipeline from `packages/core/src/scoring/address-analysis.ts`.

Data sources:

| Source | What it provides | AVE endpoint |
|--------|-----------------|---------------|
| AVE address/tx recent history | recent token trades for this address | `/v2/address/tx` |
| Token enrichment (per traded token) | name, symbol, launchpad, narrative tags, risk | `/v2/tokens/{address}-bsc` |

Deterministic field mapping:

| Field | Source function |
|-------|----------------|
| `style` | `buildStyleLabels()` — launchpad bias + holding style + activity label + conviction pattern + risk appetite label |
| `riskAppetite` | `getRiskAppetiteLabel()` based on launchpad ratio, quick-flip ratio, sizing volatility |
| `recentTradeCount` | Raw count of normalized trades |
| `favoriteNarratives` | Top 5 from `tagPreferences` map, sorted by weighted score |
| `launchpadBias` | `getLaunchpadBias()` — requires >= 60% share for single launchpad |
| `recentTokens` | Assembled from normalized trade list, most recent first, capped at 10 |
| `summary` | `buildAddressAnalysisSummary()` — wallet style and narrative description |
| `evidence` | `buildAddressAnalysisEvidence()` — up to 5 evidence items |
| `confidence` | `determineAddressAnalysisConfidence()` — trade count + signal availability |
| `sourceStatus` | `resolveSourceStatus()` — "live", "mock", "manual", or "unavailable" |

### selfProfile MiniMax Refinement (optional)

MiniMax consumes the deterministic self-profile and may refine:

| Field | Behavior |
|-------|----------|
| `summary` | Rewritten — more natural language, better narrative flow |
| `evidence` | Rewritten — up to 5 refined evidence items |
| `confidence` | May adjust by at most one tier from deterministic level |
| `style` | Wording may be refined; if absent from MiniMax response, deterministic `style` is used |

MiniMax does NOT change: `riskAppetite`, `recentTradeCount`, `favoriteNarratives`, `launchpadBias`, `recentTokens`, `sourceStatus`.

`refinementSource` values:
- `"deterministic"` — MiniMax not attempted (e.g. no API key)
- `"minimax"` — MiniMax succeeded, refined fields applied
- `"minimax-fallback"` — MiniMax attempted but failed, deterministic values retained

### Fallback Invariant

> If `refinementSource !== "minimax"`, then every field equals the deterministic value, and `confidence` is at most the deterministic confidence.

## C. czScore

The `czScore` answers: "To what extent does this wallet match 👍 CZ's known preferences?"

### czScore Output

```ts
interface V2CzScore {
  displayLevel: "NO_LOVE" | "LOVE" | "LOVE_LOVE";
  displayEmoji: string;
  affinityScore: number;                        // 0-100
  confidence: "low" | "medium" | "high";
  summary: string;
  evidence: string[];
}
```

### czScore Production

The czScore is produced by applying CZ's preference weights to the wallet's self-profile. This is a deterministic calculation.

**Method**: Use the wallet's `AddressStyleProfile` as input to CZ's known preference model:

| Wallet signal | CZ preference | Scoring logic |
|--------------|---------------|---------------|
| `favoriteNarratives` contains utility, payments, infrastructure | positive | CZ prefers tokens with clear utility and payment narratives. Wallets trading these narratives score higher. |
| `favoriteNarratives` contains casino, ponzi, leverage | negative | CZ avoids speculation-heavy narratives. Wallets with these narratives score lower. |
| `riskAppetite` = "cautious" or "balanced" | positive | CZ favors lower risk. Aggressive wallets score lower on CZ alignment. |
| `launchpadBias` = "fourmeme" | positive | CZ's public BSC engagement centers on FourMeme launches. |
| `holdingStyle` = "holder" or "swing-trader" | positive | CZ prefers conviction over fast flipping. Snipers/scalpers score lower. |
| `convictionPattern` = "repeat-buyer" | positive | Repeated investment signals conviction, which aligns with CZ's approach. |

**Affinity score formula** (deterministic):

```
base = 50
+ narrativeBonus (favoriteNarratives overlap with CZ-positive tags, max +25)
- narrativePenalty (overlap with CZ-negative tags, max -25)
+ riskBonus (cautious/balanced = +15, aggressive = -10)
+ launchpadBonus (fourmeme = +10, flap = +5, mixed/unknown = 0)
+ holdingStyleBonus (holder = +10, swing-trader = +5, scalper = -5, sniper = -10)
+ convictionBonus (repeat-buyer = +10, one-shot-rotator = 0)
clamp to 0-100, round to integer
```

**Display level mapping**:

| Score range | Display level | Emoji |
|------------|--------------|-------|
| >= 70 | `LOVE_LOVE` | `🚀` |
| >= 40 | `LOVE` | `💛` |
| < 40 | `NO_LOVE` | `🧊` |

**Confidence**: Inherited from the self-profile's `confidence`. If self-profile confidence is `"low"`, czScore confidence is also `"low"`.

**Summary**: Deterministic one-line description of CZ alignment. Example: "This wallet reads as a fourmeme-biased holder with cautious risk appetite, which aligns well with CZ's known preferences."

**Evidence**: Up to 3 deterministic evidence strings derived from which preference signals matched or mismatched.

**MiniMax**: czScore does NOT use MiniMax refinement. It is purely deterministic.

## D. smartMoney

The `smartMoney` block answers: "Is this wallet recognized as smart money, and how closely does its trading style match the smart-money cohort?"

### smartMoney Output

```ts
interface V2SmartMoney {
  isSmartWallet: boolean;
  walletTag: string | null;                     // AVE tag if the queried address is a recognized smart wallet
  cohortSize: number;                           // number of wallets in the current smart-money snapshot
  narrativeOverlap: number;                     // 0-100: % of the wallet's favoriteNarratives that appear in the cohort
  launchpadAlignment: boolean;                  // true if the wallet's launchpadBias matches the cohort majority
  matchedNarratives: string[];                  // narratives present in both the wallet's favorites and the cohort
  displayLevel: "NO_LOVE" | "LOVE" | "LOVE_LOVE";
  displayEmoji: string;
  summary: string;
  evidence: string[];
}
```

### smartMoney Production

This block uses only the existing 24-hour smart-money snapshot. No additional AVE API calls are needed.

**Data source**: The `SmartMoneySnapshot` that V1 token scoring already maintains (see `fetchMarketContext()` in `score-token.ts`, built in `apps/web/src/lib/smartmoney-snapshot.ts`).

The snapshot contains per-wallet entries with:
- `address: string`
- `tag: string | null`
- `recentTradeCount: number`
- `dominantNarratives: string[]`
- `launchpadBias: "fourmeme" | "flap" | "mixed"`
- `summary: string`

The snapshot does NOT contain per-wallet token holdings or recent token sets. Therefore the smartMoney overlap is computed using **narrative and launchpad similarity**, not token-level overlap.

### Step 1 — Wallet lookup

Check if the queried address exists in `snapshot.addresses`.

- If found: `isSmartWallet = true`, `walletTag = entry.tag`.
- If not found: `isSmartWallet = false`, `walletTag = null`.

### Step 2 — Cohort aggregate

From all snapshot `wallets[]` entries, build:

- **Cohort narrative set**: union of all `dominantNarratives` across all snapshot wallets.
- **Cohort launchpad majority**: the most frequent `launchpadBias` value across snapshot wallets (excluding `"mixed"`; if tied or all `"mixed"`, cohort majority is `"mixed"`).
- **`cohortSize`**: `snapshot.wallets.length`.

### Step 3 — Narrative overlap

1. Take the queried wallet's `selfProfile.favoriteNarratives` as set `F`.
2. Take the cohort narrative set as set `C`.
3. `matchedNarratives = F ∩ C` (intersection), sorted by the queried wallet's `tagPreferences` score descending.
4. If `F` is empty: `narrativeOverlap = 0`.
5. Otherwise: `narrativeOverlap = round((|F ∩ C| / |F|) * 100)`.

```
matchedNarratives = favoriteNarratives filtered by presence in cohort narrative set
narrativeOverlap   = round(|matchedNarratives| / |favoriteNarratives| * 100)  when |favoriteNarratives| > 0
                     0                                                              when |favoriteNarratives| = 0
```

### Step 4 — Launchpad alignment

`launchpadAlignment = (selfProfile.launchpadBias === cohortLaunchpadMajority)`

If either side is `"unknown"` or `"mixed"`, alignment is `false`.

### Step 5 — Display level

Base level from `narrativeOverlap`:

| narrativeOverlap | Base level |
|-----------------|------------|
| >= 60 | `LOVE_LOVE` |
| >= 30 | `LOVE` |
| < 30 | `NO_LOVE` |

Bonus: if `isSmartWallet = true`, bump one tier (max `LOVE_LOVE`).

Bonus: if `launchpadAlignment = true` and current level is not yet `LOVE_LOVE`, bump one tier (max `LOVE_LOVE`).

Display emoji: `🚀` for `LOVE_LOVE`, `💛` for `LOVE`, `🧊` for `NO_LOVE`.

### Step 6 — Summary and evidence

**Summary**: Deterministic one-line description. Examples:
- `"This wallet is an AVE-recognized smart wallet with strong narrative overlap (4/5 favorites match the smart-money cohort)."`
- `"This wallet is not in the AVE smart wallet list but shares 2/5 favorite narratives with the cohort."`
- `"Narrative overlap with the smart-money cohort is limited (0/3 favorites match)."`

**Evidence**: Up to 3 deterministic evidence strings:
1. Smart wallet recognition status (is or is not in the snapshot, with tag if present).
2. Narrative overlap detail (which narratives match, e.g. `"Matched narratives: utility, infrastructure, payments"`).
3. Launchpad alignment status (aligned or not, with both sides named).

**MiniMax**: smartMoney does NOT use MiniMax refinement. It is purely deterministic.

## E. trackedAddressScores

The `trackedAddressScores` block answers: "How similar is this wallet to each of the 3 fixed tracked addresses?"

### trackedAddressScores Output

```ts
interface V2TrackedAddressSimilarity {
  id: string;                                   // tracked address config id
  label: string;                                // e.g. "😎 王小二"
  address: string;
  displayLevel: "NO_LOVE" | "LOVE" | "LOVE_LOVE";
  displayEmoji: string;
  similarityScore: number;                      // 0-100
  summary: string;
  evidence: string[];
}
```

### trackedAddressScores Production

For each of the 3 fixed tracked addresses from `config/tracked-addresses.json`:

**Step 1 — Fetch tracked address profile**:

Run the same deterministic `buildAddressStyleProfile()` for the tracked address using its AVE transaction history.

**Step 2 — Compare profiles**:

Compute a similarity score between the queried wallet's `AddressStyleProfile` and the tracked address's `AddressStyleProfile`:

| Signal | Weight | Logic |
|--------|--------|-------|
| Narrative overlap | 40% | Cosine similarity between `tagPreferences` vectors of both wallets |
| Launchpad alignment | 25% | 100 if same `launchpadBias`, 50 if both are "mixed", 0 otherwise |
| Risk appetite match | 20% | 100 if same `riskAppetiteLabel`, 50 if adjacent, 0 if opposite |
| Holding style match | 15% | 100 if same `holdingStyle`, 50 if adjacent (e.g. scalper/sniper), 0 otherwise |

```
similarityScore = clamp(
  narrativeOverlap * 0.40
  + launchpadAlignment * 0.25
  + riskAppetiteMatch * 0.20
  + holdingStyleMatch * 0.15
, 0, 100)
```

**Display level mapping**:

| Score range | Display level | Emoji |
|------------|--------------|-------|
| >= 70 | `LOVE_LOVE` | `🚀` |
| >= 40 | `LOVE` | `💛` |
| < 40 | `NO_LOVE` | `🧊` |

**Summary**: Deterministic one-line description of similarity. Example: "This wallet shares 3 favorite narratives with 😎 王小二 and has matching fourmeme launchpad bias."

**Evidence**: Up to 3 evidence strings: overlapping narratives, launchpad comparison, risk/hold style comparison.

**MiniMax**: trackedAddressScores do NOT use MiniMax refinement. They are purely deterministic.

**Fallback when tracked address history is unavailable**: If a tracked address's transaction history cannot be fetched, set `similarityScore = 0`, `displayLevel = "NO_LOVE"`, `summary = "Insufficient history for comparison."`, `evidence = ["Tracked address transaction history is unavailable."]`.

## F. MiniMax Input / Output Contract (selfProfile Only)

This section applies only to the self-profile MiniMax refinement described in section B.

### MiniMax Input

The MiniMax prompt receives:

1. The full deterministic self-profile (all fields)
2. The raw trade statistics (trade count, median hold time, median buy amount)
3. The favorite narratives list
4. The recent tokens snapshot (up to 10)
5. Instruction rules (be conservative, stay aligned with deterministic signals)

Prompt template structure:

```
You are a neutral wallet analyst. The deterministic engine has already extracted the features below.
Use them as the primary signal, add narrative judgment, and stay conservative.

Wallet: <address>
Chain: bsc
Recent trades: <tradeCount>
Deterministic style: <styleLabels joined>
Risk appetite: <riskAppetiteLabel> (<riskAppetiteScore>/100)
Launchpad bias: <launchpadBias>
Favorite narratives: <favoriteNarratives joined>
Median hold time: <medianHoldMinutes> minutes
Median buy size: <medianBuyAmountUsd> USD
Quick flip ratio: <quickFlipRatio>
Conviction pattern: <convictionPattern>

Recent tokens (most recent first):
<recentTokens list — symbol, launchpad, tags, roi, hold time>

Deterministic summary: <summary>
Deterministic evidence: <evidence joined>

Rules:
- Keep risk appetite, launchpad bias, narrative preferences, and trade count unchanged.
- Refine summary and evidence with clearer wording.
- Confidence may adjust by at most one tier from the deterministic level.
- If the deterministic evidence is thin (tradeCount < 5), stay conservative.
- Return valid JSON only.
```

### MiniMax JSON Output Shape

MiniMax MUST return a single JSON object in the final `text` content block:

```json
{
  "summary": "1-3 sentence wallet portrait",
  "evidence": ["reason 1", "reason 2", "reason 3"],
  "confidence": "low" | "medium" | "high",
  "style": ["label-1", "label-2"]
}
```

Field rules:

| Field | Required | Validation |
|-------|----------|------------|
| `summary` | yes | Must be non-empty string, max 500 chars |
| `evidence` | yes | Must be array of 1-5 non-empty strings |
| `confidence` | yes | Must be one of `"low"`, `"medium"`, `"high"` |
| `style` | no | If present, must be array of non-empty strings; if absent, deterministic `style` is used |

### Content Block Parsing Rules

Identical to V1 MiniMax runtime contract (`docs/MINIMAX_RUNTIME_CONTRACT.md`):

- Only the final assistant `text` block supplies structured JSON.
- `thinking` blocks are NOT formal output and must NOT be parsed into the profile.
- If the response contains only `thinking` with no `text` block, treat as incomplete.

### Failure Handling

| Failure mode | Code | Behavior |
|-------------|------|----------|
| Request timeout (AbortError) | `timeout` | Deterministic fallback, `refinementSource="minimax-fallback"` |
| HTTP 401 / 403 | `auth_failure` | Deterministic fallback |
| HTTP 429 | `rate_limit` | Deterministic fallback (retryable, one retry with 250ms delay) |
| Response has only `thinking` | `incomplete_response` | Deterministic fallback |
| `stop_reason=max_tokens` without text | `incomplete_response` | Deterministic fallback |
| Valid JSON but wrong shape | `invalid_json` | Deterministic fallback |
| No JSON object found in text | `invalid_json` | Deterministic fallback |
| HTTP 5xx | `upstream_5xx` | Deterministic fallback (retryable for 502/503/504) |

In all fallback cases:
- The deterministic self-profile is returned unchanged.
- `refinementSource` is set to `"minimax-fallback"`.
- The error is logged.
- The error message MAY be appended to the top-level `errors: string[]` array.

## G. Implementation Sketch (Website Side)

```ts
// New file: apps/web/src/app/api/score-address/route.ts

export async function POST(request: Request) {
  const { address, chain } = await request.json();
  // 1. Validate address (0x-prefixed, 42 chars, BSC)
  // 2. Fetch AVE address/tx history for queried wallet
  // 3. Fetch token enrichment for each traded token
  // 4. Build NormalizedAddressHistoryInput
  // 5. Run deterministic selfProfile: buildAddressStyleProfile()
  // 6. Optionally run MiniMax refinement on selfProfile
  // 7. Compute czScore deterministically from selfProfile
  // 8. Read existing cached smart-money snapshot (no new AVE fetch), compute smartMoney
  // 9. For each of 3 fixed tracked addresses:
  //    a. Fetch tracked address AVE history
  //    b. Build tracked address profile
  //    c. Compute similarity score vs queried wallet
  // 10. Assemble ScoreAddressResponse with cache + errors
}
```

Reuses existing `packages/core` functions:

- `buildAddressStyleProfile()` — produces `AddressStyleProfile`
- `determineAddressAnalysisConfidence()` — confidence level
- `buildAddressAnalysisSummary()` — summary string
- `buildAddressAnalysisEvidence()` — evidence array
- `resolveSourceStatus()` — source status

No new scoring functions are needed in `packages/core`. V2 is a website-side orchestration layer that reuses the existing deterministic pipeline and adds czScore, smartMoney, and trackedAddressScores computation.
