# Architecture Guide

Last updated: 2026-04-13

---

## 1. System Overview

**Product name:** 爱赵赵 (BSC Meme Affinity Platform)

A two-surface product for BSC meme-token affinity analysis:

1. **Public website** — Next.js App Router, SSR, TypeScript, Tailwind
2. **OpenClaw skill** — thin relay that calls the website API

The platform focuses exclusively on BSC meme tokens launched from `fourmeme` and `flap`.

### Surface summary

| Surface | Purpose | Entry |
|---------|---------|-------|
| `/` | Homepage with search form | Token/address input |
| `/token/[address]` | Full token scoring report + trade panel | Token contract address |
| `/address/[address]` | Minimalist wallet profile page | BSC wallet address |
| `/scan/[query]` | Smart router: probes AVE, redirects to token or address | Any BSC address |
| `/tech` | Architecture and scoring explanation | Static page |
| `POST /api/score-token` | Token scoring API | Token address |
| `POST /api/score-address` | Address profiling API | Wallet address |
| `POST /api/trade/*` | 6 trade endpoints | Binding code / assetsId |

---

## 2. Repository Structure

```
bsc-meme-affinity-platform/
├── apps/web/                          # Next.js 16 website (webpack mode)
│   ├── src/app/                       # App Router pages and API routes
│   │   ├── page.tsx                   # Homepage
│   │   ├── tech/page.tsx             # Tech explanation page
│   │   ├── scan/[query]/page.tsx     # Smart address router
│   │   ├── token/[address]/          # Token scoring result
│   │   │   ├── page.tsx             # Main token page (SSR)
│   │   │   └── loading.tsx          # Loading skeleton
│   │   ├── address/[address]/        # Wallet profile result
│   │   │   ├── page.tsx             # Main address page (SSR)
│   │   │   └── loading.tsx          # Loading skeleton
│   │   └── api/
│   │       ├── score-token/route.ts  # V1 token scoring endpoint
│   │       ├── score-address/route.ts# V2 address profiling endpoint
│   │       └── trade/                # Trade endpoints
│   │           ├── wallet/generate/  # Create platform-managed wallet
│   │           ├── wallet/           # Wallet identity + balance
│   │           ├── bind/             # Bind by bindingCode
│   │           ├── approve/          # Token approval
│   │           ├── swap/             # Market swap (buy/sell)
│   │           └── orders/           # Order status query
│   ├── src/components/
│   │   ├── trade-panel.tsx           # Trading UI (wallet + approve + swap)
│   │   ├── token-search-form.tsx     # Search input component
│   │   ├── sponsor-surface.tsx       # AVE/MiniMax/BNB sponsor display
│   │   ├── site-nav.tsx             # Navigation bar
│   │   └── level-badge.tsx          # Display level badge
│   ├── src/lib/
│   │   ├── score-token.ts            # V1 token scoring orchestration
│   │   ├── score-address.ts          # V2 address profiling orchestration
│   │   ├── tracked-driver-systems.ts # Frozen driver scoring logic
│   │   ├── tracked-driver-systems.data.ts # Frozen driver snapshots
│   │   ├── smartmoney-snapshot.ts    # 24h smart-money cache
│   │   ├── runtime-metrics.ts       # AVE API call counter
│   │   ├── project-config.ts        # Persona/tracked-address config loader
│   │   ├── ave-bot-client.ts        # AVE Bot API client (HMAC-SHA256)
│   │   ├── binding-store.ts         # Wallet binding store (SQLite)
│   │   └── resolve-trade-credential.ts # Resolve bindingCode → client
│   ├── scripts/                      # Utility scripts
│   └── CLAUDE.md / AGENTS.md        # AI contributor guides
├── packages/core/                     # Shared logic and types
│   └── src/
│       ├── types/index.ts            # All shared type definitions
│       ├── scoring/
│       │   ├── cz-affinity.ts        # Deterministic CZ scoring
│       │   ├── address-analysis.ts   # Address profile builder
│       │   ├── live-contract.ts      # Display level / persona display
│       │   └── index.ts
│       ├── providers/
│       │   ├── minimax.ts            # MiniMax provider (Anthropic/OpenAI)
│       │   └── index.ts
│       ├── services/
│       │   ├── ave-data.ts           # AVE REST client
│       │   └── index.ts
│       ├── mock/
│       │   ├── score-token-response.ts # Mock data generator
│       │   └── index.ts
│       ├── config/
│       │   └── index.ts              # Config loader + validation
│       └── index.ts                  # Public exports
├── config/                            # Runtime configuration (JSON)
│   ├── personas.json                 # CZ persona config
│   ├── tracked-addresses.json        # 3 fixed tracked addresses
│   └── tracked-driver-systems.json   # Frozen driver snapshot data
├── docs/                              # Project documentation
├── skills/                            # OpenClaw skill assets
│   ├── meme-affinity-query/          # Public query skill
│   ├── cz-persona/                   # CZ persona asset (internal)
│   └── address-trading-style/        # Address style skill (internal)
├── Dockerfile                         # Multi-stage Docker build
├── docker-compose.yml                 # Production deployment
├── .env.example                       # Environment variable template
└── next.config.ts                     # Next.js config (standalone output)
```

