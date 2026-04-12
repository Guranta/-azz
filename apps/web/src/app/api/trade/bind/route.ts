import { NextResponse } from "next/server";
import { getCredentialByBindingCode } from "@/lib/credential-store";
import { createAveBotClient } from "@/lib/ave-bot-client";
import { decrypt } from "@/lib/credential-crypto";
import type { BindTradeConfigResponse, GetWalletResponse } from "@meme-affinity/core";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    bindingCode?: string;
  } | null;

  const bindingCode = body?.bindingCode?.trim();

  if (!bindingCode) {
    return NextResponse.json(
      { error: "bindingCode is required" },
      { status: 400 }
    );
  }

  const cred = getCredentialByBindingCode(bindingCode);

  if (!cred) {
    return NextResponse.json(
      { error: "Invalid bindingCode", code: "BINDING_NOT_FOUND" },
      { status: 404 }
    );
  }

  if (cred.status !== "active") {
    const response: BindTradeConfigResponse = {
      assetsId: cred.assetsId,
      status: cred.status,
    };
    return NextResponse.json(response);
  }

  // Best-effort: fetch wallet so front-end can render immediately
  let wallet: GetWalletResponse | null = null;
  try {
    const client = createAveBotClient({
      apiKey: decrypt(cred.encryptedApiKey),
      apiSecret: decrypt(cred.encryptedApiSecret),
      baseUrl: cred.baseUrl || undefined,
    });
    wallet = await client.getWalletByAssetsId(cred.assetsId);
  } catch {
    // Non-fatal: bind still succeeds, wallet fetched later via GET /trade/wallet
  }

  const response: BindTradeConfigResponse & { wallet?: GetWalletResponse | null } = {
    assetsId: cred.assetsId,
    status: cred.status,
    wallet,
  };

  return NextResponse.json(response);
}
