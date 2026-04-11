# Task Tracker

Last updated: 2026-04-12

Use this file as the single progress board when work is split across multiple AI windows.

## Status Legend

- `todo`
- `in_progress`
- `blocked`
- `review`
- `done`

## Active Board

| ID | Task | Owner | Window | Status | Depends On | Output |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Project skeleton | Main Codex | main | done | none | stable monorepo skeleton |
| T2 | Config system hardening | Main Codex | next-main | done | T1 | typed config loaders and validation |
| T3 | AVE token data adapter | Main Codex | future-main | done | T2 | normalized tokenBrief service |
| T4 | CZ persona analyzer | OpenCode | cz-window | done | T1 | reusable CZ scoring asset or module plan |
| T5 | Address analysis engine | Another Codex | address-window | done | T2 | deterministic address scoring layer |
| T7 | Unified scoring API | Main Codex | future-main | done | T3, T4, T5 | live POST /api/score-token |
| T8 | Website product pass | Second Codex | web-window | done | T1 | demo-ready UI |
| T9 | OpenClaw final skill | OpenCode | skill-window | done | T1 | production-shaped query skill |
| O1 | Fixed-address internal skill upgrade | OpenCode | o1-window | done | none | stable fixed-address capability contract |
| C1 | API, types, and server aggregation | Another Codex | c1-window | done | O1 | smartmoney-aware V1 live scoring contract |
| O2 | OpenClaw skill output upgrade | OpenCode | o2-window | done | C1 | richer public skill output with token narratives |
| C2 | Website UI, tech page, and sponsor surface | Another Codex | c2-window | done | C1 | live V1 website presentation surface |
| O3 | Fixed-address capability refresh + smartmoney daily skill | OpenCode | o3-window | done | O2 | stable fixed-address contract and 24h smartmoney snapshot contract |
| C3 | Local live smoke-upgrade + runtime metrics + smartmoney snapshot wiring | Another Codex | c3-window | done | O3 | local live-ready website path with real AVE metrics and 24h smartmoney snapshot |
| O4 | Public OpenClaw skill wording and output finalization | OpenCode | o4-window | done | C3 | final demo-ready public skill output |
| C4 | Local smoke-test closure and website polish | Another Codex | c4-window | done | C3 | locally validated live website with final copy cleanup |
| C5 | MiniMax provider hardening and Anthropic-compatible defaults | Another Codex | c5-window | done | C4 | stable Anthropic-compatible MiniMax defaults with thinking-only fallback handling |
| C6 | Demo token screening and local score-quality closure | Another Codex | c6-window | done | C5 | selected demo tokens, fallback diagnosis, and deploy gate decision |
| C8 | V2 arbitrary-address profile with MiniMax refinement | Another Codex | c8-window | done | C6 | live `/api/score-address`, `/address/[address]`, and homepage dual-mode input |
| C9 | Local hardening before deployment | Another Codex | c9-window | done | C8 | tracked-address cache, MiniMax timeout tuning, copy cleanup, runtime consistency verified, local acceptance tests passed |
| C10 | Re-scope address flow back to pure wallet profile | Another Codex | c10-window | done | C9 | profile-only `/api/score-address`, profile-only `/address/[address]`, homepage/tech copy aligned |
| C12 | MiniMax fallback performance optimization | Another Codex | c12-window | done | C9 | provider-level fast-mode, true fast-fail for token scoring |
| A7 | V3 BSC real-trading contract (docs only) | Another Codex | a7-window | done | C9 | V3 trading contract document |
| C11 | V3 BSC real-trading website implementation | Another Codex | c11-window | done | A7 | AVE Bot adapter + 5 trade API routes + token page trading panel |
| O6 | V3 skill trade instruction support | Another Codex | o6-window | done | C11 | skill approve/buy/sell + confirmation + failure semantics |
| G1 | Deployment prep (gitignore, Dockerfile, compose, docs) | Another Codex | g1-window | done | C11 | deployment materials ready for VPS |
| G4 | Repo cleanup and source-of-truth sync | Another Codex | g4-window | done | C12 | temp files removed, docs synced for Hermes redeploy |
| O7 | Production-facing copy and skill validation | Another Codex | o7-window | done | G4 | homepage/address copy aligned to Chinese, skill 4-instruction validation passed |
| C13 | Frozen driver system switch + tech page update | Claude Code | main | done | G4 | tracked-address scoring switched to frozen driver system; tech page updated to Chinese with system notes; address page enhanced with summary+evidence |
| D1 | Full documentation rewrite | Claude Code | main | done | C13 | ARCHITECTURE.md, RUNBOOK.md, updated PROJECT_HANDOFF.md and TASK_TRACKER.md |
| T10 | VPS deployment | — | — | todo | D1 | deployed site + ops docs |
| T11 | Final integration and maintenance docs | — | — | done | D1 | architecture guide, operations runbook, updated handoff |

