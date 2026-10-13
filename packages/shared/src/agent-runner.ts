/** Request intent only. Agents persist the selected adapter, not an automatic choice. */
export type AgentRunnerChoice = "auto" | "paperclip" | "legacy";
export type AgentRunner = Exclude<AgentRunnerChoice, "auto">;

export interface AgentRunnerAvailability {
  supportedRunners: AgentRunner[];
  defaultRunner: AgentRunner;
}

export function paperclipRunnerProfileForHarness(harness: string): { provider: "codex" } | { provider: "acpx"; acpxAgent: "claude" } | undefined {
  if (harness === "codex_local") return { provider: "codex" };
  if (harness === "claude_local") return { provider: "acpx", acpxAgent: "claude" };
  return undefined;
}

/** Highest required GLIBC version in the shipped GNU/Linux daemon's ELF version needs. */
export const PAPERCLIP_RUNNER_MINIMUM_GLIBC_VERSION = "2.39";

function supportsLinuxLibc(libc?: "glibc" | "musl" | "unknown", version?: string): boolean {
  if (libc !== undefined && libc !== "glibc") return false;
  // Source-only/platform callers do not assert a measured host libc version.
  if (version === undefined) return true;
  const match = typeof version === "string" ? version.trim().match(/^(?:glibc\s+)?(\d+)\.(\d+)(?:\.\d+)?$/) : null;
  if (!match) return false;
  const major = Number(match[1]), minor = Number(match[2]);
  if (!Number.isSafeInteger(major) || !Number.isSafeInteger(minor)) return false;
  const [requiredMajor, requiredMinor] = PAPERCLIP_RUNNER_MINIMUM_GLIBC_VERSION.split(".").map(Number);
  return major > requiredMajor! || (major === requiredMajor && minor >= requiredMinor!);
}

/** Creation defaults follow GNU/Linux and macOS artifacts; Alpine/musl is deferred. */
export function paperclipRunnerSupportsPlatform(harness: string, platform: string, architecture: string, libc?: "glibc" | "musl" | "unknown", glibcVersion?: string): boolean {
  return !!paperclipRunnerProfileForHarness(harness)
    // Omitted libc preserves platform-only callers; detected unknown Linux is not qualified.
    && ((platform === "linux" && supportsLinuxLibc(libc, glibcVersion) && (architecture === "x64" || architecture === "arm64"))
      || (platform === "darwin" && (architecture === "arm64" || architecture === "x64")));
}

/** Recover harness identity without changing execution or guessing unknown providers. */
export function agentHarnessType(adapterType: string, config: Record<string, unknown> = {}): string {
  if (adapterType !== "paperclip_runner") return adapterType;
  if (config.provider === undefined || config.provider === "codex") return "codex_local";
  if (config.provider === "opencode") return "opencode_local";
  if (config.provider === "acpx") {
    const agent = config.acpxAgent ?? "claude";
    return ({ codex: "codex_local", claude: "claude_local", grok: "grok_local", cursor: "cursor", pi: "pi_local" } as Record<string, string>)[String(agent)] ?? `acpx:${String(agent)}`;
  }
  return String(config.provider);
}

export function agentRunner(adapterType: string): AgentRunner {
  return adapterType === "paperclip_runner" ? "paperclip" : "legacy";
}
