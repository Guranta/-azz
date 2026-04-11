# Data Contract (Smartmoney Daily Snapshot, V1)

This contract defines the internal input expected by the `smartmoney-daily` snapshot builder.

## Source Rule

- The candidate wallet universe must originate from `GET /v2/address/smart_wallet/list`.
- Ranking must use `totalProfit` from that source.
- The input must already expose each wallet's newest `30` normalized trades.

## Required Input Envelope

```json
{
  "chain": "bsc",
  "source": "ave_get_v2_address_smart_wallet_list",
  "fetchedAt": "2026-04-10T00:00:00Z",
  "walletCandidates": [
    {
      "address": "0x1111111111111111111111111111111111111111",
      "tag": "Smart Whale 1",
      "totalProfit": 182340.12,
      "recentTrades": [
        {
          "txHash": "0xabc",
          "timestamp": "2026-04-09T18:10:00Z",
          "tokenAddress": "0xaaa",
          "symbol": "FROG",
          "side": "buy",
          "amountUsd": 540.0,
          "launchpad": "fourmeme",
          "isMemeLaunch": true,
          "narrativeTags": ["animal", "meme"]
        }
      ]
    }
  ]
}
```

## Candidate Selection Rules

- Sort `walletCandidates` by `totalProfit` descending.
- Walk that sorted list from top to bottom.
- For each wallet, keep only recent trades where:
  - `launchpad` is exactly `fourmeme` or `flap`
  - `isMemeLaunch` is `true`
- Skip wallets whose filtered recent trade set is empty.
- Stop when `30` qualifying wallets have been collected or the ranked source is exhausted.

## Recent Trade Window Rules

- `recentTrades` must contain at most the newest `30` normalized trades for the wallet.
- `recentTradeCount` in the output is the count of filtered qualifying trades and must be in the range `1..30`.
- The snapshot builder must not look beyond the provided `30`-trade window.

## Derived Fields

### dominantNarratives

- Count narrative-tag frequency across filtered recent trades.
- Rank by:
  - highest trade count
  - then highest summed `amountUsd`
  - then most recent timestamp
- Return the top `3` tags.

### launchpadBias

- Count qualifying recent trades by launchpad.
- Map deterministically:
  - `fourmemeShare >= 0.65` -> `dominant = fourmeme`
  - `flapShare >= 0.65` -> `dominant = flap`
  - otherwise -> `dominant = balanced`
- Always keep `fourmemeShare` and `flapShare` in the output.
