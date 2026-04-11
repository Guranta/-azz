# Project Handoff

Last updated: 2026-04-11

## 1. Project Goal

Build a two-surface product for BSC meme-token affinity analysis:

1. A public website
2. A single OpenClaw skill

The project focuses on BSC meme tokens launched from `fourmeme` and `flap`.

Input:

- One BSC token contract address

Output:

- Token brief
- CZ affinity score
- Affinity scores for a small tracked list of specific addresses
- Evidence and confidence notes

The OpenClaw skill should do only one thing:

- Accept a token address
- Query the website API
- Return a short summary and a result-page link

## 2. Product Boundaries

### In Scope For v1

- BSC only
- `fourmeme` and `flap` as the main launchpad focus
- One public persona: `CZ`
- A fixed tracked-address list stored in local config
- Website query flow
- OpenClaw query skill
- AVE token data integration
- AVE risk integration
- AI scoring for CZ affinity
- Fixed tracked-address scoring using website-side MiniMax with rule-based feature extraction
- VPS deployment on an 8 GB Ubuntu machine

### Out Of Scope For v1

- Real trade execution
- Wallet custody
- Online admin dashboard
- Database-backed management UI
- Multi-chain support
- Multiple public personas
- Full wallet-history explorer UX

## 3. Fixed Technical Decisions

- Package manager: `npm`
- Monorepo style: `npm workspaces`
- Frontend and API surface: `Next.js App Router + TypeScript + Tailwind`
- Shared logic location: `packages/core`
- Config source: local JSON files in `config/`
- Internal skill assets kept in `skills/`
- Final public OpenClaw skill: `skills/meme-affinity-query`
- Website routes:
  - `/`
  - `/token/[address]`
  - `/address/[address]`
- Website API route:
  - `POST /api/score-token`
  - `POST /api/score-address`

## 4. Current Repo Structure

```text
apps/web
packages/core
config
skills/address-trading-style
skills/cz-persona
skills/meme-affinity-query
docs
```

