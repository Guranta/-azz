export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "unknown";
export type ConfidenceLevel = "low" | "medium" | "high";
export type DisplayLevel = "NO_LOVE" | "LOVE" | "LOVE_LOVE";
export type LogoMode = "emoji" | "asset";
export type RecommendationValue =
  | "STRONG_BUY"
  | "BUY"
  | "WATCH"
  | "DO_NOT_BUY";

export interface TokenRiskSummary {
  riskLevel: RiskLevel;
  riskScore: number | null;
}

export interface PersonaConfig {
  id: string;
  name: string;
  label: string;
  enabled: boolean;
  description?: string;
  logoKey: string;
  logoMode: LogoMode;
}

export interface TrackedAddressConfig {
  id: string;
  name: string;
  label: string;
  address: string;
  enabled: boolean;
  logoKey: string;
  logoMode: LogoMode;
}

export interface TokenBrief {
  address: string;
  chain: "bsc";
  name: string;
  symbol: string;
  marketCapUsd: number | null;
  launchpad: "fourmeme" | "flap" | "unknown";
  narrativeTags: string[];
  risk: TokenRiskSummary;
}

export interface PersonaScore {
  id: string;
  label: string;
  affinityScore: number;
  displayLevel: DisplayLevel;
  displayEmoji: string;
  confidence: ConfidenceLevel;
  summary: string;
  evidence: string[];
  logoKey: string;
  logoMode: LogoMode;
}

export interface AddressScore {
  id: string;
  label: string;
  address: string;
  narrativeAffinityScore: number;
  buyLikelihoodScore: number;
  displayLevel: DisplayLevel;
  displayEmoji: string;
  styleLabels: string[];
  launchpadBias: "fourmeme" | "flap" | "mixed" | "unknown";
  confidence: ConfidenceLevel;
  summary: string;
  evidence: string[];
  sourceStatus: "mock" | "manual" | "live" | "unavailable";
  isTop100Holder: boolean;
  top100Rank: number | null;
  top100Percentage: number | null;
  holderEmoji: string;
  logoKey: string;
  logoMode: LogoMode;
}

export type AddressProfileRiskAppetite =
  | "unknown"
  | "cautious"
  | "balanced"
  | "aggressive";

export type AddressProfileTokenSide = "buy" | "sell" | "mixed" | "unknown";
export type AddressProfileArchetype = "畜生" | "P子" | "钻石手" | "数据不足";

export interface AddressProfileRecentToken {
  tokenAddress: string;
  symbol: string;
  launchpad: TokenBrief["launchpad"];
  narrativeTags: string[];
  roiPct: number | null;
  holdMinutes: number | null;
}

export interface AddressProfile {
  address: string;
  chain: "bsc";
  style: string[];
  riskAppetite: AddressProfileRiskAppetite;
  recentTradeCount: number;
  favoriteNarratives: string[];
  launchpadBias: AddressScore["launchpadBias"];
  recentTokens: AddressProfileRecentToken[];
  summary: string;
  evidence: string[];
  confidence: ConfidenceLevel;
  sourceStatus: AddressScore["sourceStatus"];
  refinementSource: "deterministic" | "minimax" | "minimax-fallback";
}

export interface ScoreAddressProfile extends AddressProfile {
  archetype: AddressProfileArchetype;
}

export interface SmartMoneyMatch {
  address: string;
  rank: number | null;
  percentage: number | null;
  tag: string | null;
}

export interface SmartMoneyScore {
  displayLevel: DisplayLevel;
  displayEmoji: string;
  matchedCount: number;
  summary: string;
  evidence: string[];
  matches: SmartMoneyMatch[];
}

export interface Recommendation {
  value: RecommendationValue;
  summary: string;
}

export interface ScoreTokenResponse {
  token: TokenBrief;
  personaScores: PersonaScore[];
  addressScores: AddressScore[];
  smartMoney: SmartMoneyScore;
  recommendation: Recommendation;
  cache: {
    hit: boolean;
    expiresAt: string;
  };
  errors: string[];
}

