import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const envPath = path.join(repoRoot, "apps/web/.env.local");
const trackedAddressesPath = path.join(repoRoot, "config/tracked-addresses.json");
const outputPath = path.join(repoRoot, "config/tracked-driver-systems.json");

const DEFAULT_AVE_BASE_URL = "https://prod.ave-api.com";
const ADDRESS_HISTORY_PAGE_SIZE = 200;
const BASE_ASSET_SYMBOLS = new Set([
  "BNB",
  "WBNB",
  "USDT",
  "USDC",
  "FDUSD",
  "BUSD",
]);

function coerceString(value) {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function coerceNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function flattenStrings(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenStrings(item));
  }

  if (isRecord(value)) {
    return Object.values(value).flatMap((item) => flattenStrings(item));
  }

  const normalized = coerceString(value);
  return normalized ? [normalized] : [];
}

function collectValuesForKeys(input, keyCandidates, depth = 0) {
  if (depth > 4 || input === null || input === undefined) {
    return [];
  }

  if (Array.isArray(input)) {
    return input.flatMap((item) => collectValuesForKeys(item, keyCandidates, depth + 1));
  }

  if (!isRecord(input)) {
    return [];
  }

  const matches = [];
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

function extractArrayPayload(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return [];
  }

  const nestedKeys = ["data", "result", "items", "list", "rows"];
  for (const key of nestedKeys) {
    if (!(key in value)) {
      continue;
    }

    const nestedValue = value[key];
    if (Array.isArray(nestedValue)) {
      return nestedValue;
    }

    const nestedArray = extractArrayPayload(nestedValue);
    if (nestedArray.length > 0) {
      return nestedArray;
    }
  }

  return [];
}

function normalizeTag(value) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return normalized || null;
}

function uniqueStrings(values) {
  return Array.from(new Set(values));
}

function normalizeAddress(value) {
  const stringValue = coerceString(value);
  return stringValue ? stringValue.toLowerCase() : null;
}

function normalizeSymbol(value) {
  const stringValue = coerceString(value);
  return stringValue ? stringValue.trim().toUpperCase() : null;
}

function normalizeLaunchpad(tokenPayload, riskPayload) {
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

  if (candidates.some((value) => value.includes("flap") || value.includes("xflap"))) {
    return "flap";
  }

  return "unknown";
}

function extractNarrativeTags(tokenPayload) {
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
      .filter(Boolean)
      .filter((value) => !value.includes("fourmeme"))
      .filter((value) => !value.includes("flap"))
      .slice(0, 8)
  );
}

function findFirstNumber(input, keyCandidates) {
  const values = collectValuesForKeys(input, keyCandidates);
  for (const value of values) {
    const normalized = coerceNumber(value);
    if (normalized !== null) {
      return normalized;
    }
  }
  return null;
}

function classifyBuySizeBand(value) {
  if (value === null || value === undefined) {
    return "unknown";
  }
  if (value < 200) return "micro-ticket";
  if (value < 1000) return "small-ticket";
  if (value < 5000) return "medium-ticket";
  return "large-ticket";
}

function classifyMarketCapBand(value) {
  if (value === null || value === undefined) {
    return "unknown";
  }
  if (value < 100_000) return "nano";
  if (value < 1_000_000) return "microcap";
  if (value < 10_000_000) return "lowcap";
  if (value < 100_000_000) return "midcap";
  return "largecap";
}

function inferNameStyles(name, symbol, narratives) {
  const haystack = `${name || ""} ${symbol || ""}`.toLowerCase();
  const styles = [];

  if (/[\u4e00-\u9fff]/.test(name || "")) {
    styles.push("hanzi");
  }
  if (/[A-Z]{3,}/.test(symbol || "")) {
    styles.push("ticker-caps");
  }
  if (/\d/.test(haystack)) {
    styles.push("numbered");
  }
  if (haystack.includes("ai") || narratives.includes("ai")) {
    styles.push("ai");
  }
  if (
    haystack.includes("dog") ||
    haystack.includes("cat") ||
    haystack.includes("frog") ||
    haystack.includes("pepe") ||
    haystack.includes("shib") ||
    narratives.includes("animal")
  ) {
    styles.push("animal");
  }
  if (narratives.includes("community")) {
    styles.push("community");
  }
  if (styles.length === 0) {
    styles.push("plain");
  }

  return uniqueStrings(styles);
}