Current notable files:

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/token/[address]/page.tsx`
- `apps/web/src/app/api/score-token/route.ts`
- `packages/core/src/types/index.ts`
- `packages/core/src/mock/score-token-response.ts`
- `config/personas.json`
- `config/tracked-addresses.json`

## 5. Current Workflow Design

Target V1 workflow:

1. User submits a BSC token address on the website or through the OpenClaw skill.
2. Website fetches token detail and risk context from AVE.
3. Website fetches top100 holders for the token.
4. Website fetches the smart-wallet list from AVE and caches it on the server.
5. Website calculates the smart-money intersection between `top100 holders` and `smart_wallet/list`.
6. Website fetches recent history for each fixed tracked address using `GET /v2/address/tx`.
7. Website builds a normalized `tokenBrief` and a token narrative bundle.
8. CZ analyzer produces a `PersonaScore` using MiniMax on the server.
9. Fixed-address scoring combines:
   - tracked-address history
   - tracked-address profile summary
   - token narrative bundle
   - top100 whale state
   - smart-money intersection result
10. Website returns a single response payload from `POST /api/score-token`.
11. OpenClaw skill only relays that response in a compact form.

Target V2 arbitrary-address workflow:

1. User submits a BSC wallet address on the homepage in `Address` mode.
2. Website fetches recent wallet history from `GET /v2/address/tx`.
3. Website derives recent token context from that history and keeps only `fourmeme` / `flap` meme activity.
4. Shared deterministic address-analysis logic builds a stable wallet behavior profile.
5. Website optionally asks MiniMax to refine the final address-profile wording and evidence.
6. MiniMax failure never breaks the route; the response falls back to the deterministic profile.
7. Website assigns a deterministic main archetype tag: `畜生`, `P子`, `钻石手`, or `数据不足`.
8. Website returns a pure wallet profile from `POST /api/score-address` with top-level keys: `address`, `profile`, `cache`, `errors`.
9. Website renders the pure wallet profile on `/address/[address]` and does not mix in `CZ`, `smartMoney`, or fixed-address similarity scores.

## 6. Current V1 Execution Split

The project has entered a coordination phase.

The main coordinator no longer implements core V1 feature work directly. Earlier worker tasks are complete:

- `O1`: fixed-address internal skill upgrade
- `C1`: API, types, and server-side aggregation
- `O2`: public OpenClaw skill output upgrade
- `C2`: website UI, tech page, and sponsor surface
- `O3`: fixed-address capability refresh + smartmoney daily skill
- `C3`: local live smoke-upgrade + runtime metrics + smartmoney snapshot wiring
- `O4`: public OpenClaw skill wording and output finalization
- `C4`: local smoke-test closure and final website polish pass
- `C5`: MiniMax provider hardening and Anthropic-compatible default alignment
- `C6`: demo token screening and local score-quality closure
- `C8`: V2 arbitrary-address profile with MiniMax refinement
- `C9`: local hardening before deployment
- `C10`: address flow re-scoped back to pure wallet profile
- `C12`: MiniMax fallback performance optimization

Current next-step execution order is fixed:

1. `T10` deployment (H Hermes redeploy)
2. `T11` final docs

Task packets live in:

- `docs/OPENCODE_TASKS.md`
- `docs/CODEX_TASKS.md`

## 7. Legacy Foundation Board

### Task 1: Project skeleton

Status: DONE

Completed:

- Root workspace files
- `apps/web` shell
- `packages/core` shared types and mock exports
- `config` sample files
- Placeholder skill folders
- Static result page with mock data
- Placeholder `POST /api/score-token`

Validation completed:

- `npm install`
- `npm run build`
- `npm run lint`

### Task 2: Config system hardening

Status: DONE

Goal:

- Finalize config contracts for personas and tracked addresses
- Add config loaders and lightweight validation
- Make mock and future live flows consume the same config path

Completed:

- Added shared config validation helpers
- Added typed config shapes for personas and tracked addresses
- Added a single website-side config loader
- Switched the mock page and API to use the same validated config entry point

### Task 3: AVE token data adapter

Status: DONE

Goal:

- Add AVE REST adapter for token detail, risk, and launchpad or narrative hints
- Normalize output into a stable `tokenBrief`

Completed:

- Added a shared AVE data client in `packages/core`
- Added token detail and risk fetching for BSC tokens
- Added `tokenBrief` normalization with launchpad and narrative-tag inference
- Added environment-variable support for AVE base URL and timeout

### Task 4: CZ persona analyzer

Status: DONE

Goal:

- Consolidate CZ prompt rules from the reference repos
- Add provider adapters for DeepSeek and MiniMax
- Return a stable `PersonaScore`

Completed:

- Consolidated CZ persona asset docs
- Added scoring heuristics, examples, and adapter templates
- Unified the documented score scale to `0-100`
- Cleaned encoding issues from the prompt assets

### Task 5: Address analysis engine

Status: DONE

Goal:

- Port or mirror the address-style logic into the website stack
- Keep it deterministic
- Return stable `AddressScore` objects

Completed:

- Added a TypeScript address analysis engine in `packages/core/src/scoring/address-analysis.ts`
- Added normalized history input handling
- Added deterministic profile, affinity, likelihood, confidence, summary, and evidence generation
- Aligned the scoring interface with the new address-history input contract

### Task 6: Address history source adapter

Status: MERGED INTO `C1`

Reason:

- The latest AVE public docs now expose:
  - `GET /v2/address/tx`
  - `GET /v2/address/smart_wallet/list`
- As a result, the old standalone `T6` is no longer a separate planning gate.
- Address-history and smart-money adapters are now part of `C1`.

### Task 7: Unified scoring API

Status: DONE

Goal:

- Turn `POST /api/score-token` from mock to orchestrated logic
- Handle partial failure per address
- Add short cache

Completed:

- Replaced the mock-only route with a shared scoring service
- Wired AVE token detail and risk into the live API path
- Added deterministic CZ placeholder scoring aligned to the CZ persona asset
- Added deterministic tracked-address scoring using mock or manual normalized histories
- Added in-memory short caching and partial-failure handling

Important note:

- The public result page still consumes the mock response generator for now.
- `POST /api/score-token` is the live integration surface that OpenClaw should trust first.

### Task 8: Website product pass

Status: DONE

Goal:

- Upgrade homepage and result page from skeleton to demo-ready product UI
- Keep routes and response fields stable

Completed:

- Upgraded homepage presentation
- Upgraded token result layout
- Preserved existing routes and mock data plumbing

### Task 9: OpenClaw skill finalization

Status: DONE

Goal:

- Make `meme-affinity-query` call the website API
- Return compact affinity summaries
- Keep all heavy logic on the website side

Completed:

- Upgraded `skills/meme-affinity-query` into the final public skill scaffold
- Kept the skill thin: token address in, website API call out
- Documented request, response, output, and error-handling expectations
- Aligned the agent metadata with the same thin-skill behavior

### Task 10: VPS deployment

Status: TODO

Goal:

- Add Dockerfile, Compose, Nginx, and deployment instructions
- Deploy to the user's Ubuntu VPS
- Document every operational step clearly

### Task 11: Final integration and maintenance docs

Status: TODO

Goal:

- Smoke-test the end-to-end flow
- Document local run, production deploy, update workflow, and failure recovery

## 8. Current Progress Snapshot

What is done right now:

- Monorepo skeleton is stable.
- Website shell is running and the token result page is live-data driven.
- Shared types exist for the final API shape.
- Config files are validated and consumed through a shared loader.
- Shared AVE token adapter exists in `packages/core`.
- `POST /api/score-token` is wired to live AVE token lookup, MiniMax-backed CZ scoring, MiniMax-backed fixed-address scoring, recommendation, cache, and partial-failure handling.
- MiniMax defaults now align with the Anthropic-compatible route:
  - `MINIMAX_BASE_URL=https://api.minimaxi.com/anthropic`
  - `MINIMAX_API_STYLE=anthropic`
  - `MINIMAX_MODEL=MiniMax-M2.7`
