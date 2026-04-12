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
    side?: string;
    amount?: string;
    baseToken?: string;
    slippageBps?: number;
    confirmToken?: string;
    bindingCode?: string;
  } | null;

  const assetsId = body?.assetsId?.trim();
  const tokenAddress = body?.tokenAddress?.trim();
  const side = body?.side?.trim();
  const amount = body?.amount?.trim();
  const baseToken = body?.baseToken?.trim() || "bnb";
  const slippageBps = body?.slippageBps;
  const confirmToken = body?.confirmToken?.trim();
  const bindingCode = body?.bindingCode?.trim();

  // Validation
  if ((!assetsId && !bindingCode) || !tokenAddress || !side || !amount || slippageBps === undefined || !confirmToken) {
    return NextResponse.json(
      { error: "bindingCode (V4) or assetsId (V3), tokenAddress, side, amount, slippageBps, and confirmToken are required" },
      { status: 400 }
    );
  }

  if (side !== "buy" && side !== "sell") {
    return NextResponse.json(
      { error: "side must be 'buy' or 'sell'" },
      { status: 400 }
    );
  }

  if (baseToken !== "bnb" && baseToken !== "usdt") {
    return NextResponse.json(
      { error: "baseToken must be 'bnb' or 'usdt'" },
      { status: 400 }
    );
  }

  if (confirmToken !== tokenAddress) {
    return NextResponse.json(
      { error: "confirmToken does not match tokenAddress (anti-fat-finger)" },
      { status: 400 }
    );
  }

  if (typeof slippageBps !== "number" || slippageBps < 100 || slippageBps > 5000) {
    return NextResponse.json(
      { error: "slippageBps must be between 100 and 5000 (1%-50%)" },
      { status: 400 }
    );
  }

  try {
    const amountNum = BigInt(amount);
    if (amountNum <= BigInt(0)) {
      return NextResponse.json(
        { error: "amount must be greater than zero" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "amount must be a valid positive integer string" },
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

    const result = await resolved.client.sendSwapOrder({
      assetsId: resolved.assetsId,
      tokenAddress,
      side: side as "buy" | "sell",
      amount,
      baseToken: baseToken as "bnb" | "usdt",
      slippageBps,
    });
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
        const msg =
          side === "sell" &&
          (error.upstreamMessage?.toLowerCase().includes("approve") ||
            error.upstreamMessage?.toLowerCase().includes("not approved"))
            ? "Token not approved yet (sell requires approve first)"
            : "assetsId has no valid wallet";

        return NextResponse.json(
          { error: msg },
          { status: error.statusCode === 403 ? 403 : 401 }
        );
      }

      console.error(
        `[Trade] swap ${side} failed for ${tokenAddress}: ${error.message}`,
        error.upstreamMessage
      );
      return NextResponse.json(
        { error: "Swap order failed" },
        { status: 502 }
      );
    }

    console.error("[Trade] swap unexpected error:", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