## Current Recommended Assignment

### Main Codex

- Own review, acceptance, feasibility checks, and final go/no-go on `C10`, `T10`, and `T11`
- Do not execute worker feature tasks directly
- Keep final integration authority on deployment, live wiring, security review, and maintenance docs

### OpenCode

- `O4` is complete
- Hold for follow-up public skill polish only if deployment or live demo feedback requires it
- `O5` docs-only cleanup remains non-blocking and off the deployment critical path

### Second Codex Window

- `O6` is complete
- `T10` and `T11` should follow the updated C10 pure-profile handoff notes

## Update Rules

Whenever a task changes state:

1. Update the `Status`
2. Update the `Owner` if ownership changed
3. Add a one-line note in the log below

## Progress Log

- 2026-04-08: `T1` completed by main Codex. Build and lint passed.
- 2026-04-08: `T4` assigned to OpenCode and marked in progress.
- 2026-04-08: `T8` assigned to second Codex and marked in progress.
- 2026-04-08: `T2` completed by main Codex. Added typed config validation, shared loaders, and unified config consumption for page and API.
- 2026-04-08: `T4` reported complete by OpenCode and moved to review.
- 2026-04-08: `T8` reported complete by second Codex and moved to review.
- 2026-04-08: `T8` revision accepted and marked done.
- 2026-04-08: `T4` review passed after final asset cleanup. Marked done.
- 2026-04-08: `T3` completed by main Codex. Added shared AVE token detail and risk adapter with tokenBrief normalization.
- 2026-04-08: `T5` assigned to another Codex and marked in progress.
- 2026-04-08: `T9` completed by OpenCode. Final public skill scaffold now constrained to token input, website API call, compact summary, and result link.
- 2026-04-08: `T9` reviewed and accepted by main Codex. Marked done.
- 2026-04-08: `T5` reviewed and accepted after main-line interface cleanup. Marked done.
- 2026-04-08: `T7` started by main Codex.
- 2026-04-09: `T7` completed by main Codex. `POST /api/score-token` now uses live AVE token lookup, heuristic CZ scoring, deterministic tracked-address scoring, cache, and partial-failure handling.
- 2026-04-10: V1 work was re-split into `O1`, `C1`, `O2`, and `C2`. Main Codex now only coordinates, reviews, and accepts worker output before `T10` deployment.
- 2026-04-10: Latest AVE public docs confirmed `GET /v2/address/tx` and `GET /v2/address/smart_wallet/list`. Old standalone `T6` was merged into `C1`.
- 2026-04-10: V1 worker packets were refreshed around `address/tx`, `smart_wallet/list`, `top100 holders`, MiniMax server-side scoring, and `4 + N` / `3 + N` API-call accounting.
- 2026-04-10: `O1` reviewed and accepted. Internal fixed-address contract now covers `address/tx`, token narrative bundle, top100 whale interpretation, and smartmoney interpretation.
- 2026-04-10: `C1` reviewed and moved to revision. Required fixes: pass `token_address` into `address/tx`, use MiniMax for final fixed-address scoring, and align MiniMax provider with the agreed Token/Coding Plan path.
- 2026-04-10: `C1` revision reviewed and accepted. Live scoring contract now includes smartmoney, recommendation, token-scoped tracked-address history, and server-side MiniMax support.
- 2026-04-10: `O2` reviewed and accepted. Public OpenClaw skill output now includes token name, token narratives, persona score, smartmoney score, fixed-address score, whale state, and result link.
- 2026-04-10: `C2` reviewed and accepted. Homepage, `/tech`, sponsor surface, and live result page are in place; earlier emoji concerns were confirmed to be PowerShell display artifacts rather than broken source encoding.
- 2026-04-10: `O3` reviewed and accepted. Fixed-address capability docs and `smartmoney-daily` snapshot contract now cover the three locked tracked addresses and 24h smartmoney snapshot consumption.
- 2026-04-10: `C3` reviewed and accepted. Local live website path now uses the real tracked-address config, runtime AVE metrics, and enriched 24h smartmoney snapshot support.
- 2026-04-10: Next execution split locked to `O4 -> C4 -> T10 -> T11`. Main Codex remains review-only.
- 2026-04-10: `C4` worker pass completed and moved to review. Local smoke tests ran against live keys (valid fourmeme token, valid flap token, invalid address), runtime metrics and snapshot persistence verified, and website copy/polish checks closed.
- 2026-04-10: `O4` reviewed and accepted. Public OpenClaw skill output now matches the live website contract and final emoji/text presentation.
- 2026-04-10: `C4` reviewed and accepted. Local smoke closure passed, runtime `.runtime` persistence was verified, and the project is ready to move into `T10` deployment planning.
- 2026-04-10: `C5` reviewed and accepted. MiniMax defaults now align with the Anthropic-compatible MiniMax route, alias env vars are supported, and thinking-only responses are classified as incomplete before fallback.
- 2026-04-10: Local live validation confirmed the API path is healthy, but current demo samples still produce weak product output (`launchpad` unknown, sparse narratives, smartmoney miss, and CZ fallback on tested tokens).
- 2026-04-10: Deploy priority was intentionally lowered. Next execution split is now `C6 -> T10 -> T11`, with `C6` focused on stronger demo token selection and final local score-quality closure.
- 2026-04-10: `C6` completed by another Codex. A 6-token local matrix was run across likely fourmeme, likely flap, and smartmoney-leaning samples; recommended demo tokens are `0xb2acf3ae051c7f0b0b8de90cbb4ed99312574444`, `0x924fa68a0fc644485b8df8abfa0a41c2e7744444`, and `0xeccbb861c0dda7efd964010085488b69317e4444`.
- 2026-04-10: `C6` concluded that fixed-address weakness was primarily history/filter-driven in the local web path. `apps/web/src/lib/score-token.ts` now reads AVE `address/tx` directly for live scoring, restoring token-scoped tracked-address histories without changing the public API contract.
- 2026-04-10: `C6` log review showed current CZ fallback is dominated by `invalid_json` and `timeout`, not primarily `thinking_only` / incomplete responses, so no MiniMax provider tuning was applied under the task guardrails.
- 2026-04-10: `C8` completed by another Codex. Added `POST /api/score-address`, `/address/[address]`, homepage Token/Address mode switching, shared address-profile types, deterministic fallback handling, and MiniMax-backed address-profile refinement that falls back cleanly on failure.
- 2026-04-10: `C8` local validation passed with one active wallet (`0x2a1c7bc7e697f6bff5ae9122c5b0212fe5ac42aa`), one no-history wallet (`0x9f3b63f0d4e9c8a7b6f5e4d3c2b1a09876543210`), one invalid wallet (`0x123`), plus fresh `npm run build` and `npm run lint`.
- 2026-04-10: V3 hot-flow / popular-stream work was explicitly removed from the current mainline. Active scope is now V1 token scoring + V2 arbitrary-address profiling + deployment/docs.
- 2026-04-10: `C9` completed by another Codex. Tracked-address profile cache added (10-min TTL, per-address-id). MiniMax default timeout increased to 16s, persona max_tokens increased to 420. Homepage copy cleaned. Runtime consistency verified across V1/V2 paths. Token result page confirmed to render 3 individual fixed-address cards. Local acceptance tests passed: token API, address API, runtime files, build/lint all green. Next step is `T10` deployment.
- 2026-04-11: `A7` completed by another Codex. V3 BSC real-trading contract document created at `docs/V3_TRADING_CONTRACT.md`. Covers 5 website trade API endpoints, AVE Bot API mapping, HMAC-SHA256 auth, BSC token conventions, skill V3 instructions (analyze/approve/buy/sell), confirmation requirement, output templates, risk controls, and new env vars. No implementation code written.
- 2026-04-11: `C10` worker pass completed and moved to review. `POST /api/score-address` now returns `address + profile + cache + errors`, `/address/[address]` is profile-only again, homepage Address mode no longer promises `CZ` / `smartMoney` / fixed-address scores, and token scoring flow remains unchanged.
- 2026-04-11: `C11` completed by another Codex. AVE Bot API server adapter at `apps/web/src/lib/ave-bot-client.ts` with HMAC-SHA256 signing. 5 trade API routes: wallet/generate, wallet, approve, swap, orders. Token page trading panel with wallet onboarding, deposit prompt, approve, buy/sell with base token select, slippage slider, order status. V3 trade types in `packages/core`. All 10 local acceptance tests passed: API shapes correct, token scoring blocks unchanged, build and lint green.
- 2026-04-11: `O6` completed by another Codex. Skill `meme-affinity-query` updated with 4 instructions: analyze (unchanged), approve, buy, sell. All trade instructions require explicit user confirmation ("确认"). Failure semantics defined for: no assetsId, user did not confirm, approve failed, swap failed, order pending. Amount conversion rules (18 decimals for BNB/USDT). Output templates match V3_TRADING_CONTRACT.md section 6.
- 2026-04-11: `G1` completed by another Codex. Deployment materials: `.gitignore` updated (excludes .claude, ext-cz-skill-*, repo, dev-preview.log, .runtime), `Dockerfile` (multi-stage standalone Next.js build), `docker-compose.yml` (web service with runtime volume, env_file, healthcheck, restart policy), `.dockerignore`, `README.md` rewritten with full deploy instructions, `.env.example` expanded with all env vars and REQUIRED/OPTIONAL markers. `next.config.ts` updated with `output: "standalone"`. Build and lint green. `docker compose config` not verified locally (no Docker on Windows).
- 2026-04-11: `C12` completed by another Codex. Added `fastMiniMaxCall<T>()` wrapper in `apps/web/src/lib/score-token.ts` with 8s deadline. Before: MiniMax worst case ~32s (16s timeout × 2 retries) per scoring call before fallback. After: fallback fires within 8s per call. API shape unchanged (`ScoreTokenResponse` same 7 keys). Fallback still works — deterministic rules used when MiniMax times out or fails. Build and lint green.
- 2026-04-11: `C12` revision: replaced fake fast-fail with true provider-level fast-mode. Added `fastModeTimeoutMs` to `MiniMaxPersonaScorerOptions` in `packages/core/src/providers/minimax.ts`. When set: overrides timeout to 8s and disables retries entirely. `score-token.ts` now creates a fast-mode scorer instead of wrapping calls in a setTimeout race. Removed `fastMiniMaxCall` wrapper. Each MiniMax call site uses direct try/catch with exactly one fallback side effect. `score-address.ts` untouched (still uses 16s + retries). API shape unchanged. Build and lint green.
- 2026-04-11: `G4` completed. Removed temp files `staged.txt` and `h -u origin main`. Docs synced: C12 revision complete, next step is Hermes redeploy (T10).
- 2026-04-11: `O7` completed. Production-facing copy pass: homepage fixed 3 mixed-language spots ("smart wallet overlap" → Chinese, "1 active" → "1 位", "N watchers" → "N 位观察者"), address page fixed 2 English error messages → Chinese. Skill 4-instruction validation passed (analyze/approve/buy/sell all clean, confirmation prompts clear, onboarding gate clear, error templates concise). Token page and /tech page unchanged — already clean. No structural changes. Build and lint green.
- 2026-04-12: `C13` completed. Frozen driver system switch confirmed: tracked-address scoring uses frozen driver snapshots (not live chain queries). Tech page updated: FLOW_STEPS and SCORE_CHANNELS rewritten in Chinese, new "系统说明" section covering frozen driver system, MiniMax 60s no-retry strategy, V3 trading status. Address page enhanced: added summary paragraph and evidence list while keeping minimalist large-font design. Build and lint green.
- 2026-04-12: `D1` completed. Full documentation rewrite: created `docs/ARCHITECTURE.md` (comprehensive architecture guide covering system overview, repo structure, scoring architecture, frozen driver system, MiniMax provider, trading, API reference, data flows, configuration, design system), created `docs/RUNBOOK.md` (operations runbook covering local development, production deployment, monitoring, failure recovery, frozen driver maintenance, security notes, smoke tests, demo tokens), updated `docs/PROJECT_HANDOFF.md` (concise current-state handoff reflecting all completed work), updated `docs/TASK_TRACKER.md` (added C13 and D1 entries). Build and lint green.

## Ready For Review

- none currently in review