- The provider now reads `ANTHROPIC_API_KEY` and `ANTHROPIC_BASE_URL` as env aliases for local debugging.
- Thinking-only MiniMax responses are treated as incomplete and retried or cleanly fallen back instead of being misparsed as success.
- Real tracked-address config now uses the 3 locked fixed addresses:
  - `😎 王小二`
  - `🧊 冷静`
  - `👿 阿峰`
- A 24-hour smartmoney snapshot contract exists and is wired into the website flow.
- Runtime AVE metrics are persisted for cumulative call counting and surfaced in the site.
- Local C4 smoke-test pass has been executed with live keys:
  - valid fourmeme token: `0xf581ee357f11d7478fafd183b4a41347c35a4444`
  - valid flap token: `0x9d1e991727ce4a33f43b4b544797d1dcb61b8888`
  - invalid address: `0x123` (expected `400`)
- Additional local validation shows the live path is healthy but current demo samples are weak:
  - both tested valid tokens returned `200`
  - both tested valid tokens had `launchpad = unknown`
  - both tested valid tokens had sparse or empty `narrativeTags`
  - both tested valid tokens had `smartMoney.matchedCount = 0`
  - tested valid tokens still showed `Persona scoring for CZ fell back to deterministic rules.`
- `C6` local demo-token screening is now complete with a 6-token matrix:
  - likely fourmeme: `0xb2acf3ae051c7f0b0b8de90cbb4ed99312574444` (`Build N Build`)
  - likely fourmeme: `0x924fa68a0fc644485b8df8abfa0a41c2e7744444` (`币安人生`)
  - smartmoney-leaning sample: `0xeccbb861c0dda7efd964010085488b69317e4444` (`龙虾`)
  - likely flap: `0xc20e45e49e0e79f0fc81e71f05fd2772d6587777` (`MILADY`)
  - likely flap: `0x3aadc14e5cd0e00378ebf2366fc44ceb11d17777` (`人生红利`)
  - flap backup: `0x9d1e991727ce4a33f43b4b544797d1dcb61b8888` (`GLDNY`)
