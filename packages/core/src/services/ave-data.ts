import { isBscAddress } from "../config";
import type { RiskLevel, TokenBrief } from "../types";

const DEFAULT_AVE_BASE_URL = "https://prod.ave-api.com";
const DEFAULT_TIMEOUT_MS = 10_000;
const SMART_WALLET_LIST_CACHE_TTL_MS = 300_000;

type FetchLike = typeof fetch;
type JsonRecord = Record<string, unknown>;

const smartWalletListCache = new Map<
  string,
  {
    items: AveSmartWallet[];
    expiresAtEpochMs: number;
  }
>();

export interface FetchTokenBriefInput {
  tokenAddress: string;
  chain?: "bsc";
}

export interface FetchAddressTransactionsInput {
  walletAddress: string;
  chain?: "bsc";
  tokenAddress?: string;
  pageSize?: number;
}

export interface FetchSmartWalletListInput {
  chain?: "bsc";
  sort?: string;
  sortDir?: "asc" | "desc";
}

export interface FetchTokenTopHoldersInput {
  tokenAddress: string;
  chain?: "bsc";
  limit?: number;
}

export interface AveAddressTransaction {
  id: string | null;
  time: string | null;
  chain: string | null;
  transactionHash: string | null;
  walletAddress: string | null;
  fromAddress: string | null;
  fromSymbol: string | null;
  fromAmount: number | null;
  fromPriceUsd: number | null;
  toAddress: string | null;
  toSymbol: string | null;
  toAmount: number | null;
  toPriceUsd: number | null;
}

export interface AveSmartWallet {
  address: string;
  tag: string | null;
  tagItems: string[];
  chain: string | null;
  totalTrades: number | null;
  buyTrades: number | null;
  sellTrades: number | null;
  totalProfit: number | null;
  totalProfitRate: number | null;
  totalVolume: number | null;
  lastTradeTime: string | null;
}

export interface FetchSmartWalletListResult {
  items: AveSmartWallet[];
  cacheHit: boolean;
  expiresAt: string;
}

export interface AveTopHolder {
  address: string;
  rank: number;
  percentage: number | null;
  balanceUsd: number | null;
  amountCurrent: number | null;
}

export interface AveDataClient {
  fetchTokenBrief(input: FetchTokenBriefInput): Promise<TokenBrief>;
  fetchAddressTransactions(
    input: FetchAddressTransactionsInput
  ): Promise<AveAddressTransaction[]>;
  fetchSmartWalletList(
    input?: FetchSmartWalletListInput
  ): Promise<FetchSmartWalletListResult>;
  fetchTokenTopHolders(
    input: FetchTokenTopHoldersInput
  ): Promise<AveTopHolder[]>;
}

export interface AveMetricsRecorder {
  recordTokenDetail(): void;
  recordRisk(): void;
  recordTop100(): void;
  recordAddressTx(): void;
  recordSmartWalletList(): void;
}

export interface AveDataClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  metricsRecorder?: AveMetricsRecorder;
}

export class AveConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AveConfigurationError";
  }
}

export class AveApiError extends Error {
  statusCode?: number;
  path: string;
  body?: string;

