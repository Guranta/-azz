# Project Handoff

Last updated: 2026-04-12

## 1. Project Goal

Build a two-surface product for BSC meme-token affinity analysis:

1. A public website (Next.js App Router)
2. A single OpenClaw skill (thin API relay)

The project focuses on BSC meme tokens launched from `fourmeme` and `flap`.

### Inputs

| Input | Route | Output |
|-------|-------|--------|
| BSC token contract address | `/token/[address]` | Full scoring report + trade panel |
| BSC wallet address | `/address/[address]` | Minimalist wallet profile |

### Outputs

- Token brief (name, symbol, launchpad, risk, narratives)
- CZ affinity score (deterministic + MiniMax)
- 3 tracked-address affinity scores (frozen driver system + MiniMax)
- Smart-money heat (top100 ∩ smart-wallet overlap)
- Wallet profile with archetype (畜生/P子/钻石手/数据不足)
- BSC trading capability (buy/sell via AVE Bot Wallet)

## 2. Product Boundaries

### In Scope

- BSC only
- `fourmeme` and `flap` as the main launchpad focus
- One public persona: `CZ`
- 3 fixed tracked addresses with frozen driver system snapshots
- Website query flow
- OpenClaw query skill
- AVE token data + risk integration
- MiniMax AI scoring (deterministic-first, AI-refined)
- V3 BSC trading via AVE Bot Wallet
- VPS deployment (Docker)

### Out of Scope

- Multi-chain support
- Browser wallet (MetaMask, WalletConnect)
- Auto-copy-trading (自动跟单)
- Limit orders, stop-loss, trailing stop
- Strategy engine or scheduled trades
- Database
- Admin panel
- Real-time hot-flow / popular-stream
- Multiple public personas

## 3. Fixed Technical Decisions

| Decision | Choice |
|----------|--------|
| Package manager | `npm` (workspaces monorepo) |
| Framework | Next.js 16 App Router + TypeScript + Tailwind |
| Shared logic | `packages/core` |
| Config source | Local JSON files in `config/` |
| AI provider | MiniMax (Anthropic API, M2.7 model) |
| Data provider | AVE API |
| Trading | AVE Bot Wallet API (HMAC-SHA256) |
| Deployment | Docker + docker-compose, standalone Next.js |
| Build mode | webpack (Turbopack disabled for non-ASCII paths) |

## 4. Current Repo Structure

```
apps/web/                    # Next.js website
packages/core/               # Shared types, scoring, providers
config/                      # JSON configuration files
skills/                      # OpenClaw skill assets
docs/                        # Documentation
```

Key source files:

| File | Purpose |
|------|---------|
| `apps/web/src/lib/score-token.ts` | V1 token scoring orchestration |
| `apps/web/src/lib/score-address.ts` | V2 address profiling orchestration |
| `apps/web/src/lib/tracked-driver-systems.ts` | Frozen driver scoring logic |
| `apps/web/src/lib/tracked-driver-systems.data.ts` | Frozen driver snapshot data |
| `packages/core/src/providers/minimax.ts` | MiniMax provider (fast mode, no retry) |
| `packages/core/src/scoring/cz-affinity.ts` | Deterministic CZ scoring |
| `packages/core/src/scoring/address-analysis.ts` | Address profile builder |
| `packages/core/src/services/ave-data.ts` | AVE REST client |
| `packages/core/src/types/index.ts` | All shared type definitions |
| `config/tracked-addresses.json` | 3 tracked address configs |
| `config/tracked-driver-systems.json` | Frozen driver snapshot data |

## 5. Scoring Architecture Summary

### V1 Token Scoring (`POST /api/score-token`)

6-step pipeline:
1. AVE token detail + risk
2. CZ persona scoring (deterministic + MiniMax 60s no-retry)
3. Smart-money scoring (top100 ∩ smart-wallet snapshot)
4. Frozen driver scoring (3 tracked addresses, static snapshots)
5. MiniMax tracked-address refinement (60s no-retry)
6. Merge → recommendation

### V2 Address Profiling (`POST /api/score-address`)

5-step pipeline:
1. AVE wallet transaction history
2. Filter to fourmeme/flap meme activity
3. Deterministic wallet profile
4. Optional MiniMax refinement (60s no-retry)
5. Derive archetype (畜生/P子/钻石手/数据不足)

### V3 Trading (`/api/trade/*`)

5 endpoints: wallet/generate, wallet, approve, swap, orders.
Server-side only; browser never sees AVE credentials.

## 6. Execution History

All prior tasks are complete. Key milestones:

| ID | Task | Status |
|----|------|--------|
| T1–T9 | Project skeleton through OpenClaw skill | done |
| O1–O7 | Fixed-address capability, smartmoney, skill polish | done |
| C1–C12 | API, UI, scoring, hardening, MiniMax optimization | done |
| A7 | V3 trading contract (docs) | done |
| C11 | V3 trading implementation | done |
| G1, G4 | Deployment prep, repo cleanup | done |

### Current state

- V1 token scoring: live and working
- V2 address profiling: live and working
- V3 BSC trading: implemented, ready for funded wallets
- Frozen driver system: switched from live chain queries to static snapshots
- MiniMax: 60s single-wait, no retry for all scoring paths
- Deployment materials: Dockerfile, docker-compose.yml, nginx config ready

## 7. Pending Items

- **VPS deployment** (`T10`): Deploy to Ubuntu VPS using docker-compose
- **Auto-copy-trading**: Not yet implemented, planned for future
- **Frozen driver refresh**: Current snapshots dated 2026-04-11, need periodic refresh

## 8. Documentation Map

| Document | Purpose |
|----------|---------|
| `docs/ARCHITECTURE.md` | Full architecture guide |
| `docs/RUNBOOK.md` | Operations and deployment runbook |
| `docs/V3_TRADING_CONTRACT.md` | V3 trading API contract |
| `docs/V2_ADDRESS_PROFILE_CONTRACT.md` | V2 address profiling contract |
| `docs/MINIMAX_RUNTIME_CONTRACT.md` | MiniMax prompt/response contract |
| `docs/TASK_TRACKER.md` | Task progress board |
| `docs/WINDOW_PLAYBOOK.md` | Multi-AI-window coordination guide |
| `docs/CZ_PERSONA_T4_COMPLETION.md` | CZ persona asset documentation |
| `README.md` | Deployment instructions |

## 9. Important Constraints

Do not change without explicit approval:

- Do not add a database
- Do not add a backend admin panel
- Do not replace Next.js
- Do not move shared contracts out of `packages/core`
- Do not make the OpenClaw skill do heavy analysis locally
- Do not change website API route shapes casually
- Keep the website as the source of truth for scoring

## 10. Environment Notes

- Windows path contains non-ASCII characters → webpack mode instead of Turbopack
- PowerShell execution policy may block npm → use `cmd /c npm.cmd ...`
- Default Next.js favicon removed due to path quoting issues
