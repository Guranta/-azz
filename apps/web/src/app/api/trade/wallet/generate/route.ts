import { NextResponse } from "next/server";
import {
  AveBotConfigError,
  AveBotApiError,
  createAveBotClientFromEnv,
} from "@/lib/ave-bot-client";

export async function POST() {
  try {
    const client = createAveBotClientFromEnv();
    const wallet = await client.generateWallet();
    return NextResponse.json(wallet);
  } catch (error) {
    if (error instanceof AveBotConfigError) {
      return NextResponse.json(
        { error: "AVE Bot API not configured on server" },
        { status: 401 }
      );
    }

    if (error instanceof AveBotApiError) {
      console.error(
        `[Trade] generateWallet failed: ${error.message}`,
        error.upstreamMessage
      );
      return NextResponse.json(
        { error: "Wallet generation failed" },
        { status: 502 }
      );
    }

    console.error("[Trade] generateWallet unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
