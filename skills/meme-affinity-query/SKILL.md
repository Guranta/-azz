---
name: meme-affinity-query
installUrl: skills/meme-affinity-query
description: |
  BSC meme token analysis and trading skill.
  Five instructions: analyze, bind, approve, buy, sell.
  Website creates wallet and issues 绑定码; no secrets held in skill.
tags:
  - bsc
  - meme
  - trading
  - openclaw
---

# Meme Affinity Query

Public OpenClaw skill for the project.

## Purpose

- Accept BSC token operations (`analyze`, `bind`, `approve`, `buy`, `sell`)
- Route to website API endpoints only
- Keep all heavy logic on the website side
- Keep trade flows binding-state driven, so users do not need to input `assetsId` for every trade
- Return compact outputs with explicit state labels

## Scope Rules

This skill stays thin.

1. `绑定码` (`bindingCode`) is the only external binding entry — no `assetsId` in skill-facing flows
2. `analyze` does not depend on binding state
3. `approve` / `buy` / `sell` require binding state (`BOUND`)
4. Skill only calls website API — never calls AVE/MiniMax/DeepSeek directly
5. Skill does not hold API keys, secrets, or credentials

## Supported Instructions

- `analyze <token>`
- `bind <bindingCode>`
- `approve <token>`
- `buy <token> <amount> <baseToken>`
- `sell <token> <amount> <baseToken>`

No additional instruction families are introduced.

## Output State Labels (Mandatory)

All trade-related outputs must clearly map to one of these labels:

- `未绑定`
- `已绑定`
- `待确认`
- `成功`
- `失败`

## Binding State Model

Runtime state is conversation/session scoped.

- `UNBOUND`: no active binding code in current conversation
- `BOUND`: `bind` verified with website API and saved in session

State transitions:

- `UNBOUND -> BOUND`: `bind <bindingCode>` success and returned status is `active`
- `BOUND -> UNBOUND`: bind replaced/cleared, or bind verification fails on later operations

## Website-First Onboarding

Before any trade instruction in the skill, user onboarding happens on the website side:

1. User opens website and clicks "创建钱包".
2. Website creates a platform-managed wallet via AVE Bot API.
3. Website returns wallet address and `绑定码` (`bindingCode`) to the user.
4. User runs `bind <bindingCode>` in the skill to enter bound state.

Skill-side rule:
- Normal skill flow never asks user to input `assetsId`; external binding entry remains only `绑定码` (`bindingCode`).
- Users never need to provide API keys or secrets.

## Instructions

### `analyze <token>`

Token analysis. Calls website `/api/score-token`.

**Binding dependency:** none.

**Parameters:** one BSC token contract address (`tokenAddress`)

**Optional user input:**
- `websiteBaseUrl`: override for custom deployment

**Execution:**

1. Validate `tokenAddress` format.
2. Call `POST {websiteBaseUrl}/api/score-token` with `{ tokenAddress, chain: "bsc" }`.
3. Parse response and render compact summary.

**Analysis output template (compact, 5 lines max):**

```text
📳 {token.name} ({token.symbol})
🤤 CZ: {score}/100 ({displayLevel})
🦥 聪明钱: {matchedCount} matched ({displayLevel})
🎆 建议: {recommendation}
🔆 {website_url}/token/{address}
```

---

### `bind <bindingCode>`

Bind OpenClaw skill context to website wallet.

**Parameters:**
- `bindingCode`: the user-provided binding string (`绑定码`)

**Execution:**

1. Validate `bindingCode` is non-empty.
2. Call `POST {websiteBaseUrl}/api/trade/bind` with `{ bindingCode }`.
3. If response is 200 and `status === "active"`, save binding in session state.
4. If response is 404, treat as invalid binding.
5. If response is 200 but `status !== "active"`, treat as bind failure.
6. If response timeout/network error/5xx/invalid payload, treat as bind failure and keep state `UNBOUND`.

**Bind success output (`已绑定`):**

```text
✅ 已绑定
绑定码: {bindingCode}
钱包: {wallet.walletAddress}
状态: 已绑定
后续可直接使用 approve / buy / sell
```

If `wallet` is null in the bind response (AVE API temporarily unreachable), omit the 钱包 line.

**Bind failure output (`失败`, invalid binding):**

```text
❌ 绑定失败
绑定码: {bindingCode}
原因: 无效或不存在的绑定码
请在网站创建钱包后复制最新"绑定码"后重试
```

**Bind failure output (`失败`, non-active binding):**

```text
❌ 绑定失败
绑定码: {bindingCode}
原因: 钱包状态不是 active
请在网站重新创建钱包后重试
```

**Bind failure output (`失败`, website unavailable / unstable):**

```text
❌ 绑定失败
绑定码: {bindingCode}
原因: 网站绑定服务暂不可用或返回异常
请稍后重试；成功前不会进入已绑定状态
```

---

## Shared Trade Preconditions (`approve` / `buy` / `sell`)

1. Require current session to be `BOUND`.
2. If not bound, return onboarding gate and stop.
3. Always require explicit user confirmation before any on-chain action.
4. For API calls, send `bindingCode` as the binding anchor.
5. Do not require user to provide `assetsId` per operation.

**No-binding onboarding output (`未绑定`):**

```text
⚠️ 未绑定
请先绑定绑定码后再交易
发送：bind <绑定码>
如果还没有绑定码，请先在网站创建钱包并复制绑定码
```

**Shared confirmation gate:**

Before any on-chain action, render an operation-specific confirmation prompt.
If user response is not exact `确认`, cancel immediately and do not call trade API.

**Approve confirmation (`待确认`):**

```text
🟡 待确认
操作: approve（授权卖出）
代币: {tokenAddress}
回复"确认"执行，回复"取消"放弃
```

