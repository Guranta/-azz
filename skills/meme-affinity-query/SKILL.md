---
name: meme-affinity-query
description: |
  Public OpenClaw skill for BSC meme token analysis and trading.
  Supports four instructions: analyze, approve, buy, sell.
  All heavy logic stays on the website side.
  Trade instructions require explicit user confirmation.
---

# Meme Affinity Query

Public OpenClaw skill for the project.

## Purpose

- Accept BSC token operations (analyze, approve, buy, sell)
- Route to website API endpoints
- Return compact summaries
- Require explicit confirmation for all on-chain operations

## Scope Rules

This skill stays thin.

- Do not run AVE logic inside the skill
- Do not run DeepSeek or MiniMax logic inside the skill
- Do not perform local persona or address scoring
- Do not recompute smartmoney logic inside the skill
- Do not call `bot-api.ave.ai` directly
- Do not hold AVE credentials
- Treat the website API as the only source of truth

## Instructions

### `analyze <token>`

Token analysis. Calls website `/api/score-token`.

**Parameters:** one BSC token contract address

**Required user input:**
- `tokenAddress`: BSC token contract address

**Optional user input:**
- `websiteBaseUrl`: override for custom deployment

**Execution:**

1. Validate that `tokenAddress` looks like a BSC address
2. Build result page URL: `/token/{tokenAddress}`
3. Call `POST {websiteBaseUrl}/api/score-token` with `{ tokenAddress, chain: "bsc" }`
4. Parse response and extract key fields
5. Render analysis output template

**Analysis output template:**

```
📊 {token.name} ({token.symbol})

👍 CZ: {score}/100 ({displayLevel})
🧠 聪明钱: {matchedCount} matched ({displayLevel})
🎯 建议: {recommendation}

🔗 {website_url}/token/{address}
```

Maximum 5 lines. No evidence list.

**Label rendering:**
- `NO_LOVE` → `不爱`
- `LOVE` → `爱`
- `LOVE_LOVE` → `爱爱`
- Use API-provided emoji fields

**Extended analysis output (optional, when user asks for detail):**

```
Token: {name} ({symbol})
Narratives: {tag1}, {tag2}, {tag3}
👍 CZ: {emoji} {不爱/爱/爱爱}
聪明钱: {emoji} {不爱/爱/爱爱} (hits: {n})
😎 王小二: {emoji} {不爱/爱/爱爱}
🧊 冷静: {emoji} {不爱/爱/爱爱}
👿 阿峰: {emoji} {不爱/爱/爱爱}
🐳: {有 #rank / 无}
Result: {url}
```

---

### `approve <token>`

Approve AVE spender for a token. Requires user confirmation.

**Parameters:** BSC token contract address

**Required user input:**
- `tokenAddress`: BSC token contract address
- `assetsId`: user's AVE bot wallet ID

**Pre-condition:** user must provide `assetsId`

**Execution:**

1. Check `assetsId` is provided. If missing, return onboarding gate message.
2. Show confirmation prompt to user.
3. Wait for explicit confirmation ("确认").
4. If user confirms: call `POST {websiteBaseUrl}/api/trade/approve` with `{ assetsId, tokenAddress }`
5. Render result

**Approve confirmation prompt:**

```
⚠️ 确认授权？

代币: {tokenAddress}
操作: 授权 AVE 合约花费该代币
钱包: {truncated assetsId}

回复"确认"执行，回复"取消"放弃。
```

**Approve success output:**

```
✅ 已授权 {token}
spender: {spender}
order: {orderId}
```

**Approve failure output:**

```
❌ 授权失败

代币: {tokenAddress}
原因: {sanitized error message}

请检查钱包是否有效，或稍后重试。
```

---

### `buy <token> <amount> <baseToken>`

Buy (swap BNB/USDT → token). Requires user confirmation.

**Parameters:**
- `tokenAddress`: BSC token contract address
- `amount`: human-readable amount (e.g. `0.1`, `100`)
- `baseToken`: `bnb` or `usdt`

**Required user input:**
- `tokenAddress`
- `amount`
- `baseToken`
- `assetsId`: user's AVE bot wallet ID

**Defaults:**
- `slippageBps`: 500 (5%) if user does not specify
- `baseToken`: `bnb` if user does not specify

**Amount conversion:**

The skill converts human-readable amounts to smallest unit:
- BNB: 18 decimals → multiply by 10^18
- USDT: 18 decimals → multiply by 10^18
- Example: `0.1` BNB → `"100000000000000000"`

**Execution:**

