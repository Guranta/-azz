import type {
  NormalizedAddressHistoryInput,
  TrackedAddressConfig,
} from "@meme-affinity/core";

const BASE_TRADES: NormalizedAddressHistoryInput["trades"] = [
  {
    token_address: "0xaaa0000000000000000000000000000000000001",
    symbol: "FROG",
    launchpad: "fourmeme",
    narrative_tags: ["animal", "meme"],
    opened_at: "2026-04-08T10:00:00Z",
    closed_at: "2026-04-08T10:40:00Z",
    hold_minutes: 40,
    buy_amount_usd: 120,
    sell_amount_usd: 150,
    roi_pct: 25,
  },
  {
    token_address: "0xaaa0000000000000000000000000000000000002",
    symbol: "DOGBSC",
    launchpad: "fourmeme",
    narrative_tags: ["animal", "community", "meme"],
    opened_at: "2026-04-08T11:00:00Z",
    closed_at: "2026-04-08T12:20:00Z",
    hold_minutes: 80,
    buy_amount_usd: 90,
    sell_amount_usd: 81,
    roi_pct: -10,
  },
  {
    token_address: "0xaaa0000000000000000000000000000000000003",
    symbol: "CATX",
    launchpad: "flap",
    narrative_tags: ["animal", "meme"],
    opened_at: "2026-04-08T13:00:00Z",
    closed_at: "2026-04-08T15:00:00Z",
    hold_minutes: 120,
    buy_amount_usd: 110,
    sell_amount_usd: 149.6,
    roi_pct: 36,
  },
  {
    token_address: "0xaaa0000000000000000000000000000000000004",
    symbol: "AIPUP",
    launchpad: "fourmeme",
    narrative_tags: ["ai", "animal", "meme"],
    opened_at: "2026-04-08T16:00:00Z",
    closed_at: "2026-04-08T17:15:00Z",
    hold_minutes: 75,
    buy_amount_usd: 160,
    sell_amount_usd: 208,
    roi_pct: 30,
  },
  {
    token_address: "0xaaa0000000000000000000000000000000000005",
    symbol: "PEPEBSC",
    launchpad: "flap",
    narrative_tags: ["animal", "classic-meme"],
    opened_at: "2026-04-08T18:00:00Z",
    closed_at: "2026-04-08T19:00:00Z",
    hold_minutes: 60,
    buy_amount_usd: 100,
    sell_amount_usd: 125,
    roi_pct: 25,
  },
];

const FLAP_ROTATOR_TRADES: NormalizedAddressHistoryInput["trades"] = [
  {
    token_address: "0xbbb0000000000000000000000000000000000001",
    symbol: "FLAPDOG",
    launchpad: "flap",
    narrative_tags: ["animal", "community", "meme"],
    opened_at: "2026-04-08T08:30:00Z",
    closed_at: "2026-04-08T13:30:00Z",
    hold_minutes: 300,
    buy_amount_usd: 240,
    sell_amount_usd: 295,
    roi_pct: 22.9,
  },
  {
    token_address: "0xbbb0000000000000000000000000000000000002",
    symbol: "AIFLAP",
    launchpad: "flap",
    narrative_tags: ["ai", "meme"],
    opened_at: "2026-04-08T14:00:00Z",
    closed_at: "2026-04-08T19:30:00Z",
    hold_minutes: 330,
    buy_amount_usd: 180,
    sell_amount_usd: 167,
    roi_pct: -7.2,
  },
  {
    token_address: "0xbbb0000000000000000000000000000000000003",
    symbol: "COMMX",
    launchpad: "fourmeme",
    narrative_tags: ["community", "meme"],
    opened_at: "2026-04-08T20:15:00Z",
    closed_at: "2026-04-09T02:15:00Z",
    hold_minutes: 360,
    buy_amount_usd: 125,
    sell_amount_usd: 156,
    roi_pct: 24.8,
  },
  {
    token_address: "0xbbb0000000000000000000000000000000000004",
    symbol: "GLOBE",
    launchpad: "flap",
    narrative_tags: ["global", "community"],
    opened_at: "2026-04-09T03:00:00Z",
    closed_at: "2026-04-09T09:30:00Z",
    hold_minutes: 390,
    buy_amount_usd: 210,
    sell_amount_usd: 264,
    roi_pct: 25.7,
  },
];

function createHistory(
  address: string,
  source: string,
  trades: NormalizedAddressHistoryInput["trades"]
): NormalizedAddressHistoryInput {
  return {
    address,
    chain: "bsc",
    source,
    trades,
  };
}

export function getMockAddressHistory(
  trackedAddress: TrackedAddressConfig
): NormalizedAddressHistoryInput | null {
  if (trackedAddress.id === "smart-alpha-1") {
    return createHistory(trackedAddress.address, "manual-demo-smart-alpha-1", BASE_TRADES);
  }

  if (trackedAddress.id === "smart-alpha-2") {
    return createHistory(
      trackedAddress.address,
      "manual-demo-smart-alpha-2",
      FLAP_ROTATOR_TRADES
    );
  }

  return null;
}
