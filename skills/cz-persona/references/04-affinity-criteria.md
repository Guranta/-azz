# Token Affinity Criteria

Rules for assigning affinity scores (0-100) to BSC meme tokens

## High Affinity Range (80-100)

### Requirements

**All of the following apply**:

1. **Real Utility** (confirmed by tokenBrief)
   - Exchange integration
   - Payment gateway
   - Infrastructure component
   - Or clearly defined ecosystem use case

2. **Clear Tokenomics** (no complexity issues)
   - Simple distribution
   - Transparent burn mechanism
   - Defined utility incentives
   - No unfair creator advantages

3. **Transparent Team**
   - Verified team members with public track record
   - Active development on GitHub or social media
   - Professional communication style

4. **Minimal Red Flags**
   - No known hacks or exploits
   - No rug pulls or exit scams
   - Reasonable liquidity
   - Legitimate launchpad (fourmeme)

5. **CZ Alignment**
   - User protection focused
   - Simple, sustainable model
   - Long-term perspective

### Characteristic Evidence

```
evidence: [
  "Established utility reduces speculative volatility",
  "Clear burn mechanism aligns long-term holder interests",
  "Transparent team with public track record",
  "Non-custodial execution reduces user risk"
]
```

---

## Medium Affinity Range (50-79)

### Requirements

**Some but not all of the following apply**:

1. **Utility Exists but Uncertain**
   - Defined use case
   - Early stage development
   - Revenue generation unclear

2. **Tokenomics are Reasonable**
   - No obvious exploitation
   - Some burn or incentive structure
   - May need refinement

3. **Team is Knowable**
   - Some public information
   - Moderate activity
   - Or partially anonymous

4. **Modest Risk Factors**
   - Limited red flags
   - Minor complexity issues
   - Moderate liquidity

5. **Not Clearly Bad**
   - Not obviously a scam
   - Has potential
   - Requires more analysis

### Characteristic Evidence

```
evidence: [
  "Developing payment gateway addresses market need",
  "Strong community engagement and ecosystem expansion",
  "Limited revenue generation to date",
  "Tokenomics still evolving with new features"
]
```

---

## Low Affinity Range (0-49)

### Requirements

**Any of the following apply**:

1. **No Utility**
   - Pure speculation
   - No defined use case
   - Just "meme" without substance

2. **Opaque or Manipulative Tokenomics**
   - Complex financial engineering
   - Hidden fees
   - Unfair creator advantages
   - Exit scams

3. **Unknown or Anonymous Team**
   - No public information
   - No development activity
   - Unprofessional communication

4. **Significant Red Flags**
   - Known exploits or hacks
   - Rug pulls or exit scams
   - Insufficient liquidity
   - Suspicious launchpad

5. **Fails CZ Principles**
   - Focused on hype over utility
   - Designed for quick exit
   - Competitive with user interests

### Characteristic Evidence

```
evidence: [
  "Owner retains massive unstakeable liquidity",
  "Tokenomics appear designed for quick exit",
  "No verifiable team or development activity",
  "Launchpad history shows suspicious quick appreciation and dump"
]
```

---

## Launchpad-Specific Guidelines

### fourmeme
- **Quality**: Verified launchpad with vetting
- **Affinity Impact**: Positive signal
- **Risk**: Lower than unknown launchpads
- **Expected Pattern**: More sustainable projects

### flap
- **Quality**: Growing but less vetted
- **Affinity Impact**: Moderate signal
- **Risk**: Medium
- **Expected Pattern**: Mix of quality and speculation

### Unknown
- **Quality**: Unverified, no track record
- **Affinity Impact**: Negative signal
- **Risk**: High
- **Expected Pattern**: Most likely to be high-risk

---

## Confidence Calibration

**High Confidence** (3+ clear signals in one direction)

```
High affinity + 3+ positives + 0 negatives -> 80-100
Low affinity + 3+ negatives + 0 positives -> 0-30
```

**Medium Confidence** (2 signals in one direction, 1+ neutral)

```
2 positives + 1 neutral -> 50-70
2 negatives + 1 neutral -> 20-40
```

**Low Confidence** (1 signal or conflicting signals)

```
1 positive + 1 neutral + 1 unknown -> 30-50
1 negative + 1 neutral + 1 unknown -> 0-30
Conflicting signals -> 30-50
```

---

## Application Process

1. **Read tokenBrief** and extract facts
2. **Check utility** (highest weight)
3. **Check tokenomics** (high weight)
4. **Check team** (medium weight)
5. **Check launchpad** (medium weight)
6. **Count signals** (positive vs negative)
7. **Assign score** based on range
8. **Set confidence** based on signal clarity
9. **Generate evidence** (3-5 token-specific points)
10. **Write summary** using Expression DNA
