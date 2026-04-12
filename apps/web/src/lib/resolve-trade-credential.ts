import {
  getCredentialByBindingCode,
} from "./credential-store";
import { decrypt } from "./credential-crypto";
import { createAveBotClient, createAveBotClientFromEnv, AveBotClient } from "./ave-bot-client";

export interface ResolvedCredential {
  assetsId: string;
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

/**
 * Resolve a per-user credential from the store by bindingCode.
 * Returns null if not found or not active.
 */
export function resolveCredential(params: {
  bindingCode: string;
}): ResolvedCredential | null {
  const cred = getCredentialByBindingCode(params.bindingCode);

  if (!cred || cred.status !== "active") {
    return null;
  }

  return {
    assetsId: cred.assetsId,
    apiKey: decrypt(cred.encryptedApiKey),
    apiSecret: decrypt(cred.encryptedApiSecret),
    baseUrl: cred.baseUrl,
  };
}

/**
 * Build an AveBotClient.
 *
 * V4 path: bindingCode → per-user credential store (no fallback).
 * V3 path: assetsId-only → env-based global client (legacy).
 *
 * These two paths are deliberately separate — V4 never falls through to env.
 */
export function resolveAveBotClient(params: {
  assetsId?: string;
  bindingCode?: string;
}): { client: AveBotClient; assetsId: string; source: "per-user" | "env" } | null {
  // V4: bindingCode → per-user only
  if (params.bindingCode) {
    const resolved = resolveCredential({ bindingCode: params.bindingCode });
    if (!resolved) {
      return null;
    }
    const client = createAveBotClient({
      apiKey: resolved.apiKey,
      apiSecret: resolved.apiSecret,
      baseUrl: resolved.baseUrl || undefined,
    });
    return { client, assetsId: resolved.assetsId, source: "per-user" };
  }

  // V3: assetsId-only → env fallback (legacy)
  if (params.assetsId) {
    try {
      const client = createAveBotClientFromEnv();
      return { client, assetsId: params.assetsId, source: "env" };
    } catch {
      return null;
    }
  }

  return null;
}