---

## 3. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Node.js 20+ | Alpine for Docker |
| Framework | Next.js 16.2.2 (webpack) | Turbopack disabled due to non-ASCII path |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS | Custom design tokens via CSS variables |
| Package manager | npm | npm workspaces monorepo |
| AI provider | MiniMax (Anthropic API) | M2.7 model, server-side only |
| Data provider | AVE API | Token detail, risk, top holders, smart wallets, address tx |
| Trading | AVE Bot Wallet API | HMAC-SHA256 auth, BSC only, platform-managed wallets |
| Deployment | Docker + docker-compose | Standalone Next.js output |

---

## 4. Scoring Architecture

### 4.1 V1: Token Scoring

**Endpoint:** `POST /api/score-token`

**Input:** BSC token contract address

**Output:** `ScoreTokenResponse` with 7 top-level keys:

```
token          — TokenBrief (name, symbol, launchpad, risk, narratives)
personaScores — PersonaScore[] (CZ affinity)
addressScores — AddressScore[] (3 tracked addresses, frozen driver + MiniMax)
smartMoney     — SmartMoneyScore (top100 ∩ smart-wallet overlap)
recommendation — Recommendation (STRONG_BUY / BUY / WATCH / DO_NOT_BUY)
cache          — { hit, expiresAt }
errors         — string[]
```

**Scoring pipeline (6 steps):**

1. Fetch token detail + risk from AVE
2. CZ persona scoring: deterministic rules + MiniMax refinement (60s, no retry)
3. Smart-money scoring: top100 holders ∩ 24h smart-wallet snapshot
4. Frozen driver scoring: pre-collected snapshots for 3 tracked addresses
5. MiniMax tracked-address refinement (60s, no retry)
6. Merge all channels into recommendation

### 4.2 V2: Address Profiling

**Endpoint:** `POST /api/score-address`

**Input:** BSC wallet address

**Output:** `ScoreAddressResponse` with 4 top-level keys:

```
address  — { address, chain }
profile  — ScoreAddressProfile (style, risk, archetype, evidence)
cache    — { hit, expiresAt }
errors   — string[]
```

**Profile pipeline:**

1. Fetch recent wallet transactions from AVE `GET /v2/address/tx`
2. Filter to fourmeme/flap meme activity (address suffix heuristic)
3. Build deterministic profile via `packages/core/scoring/address-analysis.ts`
4. Optional MiniMax refinement (60s, no retry, falls back to deterministic)
5. Derive archetype: `畜生` / `P子` / `钻石手` / `数据不足`

**Archetype rules:**

| Condition | Archetype |
|-----------|-----------|
| `recentTradeCount < 3` or `sourceStatus = unavailable` | 数据不足 |
| `holder` + `cautious/balanced` + `repeat-buyer` | 钻石手 |
| `sniper/scalper` + `aggressive` | 畜生 |
| `sniper/scalper` | 畜生 |
| Default | P子 |

### 4.3 Frozen Driver System

The tracked-address scoring has been switched from live chain queries to a **frozen driver system**.

