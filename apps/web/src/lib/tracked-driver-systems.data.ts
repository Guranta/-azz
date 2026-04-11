export type DriverMarketCapBand = "micro" | "small" | "mid" | "large" | "unknown";

export type DriverNameStyle =
  | "chinese"
  | "plain"
  | "ai"
  | "meme"
  | "hashtag"
  | "bnb-meta";

export type FrozenPreferenceCount<T extends string> = {
  value: T;
  count: number;
};

export type FrozenTrackedDriverSystem = {
  id: string;
  address: string;
  sampledAt: string;
  sampledTradeCount: number;
  availableTradeCount: number;
  sampledWindowCount: number;
  usableTradeCount: number;
  narrativePreference: FrozenPreferenceCount<string>[];
  buyInMarketCapBand: FrozenPreferenceCount<DriverMarketCapBand>[];
  tokenNameStyle: FrozenPreferenceCount<DriverNameStyle>[];
  holdDurationBias: {
    medianMinutes: number | null;
    p90Minutes: number | null;
    openPositionCount: number;
  };
  launchpadBias: FrozenPreferenceCount<"fourmeme" | "flap" | "unknown">[];
  riskAppetite: {
    medianBuyUsd: number | null;
    p90BuyUsd: number | null;
    dominantRiskLevels: FrozenPreferenceCount<"low" | "medium" | "high" | "critical" | "unknown">[];
    medianRoiPct: number | null;
  };
  tradingRhythm: {
    tradeSpanMinutes: number;
    buyEventCount: number;
    averageTradesPerDayEstimate: number;
  };
  sampleTokens: Array<{
    tokenAddress: string;
    buyUsd: number | null;
    holdMinutes: number | null;
    roiPct: number | null;
    name: string;
    symbol: string;
    narratives: string[];
    launchpad: "fourmeme" | "flap" | "unknown";
    riskLevel: "low" | "medium" | "high" | "critical" | "unknown";
    riskScore: number | null;
    marketCap: number | null;
    marketCapBand: DriverMarketCapBand;
    nameStyles: DriverNameStyle[];
  }>;
};

