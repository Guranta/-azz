import { NextResponse } from "next/server";
import { encrypt, decrypt, maskApiKey } from "@/lib/credential-crypto";
import { upsertCredential, getCredentialByBindingCode, deleteCredential } from "@/lib/credential-store";
import { createAveBotClient, AveBotApiError } from "@/lib/ave-bot-client";
import type { CreateTradeConfigResponse, GetTradeConfigResponse, DeleteTradeConfigResponse } from "@meme-affinity/core";

// ---------- POST /api/trade/config ----------
//
// V4 onboarding entry point. Two modes:
//
// 1) assetsId provided — user already has a wallet on AVE.
//    Validate key/secret against that assetsId, then encrypt & store.
//
// 2) assetsId omitted — new user, no wallet yet.
//    Generate a wallet using the user's own API key/secret (NOT the
//    global env key), then encrypt & store with the new assetsId.
//
// Neither mode touches wallet/generate (V3 legacy global-env route).
// The V4 wallet generation happens here, inside the per-user client.

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    assetsId?: string;
    apiKey?: string;
    apiSecret?: string;
    baseUrl?: string;
  } | null;

  const assetsId = body?.assetsId?.trim() || "";
  const apiKey = body?.apiKey?.trim();
  const apiSecret = body?.apiSecret?.trim();
  const baseUrl = body?.baseUrl?.trim() || "";

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "apiKey and apiSecret are required" },
      { status: 400 }
    );
  }

  // Build a per-user AVE client using the caller's own key/secret
  const client = createAveBotClient({
    apiKey,
    apiSecret,
    baseUrl: baseUrl || undefined,
  });

  let resolvedAssetsId = assetsId;
  let walletAddress: string | undefined;

  try {
    if (resolvedAssetsId) {
      // Mode 1: validate existing wallet
      const wallet = await client.getWalletByAssetsId(resolvedAssetsId);
      walletAddress = wallet.address;
    } else {
      // Mode 2: generate wallet under the user's own AVE account
      const gen = await client.generateWallet();
      resolvedAssetsId = gen.assetsId;
      walletAddress = gen.address;
    }
  } catch (error) {
    if (error instanceof AveBotApiError) {
      return NextResponse.json(
        { error: `Credential validation failed: ${error.message}` },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Credential validation failed: unable to reach AVE Bot API" },
      { status: 502 }
    );
  }

  // Encrypt and store
  const encryptedApiKey = encrypt(apiKey);
  const encryptedApiSecret = encrypt(apiSecret);

  const stored = upsertCredential({
    assetsId: resolvedAssetsId,
    encryptedApiKey,
    encryptedApiSecret,
    baseUrl,
  });

  const response: CreateTradeConfigResponse = {
    assetsId: stored.assetsId,
    bindingCode: stored.bindingCode,
    maskedApiKey: maskApiKey(apiKey),
    walletAddress,
    status: stored.status,
    updatedAt: stored.updatedAt,
  };

  return NextResponse.json(response, { status: 201 });
}

// ---------- GET /api/trade/config ----------

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bindingCode = url.searchParams.get("bindingCode")?.trim();

  if (!bindingCode) {
    return NextResponse.json(
      { error: "bindingCode query parameter is required" },
      { status: 400 }
    );
  }

  const cred = getCredentialByBindingCode(bindingCode);

  if (!cred) {
    return NextResponse.json(
      { error: "No configuration found for this bindingCode" },
      { status: 404 }
    );
  }

  // Decrypt apiKey only for masking — never return raw key
  const rawApiKey = decrypt(cred.encryptedApiKey);

  const response: GetTradeConfigResponse = {
    assetsId: cred.assetsId,
    bindingCode: cred.bindingCode,
    hasConfig: true,
    maskedApiKey: maskApiKey(rawApiKey),
    status: cred.status,
    updatedAt: cred.updatedAt,
  };

  return NextResponse.json(response);
}

// ---------- DELETE /api/trade/config ----------

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const bindingCode = url.searchParams.get("bindingCode")?.trim();

  if (!bindingCode) {
    return NextResponse.json(
      { error: "bindingCode query parameter is required" },
      { status: 400 }
    );
  }

  const cred = getCredentialByBindingCode(bindingCode);
  if (!cred) {
    return NextResponse.json(
      { error: "No configuration found for this bindingCode" },
      { status: 404 }
    );
  }

  const success = deleteCredential(cred.assetsId);

  const response: DeleteTradeConfigResponse = {
    success,
    assetsId: cred.assetsId,
  };

  return NextResponse.json(response);
}
