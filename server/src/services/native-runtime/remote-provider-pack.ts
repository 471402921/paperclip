import type { NativeRunTrace } from "./native-run-trace.js";
import type { NativeExecutionInput } from "../../vendor/paperclip-runner/index.js";

/** Qualified ACPX releases carry their Linux image manifest and daemon. */
export function shouldUseBundledAcpxImageAssets(input: {
  requiresRemoteProviderPack: boolean;
  configuredProviderPackRoot: string | null;
  provider: NativeExecutionInput["provider"];
}): boolean {
  return input.requiresRemoteProviderPack && !input.configuredProviderPackRoot &&
    input.provider.kind === "acpx" &&
    ["cursor", "copilot"].includes(input.provider.agent);
}

/** Reuse only a pack that passes the same full verification as a new upload. */
export async function prepareVerifiedRemoteProviderPack(input: {
  trace?: NativeRunTrace;
  verifyStaged: () => Promise<void>;
  usePreinstalled: () => Promise<boolean>;
  stageAndVerify: () => Promise<void>;
}): Promise<"staged" | "preinstalled" | "uploaded"> {
  const scope = input.trace?.start("provider_pack.select");
  let failed = false;
  const select = async () => {
    try {
      await input.verifyStaged();
      return "staged" as const;
    } catch {}
    if (await input.usePreinstalled()) return "preinstalled" as const;
    await input.stageAndVerify();
    return "uploaded" as const;
  };
  try {
    const source = scope ? await input.trace!.run(scope, select) : await select();
    if (scope) input.trace!.annotate(scope, { stateSource: source,
      reason: source === "uploaded" ? "cached_packs_unverified" : "verified_pack_reused" });
    return source;
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    if (scope) await input.trace!.end(scope, { outcome: failed ? "failed" : "ok" });
  }
}
