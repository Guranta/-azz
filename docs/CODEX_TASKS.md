# Second Codex Task Briefs

These are the current V1 worker packets for another Codex window.

Core rules:

- Do not change the root architecture.
- Do not move files between `apps/`, `packages/`, `config/`, and `skills/`.
- Do not revert work done by others.
- Keep write scopes disjoint.
- Do not mark tasks as `done` in shared docs. Only the main coordinator accepts work.

## Task C6: Demo Token Screening and Local Score-Quality Closure

Recommended write scope:

- `packages/core/src/providers/minimax.ts`
- `apps/web/src/lib/**`
- `docs/TASK_TRACKER.md`
- `docs/PROJECT_HANDOFF.md`
- optionally `README.md`

Do not edit:

- `skills/**`
- `apps/web/src/app/**` page structure
- `config/**`
- `POST /api/score-token` top-level response keys

Goal:

- Find stronger local demo tokens before VPS deployment.
- Reduce avoidable `CZ` fallback where the current cause is `thinking-only` or other incomplete MiniMax responses.
- Verify whether weak fixed-address results come from token choice or from an overly strict filter/history path.
- Do not redesign the UI and do not change the public API contract.

Required deliverables:

- Run a local demo matrix against at least 5 candidate tokens:
  - `2` likely `fourmeme`
  - `2` likely `flap`
  - `1` sample that is more likely to have smartmoney overlap
- For each token, record:
  - whether `launchpad` is recognized
  - whether `narrativeTags` are populated
  - whether risk is still `unknown`
  - `smartMoney.matchedCount`
  - whether any fixed address hits top100
  - whether any fixed address gets usable recent history
  - whether `CZ` still falls back
  - the final `recommendation`
- Choose `2-3` strongest demo tokens and write them into:
  - `docs/PROJECT_HANDOFF.md`
  - `docs/TASK_TRACKER.md` progress log
- Perform one minimal MiniMax fallback investigation on top of `C5`:
  - identify whether current `CZ` fallback is still mainly `thinking-only` / `incomplete_response`
  - if yes, make the smallest safe tuning needed in `packages/core/src/providers/minimax.ts`
  - allowed tuning includes:
    - `max_tokens`
    - retry token budget
    - text-block parsing guardrails
- Perform one fixed-address effectiveness check:
  - sample token-scoped `address/tx` results for the 3 locked addresses
  - determine whether weak results are mostly caused by poor demo token choice or by filtering/history scarcity
- Keep build and lint green.

Constraints:

- Do not change page structure.
- Do not change public API wire shape.
- Do not change skills.
- Do not change tracked-address identity config.
- Treat current fixed-address doc mojibake as non-blocking for this task.
- Deployment stays blocked until `C6` is reviewed and accepted.

Ready-to-send instruction:

```text
You are working inside a monorepo for the Ai Zhao Zhao V1 meme-affinity product.

Read first:
- docs/PROJECT_HANDOFF.md
- docs/TASK_TRACKER.md

Your ownership is limited to:
- packages/core/src/providers/minimax.ts
- apps/web/src/lib/**
- docs/TASK_TRACKER.md
- docs/PROJECT_HANDOFF.md
- optionally README.md

Do not edit:
- skills/**
- apps/web/src/app/** page structure
- config/**
- POST /api/score-token top-level response keys

Task:
- Find stronger local demo tokens before VPS deployment.
- Reduce avoidable CZ fallback where the cause is incomplete MiniMax output.
- Verify whether weak fixed-address results are mainly caused by token choice or by history/filter scarcity.

Required demo matrix:
- at least 5 candidate tokens
  - 2 likely fourmeme
  - 2 likely flap
  - 1 more likely smartmoney-overlap sample

For each token, record:
- launchpad recognized or not
- narrative tags populated or not
- risk still unknown or not
- smartMoney.matchedCount
- any fixed address top100 hit or not
- any fixed address usable recent history or not
- CZ fallback or not
- final recommendation

Must also:
- choose 2-3 strongest demo tokens
- update docs/PROJECT_HANDOFF.md and docs/TASK_TRACKER.md with those chosen demo samples
- inspect current CZ fallback classification
- if the main issue is still thinking-only / incomplete response, make the smallest safe provider tuning in packages/core/src/providers/minimax.ts
- sample the 3 fixed addresses against token-scoped address/tx and state whether weak fixed-address results are mainly token-choice-driven or history/filter-driven

Constraints:
- do not redesign the UI
- do not change POST /api/score-token top-level keys
- do not change skills
- keep build and lint green

At the end, reply with exactly:
Task completed:
- C6

Files changed:
- ...

Summary:
- ...

Risks / follow-ups:
- ...
```