function parseIsoToEpoch(value) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function deriveHoldMinutes(openedAt, closedAt) {
  if (!openedAt || !closedAt) {
    return null;
  }

  const opened = Date.parse(openedAt);
  const closed = Date.parse(closedAt);
  if (Number.isNaN(opened) || Number.isNaN(closed) || closed < opened) {
    return null;
  }

  return Math.round((closed - opened) / 60_000);
}

function estimateUsdValue(primaryAmount, primaryPriceUsd, fallbackAmount, fallbackPriceUsd) {
  if (primaryAmount !== null && primaryPriceUsd !== null) {
    return Math.round(primaryAmount * primaryPriceUsd * 100) / 100;
  }
  if (fallbackAmount !== null && fallbackPriceUsd !== null) {
    return Math.round(fallbackAmount * fallbackPriceUsd * 100) / 100;
  }
  return null;
}

function isBaseAsset({ symbol }) {
  return Boolean(symbol && BASE_ASSET_SYMBOLS.has(symbol));
}

function buildTokenEvents(transaction) {
  const fromSymbol = normalizeSymbol(transaction.from_symbol);
  const toSymbol = normalizeSymbol(transaction.to_symbol);
  const fromAddress = normalizeAddress(transaction.from_address);
  const toAddress = normalizeAddress(transaction.to_address);
  const fromIsBase = isBaseAsset({ symbol: fromSymbol });
  const toIsBase = isBaseAsset({ symbol: toSymbol });
  const events = [];

  if (!toIsBase && (toAddress || toSymbol)) {
    events.push({
      side: "buy",
      tokenAddress: toAddress,
      symbol: toSymbol,
      time: coerceString(transaction.time),
      usdValue: estimateUsdValue(
        coerceNumber(transaction.to_amount),
        coerceNumber(transaction.to_price_usd),
        coerceNumber(transaction.from_amount),
        coerceNumber(transaction.from_price_usd)
      ),
    });
  }

  if (!fromIsBase && (fromAddress || fromSymbol)) {
    events.push({
      side: "sell",
      tokenAddress: fromAddress,
      symbol: fromSymbol,
      time: coerceString(transaction.time),
      usdValue: estimateUsdValue(
        coerceNumber(transaction.from_amount),
        coerceNumber(transaction.from_price_usd),
        coerceNumber(transaction.to_amount),
        coerceNumber(transaction.to_price_usd)
      ),
    });
  }

  return events;
}

function getTokenKey(event) {
  return event.tokenAddress ?? (event.symbol ? event.symbol.toLowerCase() : null);
}

function summarizeShares(counts, total) {
  if (!total) {
    return { fourmeme: 0, flap: 0 };
  }

  return {
    fourmeme: Number((counts.fourmeme / total).toFixed(2)),
    flap: Number((counts.flap / total).toFixed(2)),
  };
}

function median(values) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function pickTopKeys(counter, limit = 3) {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key]) => key);
}

function buildProfileSummary(driver) {
  const parts = [];
  if (driver.launchpadBias !== "unknown") {
    parts.push(`${driver.launchpadBias} 偏好`);
  }
  if (driver.holdDurationBias !== "unknown") {
    parts.push(`${driver.holdDurationBias} 持仓风格`);
  }
  if (driver.favoriteNarratives.length > 0) {
    parts.push(`常见叙事 ${driver.favoriteNarratives.slice(0, 3).join(" / ")}`);
  }
  if (driver.preferredBuySizeBand !== "unknown") {
    parts.push(`常用仓位 ${driver.preferredBuySizeBand}`);
  }
  return parts.join("，");
}

