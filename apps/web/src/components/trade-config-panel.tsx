"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CreateTradeConfigResponse,
  GetTradeConfigResponse,
} from "@meme-affinity/core";

export type TradeConfigState =
  | "trade_config_missing"
  | "trade_config_invalid"
  | "trade_config_ready";

type IdentityUpdatePayload = {
  assetsId?: string | null;
  bindingCode?: string | null;
  walletAddress?: string | null;
};

type TradeConfigPanelProps = {
  assetsId: string | null;
  bindingCode: string | null;
  onStateChange: (state: TradeConfigState) => void;
  onIdentityUpdate?: (payload: IdentityUpdatePayload) => void;
};

type CopyState = "idle" | "copied" | "failed";
type SaveTradeConfigResponse = CreateTradeConfigResponse & {
  walletAddress?: string;
};

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function formatUpdatedAt(updatedAt: string): string {
  if (!updatedAt) return "-";
  const time = new Date(updatedAt);
  if (Number.isNaN(time.valueOf())) return updatedAt;
  return time.toLocaleString();
}

function deriveTradeConfigState(params: {
  bindingCode: string | null;
  config: GetTradeConfigResponse | null;
  validationError: string | null;
}): TradeConfigState {
  if (params.validationError) return "trade_config_invalid";
  if (!params.bindingCode || !params.config?.hasConfig) return "trade_config_missing";
  if (params.config.status !== "active") return "trade_config_invalid";
  return "trade_config_ready";
}

