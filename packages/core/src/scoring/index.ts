import type { AddressScore, PersonaScore, TokenBrief } from "../types";
import type { AnalyzeAddressAffinityInput } from "./address-analysis";

export interface PersonaScorer {
  scorePersona(token: TokenBrief): Promise<PersonaScore>;
}

export interface AddressScorer {
  scoreAddress(input: AnalyzeAddressAffinityInput): Promise<AddressScore>;
}

export * from "./address-analysis";
export * from "./cz-affinity";
export * from "./live-contract";
