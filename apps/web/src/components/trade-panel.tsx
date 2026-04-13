"use client";

import { useState, useEffect, useCallback } from "react";
import type { GetWalletResponse } from "@meme-affinity/core";

type TradePanelProps = {
  tokenAddress: string;
  tokenName?: string;
  tokenSymbol?: string;
};

type OnboardingState = "no_wallet" | "wallet_empty" | "wallet_funded";

function formatAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function TradePanel({ tokenAddress, tokenName, tokenSymbol }: TradePanelProps) {
  const [assetsId, setAssetsId] = useState<string | null>(null);
  const [bindingCode, setBindingCode] = useState<string | null>(null);
  const [wallet, setWallet] = useState<GetWalletResponse | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState>("no_wallet");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Copy state
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [installCopyState, setInstallCopyState] = useState<"idle" | "copied" | "failed">("idle");

  // Load identity from localStorage on mount
  useEffect(() => {
    try {
      const storedAssetsId = localStorage.getItem("ave_assets_id");
      if (storedAssetsId) {
        setAssetsId(storedAssetsId);
      }
      const storedBindingCode = localStorage.getItem("ave_binding_code");
      if (storedBindingCode) {
        setBindingCode(storedBindingCode);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const persistIdentity = useCallback((next: { assetsId?: string | null; bindingCode?: string | null }) => {
    if (next.assetsId !== undefined) {
      setAssetsId(next.assetsId);
      try {
        if (next.assetsId) {
          localStorage.setItem("ave_assets_id", next.assetsId);
        } else {
          localStorage.removeItem("ave_assets_id");
        }
      } catch {}
    }

    if (next.bindingCode !== undefined) {
      setBindingCode(next.bindingCode);
      try {
        if (next.bindingCode) {
          localStorage.setItem("ave_binding_code", next.bindingCode);
        } else {
          localStorage.removeItem("ave_binding_code");
        }
      } catch {}
    }
  }, []);

  // Fetch wallet info when identity changes
  const refreshWallet = useCallback(async (override?: { assetsId?: string | null; bindingCode?: string | null }) => {
    const targetBindingCode = (override?.bindingCode ?? bindingCode)?.trim() || "";
    const targetAssetsId = (override?.assetsId ?? assetsId)?.trim() || "";

    if (!targetBindingCode && !targetAssetsId) {
      setOnboarding("no_wallet");
      setWallet(null);
      return;
    }

    setLoading(true);
    try {
      const query = targetBindingCode
        ? `bindingCode=${encodeURIComponent(targetBindingCode)}`
        : `assetsId=${encodeURIComponent(targetAssetsId)}`;
      const res = await fetch(`/api/trade/wallet?${query}`);
      if (!res.ok) {
        if (res.status === 404) {
          setOnboarding("no_wallet");
        }
        setWallet(null);
        return;
      }
      const data: GetWalletResponse = await res.json();
      setWallet(data);
      setOnboarding(data.balanceState === "funded" ? "wallet_funded" : "wallet_empty");
      if (data.assetsId && data.assetsId !== assetsId) {
        persistIdentity({ assetsId: data.assetsId });
      }
    } catch {
      setOnboarding("no_wallet");
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, [assetsId, bindingCode, persistIdentity]);

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
        setError(data?.error || "创建钱包失败");
        return;
      }
      const data = await res.json();
      const newAssetsId = data.assetsId as string;
      const newBindingCode = data.bindingCode as string;
      persistIdentity({ assetsId: newAssetsId, bindingCode: newBindingCode });
    } catch {
      setError("创建钱包时网络异常");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("failed");
      setTimeout(() => setCopyState("idle"), 1600);
    }
  }

  async function handleCopyInstall() {
    const text = `repo: https://github.com/Guranta/-azz.git\npath: skills/meme-affinity-query\nskill: azz`;
    try {
      await navigator.clipboard.writeText(text);
      setInstallCopyState("copied");
      setTimeout(() => setInstallCopyState("idle"), 1600);
    } catch {
      setInstallCopyState("failed");
      setTimeout(() => setInstallCopyState("idle"), 1600);
    }
  }

  const displayToken = tokenSymbol || tokenName || formatAddr(tokenAddress);

  return (
    <div className="surface-card px-6 py-7 md:px-7">
      <p className="section-kicker">交易面板</p>
      <h2 className="display-copy mt-3 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
        {displayToken}
      </h2>

      {/* Skill Install Block */}
      <div className="mt-5 rounded-[24px] border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-accent)]">
            Skill 安装
          </p>
          <button
            onClick={() => void handleCopyInstall()}
            className="rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-3 py-1 text-xs text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/20"
          >
            {installCopyState === "copied" ? "已复制" : "复制安装信息"}
          </button>
        </div>
        <p className="mt-3 text-sm text-[var(--color-ink-soft)]">
          复制以下内容到 OpenClaw 即可安装 Skill：
        </p>
        <div className="mt-3 rounded-[16px] border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs leading-6 text-[var(--color-ink)]">
          <p>repo: https://github.com/Guranta/-azz.git</p>
          <p>path: skills/meme-affinity-query</p>
          <p>skill: azz</p>
        </div>
        <p className="mt-3 text-xs text-[var(--color-ink-soft)]">
          安装后可用指令：<code className="rounded bg-white/10 px-1">分析</code> <code className="rounded bg-white/10 px-1">绑定</code> <code className="rounded bg-white/10 px-1">授权</code> <code className="rounded bg-white/10 px-1">买</code> <code className="rounded bg-white/10 px-1">卖</code>
        </p>
      </div>

      {/* Wallet Section */}
      <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          托管钱包
        </p>

        {onboarding === "no_wallet" && !loading && (
          <div className="mt-4">
            <p className="text-sm text-[var(--color-ink-soft)]">
              点击创建托管钱包，系统会自动生成钱包地址和绑定码。充值后即可开始交易。
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
              <span className="font-mono text-sm text-[var(--color-ink)]">{wallet.walletAddress}</span>
            </div>

            {bindingCode && (
              <div className="mt-3 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-muted)]">绑定码</span>
                  <button
                    onClick={() => handleCopy(bindingCode)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--color-ink)] transition hover:border-white/18 hover:bg-white/10"
                  >
                    {copyState === "copied" ? "已复制" : "复制"}
                  </button>
                </div>
                <p className="mt-1 font-mono text-sm text-[var(--color-ink)] break-all">{bindingCode}</p>
                <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
                  在 OpenClaw 中发送 <code className="rounded bg-white/10 px-1">绑定 {bindingCode.slice(0, 8)}...</code> 即可绑定交易
                </p>
              </div>
            )}

            <div className="mt-3 rounded-[18px] border border-amber-300/20 bg-amber-300/8 px-4 py-3">
              <p className="text-sm text-amber-50">请向这个地址转入 BNB 或 USDT（BSC）</p>
              <p className="mt-2 break-all font-mono text-xs text-amber-100">{wallet.walletAddress}</p>
              <p className="mt-2 text-xs text-amber-50/70">
                到账后点击刷新余额即可继续。建议最少转入 0.1 BNB 或等值 USDT。
              </p>
            </div>
            <button
              onClick={() => void refreshWallet()}
              className="mt-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-ink)] transition hover:border-white/18 hover:bg-white/10"
            >
              刷新余额
            </button>
          </div>
        )}

        {onboarding === "wallet_funded" && wallet && (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-sm text-[var(--color-ink)]">{formatAddr(wallet.walletAddress)}</span>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200">
                已入金
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

            {bindingCode && (
              <div className="mt-3 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-muted)]">绑定码</span>
                  <button
                    onClick={() => handleCopy(bindingCode)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--color-ink)] transition hover:border-white/18 hover:bg-white/10"
                  >
                    {copyState === "copied" ? "已复制" : "复制"}
                  </button>
                </div>
                <p className="mt-1 font-mono text-sm text-[var(--color-ink)] break-all">{bindingCode}</p>
              </div>
            )}

            <button
              onClick={() => void refreshWallet()}
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

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-[22px] border border-rose-300/20 bg-rose-300/8 px-4 py-4 text-sm leading-7 text-rose-50">
          {error}
        </div>
      )}
    </div>
  );
}