**Buy confirmation (`待确认`):**

```text
🟡 待确认
操作: buy（买入）
代币: {tokenAddress}
数量: {amount} {baseToken}
滑点: {slippageBps / 100}%
回复"确认"执行，回复"取消"放弃
```

**Sell confirmation (`待确认`):**

```text
🟡 待确认
操作: sell（卖出）
代币: {tokenAddress}
数量: {amount} {baseToken}
滑点: {slippageBps / 100}%
回复"确认"执行，回复"取消"放弃
```

---

### `approve <token>`

Approve AVE spender for token sell.

**Parameters:**
- `tokenAddress`: BSC token contract address

**Execution:**

1. Enforce shared trade preconditions (binding required).
2. Render approve confirmation prompt.
3. If confirmed, call `POST {websiteBaseUrl}/api/trade/approve` with:
   ```json
   {
     "bindingCode": "...",
     "tokenAddress": "..."
   }
   ```
4. Render success or failure.

**Approve success output (`成功`):**

```text
✅ 成功
操作: approve
代币: {tokenAddress}
订单: {orderId}
spender: {spender}
```

**Approve failure output (`失败`):**

```text
❌ 失败
操作: approve
代币: {tokenAddress}
原因: {sanitized error message}
```

---

### `buy <token> <amount> <baseToken>`

Swap BNB/USDT to target token.

**Parameters:**
- `tokenAddress`: BSC token contract address
- `amount`: human-readable amount (e.g. `0.1`, `100`)
- `baseToken`: `bnb` or `usdt`

**Defaults:**
- `baseToken`: `bnb`
- `slippageBps`: `500`

**Amount conversion:**
- BNB: multiply by `10^18`
- USDT: multiply by `10^18`

**Execution:**

1. Enforce shared trade preconditions (binding required).
2. Validate `amount > 0` and `baseToken` in `bnb|usdt`.
3. Convert amount to smallest unit string.
4. Render buy confirmation prompt (showing amount, baseToken, slippage).
5. If confirmed, call `POST {websiteBaseUrl}/api/trade/swap`:
   ```json
   {
     "bindingCode": "...",
     "tokenAddress": "...",
     "side": "buy",
     "amount": "<smallest unit>",
     "baseToken": "bnb",
     "slippageBps": 500,
     "confirmToken": "<must match tokenAddress>"
   }
   ```
6. Read immediate order result and map status output.
7. Optionally call `GET {websiteBaseUrl}/api/trade/orders?ids={orderId}&bindingCode={bindingCode}` for fresh status.

---

### `sell <token> <amount> <baseToken>`

Swap token to BNB/USDT.

**Parameters:**
- `tokenAddress`: BSC token contract address
- `amount`: human-readable token amount
- `baseToken`: `bnb` or `usdt`

**Defaults:**
- `baseToken`: `bnb`
- `slippageBps`: `500`

**Pre-condition:** token must be approved first.

**Execution:**

1. Same flow as `buy`, but `side: "sell"`.
2. Render sell confirmation prompt (showing amount, baseToken, slippage).

If API returns `Token not approved yet (sell requires approve first)`, render failure with explicit remediation (`先执行 approve`).

---

## Trade Status Rendering (`buy` / `sell`)

Map website order status to required output labels:

- `generated` -> `待确认`
- `sent` -> `待确认`
- `confirmed` -> `成功`
- `error` -> `失败`

**Pending order output (`待确认`):**

```text
🟡 待确认
操作: {buy/sell}
代币: {tokenAddress}
订单: {orderId}
状态: {generated|sent}
链上确认中，请稍后查询
```

**Confirmed order output (`成功`):**

```text
✅ 成功
操作: {buy/sell}
代币: {tokenAddress}
订单: {orderId}
状态: confirmed
{txHash if exists}
{inAmount → outAmount if both exist}
```

**Failed order output (`失败`):**

```text
❌ 失败
操作: {buy/sell}
代币: {tokenAddress}
订单: {orderId}
状态: error
原因: {errorMessage or sanitized API error}
```

---

## Failure Semantics

### 未绑定（no binding)

For any `approve`/`buy`/`sell` without active binding state, always return onboarding gate (`未绑定`).
Do not call trade APIs.

### 无效绑定（invalid binding)

For `bind` returning 404 or invalid payload, return `失败` with invalid-binding message.
Do not switch to `BOUND`.

### 卖出前未授权（approve required before sell)

If `sell` gets `Token not approved yet (sell requires approve first)`, return `失败` and instruct user to run `approve <token>` first.

### 订单处理中（pending order)

If order status is `generated` or `sent`, return `待确认` and include `orderId`.

### 订单失败（failed order)

If order status is `error`, or swap/approve API fails, return `失败` with sanitized reason.

## Routing Summary

```text
skill input -> parse instruction ->
  if analyze -> call /api/score-token -> return analysis
  if bind -> call /api/trade/bind -> set binding state -> return 已绑定/失败
  if approve -> require binding -> approve确认 -> call /api/trade/approve with bindingCode -> return 成功/失败
  if buy -> require binding -> buy确认(显示数量/滑点) -> call /api/trade/swap(side=buy,bindingCode) -> return 待确认/成功/失败
  if sell -> require binding -> sell确认(显示数量/滑点) -> call /api/trade/swap(side=sell,bindingCode) -> return 待确认/成功/失败
```

## Default Base URL

- Prefer configured production base URL when available
- Otherwise use local dev URL `http://localhost:3000`

## Constraints

- BSC only
- No browser wallet integration
- No auto-trading, no silent trades
- No multi-chain
- No limit orders
- No auto-sell / stop-loss
- Do not change token/address API
- Do not change website trade contract
