# V3 BSC Real-Trading Contract

Last updated: 2026-04-11 (revision 2: balance data source + wallet endpoint extension)

Status: **contract only — no implementation**

This document defines the V3 real-trading surface for the website and skill.
It is a planning artifact. No code implements this yet.

## 1. Scope

V3 adds real BSC trading to the existing V1 (token scoring) and V2 (address profiling) surfaces.

Trading uses the **AVE Bot Wallet API** (`https://bot-api.ave.ai`).
The website server holds AVE credentials and signs all requests.
The browser and skill never see AVE keys.

### 1.1 Fixed constraints (first version)

These are non-negotiable for V3.1:

- **BSC only.** No ETH, no Base, no Solana.
- **Three operations only:** `approve`, `buy` (swap BNB/USDT → token), `sell` (swap token → BNB/USDT).
- **No limit orders.** Market swaps only via `sendSwapOrder`.
- **No auto-sell / stop-loss config.** The `autoSellConfig` field is always omitted.
- **No silent trades.** Every trade request from the skill must include an explicit user confirmation step.
- **No strategy engine.** No trailing stops, no DCA, no rebalancing.
- **No browser wallet.** No MetaMask, no WalletConnect. Wallet identity is `assetsId` only.
- **No multi-chain.** Even though AVE supports it, the website API hardcodes `chain: "bsc"`.

### 1.2 What does not change

- `POST /api/score-token` — unchanged
- `POST /api/score-address` — unchanged
- `/`, `/token/[address]`, `/address/[address]`, `/tech` — unchanged
- Existing skill `meme-affinity-query` analysis-only flow — unchanged

---

## 2. AVE Bot API Reference

Base URL: `https://bot-api.ave.ai`

### 2.1 Authentication

Every request to AVE Bot API requires three headers:

| Header | Source |
|---|---|
| `AVE-ACCESS-KEY` | AVE Bot API key (server env `AVE_BOT_API_KEY`) |
| `AVE-ACCESS-TIMESTAMP` | Current UTC timestamp in RFC3339Nano format |
| `AVE-ACCESS-SIGN` | HMAC-SHA256 signature, Base64 encoded |

**Signature construction:**

```
message = timestamp + METHOD + requestPath + body
```

- `METHOD`: uppercase HTTP method (e.g. `POST`, `GET`)
- `requestPath`: URL path including query string (e.g. `/v1/thirdParty/user/getUserByAssetsId?assetsIds=abc`)
- `body`: for JSON bodies, sort keys alphabetically, use compact encoding (`separators=(',', ':')`). For GET requests, body is empty string.
- `signature`: `base64(hmac_sha256(apiSecret, message))`

Server env vars:

```
AVE_BOT_API_KEY     — AVE Bot API key
AVE_BOT_API_SECRET  — AVE Bot API secret (used for HMAC)
```

The website server computes the signature. The browser and skill never receive these credentials.

### 2.2 BSC token address conventions

| Asset | Token address for AVE API |
|---|---|
| BNB (native) | `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` |
| USDT on BSC | `0x55d398326f99059ff775485246999027b3197955` |

### 2.3 Amount encoding

All amounts use the token's smallest precision unit.
Example: if a token has 18 decimals, buying 1 token means `inAmount = "1000000000000000000"`.

The minimum buy amount is 0.1 USD equivalent.

### 2.4 AVE endpoints used

| AVE endpoint | Method | Purpose |
|---|---|---|
| `/v1/thirdParty/user/generateWallet` | POST | Create a new delegate bot wallet |
| `/v1/thirdParty/user/getUserByAssetsId` | GET | Look up wallet by assetsId |
| `/v1/thirdParty/user/getUserAssets` | GET | Fetch bot wallet token balances by assetsId |
| `/v1/thirdParty/tx/approve` | POST | Approve token spender |
| `/v1/thirdParty/tx/getApprove` | GET | Check approve tx status |
| `/v1/thirdParty/tx/sendSwapOrder` | POST | Submit market swap |
| `/v1/thirdParty/tx/getSwapOrder` | GET | Check swap tx status |

### 2.5 AVE response envelope

All AVE Bot API responses use:

```typescript
type AveBotResponse<T> = {
  status: number;   // 0 or 200 = success
  msg: string;
  data: T;
};
```

---

## 3. Website API: `/api/trade/*`

