# Internal Integration Notes

This capability is wallet-first and fixed-address-only.

## Position in V1 Pipeline

1. AVE layer fetches token context, top100 holders, smart-wallet list, and `GET /v2/address/tx` for each tracked address.
2. Website-side normalization keeps only `fourmeme` or `flap` meme-token trades from the newest `100` address records.
3. This internal capability layer builds per-address deterministic profile bundles.
4. Website-side MiniMax consumes the fixed-address input package and produces the final tracked-address explanation JSON.
5. Website synthesis merges persona, fixed-address outputs, smartmoney context, and risk context.

## Smartmoney Participation in Final Website Judgment

- Smartmoney hit comes from top100 holders intersected with AVE smart-wallet list.
- Treat it as a confidence and quality multiplier, not as a hard override.
- If smartmoney hit exists and history + narrative fit is strong, website uses stronger conviction language.
- If smartmoney hit is absent but fit is strong, website preserves a positive but more cautious conclusion.

## Whale Hit Participation in Explanation

- Whale hit (`top100_holder_hit_state`) is visible in address-level explanation.
- Whale hit strengthens interpretation only when behavior fit exists.
- Whale hit without fit is explained as passive holder state or weak alignment.

## Locked Address Guidance

- V1 internal capability is locked to exactly three tracked addresses:
  - `wang-xiao-er`
  - `leng-jing`
  - `a-feng`
- Keep outputs compact and comparable so the website can render all three addresses side by side.

## Position Semantics

- The fixed-address layer does not represent a wallet-balance system.
- Website-side explanations must describe `holding` as unclosed positions inside the recent filtered trade window.
- Website-side explanations must pair `holding` with `recentBuyDistribution` so the reader sees both open exposure and current buying preference.

## MiniMax Runtime Boundary

- Fixed-address final likeability is produced by website-side MiniMax, not by deterministic scoring alone.
- Deterministic scoring remains the feature extractor and fallback path.
- Formal JSON parsing must use only the final assistant `text` block.
- `thinking` blocks are never valid fixed-address result payloads.
- A thinking-only response is incomplete and should not be treated as success.

See [../../../docs/MINIMAX_RUNTIME_CONTRACT.md](../../../docs/MINIMAX_RUNTIME_CONTRACT.md).

## Stability Rules

Keep these fields stable across internal handoffs:

- `addressName`
- `logoKey`
- `logoMode`
- `profileSummary`
- `favoriteNarratives`
- `sizeBand`
- `capBand`
- `launchpadBias`
- `narrativeAffinityScore`
- `buyLikelihoodScore`
- `whaleSignal`
- `smartmoneySignal`
- `positionView`
- `confidence`
