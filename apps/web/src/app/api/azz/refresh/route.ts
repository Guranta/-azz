import { NextResponse } from "next/server";
import { refreshAllStrategies } from "@/lib/strategy-engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Minimal protection: only accept requests with a known header or from server-side
  const origin = request.headers.get("origin") ?? "";
  const host = request.headers.get("host") ?? "";
  const isSameOrigin = origin.includes(host) || !origin;

  if (!isSameOrigin) {
    // Still allow but log — this is a soft guard, not auth
    console.warn("[api/azz/refresh] external refresh request received");
  }

  try {
    await refreshAllStrategies();
    return NextResponse.json({ ok: true, refreshedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[api/azz/refresh] failed:", err);
    return NextResponse.json(
      { ok: false, error: "刷新失败，请稍后重试" },
      { status: 500 }
    );
  }
}
