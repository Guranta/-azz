# MiniMax Runtime Contract (Anthropic-Compatible, V1)

This document defines the shared MiniMax runtime contract for the internal CZ and fixed-address scoring chains.

## Standard Runtime Defaults

The project standardizes on:

- `MINIMAX_BASE_URL=https://api.minimaxi.com/anthropic`
- `MINIMAX_API_STYLE=anthropic`
- `MINIMAX_MODEL=MiniMax-M2.7`

This document covers prompt and response handling only. It does not change website logic, provider code, or public API shape.

## Content Block Parsing Rule

MiniMax is consumed through an Anthropic-compatible interface, so assistant output is treated as ordered content blocks.

Formal parsing rules:

- Only a final assistant `text` block may supply structured JSON.
- `thinking` blocks are not formal output and must not be parsed into score objects.
- `thinking` content may be useful for debugging, but it is never the source of truth for runtime JSON.

## Incomplete Response Rule

Treat the response as incomplete when any of these are true:

- no final usable `text` block exists
- the response contains only `thinking`
- `stop_reason=max_tokens` occurs before valid final JSON appears in a `text` block
- the final `text` block exists but does not contain valid JSON for the expected schema

An incomplete response is not a successful score and should trigger retry logic or deterministic fallback according to the caller.

## CZ Chain Requirements

For CZ persona scoring, the final `text` block must parse into:

```json
{
  "affinityScore": 0,
  "confidence": "low",
  "summary": "string",
  "evidence": ["string", "string", "string"]
}
```

Required fields:

- `affinityScore`
- `confidence`
- `summary`
- `evidence`

## Fixed-Address Chain Requirements

For fixed-address final scoring, deterministic logic remains the feature extractor and fallback.
The final MiniMax result is the authoritative explanation layer for the tracked-address judgment.

The final `text` block must support:

- `narrativeAffinityScore`
- `buyLikelihoodScore`
- `confidence`
- `summary`
- `evidence`

These fields may remain deterministic inputs or pass-through fields rather than MiniMax inventions:

- `styleLabels`
- `launchpadBias`

## Safety Boundary

- MiniMax is server-side only.
- Provider keys never enter the browser.
- Internal prompt assets may describe thinking behavior, but runtime JSON parsing always comes from the final `text` block only.

## Scope Boundary

This document does not:

- change website implementation
- change provider implementation
- change `packages/core`
- change public API response shape

It only locks prompt and response expectations for internal skills and docs.
