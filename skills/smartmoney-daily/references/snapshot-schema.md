# Snapshot Schema (Smartmoney Daily, V1)

This file defines the published internal snapshot shape.

## Consumers

- Website-side rendering consumes this snapshot directly.
- The public OpenClaw skill smartmoney display consumes the same snapshot data.

## Snapshot Envelope

```json
{
  "generatedAt": "2026-04-10T00:00:00Z",
  "expiresAt": "2026-04-11T00:00:00Z",
  "wallets": [
    {
      "address": "0x1111111111111111111111111111111111111111",
      "tag": "Smart Whale 1",
      "totalProfit": 182340.12,
      "recentTradeCount": 18,
      "dominantNarratives": ["animal", "ai", "community"],
      "launchpadBias": {
        "dominant": "fourmeme",
        "fourmemeShare": 0.72,
        "flapShare": 0.28
      }
    }
  ]
}
```

## Publication Rules

- `generatedAt` is the snapshot completion timestamp in UTC ISO 8601 format.
- `expiresAt` is exactly `24` hours after `generatedAt`.
- `wallets` is ordered by the source ranking after the qualifying-wallet filter is applied.
- `wallets` contains at most `30` entries.
- Every wallet entry must have at least one qualifying recent trade.
- The snapshot is complete only when every published wallet entry includes all mandatory fields.

## Stable Field Meanings

- `address`: wallet address copied from the ranked smart-wallet source
- `tag`: source tag or display label for the wallet
- `totalProfit`: numeric profit value used for ranking
- `recentTradeCount`: count of qualifying `fourmeme` or `flap` meme trades in the recent `30`-trade window
- `dominantNarratives`: top `3` narratives from the qualifying recent trade window
- `launchpadBias`: recent-window launchpad split computed from qualifying trades only
