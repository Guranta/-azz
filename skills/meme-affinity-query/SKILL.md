---
name: azz
installUrl: skills/meme-affinity-query
description: |
  BSC meme 代币分析与交易 Skill。
  五条指令：分析、绑定、授权、买、卖。
  网站创建钱包并签发绑定码；Skill 不持有任何密钥。
tags:
  - bsc
  - meme
  - trading
  - openclaw
---

# 爱赵赵 Skill

公开 OpenClaw Skill。

## 用途

- 接受 BSC 代币操作（`分析`、`绑定`、`授权`、`买`、`卖`）
- 仅调用网站 API 端点
- 所有重逻辑留在网站端
- 交易流程基于绑定码状态驱动，用户无需每次输入 `assetsId`
- 返回紧凑输出，附带明确状态标签

## 网站地址

固定为 `https://azz.886668.shop`，所有 API 调用统一使用此地址。

## 范围规则

本 Skill 保持轻量。

1. `绑定码`（`bindingCode`）是唯一的外部绑定入口 — Skill 面向流程中不出现 `assetsId`
2. `分析` 不依赖绑定状态
3. `授权` / `买` / `卖` 需要绑定状态（`BOUND`）
4. Skill 仅调用网站 API — 不直接调用 AVE/MiniMax/DeepSeek
5. Skill 不持有 API 密钥、秘密或凭证

## 支持的指令

- `分析 <token>`
- `绑定 <绑定码>`
- `授权 <token>`
- `买 <token> <amount> <baseToken>`
- `卖 <token> <amount> <baseToken>`

不引入额外的指令族。

## 输出状态标签（强制）

所有交易相关输出必须明确映射到以下标签之一：

- `未绑定`
- `已绑定`
- `待确认`
- `成功`
- `失败`

## 绑定状态模型

运行时状态限定在对话/会话范围内。

- `UNBOUND`：当前对话中没有活跃的绑定码
- `BOUND`：`绑定` 经网站 API 验证通过并保存在会话中

状态转换：

- `UNBOUND -> BOUND`：`绑定 <绑定码>` 成功且返回状态为 `active`
- `BOUND -> UNBOUND`：绑定被替换/清除，或后续操作验证失败

## 网站优先的入门流程

在 Skill 中的任何交易指令之前，用户入门在网站端完成：

1. 用户打开网站并点击"创建钱包"。
2. 网站通过 AVE Bot API 创建平台托管钱包。
3. 网站返回钱包地址和 `绑定码` 给用户。
4. 用户在 Skill 中运行 `绑定 <绑定码>` 进入绑定状态。

Skill 端规则：
- 正常 Skill 流程不会要求用户输入 `assetsId`；外部绑定入口仅保留 `绑定码`（`bindingCode`）。
- 用户无需提供 API 密钥或秘密。

## 指令

### `分析 <token>`

代币分析。调用网站 `/api/score-token`。

**绑定依赖：** 无。

**参数：** 一个 BSC 代币合约地址（`tokenAddress`）

**执行：**

1. 验证 `tokenAddress` 格式。
2. 调用 `POST https://azz.886668.shop/api/score-token`，传入 `{ tokenAddress, chain: "bsc" }`。
3. 解析响应并渲染紧凑摘要。

**分析输出模板（紧凑，最多 5 行）：**

```text
📳 {token.name} ({token.symbol})
🤤 CZ: {score}/100 ({displayLevel})
🦥 聪明钱: {matchedCount} matched ({displayLevel})
🎆 建议: {recommendation}
🔆 https://azz.886668.shop/token/{address}
```

---

### `绑定 <绑定码>`

将 OpenClaw Skill 上下文绑定到网站钱包。

**参数：**
- `bindingCode`：用户提供的绑定字符串（`绑定码`）

**执行：**

