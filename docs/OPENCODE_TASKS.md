# OpenCode Task Briefs

These are the current V1 worker packets for OpenCode.

Core rules:

- Do not change the root architecture.
- Do not move files between `apps/`, `packages/`, `config/`, and `skills/`.
- Do not revert work done by others.
- Keep write scopes disjoint.
- Do not mark tasks as `done` in shared docs. Only the main coordinator accepts work.

## Task O4: Public OpenClaw Skill Finalization

Recommended write scope:

- `skills/meme-affinity-query/**`

Do not edit:

- `apps/**`
- `packages/core/**`
- `config/**`
- `skills/address-trading-style/**`
- `skills/smartmoney-daily/**`
- `skills/cz-persona/**`

Goal:

- Finalize the public OpenClaw skill wording and output template against the current live website contract.
- Do not add logic. Do not move any scoring into the skill.

Required deliverables:

- Output template must explicitly include:
  - `Token: <name> (<symbol>)`
  - `Narratives: <tag1>, <tag2>, <tag3>`
  - `👍 CZ: <emoji> <不爱/爱/爱爱>`
  - `聪明钱: <emoji> <不爱/爱/爱爱> (hits: <n>)`
  - `😎 王小二: <emoji> <不爱/爱/爱爱>`
  - `🧊 冷静: <emoji> <不爱/爱/爱爱>`
  - `👿 阿峰: <emoji> <不爱/爱/爱爱>`
  - `🐳: <有/无 + rank if any>`
  - `Result: <url>`
- Ensure all visible text is valid UTF-8.
- Keep the website as the only source of truth.

Constraints:

- Do not add AVE logic.
- Do not add MiniMax logic.
- Do not change the public API contract.
- Keep output compact and demo-friendly.

Ready-to-send instruction:

```text
You are working inside a monorepo for the Ai Zhao Zhao V1 meme-affinity product.

Read first:
- docs/PROJECT_HANDOFF.md
- docs/TASK_TRACKER.md

Your ownership is limited to:
- skills/meme-affinity-query/**

Do not edit:
- apps/**
- packages/core/**
- config/**
- skills/address-trading-style/**
- skills/smartmoney-daily/**
- skills/cz-persona/**

Task:
- Finalize the public OpenClaw skill wording and output template against the current live website contract.
- Do not add logic.
- Do not move scoring into the skill.

Required output template:
- Token: <name> (<symbol>)
- Narratives: <tag1>, <tag2>, <tag3>
- 👍 CZ: <emoji> <不爱/爱/爱爱>
- 聪明钱: <emoji> <不爱/爱/爱爱> (hits: <n>)
- 😎 王小二: <emoji> <不爱/爱/爱爱>
- 🧊 冷静: <emoji> <不爱/爱/爱爱>
- 👿 阿峰: <emoji> <不爱/爱/爱爱>
- 🐳: <有/无 + rank if any>
- Result: <url>

Constraints:
- Do not add AVE logic
- Do not add MiniMax logic
- Keep the website as source of truth
- Keep everything valid UTF-8
- Keep the tone compact and demo-ready

At the end, reply with exactly:
Task completed:
- O4

Files changed:
- ...

Summary:
- ...

Risks / follow-ups:
- ...
```

## Archived O1: Fixed-Address Internal Skill Upgrade

Recommended write scope:

- `skills/address-trading-style/**`
- `docs/**` only for a tiny supporting note if absolutely needed

Do not edit:

- `apps/**`
- `packages/core/**`
- `config/**`
- `skills/meme-affinity-query/**`
- `skills/cz-persona/**`

Goal:

- Turn the fixed tracked-address capability into a stronger internal skill/capability pack.
- This is for fixed tracked addresses only. Do not add arbitrary address input.
- Use the latest AVE public data docs as the source of truth for wallet-side inputs.

Required deliverables:

- A clear input contract that includes:
  - recent address history from `GET /v2/address/tx`
  - current token narrative bundle
  - top100 hit state
  - smartmoney hit result based on the website-side intersection between `top100 holders` and `smart_wallet/list`