**What it is:** Pre-collected, static snapshots of 3 tracked addresses' historical trading behavior.

**3 tracked addresses:**

| ID | Name | Address | Sampled trades | Profile |
|----|------|---------|---------------|---------|
| `wangxiaoer` | 😎 王小二 | `0x176e...37c8` | 10 | large-cap Chinese tokens, $1172 median buy |
| `lengjing` | 🧊 冷静 | `0xeb89...f31d` | 19 | cautious, mid/large cap, 50h median hold |
| `afeng` | 👿 阿峰 | `0xbf00...4903` | 200 (sampled from 4921) | aggressive micro-cap scalper, 0-2min hold |

**Frozen snapshot contains per driver:**

- `buyInMarketCapBand` — preferred market cap ranges
- `tokenNameStyle` — preferred naming patterns (chinese, meme, ai, etc.)
- `narrativePreference` — narrative tag preferences
- `holdDurationBias` — median/p90 hold duration
- `launchpadBias` — fourmeme/flap preference
- `riskAppetite` — median buy size, dominant risk levels, median ROI
- `tradingRhythm` — trade span, buy count, trades/day estimate
- `sampleTokens` — up to 4 example tokens with full metadata

**Scoring logic (`tracked-driver-systems.ts`):**

6 scoring dimensions, each contributing 0-28 points:

| Dimension | Max points | What it measures |
|-----------|-----------|-----------------|
| `scoreBandFit` | 28 | Token market cap vs driver's preferred cap band |
| `scoreNameStyleFit` | 22 | Token name style vs driver's preferred styles |
| `scoreNarrativeFit` | 18 | Token narrative tags vs driver preferences |
| `scoreLaunchpadFit` | 12 | Token launchpad vs driver's launchpad bias |
| `scoreRiskFit` | 12 | Token risk level vs driver's risk appetite |
| `scoreRhythmFit` | 10 | Token cap band vs driver's trading rhythm |

**Bonus modifiers:**

| Condition | Bonus |
|-----------|-------|
| Top100 holder, rank ≤ 20 | +14 |
| Top100 holder, rank > 20 | +9 |
| AVE smart wallet | +10 |
| Smart-money matchedCount ≥ 3 | +8 |
| Smart-money matchedCount ≥ 1 | +4 |

**Confidence levels:**

| Sampled trade count | Confidence |
|--------------------|------------|
| ≥ 80 | high |
| ≥ 20 | medium |
| < 20 | low |

### 4.4 MiniMax AI Provider

**Provider:** MiniMax via Anthropic-compatible API

**Default configuration:**

```
MINIMAX_BASE_URL = https://api.minimaxi.com/anthropic
MINIMAX_API_STYLE = anthropic
MINIMAX_MODEL = MiniMax-M2.7
```

**Timeout and retry strategy:**

| Path | Timeout | Retries | Behavior |
|------|---------|---------|----------|
| Token scoring (CZ + tracked) | 60s | None (single attempt) | `fastModeTimeoutMs` enabled |
| Address profiling | 60s | None (single attempt) | `fastModeTimeoutMs` enabled |
| General (unused) | 16s | 1 retry | Default mode |

**Important:** Both token and address paths use `fastModeTimeoutMs: 60000` which:
- Overrides the default timeout to 60 seconds
- Disables retries entirely (single HTTP attempt)
- Falls back to deterministic rules on any failure

**Failure handling:**

| Failure | Code | Recovery |
|---------|------|----------|
| HTTP timeout | `timeout` | Deterministic fallback |
| HTTP 401/403 | `auth_failure` | Deterministic fallback |
| HTTP 429 | `rate_limit` | Deterministic fallback |
| HTTP 5xx | `upstream_5xx` | Deterministic fallback |
| Response only `thinking` | `incomplete_response` | Deterministic fallback |
| `max_tokens` without text | `incomplete_response` | Deterministic fallback |
| Invalid JSON | `invalid_json` | Deterministic fallback |

---

## 5. Trading Architecture

### 5.1 Platform-Managed Wallet Model

The trading system uses a **platform-managed wallet** model:

1. The server holds a single `AVE_BOT_API_KEY` + `AVE_BOT_API_SECRET` pair.
2. Users create wallets through the website (`POST /api/trade/wallet/generate`).
3. The server generates a delegate wallet via AVE Bot API and creates a binding record.
4. The server returns `assetsId`, `walletAddress`, and `bindingCode` (绑定码) to the user.
5. Users deposit BNB/USDT to their wallet address.
6. All subsequent trade operations (approve, buy, sell) use the binding code or assetsId.
7. The OpenClaw skill uses `bind <绑定码>` to bind, then operates via binding code only.

**Key principle:** Users never provide API keys or secrets. The platform manages everything.

### 5.2 Data Model

Wallet bindings are stored in SQLite:

| File | Purpose |
|------|---------|
| `.runtime/trade-bindings.db` | Wallet binding relationships (assetsId, walletAddress, bindingCode, status, timestamps) |

Schema:

```sql
CREATE TABLE wallet_bindings (
  assets_id        TEXT PRIMARY KEY,
  wallet_address   TEXT NOT NULL,
  binding_code     TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'active',
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
```

### 5.3 API Endpoints

#### `POST /api/trade/wallet/generate`

Primary onboarding path. Creates a platform-managed delegate wallet.

**Request:** (empty body)

**Response (200):**

```typescript
{
  assetsId: string;
  walletAddress: string;  // BSC wallet address
  chain: "bsc";
  bindingCode: string;   // 绑定码 for skill binding
  createdAt: string;
}
```

**AVE mapping:** `POST /v1/thirdParty/user/generateWallet`

#### `GET /api/trade/wallet`

Query wallet identity and balance.

**Query params:** `?bindingCode=...` (preferred) or `?assetsId=...`

**Response:** `GetWalletResponse` with `balanceState` and `balances`.

#### `POST /api/trade/bind`

Bind a skill session to a wallet via binding code.

**Request:** `{ bindingCode: string }`

**Response:** `{ assetsId, status, wallet? }`

#### `POST /api/trade/approve`

Approve AVE spender for a token.

**Request:** `{ bindingCode (or assetsId), tokenAddress }`

#### `POST /api/trade/swap`

Submit a market swap order.

**Request:** `{ bindingCode (or assetsId), tokenAddress, side, amount, baseToken, slippageBps, confirmToken }`

#### `GET /api/trade/orders`

Query order status.

**Query params:** `?ids=...&bindingCode=...` (or `assetsId`)

### 5.4 Binding Model

| Binding field | Source | Purpose |
|---------------|--------|---------|
| `assetsId` | AVE delegate wallet lifecycle | Trade operation anchor |
| `bindingCode` (绑定码) | Website wallet generation | Skill ↔ website handshake |
| `walletAddress` | AVE wallet generation response | User deposit target |

Design intent:
- `assetsId` is the trade-config binding anchor.
- `bindingCode` (绑定码) is the skill-binding anchor.
- Both resolve to the same wallet. Skill only uses `bindingCode`.

### 5.5 Risk Controls

| Control | Implementation |
|---------|---------------|
| Chain lock | Server hardcodes `chain: "bsc"` |
| Operation lock | approve, buy, sell only |
| Confirmation lock | Skill requires explicit confirmation |
| Anti-fat-finger | `confirmToken` must match `tokenAddress` |
| Slippage clamp | 1%–50% (100–5000 bps) |
| No mnemonic storage | Discarded after generation |
| No auto-trading | No scheduled/triggered trades |
| No user keys | Platform manages all AVE Bot credentials |

### 5.6 BSC Token Addresses

| Asset | AVE address |
|-------|-------------|
| BNB (native) | `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` |
| USDT on BSC | `0x55d398326f99059ff775485246999027b3197955` |

---

## 6. API Reference

### 6.1 `POST /api/score-token`

**Request:**

```typescript
{
  tokenAddress: string;  // BSC token contract address
  chain?: "bsc";         // defaults to "bsc"
}
```

**Response (200):** `ScoreTokenResponse`

### 6.2 `POST /api/score-address`

**Request:**

```typescript
{
  address: string;  // BSC wallet address
  chain?: "bsc";
}
```

**Response (200):** `ScoreAddressResponse`