All trade endpoints live under `/api/trade/`.
They are separate from the existing `/api/score-token` and `/api/score-address` routes.

### 3.1 `POST /api/trade/wallet/generate`

Create a new delegate bot wallet via AVE.

**Request:**

```typescript
type GenerateWalletRequest = {
  // no fields — server provides all AVE credentials
};
```

**Response (200):**

```typescript
type GenerateWalletResponse = {
  assetsId: string;        // AVE assetsId — the user stores this
  address: string;         // BSC address (0x...)
  chain: "bsc";
  createdAt: string;       // ISO 8601
};
```

**Error responses:**

| Status | When |
|---|---|
| 401 | AVE Bot API key not configured on server |
| 502 | AVE generateWallet call failed |
| 500 | Unexpected server error |

**AVE mapping:** `POST /v1/thirdParty/user/generateWallet`

- Server fills: all auth headers
- Server sends: empty body to AVE
- Server extracts from AVE response: `assetsId`, `addressList` entry where `chain === "bsc"`
- Server discards: `mnemonic` — the server does **not** persist the mnemonic. AVE manages key custody.

### 3.2 `GET /api/trade/wallet`

Look up the current wallet for a given assetsId, including balance state needed for onboarding.

**Request:**

Query parameter: `?assetsId={assetsId}`

**Response (200):**

```typescript
type TokenBalance = {
  tokenAddress: string;   // BSC token contract address
  symbol: string;         // "BNB" or "USDT"
  decimals: number;       // token decimals (18 for both BNB and USDT)
  rawBalance: string;     // balance in smallest unit (e.g. wei)
  humanBalance: string;   // balance in human-readable form (e.g. "0.5")
};

type GetWalletResponse = {
  assetsId: string;
  address: string;
  chain: "bsc";
  status: "enabled" | "disabled";
  type: "self" | "delegate";
  balanceState: "empty" | "funded";
  balances: TokenBalance[];  // BNB and USDT balances; empty array if balance fetch fails
};
```

**Frontend onboarding decision rule:**

- If `balanceState === "funded"`: enable trade/approve buttons.
- If `balanceState === "empty"`: show deposit prompt, disable trade/approve buttons.
- If the response returns an error (4xx/5xx): treat as `no_wallet` state.

**Error responses:**

| Status | When |
|---|---|
| 400 | Missing assetsId |
| 404 | No wallet found for this assetsId |
| 502 | AVE lookup failed |

**AVE mapping:**

1. `GET /v1/thirdParty/user/getUserByAssetsId?assetsIds={assetsId}` — wallet identity and status
2. `GET /v1/thirdParty/user/getUserAssets?assetsId={assetsId}&chain=bsc` — token balances

The server makes both calls and combines the results. If the balance call fails, the server still returns the wallet identity with `balanceState: "empty"` and `balances: []`. The balance call failure must not cause the entire endpoint to fail.

### 3.3 `POST /api/trade/approve`

Approve the AVE spender contract for a token, so the bot wallet can sell it later.

**Request:**

```typescript
type ApproveRequest = {
  assetsId: string;       // user's bot wallet ID
  tokenAddress: string;   // BSC token contract to approve
};
```

**Response (200):**

```typescript
type ApproveResponse = {
  orderId: string;        // AVE order ID for tracking
  spender: string;        // approved spender contract address
  amm: string;            // matched AMM (e.g. "cakev2")
};
```

**Error responses:**

| Status | When |
|---|---|
| 400 | Missing assetsId or tokenAddress |
| 401 | assetsId has no valid wallet |
| 502 | AVE approve call failed |

**AVE mapping:** `POST /v1/thirdParty/tx/approve`

- Server fills: `chain: "bsc"`, `assetsId`, `tokenAddress`, all auth headers
- AVE returns: `{id, spender, amm}`

### 3.4 `POST /api/trade/swap`

Submit a market swap order (buy or sell).

**Request:**

```typescript
type SwapRequest = {
  assetsId: string;          // user's bot wallet ID
  tokenAddress: string;      // target token contract
  side: "buy" | "sell";     // buy = BNB/USDT → token; sell = token → BNB/USDT
  amount: string;            // in token's smallest unit (e.g. wei for 18-decimal tokens)
  baseToken?: "bnb" | "usdt"; // which base token to use (default: "bnb")
  slippageBps: number;       // slippage tolerance in bps (e.g. 500 = 5%)
  confirmToken: string;      // anti-fat-finger: must match tokenAddress
};
```

