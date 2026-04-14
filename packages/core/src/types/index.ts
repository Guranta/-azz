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
  walletAddress: string;
  chain: "bsc";
  createdAt: string;
}

export interface GenerateWalletWithBindingResponse extends GenerateWalletResponse {
  bindingCode: string;
}

export interface GetWalletResponse {
  assetsId: string;
  walletAddress: string;
  chain: "bsc";
  status: "enabled" | "disabled";
  type: "self" | "delegate";
  balanceState: "empty" | "funded" | "unknown";
  balanceSource?: "ave" | "rpc" | "unknown";
  balances: TradeTokenBalance[];
}

export interface ApproveRequest {
  assetsId?: string;
  bindingCode?: string;
  tokenAddress: string;
}

export interface ApproveResponse {
  orderId: string;
  spender: string;
  amm: string;
}

export interface SwapRequest {
  assetsId?: string;
  bindingCode?: string;
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

// Wallet binding types (platform-managed wallets)

export type BindingStatus = "active" | "disabled";

export interface WalletBinding {
  assetsId: string;
  walletAddress: string;
  bindingCode: string;
  status: BindingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BindResponse {
  assetsId: string;
  status: BindingStatus;
  wallet?: GetWalletResponse | null;
}

// V6 Strategy Simulator types

export type StrategyId = "gambler" | "p-zi" | "diamond";

export interface StrategyHolding {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  quantity: number;
  entryProxyPrice: number;
  currentProxyPrice: number;
  entryAt: string;
  currentValueUsd: number;
  pnlPct: number;
}

export interface StrategyTradeRecord {
  action: "buy" | "sell";
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  amountUsd: number;
  quantity: number;
  proxyPrice: number;
  reason: string;
  executedAt: string;
}

export type StrategyDraftAction = "buy" | "sell" | "hold";

export interface StrategyDraft {
  strategyId: StrategyId;
  action: StrategyDraftAction;
  tokenAddress: string | null;
  baseToken: "usdt";
  amount: number;
  reason: string;
  generatedAt: string;
}

export interface StrategyEquityPoint {
  strategyId: StrategyId;
  pointAt: string;
  equityUsd: number;
}

export interface StrategySnapshot {
  strategyId: StrategyId;
  strategyName: string;
  cashUsd: number;
  holdings: StrategyHolding[];
  recentTrades: StrategyTradeRecord[];
  latestDraft: StrategyDraft;
  equityUsd: number;
  totalPnlPct: number;
  updatedAt: string;
  status: "ok" | "stale" | "error";
}

export interface StrategyCandidatePoolInfo {
  source: "holdings+scored_pool";
  holdingsCount: number;
  scoredPoolCount: number;
  autoDiscoveryAvailable: false;
}

export interface GetStrategySnapshotResponse {
  snapshots: StrategySnapshot[];
  equityPoints: StrategyEquityPoint[];
  lastRefreshAt: string | null;
  refreshStatus: "ok" | "stale" | "never";
  candidatePool: StrategyCandidatePoolInfo | null;
}

export interface GetStrategyDraftsResponse {
  drafts: StrategyDraft[];
  generatedAt: string | null;
}

// ---------------------------------------------------------------------------
// Withdrawal (V6 — BNB full withdrawal from platform-managed wallets)
// ---------------------------------------------------------------------------

export interface WithdrawRequest {
  bindingCode: string;
  toAddress: string;
}

export interface WithdrawResponse {
  transferId: string;
  fromAddress: string;
  toAddress: string;
  amountWei: string;
  amountHuman: string;
  gasBufferWei: string;
  status: string;
  createdAt: string;
}

export type WithdrawStatus = "generated" | "sent" | "confirmed" | "error";
