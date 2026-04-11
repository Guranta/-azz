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

export interface AveMetrics {
  tokenDetailCount: number;
  riskCount: number;
  top100Count: number;
  addressTxCount: number;
  smartWalletListCount: number;
  totalCount: number;
  lastUpdated: string;
}

const METRICS_FILE = path.join(
  WEB_ROOT,
  ".runtime",
  "ave-metrics.json"
);

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

let writeChain: Promise<void> = Promise.resolve();

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readMetricsFromFile(): AveMetrics | null {
  try {
    if (!fs.existsSync(METRICS_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(METRICS_FILE, "utf-8");
    return JSON.parse(raw) as AveMetrics;
  } catch {
    return null;
  }
}

function normalizeMetrics(input: Partial<AveMetrics> | null): AveMetrics {
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

function writeMetricsSnapshotToFile(metrics: AveMetrics): void {
  try {
    ensureDir(METRICS_SNAPSHOT_FILE);
    fs.writeFileSync(
      METRICS_SNAPSHOT_FILE,
      JSON.stringify(metrics, null, 2),
      "utf-8"
    );
  } catch {
    // Silently fail
  }
}

function runSerialized<T>(operation: () => T | Promise<T>): Promise<T> {
  const next = writeChain.then(operation, operation);
  writeChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

function incrementMetrics(metricKey: MetricsKey): void {
  void runSerialized(() => {
    const current = normalizeMetrics(readMetricsFromFile());
    current[metricKey] += 1;
    current.totalCount += 1;
    current.lastUpdated = new Date().toISOString();
    writeMetricsToFile(current);
  });
}

function writeMetricsToFile(metrics: AveMetrics): void {
  try {
    ensureDir(METRICS_FILE);
    fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2), "utf-8");
  } catch {
    // Silently fail - metrics should not crash the app
  }
}

export function getInitialMetrics(): AveMetrics {
  const persisted = readMetricsFromFile();
  if (persisted) {
    return normalizeMetrics(persisted);
  }
  return normalizeMetrics(null);
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
      return normalizeMetrics(readMetricsFromFile());
    },
    getSnapshot(): AveMetrics {
      try {
        if (!fs.existsSync(METRICS_SNAPSHOT_FILE)) {
          return this.refreshSnapshot();
        }
        const raw = fs.readFileSync(METRICS_SNAPSHOT_FILE, "utf-8");
        const snapshot = normalizeMetrics(JSON.parse(raw) as Partial<AveMetrics>);
        const snapshotTime = new Date(snapshot.lastUpdated).getTime();
        if (Date.now() - snapshotTime > METRICS_SNAPSHOT_TTL_MS) {
          return this.refreshSnapshot();
        }
        return snapshot;
      } catch {
        return this.refreshSnapshot();
      }
    },
    refreshSnapshot(): AveMetrics {
      const snapshot = normalizeMetrics(readMetricsFromFile());
      writeMetricsSnapshotToFile(snapshot);
      return snapshot;
    },
  };
}

export type AveMetricsRecorder = ReturnType<typeof createMetricsRecorder>;
