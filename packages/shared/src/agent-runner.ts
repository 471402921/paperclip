/** Request intent only. Agents persist the selected adapter, not an automatic choice. */
export type AgentRunnerChoice = "auto" | "paperclip" | "legacy";
export type AgentRunner = Exclude<AgentRunnerChoice, "auto">;

export interface AgentRunnerAvailability {
  supportedRunners: AgentRunner[];
  defaultRunner: AgentRunner;
}

/** Only qualified harnesses graduate their creation default. */
export function paperclipRunnerProfileForHarness(harness: string): { provider: "codex" } | { provider: "acpx"; acpxAgent: "claude" } | undefined {
  if (harness === "codex_local") return { provider: "codex" };
  if (harness === "claude_local") return { provider: "acpx", acpxAgent: "claude" };
  return undefined;
}

/** Creation defaults follow the shipped 64-bit Linux and macOS release artifacts. */
export function paperclipRunnerSupportsPlatform(harness: string, platform: string, architecture: string): boolean {
  // Claude graduates on Apple Silicon first; other targets await package and live qualification.
  if (harness === "claude_local") return platform === "darwin" && architecture === "arm64";
  return !!paperclipRunnerProfileForHarness(harness)
    && ((platform === "linux" && (architecture === "x64" || architecture === "arm64"))
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
