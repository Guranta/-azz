import { NextRequest, NextResponse } from "next/server";
import type { WithdrawRequest, WithdrawResponse, WithdrawStatusResponse } from "@meme-affinity/core";
import { resolveAveBotClient } from "@/lib/resolve-trade-credential";
import { getBindingByBindingCode } from "@/lib/binding-store";
import { createAveBotClientFromEnv, AveBotConfigError, AveBotApiError } from "@/lib/ave-bot-client";

const BSC_BNB_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const GAS_BUFFER_WEI = BigInt("1000000000000000"); // 0.001 BNB

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json(
      { error: "id query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const client = createAveBotClientFromEnv();
    const results = await client.getTransferStatus(id);
    const entry = results[0];

    if (!entry) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }

    const body: WithdrawStatusResponse = {
      transferId: entry.id,
      status: entry.status,
      txHash: entry.txHash,
      errorMessage: entry.errorMessage,
    };

    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof AveBotConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof AveBotApiError) {
      return NextResponse.json(
        { error: error.upstreamMessage || error.message },
        { status: 502 }
      );
    }
    console.error("[withdraw-status] unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WithdrawRequest;

    if (!body.bindingCode || !body.toAddress) {
      return NextResponse.json(
        { error: "bindingCode and toAddress are required" },
        { status: 400 }
      );
    }

    const toAddr = body.toAddress.trim().toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(toAddr)) {
      return NextResponse.json(
        { error: "Invalid BSC address format" },
        { status: 400 }
      );
    }

    // Resolve binding → wallet address
    const binding = getBindingByBindingCode(body.bindingCode);
    if (!binding || binding.status !== "active") {
      return NextResponse.json(
        { error: "Binding not found or inactive" },
        { status: 404 }
      );
    }

    const fromAddr = binding.walletAddress.toLowerCase();

    if (fromAddr === toAddr) {
      return NextResponse.json(
        { error: "Cannot withdraw to the same address" },
        { status: 400 }
      );
    }

    // Resolve client
    const resolved = resolveAveBotClient({ bindingCode: body.bindingCode });
    if (!resolved) {
      return NextResponse.json(
        { error: "Binding not found or inactive" },
        { status: 404 }
      );
    }

    // Fetch current wallet state to get BNB balance
    const wallet = await resolved.client.getWalletByAssetsId(resolved.assetsId);

    const bnbBalance = wallet.balances.find(
      (b) => b.tokenAddress === BSC_BNB_ADDRESS
    );

    if (!bnbBalance || BigInt(bnbBalance.rawBalance) <= BigInt(0)) {
      return NextResponse.json(
        { error: "No BNB balance to withdraw" },
        { status: 400 }
      );
    }

    const fullBalance = BigInt(bnbBalance.rawBalance);

    if (fullBalance <= GAS_BUFFER_WEI) {
      return NextResponse.json(
        { error: "BNB balance too low to cover gas buffer" },
        { status: 400 }
      );
    }

    const withdrawAmount = fullBalance - GAS_BUFFER_WEI;
    const amountHuman = formatBnb(withdrawAmount);

    // Execute transfer — extraGas is "0" because we already reserved gas buffer in the wallet
    const result = await resolved.client.transfer({
      assetsId: resolved.assetsId,
      fromAddress: fromAddr,
      toAddress: toAddr,
      tokenAddress: BSC_BNB_ADDRESS,
      amount: withdrawAmount.toString(),
      extraGas: "0",
    });

    const response: WithdrawResponse = {
      ...result,
      amountHuman,
      gasBufferWei: GAS_BUFFER_WEI.toString(), // amount reserved in wallet, NOT sent as extraGas
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof AveBotConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof AveBotApiError) {
      if (error.statusCode === 404) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json(
        { error: error.upstreamMessage || error.message },
        { status: 502 }
      );
    }
    console.error("[withdraw] unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function formatBnb(wei: bigint): string {
  const whole = wei / BigInt(10 ** 18);
  const frac = wei % BigInt(10 ** 18);
  const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "");
  return fracStr.length > 0 ? `${whole}.${fracStr}` : whole.toString();
}
