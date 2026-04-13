import { NextResponse } from "next/server";
import {
  AveBotConfigError,
  AveBotApiError,
  createAveBotClientFromEnv,
} from "@/lib/ave-bot-client";
import { insertBinding } from "@/lib/binding-store";

export async function POST() {
  try {
    const client = createAveBotClientFromEnv();
    const wallet = await client.generateWallet();

    // Create binding record with generated bindingCode
    const binding = insertBinding({
      assetsId: wallet.assetsId,
      walletAddress: wallet.walletAddress,
    });

    return NextResponse.json({
      ...wallet,
      bindingCode: binding.bindingCode,
    });
  } catch (error) {
    if (error instanceof AveBotConfigError) {
      return NextResponse.json(
        { error: "AVE Bot API not configured on server", code: "CONFIG_ERROR" },
        { status: 503 }
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
