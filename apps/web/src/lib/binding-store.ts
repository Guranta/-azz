import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import type { BindingStatus } from "@meme-affinity/core";

// ---------- Schema ----------

const TABLE_NAME = "wallet_bindings";

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
  assets_id        TEXT PRIMARY KEY,
  wallet_address   TEXT NOT NULL,
  binding_code     TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'active',
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
`;

// ---------- DB singleton ----------

let _db: Database.Database | null = null;

function getDbPath(): string {
  const base =
    process.env.BINDING_DB_PATH?.trim() ||
    path.join(process.cwd(), ".runtime", "trade-bindings.db");
  return base;
}

function openDb(): Database.Database {
  if (_db) return _db;

  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  _db.exec(CREATE_TABLE_SQL);

  return _db;
}

// ---------- Row shape ----------

interface BindingRow {
  assets_id: string;
  wallet_address: string;
  binding_code: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ---------- Helpers ----------

function generateBindingCode(): string {
  return crypto.randomBytes(16).toString("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------- Public API ----------

export interface StoredBinding {
  assetsId: string;
  walletAddress: string;
  bindingCode: string;
  status: BindingStatus;
  createdAt: string;
  updatedAt: string;
}

function rowToBinding(row: BindingRow): StoredBinding {
  return {
    assetsId: row.assets_id,
    walletAddress: row.wallet_address,
    bindingCode: row.binding_code,
    status: row.status as BindingStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Insert a new wallet binding record.
 * Called after wallet generation succeeds.
 */
export function insertBinding(params: {
  assetsId: string;
  walletAddress: string;
}): StoredBinding {
  const db = openDb();
  const now = nowIso();
  const bindingCode = generateBindingCode();

  db.prepare(
    `INSERT INTO ${TABLE_NAME} (assets_id, wallet_address, binding_code, status, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, ?)`
  ).run(params.assetsId, params.walletAddress, bindingCode, now, now);

  const row = db
    .prepare(`SELECT * FROM ${TABLE_NAME} WHERE assets_id = ?`)
    .get(params.assetsId) as BindingRow;

  return rowToBinding(row);
}

export function getBindingByAssetsId(assetsId: string): StoredBinding | null {
  const db = openDb();
  const row = db
    .prepare(`SELECT * FROM ${TABLE_NAME} WHERE assets_id = ?`)
    .get(assetsId) as BindingRow | undefined;
  return row ? rowToBinding(row) : null;
}

export function getBindingByBindingCode(bindingCode: string): StoredBinding | null {
  const db = openDb();
  const row = db
    .prepare(`SELECT * FROM ${TABLE_NAME} WHERE binding_code = ?`)
    .get(bindingCode) as BindingRow | undefined;
  return row ? rowToBinding(row) : null;
}

export function getBindingByWalletAddress(walletAddress: string): StoredBinding | null {
  const db = openDb();
  const row = db
    .prepare(`SELECT * FROM ${TABLE_NAME} WHERE wallet_address = ?`)
    .get(walletAddress) as BindingRow | undefined;
  return row ? rowToBinding(row) : null;
}

export function disableBinding(assetsId: string): boolean {
  const db = openDb();
  const result = db
    .prepare(
      `UPDATE ${TABLE_NAME} SET status = 'disabled', updated_at = ? WHERE assets_id = ?`
    )
    .run(nowIso(), assetsId);
  return result.changes > 0;
}
