"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  GetWalletResponse,
  ApproveResponse,
  SwapResponse,
  GetOrdersResponse,
} from "@meme-affinity/core";

type TradePanelProps = {
  tokenAddress: string;
  tokenName?: string;
  tokenSymbol?: string;
};

type OnboardingState = "no_wallet" | "wallet_empty" | "wallet_funded";

function formatAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function toWei(amount: string, decimals: number): string {
  if (!amount || isNaN(Number(amount))) return "0";
  const [intPart, fracPart = ""] = amount.split(".");
  const cleanInt = intPart.replace(/^0+/, "") || "0";
  const paddedFrac = (fracPart + "0".repeat(decimals)).slice(0, decimals);
  return cleanInt === "0" && !paddedFrac.replace(/0+$/, "")
    ? "0"
    : cleanInt + paddedFrac;
}

export function TradePanel({ tokenAddress, tokenName, tokenSymbol }: TradePanelProps) {
  const [assetsId, setAssetsId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<GetWalletResponse | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState>("no_wallet");
  const [loading, setLoading] = useState(false);

  // Form state
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [baseToken, setBaseToken] = useState<"bnb" | "usdt">("bnb");
  const [slippageBps, setSlippageBps] = useState(500);

  // Results
  const [approveResult, setApproveResult] = useState<ApproveResponse | null>(null);
  const [swapResult, setSwapResult] = useState<SwapResponse | null>(null);
  const [orderStatus, setOrderStatus] = useState<GetOrdersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load assetsId from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ave_assets_id");
      if (stored) {
        setAssetsId(stored);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Fetch wallet info when assetsId changes
  const refreshWallet = useCallback(async () => {
    if (!assetsId) {
      setOnboarding("no_wallet");
      setWallet(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/trade/wallet?assetsId=${encodeURIComponent(assetsId)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setOnboarding("no_wallet");
          setAssetsId(null);
          try { localStorage.removeItem("ave_assets_id"); } catch {}
        }
        setWallet(null);
        return;
      }
      const data: GetWalletResponse = await res.json();
      setWallet(data);
      setOnboarding(data.balanceState === "funded" ? "wallet_funded" : "wallet_empty");
    } catch {
      setOnboarding("no_wallet");
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, [assetsId]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  async function handleGenerateWallet() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trade/wallet/generate", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Wallet creation failed");
        return;
      }
      const data = await res.json();
      const newAssetsId = data.assetsId as string;
      setAssetsId(newAssetsId);
      try { localStorage.setItem("ave_assets_id", newAssetsId); } catch {}
    } catch {
      setError("Network error during wallet creation");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!assetsId) return;
    setLoading(true);
    setError(null);
    setApproveResult(null);
    try {
      const res = await fetch("/api/trade/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetsId, tokenAddress }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Approve failed");
        return;
      }
      setApproveResult(data as ApproveResponse);
    } catch {
      setError("Network error during approve");
    } finally {
      setLoading(false);
    }
  }

  async function handleSwap() {
    if (!assetsId) return;
    setLoading(true);
    setError(null);
    setSwapResult(null);
    setOrderStatus(null);

    const rawAmount = toWei(amount, 18);

    try {
      const res = await fetch("/api/trade/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetsId,
          tokenAddress,
          side,
          amount: rawAmount,
          baseToken,
          slippageBps,
          confirmToken: tokenAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Swap failed");
        return;
      }
      setSwapResult(data as SwapResponse);
      // Auto-query order status
      if (data.orderId) {
        queryOrderStatus(data.orderId);
      }
    } catch {
      setError("Network error during swap");
    } finally {
      setLoading(false);
    }
  }

  async function queryOrderStatus(orderId: string) {
    try {
      const res = await fetch(`/api/trade/orders?ids=${encodeURIComponent(orderId)}`);
      if (res.ok) {
        const data: GetOrdersResponse = await res.json();
        setOrderStatus(data);
      }
    } catch {
      // non-critical
    }
  }

  const displayToken = tokenSymbol || tokenName || formatAddr(tokenAddress);

  return (
    <div className="surface-card px-6 py-7 md:px-7">
      <p className="section-kicker">交易面板</p>
      <h2 className="display-copy mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
        BSC 交易
      </h2>
      <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
        代币: {displayToken} ({formatAddr(tokenAddress)})
      </p>

      {/* Wallet Section */}
      <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          AVE 托管钱包
        </p>

        {onboarding === "no_wallet" && !loading && (
          <div className="mt-4">
            <p className="text-sm text-[var(--color-ink-soft)]">
              还没有交易钱包，点击创建一个 AVE 托管钱包开始交易。
            </p>
            <button
              onClick={handleGenerateWallet}
              disabled={loading}
              className="mt-4 rounded-full bg-[linear-gradient(135deg,#f4c76a_0%,#ff9b62_100%)] px-5 py-3 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[0_18px_40px_rgba(244,199,106,0.24)] transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              创建钱包
            </button>
          </div>
        )}

        {onboarding === "wallet_empty" && wallet && (
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-[var(--color-ink)]">
                {wallet.address}
              </span>
            </div>
            <div className="mt-3 rounded-[18px] border border-amber-300/20 bg-amber-300/8 px-4 py-3">
              <p className="text-sm text-amber-50">
                请向以下地址转入 BNB 或 USDT (BSC)
              </p>
              <p className="mt-2 break-all font-mono text-xs text-amber-100">
                {wallet.address}
              </p>
              <p className="mt-2 text-xs text-amber-50/70">
                转入后刷新页面即可开始交易。最低建议转入 0.1 BNB 或等值 USDT。
              </p>
            </div>
            <button
              onClick={refreshWallet}
              className="mt-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-ink)] transition hover:border-white/18 hover:bg-white/10"
            >
              刷新余额
            </button>
          </div>
        )}

        {onboarding === "wallet_funded" && wallet && (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-sm text-[var(--color-ink)]">
                {formatAddr(wallet.address)}
              </span>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200">
                已充值
              </span>
            </div>
            {wallet.balances.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {wallet.balances.map((b) => (
                  <span
                    key={b.tokenAddress}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-[var(--color-ink)]"
                  >
                    {b.humanBalance} {b.symbol}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={refreshWallet}
              className="mt-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-ink)] transition hover:border-white/18 hover:bg-white/10"
            >
              刷新余额
            </button>
          </div>
        )}

        {loading && !wallet && onboarding === "no_wallet" && (
          <p className="mt-4 text-sm text-[var(--color-muted)]">正在创建钱包...</p>
        )}
      </div>

      {/* Approve Section */}
      <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          授权
        </p>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
          授权 AVE 合约花费该代币，卖出前需要先授权。
        </p>
        <button
          onClick={handleApprove}
          disabled={loading || onboarding !== "wallet_funded"}
          title={onboarding !== "wallet_funded" ? "请先充值" : undefined}
          className="mt-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-ink)] transition hover:border-white/18 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "处理中..." : "授权 (Approve)"}
        </button>

        {approveResult && (
          <div className="mt-3 rounded-[18px] border border-emerald-300/20 bg-emerald-300/8 px-4 py-3 text-sm text-emerald-50">
            <p>已授权 {displayToken}</p>
            <p className="mt-1 font-mono text-xs">
              spender: {formatAddr(approveResult.spender)}
            </p>
            <p className="mt-1 font-mono text-xs">
              order: {approveResult.orderId}
            </p>
          </div>
        )}
      </div>

      {/* Swap Section */}
      <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          交易
        </p>

        <div className="mt-4 grid gap-3">
          {/* Side toggle */}
          <div className="flex gap-2">
            {(["buy", "sell"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  side === s
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-white/10 bg-white/5 text-[var(--color-ink)] hover:border-white/18"
                }`}
              >
                {s === "buy" ? "买入" : "卖出"}
              </button>
            ))}
          </div>

          {/* Base token */}
          <div className="flex gap-2">
            {(["bnb", "usdt"] as const).map((bt) => (
              <button
                key={bt}
                onClick={() => setBaseToken(bt)}
                className={`rounded-full border px-4 py-2 text-xs font-mono uppercase transition ${
                  baseToken === bt
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-white/10 bg-white/5 text-[var(--color-ink)] hover:border-white/18"
                }`}
              >
                {bt}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
              数量 ({baseToken.toUpperCase()})
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.1"
              className="mt-1 w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] outline-none focus:border-[var(--color-accent)]/50"
            />
          </div>

          {/* Slippage */}
          <div>
            <label className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
              滑点 ({(slippageBps / 100).toFixed(0)}%)
            </label>
            <input
              type="range"
              min={100}
              max={5000}
              step={100}
              value={slippageBps}
              onChange={(e) => setSlippageBps(Number(e.target.value))}
              className="mt-1 w-full accent-[var(--color-accent)]"
            />
          </div>
        </div>

        <button
          onClick={handleSwap}
          disabled={
            loading ||
            onboarding !== "wallet_funded" ||
            !amount ||
            Number(amount) <= 0
          }
          title={onboarding !== "wallet_funded" ? "请先充值" : undefined}
          className="mt-4 w-full rounded-full bg-[linear-gradient(135deg,#f4c76a_0%,#ff9b62_100%)] px-5 py-3 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[0_18px_40px_rgba(244,199,106,0.24)] transition hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "处理中..." : side === "buy" ? "确认买入" : "确认卖出"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-[22px] border border-rose-300/20 bg-rose-300/8 px-4 py-4 text-sm leading-7 text-rose-50">
          {error}
        </div>
      )}

      {/* Swap result */}
      {swapResult && (
        <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            订单结果
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">订单 ID</span>
              <span className="font-mono text-[var(--color-ink)]">
                {swapResult.orderId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">方向</span>
              <span className="text-[var(--color-ink)]">
                {swapResult.side === "buy" ? "买入" : "卖出"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">状态</span>
              <span className="text-[var(--color-ink)]">{swapResult.status}</span>
            </div>
          </div>
          {swapResult.orderId && (
            <button
              onClick={() => queryOrderStatus(swapResult.orderId)}
              className="mt-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-ink)] transition hover:border-white/18 hover:bg-white/10"
            >
              查询订单状态
            </button>
          )}
        </div>
      )}

      {/* Order status */}
      {orderStatus && orderStatus.orders.length > 0 && (
        <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            订单状态
          </p>
          {orderStatus.orders.map((order) => (
            <div key={order.orderId} className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-muted)]">状态</span>
                <span
                  className={
                    order.status === "confirmed"
                      ? "text-emerald-300"
                      : order.status === "error"
                        ? "text-rose-300"
                        : "text-amber-200"
                  }
                >
                  {order.status === "confirmed"
                    ? "已确认"
                    : order.status === "sent"
                      ? "已发送"
                      : order.status === "error"
                        ? "错误"
                        : "已生成"}
                </span>
              </div>
              {order.txHash && (
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">链上哈希</span>
                  <span className="font-mono text-xs text-[var(--color-ink)]">
                    {formatAddr(order.txHash)}
                  </span>
                </div>
              )}
              {order.inAmount && (
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">输入量</span>
                  <span className="font-mono text-xs text-[var(--color-ink)]">
                    {order.inAmount}
                  </span>
                </div>
              )}
              {order.outAmount && (
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">输出量</span>
                  <span className="font-mono text-xs text-[var(--color-ink)]">
                    {order.outAmount}
                  </span>
                </div>
              )}
              {order.errorMessage && (
                <div className="rounded-[16px] border border-rose-300/20 bg-rose-300/8 px-3 py-2 text-xs text-rose-50">
                  {order.errorMessage}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
