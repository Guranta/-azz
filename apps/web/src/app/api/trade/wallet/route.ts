import { NextResponse } from "next/server";
import {
  AveBotConfigError,
  AveBotApiError,
} from "@/lib/ave-bot-client";
import { resolveAveBotClient } from "@/lib/resolve-trade-credential";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const assetsId = url.searchParams.get("assetsId")?.trim();
  const bindingCode = url.searchParams.get("bindingCode")?.trim();

  if (!assetsId && !bindingCode) {
    return NextResponse.json(
      { error: "bindingCode (V4) or assetsId (V3) is required" },
      { status: 400 }
    );
  }

  try {
    const resolved = resolveAveBotClient({ assetsId, bindingCode });

    if (!resolved) {
      if (bindingCode) {
        return NextResponse.json(
          { error: "Invalid or inactive bindingCode", code: "BINDING_NOT_FOUND" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "AVE Bot API not configured on server (V3 fallback unavailable)", code: "NO_ENV_CONFIG" },
        { status: 401 }
      );
    }

    const wallet = await resolved.client.getWalletByAssetsId(resolved.assetsId);
    return NextResponse.json(wallet);
  } catch (error) {
    if (error instanceof AveBotConfigError) {
      return NextResponse.json(
        { error: "AVE Bot API not configured on server" },
        { status: 401 }
      );
    }

    if (error instanceof AveBotApiError) {
      if (error.statusCode === 404) {
        return NextResponse.json(
          { error: "No wallet found for this assetsId" },
          { status: 404 }
        );
      }

      console.error(
        `[Trade] wallet lookup failed for ${bindingCode || assetsId}: ${error.message}`,
        error.upstreamMessage
      );
      return NextResponse.json(
        { error: "Wallet lookup failed" },
        { status: 502 }
      );
    }

    console.error("[Trade] wallet lookup unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