  constructor(
    message: string,
    options: {
      path: string;
      statusCode?: number;
      body?: string;
    }
  ) {
    super(message);
    this.name = "AveApiError";
    this.statusCode = options.statusCode;
    this.path = options.path;
    this.body = options.body;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeBaseUrl(value: string | undefined): string {
  const baseUrl = (value || DEFAULT_AVE_BASE_URL).trim();
  if (!baseUrl) {
    throw new AveConfigurationError("AVE base URL must not be empty");
  }

  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/v2") ? normalized.slice(0, -3) : normalized;
}

function normalizeTimeout(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_TIMEOUT_MS;
  }

  if (!Number.isFinite(value) || value <= 0) {
    throw new AveConfigurationError("AVE timeout must be a positive number");
  }

  return value;
}

function readRequiredApiKey(value: string | undefined): string {
  const apiKey = value?.trim();
  if (!apiKey) {
    throw new AveConfigurationError("AVE_API_KEY is required");
  }

  return apiKey;
}

function coerceString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function collectValuesForKeys(
  input: unknown,
  keyCandidates: string[],
  depth = 0
): unknown[] {
  if (depth > 4 || input === null || input === undefined) {
    return [];
  }

  if (Array.isArray(input)) {
    return input.flatMap((item) => collectValuesForKeys(item, keyCandidates, depth + 1));
  }

  if (!isRecord(input)) {
    return [];
  }

  const matches: unknown[] = [];

  for (const [key, value] of Object.entries(input)) {
    const normalizedKey = key.toLowerCase();
    if (keyCandidates.includes(normalizedKey)) {
      matches.push(value);
    }

    if (Array.isArray(value) || isRecord(value)) {
      matches.push(...collectValuesForKeys(value, keyCandidates, depth + 1));
    }
  }

  return matches;
}

function findFirstString(input: unknown, keyCandidates: string[]): string | null {
  const values = collectValuesForKeys(input, keyCandidates);
  for (const value of values) {
    const normalized = coerceString(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function findFirstNumber(input: unknown, keyCandidates: string[]): number | null {
  const values = collectValuesForKeys(input, keyCandidates);
  for (const value of values) {
    const normalized = coerceNumber(value);
    if (normalized !== null) {
      return normalized;
    }
  }

  return null;
}

function flattenStrings(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.flatMap((item) => flattenStrings(item));
  }

  if (isRecord(input)) {
    return Object.values(input).flatMap((item) => flattenStrings(item));
  }

  const stringValue = coerceString(input);
  return stringValue ? [stringValue] : [];
}

function normalizeTag(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return normalized
    .replace(/[_/]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeAddress(value: unknown): string | null {
  const stringValue = coerceString(value);
  return stringValue ? stringValue.toLowerCase() : null;
}

function normalizeRiskLevel(value: unknown): RiskLevel {
  const riskLevel = coerceString(value)?.toUpperCase();
  switch (riskLevel) {
    case "LOW":
    case "MEDIUM":
    case "HIGH":
    case "CRITICAL":
      return riskLevel;
    default:
      return "unknown";
  }
}

function normalizeRatioToPercent(value: unknown): number | null {
  const parsed = coerceNumber(value);
  if (parsed === null) {
    return null;
  }

  if (parsed >= 0 && parsed <= 1) {
    return parsed * 100;
  }

  return parsed;
}

function extractNarrativeTags(tokenPayload: unknown): string[] {
  const values = collectValuesForKeys(tokenPayload, [
    "narrativetags",
    "narrative_tags",
    "narratives",
    "topics",
    "topic_tags",
    "tags",
    "labels",
    "categories",
    "category",
    "label",
  ]);

  return uniqueStrings(
    values
      .flatMap((value) => flattenStrings(value))
      .map((value) => normalizeTag(value))
      .filter((value): value is string => Boolean(value))
      .filter((value) => !value.includes("fourmeme"))
      .filter((value) => !value.includes("flap"))
      .slice(0, 8)
  );
}

function inferLaunchpad(
  tokenPayload: unknown,
  riskPayload: unknown
): TokenBrief["launchpad"] {
  const candidates = [
    ...collectValuesForKeys(tokenPayload, [
      "launchpad",
      "platform",
      "platform_name",
      "platform_tags",
      "source",
      "tag",
      "factory",
      "factory_name",
      "project_tags",
      "tags",
      "labels",
      "categories",
    ]),
    ...collectValuesForKeys(riskPayload, [
      "launchpad",
      "platform",
      "platform_name",
      "tags",
      "labels",
      "categories",
    ]),
  ]
    .flatMap((value) => flattenStrings(value))
    .map((value) => value.toLowerCase());

  if (candidates.some((value) => value.includes("fourmeme"))) {
    return "fourmeme";
  }

  if (
    candidates.some(
      (value) => value.includes("flap") || value.includes("xflap")
    )
  ) {
    return "flap";
  }

  return "unknown";
}

function isSuccessStatus(value: unknown): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1 || value === 200;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return (
      normalized === "1" ||
      normalized === "200" ||
      normalized === "ok" ||
      normalized === "success"
    );
  }

  return undefined;
}

function isTokenNotFoundPayload(input: unknown): boolean {
  if (!isRecord(input)) {
    return false;
  }

  const message = coerceString(input.msg ?? input.message)?.toLowerCase();
  return Boolean(message && message.includes("token not found"));
}

function extractPayload(
  input: unknown,
  path: string,
  statusCode: number,
  allowMissing = false
): unknown | null {
  if (allowMissing && isTokenNotFoundPayload(input)) {
    return null;
  }

  if (Array.isArray(input)) {
    return input;
  }

  if (!isRecord(input)) {
    return input;
  }

  const success = isSuccessStatus(input.status ?? input.success ?? input.ok);
  const payload =
    input.data ?? input.result ?? input.items ?? input.list ?? input.rows;

  if (payload !== undefined) {
    return payload;
  }

  if (success === false) {
    throw new AveApiError(`AVE returned a non-success payload for ${path}`, {
      path,
      statusCode,
    });
  }

  if (allowMissing && isTokenNotFoundPayload(input)) {
    return null;
  }

  return input;
}

async function parseJsonResponse(response: Response, path: string): Promise<unknown> {
  const bodyText = await response.text();

  if (!response.ok) {
    throw new AveApiError(`AVE request failed for ${path}`, {
      path,
      statusCode: response.status,
      body: bodyText,
    });
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    throw new AveApiError(`AVE returned invalid JSON for ${path}`, {
      path,
      statusCode: response.status,
      body: bodyText,
    });
  }
}

function buildTokenBrief(
  tokenAddress: string,
  tokenPayload: unknown,
  riskPayload: unknown
): TokenBrief {
  const name =
    findFirstString(tokenPayload, ["name", "token_name", "tokenname"]) ||
    "Unknown Token";
  const symbol =
    findFirstString(tokenPayload, ["symbol", "token_symbol", "tokensymbol", "ticker"]) ||
    "UNKNOWN";
  const riskScore = findFirstNumber(riskPayload, ["risk_score", "riskscore"]);

  return {
    address: tokenAddress,
    chain: "bsc",
    name,
    symbol,
    launchpad: inferLaunchpad(tokenPayload, riskPayload),
    narrativeTags: extractNarrativeTags(tokenPayload),
    risk: {
      riskLevel: normalizeRiskLevel(
        findFirstString(riskPayload, ["risk_level", "risklevel"]) ||
          findFirstString(tokenPayload, ["risk_level", "risklevel"])
      ),
      riskScore,
    },
  };
}

function ensureArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeAddressTransaction(item: unknown): AveAddressTransaction | null {
  if (!isRecord(item)) {
    return null;
  }

  return {
    id: coerceString(item.id),
    time: coerceString(item.time),
    chain: coerceString(item.chain),
    transactionHash: coerceString(item.transaction),
    walletAddress: normalizeAddress(item.wallet_address),
    fromAddress: normalizeAddress(item.from_address),
    fromSymbol: coerceString(item.from_symbol),
    fromAmount: coerceNumber(item.from_amount),
    fromPriceUsd: coerceNumber(item.from_price_usd),
    toAddress: normalizeAddress(item.to_address),
    toSymbol: coerceString(item.to_symbol),
    toAmount: coerceNumber(item.to_amount),
    toPriceUsd: coerceNumber(item.to_price_usd),
  };
}

function normalizeSmartWallet(item: unknown): AveSmartWallet | null {
  if (!isRecord(item)) {
    return null;
  }

  return {
    address: normalizeAddress(item.wallet_address ?? item.address) ?? "",
    tag: coerceString(item.tag),
    tagItems: uniqueStrings(flattenStrings(item.tag_items ?? item.tags)),
    chain: coerceString(item.chain),
    totalTrades: coerceNumber(item.total_trades),
    buyTrades: coerceNumber(item.buy_trades),
    sellTrades: coerceNumber(item.sell_trades),
    totalProfit: coerceNumber(item.total_profit),
    totalProfitRate: coerceNumber(item.total_profit_rate),
    totalVolume: coerceNumber(item.total_volume),
    lastTradeTime: coerceString(item.last_trade_time),
  };
}

function normalizeTopHolder(item: unknown, index: number): AveTopHolder | null {
  if (!isRecord(item)) {
    return null;
  }

  const address = normalizeAddress(item.address ?? item.holder);
  if (!address) {
    return null;
  }

  return {
    address,
    rank: index + 1,
    percentage: normalizeRatioToPercent(item.balance_ratio),
    balanceUsd: coerceNumber(item.balance_usd),
    amountCurrent: coerceNumber(item.amount_cur),
  };
}

function normalizeChain(chain: string | undefined): "bsc" {
  if (chain === undefined || chain === "bsc") {
    return "bsc";
  }

  throw new AveConfigurationError(
    `Only the bsc chain is supported in v1. Received: ${chain}`
  );
}

function normalizePageSize(value: number | undefined): number {
  if (value === undefined) {
    return 50;
  }

  if (!Number.isFinite(value) || value <= 0) {
    throw new AveConfigurationError("AVE page_size must be a positive number");
  }

  return Math.min(Math.round(value), 100);
}

function buildPath(pathname: string, params?: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function getSmartWalletCacheKey(input: FetchSmartWalletListInput): string {
  return [
    input.chain ?? "bsc",
    input.sort ?? "",
    input.sortDir ?? "",
  ].join(":");
}

export function createAveDataClient(options: AveDataClientOptions): AveDataClient {
  const apiKey = readRequiredApiKey(options.apiKey);
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const timeoutMs = normalizeTimeout(options.timeoutMs);
  const fetchImpl = options.fetchImpl ?? fetch;
  const metrics = options.metricsRecorder;

  async function requestPayload(
    path: string,
    allowMissing = false
  ): Promise<unknown | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: "GET",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      const parsed = await parseJsonResponse(response, path);
      return extractPayload(parsed, path, response.status, allowMissing);
    } catch (error) {
      if (error instanceof AveApiError) {
        if (allowMissing && error.statusCode === 404) {
          return null;
        }

        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new AveApiError(`AVE request timed out for ${path}`, { path });
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    async fetchTokenBrief(input: FetchTokenBriefInput): Promise<TokenBrief> {
      const tokenAddress = input.tokenAddress.trim().toLowerCase();
      const chain = normalizeChain(input.chain);

      if (!isBscAddress(tokenAddress)) {
        throw new AveConfigurationError(
          `Invalid BSC token address: ${tokenAddress}`
        );
      }

      const tokenPayload = await requestPayload(
        `/v2/tokens/${tokenAddress}-${chain}`
      );
      if (tokenPayload === null) {
        throw new AveApiError(`AVE returned no token data for ${tokenAddress}`, {
          path: `/v2/tokens/${tokenAddress}-${chain}`,
          statusCode: 404,
        });
      }
      metrics?.recordTokenDetail();

      const riskPayload = await requestPayload(
        `/v2/contracts/${tokenAddress}-${chain}`,
        true
      );
      metrics?.recordRisk();

      return buildTokenBrief(tokenAddress, tokenPayload, riskPayload);
    },

    async fetchAddressTransactions(
      input: FetchAddressTransactionsInput
    ): Promise<AveAddressTransaction[]> {
      const walletAddress = input.walletAddress.trim().toLowerCase();
      const chain = normalizeChain(input.chain);

      if (!isBscAddress(walletAddress)) {
        throw new AveConfigurationError(
          `Invalid BSC wallet address: ${walletAddress}`
        );
      }

      const tokenAddress = input.tokenAddress?.trim().toLowerCase();
      if (tokenAddress && !isBscAddress(tokenAddress)) {
        throw new AveConfigurationError(
          `Invalid BSC token address filter: ${tokenAddress}`
        );
      }

      const payload = await requestPayload(
        buildPath("/v2/address/tx", {
          wallet_address: walletAddress,
          chain,
          token_address: tokenAddress,
          page_size: normalizePageSize(input.pageSize),
        }),
        true
      );
      metrics?.recordAddressTx();

      return ensureArray(payload)
        .map((item) => normalizeAddressTransaction(item))
        .filter((item): item is AveAddressTransaction => Boolean(item));
    },

    async fetchSmartWalletList(
      input: FetchSmartWalletListInput = {}
    ): Promise<FetchSmartWalletListResult> {
      const normalizedInput: FetchSmartWalletListInput = {
        chain: normalizeChain(input.chain),
        sort: input.sort?.trim() || undefined,
        sortDir: input.sortDir,
      };
      const cacheKey = getSmartWalletCacheKey(normalizedInput);
      const now = Date.now();
      const cached = smartWalletListCache.get(cacheKey);

      if (cached && cached.expiresAtEpochMs > now) {
        return {
          items: cached.items,
          cacheHit: true,
          expiresAt: new Date(cached.expiresAtEpochMs).toISOString(),
        };
      }

      const payload = await requestPayload(
        buildPath("/v2/address/smart_wallet/list", {
          chain: normalizedInput.chain,
          sort: normalizedInput.sort,
          sort_dir: normalizedInput.sortDir,
        })
      );
      metrics?.recordSmartWalletList();

      const items = ensureArray(payload)
        .map((item) => normalizeSmartWallet(item))
        .filter(
          (item): item is AveSmartWallet => Boolean(item && item.address)
        );
      const expiresAtEpochMs = now + SMART_WALLET_LIST_CACHE_TTL_MS;

      smartWalletListCache.set(cacheKey, {
        items,
        expiresAtEpochMs,
      });

      return {
        items,
        cacheHit: false,
        expiresAt: new Date(expiresAtEpochMs).toISOString(),
      };
    },

    async fetchTokenTopHolders(
      input: FetchTokenTopHoldersInput
    ): Promise<AveTopHolder[]> {
      const tokenAddress = input.tokenAddress.trim().toLowerCase();
      const chain = normalizeChain(input.chain);
      const limit = Math.max(1, Math.min(Math.round(input.limit ?? 100), 100));

      if (!isBscAddress(tokenAddress)) {
        throw new AveConfigurationError(
          `Invalid BSC token address: ${tokenAddress}`
        );
      }

      const payload = await requestPayload(
        buildPath(`/v2/tokens/top100/${tokenAddress}-${chain}`, { limit }),
        true
      );
      metrics?.recordTop100();

      return ensureArray(payload)
        .map((item, index) => normalizeTopHolder(item, index))
        .filter((item): item is AveTopHolder => Boolean(item));
    },
  };
}

export function createAveDataClientFromEnv(
  env: Record<string, string | undefined> = process.env,
  metricsRecorder?: AveMetricsRecorder
): AveDataClient {
  return createAveDataClient({
    apiKey: readRequiredApiKey(env.AVE_API_KEY),
    baseUrl: env.AVE_DATA_BASE_URL,
    timeoutMs: env.AVE_REQUEST_TIMEOUT_MS
      ? Number(env.AVE_REQUEST_TIMEOUT_MS)
      : undefined,
    metricsRecorder,
  });
}