- A clear output contract that includes:
  - address name
  - `logoKey`
  - `logoMode`
  - profile summary
  - the final prompt or input shape that the website-side MiniMax layer will consume
- Written guidance for:
  - why fixed-address scoring must combine wallet history with token narrative
  - how top100 whale hits should be used

Constraints:

- Keep this as an internal skill/capability layer.
- Do not touch public website or API code.
- Do not invent a second public skill.
- Assume V1 tracked-address count stays in the `3-5` range.

Ready-to-send instruction:

```text
You are working inside a monorepo for the Ai Zhao Zhao V1 meme-affinity product.

Read first:
- docs/PROJECT_HANDOFF.md
- docs/TASK_TRACKER.md

Your ownership is limited to:
- skills/address-trading-style/**
- optionally docs/** for a very small supporting note

Do not edit:
- apps/**
- packages/core/**
- config/**
- skills/meme-affinity-query/**
- skills/cz-persona/**

Task:
- Upgrade the fixed-address internal skill/capability pack.
- This skill only serves the fixed tracked addresses used by the website.
- Do not add arbitrary address input.
- Treat the latest AVE public docs as source of truth for upstream data.

Required outputs:
- Define the input contract for:
  - recent address history from `GET /v2/address/tx`
  - token narrative bundle
  - top100 holder hit state
  - smartmoney hit result derived from the website-side smart-wallet intersection
- Define the output contract for:
  - address name
  - logoKey
  - logoMode
  - profile summary
  - the final shape that website-side MiniMax scoring should consume
- Document:
  - why fixed-address scoring must combine wallet history with token narrative
  - how top100 whale hits should influence interpretation
  - how smartmoney should influence interpretation without changing the public API directly

Constraints:
- Do not touch apps/**
- Do not touch packages/core/**
- Do not touch config/**
- Do not change public API shapes
- Keep this internal-only

At the end, reply with exactly:
Task completed:
- O1

Files changed:
- ...

Summary:
- ...

Risks / follow-ups:
- ...
```

## Archived O2: Public OpenClaw Skill Output Upgrade

Recommended write scope:

- `skills/meme-affinity-query/**`

Do not edit:

- `apps/**`
- `packages/core/**`
- `config/**`
- `skills/address-trading-style/**`
- `skills/cz-persona/**`

Goal:

- Upgrade the public OpenClaw skill output so it includes token name and token narrative in addition to the score summary.
- This task only starts after `C1` is reviewed and accepted.

Required deliverables:

- The public skill output template must explicitly include:
  - token name
  - token narrative (`narrativeTags` first 2-3 items)
  - persona score
  - smartmoney score
  - fixed-address score
  - whale state
  - result-page link
- Keep the style:
  - emoji-badge oriented
  - short sentences
  - demo-friendly

Constraints:

- Do not put AVE logic in the skill.
- Do not put MiniMax logic in the skill.
- The website remains the only source of truth.
- Wait until `C1` is accepted before finalizing wording.

Ready-to-send instruction:

```text
You are working inside a monorepo for the Ai Zhao Zhao V1 meme-affinity product.

Read first:
- docs/PROJECT_HANDOFF.md
- docs/TASK_TRACKER.md

Your ownership is limited to:
- skills/meme-affinity-query/**

Do not edit:
- apps/**
- packages/core/**
- config/**
- skills/address-trading-style/**
- skills/cz-persona/**

Task:
- Upgrade the public OpenClaw skill output.
- The skill must include:
  - token name
  - token narrative (first 2-3 narrative tags)
  - persona score
  - smartmoney score
  - fixed-address score
  - whale state
  - result-page link

Constraints:
- Do not add AVE logic
- Do not add MiniMax logic
- Keep the website as source of truth
- Keep the tone emoji-badge friendly, short, and demo-ready

At the end, reply with exactly:
Task completed:
- O2

Files changed:
- ...

Summary:
- ...

Risks / follow-ups:
- ...
```
