import { NextResponse } from "next/server";
import type { GetStrategyDraftsResponse } from "@meme-affinity/core";
import { loadSnapshots } from "@/lib/strategy-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshots = loadSnapshots();
  const drafts = snapshots.map((s) => s.latestDraft);
  const generatedAt = snapshots.length > 0
    ? snapshots.reduce((latest, s) =>
        s.latestDraft.generatedAt > latest ? s.latestDraft.generatedAt : latest
      , snapshots[0].latestDraft.generatedAt)
    : null;

  const body: GetStrategyDraftsResponse = { drafts, generatedAt };
  return NextResponse.json(body);
}
