import { refreshAllStrategies } from "@/lib/strategy-engine";
import { getLatestRefreshAt } from "@/lib/strategy-db";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes — triggers ensureFresh

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let running = false;
let initialized = false;

async function safeRefresh(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await refreshAllStrategies();
  } catch (err) {
    console.error("[strategy-scheduler] refresh error:", err);
  } finally {
    running = false;
  }
}

function isStale(): boolean {
  const lastRefresh = getLatestRefreshAt();
  if (!lastRefresh) return true;
  return Date.now() - new Date(lastRefresh).getTime() > STALE_THRESHOLD_MS;
}

/**
 * Start the 10-minute background interval. Safe to call multiple times;
 * duplicates are ignored.
 */
export function startScheduler(): void {
  if (initialized) return;
  initialized = true;

  intervalHandle = setInterval(() => {
    void safeRefresh();
  }, REFRESH_INTERVAL_MS);

  // Don't prevent Node from exiting
  if (intervalHandle && typeof intervalHandle === "object" && "unref" in intervalHandle) {
    intervalHandle.unref();
  }

  console.log("[strategy-scheduler] started — interval: 10 min");
}

/**
 * Ensure fresh data. Called on first page/API access.
 * Only refreshes if data is stale or missing.
 */
export async function ensureFresh(): Promise<void> {
  if (!initialized) {
    startScheduler();
  }
  if (isStale()) {
    await safeRefresh();
  }
}
