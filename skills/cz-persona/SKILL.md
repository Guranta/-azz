---
name: cz-persona
description: |
  Internal persona asset for generating CZ-style affinity judgments about BSC meme tokens.
  Use this skill as source material for the website scoring pipeline (POST /api/score-token),
  not as the final public OpenClaw entrypoint.
  It defines the CZ lens, tone, output schema, and MiniMax parsing rules that website-side scoring must follow.
---

# CZ Persona

This skill is an internal project asset.

## Purpose

- Capture the CZ-style lens used for token affinity scoring
- Keep persona rules separate from wallet-behavior scoring
- Feed the website's `CZ affinity` scoring step

## Not The Final User Skill

Do not expose this as the only OpenClaw skill for end users.
The final public skill should be `meme-affinity-query`, which calls the website API and returns both persona and address results together.

## What This Skill Provides

1. **5 Mental Models**: User protection, speed, simplicity, time > money, institutions > individuals
2. **8 Decision Heuristics**: Rules for rapid, consistent judgments
3. **Expression DNA**: Linguistic patterns for CZ-style output
4. **Affinity Criteria**: Ranges for assigning 0-100 scores
5. **Evaluation Process**: Step-by-step analysis framework
6. **MiniMax Runtime Rules**: Anthropic-compatible request and response parsing contract

## Website-Side MiniMax Contract

The website-side CZ scorer is standardized on MiniMax's Anthropic-compatible interface.

Project runtime defaults:

- `MINIMAX_BASE_URL=https://api.minimaxi.com/anthropic`
- `MINIMAX_API_STYLE=anthropic`
- `MINIMAX_MODEL=MiniMax-M2.7`

Parsing rules:

- Website-side CZ scoring must treat the Anthropic-compatible response as a list of content blocks.
- Only the final assistant `text` block is allowed to supply the structured JSON payload.
- `thinking` blocks are not valid structured output and must not be parsed as the final result.
- A response that contains only `thinking` and no usable final `text` JSON is incomplete.
- If the provider stops with `stop_reason=max_tokens` before a valid final `text` JSON block arrives, treat the response as incomplete and fall back rather than marking it successful.

See [../../docs/MINIMAX_RUNTIME_CONTRACT.md](../../docs/MINIMAX_RUNTIME_CONTRACT.md).

## Integration with Website

This skill is consumed by the website's scoring pipeline:

1. Website receives `tokenBrief` from the AVE data adapter
2. Website-side MiniMax uses this skill to generate `PersonaScore`
3. The final parsed JSON must match:

```typescript
{
  id: "cz",
  label: "CZ Perspective",
  affinityScore: 0-100,
  confidence: "low" | "medium" | "high",
  summary: "1-2 sentence judgment",
  evidence: ["observation 1", "observation 2", "observation 3"]
}
```

Required CZ output fields stay fixed:

- `affinityScore`
- `confidence`
- `summary`
- `evidence`

## Key Documents

- **MODELS.md**: Core mental models, heuristics, expression DNA
- **EXAMPLES.md**: Token affinity criteria and output examples
- **README.md**: Internal skill summary and score shape
- **ADAPTERS.md**: Anthropic-compatible MiniMax guidance for website-side scoring

## Evaluation Process

1. Read `tokenBrief` from website input
2. Apply 5 mental models as filters
3. Check 8 decision heuristics for red flags
4. Match against affinity criteria (high / medium / low)
5. Generate 3-5 token-specific evidence points
6. Assign confidence based on signal clarity
7. Write summary using Expression DNA (short first, conclusion second)
8. Return `PersonaScore` JSON from the final assistant `text` block only