### 6.3 Trade Endpoints

See Section 5.3 for the full trade API reference.

---

## 7. Data Flow Diagrams

### 7.1 Token Scoring Flow

```
User input: token address
        │
        ▼
   /scan/[query] ──── AVE probe ──── redirect to /token/[address]
        │
        ▼
   /token/[address] (SSR)
        │
        ▼
   POST /api/score-token
        │
        ├──► AVE: fetchTokenBrief (token detail + risk)
        ├──► AVE: fetchTokenTopHolders (top 100)
        ├──► AVE: fetchSmartWalletList (smart wallets)
        ├──► Deterministic: CZ scoring
        ├──► MiniMax: CZ refinement (60s, no retry)
        ├──► AVE: fetch token market cap (for frozen driver context)
        ├──► Deterministic: frozen driver scoring (3 addresses)
        ├──► MiniMax: tracked-address refinement (60s, no retry)
        ├──► Deterministic: smart-money overlap
        └──► Merge → recommendation → response
```

### 7.2 Address Profiling Flow

```
User input: wallet address
        │
        ▼
   /scan/[query] ──── AVE probe ──── redirect to /address/[address]
        │
        ▼
   /address/[address] (SSR)
        │
        ▼
   POST /api/score-address
        │
        ├──► AVE: GET /v2/address/tx (recent transactions)
        ├──► Filter to fourmeme/flap meme tokens
        ├──► AVE: fetchTokenBrief per traded token
        ├──► Deterministic: buildAddressProfile
        ├──► MiniMax: refineAddressProfile (60s, no retry)
        └──► Derive archetype → response
```

### 7.3 Wallet Onboarding Flow

```
User clicks "创建钱包"
        │
        ▼
   POST /api/trade/wallet/generate (server uses platform AVE key)
        │
        ├──► AVE: POST /v1/thirdParty/user/generateWallet
        ├──► Server creates binding record (assetsId + bindingCode)
        └──► Response: { assetsId, address, bindingCode }
        │
        ▼
   Frontend displays wallet address + 绑定码
        │
        ▼
   User deposits BNB/USDT → refreshes balance
        │
        ▼
   GET /api/trade/wallet?bindingCode=...
        │
        ├──► Resolve bindingCode → assetsId
        ├──► AVE: wallet identity + balance
        └──► Response: { balanceState: "funded", ... }
        │
        ▼
   Trade enabled (approve / buy / sell)
```

---

## 8. Runtime Data

### 8.1 Persistent Files

All runtime files live in `apps/web/.runtime/` (Docker: bind-mounted from `/opt/meme-affinity/runtime/`).

| File | Purpose | TTL |
|------|---------|-----|
| `ave-metrics.json` | Cumulative AVE API call counter | Permanent |
| `smartmoney-snapshot.json` | 24h smart-wallet list cache | 5 minutes |
| `trade-bindings.db` | Wallet binding relationships (SQLite) | Permanent |

`trade-bindings.db` persistence is mandatory across container restarts and image rebuilds.

### 8.2 In-Memory Caches

| Cache | TTL | Key | Scope |
|-------|-----|-----|-------|
| Address profile | 5 minutes | Wallet address (lowercase) | `score-address.ts` |
| Smart-money snapshot | 5 minutes | Single global snapshot | `smartmoney-snapshot.ts` |

---

## 9. Configuration

### 9.1 JSON Config Files

| File | Contents |
|------|----------|
| `config/personas.json` | CZ persona definition |
| `config/tracked-addresses.json` | 3 tracked addresses with IDs, names, emoji |
| `config/tracked-driver-systems.json` | Frozen driver snapshot data |

### 9.2 Environment Variables

#### Required Core

```
AVE_API_KEY                 # AVE data API key (token detail, risk, holders, smart wallets, address tx)
MINIMAX_API_KEY             # MiniMax API key (or ANTHROPIC_API_KEY alias)
PUBLIC_BASE_URL             # Public URL for self-referencing API calls
```

#### Trading Credentials

```
AVE_BOT_API_KEY             # AVE Bot API key (platform-level, used for all wallet operations)
AVE_BOT_API_SECRET          # AVE Bot API secret (platform-level, used for HMAC signatures)
AVE_BOT_BASE_URL            # Default: https://bot-api.ave.ai (optional)
```