## Archived C4: Local Smoke-Test Closure and Website Polish

Recommended write scope:

- `apps/web/src/app/**`
- `apps/web/src/components/**`
- `apps/web/src/lib/**`
- `README.md`
- `docs/TASK_TRACKER.md`
- `docs/PROJECT_HANDOFF.md`
- optionally `apps/web/.env.example`

Do not edit:

- `skills/**`
- `packages/core/**` public response contract

Goal:

- Use real local keys to complete V1 local live closure.
- Fix only the last live-data issues exposed by smoke testing.
- Update docs to reflect that `O3` and `C3` are done and the project is entering deploy prep.

Required deliverables:

- Run at least 3 local smoke tests:
  - one valid `fourmeme` token
  - one valid `flap` token
  - one invalid address
- Confirm and fix only as needed:
  - fixed-address main display is `emoji + 名字 + 喜爱程度`
  - `👍 CZ` is the public persona display
  - smartmoney shows `emoji + 喜爱程度 + 命中数量`
  - `apps/web/.runtime/ave-metrics.json` accumulates correctly
  - `apps/web/.runtime/smartmoney-snapshot.json` is generated and reused
  - runtime metrics recover after restart
- Update:
  - `docs/TASK_TRACKER.md`
  - `docs/PROJECT_HANDOFF.md`
  so the next stage becomes `O4 -> C4 -> T10 -> T11`

Constraints:

- Do not redesign the website.
- Do not change the top-level `POST /api/score-token` keys.
- Do not move keys to the client.
- Do not change skills.
- Keep build and lint green.

Ready-to-send instruction:

```text
You are working inside a monorepo for the Ai Zhao Zhao V1 meme-affinity product.

Read first:
- docs/PROJECT_HANDOFF.md
- docs/TASK_TRACKER.md

Your ownership is limited to:
- apps/web/src/app/**
- apps/web/src/components/**
- apps/web/src/lib/**
- README.md
- docs/TASK_TRACKER.md
- docs/PROJECT_HANDOFF.md
- optionally apps/web/.env.example

Do not edit:
- skills/**
- packages/core/** public response contract

Task:
- Use real local keys to complete V1 local live closure.
- Run local smoke tests and only fix the last live-data issues exposed by them.
- Update handoff docs for the next phase.

Required smoke tests:
- one valid fourmeme token
- one valid flap token
- one invalid address

Must confirm and fix only if needed:
- fixed-address main display = emoji + 名字 + 喜爱程度
- 👍 CZ is the public persona display
- smartmoney = emoji + 喜爱程度 + 命中数量
- apps/web/.runtime/ave-metrics.json accumulates correctly
- apps/web/.runtime/smartmoney-snapshot.json is generated and reused
- runtime metrics recover after restart

Update docs so the next stage is:
- O4
- C4
- T10
- T11

Constraints:
- Do not redesign the page
- Do not change POST /api/score-token top-level keys
- Do not move provider keys to the client
- Keep build and lint green

At the end, reply with exactly:
Task completed:
- C4

Files changed:
- ...

Summary:
- ...

Risks / follow-ups:
- ...
```

## Archived C1: API, Types, and Server-Side Aggregation

Recommended write scope:

- `packages/core/**`
- `apps/web/src/lib/**`
- `apps/web/src/app/api/score-token/route.ts`
- `config/personas.json`
- `config/tracked-addresses.json`
- optionally `config/sponsors.json`

Do not edit:

- `skills/**`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/token/[address]/page.tsx`
- `apps/web/src/app/globals.css`

Goal:

- Fill out the live V1 scoring contract with persona display fields, fixed-address display fields, smartmoney, and recommendation logic.
- Absorb the old standalone `T6` into this task by implementing the address-history and smart-wallet adapters here.

Required deliverables:

- Extend persona score fields with:
  - `displayLevel`
  - `displayEmoji`
  - `logoKey`
  - `logoMode`
- Extend address score fields with:
  - `displayLevel`
  - `displayEmoji`
  - `isTop100Holder`
  - `top100Rank`
  - `top100Percentage`
  - `holderEmoji`
  - `logoKey`
  - `logoMode`
- Add a `smartMoney` result block that includes at least:
  - `displayLevel`
  - `displayEmoji`
  - `matchedCount`
- Add a top-level `recommendation` field without removing existing top-level keys:
  - keep `token`
  - keep `personaScores`
  - keep `addressScores`
  - keep `cache`
  - keep `errors`
- Add recommendation logic using:
  - persona
  - at least one fixed address
  - smartmoney
- Lock tracked-address count to 3-5 and give each one a name and logo config
- Preserve security boundaries:
  - AVE and MiniMax are server-side only
  - no public key leakage
  - no raw upstream errors in API responses
- Implement the following upstream integrations:
  - `GET /v2/address/tx` for each fixed tracked address
  - `GET /v2/address/smart_wallet/list`
  - `GET /v2/tokens/top100/{token}-{chain}`
- Cache `smart_wallet/list` on the server for `300` seconds.
- Use `address/tx` only for recent history in V1; do not implement deep pagination.

Scoring rules:

- Persona:
  - `0-39 => NO_LOVE`
  - `40-69 => LOVE`
  - `70-100 => LOVE_LOVE`
- Fixed address:
  - `0-39 => NO_LOVE`
  - `40-69 => LOVE`
  - `70-100 => LOVE_LOVE`
- Smartmoney:
  - `0 => NO_LOVE`
  - `1-2 => LOVE`
  - `>=3 => LOVE_LOVE`

Display intent:

- `NO_LOVE` should render as the product's "not love" emoji badge
- `LOVE` should render as the product's "love" emoji badge
- `LOVE_LOVE` should render as the product's "love-love" emoji badge
- whale hit should render as the product whale badge

Recommendation rules:

- `STRONG_BUY`
  - persona = `LOVE_LOVE`
  - and at least one fixed address = `LOVE_LOVE`
  - and smartmoney = `LOVE_LOVE`
- `BUY`
  - persona >= `LOVE`
  - and at least one fixed address >= `LOVE`
  - and smartmoney >= `LOVE`
- `WATCH`
  - any 2 of the 3 dimensions are at least `LOVE`
  - but not enough for `BUY`
- `DO_NOT_BUY`
  - all other cases

API-call accounting rules:

- Cold path:
  - `1 x token detail`
  - `1 x risk`
  - `1 x top100 holders`
  - `1 x smart_wallet/list`
  - `N x tracked address history`
  - total = `4 + N`
- Warm path:
  - same as above, but smart-wallet list served from cache
  - total = `3 + N`

Ready-to-send instruction:

```text
You are working inside a monorepo for the Ai Zhao Zhao V1 meme-affinity product.

Read first:
- docs/PROJECT_HANDOFF.md
- docs/TASK_TRACKER.md