1. 验证 `bindingCode` 非空。
2. 调用 `POST https://azz.886668.shop/api/trade/bind`，传入 `{ bindingCode }`。
3. 如果响应为 200 且 `status === "active"`，在会话状态中保存绑定。
4. 如果响应为 404，视为无效绑定。
5. 如果响应为 200 但 `status !== "active"`，视为绑定失败。
6. 如果响应超时/网络错误/5xx/无效负载，视为绑定失败并保持状态 `UNBOUND`。

**绑定成功输出（`已绑定`）：**

```text
✅ 已绑定
绑定码: {bindingCode}
钱包: {wallet.walletAddress}
状态: 已绑定
后续可直接使用 授权 / 买 / 卖
```

如果绑定响应中 `wallet` 为 null（AVE API 暂时不可达），省略钱包行。

**绑定失败输出（`失败`，无效绑定）：**

```text
❌ 绑定失败
绑定码: {bindingCode}
原因: 无效或不存在的绑定码
请在网站创建钱包后复制最新"绑定码"后重试
```

**绑定失败输出（`失败`，非活跃绑定）：**

```text
❌ 绑定失败
绑定码: {bindingCode}
原因: 钱包状态不是 active
请在网站重新创建钱包后重试
```

**绑定失败输出（`失败`，网站不可用/不稳定）：**

```text
❌ 绑定失败
绑定码: {bindingCode}
原因: 网站绑定服务暂不可用或返回异常
请稍后重试；成功前不会进入已绑定状态
```

---

## 共享交易前置条件（`授权` / `买` / `卖`）

1. 要求当前会话处于 `BOUND` 状态。
2. 如果未绑定，返回入门提示并停止。
3. 任何链上操作前必须要求用户明确确认。
4. API 调用时，发送 `bindingCode` 作为绑定锚点。
5. 不要求用户每次操作提供 `assetsId`。

**未绑定入门输出（`未绑定`）：**

```text
⚠️ 未绑定
请先绑定绑定码后再交易
发送：绑定 <绑定码>
如果还没有绑定码，请先在网站创建钱包并复制绑定码
```

**共享确认门槛：**

任何链上操作前，渲染操作特定的确认提示。
如果用户回复不是精确的 `确认`，立即取消且不调用交易 API。

**授权确认（`待确认`）：**

```text
🟡 待确认
操作: 授权（授权卖出）
代币: {tokenAddress}
回复"确认"执行，回复"取消"放弃
```

**买入确认（`待确认`）：**

```text
🟡 待确认
操作: 买（买入）
代币: {tokenAddress}
数量: {amount} {baseToken}
滑点: {slippageBps / 100}%
回复"确认"执行，回复"取消"放弃
```

**卖出确认（`待确认`）：**

```text
🟡 待确认
操作: 卖（卖出）
代币: {tokenAddress}
数量: {amount} {baseToken}
滑点: {slippageBps / 100}%
回复"确认"执行，回复"取消"放弃
```

---

### `授权 <token>`

授权 AVE spender 用于代币卖出。

**参数：**
- `tokenAddress`：BSC 代币合约地址

**执行：**

1. 强制执行共享交易前置条件（需要绑定）。
2. 渲染授权确认提示。
3. 如果确认，调用 `POST https://azz.886668.shop/api/trade/approve`，传入：
   ```json
   {
     "bindingCode": "...",
     "tokenAddress": "..."
   }
   ```
4. 渲染成功或失败。

**授权成功输出（`成功`）：**

```text
✅ 成功
操作: 授权
代币: {tokenAddress}
订单: {orderId}
spender: {spender}
```

**授权失败输出（`失败`）：**

```text
❌ 失败
操作: 授权
代币: {tokenAddress}
原因: {sanitized error message}
```

---

### `买 <token> <amount> <baseToken>`

将 BNB/USDT 兑换为目标代币。

**参数：**
- `tokenAddress`：BSC 代币合约地址
- `amount`：人类可读数量（例如 `0.1`、`100`）
- `baseToken`：`bnb` 或 `usdt`

**默认值：**
- `baseToken`：`bnb`
- `slippageBps`：`500`

**数量转换：**
- BNB：乘以 `10^18`
- USDT：乘以 `10^18`