**Response (200):**

```typescript
type SwapResponse = {
  orderId: string;           // AVE order ID
  side: "buy" | "sell";
  tokenAddress: string;
  inTokenAddress: string;    // what goes in (BNB/USDT address for buy, token for sell)
  outTokenAddress: string;   // what comes out (token for buy, BNB/USDT for sell)
  amount: string;            // inAmount submitted
  status: "generated";
  createdAt: string;         // ISO 8601
};
```

**Error responses:**

| Status | When |
|---|---|
| 400 | Missing fields, invalid side, `confirmToken` does not match `tokenAddress` |
| 400 | `slippageBps` outside 100–5000 (1%–50%) |
| 400 | `amount` is zero or negative |
| 401 | assetsId has no valid wallet |
| 403 | Token not approved yet (sell only) |
| 502 | AVE sendSwapOrder call failed |

**AVE mapping:** `POST /v1/thirdParty/tx/sendSwapOrder`

- Server fills: `chain: "bsc"`, `assetsId`, `inTokenAddress`, `outTokenAddress`, `inAmount`, `swapType`, `slippage`, `extraGas`, all auth headers
- For buy: `inTokenAddress` = BNB or USDT address, `outTokenAddress` = token, `swapType: "buy"`
- For sell: `inTokenAddress` = token, `outTokenAddress` = BNB or USDT address, `swapType: "sell"`
- Server sets `extraGas: "0"` (use network default plus no extra)
- Server does **not** send: `autoSellConfig`, `useMev`, `autoSlippage`, `autoGas`, `limitPrice`, `expireTime`

**Anti-fat-finger rule:** `confirmToken` must exactly match `tokenAddress`. This prevents accidental trades on the wrong token.

### 3.5 `GET /api/trade/orders`

Query order status for one or more order IDs.

**Request:**

Query parameter: `?ids={comma-separated order IDs}`

**Response (200):**

```typescript
type OrderStatus = {
  orderId: string;
  status: "generated" | "sent" | "confirmed" | "error";
  side: "buy" | "sell";
  chain: "bsc";
  txHash: string | null;
  txPriceUsd: string | null;
  inAmount: string | null;
  outAmount: string | null;
  errorMessage: string | null;
};

type GetOrdersResponse = {
  orders: OrderStatus[];
};
```

**Error responses:**

| Status | When |
|---|---|
| 400 | Missing ids parameter |
| 502 | AVE getSwapOrder call failed |

**AVE mapping:** `GET /v1/thirdParty/tx/getSwapOrder?chain=bsc&ids={ids}`

---

## 4. Website Server Responsibilities

The website server is the sole trusted component for AVE interaction.

| Responsibility | Detail |
|---|---|
| Hold AVE Bot API key and secret | Env vars only, never exposed to client |
| Compute HMAC-SHA256 signatures | For every AVE request |
| Set `chain: "bsc"` on all requests | Hardcoded, not user-controllable |
| Omit `autoSellConfig` | Always empty in V3.1 |
| Validate `slippageBps` range | Reject outside 100–5000 |
| Enforce `confirmToken` match | Anti-fat-finger on swap |
| Return wallet balance info | `GET /api/trade/wallet` combines identity and balance; server calls two AVE endpoints and merges results; balance failure degrades to `balanceState: "empty"` |
| Map buy/sell to correct `inTokenAddress`/`outTokenAddress` | Based on `side` and `baseToken` |
| Do not persist `mnemonic` | AVE manages custody; server discards mnemonic after generate |
| Do not expose AVE error details to browser | Return generic messages, log full details server-side |

---

## 5. Browser / Client Behavior

### 5.1 What the browser stores

The browser stores only the `assetsId` string (e.g. in localStorage).

It does **not** store:
- AVE API key or secret
- Private keys or mnemonics
- AVE order IDs beyond the current session

### 5.2 No MetaMask / WalletConnect

V3.1 uses the AVE bot wallet exclusively.
Browser wallet integration is explicitly out of scope.

### 5.3 First-time wallet onboarding and funding flow

When a user has no `assetsId` stored locally, the website must guide them through first-use setup.

#### 5.3.1 Onboarding states

The website tracks three onboarding states:

