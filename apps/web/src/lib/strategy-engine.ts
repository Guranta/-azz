import type {
  StrategyId,
  StrategySnapshot,
  StrategyHolding,
  StrategyTradeRecord,
  StrategyDraft,
  ScoreTokenResponse,
} from "@meme-affinity/core";
import { scoreTokenRequest } from "@/lib/score-token";
import { saveSnapshot, saveEquityPoint, loadSnapshots } from "@/lib/strategy-db";
import {
  loadCandidatePool,
} from "@/lib/strategy-candidate-pool";

// ---------------------------------------------------------------------------
// Strategy configuration — fixed rules per approved V6 spec
// ---------------------------------------------------------------------------

interface StrategyConfig {
  id: StrategyId;
  name: string;
  buyUsd: number;
  maxHoldings: number;
  buyCondition: (ctx: EvalContext) => boolean;
  sellCondition: (h: StrategyHolding, ctx: EvalContext) => boolean;
}

interface EvalContext {
  czScore: number;
  /** Best single fixed-address score (for gambler's "任一固定地址 >= 78") */
  bestFixedAddrScore: number;
  /** Average of the 3 fixed-address scores */
  fixedAddrAvgScore: number;
  smartMoneyMatchedCount: number;
  riskLevel: string;
  recommendation: string;
}

const STRATEGIES: StrategyConfig[] = [
  // A. 赌狗
  {
    id: "gambler",
    name: "赌狗",
    buyUsd: 20,
    maxHoldings: 5,
    buyCondition(ctx) {
      if (ctx.riskLevel === "CRITICAL") return false;
      return (
        ctx.czScore >= 70 ||
        ctx.bestFixedAddrScore >= 78 ||
        ctx.smartMoneyMatchedCount >= 2
      );
    },
    sellCondition(h, ctx) {
      const ageMin = (Date.now() - new Date(h.entryAt).getTime()) / 60_000;
      if (ageMin >= 60) return true;
      if (h.pnlPct >= 20) return true;
      if (h.pnlPct <= -10) return true;
      if (ctx.recommendation === "DO_NOT_BUY") return true;
      return false;
    },
  },

  // B. P子
  {
    id: "p-zi",
    name: "P子",
    buyUsd: 25,
    maxHoldings: 4,
    buyCondition(ctx) {
      if (ctx.riskLevel === "CRITICAL") return false;
      return (
        ctx.czScore >= 78 &&
        ctx.fixedAddrAvgScore >= 70 &&
        ctx.smartMoneyMatchedCount >= 1
      );
    },
    sellCondition(h, ctx) {
      const ageMin = (Date.now() - new Date(h.entryAt).getTime()) / 60_000;
      if (ageMin >= 360) return true;
      if (ctx.czScore < 70) return true;
      if (ctx.fixedAddrAvgScore < 65) return true;
      if (h.pnlPct >= 35) return true;
      if (h.pnlPct <= -12) return true;
      return false;
    },
  },

  // C. 钻石手
  {
    id: "diamond",
    name: "钻石手",
    buyUsd: 30,
    maxHoldings: 3,
    buyCondition(ctx) {
      if (ctx.riskLevel !== "LOW" && ctx.riskLevel !== "MEDIUM") return false;
      return (
        ctx.czScore >= 85 &&
        ctx.fixedAddrAvgScore >= 78 &&
        ctx.smartMoneyMatchedCount >= 2
      );
    },
    sellCondition(h, ctx) {
      const ageMin = (Date.now() - new Date(h.entryAt).getTime()) / 60_000;
      if (ageMin >= 1440) return true;
      if (!["BUY", "STRONG_BUY"].includes(ctx.recommendation)) return true;
      if (h.pnlPct >= 60) return true;
      if (h.pnlPct <= -18) return true;
      return false;
    },
  },
];

// ---------------------------------------------------------------------------
// Candidate pool builder — current V6 transition sources
// ---------------------------------------------------------------------------

export type CandidatePoolSource = "holdings+scored_pool";

interface CandidatePoolResult {
  addresses: string[];
  source: CandidatePoolSource;
  holdingsCount: number;
  scoredPoolCount: number;
  autoDiscoveryAvailable: false;
}

async function buildCandidatePool(): Promise<CandidatePoolResult> {
  const candidateSet = new Set<string>();

  // 1. Existing strategy holdings — always score to re-value
  const existing = loadSnapshots();
  for (const snap of existing) {
    for (const h of snap.holdings) {
      candidateSet.add(h.tokenAddress.toLowerCase());
    }
  }
  const holdingsCount = candidateSet.size;

  // 2. Runtime scored-pool — tokens previously scored successfully
  //    via the website /api/score-token flow
  const scoredPool = loadCandidatePool();
  for (const addr of scoredPool) {
    candidateSet.add(addr.toLowerCase());
  }

  return {
    addresses: Array.from(candidateSet).slice(0, 20),
    source: "holdings+scored_pool",
    holdingsCount,
    scoredPoolCount: scoredPool.length,
    autoDiscoveryAvailable: false,
  };
}

