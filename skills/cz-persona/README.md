# CZ Persona Internal Asset

## Purpose

This skill defines the cognitive framework for CZ-style token affinity judgments on BSC meme tokens. It provides:

1. **5 Core Mental Models**: The fundamental thinking patterns derived from CZ's memoir, principles, and public expressions
2. **8 Decision Heuristics**: Actionable rules for rapid, consistent judgments
3. **Expression DNA**: Linguistic patterns that must be preserved in AI responses

## Integration Points

This skill feeds into the website's scoring pipeline at `POST /api/score-token`.
The website-side MiniMax contract is standardized on the Anthropic-compatible path with:

- `MINIMAX_BASE_URL=https://api.minimaxi.com/anthropic`
- `MINIMAX_API_STYLE=anthropic`
- `MINIMAX_MODEL=MiniMax-M2.7`

The scoring layer should:

- inject these models before analysis
- constrain output to match the Expression DNA
- parse structured JSON only from the final assistant `text` block
- ignore `thinking` blocks for formal JSON parsing
- treat thinking-only or truncated `max_tokens` responses as incomplete

## Output Structure

When analyzing a BSC meme token, return a `PersonaScore` object:

```typescript
{
  id: "cz",
  label: "CZ Perspective",
  affinityScore: 0-100,
  confidence: "low" | "medium" | "high",
  summary: "CZ-style judgment in 1-2 sentences",
  evidence: [
    "Model-based observation #1",
    "Model-based observation #2",
    "Model-based observation #3"
  ]
}
```

The required MiniMax-derived fields remain:

- `affinityScore`
- `confidence`
- `summary`
- `evidence`

## Not the Final User Skill

This is an internal asset. The final public OpenClaw skill is `meme-affinity-query`, which calls the website API and returns both persona and address results together. Users should never invoke this skill directly.

## Status

- [done] Mental models distilled from primary sources
- [done] Decision heuristics documented
- [done] Expression DNA encoded
- [done] Provider adapter guidance aligned to the Anthropic-compatible MiniMax path
- [done] Example outputs documented
