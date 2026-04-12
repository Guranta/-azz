import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import type { CredentialStatus } from "@meme-affinity/core";

// ---------- Schema ----------

const TABLE_NAME = "trade_credentials";

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
  assets_id        TEXT PRIMARY KEY,
  binding_code     TEXT NOT NULL UNIQUE,
  encrypted_api_key   TEXT NOT NULL,
  encrypted_api_secret TEXT NOT NULL,
  base_url         TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'active',
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
`;

// ---------- DB singleton ----------

let _db: Database.Database | null = null;

function getDbPath(): string {
  const base =
    process.env.CREDENTIAL_DB_PATH?.trim() ||
    path.join(process.cwd(), ".runtime", "trade-credentials.db");
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

interface CredentialRow {
  assets_id: string;
  binding_code: string;
  encrypted_api_key: string;
  encrypted_api_secret: string;
  base_url: string;
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

export interface StoredCredential {
  assetsId: string;
  bindingCode: string;
  encryptedApiKey: string;
  encryptedApiSecret: string;
  baseUrl: string;
  status: CredentialStatus;
  createdAt: string;
  updatedAt: string;
}

function rowToCredential(row: CredentialRow): StoredCredential {
  return {
    assetsId: row.assets_id,
    bindingCode: row.binding_code,
    encryptedApiKey: row.encrypted_api_key,
    encryptedApiSecret: row.encrypted_api_secret,
    baseUrl: row.base_url,
    status: row.status as CredentialStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Insert or update a credential record.
 * If the assetsId already exists, it updates the encrypted fields and baseUrl.
 */
export function upsertCredential(params: {
  assetsId: string;
  encryptedApiKey: string;
  encryptedApiSecret: string;
  baseUrl: string;
  status?: CredentialStatus;
}): StoredCredential {
  const db = openDb();
  const now = nowIso();

  const existing = db
    .prepare(`SELECT binding_code FROM ${TABLE_NAME} WHERE assets_id = ?`)
    .get(params.assetsId) as { binding_code: string } | undefined;

  const bindingCode = existing?.binding_code || generateBindingCode();
  const status = params.status || "active";

  db.prepare(
    `INSERT INTO ${TABLE_NAME} (assets_id, binding_code, encrypted_api_key, encrypted_api_secret, base_url, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(assets_id) DO UPDATE SET
       encrypted_api_key = excluded.encrypted_api_key,
       encrypted_api_secret = excluded.encrypted_api_secret,
       base_url = excluded.base_url,
       status = excluded.status,
       updated_at = excluded.updated_at
    `
  ).run(
    params.assetsId,
    bindingCode,
    params.encryptedApiKey,
    params.encryptedApiSecret,
    params.baseUrl,
    status,
    now,
    now
  );

  const row = db
    .prepare(`SELECT * FROM ${TABLE_NAME} WHERE assets_id = ?`)
    .get(params.assetsId) as CredentialRow;

  return rowToCredential(row);
}

export function getCredentialByAssetsId(assetsId: string): StoredCredential | null {
  const db = openDb();
  const row = db
    .prepare(`SELECT * FROM ${TABLE_NAME} WHERE assets_id = ?`)
    .get(assetsId) as CredentialRow | undefined;
  return row ? rowToCredential(row) : null;
}

export function getCredentialByBindingCode(bindingCode: string): StoredCredential | null {
  const db = openDb();
  const row = db
    .prepare(`SELECT * FROM ${TABLE_NAME} WHERE binding_code = ?`)
    .get(bindingCode) as CredentialRow | undefined;
  return row ? rowToCredential(row) : null;
}

export function deleteCredential(assetsId: string): boolean {
  const db = openDb();
  const result = db
    .prepare(`DELETE FROM ${TABLE_NAME} WHERE assets_id = ?`)
    .run(assetsId);
  return result.changes > 0;
}

export function disableCredential(assetsId: string): boolean {
  const db = openDb();
  const result = db
    .prepare(
      `UPDATE ${TABLE_NAME} SET status = 'disabled', updated_at = ? WHERE assets_id = ?`
    )
    .run(nowIso(), assetsId);
  return result.changes > 0;
}
