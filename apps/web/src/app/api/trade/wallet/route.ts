import { NextResponse } from "next/server";
import {
  AveBotConfigError,
  AveBotApiError,
  createAveBotClientFromEnv,
} from "@/lib/ave-bot-client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const assetsId = url.searchParams.get("assetsId")?.trim();

  if (!assetsId) {
    return NextResponse.json(
      { error: "assetsId is required" },
      { status: 400 }
    );
  }

  try {
    const client = createAveBotClientFromEnv();
    const wallet = await client.getWalletByAssetsId(assetsId);
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
        `[Trade] wallet lookup failed for ${assetsId}: ${error.message}`,
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
