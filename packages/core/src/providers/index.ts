export type AiProviderId = "deepseek" | "minimax";

export interface AiProviderConfig {
  id: AiProviderId;
  apiKeyEnvVar: string;
}

export const AI_PROVIDER_CONFIGS: AiProviderConfig[] = [
  { id: "deepseek", apiKeyEnvVar: "DEEPSEEK_API_KEY" },
  { id: "minimax", apiKeyEnvVar: "MINIMAX_API_KEY" },
];

export * from "./minimax";