export function TradeConfigPanel({
  assetsId,
  bindingCode,
  onStateChange,
  onIdentityUpdate,
}: TradeConfigPanelProps) {
  const [config, setConfig] = useState<GetTradeConfigResponse | null>(null);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelInfo, setPanelInfo] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [walletAddressHint, setWalletAddressHint] = useState<string | null>(null);
  const [copyBindingState, setCopyBindingState] = useState<CopyState>("idle");
  const [copyAssetsState, setCopyAssetsState] = useState<CopyState>("idle");

  const effectiveAssetsId = nonEmpty(config?.assetsId) || nonEmpty(assetsId);
  const effectiveBindingCode = nonEmpty(bindingCode) || nonEmpty(config?.bindingCode);

  const currentState = useMemo(
    () =>
      deriveTradeConfigState({
        bindingCode: effectiveBindingCode,
        config,
        validationError,
      }),
    [effectiveBindingCode, config, validationError]
  );

  useEffect(() => {
    onStateChange(currentState);
  }, [currentState, onStateChange]);

  useEffect(() => {
    if (!bindingCode) {
      setWalletAddressHint(null);
    }
  }, [bindingCode]);

  const loadConfig = useCallback(async () => {
    if (!effectiveBindingCode) {
      setConfig(null);
      setPanelError(null);
      setPanelInfo(null);
      setValidationError(null);
      return;
    }

    setFetching(true);
    setPanelError(null);
    try {
      const res = await fetch(
        `/api/trade/config?bindingCode=${encodeURIComponent(effectiveBindingCode)}`
      );
      const data = (await res.json().catch(() => null)) as
        | GetTradeConfigResponse
        | { error?: string }
        | null;

      if (!res.ok) {
        if (res.status === 404) {
          setConfig({
            assetsId: effectiveAssetsId || "",
            bindingCode: effectiveBindingCode,
            hasConfig: false,
            maskedApiKey: "",
            status: "disabled",
            updatedAt: "",
          });
          setValidationError(null);
          return;
        }
        setPanelError(data && "error" in data ? data.error || "加载配置失败" : "加载配置失败");
        return;
      }

      setConfig(data as GetTradeConfigResponse);
      setValidationError(null);
    } catch {
      setPanelError("加载交易配置失败，请稍后重试");
    } finally {
      setFetching(false);
    }
  }, [effectiveAssetsId, effectiveBindingCode]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function handleSave() {
    const cleanApiKey = apiKey.trim();
    const cleanApiSecret = apiSecret.trim();
    const cleanBaseUrl = baseUrl.trim();

    if (!cleanApiKey || !cleanApiSecret) {
      setPanelError("AVE_BOT_API_KEY 和 AVE_BOT_API_SECRET 不能为空");
      return;
    }

    setSaving(true);
    setPanelError(null);
    setPanelInfo(null);

    try {
      const payload: {
        assetsId?: string;
        apiKey: string;
        apiSecret: string;
        baseUrl?: string;
      } = {
        apiKey: cleanApiKey,
        apiSecret: cleanApiSecret,
      };
      if (nonEmpty(assetsId)) {
        payload.assetsId = nonEmpty(assetsId) as string;
      }
      if (cleanBaseUrl) {
        payload.baseUrl = cleanBaseUrl;
      }

      const res = await fetch("/api/trade/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as
        | SaveTradeConfigResponse
        | { error?: string }
        | null;

      if (!res.ok) {
        const message = data && "error" in data ? data.error || "保存配置失败" : "保存配置失败";
        setPanelError(message);
        setValidationError(message);
        return;
      }

      const saved = data as SaveTradeConfigResponse;
      const nextAssetsId = nonEmpty(saved.assetsId) || nonEmpty(assetsId);
      const nextBindingCode = nonEmpty(saved.bindingCode) || effectiveBindingCode;
      const nextWalletAddress = nonEmpty(saved.walletAddress);

      setConfig({
        assetsId: nextAssetsId || "",
        bindingCode: nextBindingCode || "",
        hasConfig: !!nextBindingCode,
        maskedApiKey: saved.maskedApiKey,
        status: saved.status,
        updatedAt: saved.updatedAt,
      });
      setWalletAddressHint(nextWalletAddress);
      onIdentityUpdate?.({
        assetsId: nextAssetsId,
        bindingCode: nextBindingCode,
        walletAddress: nextWalletAddress,
      });
      setValidationError(null);
      setPanelInfo("配置已保存");
      setApiKey("");
      setApiSecret("");
    } catch {
      const message = "保存配置失败，请检查网络后重试";
      setPanelError(message);
      setValidationError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!effectiveBindingCode) {
      setPanelError("暂无可删除的配置（缺少 bindingCode）");
      return;
    }

    setDeleting(true);
    setPanelError(null);
    setPanelInfo(null);

    try {
      const res = await fetch(
        `/api/trade/config?bindingCode=${encodeURIComponent(effectiveBindingCode)}`,
        { method: "DELETE" }
      );
      const data = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!res.ok) {
        setPanelError(data?.error || "删除配置失败");
        return;
      }

      if (data?.success === false) {
        setPanelError("删除配置失败");
        return;
      }

      setConfig({
        assetsId: effectiveAssetsId || "",
        bindingCode: "",
        hasConfig: false,
        maskedApiKey: "",
        status: "disabled",
        updatedAt: "",
      });
      setWalletAddressHint(null);
      onIdentityUpdate?.({ bindingCode: null, walletAddress: null });
      setValidationError(null);
      setPanelInfo("配置已删除");
      setApiKey("");
      setApiSecret("");
      setBaseUrl("");
      setCopyBindingState("idle");
      setCopyAssetsState("idle");
    } catch {
      setPanelError("删除配置失败，请稍后重试");
    } finally {
      setDeleting(false);
    }
  }

  async function handleCopy(value: string, setter: (state: CopyState) => void) {
    try {
      await navigator.clipboard.writeText(value);
      setter("copied");
      setTimeout(() => setter("idle"), 1600);
    } catch {
      setter("failed");
      setTimeout(() => setter("idle"), 1600);
    }
  }

  return (
    <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          AVE Bot API 配置
        </p>
        <span
          className={`rounded-full border px-3 py-1 text-xs ${
            currentState === "trade_config_ready"
              ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
              : currentState === "trade_config_invalid"
                ? "border-rose-300/30 bg-rose-300/10 text-rose-200"
                : "border-amber-300/30 bg-amber-300/10 text-amber-200"
          }`}
        >
          {currentState === "trade_config_ready"
            ? "trade_config_ready"
            : currentState === "trade_config_invalid"
              ? "trade_config_invalid"
              : "trade_config_missing"}
        </span>
      </div>

      <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
        支持直接填写 AVE_BOT_API_KEY / AVE_BOT_API_SECRET 创建并绑定钱包。不会回显完整密钥。
      </p>

      <div className="mt-3 rounded-[16px] border border-white/10 bg-white/5 px-4 py-3 text-xs text-[var(--color-ink-soft)]">
        <p className="font-mono">小龙虾 ID: {effectiveBindingCode || "-"}</p>
        <p className="mt-1 font-mono">assetsId: {effectiveAssetsId || "-"}</p>
        <p className="mt-1 font-mono">钱包地址: {walletAddressHint || "-"}</p>
        <p className="mt-1">Masked API Key: {config?.maskedApiKey || "-"}</p>
        <p className="mt-1">API Secret: 已保存（仅遮罩，不回显）</p>
        <p className="mt-1">更新时间: {formatUpdatedAt(config?.updatedAt || "")}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {effectiveBindingCode && (
          <button
            onClick={() => handleCopy(effectiveBindingCode, setCopyBindingState)}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-[var(--color-ink)] transition hover:border-white/18 hover:bg-white/10"
          >
            {copyBindingState === "copied"
              ? "bindingCode 已复制"
              : copyBindingState === "failed"
                ? "复制失败，请手动复制"
                : "复制 bindingCode"}
          </button>
        )}

        {effectiveAssetsId && (
          <button
            onClick={() => handleCopy(effectiveAssetsId, setCopyAssetsState)}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-[var(--color-ink)] transition hover:border-white/18 hover:bg-white/10"
          >
            {copyAssetsState === "copied"
              ? "assetsId 已复制"
              : copyAssetsState === "failed"
                ? "复制失败，请手动复制"
                : "复制 assetsId"}
          </button>
        )}
      </div>

      {currentState === "trade_config_missing" && (
        <div className="mt-3 rounded-[16px] border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-amber-50">
          尚未检测到可用配置，请先保存你的 AVE API，系统会返回 bindingCode。
        </div>
      )}

      {currentState === "trade_config_invalid" && (
        <div className="mt-3 rounded-[16px] border border-rose-300/20 bg-rose-300/8 px-4 py-3 text-sm text-rose-50">
          当前交易配置无效，请更新 AVE Bot API Key / Secret。
        </div>
      )}

      {panelInfo && (
        <div className="mt-3 rounded-[16px] border border-emerald-300/20 bg-emerald-300/8 px-4 py-3 text-sm text-emerald-50">
          {panelInfo}
        </div>
      )}

      {panelError && (
        <div className="mt-3 rounded-[16px] border border-rose-300/20 bg-rose-300/8 px-4 py-3 text-sm text-rose-50">
          {panelError}
        </div>
      )}

      <div className="mt-4 grid gap-3">
        <div>
          <label className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            AVE_BOT_API_KEY
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={config?.hasConfig ? "输入新 Key 以更新" : "请输入 API Key"}
            className="mt-1 w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] outline-none focus:border-[var(--color-accent)]/50"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            AVE_BOT_API_SECRET
          </label>
          <input
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder={config?.hasConfig ? "输入新 Secret 以更新" : "请输入 API Secret"}
            className="mt-1 w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] outline-none focus:border-[var(--color-accent)]/50"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            baseUrl (optional)
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.ave.ai"
            className="mt-1 w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] outline-none focus:border-[var(--color-accent)]/50"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={handleSave}
          disabled={saving || deleting || fetching}
          className="rounded-full bg-[linear-gradient(135deg,#f4c76a_0%,#ff9b62_100%)] px-5 py-3 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[0_18px_40px_rgba(244,199,106,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "保存中..." : effectiveBindingCode ? "更新配置" : "保存并创建配置"}
        </button>

        {effectiveBindingCode && (
          <button
            onClick={handleDelete}
            disabled={deleting || saving || fetching}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-ink)] transition hover:border-white/18 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? "删除中..." : "删除配置"}
          </button>
        )}

        <button
          onClick={loadConfig}
          disabled={fetching || saving || deleting || !effectiveBindingCode}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-ink)] transition hover:border-white/18 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {fetching ? "刷新中..." : "刷新配置"}
        </button>
      </div>
    </div>
  );
}