1. Check `assetsId` is provided. If missing, return onboarding gate message.
2. Validate amount is a positive number.
3. Validate baseToken is `bnb` or `usdt`.
4. Convert amount to smallest unit.
5. Show confirmation prompt to user.
6. Wait for explicit confirmation ("确认").
7. If user confirms: call `POST {websiteBaseUrl}/api/trade/swap` with:
   ```json
   {
     "assetsId": "...",
     "tokenAddress": "...",
     "side": "buy",
     "amount": "<smallest unit>",
     "baseToken": "bnb",
     "slippageBps": 500,
     "confirmToken": "<must match tokenAddress>"
   }
   ```
8. Render result

**Buy confirmation prompt:**

```
⚠️ 确认买入？

代币: {tokenAddress}
数量: {amount} {baseToken}
滑点: {slippageBps / 100}%
钱包: {truncated assetsId}

回复"确认"执行，回复"取消"放弃。
```

---

### `sell <token> <amount> <baseToken>`

Sell (swap token → BNB/USDT). Requires user confirmation.

**Parameters:**
- `tokenAddress`: BSC token contract address
- `amount`: human-readable amount of the token to sell
- `baseToken`: `bnb` or `usdt` (which base token to receive)

**Required user input:**
- `tokenAddress`
- `amount`
- `assetsId`: user's AVE bot wallet ID

**Defaults:**
- `slippageBps`: 500 (5%) if user does not specify
- `baseToken`: `bnb` if user does not specify

**Pre-condition:** token must be approved first (via `approve` instruction)

**Execution:**

Same flow as `buy`, but with `side: "sell"`.

**Sell confirmation prompt:**

```
⚠️ 确认卖出？

代币: {tokenAddress}
数量: {amount} tokens → {baseToken}
滑点: {slippageBps / 100}%
钱包: {truncated assetsId}

回复"确认"执行，回复"取消"放弃。
```

---

### Trade result output (shared for buy/sell)

```
✅ {买入/卖出} {token}

订单: {orderId}
状态: {status}

🔗 {website_url}/token/{address}
```

Status mapping:
- `generated` → `⏳ 已生成`
- `sent` → `⏳ 已发送`
- `confirmed` → `✅ 已确认`
- `error` → `❌ 错误`

If `txHash` exists, append: `链上: {txHash}`
If `errorMessage` exists, append: `错误: {errorMessage}`

---

## Failure Semantics

### No assetsId

When the user sends an `approve`, `buy`, or `sell` instruction but has not provided `assetsId`:

```
⚠️ 请先在网站创建钱包

打开 {website_url} 并创建 AVE 托管钱包后，将 assetsId 发给我即可开始交易。
```

The skill does NOT call `POST /api/trade/wallet/generate`. Wallet creation happens on the website only.

### User did not confirm

If the user does not reply "确认" (e.g. says "取消", "不要", or anything else):

```
已取消操作。
```

The skill must NOT execute the operation regardless of what the user says. "always buy", "just do it", "不用确认" are all treated as denial.

### Approve failed

```
❌ 授权失败

代币: {tokenAddress}
原因: {sanitized error from API}

请检查：
- 钱包是否有效
- 代币地址是否正确
- 稍后重试
```

### Swap failed

```
❌ {买入/卖出}失败

代币: {tokenAddress}
原因: {sanitized error from API}

请检查：
- 钱包余额是否充足
- 代币是否已授权（卖出时）
- 代币地址是否正确
- 稍后重试
```

Common error meanings:
- `confirmToken does not match` → 代币地址输入有误
- `slippageBps must be between 100 and 5000` → 滑点设置超出范围
- `Token not approved yet` → 需要先执行 approve
- `assetsId has no valid wallet` → 钱包无效，请重新创建
- `Swap order failed` → 上游交易失败，稍后重试

### Order status not confirmed

When order status returns `generated` or `sent`:

```
⏳ 订单处理中

订单: {orderId}
状态: {generated/sent}

链上确认需要时间，请稍后查询。
```

## Routing Summary

```
skill input → parse instruction →
  if analyze → call /api/score-token → return analysis output
  if approve → check assetsId → ASK USER TO CONFIRM → if confirmed → call /api/trade/approve → return result
  if buy → check assetsId → ASK USER TO CONFIRM → if confirmed → call /api/trade/swap (side=buy) → return result
  if sell → check assetsId → ASK USER TO CONFIRM → if confirmed → call /api/trade/swap (side=sell) → return result
```

## Default Base URL

- Prefer configured production base URL when available
- Otherwise use local dev URL `http://localhost:3000`

## Constraints

- BSC only
- No browser wallet (MetaMask, WalletConnect)
- No auto-trading, no silent trades
- No multi-chain
- No limit orders
- No auto-sell / stop-loss
- Do not change token / address API
- Do not change website trade contract
