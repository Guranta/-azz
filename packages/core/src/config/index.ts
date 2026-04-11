import type { LogoMode, PersonaConfig, TrackedAddressConfig } from "../types";

const BSC_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const MIN_TRACKED_ADDRESSES = 3;
const MAX_TRACKED_ADDRESSES = 5;

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  value: unknown,
  fieldName: string,
  configName: string
): string {
  if (typeof value !== "string") {
    throw new ConfigValidationError(
      `${configName}.${fieldName} must be a string`
    );
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ConfigValidationError(
      `${configName}.${fieldName} must not be empty`
    );
  }

  return trimmed;
}

function readOptionalString(
  value: unknown,
  fieldName: string,
  configName: string
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return readString(value, fieldName, configName);
}

function readBoolean(
  value: unknown,
  fieldName: string,
  configName: string
): boolean {
  if (typeof value !== "boolean") {
    throw new ConfigValidationError(
      `${configName}.${fieldName} must be a boolean`
    );
  }

  return value;
}

function readLogoMode(
  value: unknown,
  fieldName: string,
  configName: string
): LogoMode {
  const normalized = readString(value, fieldName, configName).toLowerCase();
  if (normalized === "emoji" || normalized === "asset") {
    return normalized;
  }

  throw new ConfigValidationError(
    `${configName}.${fieldName} must be one of: emoji, asset`
  );
}

function ensureUniqueValues(
  values: string[],
  fieldName: string,
  configGroup: string
) {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      throw new ConfigValidationError(
        `${configGroup} contains duplicate ${fieldName}: ${value}`
      );
    }

    seen.add(value);
  }
}

function readLabelOrName(
  value: unknown,
  nameValue: string,
  configName: string
): string {
  if (value === undefined) {
    return nameValue;
  }

  return readString(value, "label", configName);
}

export function isBscAddress(value: string): boolean {
  return BSC_ADDRESS_PATTERN.test(value.trim());
}

export function validatePersonaConfigs(input: unknown): PersonaConfig[] {
  if (!Array.isArray(input)) {
    throw new ConfigValidationError("personas config must be an array");
  }

  const personas = input.map((item, index) => {
    const configName = `personas[${index}]`;
    if (!isRecord(item)) {
      throw new ConfigValidationError(`${configName} must be an object`);
    }

    const name = readString(item.name ?? item.label, "name", configName);

    return {
      id: readString(item.id, "id", configName),
      name,
      label: readLabelOrName(item.label, name, configName),
      enabled: readBoolean(item.enabled, "enabled", configName),
      description: readOptionalString(item.description, "description", configName),
      logoKey: readString(item.logoKey, "logoKey", configName),
      logoMode: readLogoMode(item.logoMode, "logoMode", configName),
    } satisfies PersonaConfig;
  });

  ensureUniqueValues(
    personas.map((persona) => persona.id),
    "id",
    "personas"
  );

  return personas;
}

export function validateTrackedAddressConfigs(
  input: unknown
): TrackedAddressConfig[] {
  if (!Array.isArray(input)) {
    throw new ConfigValidationError(
      "tracked-addresses config must be an array"
    );
  }

  if (
    input.length < MIN_TRACKED_ADDRESSES ||
    input.length > MAX_TRACKED_ADDRESSES
  ) {
    throw new ConfigValidationError(
      `tracked-addresses config must contain ${MIN_TRACKED_ADDRESSES}-${MAX_TRACKED_ADDRESSES} entries`
    );
  }

  const trackedAddresses = input.map((item, index) => {
    const configName = `trackedAddresses[${index}]`;
    if (!isRecord(item)) {
      throw new ConfigValidationError(`${configName} must be an object`);
    }

    const address = readString(item.address, "address", configName);
    if (!isBscAddress(address)) {
      throw new ConfigValidationError(
        `${configName}.address must be a valid EVM-style address`
      );
    }

    const name = readString(item.name ?? item.label, "name", configName);

    return {
      id: readString(item.id, "id", configName),
      name,
      label: readLabelOrName(item.label, name, configName),
      address,
      enabled: readBoolean(item.enabled, "enabled", configName),
      logoKey: readString(item.logoKey, "logoKey", configName),
      logoMode: readLogoMode(item.logoMode, "logoMode", configName),
    } satisfies TrackedAddressConfig;
  });

  ensureUniqueValues(
    trackedAddresses.map((trackedAddress) => trackedAddress.id),
    "id",
    "tracked-addresses"
  );
  ensureUniqueValues(
    trackedAddresses.map((trackedAddress) =>
      trackedAddress.address.toLowerCase()
    ),
    "address",
    "tracked-addresses"
  );

  const enabledCount = trackedAddresses.filter(
    (trackedAddress) => trackedAddress.enabled
  ).length;
  if (
    enabledCount < MIN_TRACKED_ADDRESSES ||
    enabledCount > MAX_TRACKED_ADDRESSES
  ) {
    throw new ConfigValidationError(
      `tracked-addresses config must keep ${MIN_TRACKED_ADDRESSES}-${MAX_TRACKED_ADDRESSES} enabled entries`
    );
  }

  return trackedAddresses;
}
