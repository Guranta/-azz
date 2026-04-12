# V4 Skill Test Plan (OpenClaw Binding + Output Layer)

Last updated: 2026-04-12
Owner: V4 Agent 2 (skill binding/output layer)
Scope: skill contract verification only (`skills/meme-affinity-query/SKILL.md`)

## 1. Goal

Validate V4 binding-state behavior for OpenClaw skill outputs without changing website code or API contract.

Required coverage:
- no binding
- invalid binding
- valid binding
- approve required before sell
- pending order
- failed order

Dependency baseline for this plan:
- per-user key mode is usable only when website-side binding has already succeeded
- `bindingCode` / `小龙虾 ID` is the skill's only external binding entry
- do not assume backend is always stable; failures must map to explicit `失败` outputs
- website config pre-step can be either:
  - existing `assetsId` + user key
  - no `assetsId`, website auto-generates wallet using user key

## 2. Out-of-Scope

- Any changes to `apps/**`, `packages/**`, `config/**`
- Any website UI/route contract redesign
- Any direct AVE API calls from skill

## 3. Environment and Data

Environment:
- Production-like website API base URL (same host used by OpenClaw integration)

Test data:
- `bindingCode_valid_active`: known active binding code
- `bindingCode_valid_auto_wallet`: binding code from website config path where wallet was auto-generated
- `bindingCode_invalid`: random/non-existing binding code
- `token_sell_needs_approve`: token not yet approved in target wallet
- `token_tradeable`: token that can pass buy/sell flow

General checks:
- Skill exposes only `bindingCode` / `小龙虾 ID` in user-facing binding outputs
- Skill does not require `assetsId` in normal `approve`/`buy`/`sell` commands
- All trade outputs map to one of: `未绑定` / `已绑定` / `待确认` / `成功` / `失败`
- Backend instability (timeout/5xx/unexpected payload) must not be treated as success

## 4. Test Matrix

| Case ID | Scenario | Preconditions | Input / Steps | Expected API path | Expected skill output |
|---|---|---|---|---|---|
| V4-SKILL-001 | no binding (trade gate) | Session has no bound code | 1) Start clean session 2) send `approve <token>` (or `buy`/`sell`) | No trade API call should be sent | Label `未绑定`; onboarding text instructs `bind <bindingCode>` |
| V4-SKILL-002 | invalid binding | Session unbound | 1) send `bind <bindingCode_invalid>` | `POST /api/trade/bind` returns 404/invalid | Label `失败`; reason indicates invalid binding; session remains unbound |
| V4-SKILL-003 | valid binding | Session unbound; active binding available | 1) send `bind <bindingCode_valid_active>` | `POST /api/trade/bind` returns 200 with `status=active` | Label `已绑定`; shows `小龙虾 ID`; follow-up says approve/buy/sell can proceed without assetsId |
| V4-SKILL-004 | approve required before sell | Session already bound to active code; token not approved | 1) send `sell <token_sell_needs_approve> <amount> bnb` 2) confirm | `POST /api/trade/swap` returns `Token not approved yet...` (401/403 path) | Label `失败`; message explicitly says run `approve <token>` first |
| V4-SKILL-005 | pending order | Session bound; token tradeable; chain not finalized yet | 1) send `buy <token_tradeable> <amount> bnb` 2) confirm 3) order status = `generated` or `sent` | `POST /api/trade/swap`; optional `GET /api/trade/orders` | Label `待确认`; includes `orderId` and pending status |
| V4-SKILL-006 | failed order | Session bound; induce swap failure (insufficient balance/slippage/error order) | 1) send `buy` or `sell` 2) confirm 3) API/order returns failure | `POST /api/trade/swap` and/or `GET /api/trade/orders` status `error` | Label `失败`; includes sanitized reason and operation context |
| V4-SKILL-009 | bind API unstable | Session unbound | 1) send `bind <bindingCode_valid_active>` 2) force timeout/5xx/invalid payload | `POST /api/trade/bind` unstable response | Label `失败`; session must stay unbound; no optimistic "已绑定" |
| V4-SKILL-010 | website config auto-generates wallet, then bind succeeds | User has key/secret but no existing assetsId | 1) Complete website `/api/trade/config` flow without assetsId 2) obtain `bindingCode_valid_auto_wallet` 3) in skill send `bind <bindingCode_valid_auto_wallet>` | Website config creates wallet + binding; skill calls `POST /api/trade/bind` | Label `已绑定`; skill can continue approve/buy/sell without asking assetsId |

## 5. Supplemental Checks

### V4-SKILL-007: analyze independent from binding
- Preconditions: session unbound
- Steps: send `analyze <token>`
- Expected: `POST /api/score-token` only; no bind requirement; no trade onboarding gate

### V4-SKILL-008: confirm gate enforced
- Preconditions: session bound
- Steps: send `buy`/`sell`/`approve`, then reply anything except `确认`
- Expected: no trade API call; operation cancelled message; no state drift

## 6. Pass Criteria

Release readiness for this layer requires all below:

- All matrix cases `V4-SKILL-001` to `V4-SKILL-006` pass
- `analyze` works in unbound state
- No test requires users to manually provide `assetsId` for each trade command
- Output labels are consistently visible and unambiguous
- No website contract changes are required by this skill layer
- Backend instability paths still produce deterministic `失败` output (no false-positive bind/trade success)

## 7. Execution Notes for Production联调

- Run tests in a fresh conversation to avoid stale bind state contamination.
- Record each case with: input, API status code, returned message, final output label.
- For pending/failed order cases, keep `orderId` for traceability with `/api/trade/orders`.
- If a case fails due to infra instability (not skill logic), mark as `blocked` and retest.
