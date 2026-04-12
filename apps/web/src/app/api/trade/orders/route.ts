import { NextResponse } from "next/server";
import {
  AveBotConfigError,
  AveBotApiError,
} from "@/lib/ave-bot-client";
import { resolveAveBotClient } from "@/lib/resolve-trade-credential";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ids = url.searchParams.get("ids")?.trim();
  const bindingCode = url.searchParams.get("bindingCode")?.trim();

  if (!ids) {
    return NextResponse.json(
      { error: "ids parameter is required (comma-separated order IDs)" },
      { status: 400 }
    );
  }

  if (!bindingCode) {
    return NextResponse.json(
      { error: "bindingCode is required for order queries" },
      { status: 400 }
    );
  }

  try {
    const resolved = resolveAveBotClient({ bindingCode });

    if (!resolved) {
      return NextResponse.json(
        { error: "Invalid or inactive bindingCode", code: "BINDING_NOT_FOUND" },
        { status: 404 }
      );
    }

    const orders = await resolved.client.getSwapOrders(ids);
    return NextResponse.json({ orders });
  } catch (error) {
    if (error instanceof AveBotConfigError) {
      return NextResponse.json(
        { error: "AVE Bot API not configured on server" },
        { status: 401 }
      );
    }

    if (error instanceof AveBotApiError) {
      console.error(
        `[Trade] order query failed for ${ids}: ${error.message}`,
        error.upstreamMessage
      );
      return NextResponse.json(
        { error: "Order query failed" },
        { status: 502 }
      );
    }

    console.error("[Trade] order query unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
