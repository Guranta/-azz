import * as fs from "fs";
import * as path from "path";
import type { AveSmartWallet } from "@meme-affinity/core";

function resolveWebRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "src", "app"))) {
    return cwd;
  }
  return path.join(cwd, "apps", "web");
}

const WEB_ROOT = resolveWebRoot();

export type SmartMoneyLaunchpadBias = "fourmeme" | "flap" | "mixed";

export interface SmartMoneySnapshotWalletEntry {
  address: string;
  tag: string | null;
  totalProfit: number | null;
  recentTradeCount: number;
  dominantNarratives: string[];
  launchpadBias: SmartMoneyLaunchpadBias;
  summary: string;
}

export interface SmartMoneySnapshot {
  addresses: string[];
  walletMap: Record<string, AveSmartWallet>;
  wallets: SmartMoneySnapshotWalletEntry[];
  generatedAt: string;
  builtAt: string;
  expiresAt: string;
}

export interface BuildSmartMoneySnapshotInput {
  wallets: AveSmartWallet[];
  analyzeWallet: (
    wallet: AveSmartWallet
  ) => Promise<SmartMoneySnapshotWalletEntry | null>;
  maxWallets?: number;
}

const SNAPSHOT_FILE = path.join(
  WEB_ROOT,
  ".runtime",
  "smartmoney-snapshot.json"
);

const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readSnapshotFromFile(): SmartMoneySnapshot | null {
  try {
    if (!fs.existsSync(SNAPSHOT_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(SNAPSHOT_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<SmartMoneySnapshot>;
    const generatedAt =
      typeof parsed.generatedAt === "string"
        ? parsed.generatedAt
        : typeof parsed.builtAt === "string"
          ? parsed.builtAt
          : new Date(0).toISOString();

    if (!Array.isArray(parsed.addresses) || !parsed.walletMap) {
      return null;
    }

    const wallets = Array.isArray(parsed.wallets)
      ? parsed.wallets.filter(
          (wallet): wallet is SmartMoneySnapshotWalletEntry => {
            return (
              typeof wallet === "object" &&
              wallet !== null &&
              typeof wallet.address === "string" &&
              typeof wallet.recentTradeCount === "number" &&
              Array.isArray(wallet.dominantNarratives) &&
              (wallet.launchpadBias === "fourmeme" ||
                wallet.launchpadBias === "flap" ||
                wallet.launchpadBias === "mixed")
            );
          }
        )
      : [];

    return {
      addresses: parsed.addresses,
      walletMap: parsed.walletMap,
      wallets,
      generatedAt,
      builtAt: generatedAt,
      expiresAt:
        typeof parsed.expiresAt === "string"
          ? parsed.expiresAt
          : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

function writeSnapshotToFile(snapshot: SmartMoneySnapshot): void {
  try {
    ensureDir(SNAPSHOT_FILE);
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
  } catch {
    // Silently fail - snapshot should not crash the app
  }
}

export function isSnapshotValid(snapshot: SmartMoneySnapshot | null): boolean {
  if (!snapshot) {
    return false;
  }
  const expiresAt = new Date(snapshot.expiresAt).getTime();
  return Date.now() < expiresAt;
}

export function getSnapshot(): SmartMoneySnapshot | null {
  return readSnapshotFromFile();
}

export function saveSnapshot(snapshot: SmartMoneySnapshot): void {
  writeSnapshotToFile(snapshot);
}

export async function buildSnapshot(
  input: BuildSmartMoneySnapshotInput
): Promise<SmartMoneySnapshot> {
  const maxWallets = Math.max(1, input.maxWallets ?? 30);
  const rankedWallets = [...input.wallets]
    .sort((a, b) => {
      const profitA = a.totalProfit ?? 0;
      const profitB = b.totalProfit ?? 0;
      return profitB - profitA;
    });

  const qualifiedWallets: AveSmartWallet[] = [];
  const qualifiedWalletEntries: SmartMoneySnapshotWalletEntry[] = [];
  for (const wallet of rankedWallets) {
    if (!wallet.address) {
      continue;
    }

    try {
      const analyzed = await input.analyzeWallet(wallet);
      if (analyzed) {
        qualifiedWallets.push(wallet);
        qualifiedWalletEntries.push(analyzed);
      }
    } catch {
      continue;
    }

    if (qualifiedWallets.length >= maxWallets) {
      break;
    }
  }

  const addresses = qualifiedWallets.map((wallet) => wallet.address.toLowerCase());
  const walletMap: Record<string, AveSmartWallet> = {};
  for (const wallet of qualifiedWallets) {
    walletMap[wallet.address.toLowerCase()] = wallet;
  }

  const now = Date.now();
  const generatedAt = new Date(now).toISOString();
  const snapshot: SmartMoneySnapshot = {
    addresses,
    walletMap,
    wallets: qualifiedWalletEntries,
    generatedAt,
    builtAt: generatedAt,
    expiresAt: new Date(now + SNAPSHOT_TTL_MS).toISOString(),
  };

  saveSnapshot(snapshot);
  return snapshot;
}

export type { AveSmartWallet };