export const FROZEN_TRACKED_DRIVER_SYSTEMS: {
  version: 1;
  generatedAt: string;
  drivers: Record<string, FrozenTrackedDriverSystem>;
} = {
  version: 1,
  generatedAt: "2026-04-11T14:43:26.027Z",
  drivers: {
    wangxiaoer: {
      id: "wangxiaoer",
      address: "0x176e6378b7c9010f0456bee76ce3039d36dc37c8",
      sampledAt: "2026-04-11T14:43:27.859Z",
      sampledTradeCount: 10,
      availableTradeCount: 10,
      sampledWindowCount: 10,
      usableTradeCount: 8,
      narrativePreference: [],
      buyInMarketCapBand: [
        { value: "large", count: 4 },
        { value: "micro", count: 2 },
        { value: "mid", count: 2 },
      ],
      tokenNameStyle: [
        { value: "chinese", count: 8 },
        { value: "ai", count: 1 },
      ],
      holdDurationBias: {
        medianMinutes: null,
        p90Minutes: null,
        openPositionCount: 8,
      },
      launchpadBias: [{ value: "unknown", count: 8 }],
      riskAppetite: {
        medianBuyUsd: 1172.52,
        p90BuyUsd: 1823.78,
        dominantRiskLevels: [{ value: "medium", count: 8 }],
        medianRoiPct: null,
      },
      tradingRhythm: {
        tradeSpanMinutes: 18843,
        buyEventCount: 8,
        averageTradesPerDayEstimate: 0.61,
      },
      sampleTokens: [
        {
          tokenAddress: "0xf259aa87f32c43fd67c6a894f2c97a0a31c74444",
          buyUsd: 1823.7781379232931,
          holdMinutes: null,
          roiPct: null,
          name: "抖音热搜",
          symbol: "机器狼",
          narratives: [],
          launchpad: "unknown",
          riskLevel: "medium",
          riskScore: 55,
          marketCap: 7245.8,
          marketCapBand: "micro",
          nameStyles: ["chinese"],
        },
        {
          tokenAddress: "0x735b7ca78176d93b8c506626bcd7507ccaf74444",
          buyUsd: 898.5559588760594,
          holdMinutes: null,
          roiPct: null,
          name: "全球首个自进化的个人AI",
          symbol: "骡子快跑",
          narratives: [],
          launchpad: "unknown",
          riskLevel: "medium",
          riskScore: 55,
          marketCap: 39554,
          marketCapBand: "micro",
          nameStyles: ["chinese", "ai"],
        },
        {
          tokenAddress: "0xb2acf3ae051c7f0b0b8de90cbb4ed99312574444",
          buyUsd: 1504.4651160301785,
          holdMinutes: null,
          roiPct: null,
          name: "Build N Build",
          symbol: "共建",
          narratives: [],
          launchpad: "unknown",
          riskLevel: "medium",
          riskScore: 55,
          marketCap: 2321100,
          marketCapBand: "mid",
          nameStyles: ["chinese"],
        },
        {
          tokenAddress: "0x924fa68a0fc644485b8df8abfa0a41c2e7744444",
          buyUsd: 1524.14744178438,
          holdMinutes: null,
          roiPct: null,
          name: "Unknown",
          symbol: "币安人生",
          narratives: [],
          launchpad: "unknown",
          riskLevel: "medium",
          riskScore: 55,
          marketCap: 127200000,
          marketCapBand: "large",
          nameStyles: ["chinese"],
        },
      ],
    },
    lengjing: {
      id: "lengjing",
      address: "0xeb89055e16ae1c1e42ad6770a7344ff5c7b4f31d",
      sampledAt: "2026-04-11T14:43:28.505Z",
      sampledTradeCount: 19,
      availableTradeCount: 19,
      sampledWindowCount: 19,
      usableTradeCount: 5,
      narrativePreference: [],
      buyInMarketCapBand: [
        { value: "large", count: 4 },
        { value: "mid", count: 1 },
      ],
      tokenNameStyle: [
        { value: "plain", count: 4 },
        { value: "chinese", count: 1 },
      ],
      holdDurationBias: {
        medianMinutes: 3037,
        p90Minutes: 3037,
        openPositionCount: 4,
      },
      launchpadBias: [{ value: "unknown", count: 5 }],
      riskAppetite: {
        medianBuyUsd: 220.26,
        p90BuyUsd: 2375.03,
        dominantRiskLevels: [{ value: "medium", count: 5 }],
        medianRoiPct: 97.28,
      },
      tradingRhythm: {
        tradeSpanMinutes: 3037,
        buyEventCount: 5,
        averageTradesPerDayEstimate: 2.37,
      },
      sampleTokens: [
        {
          tokenAddress: "0xb2acf3ae051c7f0b0b8de90cbb4ed99312574444",
          buyUsd: 2375.0304605626616,
          holdMinutes: 3037,
          roiPct: 97.28,
          name: "Build N Build",
          symbol: "共建",
          narratives: [],
          launchpad: "unknown",
          riskLevel: "medium",
          riskScore: 55,
          marketCap: 2321100,
          marketCapBand: "mid",
          nameStyles: ["chinese"],
        },
        {
          tokenAddress: "0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d",
          buyUsd: 300.2886241074,
          holdMinutes: null,
          roiPct: null,
          name: "World Liberty Financial USD",
          symbol: "USD1",
          narratives: [],
          launchpad: "unknown",
          riskLevel: "medium",
          riskScore: 55,
          marketCap: 1787636261.968019,
          marketCapBand: "large",
          nameStyles: ["plain"],
        },
        {
          tokenAddress: "0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d",
          buyUsd: 220.2644046238,
          holdMinutes: null,
          roiPct: null,
          name: "World Liberty Financial USD",
          symbol: "USD1",
          narratives: [],
          launchpad: "unknown",
          riskLevel: "medium",
          riskScore: 55,
          marketCap: 1787636261.968019,
          marketCapBand: "large",
          nameStyles: ["plain"],
        },
      ],
    },
    afeng: {
      id: "afeng",
      address: "0xbf004bff64725914ee36d03b87d6965b0ced4903",
      sampledAt: "2026-04-11T14:43:43.972Z",
      sampledTradeCount: 200,
      availableTradeCount: 4921,
      sampledWindowCount: 200,
      usableTradeCount: 81,
      narrativePreference: [],
      buyInMarketCapBand: [
        { value: "micro", count: 74 },
        { value: "large", count: 6 },
        { value: "mid", count: 1 },
      ],
      tokenNameStyle: [
        { value: "chinese", count: 43 },
        { value: "plain", count: 31 },
        { value: "meme", count: 7 },
        { value: "hashtag", count: 6 },
        { value: "bnb-meta", count: 3 },
      ],
      holdDurationBias: {
        medianMinutes: 0,
        p90Minutes: 2,
        openPositionCount: 18,
      },
      launchpadBias: [{ value: "unknown", count: 81 }],
      riskAppetite: {
        medianBuyUsd: 389.51,
        p90BuyUsd: 420.2,
        dominantRiskLevels: [{ value: "medium", count: 81 }],
        medianRoiPct: -16.6,
      },
      tradingRhythm: {
        tradeSpanMinutes: 266,
        buyEventCount: 81,
        averageTradesPerDayEstimate: 81,
      },
      sampleTokens: [
        {
          tokenAddress: "0x271df40db9f2f38b5038f7e68ddbf845124b4444",
          buyUsd: 389.84482979264413,
          holdMinutes: 0,
          roiPct: 4.29,
          name: "Heyi Movie",
          symbol: "HM",
          narratives: [],
          launchpad: "unknown",
          riskLevel: "medium",
          riskScore: 55,
          marketCap: 17322,
          marketCapBand: "micro",
          nameStyles: ["plain"],
        },
        {
          tokenAddress: "0x0f0c617c6f9f5396e38b73c02d2e99dbb9834444",
          buyUsd: 389.82688571254636,
          holdMinutes: 0,
          roiPct: -4.11,
          name: "加密向善",
          symbol: "加密向善",
          narratives: [],
          launchpad: "unknown",
          riskLevel: "medium",
          riskScore: 55,
          marketCap: 3470.8,
          marketCapBand: "micro",
          nameStyles: ["chinese"],
        },
        {
          tokenAddress: "0x82553353530f8839f4f3744cb5a73c80df134444",
          buyUsd: 420.20288030258536,
          holdMinutes: 0,
          roiPct: 1.98,
          name: "币安歌词里的币",
          symbol: "sh#tcoins",
          narratives: [],
          launchpad: "unknown",
          riskLevel: "medium",
          riskScore: 55,
          marketCap: 3734.9,
          marketCapBand: "micro",
          nameStyles: ["chinese", "hashtag"],
        },
        {
          tokenAddress: "0x587a9bbd53ca16e05ce9138b6f4bd7f9c3ab4444",
          buyUsd: 449.820901944485,
          holdMinutes: 2,
          roiPct: -36.37,
          name: "一天百万点赞的AI短片",
          symbol: "告别",
          narratives: [],
          launchpad: "unknown",
          riskLevel: "medium",
          riskScore: 55,
          marketCap: 5484.5,
          marketCapBand: "micro",
          nameStyles: ["chinese", "ai"],
        },
      ],
    },
  },
};
