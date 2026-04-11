import { NextResponse } from "next/server";
import {
  AveApiError,
  AveConfigurationError,
  createAddressErrorResponse,
  scoreAddressRequest,
} from "@/lib/score-address";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { address?: string; chain?: string }
    | null;

  const address = body?.address?.trim() ?? "";
  if (!address) {
    return NextResponse.json(
      createAddressErrorResponse("", "address is required"),
      { status: 400 }
    );
  }

  const chain = body?.chain?.trim();
  if (chain && chain !== "bsc") {
    return NextResponse.json(
      createAddressErrorResponse(address, "Only chain=bsc is supported in v2"),
      { status: 400 }
    );
  }

  try {
    const response = await scoreAddressRequest({
      address,
      chain: "bsc",
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof AveConfigurationError) {
      const isBadRequest =
        error.message.includes("Invalid BSC wallet address") ||
        error.message.includes("Only the bsc chain");

      return NextResponse.json(
        createAddressErrorResponse(address, error.message),
        { status: isBadRequest ? 400 : 500 }
      );
    }

    if (error instanceof AveApiError) {
      const status =
        error.statusCode === 404 ? 404 : error.statusCode === 400 ? 400 : 502;
      const message =
        status === 404
          ? "Address history was not found from the upstream provider."
          : "Upstream address history is temporarily unavailable.";

      return NextResponse.json(createAddressErrorResponse(address, message), {
        status,
      });
    }

    return NextResponse.json(
      createAddressErrorResponse(address, "Unexpected address scoring failure"),
      { status: 500 }
    );
  }
}