export interface AddressCzScore {
  id: string;
  label: string;
  affinityScore: number;
  displayLevel: DisplayLevel;
  displayEmoji: string;
  confidence: ConfidenceLevel;
  summary: string;
  evidence: string[];
}

export interface AddressSmartMoney {
  isSmartWallet: boolean;
  walletTag: string | null;
  cohortSize: number;
  narrativeOverlap: number;
  launchpadAlignment: boolean;
  matchedNarratives: string[];
  displayLevel: DisplayLevel;
  displayEmoji: string;
  summary: string;
  evidence: string[];
}

export interface AddressTrackedAddressSimilarity {
  id: string;
  label: string;
  address: string;
  similarityScore: number;
  displayLevel: DisplayLevel;
  displayEmoji: string;
  summary: string;
  evidence: string[];
}

export interface ScoreAddressResponse {
  address: {
    address: string;
    chain: "bsc";
  };
  profile: ScoreAddressProfile;
  cache: {
    hit: boolean;
    expiresAt: string;
  };
  errors: string[];
}

// V3 Trade types

export interface TradeTokenBalance {
  tokenAddress: string;
  symbol: string;
  decimals: number;
  rawBalance: string;
  humanBalance: string;
}

export interface GenerateWalletResponse {
  assetsId: string;
  address: string;
  chain: "bsc";
  createdAt: string;
}

export interface GetWalletResponse {
  assetsId: string;
  address: string;
  chain: "bsc";
  status: "enabled" | "disabled";
  type: "self" | "delegate";
  balanceState: "empty" | "funded";
  balances: TradeTokenBalance[];
}

export interface ApproveRequest {
  assetsId: string;
  tokenAddress: string;
}

export interface ApproveResponse {
  orderId: string;
  spender: string;
  amm: string;
}

export interface SwapRequest {
  assetsId: string;
  tokenAddress: string;
  side: "buy" | "sell";
  amount: string;
  baseToken?: "bnb" | "usdt";
  slippageBps: number;
  confirmToken: string;
}

export interface SwapResponse {
  orderId: string;
  side: "buy" | "sell";
  tokenAddress: string;
  inTokenAddress: string;
  outTokenAddress: string;
  amount: string;
  status: "generated";
  createdAt: string;
}

export interface OrderStatus {
  orderId: string;
  status: "generated" | "sent" | "confirmed" | "error";
  side: "buy" | "sell";
  chain: "bsc";
  txHash: string | null;
  txPriceUsd: string | null;
  inAmount: string | null;
  outAmount: string | null;
  errorMessage: string | null;
}

export interface GetOrdersResponse {
  orders: OrderStatus[];
}

// V4 Trade credential config types

export type CredentialStatus = "active" | "disabled";

export interface TradeCredentialConfig {
  assetsId: string;
  bindingCode: string;
  encryptedApiKey: string;
  encryptedApiSecret: string;
  baseUrl: string;
  status: CredentialStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTradeConfigRequest {
  assetsId?: string;
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
}

export interface CreateTradeConfigResponse {
  assetsId: string;
  bindingCode: string;
  maskedApiKey: string;
  walletAddress?: string;
  status: CredentialStatus;
  updatedAt: string;
}

export interface GetTradeConfigResponse {
  assetsId: string;
  bindingCode: string;
  hasConfig: boolean;
  maskedApiKey: string;
  status: CredentialStatus;
  updatedAt: string;
}

export interface DeleteTradeConfigResponse {
  success: boolean;
  assetsId: string;
}

export interface BindTradeConfigRequest {
  bindingCode: string;
}

export interface BindTradeConfigResponse {
  assetsId: string;
  status: CredentialStatus;
}

/** Extended request types with optional bindingCode support */
export interface ApproveRequestV4 extends ApproveRequest {
  bindingCode?: string;
}

export interface SwapRequestV4 extends SwapRequest {
  bindingCode?: string;
}
