# Provider Adapter Guidance

Reference notes for wiring CZ Persona into website-side MiniMax scoring.

## Current Project Standard

For V1, MiniMax usage is aligned to the Anthropic-compatible contract.

Project runtime defaults:

- `MINIMAX_BASE_URL=https://api.minimaxi.com/anthropic`
- `MINIMAX_API_STYLE=anthropic`
- `MINIMAX_MODEL=MiniMax-M2.7`

The website calls MiniMax on the server. This skill only defines prompt, schema, and parsing expectations.

## CZ Prompt Requirements

The prompt should:

- state that the model is evaluating a BSC meme token through CZ's lens
- include `tokenBrief` facts: name, symbol, launchpad, narrative tags, and risk
- inject the mental models and heuristics from this skill
- demand a single final JSON object
- forbid prose after the JSON object

## Required Final JSON Shape

The final JSON must be parseable into:

```json
{
  "affinityScore": 0,
  "confidence": "low",
  "summary": "string",
  "evidence": ["string", "string", "string"]
}
```

Only these fields are required from the MiniMax final payload:

- `affinityScore`
- `confidence`
- `summary`
- `evidence`

## Anthropic-Compatible Response Handling

When MiniMax is called through the Anthropic-compatible interface:

- treat `content` as an ordered list of blocks
- use only the final non-empty `text` block as the source of JSON
- never parse `thinking` blocks into the formal `PersonaScore`
- if the response contains only `thinking`, treat it as incomplete
- if `stop_reason=max_tokens` occurs before a valid final `text` JSON block appears, treat the response as incomplete and fall back

This matters because the current failure mode is not invalid credentials. The real issue is that MiniMax may return a thinking-only response, which must not be counted as a successful structured result.

## Recommended Validation Steps

Before accepting a MiniMax response as a valid CZ result:

1. Confirm a final `text` block exists
2. Parse JSON from that `text` block only
3. Validate `affinityScore`, `confidence`, `summary`, and `evidence`
4. Reject the result if JSON is missing, partial, or truncated

## Scope Boundary

- Do not change website API shape here
- Do not expose provider secrets here
- Do not treat `thinking` content as the final score output

Shared runtime notes live in [../../docs/MINIMAX_RUNTIME_CONTRACT.md](../../docs/MINIMAX_RUNTIME_CONTRACT.md).