#### Optional / Tunables

```
MINIMAX_BASE_URL            # Default: https://api.minimaxi.com/anthropic
MINIMAX_API_STYLE           # "anthropic" (default) or "openai"
MINIMAX_MODEL               # Default: MiniMax-M2.7
MINIMAX_PLAN                # "token" (default) or "coding"
MINIMAX_TIMEOUT_MS          # Default: 16000 (ms)
MINIMAX_API_HOST            # Override API host

AVE_DATA_BASE_URL           # Default: https://prod.ave-api.com
AVE_REQUEST_TIMEOUT_MS      # Default: 10000 (ms)
BINDING_DB_PATH             # Override SQLite binding DB path
```

---

## 10. Design System

### 10.1 Color Tokens

| Variable | Usage |
|----------|-------|
| `--color-ink` | Primary text |
| `--color-ink-soft` | Secondary text |
| `--color-accent` | Gold accent (#f4c76a → #ff9b62 gradient) |
| `--color-accent-ink` | Text on accent backgrounds |
| `--color-muted` | Muted labels |
| `--color-panel-strong` | Card backgrounds |

### 10.2 Display Levels

| Level | Chinese | Emoji | Score range |
|-------|---------|-------|-------------|
| `LOVE_LOVE` | 爱爱 | 🚀 | ≥ 70 |
| `LOVE` | 爱 | 💛 | ≥ 40 |
| `NO_LOVE` | 不爱 | 🧊 | < 40 |

### 10.3 Page Design Patterns

| Page | Design |
|------|--------|
| `/address/[address]` | **Minimalist large-font portrait.** Giant archetype text (7xl / 12rem) with pulse+shimmer animation. Style badges and narrative tags below. Summary and evidence in subtle cards. |
| `/token/[address]` | **Structured report.** Token snapshot card, CZ score, 3 tracked address cards (fixed order: 王小二/冷静/阿峰), smart-money section, trade panel. |
| `/tech` | **Clean explanation.** Flow steps, 4 scoring channels, system notes (frozen driver, MiniMax strategy, V3 status), AVE metrics counter. |
| `/` | **Hero search.** Gradient title "这个meme币有谁爱❤️", search form, sponsor surface. |

---

## 11. Key Dependencies

### AVE API Endpoints Used

| Endpoint | Method | Purpose | Called by |
|----------|--------|---------|-----------|
| `/v2/tokens/{address}-bsc` | GET | Token detail + risk | score-token, score-address, scan probe |
| `/v2/token/holders` | GET | Top 100 holders | score-token |
| `/v2/address/smart_wallet/list` | GET | Smart wallet list | score-token |
| `/v2/address/tx` | GET | Wallet transaction history | score-address |
| `/v1/thirdParty/user/generateWallet` | POST | Create bot wallet | trade/wallet/generate |
| `/v1/thirdParty/user/getUserByAssetsId` | GET | Wallet identity | trade/wallet |
| `/v1/thirdParty/user/getUserAssets` | GET | Token balances | trade/wallet |
| `/v1/thirdParty/tx/approve` | POST | Token approval | trade/approve |
| `/v1/thirdParty/tx/sendSwapOrder` | POST | Market swap | trade/swap |
| `/v1/thirdParty/tx/getSwapOrder` | GET | Order status | trade/orders |

### AVE API Authentication

Data endpoints use `X-API-KEY` header.

Bot endpoints use HMAC-SHA256: `base64(hmac_sha256(secret, timestamp + METHOD + path + sortedBody))`.

---

## 12. Out of Scope

These are explicitly excluded from the current mainline:

- Real-time hot-flow / popular-stream
- Auto-copy-trading (跟单)
- Browser wallet (MetaMask, WalletConnect)
- Multi-chain (ETH, Base, Solana)
- Limit orders
- Auto-sell / stop-loss / trailing stop
- Strategy engine or scheduled trades
- External business database (Postgres/MySQL) as a primary app store
- Admin panel
- Multiple public personas (only CZ)
- Per-user API key management