function buildEvidence(driver) {
  const evidence = [];
  evidence.push(`冻结样本数 ${driver.sampledTradeCount} 笔 meme 交易。`);

  if (driver.preferredCapBand !== "unknown") {
    evidence.push(`更常出现在 ${driver.preferredCapBand} 市值带。`);
  }

  if (driver.preferredNameStyles.length > 0) {
    evidence.push(`常见名字风格：${driver.preferredNameStyles.join(" / ")}。`);
  }

  if (driver.launchpadBias !== "unknown") {
    evidence.push(`Launchpad 偏好偏向 ${driver.launchpadBias}。`);
  }

  return evidence;
}

async function loadEnvFile() {
  const text = await fs.readFile(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function requestPayload(relativePath, allowNotFound = false) {
  const baseUrl = (process.env.AVE_DATA_BASE_URL || DEFAULT_AVE_BASE_URL).replace(/\/+$/, "");
  const maxAttempts = 4;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(`${baseUrl}${relativePath}`, {
      headers: {
        "X-API-KEY": process.env.AVE_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }

    if (allowNotFound && response.status === 404) {
      return null;
    }

    const retryable = response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504;
    if (!retryable || attempt === maxAttempts - 1) {
      throw new Error(`AVE request failed: ${relativePath} -> ${response.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }

  throw new Error(`AVE request failed: ${relativePath} -> exhausted retries`);
}

async function fetchTokenMeta(tokenAddress) {
  const tokenPayload = await requestPayload(`/v2/tokens/${tokenAddress}-bsc`, true);
  if (!tokenPayload) {
    return {
      tokenAddress,
      name: "Unknown Token",
      symbol: "UNKNOWN",
      launchpad: "unknown",
      narrativeTags: [],
      marketCapUsd: null,
      marketCapBand: "unknown",
      nameStyles: ["plain"],
    };
  }

  const riskPayload = await requestPayload(`/v2/contracts/${tokenAddress}-bsc`, true);
  const tokenNode =
    tokenPayload?.data?.token && isRecord(tokenPayload.data.token)
      ? tokenPayload.data.token
      : tokenPayload;

  const name =
    coerceString(tokenNode?.name) ||
    coerceString(tokenNode?.tokenName) ||
    coerceString(tokenNode?.symbol) ||
    "Unknown Token";
  const symbol =
    coerceString(tokenNode?.symbol) ||
    coerceString(tokenNode?.tokenSymbol) ||
    "UNKNOWN";
  const narrativeTags = extractNarrativeTags(tokenPayload);
  const launchpad = normalizeLaunchpad(tokenPayload, riskPayload);
  const marketCapUsd =
    findFirstNumber(tokenPayload, ["market_cap", "marketcap", "fdv"]) ??
    findFirstNumber(riskPayload, ["market_cap", "marketcap", "fdv"]);

  return {
    tokenAddress,
    name,
    symbol,
    launchpad,
    narrativeTags,
    marketCapUsd,
    marketCapBand: classifyMarketCapBand(marketCapUsd),
    nameStyles: inferNameStyles(name, symbol, narrativeTags),
  };
}

async function buildFrozenHistory(trackedAddress) {
  const payload = await requestPayload(
    `/v2/address/tx?wallet_address=${trackedAddress.address.toLowerCase()}&chain=bsc&page_size=${ADDRESS_HISTORY_PAGE_SIZE}`
  );
  const transactions = extractArrayPayload(payload);

  const rawEvents = transactions
    .flatMap((transaction) => buildTokenEvents(transaction))
    .sort((left, right) => parseIsoToEpoch(left.time) - parseIsoToEpoch(right.time));

  const uniqueTokenAddresses = uniqueStrings(
    rawEvents
      .map((event) => event.tokenAddress)
      .filter(Boolean)
  );

  const tokenMetaEntries = [];
  for (const tokenAddress of uniqueTokenAddresses) {
    tokenMetaEntries.push([tokenAddress, await fetchTokenMeta(tokenAddress)]);
  }
  const tokenMetaMap = new Map(
    tokenMetaEntries.filter((entry) => entry[1]).map(([tokenAddress, meta]) => [tokenAddress, meta])
  );

  const openBuys = new Map();
  const trades = [];
  const narrativeCounts = new Map();
  const capBandCounts = new Map();
  const nameStyleCounts = new Map();
  const buyAmounts = [];
  const holdMinutesValues = [];
  const launchpadCounts = { fourmeme: 0, flap: 0 };

  for (const event of rawEvents) {
    const key = getTokenKey(event);
    if (!key) continue;

    const meta = event.tokenAddress
      ? tokenMetaMap.get(event.tokenAddress) ?? {
          tokenAddress: event.tokenAddress,
          name: event.symbol || "Unknown Token",
          symbol: event.symbol || "UNKNOWN",
          launchpad: "unknown",
          narrativeTags: [],
          marketCapUsd: null,
          marketCapBand: "unknown",
          nameStyles: inferNameStyles(event.symbol || "Unknown Token", event.symbol || "UNKNOWN", []),
        }
      : {
          tokenAddress: null,
          name: event.symbol || "Unknown Token",
          symbol: event.symbol || "UNKNOWN",
          launchpad: "unknown",
          narrativeTags: [],
          marketCapUsd: null,
          marketCapBand: "unknown",
          nameStyles: inferNameStyles(event.symbol || "Unknown Token", event.symbol || "UNKNOWN", []),
        };

    if (event.side === "buy") {
      const queue = openBuys.get(key) ?? [];
      queue.push({ ...event, meta });
      openBuys.set(key, queue);
      continue;
    }

    const queue = openBuys.get(key) ?? [];
    const matchedBuy = queue.shift();
    if (queue.length > 0) {
      openBuys.set(key, queue);
    } else {
      openBuys.delete(key);
    }

    if (!matchedBuy) {
      continue;
    }

    const holdMinutes = deriveHoldMinutes(matchedBuy.time, event.time);
    const trade = {
      tokenAddress: meta.tokenAddress,
      symbol: meta.symbol,
      launchpad: meta.launchpad,
      narrativeTags: meta.narrativeTags,
      openedAt: matchedBuy.time,
      closedAt: event.time,
      holdMinutes,
      buyAmountUsd: matchedBuy.usdValue,
      sellAmountUsd: event.usdValue,
      roiPct:
        matchedBuy.usdValue && event.usdValue
          ? Number((((event.usdValue - matchedBuy.usdValue) / matchedBuy.usdValue) * 100).toFixed(2))
          : null,
    };
    trades.push(trade);

    if (matchedBuy.usdValue !== null) {
      buyAmounts.push(matchedBuy.usdValue);
    }
    if (holdMinutes !== null) {
      holdMinutesValues.push(holdMinutes);
    }
    if (meta.launchpad === "fourmeme" || meta.launchpad === "flap") {
      launchpadCounts[meta.launchpad] += 1;
    }
    for (const tag of meta.narrativeTags) {
      narrativeCounts.set(tag, (narrativeCounts.get(tag) ?? 0) + 1);
    }
    capBandCounts.set(meta.marketCapBand, (capBandCounts.get(meta.marketCapBand) ?? 0) + 1);
    for (const style of meta.nameStyles) {
      nameStyleCounts.set(style, (nameStyleCounts.get(style) ?? 0) + 1);
    }
  }

  for (const queue of openBuys.values()) {
    for (const openEvent of queue) {
      const meta = openEvent.meta;
      const trade = {
        tokenAddress: meta.tokenAddress,
        symbol: meta.symbol,
        launchpad: meta.launchpad,
        narrativeTags: meta.narrativeTags,
        openedAt: openEvent.time,
        closedAt: null,
        holdMinutes: null,
        buyAmountUsd: openEvent.usdValue,
        sellAmountUsd: null,
        roiPct: null,
      };
      trades.push(trade);
      if (openEvent.usdValue !== null) {
        buyAmounts.push(openEvent.usdValue);
      }
      if (meta.launchpad === "fourmeme" || meta.launchpad === "flap") {
        launchpadCounts[meta.launchpad] += 1;
      }
      for (const tag of meta.narrativeTags) {
        narrativeCounts.set(tag, (narrativeCounts.get(tag) ?? 0) + 1);
      }
      capBandCounts.set(meta.marketCapBand, (capBandCounts.get(meta.marketCapBand) ?? 0) + 1);
      for (const style of meta.nameStyles) {
        nameStyleCounts.set(style, (nameStyleCounts.get(style) ?? 0) + 1);
      }
    }
  }

  const dominantLaunchpad =
    launchpadCounts.fourmeme === 0 && launchpadCounts.flap === 0
      ? "unknown"
      : launchpadCounts.fourmeme >= launchpadCounts.flap
        ? "fourmeme"
        : "flap";
  const sampledTradeCount = trades.length;
  const medianHoldMinutes = median(holdMinutesValues);
  const tradingRhythm =
    sampledTradeCount >= 20 ? "high-frequency" : sampledTradeCount >= 8 ? "active" : "low-frequency";
  const riskAppetite =
    medianHoldMinutes !== null && medianHoldMinutes <= 120
      ? "aggressive"
      : medianHoldMinutes !== null && medianHoldMinutes <= 720
        ? "balanced"
        : "cautious";

  const driver = {
    id: trackedAddress.id,
    label: trackedAddress.label,
    address: trackedAddress.address.toLowerCase(),
    logoKey: trackedAddress.logoKey,
    logoMode: trackedAddress.logoMode,
    sampledAt: new Date().toISOString(),
    sampledTradeCount,
    sampledTransactionCount: transactions.length,
    preferredBuySizeBand: classifyBuySizeBand(median(buyAmounts)),
    preferredCapBand: pickTopKeys(capBandCounts, 1)[0] ?? "unknown",
    preferredNameStyles: pickTopKeys(nameStyleCounts, 3),
    favoriteNarratives: pickTopKeys(narrativeCounts, 5),
    holdDurationBias:
      medianHoldMinutes === null
        ? "unknown"
        : medianHoldMinutes <= 60
          ? "sniper"
          : medianHoldMinutes <= 360
            ? "scalper"
            : medianHoldMinutes <= 2880
              ? "swing-trader"
              : "holder",
    launchpadBias: dominantLaunchpad,
    launchpadShares: summarizeShares(launchpadCounts, launchpadCounts.fourmeme + launchpadCounts.flap),
    riskAppetite,
    tradingRhythm,
    history: {
      address: trackedAddress.address.toLowerCase(),
      chain: "bsc",
      source: "ave:/v2/address/tx:frozen-driver-200",
      trades,
    },
  };

  return {
    ...driver,
    profileSummary: buildProfileSummary(driver),
    evidence: buildEvidence(driver),
  };
}

async function main() {
  await loadEnvFile();

  if (!process.env.AVE_API_KEY) {
    throw new Error("AVE_API_KEY missing in apps/web/.env.local");
  }

  const trackedAddresses = JSON.parse(await fs.readFile(trackedAddressesPath, "utf8"));
  const enabledTrackedAddresses = trackedAddresses.filter((item) => item.enabled);

  const drivers = [];
  for (const trackedAddress of enabledTrackedAddresses) {
    console.log(`Generating frozen driver for ${trackedAddress.label}...`);
    drivers.push(await buildFrozenHistory(trackedAddress));
  }

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: {
      provider: "AVE",
      window: "latest-200-meme-trades",
      frozen: true,
      updates: "manual-regeneration-only",
    },
    drivers,
  };

  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