| State | Condition | UI behavior |
|---|---|---|
| `no_wallet` | No `assetsId` in localStorage | Show wallet creation prompt |
| `wallet_empty` | `assetsId` exists, but wallet balance is zero | Show deposit instructions, disable trade/approve buttons |
| `wallet_funded` | `assetsId` exists and wallet has BNB or USDT balance | Enable trade/approve buttons |

#### 5.3.2 Wallet creation flow

1. User clicks "创建钱包" on the website.
2. Website calls `POST /api/trade/wallet/generate`.
3. Server returns `{ assetsId, address, chain, createdAt }`.
4. Browser stores `assetsId` in localStorage.
5. Browser displays the BSC wallet address to the user.
6. Browser transitions to `wallet_empty` state.

#### 5.3.3 Deposit prompt (wallet_empty state)

When the wallet has no funds, the website must display:

```
💰 请向以下地址转入 BNB 或 USDT (BSC)

{wallet_address}

转入后刷新页面即可开始交易。
最低建议转入 0.1 BNB 或等值 USDT。
```

Trade buttons (`approve`, `buy`, `sell`) must be **visually disabled** with a clear reason:
- Button label: "请先充值" or similar
- Button is non-clickable (grayed out)
- Hover tooltip: "钱包余额不足，请先转入 BNB 或 USDT"

#### 5.3.4 Balance check

The website checks wallet balance by calling `GET /api/trade/wallet?assetsId={id}`. The response includes `balanceState` (`"empty"` or `"funded"`) and a `balances` array with BNB and USDT amounts. The frontend uses `balanceState` to decide which onboarding state to display:

- `"funded"` → enable trade/approve buttons
- `"empty"` → show deposit prompt, disable trade/approve buttons

The website calls this endpoint on page load and when the user navigates to a trade-related view. If the endpoint returns an error, the frontend treats the wallet as `no_wallet`. If `balances` is an empty array (balance fetch failed but wallet exists), the frontend treats the wallet as `wallet_empty`.

#### 5.3.5 Existing wallet recovery

If the user already has an `assetsId` but clears localStorage:

1. Website shows the wallet creation prompt as if new.
2. If the user enters an existing `assetsId` manually, website calls `GET /api/trade/wallet?assetsId={id}`.
3. If the lookup succeeds, browser stores the `assetsId` and transitions to `wallet_empty` or `wallet_funded` based on balance.
4. If the lookup fails (404), website shows: "未找到该钱包，请创建新钱包。"

#### 5.3.6 Skill onboarding gate

When the skill receives an `approve`, `buy`, or `sell` instruction but the user has not provided an `assetsId`, the skill must respond:

```
⚠️ 请先在网站创建钱包

打开 {website_url} 并创建 AVE 托管钱包后，将 assetsId 发给我即可开始交易。
```

The skill does **not** call `POST /api/trade/wallet/generate` directly. Wallet creation happens on the website only.

---

## 6. Skill V3 Contract

### 6.1 Skill instructions

The skill accepts these instructions:

| Instruction | Parameters | Behavior |
|---|---|---|
| `analyze <token>` | token address | Calls `/api/score-token`, returns analysis-only output |
| `approve <token>` | token address | Calls `/api/trade/approve`, requires user confirmation |
| `buy <token> <amount> <baseToken>` | token address, amount in human-readable units, "bnb" or "usdt" | Calls `/api/trade/swap` with `side: "buy"`, requires user confirmation |
| `sell <token> <amount> <baseToken>` | token address, amount in human-readable units, "bnb" or "usdt" | Calls `/api/trade/swap` with `side: "sell"`, requires user confirmation |

### 6.2 Skill routing

```
skill input → parse instruction →
  if analyze → call website /api/score-token → return analysis output
  if approve → ASK USER TO CONFIRM → if confirmed → call website /api/trade/approve → return approval output
  if buy/sell → ASK USER TO CONFIRM → if confirmed → call website /api/trade/swap → return trade output
```

### 6.3 Skill does not call AVE directly

The skill only talks to the website API (`/api/trade/*` and `/api/score-token`).
It never calls `bot-api.ave.ai` directly.
It never holds AVE credentials.

### 6.4 Confirmation requirement for approve and trades

For `approve`, `buy`, and `sell` instructions, the skill **must**:

1. Display the operation parameters to the user before executing.
2. Ask for explicit confirmation.
3. Only proceed if the user confirms.

The skill must **not** execute an approve or trade without confirmation, even if the user says "always approve" or "just do it."

