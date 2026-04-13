import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";
import type {
  StrategySnapshot,
  StrategyEquityPoint,
  StrategyId,
} from "@meme-affinity/core";

function resolveWebRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "src", "app"))) {
    return cwd;
  }
  return path.join(cwd, "apps", "web");
}

const WEB_ROOT = resolveWebRoot();
const DB_PATH = path.join(WEB_ROOT, ".runtime", "strategy-snapshots.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("busy_timeout = 5000");
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS strategy_snapshots (
      strategy_id TEXT PRIMARY KEY,
      strategy_name TEXT NOT NULL,
      cash_usd REAL NOT NULL,
      holdings_json TEXT NOT NULL DEFAULT '[]',
      trades_json TEXT NOT NULL DEFAULT '[]',
      latest_draft_json TEXT NOT NULL DEFAULT '{}',
      equity_usd REAL NOT NULL DEFAULT 0,
      total_pnl_pct REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ok'
    );

    CREATE TABLE IF NOT EXISTS strategy_equity_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      strategy_id TEXT NOT NULL,
      point_at TEXT NOT NULL,
      equity_usd REAL NOT NULL,
      UNIQUE(strategy_id, point_at)
    );

    CREATE INDEX IF NOT EXISTS idx_equity_strategy_point
      ON strategy_equity_points(strategy_id, point_at);
  `);
}

// --- Reads ---

export function loadSnapshots(): StrategySnapshot[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM strategy_snapshots").all() as Row[];
  return rows.map(row => ({
    strategyId: row.strategy_id as StrategyId,
    strategyName: row.strategy_name,
    cashUsd: row.cash_usd,
    holdings: JSON.parse(row.holdings_json),
    recentTrades: JSON.parse(row.trades_json),
    latestDraft: JSON.parse(row.latest_draft_json),
    equityUsd: row.equity_usd,
    totalPnlPct: row.total_pnl_pct,
    updatedAt: row.updated_at,
    status: row.status as StrategySnapshot["status"],
  }));
}

export function loadEquityPoints(strategyId?: StrategyId): StrategyEquityPoint[] {
  const db = getDb();
  if (strategyId) {
    const rows = db.prepare(
      "SELECT * FROM strategy_equity_points WHERE strategy_id = ? ORDER BY point_at ASC"
    ).all(strategyId) as EqRow[];
    return rows.map(r => ({ strategyId: r.strategy_id as StrategyId, pointAt: r.point_at, equityUsd: r.equity_usd }));
  }
  const rows = db.prepare(
    "SELECT * FROM strategy_equity_points ORDER BY point_at ASC"
  ).all() as EqRow[];
  return rows.map(r => ({ strategyId: r.strategy_id as StrategyId, pointAt: r.point_at, equityUsd: r.equity_usd }));
}

// --- Writes ---

export function saveSnapshot(snap: StrategySnapshot): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO strategy_snapshots (strategy_id, strategy_name, cash_usd, holdings_json, trades_json, latest_draft_json, equity_usd, total_pnl_pct, updated_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(strategy_id) DO UPDATE SET
      strategy_name=excluded.strategy_name,
      cash_usd=excluded.cash_usd,
      holdings_json=excluded.holdings_json,
      trades_json=excluded.trades_json,
      latest_draft_json=excluded.latest_draft_json,
      equity_usd=excluded.equity_usd,
      total_pnl_pct=excluded.total_pnl_pct,
      updated_at=excluded.updated_at,
      status=excluded.status
  `).run(
    snap.strategyId,
    snap.strategyName,
    snap.cashUsd,
    JSON.stringify(snap.holdings),
    JSON.stringify(snap.recentTrades.slice(-20)),
    JSON.stringify(snap.latestDraft),
    snap.equityUsd,
    snap.totalPnlPct,
    snap.updatedAt,
    snap.status,
  );
}

export function saveEquityPoint(point: StrategyEquityPoint): void {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO strategy_equity_points (strategy_id, point_at, equity_usd)
    VALUES (?, ?, ?)
  `).run(point.strategyId, point.pointAt, point.equityUsd);
}

export function getLatestRefreshAt(): string | null {
  const db = getDb();
  const row = db.prepare("SELECT MAX(updated_at) as ts FROM strategy_snapshots").get() as { ts: string | null } | undefined;
  return row?.ts ?? null;
}

export type RefreshStatus = "ok" | "stale" | "never";

const STALE_THRESHOLD_MS = 15 * 60 * 1000;

export function computeRefreshStatus(lastRefreshAt: string | null): RefreshStatus {
  if (!lastRefreshAt) return "never";
  const ageMs = Date.now() - new Date(lastRefreshAt).getTime();
  return ageMs > STALE_THRESHOLD_MS ? "stale" : "ok";
}

type Row = {
  strategy_id: string;
  strategy_name: string;
  cash_usd: number;
  holdings_json: string;
  trades_json: string;
  latest_draft_json: string;
  equity_usd: number;
  total_pnl_pct: number;
  updated_at: string;
  status: string;
};

type EqRow = {
  strategy_id: string;
  point_at: string;
  equity_usd: number;
};
