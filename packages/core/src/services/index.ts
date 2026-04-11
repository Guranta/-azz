import type { ScoreTokenResponse } from "../types";

export interface ScoreTokenRequest {
  tokenAddress: string;
  chain?: "bsc";
}

export interface ScoreTokenService {
  scoreToken(input: ScoreTokenRequest): Promise<ScoreTokenResponse>;
}

export * from "./ave-data";
