---
name: address-trading-style
description: |
  Internal fixed-address capability layer for V1 tracked wallets.
  This skill is not a public entrypoint and must only run on the fixed tracked-address set used by the website.
  It consumes AVE-driven wallet history and token context, then returns a stable profile bundle and MiniMax-ready package for website-side final scoring.
---

# Address Trading Style (Internal Fixed-Address Layer)

## Scope

- Internal capability only
- Fixed tracked addresses only
- No arbitrary user-provided address analysis
- No trade execution, custody, or legal advice

## Locked V1 Address Catalog

This capability accepts only these three tracked addresses:

```text
😎 王小二 0x176e6378b7c9010f0456bee76ce3039d36dc37c8
🧊 冷静 0xeb89055e16ae1c1e42ad6770a7344ff5c7b4f31d
👿 阿峰 0xbf004bff64725914ee36d03b87d6965b0ced4903
```

The catalog is fixed at 3 addresses for V1. Do not expand it here.
Machine-friendly IDs may remain internal, but human-facing names and emoji must stay aligned with the V1 display contract above.

## Upstream Inputs (V1 Required)

This capability assumes upstream website aggregation has already fetched:

1. The most recent `100` records from `GET /v2/address/tx` for each locked address
2. The current token narrative bundle for the queried token
3. The top100 holder hit state for the locked address
4. The smartmoney hit result produced from top100 holders intersected with `GET /v2/address/smart_wallet/list`

See [references/data-contract.md](./references/data-contract.md).

## Required Filtering Rule

- Start from the raw `100` newest `GET /v2/address/tx` records for the locked address.
- Keep only trades tied to meme tokens launched from `fourmeme` or `flap`.
- Drop every record that is not a confirmed `fourmeme` or `flap` meme launch.
- Build every profile field, narrative preference, size band, cap band, launchpad bias, and position view from the filtered set only.

## MiniMax Role In Fixed-Address Scoring

Fixed-address scoring has two layers:

1. **Deterministic feature extraction and fallback**
2. **Website-side MiniMax final scoring**

Deterministic outputs remain responsible for:

- profile building
- narrative overlap
- hold-time and trading-style classification
- launchpad bias
- whale and smartmoney interpretation
- fallback output if MiniMax is incomplete or unusable

Website-side MiniMax is responsible for the final tracked-address affinity judgment.
That means the final likeability decision must not stop at the deterministic analyzer alone.

## Anthropic-Compatible Response Rule

The website-side MiniMax caller is standardized on:

- `MINIMAX_BASE_URL=https://api.minimaxi.com/anthropic`
- `MINIMAX_API_STYLE=anthropic`
- `MINIMAX_MODEL=MiniMax-M2.7`

Parsing rules:

- final JSON must be parsed only from the final assistant `text` block
- `thinking` blocks are not valid structured output
- a thinking-only response is incomplete, not successful
- if `stop_reason=max_tokens` happens before a valid final `text` JSON block appears, treat the response as incomplete and fall back

See [../../docs/MINIMAX_RUNTIME_CONTRACT.md](../../docs/MINIMAX_RUNTIME_CONTRACT.md).

## Why Wallet History and Token Narrative Must Be Combined

- Wallet history alone explains behavior preference, but not current token fit.
- Token narrative alone explains the token story, but not whether the tracked address historically buys this type.
- V1 scoring quality depends on matching "what this wallet usually does" with "what this token currently is".
- Without both signals, output becomes either generic token commentary or generic wallet profiling.

## Whale and Smartmoney Interpretation Rules

- `top100_holder_hit_state` is an interpretation amplifier, not a standalone buy signal.
- Whale hit increases confidence only when it agrees with history-narrative fit.
- Whale hit with weak history-narrative fit is framed as "attention signal, not conviction".
- `smartmoney_hit_result` is a stronger quality prior than whale hit alone because it is based on top100 intersection with AVE smart-wallet list.
- Smartmoney hit adjusts final explanation and confidence, but does not bypass core history-narrative scoring.

## V1 Position Interpretation Rule

- V1 does not produce a real balance snapshot.
- `holding` means the wallet still has an unclosed position inside the filtered recent-trade window.
- An `unclosed position` exists when the filtered window shows net buy exposure that is not matched by later sells for the same token.
- The website must read position context together with the wallet's recent buy distribution.
- Any token bought before the window or sold outside the window is intentionally out of scope for this V1 capability.

## Output Contract (V1 Required)

Each tracked-address result bundle must include:

- `addressName`
- `profileSummary`
- `favoriteNarratives`
- `sizeBand`
- `capBand`
- `launchpadBias`

The capability response must also include one top-level `minimaxInputPackage` that the website sends to MiniMax without changing field meanings.

For final fixed-address JSON expectations, see:

- [references/scoring-model.md](./references/scoring-model.md)
- [references/minimax-input-shape.md](./references/minimax-input-shape.md)

## Guardrails

- Keep this layer internal to website aggregation.
- Do not change public website API shape here.
- Do not add a second public skill.
- Keep the three locked addresses and the `fourmeme` / `flap` rules unchanged.