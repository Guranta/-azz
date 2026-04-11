# MiniMax Input Shape (Website-Side Final Consumption)

This file defines the final prompt / input shape emitted by the fixed-address capability layer for website-side MiniMax use.

## Output Bundle Per Fixed Tracked Address

```json
{
  "addressId": "wang-xiao-er",
  "address": "0x176e6378b7c9010f0456bee76ce3039d36dc37c8",
  "addressName": "王小二",
  "emoji": "😎",
  "logoKey": "config-provided",
  "logoMode": "config-provided",
  "profileSummary": "Fast-rotating fourmeme-biased wallet that repeatedly trades animal and AI meme launches.",
  "favoriteNarratives": ["animal", "ai", "community"],
  "sizeBand": "small-ticket",
  "capBand": "microcap",
  "launchpadBias": {
    "dominant": "fourmeme",
    "fourmemeShare": 0.71,
    "flapShare": 0.29
  },
  "narrativeFit": {
    "tokenNarrativeBundle": {
      "primary": ["animal", "meme"],
      "secondary": ["community"],
      "rawTags": ["animal", "meme", "community"]
    },
    "narrativeAffinityScore": 84
  },
  "positionView": {
    "windowType": "recent_filtered_trade_window",
    "openPositions": [
      {
        "tokenAddress": "0xaaa0000000000000000000000000000000000001",
        "symbol": "FROG",
        "launchpad": "fourmeme",
        "entryCount": 2,
        "netBuyUsd": 240.0
      }
    ],
    "recentBuyDistribution": {
      "animal": 0.5,
      "ai": 0.3,
      "community": 0.2
    },
    "note": "This is not a live wallet balance snapshot."
  },
  "marketSignals": {
    "top100HolderHit": true,
    "holderRank": 38,
    "whaleSignal": "medium",
    "smartmoneyHit": true,
    "smartmoneySignal": "high"
  },
  "scores": {
    "riskAppetiteScore": 71,
    "baseFitScore": 78,
    "buyLikelihoodScore": 86
  },
  "confidence": "high",
  "evidence": [
    "Recent history concentrates on animal and meme narratives.",
    "Launchpad behavior aligns with current token launchpad.",
    "Address appears in top100 holders for this token.",
    "Address also appears in smartmoney intersection set."
  ]
}
```

## Locked Address Scope

Only these three fixed V1 address bundles are valid inputs:

```text
wang-xiao-er -> 😎 王小二
leng-jing -> 🧊 冷静
a-feng -> 👿 阿峰
```

Machine-friendly IDs may stay internal, but human-facing identity fields must remain aligned with the V1 display contract above. Display label and logo values come from website config at runtime, so examples here must not imply a different public identity scheme.

## Final MiniMax Request Shape

The website-side MiniMax layer consumes this shape:

```json
{
  "task": "fixed_address_token_affinity_explanation_v1",
  "chain": "bsc",
  "catalogVersion": "v1-fixed-addresses-2026-04-10",
  "tokenContext": {
    "tokenAddress": "0x...",
    "tokenName": "string",
    "tokenSymbol": "string",
    "launchpad": "fourmeme",
    "currentCapBand": "microcap",
    "narrativeBundle": {
      "primary": ["animal", "meme"],
      "secondary": ["community"],
      "rawTags": ["animal", "meme", "community"]
    }
  },
  "interpretationRules": {
    "whaleRule": "Whale hit amplifies fit but never overrides weak history-narrative alignment.",
    "smartmoneyRule": "Smartmoney hit is a stronger quality prior than whale hit and can lift confidence when fit is already present.",
    "positionRule": "Holding means unclosed positions inside the recent filtered trade window plus recent buy distribution, not a real balance snapshot."
  },
  "fixedAddressProfiles": []
}
```

Where `fixedAddressProfiles` is an array of the 3 locked V1 address bundles from the section above.

## Final Response Expectations

Website-side MiniMax must return its final structured JSON in the final assistant `text` block only.

The final response should support these website-consumed fields:

- `narrativeAffinityScore`
- `buyLikelihoodScore`
- `confidence`
- `summary`
- `evidence`

The following remain deterministic inputs and should not be hallucinated if missing:

- `styleLabels`
- `launchpadBias`

## Thinking-Only Failure Rule

If the Anthropic-compatible response contains only `thinking` content, or if `stop_reason=max_tokens` occurs before a valid final `text` JSON block arrives, the response is incomplete and deterministic fallback should be used.

## Notes

- This shape is internal and does not change public API response contracts directly.
- `addressName`, `emoji`, `profileSummary`, `favoriteNarratives`, `sizeBand`, `capBand`, `launchpadBias`, and `positionView` are mandatory fields in the MiniMax input package.
- MiniMax must explain and rank signals, not invent missing input fields.
- Website-side wiring passes this package through as the final MiniMax input without changing field meanings.