import { NextResponse } from "next/server";
import {
  AveApiError,
  AveConfigurationError,
  scoreTokenRequest,
} from "@/lib/score-token";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { tokenAddress?: string; chain?: string }
    | null;

  const tokenAddress = body?.tokenAddress?.trim();
  if (!tokenAddress) {
    return NextResponse.json(
      { error: "tokenAddress is required" },
      { status: 400 }
    );
  }

  const chain = body?.chain?.trim();
  if (chain && chain !== "bsc") {
    return NextResponse.json(
      { error: "Only chain=bsc is supported in v1" },
      { status: 400 }
    );
  }

  try {
    const response = await scoreTokenRequest({
      tokenAddress,
      chain: "bsc",
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof AveConfigurationError) {
      const isBadRequest =
        error.message.includes("Invalid BSC token address") ||
        error.message.includes("Only the bsc chain");

      return NextResponse.json(
        { error: error.message },
        { status: isBadRequest ? 400 : 500 }
      );
    }

    if (error instanceof AveApiError) {
      const status =
        error.statusCode === 404 ? 404 : error.statusCode === 400 ? 400 : 502;

      return NextResponse.json(
        {
          error: "AVE token lookup failed",
          details:
            status === 404
              ? "Token data was not found from the upstream provider."
              : "Upstream token data is temporarily unavailable.",
        },
        { status }
      );
    }

    return NextResponse.json(
      { error: "Unexpected scoring failure" },
      { status: 500 }
    );
  }
}