- The local web scoring path now reads AVE `address/tx` directly inside `apps/web/src/lib/score-token.ts` instead of inheriting the empty `data.result` parse gap from the shared adapter. This restored token-scoped fixed-address histories in local scoring without changing the public API shape.
- Current best demo tokens before VPS deploy are:
  - `0xb2acf3ae051c7f0b0b8de90cbb4ed99312574444` (`Build N Build`): strongest current sample, reached `WATCH`, returned usable recent history for all 3 fixed addresses, and hit token top100 for `王小二` and `冷静`
  - `0x924fa68a0fc644485b8df8abfa0a41c2e7744444` (`币安人生`): 1 usable fixed-address history (`王小二`) plus a top100 hit, making it the best secondary demo despite weak token metadata
  - `0xeccbb861c0dda7efd964010085488b69317e4444` (`龙虾`): 1 usable fixed-address history (`阿峰`) and the highest smart-wallet tag recurrence in the screened set, even though top100 smart-money overlap still stayed `0`
- C6 matrix conclusions:
  - all 6 screened tokens still returned `launchpad = unknown`
  - all 6 screened tokens still returned empty `narrativeTags`
  - all 6 screened tokens still returned `riskLevel = unknown`
  - all 6 screened tokens still returned `smartMoney.matchedCount = 0`, and raw `top100 ∩ smart_wallet/list` overlap also stayed `0` for the screened set
  - fixed-address weakness is now judged primarily `history/filter-driven`, not primarily token-choice-driven, because the local web path was previously flattening `address/tx` into empty histories; after the web-layer fix, the stronger fourmeme samples immediately recovered usable tracked-address history
  - token choice still matters secondarily: the screened flap samples remained weak after the history fix, while the stronger fourmeme samples produced the best local demo behavior
  - CZ fallback remains, but current server logs show the dominant causes are `invalid_json` and `timeout`; they are not primarily `thinking_only` or `incomplete_response`, so no MiniMax provider tuning was applied under the C6 guardrails
- Runtime files under `apps/web/.runtime` are now verified in local run:
  - `ave-metrics.json` cumulative growth and restart recovery
  - `smartmoney-snapshot.json` generation + in-TTL reuse
- Final public OpenClaw skill scaffold exists in `skills/meme-affinity-query`.
- `C8` V2 arbitrary-address profile is now complete:
  - homepage supports `Token` and `Address` input modes
  - new live route: `/address/[address]`
  - new live API: `POST /api/score-address`
  - address profiling uses AVE `address/tx` recent history as the main source
  - deterministic wallet profiling is built from shared `packages/core/src/scoring/address-analysis.ts`
  - MiniMax address-profile refinement is best-effort only and falls back cleanly on timeout / invalid JSON / incomplete responses
  - when AVE token launchpad metadata is missing, the address flow keeps the current suffix heuristic (`...4444` => fourmeme, `...7777` / `...8888` => flap) so recent meme activity does not collapse into empty output
  - local V2 validation samples:
    - valid active address: `0x2a1c7bc7e697f6bff5ae9122c5b0212fe5ac42aa` -> `200`, `recentTradeCount = 21`, `launchpadBias = fourmeme`
    - no recent history address: `0x9f3b63f0d4e9c8a7b6f5e4d3c2b1a09876543210` -> `200` readable fallback profile
    - invalid address: `0x123` -> `400` stable error-shaped fallback profile
- `C10` address flow is now re-scoped back to pure wallet profile:
  - `POST /api/score-address` top-level keys are now `address`, `profile`, `cache`, `errors`
  - `profile` now includes a deterministic main archetype tag: `畜生`, `P子`, `钻石手`, or `数据不足`
  - `/address/[address]` now renders profile-only content: archetype, style, risk appetite, recent token context, summary, evidence, confidence, and source metadata
  - homepage `Address` mode now promises wallet profiling only; it no longer hints at `CZ`, `smartMoney`, or fixed-address scores
  - token scoring remains unchanged: `/token/[address]` still renders the full scored report and recommendation flow
