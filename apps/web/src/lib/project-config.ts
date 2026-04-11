import {
  validatePersonaConfigs,
  validateTrackedAddressConfigs,
  type PersonaConfig,
  type TrackedAddressConfig,
} from "@meme-affinity/core";
import rawPersonas from "../../../../config/personas.json";
import rawTrackedAddresses from "../../../../config/tracked-addresses.json";

type ProjectConfig = {
  personas: PersonaConfig[];
  trackedAddresses: TrackedAddressConfig[];
};

const projectConfig: ProjectConfig = {
  personas: validatePersonaConfigs(rawPersonas),
  trackedAddresses: validateTrackedAddressConfigs(rawTrackedAddresses),
};

export function getProjectConfig(): ProjectConfig {
  return projectConfig;
}

export function getEnabledPersonas(): PersonaConfig[] {
  return projectConfig.personas.filter((persona) => persona.enabled);
}

export function getEnabledTrackedAddresses(): TrackedAddressConfig[] {
  return projectConfig.trackedAddresses.filter(
    (trackedAddress) => trackedAddress.enabled
  );
}
