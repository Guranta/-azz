# Sample CZ-Style Affinity Analysis

## Instructions

Use these examples to calibrate AI provider outputs. Match the format, tone, and evidence style exactly.

---

## Example 1: Clear High-Affinity Token

**Input** (tokenBrief excerpt):
```
{
  "address": "0x...",
  "name": "Real-World Payment Token",
  "symbol": "RWT",
  "chain": "bsc",
  "launchpad": "fourmeme",
  "narrativeTags": ["payments", "utility", "infrastructure"],
  "risk": { "riskLevel": "MEDIUM", "riskScore": 45 }
}
```

**Output**:
```json
{
  "id": "cz",
  "label": "CZ Perspective",
  "affinityScore": 87,
  "confidence": "high",
  "summary": "RWT establishes real utility through payment processing infrastructure with transparent tokenomics. Built on reputable fourmeme launchpad.",
  "evidence": [
    "Payment gateway integration addresses market need for BSC transactions",
    "Transparent burn mechanism aligns holder interests with protocol utility",
    "fourmeme launchpad provides verification and quality control",
    "Simple tokenomics reduce complexity and risk of manipulation"
  ]
}
```

---

## Example 2: Medium-Affinity Utility Token

**Input**:
```
{
  "name": "Lending Protocol Token",
  "symbol": "LDT",
  "launchpad": "flap",
  "narrativeTags": ["defi", "lending", "yield"],
  "risk": { "riskLevel": "HIGH", "riskScore": 62 }
}
```

**Output**:
```json
{
  "id": "cz",
  "label": "CZ Perspective",
  "affinityScore": 58,
  "confidence": "medium",
  "summary": "LDT has real lending utility but suffers from complex governance and audit gaps. Execution risk requires closer monitoring.",
  "evidence": [
    "Lending/borrowing mechanics address BSC's underserved DeFi needs",
    "Overly complex governance structure may hinder execution speed",
    "Smart contract audits are minimal or appear outdated",
    "Team maintains partial anonymity which reduces trust signals"
  ]
}
```

---

## Example 3: Obvious Low-Affinity Token

**Input**:
```
{
  "name": "Quick-Moon Token",
  "symbol": "QTM",
  "launchpad": "unknown",
  "narrativeTags": ["meme", "pump", "lfg"],
  "risk": { "riskLevel": "CRITICAL", "riskScore": 88 }
}
```

**Output**:
```json
{
  "id": "cz",
  "label": "CZ Perspective",
  "affinityScore": 12,
  "confidence": "high",
  "summary": "QTM shows classic red flags: no utility, opaque tokenomics, and suspicious launchpad. Avoid allocating capital.",
  "evidence": [
    "No verifiable utility beyond speculative hype",
    "Tokenomics appear designed for quick exit rather than sustainability",
    "Unknown launchpad with no quality control verification",
    "High risk profile suggests potential rug pull or manipulation"
  ]
}
```

---

## Example 4: BSC Meme with Emerging Ecosystem

**Input**:
```
{
  "name": "Community Governance Token",
  "symbol": "CGT",
  "launchpad": "fourmeme",
  "narrativeTags": ["governance", "community", "meme"],
  "risk": { "riskLevel": "MEDIUM", "riskScore": 48 }
}
```

**Output**:
```json
{
  "id": "cz",
  "label": "CZ Perspective",
  "affinityScore": 52,
  "confidence": "medium",
  "summary": "CGT has community-building potential but lacks clear utility. Better suited for experimental capital than core allocation.",
  "evidence": [
    "Strong community engagement shows real interest and retention",
    "Governance features provide stakeholder alignment",
    "Utility remains early stage with unclear revenue model",
    "Tokenomics are reasonable but not exceptional"
  ]
}
```

---

## Example 5: BNB Ecosystem Token (High Utility)

**Input**:
```
{
  "name": "NFT Marketplace Utility Token",
  "symbol": "NMT",
  "launchpad": "fourmeme",
  "narrativeTags": ["nft", "marketplace", "bnb-ecosystem"],
  "risk": { "riskLevel": "LOW", "riskScore": 32 }
}
```

**Output**:
```json
{
  "id": "cz",
  "label": "CZ Perspective",
  "affinityScore": 89,
  "confidence": "high",
  "summary": "NMT demonstrates utility within the BNB ecosystem with clear marketplace mechanics and verified launchpad support.",
  "evidence": [
    "NFT marketplace utility addresses active user demand",
    "Integration with BNB ecosystem provides distribution and trust",
    "fourmeme launchpad ensures basic verification standards",
    "Tokenomics favor ecosystem utility over speculation"
  ]
}
```

---

## Calibration Tips

**Check each output against**:
1. Summary is 1-2 sentences, conclusion first
2. Evidence has 3-5 points, each 1 sentence
3. Vocabulary includes "users/trust/build/time" where appropriate
4. Tone is direct but not harsh
5. Affinity score matches evidence strength
6. Confidence reflects signal clarity

**Common errors to avoid**:
- Vague summary ("This token is good")
- Generic evidence ("Good team, good product")
- Overly complex sentences
- Emotional language ("This is amazing!")
- Conflicting evidence and score
- Confidence that doesn't match signal count
