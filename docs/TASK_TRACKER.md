# Task Tracker

Last updated: 2026-04-13

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
| C13 | Frozen driver system switch + tech page update | Claude Code | main | done | G4 | tracked-address scoring switched to frozen driver system |
| D1 | Full documentation rewrite | Claude Code | main | done | C13 | comprehensive architecture guide and runbook |
| V4-W | V4 wallet-binding refactor (platform-managed wallets + binding codes) | Claude Code | main | done | C11, D1 | per-user key system removed; platform-managed wallet model with binding codes; binding-store.ts replaces credential-store.ts; trade-bindings.db replaces trade-credentials.db; all docs updated |
| T10 | VPS deployment | — | — | todo | V4-W | deployed site + ops docs |

## Current Recommended Assignment

### Main Codex

- Own review, acceptance, feasibility checks, and final go/no-go on `T10`
- Do not execute worker feature tasks directly
- Keep final integration authority on deployment, live wiring, security review, and maintenance docs

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
- 2026-04-10: V1 work was re-split into `O1`, `C1`, `O2`, and `C2`.
- 2026-04-10: `O1` reviewed and accepted. Internal fixed-address contract now covers `address/tx`, token narrative bundle, top100 whale interpretation, and smartmoney interpretation.
- 2026-04-10: `C1` reviewed and moved to revision. Required fixes: pass `token_address` into `address/tx`, use MiniMax for final fixed-address scoring, and align MiniMax provider.
- 2026-04-10: `C1` revision reviewed and accepted.
- 2026-04-10: `O2` reviewed and accepted. Public OpenClaw skill output now includes token name, narratives, persona/smartmoney/fixed-address scores, and result link.
- 2026-04-10: `C2` reviewed and accepted.
- 2026-04-10: `O3` reviewed and accepted. Fixed-address capability docs and 24h smartmoney snapshot contract.
- 2026-04-10: `C3` reviewed and accepted. Local live website path with real AVE metrics and 24h smartmoney snapshot.
- 2026-04-10: `O4` reviewed and accepted. Public OpenClaw skill output matches live website contract.
- 2026-04-10: `C4` reviewed and accepted. Local smoke closure passed.
- 2026-04-10: `C5` reviewed and accepted. MiniMax defaults aligned with Anthropic-compatible route.
- 2026-04-10: Local live validation confirmed API path is healthy; deploy priority lowered.
- 2026-04-10: `C6` completed. 6-token matrix run; recommended demo tokens selected.
- 2026-04-10: `C8` completed. Added `POST /api/score-address`, `/address/[address]`, homepage dual-mode input.
- 2026-04-10: `C9` completed. Tracked-address cache, MiniMax tuning, runtime consistency verified, local acceptance tests passed.
- 2026-04-11: `A7` completed. V3 trading contract document.
- 2026-04-11: `C10` completed. Address flow re-scoped to pure profile.
- 2026-04-11: `C11` completed. AVE Bot API adapter + 5 trade routes + trading panel.
- 2026-04-11: `O6` completed. Skill approve/buy/sell instructions.
- 2026-04-11: `G1` completed. Deployment materials ready.
- 2026-04-11: `C12` completed. MiniMax fast-mode optimization.
- 2026-04-11: `G4` completed. Repo cleanup and docs synced.
- 2026-04-11: `O7` completed. Production-facing copy and skill validation.
- 2026-04-12: `C13` completed. Frozen driver system switch.
- 2026-04-12: `D1` completed. Full documentation rewrite.
- 2026-04-13: `V4-W` completed. V4 wallet-binding refactor: removed per-user key system (credential-store.ts, credential-crypto.ts, trade-config-panel.tsx, trade/config route); created binding-store.ts for wallet binding relationships; rewrote resolve-trade-credential.ts for platform-managed model; updated all trade API routes; rewrote trade-panel.tsx for wallet+binding code UX; updated core types (removed per-user credential types, added binding types); updated SKILL.md and openai.yaml; updated all docs (ARCHITECTURE, RUNBOOK, HANDOFF, TRACKER, README). Build and lint green.

## Ready For Review

- none currently in review