- V3 hot-flow / popular-stream work is intentionally removed from the current mainline.
- Current mainline scope is now:
  - V1 token scoring
  - V2 arbitrary-address pure wallet profiling
  - deployment and final ops docs (`T10`, `T11`)
- `A7` V3 BSC real-trading contract is now complete (docs only, no implementation):
  - full contract at `docs/V3_TRADING_CONTRACT.md`
  - 5 website trade API endpoints: `POST /api/trade/wallet/generate`, `GET /api/trade/wallet`, `POST /api/trade/approve`, `POST /api/trade/swap`, `GET /api/trade/orders`
  - AVE Bot Wallet API mapping with HMAC-SHA256 auth, BSC token conventions, amount encoding
  - skill V3 contract with 4 instructions: `analyze`, `approve`, `buy`, `sell`
  - mandatory user confirmation before every trade
  - risk controls: chain lock, operation lock, confirmation lock, anti-fat-finger, slippage clamp, no credential exposure, no auto-trading
  - new env vars: `AVE_BOT_API_KEY`, `AVE_BOT_API_SECRET`, `AVE_BOT_BASE_URL`
  - no implementation code written
- `C11` V3 BSC real-trading website implementation is now complete:
  - AVE Bot API server adapter at `apps/web/src/lib/ave-bot-client.ts`: HMAC-SHA256 signing, sorted JSON body, response normalization, env var support
  - 5 trade API routes implemented per `docs/V3_TRADING_CONTRACT.md`:
    - `POST /api/trade/wallet/generate` — create delegate bot wallet, discard mnemonic
    - `GET /api/trade/wallet` — wallet identity + balance state (empty/funded) with graceful balance-fetch degradation
    - `POST /api/trade/approve` — approve AVE spender for token, BSC hardcoded
    - `POST /api/trade/swap` — market swap with confirmToken anti-fat-finger, slippage clamp 100–5000 bps, no autoSellConfig
    - `GET /api/trade/orders` — order status query (generated/sent/confirmed/error)
  - Token page trading panel at `/token/[address]`: wallet onboarding (create/recover), deposit prompt for empty wallet, approve, buy/sell with base token select (BNB/USDT), amount input, slippage slider, order status display
  - Existing scoring blocks (CZ, smart money, fixed addresses) unchanged
  - Risk controls enforced: BSC only, approve/buy/sell only, slippage clamp, confirmToken match, no silent trades, no browser wallet, no autoSellConfig, no useMev/autoGas/autoSlippage
  - New env vars in `.env.example`: `AVE_BOT_API_KEY`, `AVE_BOT_API_SECRET`, `AVE_BOT_BASE_URL`
  - V3 trade types added to `packages/core/src/types/index.ts`
  - Local verification passed: all 10 acceptance criteria (API shapes, token page integrity, build, lint)
- `G1` deployment prep is now complete:
  - `.gitignore` updated: excludes `.claude/`, `ext-cz-skill-*`, `repo/`, `dev-preview.log`, `.runtime/`
  - `Dockerfile`: multi-stage build (node:20-alpine), standalone Next.js output, non-root user, runtime directory
  - `docker-compose.yml`: web service with runtime volume, env_file injection, healthcheck, restart policy
  - `.dockerignore`: excludes docs, skills, .git, env files from build context
  - `README.md`: full deployment guide with VPS prerequisites, clone/env/build/update instructions, nginx config, runtime data
  - `.env.example`: expanded with all env vars, REQUIRED/OPTIONAL markers, defaults documented
  - `next.config.ts` updated with `output: "standalone"` for Docker deployment
  - `O6` V3 skill integration is also complete: `meme-affinity-query` supports analyze, approve, buy, sell with confirmation model
