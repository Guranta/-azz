import * as fs from "fs";
import * as path from "path";

function resolveWebRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "src", "app"))) {
    return cwd;
  }
  return path.join(cwd, "apps", "web");
}

const WEB_ROOT = resolveWebRoot();

// Historical AVE calls that happened before the runtime file counter was added.
// With the current runtime file total (1,594), this makes the public total 57,285.
const AVE_HISTORICAL_TOTAL_COUNT = 55_691;

interface StoredAveMetrics {
  tokenDetailCount: number;
  riskCount: number;
  top100Count: number;
  addressTxCount: number;
  smartWalletListCount: number;
  totalCount: number;
  lastUpdated: string;
}

export interface AveMetrics extends StoredAveMetrics {
  runtimeTotalCount: number;
  historicalTotalCount: number;
}

const METRICS_FILE = path.join(WEB_ROOT, ".runtime", "ave-metrics.json");

const METRICS_SNAPSHOT_FILE = path.join(
  WEB_ROOT,
  ".runtime",
  "ave-metrics-snapshot.json"
);

const METRICS_SNAPSHOT_TTL_MS = 60 * 60 * 1000;

type MetricsKey =
  | "tokenDetailCount"
  | "riskCount"
  | "top100Count"
  | "addressTxCount"
  | "smartWalletListCount";

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function normalizeStoredMetrics(
  input: Partial<StoredAveMetrics> | null
): StoredAveMetrics {
  return {
    tokenDetailCount: Math.max(0, Number(input?.tokenDetailCount ?? 0) || 0),
    riskCount: Math.max(0, Number(input?.riskCount ?? 0) || 0),
    top100Count: Math.max(0, Number(input?.top100Count ?? 0) || 0),
    addressTxCount: Math.max(0, Number(input?.addressTxCount ?? 0) || 0),
    smartWalletListCount: Math.max(0, Number(input?.smartWalletListCount ?? 0) || 0),
    totalCount: Math.max(0, Number(input?.totalCount ?? 0) || 0),
    lastUpdated:
      typeof input?.lastUpdated === "string" && input.lastUpdated
        ? input.lastUpdated
        : new Date().toISOString(),
  };
}

function toPublicMetrics(stored: StoredAveMetrics): AveMetrics {
  const runtimeTotalCount = stored.totalCount;

  return {
    ...stored,
    runtimeTotalCount,
    historicalTotalCount: AVE_HISTORICAL_TOTAL_COUNT,
    totalCount: runtimeTotalCount + AVE_HISTORICAL_TOTAL_COUNT,
  };
}

function normalizePublicMetrics(input: Partial<AveMetrics> | null): AveMetrics {
  const runtimeTotalCountValue = input?.runtimeTotalCount;
  const historicalTotalCountValue = input?.historicalTotalCount;
  const hasRuntimeTotalCount =
    typeof runtimeTotalCountValue === "number" &&
    Number.isFinite(runtimeTotalCountValue);
  const hasHistoricalTotalCount =
    typeof historicalTotalCountValue === "number" &&
    Number.isFinite(historicalTotalCountValue);

  const runtimeTotalCount = hasRuntimeTotalCount
    ? Math.max(0, runtimeTotalCountValue)
    : Math.max(0, Number(input?.totalCount ?? 0) || 0);
  const historicalTotalCount = hasHistoricalTotalCount
    ? Math.max(0, historicalTotalCountValue)
    : AVE_HISTORICAL_TOTAL_COUNT;

  return {
    tokenDetailCount: Math.max(0, Number(input?.tokenDetailCount ?? 0) || 0),
    riskCount: Math.max(0, Number(input?.riskCount ?? 0) || 0),
    top100Count: Math.max(0, Number(input?.top100Count ?? 0) || 0),
    addressTxCount: Math.max(0, Number(input?.addressTxCount ?? 0) || 0),
    smartWalletListCount: Math.max(0, Number(input?.smartWalletListCount ?? 0) || 0),
    runtimeTotalCount,
    historicalTotalCount,
    totalCount: runtimeTotalCount + historicalTotalCount,
    lastUpdated:
      typeof input?.lastUpdated === "string" && input.lastUpdated
        ? input.lastUpdated
        : new Date().toISOString(),
  };
}

function readStoredMetricsFromFile(): StoredAveMetrics | null {
  try {
    if (!fs.existsSync(METRICS_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(METRICS_FILE, "utf-8");
    return normalizeStoredMetrics(JSON.parse(raw) as Partial<StoredAveMetrics>);
  } catch {
    return null;
  }
}

function readSnapshotFromFile(): AveMetrics | null {
  try {
    if (!fs.existsSync(METRICS_SNAPSHOT_FILE)) {
      return null;
    }

    const raw = fs.readFileSync(METRICS_SNAPSHOT_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AveMetrics>;

    if (typeof parsed.runtimeTotalCount !== "number") {
      return null;
    }

    return normalizePublicMetrics(parsed);
  } catch {
    return null;
  }
}

function writeStoredMetricsToFile(metrics: StoredAveMetrics): void {
  try {
    ensureDir(METRICS_FILE);
    fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2), "utf-8");
  } catch {
    // Silently fail - metrics should not crash the app.
  }
}

function writeMetricsSnapshotToFile(metrics: AveMetrics): void {
  try {
    ensureDir(METRICS_SNAPSHOT_FILE);
    fs.writeFileSync(
      METRICS_SNAPSHOT_FILE,
      JSON.stringify(metrics, null, 2),
      "utf-8"
    );
  } catch {
    // Silently fail - snapshotting should not crash the app.
  }
}

function getStoredMetrics(): StoredAveMetrics {
  return normalizeStoredMetrics(readStoredMetricsFromFile());
}

function getPublicMetrics(): AveMetrics {
  return toPublicMetrics(getStoredMetrics());
}

function incrementMetrics(metricKey: MetricsKey): void {
  const current = getStoredMetrics();
  current[metricKey] += 1;
  current.totalCount += 1;
  current.lastUpdated = new Date().toISOString();
  writeStoredMetricsToFile(current);
}

export function getAveMetrics(): AveMetrics {
  return getPublicMetrics();
}

export function getInitialMetrics(): AveMetrics {
  return getPublicMetrics();
}

export function createMetricsRecorder() {
  return {
    recordTokenDetail() {
      incrementMetrics("tokenDetailCount");
    },
    recordRisk() {
      incrementMetrics("riskCount");
    },
    recordTop100() {
      incrementMetrics("top100Count");
    },
    recordAddressTx() {
      incrementMetrics("addressTxCount");
    },
    recordSmartWalletList() {
      incrementMetrics("smartWalletListCount");
    },
    getMetrics(): AveMetrics {
      return getPublicMetrics();
    },
    getSnapshot(): AveMetrics {
      const snapshot = readSnapshotFromFile();
      if (!snapshot) {
        return this.refreshSnapshot();
      }

      const snapshotTime = new Date(snapshot.lastUpdated).getTime();
      if (!Number.isFinite(snapshotTime)) {
        return this.refreshSnapshot();
      }

      if (Date.now() - snapshotTime > METRICS_SNAPSHOT_TTL_MS) {
        return this.refreshSnapshot();
      }

      return snapshot;
    },
    refreshSnapshot(): AveMetrics {
      const snapshot = getPublicMetrics();
      writeMetricsSnapshotToFile(snapshot);
      return snapshot;
    },
  };
}

export type AveMetricsRecorder = ReturnType<typeof createMetricsRecorder>;
