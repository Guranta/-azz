# Data Contract (Fixed Tracked Addresses, V1)

This contract is for the internal fixed-address capability only.

## Fixed-Scope Rule

- This capability accepts only the locked V1 catalog below.
- It must not accept arbitrary addresses from end users.
- Website-side wiring must reject any address outside this list.

| id | emoji | addressName | address |
| --- | --- | --- | --- |
| `wang-xiao-er` | `😎` | `王小二` | `0x176e6378b7c9010f0456bee76ce3039d36dc37c8` |
| `leng-jing` | `🧊` | `冷静` | `0xeb89055e16ae1c1e42ad6770a7344ff5c7b4f31d` |
| `a-feng` | `👿` | `阿峰` | `0xbf004bff64725914ee36d03b87d6965b0ced4903` |

The website config remains the source of truth for display labels and logos. This document must stay aligned with that V1 display contract and must not introduce a conflicting public naming layer.

## Required Input Envelope

The `tracked_address` block below is copyable as-is.

```json
{
  "chain": "bsc",
  "catalogVersion": "v1-fixed-addresses-2026-04-10",
  "token_context": {
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
  "top100_context": {
    "holdersSnapshotAt": "2026-04-10T10:00:00Z",
    "trackedAddressHit": true,
    "holderRank": 38
  },
  "smartmoney_context": {
    "smartWalletSnapshotAt": "2026-04-10T10:00:00Z",
    "trackedAddressHit": true,
    "intersectionSource": "top100_holders_intersect_smart_wallet_list"
  },
  "tracked_address": {
    "id": "wang-xiao-er",
    "address": "0x176e6378b7c9010f0456bee76ce3039d36dc37c8",
    "addressName": "王小二",
    "emoji": "😎",
    "logoKey": "config-provided",
    "logoMode": "config-provided"
  },
  "recent_history": {
    "source": "ave_get_v2_address_tx",
    "window": {
      "limit": 100,
      "from": "2026-04-03T00:00:00Z",
      "to": "2026-04-10T00:00:00Z"
    },
    "rawTradeCount": 100,
    "includedTradeCount": 24,
    "excludedTradeCount": 76,
    "excludeReasons": [
      "not_fourmeme_or_flap_launch",
      "not_meme_token",
      "missing_launchpad_metadata"
    ],
    "trades": []
  }
}
```

## Copyable `tracked_address` Variants

Use one of these exact JSON objects without rewriting the human-facing identity fields.

### 王小二

```json
{
  "id": "wang-xiao-er",
  "address": "0x176e6378b7c9010f0456bee76ce3039d36dc37c8",
  "addressName": "王小二",
  "emoji": "😎",
  "logoKey": "config-provided",
  "logoMode": "config-provided"
}
```

### 冷静

```json
{
  "id": "leng-jing",
  "address": "0xeb89055e16ae1c1e42ad6770a7344ff5c7b4f31d",
  "addressName": "冷静",
  "emoji": "🧊",
  "logoKey": "config-provided",
  "logoMode": "config-provided"
}
```

### 阿峰

```json
{
  "id": "a-feng",
  "address": "0xbf004bff64725914ee36d03b87d6965b0ced4903",
  "addressName": "阿峰",
  "emoji": "👿",
  "logoKey": "config-provided",
  "logoMode": "config-provided"
}
```

## Recent History Source Rule

- `recent_history` must be normalized from AVE `GET /v2/address/tx`.
- Keep the original AVE source marker in `recent_history.source`.
- The request limit is fixed to the newest `100` records.
- If fewer than `100` records exist, use the full available set and keep the actual count in `rawTradeCount`.

## Filtering Rule

- Begin with the newest `100` records returned by `GET /v2/address/tx`.
- Keep a trade only when both conditions are true:
  - `launchpad` is exactly `fourmeme` or `flap`
  - the token is a meme launch
- Drop transfers, swaps, approvals, unknown launchpads, non-meme assets, and records missing enough metadata to prove the rule above.
- Every derived field in this capability must use `recent_history.trades`, never the excluded records.

## Trade Shape

```json
{
  "txHash": "0x...",
  "timestamp": "2026-04-08T10:00:00Z",
  "tokenAddress": "0x...",
  "tokenName": "Frog Hero",
  "symbol": "FROG",
  "side": "buy",
  "amountUsd": 120.0,
  "quantity": 1500000,
  "launchpad": "fourmeme",
  "isMemeLaunch": true,
  "narrativeTags": ["animal", "meme"],
  "entryMcapUsd": 180000.0,
  "marketCapBand": "microcap",
  "isClosedInWindow": false,
  "realizedPnlUsd": 36.0,
  "holdMinutes": 60,
  "roiPct": 30.0
}
```

## Mandatory Behavior

- `tracked_address.id` and `tracked_address.address` must match the locked V1 catalog exactly.
- `tracked_address.addressName` and `tracked_address.emoji` must match the agreed V1 display contract exactly.
- `top100_context` and `smartmoney_context` must be token-scoped to the queried token.
- `token_context.narrativeBundle` must describe the queried token, not the wallet history.
- `recent_history.trades` must contain only the filtered `fourmeme` or `flap` meme-token trades.

## Mandatory Input Fields For V1 Scoring

Do not run final scoring if any are missing:

- `recent_history.trades`
- `token_context.narrativeBundle`
- `top100_context.trackedAddressHit`
- `smartmoney_context.trackedAddressHit`

If missing, return a degraded deterministic profile and mark low confidence.

## MiniMax Parsing Contract

Website-side final scoring uses the Anthropic-compatible MiniMax path.

- Only the final assistant `text` block may supply the structured JSON payload.
- `thinking` blocks may help internal debugging but must not be parsed into formal score fields.
- A response with only `thinking` is incomplete.
- If `stop_reason=max_tokens` occurs before valid final `text` JSON arrives, the response is incomplete and deterministic fallback should be used.

See [../../../docs/MINIMAX_RUNTIME_CONTRACT.md](../../../docs/MINIMAX_RUNTIME_CONTRACT.md).

## V1 Holding Semantics

- This capability does not read live wallet balances.
- `holding` is derived only from unclosed positions inside the filtered recent-trade window.
- A token counts as `open` when the window still shows unmatched buy exposure after replaying buys and sells in timestamp order.
- `recent buy distribution` is derived from filtered buy trades in the same window and explains what the wallet is leaning toward now.