Your ownership is limited to:
- packages/core/**
- apps/web/src/lib/**
- apps/web/src/app/api/score-token/route.ts
- config/personas.json
- config/tracked-addresses.json
- optionally config/sponsors.json

Do not edit:
- skills/**
- apps/web/src/app/page.tsx
- apps/web/src/app/token/[address]/page.tsx
- apps/web/src/app/globals.css

Task:
- Fill out the V1 live scoring contract and aggregation layer.
- This task also absorbs the old T6 work.

Required outputs:
- Persona score fields:
  - displayLevel
  - displayEmoji
  - logoKey
  - logoMode
- Address score fields:
  - displayLevel
  - displayEmoji
  - isTop100Holder
  - top100Rank
  - top100Percentage
  - holderEmoji
  - logoKey
  - logoMode
- A smartMoney block with:
  - displayLevel
  - displayEmoji
  - matchedCount
- A top-level recommendation field, while keeping the existing top-level response keys stable
- Recommendation logic using persona + fixed address + smartmoney
- 3-5 tracked addresses with names and logo config
- Secure server-side-only AVE/MiniMax handling
- Upstream adapters for:
  - GET /v2/address/tx
  - GET /v2/address/smart_wallet/list
  - GET /v2/tokens/top100/{token}-{chain}
- Server cache for smart-wallet list with TTL 300 seconds

Rules:
- Persona: 0-39 NO_LOVE, 40-69 LOVE, 70-100 LOVE_LOVE
- Fixed address: 0-39 NO_LOVE, 40-69 LOVE, 70-100 LOVE_LOVE
- Smartmoney: 0 NO_LOVE, 1-2 LOVE, >=3 LOVE_LOVE
- Render those levels using the product's emoji badges and whale badge
- Cold-path AVE accounting must be 4 + N
- Warm-path AVE accounting must be 3 + N

Do not leak keys or raw upstream auth errors.

At the end, reply with exactly:
Task completed:
- C1

Files changed:
- ...

Summary:
- ...

Risks / follow-ups:
- ...
```

## Archived C2: Website UI, Tech Page, and Sponsor Surface

Recommended write scope:

- `apps/web/src/app/**`
- `apps/web/src/components/**`
- `apps/web/src/app/globals.css`

Do not edit:

- `packages/core/**`
- `config/personas.json`
- `config/tracked-addresses.json`
- `skills/**`

Goal:

- Turn the website into the intended V1 presentation layer.
- This task only starts after `C1` is reviewed and accepted.

Required deliverables:

- Homepage:
  - meme-lab / emoji-badge style
  - sponsor section at the bottom
  - sponsor placeholder icons + links
- New route:
  - `/tech`
- `/tech` must explain:
  - product flow
  - persona scoring
  - fixed-address scoring
  - smartmoney scoring
  - why top100 is checked first
  - AVE API call baseline
  - security boundaries
- Result page:
  - live-data driven
  - persona card with logo
  - fixed-address cards with names and logos
  - smartmoney score card
  - visible whale state

AVE call baseline text that must appear in `/tech`:

- `1 x token detail`
- `1 x risk`
- `1 x top100 holders`
- `1 x smart_wallet/list`
- `N x tracked address history`
- `4 + N` for a cold request
- `3 + N` when smart-wallet list is served from cache
- Therefore:
  - cold path = `4 + N`
  - warm path = `3 + N`

Ready-to-send instruction:

```text
You are working inside a monorepo for the Ai Zhao Zhao V1 meme-affinity product.

Read first:
- docs/PROJECT_HANDOFF.md
- docs/TASK_TRACKER.md

Your ownership is limited to:
- apps/web/src/app/**
- apps/web/src/components/**
- apps/web/src/app/globals.css

Do not edit:
- packages/core/**
- config/personas.json
- config/tracked-addresses.json
- skills/**

Task:
- Turn the website into the V1 presentation surface.
- This task only begins after C1 is accepted.

Required outputs:
- Homepage:
  - emoji-badge / meme-lab style
  - sponsor section at the bottom
  - sponsor placeholder icons + links
- New /tech page explaining:
  - product flow
  - persona scoring
  - fixed-address scoring
  - smartmoney scoring
  - why top100 is checked first
  - AVE API call baseline
  - security boundaries
- Live result page:
  - persona card with logo
  - fixed-address cards with names and logos
  - smartmoney card
  - visible whale state

Important text that must appear in /tech:
- 1 x token detail
- 1 x risk
- 1 x top100 holders
- 1 x smart_wallet/list
- N x tracked address history
- cold path = 4 + N
- warm path = 3 + N

At the end, reply with exactly:
Task completed:
- C2

Files changed:
- ...

Summary:
- ...

Risks / follow-ups:
- ...
```
