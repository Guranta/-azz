import { getBindingByBindingCode, getBindingByAssetsId } from "./binding-store";
import { createAveBotClientFromEnv, AveBotClient } from "./ave-bot-client";

/**
 * Resolve an AveBotClient and assetsId from a bindingCode or assetsId.
 *
 * All trade operations use the platform's AVE Bot API key (env vars).
 * bindingCode / assetsId only identify which wallet to operate on.
 *
 * Returns null when the binding is not found or inactive.
 * Throws AveBotConfigError when AVE_BOT_API_KEY / AVE_BOT_API_SECRET are
 * missing — callers can distinguish "no binding" from "server misconfigured".
 */
export function resolveAveBotClient(params: {
  assetsId?: string;
  bindingCode?: string;
}): { client: AveBotClient; assetsId: string } | null {
  // bindingCode → binding store → assetsId
  if (params.bindingCode) {
    const binding = getBindingByBindingCode(params.bindingCode);
    if (!binding || binding.status !== "active") {
      return null;
    }
    const client = createAveBotClientFromEnv();
    return { client, assetsId: binding.assetsId };
  }

  // assetsId-only → binding store lookup, then env client
  if (params.assetsId) {
    const binding = getBindingByAssetsId(params.assetsId);
    if (!binding || binding.status !== "active") {
      return null;
    }
    const client = createAveBotClientFromEnv();
    return { client, assetsId: params.assetsId };
  }

  return null;
}