- `C12` MiniMax fallback performance optimization (revised) is now complete:
  - Added `fastModeTimeoutMs` option to `MiniMaxPersonaScorerOptions` in `packages/core/src/providers/minimax.ts`
  - When `fastModeTimeoutMs` is set: the provider uses that timeout instead of default 16s and disables retries (single attempt, no retry loop)
  - Token scoring path (`score-token.ts`) creates a fast-mode scorer with 8s timeout; each MiniMax call is a direct try/catch with exactly one fallback side effect
  - Address profiling path (`score-address.ts`) is untouched — still uses the default 16s timeout with retries
  - Before revision: `fastMiniMaxCall` wrapper resolved fallback early but did not cancel the underlying HTTP request; the provider still ran its full 16s × 2 retries in the background
  - After revision: the provider itself enforces 8s timeout with no retries — no background request continues after fallback
  - No duplicate fallback side effects: each call site produces at most one error message
  - API shape unchanged: `ScoreTokenResponse` same 7 top-level keys
  - Build and lint green
- `C9` local hardening is now complete:
  - tracked-address profile results are cached server-side with 10-minute TTL, keyed by tracked address id, reducing redundant AVE calls across V2 address queries
  - MiniMax default timeout increased from 12s to 16s; CZ persona max_tokens increased from 350 to 420
  - homepage address sample link copy changed from English to Chinese
  - runtime consistency verified: both `/api/score-token` and `/api/score-address` share the same `.runtime/ave-metrics.json` and `.runtime/smartmoney-snapshot.json`; no extra AVE smart-wallet requests in either path
  - token result page confirmed to render 3 fixed tracked addresses individually (not merged), each with name, emoji, score, summary, and evidence
  - local acceptance tests passed:
    - token API: valid token `200` with all 7 top-level keys, 3 individual address scores; invalid token `400`
    - address API: valid address `200` with 4 top-level keys (`address`, `profile`, `cache`, `errors`) including `profile.refinementSource`; no-history address `200` fallback; invalid address `400`
    - runtime files: `ave-metrics.json` accumulating; `smartmoney-snapshot.json` valid and reused
    - build and lint: green

What is intentionally still pending:

- VPS deployment (`T10`) — deployment materials are ready (Dockerfile, compose, docs); token path performance is the last pre-deploy validation gate
- Final ops and maintenance docs (`T11`)
- GitHub first push (see recommended commands below)

Locked VPS directory model:

```text
/opt/meme-affinity/
  app/                    # git clone of this repo
  env/.env.production     # production environment variables
  runtime/                # AVE metrics, smartmoney snapshots
```

The docker-compose.yml reads env from `/opt/meme-affinity/env/.env.production` and bind-mounts `/opt/meme-affinity/runtime` into the container.

Recommended first push:
```
git add .
git commit -m "V1+V2+V3: token scoring, address profiling, BSC trading, deployment materials"
git remote add origin <PUBLIC_GITHUB_REPO_URL>
git push -u origin main
```

## 9. Important Constraints For Any AI Contributor

Do not change these decisions unless the user explicitly approves:

- Do not add a database.
- Do not add a backend admin panel.
- Do not replace Next.js with another framework.
- Do not move shared contracts out of `packages/core`.
- Do not make the OpenClaw skill do heavy analysis locally.
- Do not change the website API route shape casually.
- Keep the final website as the source of truth for scoring.

## 10. Known Environment Notes

These notes matter for local work in this workspace:

- The Windows path contains non-ASCII characters, so the web app was switched to webpack mode instead of Turbopack.
- PowerShell execution policy may block direct `npm`; use `cmd /c npm.cmd ...` if needed.
- The default Next favicon was removed because path quoting caused build issues in this environment.

## 11. Recommended Ownership Split

Best split for multi-AI work:

- Main coordinator:
  - review
  - acceptance
  - feasibility checks
  - deployment approval
  - final docs approval
- OpenCode:
  - public skill output revisions
- Another Codex:
  - local demo-token screening
  - MiniMax fallback reduction validation
  - deployment and final docs draft

See `docs/OPENCODE_TASKS.md` and `docs/CODEX_TASKS.md` for ready-to-send instructions.
Use `docs/TASK_TRACKER.md` as the live progress board.
Use `docs/WINDOW_PLAYBOOK.md` when opening new AI chat windows.
