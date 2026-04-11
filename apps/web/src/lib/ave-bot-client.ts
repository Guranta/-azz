import crypto from "crypto";
import type {
  GenerateWalletResponse,
  GetWalletResponse,
  TradeTokenBalance,
  ApproveResponse,
  SwapResponse,
  OrderStatus,
} from "@meme-affinity/core";

const DEFAULT_BOT_BASE_URL = "https://bot-api.ave.ai";
const DEFAULT_TIMEOUT_MS = 15_000;

const BSC_BNB_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const BSC_USDT_ADDRESS = "0x55d398326f99059ff775485246999027b3197955";

export class AveBotConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AveBotConfigError";
  }
}

export class AveBotApiError extends Error {
  readonly statusCode?: number;
  readonly upstreamMessage?: string;

  constructor(message: string, options?: { statusCode?: number; upstreamMessage?: string }) {
    super(message);
    this.name = "AveBotApiError";
    this.statusCode = options?.statusCode;
    this.upstreamMessage = options?.upstreamMessage;
  }
}

// ---------- HMAC-SHA256 signing ----------

function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    const value = obj[key];
    sorted[key] =
      value !== null && typeof value === "object" && !Array.isArray(value)
        ? sortObjectKeys(value as Record<string, unknown>)
        : value;
  }
  return sorted;
}

function compactJsonStringify(obj: Record<string, unknown>): string {
  return JSON.stringify(sortObjectKeys(obj)).replace(/\s+/g, "");
}

function buildSignature(
  timestamp: string,
  method: string,
  requestPath: string,
  body: string,
  secret: string
): string {
  const message = `${timestamp}${method}${requestPath}${body}`;
  return crypto.createHmac("sha256", secret).update(message).digest("base64");
}

function toRfc3339Nano(): string {
  const now = new Date();
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  return now.toISOString().replace(".000Z", `.${ms}Z`);
}

// ---------- Response normalization ----------

interface AveBotEnvelope<T> {
  status: number;
  msg: string;
  data: T;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const bodyText = await response.text();

  let parsed: AveBotEnvelope<T>;
  try {
    parsed = JSON.parse(bodyText) as AveBotEnvelope<T>;
  } catch {
    throw new AveBotApiError("AVE Bot API returned invalid JSON", {
      statusCode: response.status,
    });
  }

  if (response.status >= 400) {
    throw new AveBotApiError(
      `AVE Bot API error: ${parsed.msg || response.statusText}`,
      {
        statusCode: response.status,
        upstreamMessage: parsed.msg,
      }
    );
  }

  // AVE returns status 0 or 200 on success
  if (parsed.status !== 0 && parsed.status !== 200) {
    throw new AveBotApiError(
      `AVE Bot API error: ${parsed.msg || "unknown"}`,
      {
        statusCode: response.status,
        upstreamMessage: parsed.msg,
      }
    );
  }

  return parsed.data;
}

// ---------- Client ----------