**Why approve requires confirmation:** Approve grants an on-chain spending permission to the AVE spender contract for the specified token. Even though the spender is AVE-controlled, an unwanted approve widens the attack surface if the user later deposits that token. Treating approve the same as a trade keeps the confirmation model uniform and prevents silent permission changes.

### 6.5 Skill output templates

#### 6.5.1 Analysis output (`analyze`)

```
📊 {token.name} ({token.symbol})

👍 CZ: {score}/100 ({displayLevel})
🧠 聪明钱: {matchedCount} matched ({displayLevel})
🎯 建议: {recommendation}

🔗 {website_url}/token/{address}
```

Maximum 5 lines. No evidence list in the short output.

#### 6.5.2 Approve confirmation prompt

```
⚠️ 确认授权？

代币: {token}
操作: 授权 AVE 合约花费该代币
钱包: {truncated address}

回复"确认"执行，回复"取消"放弃。
```

#### 6.5.3 Approve output (`approve`)

```
✅ 已授权 {token}
spender: {spender}
order: {orderId}
```

#### 6.5.4 Buy confirmation prompt

```
⚠️ 确认买入？

代币: {token}
数量: {amount} {baseToken}
滑点: {slippageBps / 100}%
钱包: {truncated address}

回复"确认"执行，回复"取消"放弃。
```

#### 6.5.5 Sell confirmation prompt

```
⚠️ 确认卖出？

代币: {token}
数量: {amount} tokens → {baseToken}
滑点: {slippageBps / 100}%
钱包: {truncated address}

回复"确认"执行，回复"取消"放弃。
```

#### 6.5.6 Trade result output

```
{'✅' if status === 'confirmed' else '⏳' if status === 'sent' else '❌'} {side === 'buy' ? '买入' : '卖出'} {token}

订单: {orderId}
状态: {status}
{txHash ? `链上: ${txHash}` : ''}
{errorMessage ? `错误: ${errorMessage}` : ''}

🔗 {website_url}/token/{address}
```

### 6.6 Amount handling

The skill accepts human-readable amounts (e.g. `0.1` BNB, `100` USDT).
The skill must convert to the smallest unit before calling the website API:

- BNB: 18 decimals → multiply by 10^18
- USDT: 18 decimals → multiply by 10^18
- Other tokens: the website determines decimals from AVE token metadata

If the skill cannot determine decimals, it must ask the user to specify the raw amount.

---

## 7. Risk Controls Summary

| Control | Implementation |
|---|---|
| Chain lock | Server hardcodes `chain: "bsc"` on all AVE calls |
| Operation lock | Only approve, buy, sell. No limit orders, no auto-sell |
| Confirmation lock | Skill must prompt and receive explicit confirmation before approve and trade |
| Anti-fat-finger | `confirmToken` field on swap must match `tokenAddress` |
| Slippage clamp | Server rejects slippage outside 1%–50% (100–5000 bps) |
| No credential exposure | AVE keys stay server-side only |
| No mnemonic storage | Server discards mnemonic after wallet generation |
| No auto-trading | No scheduled trades, no strategy triggers |
| Onboarding gate | Trade/approve buttons disabled until wallet is funded; skill blocks trade instructions without assetsId |
| Error isolation | Trade API failures do not affect scoring API |

---

## 8. New Environment Variables

```
AVE_BOT_API_KEY=       # AVE Bot API key for wallet/trade operations
AVE_BOT_API_SECRET=    # AVE Bot API secret for HMAC signatures
AVE_BOT_BASE_URL=https://bot-api.ave.ai  # optional override
```

These are in addition to the existing `AVE_API_KEY`, `MINIMAX_API_KEY`, etc.

---

## 9. New Website Routes (V3 only)

```
POST /api/trade/wallet/generate
GET  /api/trade/wallet
POST /api/trade/approve
POST /api/trade/swap
GET  /api/trade/orders
```

These do not replace or modify any existing routes.

---

## 10. Not In Scope

These are explicitly excluded from V3.1:

- Browser wallet connection (MetaMask, WalletConnect)
- Multi-chain support (ETH, Base, Solana)
- Limit orders
- Auto-sell / stop-loss / trailing stop
- Strategy engine or scheduled trades
- V3 hot-flow / popular-stream
- Portfolio tracking or PnL dashboard
- Fee estimation or gas optimization beyond AVE defaults
- Token launch detection or sniping