// ---------------------------------------------------------------------------
// Token scoring helper — reuses existing lib layer
// ---------------------------------------------------------------------------

async function scoreToken(tokenAddress: string): Promise<ScoreTokenResponse | null> {
  try {
    return await scoreTokenRequest({ tokenAddress, chain: "bsc" });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Eval context builder
// ---------------------------------------------------------------------------

function buildEvalContext(scored: ScoreTokenResponse): EvalContext {
  const czScore = scored.personaScores.find((p) => p.id === "cz")?.affinityScore ?? 0;

  const fixedIds = new Set(["wangxiaoer", "lengjing", "afeng"]);
  const fixedScores = scored.addressScores.filter((s) => fixedIds.has(s.id));
  const bestFixedAddrScore =
    fixedScores.length > 0
      ? Math.max(...fixedScores.map((s) => s.buyLikelihoodScore))
      : 0;
  const fixedAddrAvgScore =
    fixedScores.length > 0
      ? fixedScores.reduce((sum, s) => sum + s.buyLikelihoodScore, 0) / fixedScores.length
      : 0;

  return {
    czScore,
    bestFixedAddrScore,
    fixedAddrAvgScore,
    smartMoneyMatchedCount: scored.smartMoney.matchedCount,
    riskLevel: scored.token.risk.riskLevel,
    recommendation: scored.recommendation.value,
  };
}

// ---------------------------------------------------------------------------
// Holding valuation — uses marketCapUsd as proxy price
// ---------------------------------------------------------------------------

function revalueHolding(holding: StrategyHolding, currentMarketCap: number | null): StrategyHolding {
  if (currentMarketCap === null || currentMarketCap <= 0) {
    return holding;
  }
  const currentProxyPrice = currentMarketCap;
  const currentValueUsd = holding.quantity * currentProxyPrice;
  const pnlPct =
    holding.entryProxyPrice > 0
      ? ((currentProxyPrice - holding.entryProxyPrice) / holding.entryProxyPrice) * 100
      : 0;

  return {
    ...holding,
    currentProxyPrice,
    currentValueUsd,
    pnlPct,
  };
}

// ---------------------------------------------------------------------------
// Run one tick for a single strategy
// ---------------------------------------------------------------------------

function runTick(input: {
  config: StrategyConfig;
  previousSnapshot: StrategySnapshot | null;
  scoredTokens: Map<string, ScoreTokenResponse>;
}): StrategySnapshot {
  const { config, previousSnapshot, scoredTokens } = input;
  const now = new Date().toISOString();

  let cashUsd = previousSnapshot?.cashUsd ?? 100;
  const holdings: StrategyHolding[] = previousSnapshot
    ? previousSnapshot.holdings.map((h) => ({ ...h }))
    : [];
  const recentTrades: StrategyTradeRecord[] = previousSnapshot
    ? [...previousSnapshot.recentTrades]
    : [];

  // Track the last real action for latestDraft
  let lastActionDraft: StrategyDraft | null = null;

  // 1. Re-value existing holdings
  const revalued = holdings.map((h) => {
    const scored = scoredTokens.get(h.tokenAddress.toLowerCase());
    return scored ? revalueHolding(h, scored.token.marketCapUsd) : h;
  });

  // 2. Check sell conditions
  const kept: StrategyHolding[] = [];
  for (const h of revalued) {
    const scored = scoredTokens.get(h.tokenAddress.toLowerCase());
    const ctx: EvalContext = scored
      ? buildEvalContext(scored)
      : { czScore: 0, bestFixedAddrScore: 0, fixedAddrAvgScore: 0, smartMoneyMatchedCount: 0, riskLevel: "unknown", recommendation: "DO_NOT_BUY" };

    if (config.sellCondition(h, ctx)) {
      cashUsd += h.currentValueUsd;
      recentTrades.push({
        action: "sell",
        tokenAddress: h.tokenAddress,
        tokenName: h.tokenName,
        tokenSymbol: h.tokenSymbol,
        amountUsd: h.currentValueUsd,
        quantity: h.quantity,
        proxyPrice: h.currentProxyPrice,
        reason: `模拟卖出（${config.name}）`,
        executedAt: now,
      });
      lastActionDraft = {
        strategyId: config.id,
        action: "sell",
        tokenAddress: h.tokenAddress,
        baseToken: "usdt",
        amount: h.currentValueUsd,
        reason: `模拟卖出（${config.name}）`,
        generatedAt: now,
      };
    } else {
      kept.push(h);
    }
  }

  // 3. Check buy condition — one buy per tick
  const holdingAddrs = new Set(kept.map((h) => h.tokenAddress.toLowerCase()));

  if (kept.length < config.maxHoldings && cashUsd >= config.buyUsd) {
    for (const [addr, scored] of scoredTokens) {
      if (holdingAddrs.has(addr.toLowerCase())) continue;

      const ctx = buildEvalContext(scored);
      if (!config.buyCondition(ctx)) continue;

      const marketCap = scored.token.marketCapUsd;
      if (!marketCap || marketCap <= 0) {
        // Skip: no valuation data — mark in draft but don't execute
        lastActionDraft = lastActionDraft ?? {
          strategyId: config.id,
          action: "hold",
          tokenAddress: addr,
          baseToken: "usdt",
          amount: config.buyUsd,
          reason: "估值数据缺失",
          generatedAt: now,
        };
        continue;
      }

      // Execute buy
      const entryProxyPrice = marketCap;
      const quantity = config.buyUsd / entryProxyPrice;
      cashUsd -= config.buyUsd;

      kept.push({
        tokenAddress: addr,
        tokenName: scored.token.name,
        tokenSymbol: scored.token.symbol,
        quantity,
        entryProxyPrice,
        currentProxyPrice: marketCap,
        entryAt: now,
        currentValueUsd: config.buyUsd,
        pnlPct: 0,
      });

      recentTrades.push({
        action: "buy",
        tokenAddress: addr,
        tokenName: scored.token.name,
        tokenSymbol: scored.token.symbol,
        amountUsd: config.buyUsd,
        quantity,
        proxyPrice: entryProxyPrice,
        reason: `模拟买入（${config.name}，CZ=${ctx.czScore}，均值=${ctx.fixedAddrAvgScore.toFixed(1)}，聪明钱=${ctx.smartMoneyMatchedCount}）`,
        executedAt: now,
      });

      lastActionDraft = {
        strategyId: config.id,
        action: "buy",
        tokenAddress: addr,
        baseToken: "usdt",
        amount: config.buyUsd,
        reason: `CZ=${ctx.czScore} 均值=${ctx.fixedAddrAvgScore.toFixed(1)} 聪明钱=${ctx.smartMoneyMatchedCount}`,
        generatedAt: now,
      };

      break; // One buy per tick
    }
  }

  // 4. Determine latestDraft
  //    Priority: last real action (sell > buy) from this tick, then fallback reasons
  let latestDraft: StrategyDraft;
  if (lastActionDraft) {
    latestDraft = lastActionDraft;
  } else if (kept.length >= config.maxHoldings) {
    latestDraft = {
      strategyId: config.id,
      action: "hold",
      tokenAddress: null,
      baseToken: "usdt",
      amount: 0,
      reason: `持仓已满（${kept.length}/${config.maxHoldings}）`,
      generatedAt: now,
    };
  } else if (cashUsd < config.buyUsd) {
    latestDraft = {
      strategyId: config.id,
      action: "hold",
      tokenAddress: null,
      baseToken: "usdt",
      amount: 0,
      reason: `现金不足（$${cashUsd.toFixed(2)} < $${config.buyUsd}）`,
      generatedAt: now,
    };
  } else {
    latestDraft = {
      strategyId: config.id,
      action: "hold",
      tokenAddress: null,
      baseToken: "usdt",
      amount: 0,
      reason: "无符合条件的买入标的",
      generatedAt: now,
    };
  }

  // Calculate equity
  const holdingsValue = kept.reduce((sum, h) => sum + h.currentValueUsd, 0);
  const equityUsd = cashUsd + holdingsValue;
  const totalPnlPct = ((equityUsd - 100) / 100) * 100;

  return {
    strategyId: config.id,
    strategyName: config.name,
    cashUsd,
    holdings: kept,
    recentTrades: recentTrades.slice(-20),
    latestDraft,
    equityUsd,
    totalPnlPct,
    updatedAt: now,
    status: "ok",
  };
}

// ---------------------------------------------------------------------------
// Public: refresh all strategies
// ---------------------------------------------------------------------------

export async function refreshAllStrategies(): Promise<void> {
  try {
    const poolResult = await buildCandidatePool();
    _lastPoolResult = poolResult;

    const scoredMap = new Map<string, ScoreTokenResponse>();
    await Promise.all(
      poolResult.addresses.map(async (addr) => {
        const scored = await scoreToken(addr);
        if (scored) scoredMap.set(addr.toLowerCase(), scored);
      })
    );

    const prevSnapshots = loadSnapshots();
    const prevMap = new Map(prevSnapshots.map((s) => [s.strategyId, s]));
    const now = new Date().toISOString();

    for (const config of STRATEGIES) {
      const snap = runTick({
        config,
        previousSnapshot: prevMap.get(config.id) ?? null,
        scoredTokens: scoredMap,
      });

      saveSnapshot(snap);
      saveEquityPoint({
        strategyId: config.id,
        pointAt: now,
        equityUsd: snap.equityUsd,
      });
    }
  } catch (err) {
    console.error("[strategy-engine] refresh failed:", err);
    const existing = loadSnapshots();
    for (const snap of existing) {
      saveSnapshot({ ...snap, status: "stale" });
    }
    throw err;
  }
}

// Re-export candidate pool function for score-token route
export { addToCandidatePool } from "@/lib/strategy-candidate-pool";

// ---------------------------------------------------------------------------
// Last refresh pool info — exposed for API / page consumption
// ---------------------------------------------------------------------------

let _lastPoolResult: CandidatePoolResult | null = null;

export function getCandidatePoolInfo() {
  return _lastPoolResult;
}
