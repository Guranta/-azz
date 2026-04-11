import { NextResponse } from "next/server";
import {
  AveBotConfigError,
  AveBotApiError,
  createAveBotClientFromEnv,
} from "@/lib/ave-bot-client";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    assetsId?: string;
    tokenAddress?: string;
  } | null;

  const assetsId = body?.assetsId?.trim();
  const tokenAddress = body?.tokenAddress?.trim();

  if (!assetsId || !tokenAddress) {
    return NextResponse.json(
      { error: "assetsId and tokenAddress are required" },
      { status: 400 }
    );
  }

  try {
    const client = createAveBotClientFromEnv();
    const result = await client.approve(assetsId, tokenAddress);
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
