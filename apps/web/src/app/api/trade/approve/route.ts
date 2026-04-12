import { NextResponse } from "next/server";
import {
  AveBotConfigError,
  AveBotApiError,
} from "@/lib/ave-bot-client";
import { resolveAveBotClient } from "@/lib/resolve-trade-credential";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    assetsId?: string;
    tokenAddress?: string;
    bindingCode?: string;
  } | null;

  const assetsId = body?.assetsId?.trim();
  const tokenAddress = body?.tokenAddress?.trim();
  const bindingCode = body?.bindingCode?.trim();

  if ((!assetsId && !bindingCode) || !tokenAddress) {
    return NextResponse.json(
      { error: "bindingCode (V4) or assetsId (V3) and tokenAddress are required" },
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

    const result = await resolved.client.approve(resolved.assetsId, tokenAddress);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AveBotConfigError) {
      return NextResponse.json(
        { error: "AVE Bot API not configured on server" },
        { status: 401 }
      );
    }

    if (error instanceof AveBotApiError) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        return NextResponse.json(
          { error: "assetsId has no valid wallet" },
          { status: 401 }
        );
      }

      console.error(
        `[Trade] approve failed for ${tokenAddress}: ${error.message}`,
        error.upstreamMessage
      );
      return NextResponse.json(
        { error: "Approve request failed" },
        { status: 502 }
      );
    }

    console.error("[Trade] approve unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
