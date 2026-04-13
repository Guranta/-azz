import { NextResponse } from "next/server";
import type { GetStrategySnapshotResponse } from "@meme-affinity/core";
import { loadSnapshots, loadEquityPoints, getLatestRefreshAt, computeRefreshStatus } from "@/lib/strategy-db";
import { ensureFresh } from "@/lib/strategy-scheduler";
import { getCandidatePoolInfo } from "@/lib/strategy-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureFresh();

  const snapshots = loadSnapshots();
  const equityPoints = loadEquityPoints();
  const lastRefreshAt = getLatestRefreshAt();
  const poolInfo = getCandidatePoolInfo();

  const refreshStatus = computeRefreshStatus(lastRefreshAt);

  const body: GetStrategySnapshotResponse = {
    snapshots,
    equityPoints,
    lastRefreshAt,
    refreshStatus,
    candidatePool: poolInfo
      ? {
          source: poolInfo.source,
          holdingsCount: poolInfo.holdingsCount,
          scoredPoolCount: poolInfo.scoredPoolCount,
          autoDiscoveryAvailable: poolInfo.autoDiscoveryAvailable,
        }
      : null,
  };

  return NextResponse.json(body);
}
