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
const POOL_FILE = path.join(WEB_ROOT, ".runtime", "strategy-candidate-pool.json");

const MAX_POOL_SIZE = 200;

function ensureDir(): void {
  const dir = path.dirname(POOL_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readPool(): string[] {
  try {
    if (!fs.existsSync(POOL_FILE)) return [];
    const raw = fs.readFileSync(POOL_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v: unknown) => typeof v === "string");
  } catch {
    return [];
  }
}

function writePool(addresses: string[]): void {
  try {
    ensureDir();
    fs.writeFileSync(POOL_FILE, JSON.stringify(addresses, null, 2), "utf-8");
  } catch {
    // non-critical
  }
}

/**
 * Load all token addresses from the persistent candidate pool.
 * These are tokens previously scored successfully via /api/score-token.
 */
export function loadCandidatePool(): string[] {
  return readPool();
}

/**
 * Add a token address to the candidate pool. Deduplicates automatically.
 * Called when /api/score-token successfully scores a token.
 */
export function addToCandidatePool(tokenAddress: string): void {
  const lower = tokenAddress.toLowerCase().trim();
  if (!lower) return;

  const pool = readPool();
  if (pool.includes(lower)) return;

  pool.push(lower);
  // Evict oldest entries if over limit
  const trimmed = pool.slice(-MAX_POOL_SIZE);
  writePool(trimmed);
}
