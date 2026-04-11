---
name: smartmoney-daily
description: |
  Internal daily snapshot skill for the V1 smart-money wallet board.
  It consumes the smart_wallet/list candidate universe, keeps only fourmeme and flap meme activity, and publishes a stable 24-hour snapshot for website-side use.
---

# Smartmoney Daily (Internal Snapshot Layer)

## Scope

- Internal skill only
- Snapshot generation only
- BSC only
- No public website route changes
- No public API changes

## Source of Truth

- Candidate wallet universe comes from `GET /v2/address/smart_wallet/list`.
- Ranking uses `totalProfit` from that source.
- Each published wallet uses a normalized recent `30`-trade window.
- The daily snapshot is consumed by website-side rendering.
- The same daily snapshot is consumed by the public OpenClaw skill smartmoney display.

See [references/data-contract.md](./references/data-contract.md).

## Daily Snapshot Rules

1. Start from the latest normalized `smart_wallet/list` dataset.
2. Sort wallets by `totalProfit` in descending order.
3. Walk the ranking from highest to lowest profit.
4. For each wallet, keep only recent trades tied to meme tokens launched from `fourmeme` or `flap`.
5. Skip any wallet whose filtered recent-trade window becomes empty.
6. Publish the first `30` wallets that still have at least one qualifying trade.
7. Stamp the snapshot with `generatedAt` and `expiresAt`.
8. Set `expiresAt` to exactly `24` hours after `generatedAt`.

## Snapshot Output

The published snapshot must include:

- `generatedAt`
- `expiresAt`
- `wallets[]`

Each wallet entry must include at least:

- `address`
- `tag`
- `totalProfit`
- `recentTradeCount`
- `dominantNarratives`
- `launchpadBias`

See [references/snapshot-schema.md](./references/snapshot-schema.md).

## Guardrails

- This skill is a private daily capability, not a public query entrypoint.
- The ranking source stays `smart_wallet/list`.
- Do not include non-meme, non-`fourmeme`, or non-`flap` trades in the published snapshot.
- Keep field names stable so website-side `C3` work can consume the snapshot directly.
