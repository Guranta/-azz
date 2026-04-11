# Scoring Model (Fixed Address + Token Narrative)

Keep scoring deterministic, explainable, and compatible with website-side MiniMax final synthesis.

## Why Wallet History + Token Narrative Is Required

- Wallet history captures historical behavior: speed, sizing, launchpad bias, and repeated themes.
- Token narrative captures what the current token represents right now.
- Fixed-address scoring quality requires both: behavior fit (history) plus context fit (narrative).
- Using only one side causes false positives:
  - History-only: overfits old behavior and misses new token context
  - Narrative-only: ignores actual wallet habits and risk posture

## Two-Layer Scoring Design

### Layer 1: Deterministic feature extraction and fallback

This layer remains responsible for:

- `profileSummary`
- `favoriteNarratives`
- `sizeBand`
- `capBand`
- `launchpadBias`
- `risk_appetite_score`
- `narrative_affinity_score`
- `buy_likelihood_score`
- `whale_signal`
- `smartmoney_signal`
- fallback summaries and evidence when MiniMax is incomplete

### Layer 2: Website-side MiniMax final scoring

The website-side MiniMax step is the final tracked-address judge.
It consumes the deterministic bundle plus token context and returns the final explanation payload used by the website.

For V1, the MiniMax final JSON must support these final fields:

- `narrativeAffinityScore`
- `buyLikelihoodScore`
- `confidence`
- `summary`
- `evidence`

These fields remain deterministic feature fields and should not be invented by MiniMax if already supplied upstream:

- `styleLabels`
- `launchpadBias`

If MiniMax does not return a valid final JSON object, the deterministic layer is the fallback.

## MiniMax Runtime Contract

The website-side caller is standardized on:

- `MINIMAX_BASE_URL=https://api.minimaxi.com/anthropic`
- `MINIMAX_API_STYLE=anthropic`
- `MINIMAX_MODEL=MiniMax-M2.7`

Response rules:

- parse JSON only from the final assistant `text` block
- never parse `thinking` blocks into the final fixed-address result
- treat a thinking-only response as incomplete
- if `stop_reason=max_tokens` occurs before valid final `text` JSON appears, treat the response as incomplete

This prevents a thinking-only response from being counted as a successful tracked-address score.

## Base Fit (History x Narrative)

`base_fit_score` combines:

- `50%` wallet narrative overlap with token narrative bundle
- `25%` launchpad match with current token launchpad
- `25%` wallet timing / risk fit against token conditions

`base_fit_score` is the primary deterministic component for fixed-address affinity.

## How Profile Fields Are Derived

### favoriteNarratives

- Count narrative-tag frequency across filtered buy trades only.
- Rank tags by:
  - highest trade count
  - then highest summed `amountUsd`
  - then most recent timestamp
- Return the top `3` tags as `favoriteNarratives`.

### sizeBand

- Use the median `amountUsd` across filtered buy trades.
- Map it deterministically:
  - `< 200` -> `micro-ticket`
  - `200-999.99` -> `small-ticket`
  - `1000-4999.99` -> `medium-ticket`
  - `>= 5000` -> `large-ticket`

### capBand

- Use the modal `marketCapBand` across filtered buy trades.
- Break ties by the highest summed `amountUsd` inside the tied bands.
- If no filtered trade has a cap band, fall back to `token_context.currentCapBand`.
- If neither source exists, return `unknown`.

### launchpadBias

- Measure filtered trade counts by launchpad.
- Map the dominant launchpad deterministically:
  - `fourmemeShare >= 0.65` -> `dominant = fourmeme`
  - `flapShare >= 0.65` -> `dominant = flap`
  - otherwise -> `dominant = balanced`
- Always keep both `fourmemeShare` and `flapShare` in the output so website-side explanations can quote the ratio directly.

## Top100 Whale Hit (whale signal)

Source: tracked-address presence in token top100 holders.

Interpretation guidance:

- Whale hit is a participation signal, not direct conviction proof.
- Whale hit increases explanation weight and confidence when `base_fit_score` is already medium / high.
- Whale hit with weak base fit is explained as attention only.

Mapping:

- hit false -> `whale_signal = low`
- hit true and rank <= 30 -> `whale_signal = high`
- hit true and rank > 30 -> `whale_signal = medium`

## Smartmoney Hit (intersection signal)

Source: tracked address in top100 holders intersected with AVE smart-wallet list.

Interpretation guidance:

- Smartmoney hit is a stronger quality prior than whale hit alone.
- Smartmoney hit raises confidence and slightly lifts final likelihood when base fit is not weak.
- Smartmoney miss does not force a negative call if history + narrative fit is strong.

Mapping:

- hit false -> `smartmoney_signal = low`
- hit true -> `smartmoney_signal = high`

## Final Internal Likelihood

`buy_likelihood_score` formula:

- `70%` base fit
- `15%` whale adjustment
- `15%` smartmoney adjustment

Adjustment rules:

- whale high: +8, whale medium: +4, whale low: +0
- smartmoney high: +10, smartmoney low: +0

Clamp final score to `0..100`.

## Confidence

- `high`: 10 or more recent trades + narrative bundle present + whale / smartmoney states present
- `medium`: 5 to 9 trades + most context present
- `low`: fewer than 5 trades or missing any mandatory context

## V1 Position View

- Build the position view from the filtered recent-trade window only.
- Replay filtered buys and sells in timestamp order for each token.
- Mark a token as an `openPosition` when the replay ends with unmatched buy exposure.
- `openPosition.netBuyUsd` is the remaining unmatched buy notional inside the window.
- `recentBuyDistribution` is calculated from filtered buy trades in the same window and shows what the wallet has been buying most recently.
- This position view is descriptive only and must not be presented as a real-time balance.

## V1 Operational Note

Because V1 tracks exactly 3 fixed addresses, per-address explanations are concise and explicit:

- what in history matched
- what in narrative matched
- whether whale hit existed
- whether smartmoney hit existed
- whether the wallet still shows an unclosed window position
- why final score was adjusted