**执行：**

1. 强制执行共享交易前置条件（需要绑定）。
2. 验证 `amount > 0` 且 `baseToken` 在 `bnb|usdt` 中。
3. 将数量转换为最小单位字符串。
4. 渲染买入确认提示（显示数量、baseToken、滑点）。
5. 如果确认，调用 `POST https://azz.886668.shop/api/trade/swap`：
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
6. 读取即时订单结果并映射状态输出。
7. 可选调用 `GET https://azz.886668.shop/api/trade/orders?ids={orderId}&bindingCode={bindingCode}` 获取最新状态。

---

### `卖 <token> <amount> <baseToken>`

将代币兑换为 BNB/USDT。

**参数：**
- `tokenAddress`：BSC 代币合约地址
- `amount`：人类可读代币数量
- `baseToken`：`bnb` 或 `usdt`

**默认值：**
- `baseToken`：`bnb`
- `slippageBps`：`500`

**前置条件：** 代币必须先授权。

**执行：**

1. 与 `买` 流程相同，但 `side: "sell"`。
2. 渲染卖出确认提示（显示数量、baseToken、滑点）。

如果 API 返回 `Token not approved yet (sell requires approve first)`，渲染失败并明确提示（`先执行 授权`）。

---

## 交易状态渲染（`买` / `卖`）

将网站订单状态映射到所需的输出标签：

- `generated` -> `待确认`
- `sent` -> `待确认`
- `confirmed` -> `成功`
- `error` -> `失败`

**待处理订单输出（`待确认`）：**

```text
🟡 待确认
操作: {买/卖}
代币: {tokenAddress}
订单: {orderId}
状态: {generated|sent}
链上确认中，请稍后查询
```

**已确认订单输出（`成功`）：**

```text
✅ 成功
操作: {买/卖}
代币: {tokenAddress}
订单: {orderId}
状态: confirmed
{txHash if exists}
{inAmount → outAmount if both exist}
```

**失败订单输出（`失败`）：**

```text
❌ 失败
操作: {买/卖}
代币: {tokenAddress}
订单: {orderId}
状态: error
原因: {errorMessage or sanitized API error}
```

---

## 失败语义

### 未绑定（no binding）

对于任何没有活跃绑定状态的 `授权`/`买`/`卖`，始终返回入门提示（`未绑定`）。
不调用交易 API。

### 无效绑定（invalid binding）

对于 `绑定` 返回 404 或无效负载，返回 `失败` 并附带无效绑定消息。
不切换到 `BOUND`。

### 卖出前未授权（approve required before sell）

如果 `卖` 收到 `Token not approved yet (sell requires approve first)`，返回 `失败` 并指示用户先运行 `授权 <token>`。

### 订单处理中（pending order）

如果订单状态为 `generated` 或 `sent`，返回 `待确认` 并包含 `orderId`。

### 订单失败（failed order）

如果订单状态为 `error`，或 swap/approve API 失败，返回 `失败` 并附带净化后的原因。

## 路由摘要

```text
skill 输入 -> 解析指令 ->
  如果 分析 -> 调用 /api/score-token -> 返回分析
  如果 绑定 -> 调用 /api/trade/bind -> 设置绑定状态 -> 返回 已绑定/失败
  如果 授权 -> 要求绑定 -> 授权确认 -> 调用 /api/trade/approve(bindingCode) -> 返回 成功/失败
  如果 买 -> 要求绑定 -> 买入确认(显示数量/滑点) -> 调用 /api/trade/swap(side=buy,bindingCode) -> 返回 待确认/成功/失败
  如果 卖 -> 要求绑定 -> 卖出确认(显示数量/滑点) -> 调用 /api/trade/swap(side=sell,bindingCode) -> 返回 待确认/成功/失败
```

## 约束

- 仅 BSC
- 无浏览器钱包集成
- 无自动交易，无静默交易
- 无多链
- 无限价单
- 无自动卖出 / 止损
- 不更改代币/地址 API
- 不更改网站交易合约