export interface AveBotClientOptions {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface AveBotClient {
  generateWallet(): Promise<GenerateWalletResponse>;
  getWalletByAssetsId(assetsId: string): Promise<GetWalletResponse>;
  approve(assetsId: string, tokenAddress: string): Promise<ApproveResponse>;
  sendSwapOrder(params: {
    assetsId: string;
    tokenAddress: string;
    side: "buy" | "sell";
    amount: string;
    baseToken: "bnb" | "usdt";
    slippageBps: number;
  }): Promise<SwapResponse>;
  getSwapOrders(ids: string): Promise<OrderStatus[]>;
}

export function createAveBotClient(options: AveBotClientOptions): AveBotClient {
  const apiKey = options.apiKey?.trim();
  const apiSecret = options.apiSecret?.trim();
  if (!apiKey || !apiSecret) {
    throw new AveBotConfigError(
      "AVE_BOT_API_KEY and AVE_BOT_API_SECRET are required"
    );
  }

  const baseUrl = (options.baseUrl?.trim() || DEFAULT_BOT_BASE_URL).replace(
    /\/+$/,
    ""
  );
  const timeoutMs =
    options.timeoutMs && options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_TIMEOUT_MS;

  async function makeRequest<T>(
    method: "GET" | "POST",
    requestPath: string,
    body: Record<string, unknown> | null = null
  ): Promise<T> {
    const timestamp = toRfc3339Nano();
    const signedBody = body ? compactJsonStringify(body) : "";
    const sign = buildSignature(timestamp, method, requestPath, signedBody, apiSecret);

    const url = `${baseUrl}${requestPath}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "AVE-ACCESS-KEY": apiKey,
          "AVE-ACCESS-TIMESTAMP": timestamp,
          "AVE-ACCESS-SIGN": sign,
          "Content-Type": "application/json",
        },
        body: method === "POST" ? signedBody || undefined : undefined,
        signal: controller.signal,
      });

      return parseResponse<T>(response);
    } catch (error) {
      if (error instanceof AveBotApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new AveBotApiError("AVE Bot API request timed out");
      }
      throw new AveBotApiError(
        `AVE Bot API request failed: ${error instanceof Error ? error.message : "unknown error"}`
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    async generateWallet(): Promise<GenerateWalletResponse> {
      type GenerateData = {
        assetsId: string;
        addressList: Array<{ chain: string; address: string }>;
        mnemonic?: string;
      };

      const data = await makeRequest<GenerateData>(
        "POST",
        "/v1/thirdParty/user/generateWallet"
      );

      const bscEntry = data.addressList?.find(
        (entry) => entry.chain === "bsc"
      );

      if (!bscEntry) {
        throw new AveBotApiError(
          "AVE generateWallet did not return a BSC address"
        );
      }

      // Explicitly discard mnemonic — AVE manages custody
      return {
        assetsId: data.assetsId,
        address: bscEntry.address,
        chain: "bsc",
        createdAt: new Date().toISOString(),
      };
    },

    async getWalletByAssetsId(assetsId: string): Promise<GetWalletResponse> {
      type UserData = Array<{
        assetsId: string;
        addressList: Array<{
          chain: string;
          address: string;
          status?: string;
          type?: string;
        }>;
      }>;

      // 1. Identity lookup
      const users = await makeRequest<UserData>(
        "GET",
        `/v1/thirdParty/user/getUserByAssetsId?assetsIds=${encodeURIComponent(assetsId)}`
      );

      const user = Array.isArray(users) ? users[0] : users;
      if (!user) {
        throw new AveBotApiError("Wallet not found", { statusCode: 404 });
      }

      const bscEntry = user.addressList?.find(
        (entry) => entry.chain === "bsc"
      );

      if (!bscEntry) {
        throw new AveBotApiError("Wallet BSC address not found", {
          statusCode: 404,
        });
      }

      // 2. Balance lookup (best-effort)
      let balances: TradeTokenBalance[] = [];
      let balanceState: "empty" | "funded" = "empty";

      try {
        type AssetBalance = {
          tokenAddress?: string;
          symbol?: string;
          decimals?: number;
          balance?: string;
        };
        type AssetsData = AssetBalance[];

        const assetsData = await makeRequest<AssetsData>(
          "GET",
          `/v1/thirdParty/user/getUserAssets?assetsId=${encodeURIComponent(assetsId)}&chain=bsc`
        );

        if (Array.isArray(assetsData)) {
          for (const asset of assetsData) {
            const ta = asset.tokenAddress?.toLowerCase() || "";
            if (ta === BSC_BNB_ADDRESS || ta === BSC_USDT_ADDRESS) {
              const decimals = asset.decimals ?? 18;
              const raw = asset.balance || "0";
              const human = raw === "0"
                ? "0"
                : (BigInt(raw) / BigInt(10 ** (decimals - 4))).toString().replace(/(\d{4})$/, ".$1");
              balances.push({
                tokenAddress: ta,
                symbol: ta === BSC_BNB_ADDRESS ? "BNB" : "USDT",
                decimals,
                rawBalance: raw,
                humanBalance: human,
              });
            }
          }

          const hasFunds = balances.some(
            (b) => BigInt(b.rawBalance) > BigInt(0)
          );
          balanceState = hasFunds ? "funded" : "empty";
        }
      } catch (error) {
        // Balance fetch failure degrades gracefully
        console.warn(
          `[AVE Bot] Balance lookup failed for ${assetsId}: ${error instanceof Error ? error.message : "unknown"}`
        );
        balanceState = "empty";
        balances = [];
      }

      return {
        assetsId: user.assetsId,
        address: bscEntry.address,
        chain: "bsc",
        status: (bscEntry.status as "enabled" | "disabled") || "enabled",
        type: (bscEntry.type as "self" | "delegate") || "delegate",
        balanceState,
        balances,
      };
    },

    async approve(
      assetsId: string,
      tokenAddress: string
    ): Promise<ApproveResponse> {
      type ApproveData = {
        id: string;
        spender: string;
        amm: string;
      };

      const data = await makeRequest<ApproveData>(
        "POST",
        "/v1/thirdParty/tx/approve",
        {
          chain: "bsc",
          assetsId,
          tokenAddress,
        }
      );

      return {
        orderId: data.id,
        spender: data.spender,
        amm: data.amm,
      };
    },

    async sendSwapOrder(params: {
      assetsId: string;
      tokenAddress: string;
      side: "buy" | "sell";
      amount: string;
      baseToken: "bnb" | "usdt";
      slippageBps: number;
    }): Promise<SwapResponse> {
      const baseTokenAddress =
        params.baseToken === "usdt" ? BSC_USDT_ADDRESS : BSC_BNB_ADDRESS;

      const inTokenAddress =
        params.side === "buy" ? baseTokenAddress : params.tokenAddress;
      const outTokenAddress =
        params.side === "buy" ? params.tokenAddress : baseTokenAddress;

      type SwapData = {
        id: string;
        inTokenAddress?: string;
        outTokenAddress?: string;
        inAmount?: string;
      };

      const data = await makeRequest<SwapData>(
        "POST",
        "/v1/thirdParty/tx/sendSwapOrder",
        {
          chain: "bsc",
          assetsId: params.assetsId,
          inTokenAddress,
          outTokenAddress,
          inAmount: params.amount,
          swapType: params.side,
          slippage: String(params.slippageBps),
          extraGas: "0",
        }
      );

      return {
        orderId: data.id,
        side: params.side,
        tokenAddress: params.tokenAddress,
        inTokenAddress: data.inTokenAddress || inTokenAddress,
        outTokenAddress: data.outTokenAddress || outTokenAddress,
        amount: data.inAmount || params.amount,
        status: "generated",
        createdAt: new Date().toISOString(),
      };
    },

    async getSwapOrders(ids: string): Promise<OrderStatus[]> {
      type SwapOrderData = Array<{
        id?: string;
        status?: string;
        swapType?: string;
        chain?: string;
        txHash?: string;
        txPriceUsd?: string;
        inAmount?: string;
        outAmount?: string;
        errorMsg?: string;
      }>;

      const data = await makeRequest<SwapOrderData>(
        "GET",
        `/v1/thirdParty/tx/getSwapOrder?chain=bsc&ids=${encodeURIComponent(ids)}`
      );

      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((order) => ({
        orderId: order.id || "",
        status: (["generated", "sent", "confirmed", "error"].includes(
          order.status || ""
        )
          ? order.status
          : "error") as OrderStatus["status"],
        side:
          order.swapType === "buy" || order.swapType === "sell"
            ? order.swapType
            : "buy",
        chain: "bsc" as const,
        txHash: order.txHash || null,
        txPriceUsd: order.txPriceUsd || null,
        inAmount: order.inAmount || null,
        outAmount: order.outAmount || null,
        errorMessage: order.errorMsg || null,
      }));
    },
  };
}

export function createAveBotClientFromEnv(
  env: Record<string, string | undefined> = process.env
): AveBotClient {
  const apiKey = env.AVE_BOT_API_KEY?.trim();
  const apiSecret = env.AVE_BOT_API_SECRET?.trim();

  if (!apiKey || !apiSecret) {
    throw new AveBotConfigError(
      "AVE_BOT_API_KEY and AVE_BOT_API_SECRET are required for trade operations"
    );
  }

  return createAveBotClient({
    apiKey,
    apiSecret,
    baseUrl: env.AVE_BOT_BASE_URL?.trim(),
  });
}
