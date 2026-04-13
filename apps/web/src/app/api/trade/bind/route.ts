import { NextResponse } from "next/server";
import { getBindingByBindingCode } from "@/lib/binding-store";
import { createAveBotClientFromEnv } from "@/lib/ave-bot-client";
import type { BindResponse, GetWalletResponse } from "@meme-affinity/core";

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

  const binding = getBindingByBindingCode(bindingCode);

  if (!binding) {
    return NextResponse.json(
      { error: "Invalid bindingCode", code: "BINDING_NOT_FOUND" },
      { status: 404 }
    );
  }

  if (binding.status !== "active") {
    const response: BindResponse = {
      assetsId: binding.assetsId,
      status: binding.status,
    };
    return NextResponse.json(response);
  }

  // Best-effort: fetch wallet so front-end can render immediately
  let wallet: GetWalletResponse | null = null;
  try {
    const client = createAveBotClientFromEnv();
    wallet = await client.getWalletByAssetsId(binding.assetsId);
  } catch {
    // Non-fatal: bind still succeeds, wallet fetched later via GET /trade/wallet
  }

  const response: BindResponse & { wallet?: GetWalletResponse | null } = {
    assetsId: binding.assetsId,
    status: binding.status,
    wallet,
  };

  return NextResponse.json(response);
}
