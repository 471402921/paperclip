import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agentHarnessType, agentRunner, paperclipRunnerProfileForHarness, paperclipRunnerSupportsPlatform, PAPERCLIP_RUNNER_MINIMUM_GLIBC_VERSION, createAgentSchema, updateAgentSchema, testAdapterEnvironmentSchema } from "@paperclipai/shared";
const state = vi.hoisted(() => ({ disabled: [] as string[], overridden: new Set<string>(), settings: {} as Record<string, unknown>, getEnvironment: vi.fn(), bindings: vi.fn(), managedEnvironment: vi.fn(), ssh: vi.fn(), resolveEnvironment: vi.fn(), sandboxQualification: vi.fn() }));
vi.mock("../adapters/registry.js", () => ({ findActiveServerAdapter: (type: string) => ({ type }), hasActiveAdapterOverride: (type: string) => state.overridden.has(type), waitForExternalAdapters: async () => {} }));
vi.mock("./adapter-plugin-store.js", () => ({ getDisabledAdapterTypes: () => state.disabled }));
vi.mock("./instance-settings.js", () => ({ instanceSettingsService: () => ({ get: async () => state.settings }) }));
vi.mock("./environments.js", () => ({ environmentService: () => ({ getById: state.getEnvironment, listBoundCompanyIds: state.bindings, findManagedSandboxEnvironment: state.managedEnvironment, findKubernetesEnvironment: state.managedEnvironment }) }));
vi.mock("./environment-probe.js", () => ({ readSandboxPlatformQualification: state.sandboxQualification }));
vi.mock("./environment-config.js", () => ({ resolveEnvironmentDriverConfigForRuntime: state.resolveEnvironment }));
vi.mock("@paperclipai/adapter-utils/ssh", () => ({ runSshCommand: state.ssh }));
import { AGENT_RUNNER_SSH_PLATFORM_COMMAND, agentRunnerAvailability, resolveAgentRunnerTargetForCompany, resolveNewAgentRunner, resolveNewAgentRunnerForCompany } from "./agent-runner-selection.js";
import { localAgentRunnerTarget } from "../lib/agent-runner-platform.js";
const target = { driver: "local", platform: "linux", architecture: "x64" };
const qualifiedTargets = [target, { driver: "local", platform: "linux", architecture: "arm64" }, { driver: "local", platform: "darwin", architecture: "arm64" }, { driver: "local", platform: "darwin", architecture: "x64" }];
const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")!;
const originalArchitecture = Object.getOwnPropertyDescriptor(process, "arch")!;
afterEach(() => { vi.restoreAllMocks(); Object.defineProperty(process, "platform", originalPlatform); Object.defineProperty(process, "arch", originalArchitecture); });

describe("server-owned Codex runner selection", () => {
  beforeEach(() => { state.disabled = []; state.overridden.clear(); state.settings = {}; state.getEnvironment.mockReset(); state.bindings.mockReset().mockResolvedValue([]); state.managedEnvironment.mockReset(); state.ssh.mockReset().mockResolvedValue({ stdout: "Linux\nx86_64\n" }); state.sandboxQualification.mockReset().mockResolvedValue(null); state.resolveEnvironment.mockReset().mockResolvedValue({ driver: "ssh", config: {} }); });
  it.each(["x64", "arm64"])("keeps detected musl/unknown Linux %s legacy and preserves saved execution", architecture => {
    for (const libc of ["musl", "unknown"] as const) {
      const target = { driver: "local", platform: "linux", architecture, libc };
      expect(agentRunnerAvailability("codex_local", target)).toEqual({ supportedRunners: ["legacy"], defaultRunner: "legacy" });
      const input = { adapterType: "codex_local", adapterConfig: { extraArgs: ["--sandbox", "read-only"] }, target };
      expect(resolveNewAgentRunner(input)).toEqual({ adapterType: input.adapterType, adapterConfig: input.adapterConfig });
      expect(() => resolveNewAgentRunner({ ...input, runner: "paperclip" })).toThrow("unavailable");
      const saved = { adapterType: "paperclip_runner", adapterConfig: { provider: "codex", model: "gpt-5.6-sol" }, target };
      expect(resolveNewAgentRunner(saved)).toEqual({ adapterType: saved.adapterType, adapterConfig: saved.adapterConfig });
      expect(resolveNewAgentRunner({ ...saved, runner: "paperclip" })).toEqual({ adapterType: saved.adapterType, adapterConfig: saved.adapterConfig });
      expect(agentRunnerAvailability("codex_local", { ...target, libc: "glibc" }).defaultRunner).toBe("paperclip");
    }
  });
  it.each([[undefined, false], ["2.38", false], ["2.39", true], ["3.0", true], [" 2.39 ", true], ["malformed", false], ["", false]] as const)("uses the measured local Node libc version (%s) for creation", async (glibcVersionRuntime, native) => {
    Object.defineProperty(process, "platform", { ...originalPlatform, value: "linux" });
    Object.defineProperty(process, "arch", { ...originalArchitecture, value: "arm64" });
    vi.spyOn(process.report, "getReport").mockReturnValue({ header: { glibcVersionRuntime }, environmentVariables: { PRIVATE_SENTINEL: "do-not-retain" } } as never);
    const localTarget = localAgentRunnerTarget();
    expect(localTarget).toEqual({ driver: "local", platform: "linux", architecture: "arm64", libc: glibcVersionRuntime ? "glibc" : "unknown", ...(glibcVersionRuntime ? { glibcVersion: glibcVersionRuntime.trim() } : {}) });
    expect(JSON.stringify(localTarget)).not.toContain("do-not-retain");
    expect(agentRunnerAvailability("codex_local").defaultRunner).toBe(native ? "paperclip" : "legacy");
    const saved = await resolveNewAgentRunnerForCompany({} as never, "company", { adapterType: "codex_local" });
    expect(saved.adapterType).toBe(native ? "paperclip_runner" : "codex_local");
  });
  it.each([
    ["2.38", false], ["2.39", true], ["2.40", true], ["3.0", true], ["2.9", false],
    ["glibc 2.39", true], [" 2.39 ", true], ["2.39.1", true], ["02.039", true],
    ["2.39ubuntu1", false], ["unknown", false], ["", false], ["2", false], ["2.-39", false],
    ["999999999999999999999999.0", false],
  ])("qualifies the measured GNU/Linux daemon ABI for glibc %s (%s)", (glibcVersion, native) => {
    expect(PAPERCLIP_RUNNER_MINIMUM_GLIBC_VERSION).toBe("2.39");
    for (const architecture of ["x64", "arm64"]) {
      const target = { driver: "local", platform: "linux", architecture, libc: "glibc" as const, glibcVersion: String(glibcVersion) };
      expect(paperclipRunnerSupportsPlatform("codex_local", target.platform, architecture, target.libc, target.glibcVersion)).toBe(native);
      expect(agentRunnerAvailability("codex_local", target).defaultRunner).toBe(native ? "paperclip" : "legacy");
      expect(resolveNewAgentRunner({ adapterType: "codex_local", target }).adapterType).toBe(native ? "paperclip_runner" : "codex_local");
      if (!native) expect(() => resolveNewAgentRunner({ adapterType: "codex_local", runner: "paperclip", target })).toThrow("unavailable");
      const saved = { adapterType: "paperclip_runner", adapterConfig: { provider: "codex", model: "gpt-5.6-sol" }, target, runner: "paperclip" as const };
      expect(resolveNewAgentRunner(saved)).toEqual({ adapterType: saved.adapterType, adapterConfig: saved.adapterConfig });
    }
  });
  it("keeps an unidentified local Linux libc legacy if Node's report is unavailable", () => {
    Object.defineProperty(process, "platform", { ...originalPlatform, value: "linux" });
    vi.spyOn(process.report, "getReport").mockImplementation(() => { throw new Error("private-report-details"); });
    expect(localAgentRunnerTarget()).toMatchObject({ libc: "unknown" });
    expect(agentRunnerAvailability("codex_local").defaultRunner).toBe("legacy");
  });
  it.each(qualifiedTargets)("uses native Codex automatically with compatible configuration and is idempotent on $platform/$architecture", target => {
    const input = { adapterType: "codex_local", target, adapterConfig: { model: "gpt-5.6-sol", modelReasoningEffort: "high", env: { OPENAI_API_KEY: { type: "secret_ref", secretId: "secret" } }, cwd: "/workspace", instructionsFilePath: "/workspace/AGENTS.md", workspaceStrategy: { type: "git_worktree" }, timeoutSec: 60, search: false, fastMode: false, dangerouslyBypassApprovalsAndSandbox: true } };
    const resolved = resolveNewAgentRunner(input);
    expect(resolved).toMatchObject({ adapterType: "paperclip_runner", adapterConfig: { provider: "codex", codexPermissionMode: "never", modelReasoningEffort: "high", env: input.adapterConfig.env, workspaceStrategy: input.adapterConfig.workspaceStrategy, timeoutSec: 60 } });
    expect(resolved.adapterConfig).not.toHaveProperty("search");
    expect(resolveNewAgentRunner(resolved)).toEqual(resolved);
    expect(input.adapterConfig).toHaveProperty("search", false);
  });
  it.each(["opencode_local", "grok_local", "cursor", "pi_local", "process", "external"])("keeps %s default unchanged", adapterType => {
    expect(resolveNewAgentRunner({ adapterType, target, adapterConfig: { custom: "preserved" } })).toEqual({ adapterType, adapterConfig: { custom: "preserved" } });
  });
  it.each(qualifiedTargets)("allows an explicit legacy runner and native to legacy round trip on $platform/$architecture", target => {
    expect(resolveNewAgentRunner({ adapterType: "codex_local", target, runner: "legacy", adapterConfig: { extraArgs: ["--search"] } }).adapterType).toBe("codex_local");
    expect(resolveNewAgentRunner({ adapterType: "paperclip_runner", runner: "legacy", adapterConfig: { provider: "codex", model: "gpt-5.6-sol", lifecycleMode: "per_turn", codexPermissionMode: "never", modelReasoningEffort: "high" } })).toEqual({ adapterType: "codex_local", adapterConfig: { model: "gpt-5.6-sol", modelReasoningEffort: "high", dangerouslyBypassApprovalsAndSandbox: true } });
  });
  it("preserves explicit legacy permission policy alongside compatible native lifecycle defaults", () => {
    expect(resolveNewAgentRunner({ adapterType: "codex_local", runner: "legacy", adapterConfig: { dangerouslyBypassApprovalsAndSandbox: false, lifecycleMode: "per_turn" } }))
      .toEqual({ adapterType: "codex_local", adapterConfig: { dangerouslyBypassApprovalsAndSandbox: false } });
    expect(resolveNewAgentRunner({ adapterType: "paperclip_runner", runner: "legacy", adapterConfig: { provider: "codex", codexPermissionMode: "never", lifecycleMode: "per_turn", dangerouslyBypassApprovalsAndSandbox: false } }))
      .toEqual({ adapterType: "codex_local", adapterConfig: { dangerouslyBypassApprovalsAndSandbox: false } });
  });
  it.each([{ platform: "win32", architecture: "x64" }, { platform: "linux", architecture: "arm" }, { platform: "darwin", architecture: "ia32" }])("keeps unqualified $platform/$architecture targets legacy while preserving explicit native profiles", ({ platform, architecture }) => {
    const input = { adapterType: "codex_local", target: { driver: "local", platform, architecture } };
    expect(resolveNewAgentRunner(input).adapterType).toBe("codex_local");
    expect(() => resolveNewAgentRunner({ ...input, runner: "paperclip" })).toThrow("unavailable");
    const saved = { adapterType: "paperclip_runner", adapterConfig: { provider: "codex", model: "gpt-5.6-sol" }, target: input.target };
    expect(resolveNewAgentRunner(saved)).toEqual({ adapterType: saved.adapterType, adapterConfig: saved.adapterConfig });
    expect(resolveNewAgentRunner({ ...saved, runner: "paperclip" })).toEqual({ adapterType: saved.adapterType, adapterConfig: saved.adapterConfig });
  });
  it.each(qualifiedTargets)("automatically keeps unsupported targets and active external overrides legacy on $platform/$architecture", target => {
    const input = { adapterType: "codex_local", target: { driver: "local", platform: "win32", architecture: "x64" } };
    expect(resolveNewAgentRunner(input).adapterType).toBe("codex_local");
    expect(() => resolveNewAgentRunner({ ...input, runner: "paperclip" })).toThrow("unavailable");
    state.overridden.add("codex_local");
    expect(agentRunnerAvailability("codex_local", target).defaultRunner).toBe("legacy");
    expect(resolveNewAgentRunner({ adapterType: "codex_local", target }).adapterType).toBe("codex_local");
    state.overridden.clear();
    state.overridden.add("paperclip_runner");
    expect(resolveNewAgentRunner({ adapterType: "codex_local", target }).adapterType).toBe("codex_local");
  });
  it.each(qualifiedTargets)("does not select a disabled runner on $platform/$architecture", target => {
    state.disabled = ["paperclip_runner"];
    expect(resolveNewAgentRunner({ adapterType: "codex_local", target }).adapterType).toBe("codex_local");
    expect(() => resolveNewAgentRunner({ adapterType: "codex_local", target, runner: "paperclip" })).toThrow("unavailable");
    state.disabled = ["codex_local"];
    expect(() => resolveNewAgentRunner({ adapterType: "codex_local", target })).toThrow("Codex is disabled");
  });
  it.each(["extraArgs", "agentCommand", "networkScope", "filesystemScope", "search"])("rejects incompatible %s without changing runner", field => {
    expect(() => resolveNewAgentRunner({ adapterType: "codex_local", target, adapterConfig: { [field]: true } })).toThrow("Legacy runner");
    try { resolveNewAgentRunner({ adapterType: "codex_local", target, adapterConfig: { [field]: true } }); }
    catch (error) { expect(error).toMatchObject({ status: 422, details: { fields: [field] } }); }
  });
  it("preserves explicit historical native profiles, including managed configurations", () => {
    for (const config of [{ provider: "acpx", acpxAgent: "claude", model: "claude-sonnet-5" }, { provider: "claude_managed", managedProfileId: "profile", managedAgentsRetentionAcknowledged: true }, { provider: "aws_agentcore", agentCoreProfileId: "profile" }]) expect(resolveNewAgentRunner({ adapterType: "paperclip_runner", adapterConfig: config })).toEqual({ adapterType: "paperclip_runner", adapterConfig: config });
  });
  it("rejects a foreign environment before resolving credentials or probing its platform", async () => {
    state.getEnvironment.mockResolvedValue({ id: "foreign", driver: "ssh", status: "active", config: {} });
    state.bindings.mockResolvedValue(["another-company"]);
    await expect(resolveNewAgentRunnerForCompany({} as never, "company", { adapterType: "codex_local", defaultEnvironmentId: "foreign" })).rejects.toMatchObject({ status: 403, details: { code: "environment_company_mismatch" } });
    expect(state.resolveEnvironment).not.toHaveBeenCalled(); expect(state.ssh).not.toHaveBeenCalled();
  });
  it("uses dispatch's instance default for a null agent override and checks the selected SSH platform", async () => {
    state.settings = { defaultEnvironmentId: "default" };
    state.getEnvironment.mockResolvedValue({ id: "default", driver: "ssh", status: "active", config: {} });
    state.ssh.mockResolvedValue({ stdout: "Linux\naarch64\n" });
    const result = await resolveNewAgentRunnerForCompany({} as never, "company", { adapterType: "codex_local", defaultEnvironmentId: null });
    expect(state.getEnvironment).toHaveBeenCalledWith("default"); expect(state.bindings).toHaveBeenCalledWith("default");
    expect(result.adapterType).toBe("paperclip_runner");
  });
  it.each([
    ["Linux\nx86_64\n", "paperclip", "paperclip_runner"],
    ["Darwin\narm64\n", "paperclip", "paperclip_runner"],
    ["Darwin\nx86_64\n", "paperclip", "paperclip_runner"],
    ["Linux\naarch64\n", "paperclip", "paperclip_runner"],
    ["Linux\narm64\n", "paperclip", "paperclip_runner"],
    ["Linux\nx86_64\nglibc\n", "paperclip", "paperclip_runner"],
    ["Linux\naarch64\nglibc\n", "paperclip", "paperclip_runner"],
    ["Linux\nx86_64\nglibc\nglibc 2.38\n", "legacy", "codex_local"],
    ["Linux\naarch64\nglibc\nglibc 2.38\n", "legacy", "codex_local"],
    ["Linux\nx86_64\nglibc\nglibc 2.39\n", "paperclip", "paperclip_runner"],
    ["Linux\naarch64\nglibc\nglibc 3.0\n", "paperclip", "paperclip_runner"],
    ["Linux\nx86_64\nglibc\nmalformed\n", "legacy", "codex_local"],
    ["Linux\nx86_64\nmusl\n", "legacy", "codex_local"],
    ["Linux\naarch64\nmusl\n", "legacy", "codex_local"],
    ["Linux\nx86_64\nunknown\n", "legacy", "codex_local"],
    ["Linux\narmv7l\n", "legacy", "codex_local"],
  ])("uses the same selected SSH target for discovery and saving (%s)", async (stdout, expectedRunner, expectedAdapter) => {
    state.getEnvironment.mockResolvedValue({ id: "selected", driver: "ssh", status: "active", config: {} });
    state.ssh.mockResolvedValue({ stdout });
    const discoveredTarget = await resolveAgentRunnerTargetForCompany({} as never, "company", "selected");
    expect(agentRunnerAvailability("codex_local", discoveredTarget).defaultRunner).toBe(expectedRunner);
    const saved = await resolveNewAgentRunnerForCompany({} as never, "company", { adapterType: "codex_local", defaultEnvironmentId: "selected" });
    expect(saved.adapterType).toBe(expectedAdapter);
    expect(state.ssh).toHaveBeenCalledTimes(2);
    expect(state.ssh).toHaveBeenCalledWith({}, AGENT_RUNNER_SSH_PLATFORM_COMMAND, { timeoutMs: 10_000 });
  });
  it("preserves recorded explicit native execution without rechecking creation defaults", async () => {
    const recorded = { adapterType: "paperclip_runner", adapterConfig: { provider: "codex", model: "gpt-5.6-sol" }, runner: "paperclip" as const };
    expect(await resolveNewAgentRunnerForCompany({} as never, "company", recorded)).toEqual({ adapterType: recorded.adapterType, adapterConfig: recorded.adapterConfig });
    expect(state.getEnvironment).not.toHaveBeenCalled();
    expect(state.ssh).not.toHaveBeenCalled();
  });
  it.each([
    [{ platform: "linux", architecture: "x64", libc: "glibc", glibcVersion: "2.39" }, "paperclip_runner"],
    [{ platform: "linux", architecture: "arm64", libc: "glibc", glibcVersion: "3.0" }, "paperclip_runner"],
    [{ platform: "linux", architecture: "arm64", libc: "glibc", glibcVersion: "2.38" }, "codex_local"],
    [{ platform: "linux", architecture: "x64", libc: "glibc" }, "codex_local"],
    [{ platform: "linux", architecture: "arm64", libc: "musl" }, "codex_local"],
    [{ platform: "linux", architecture: "unknown", libc: "glibc", glibcVersion: "2.39" }, "codex_local"],
  ])("uses cached selected-image measurements for sandbox creation/discovery (%j)", async (facts, expected) => {
    state.getEnvironment.mockResolvedValue({ id: "sandbox", driver: "sandbox", status: "active", config: { provider: "daytona" } });
    state.sandboxQualification.mockResolvedValue(facts);
    const selectedTarget = await resolveAgentRunnerTargetForCompany({} as never, "company", "sandbox");
    expect(agentRunnerAvailability("codex_local", selectedTarget).defaultRunner).toBe(expected === "paperclip_runner" ? "paperclip" : "legacy");
    const result = await resolveNewAgentRunnerForCompany({} as never, "company", { adapterType: "codex_local", defaultEnvironmentId: "sandbox" });
    expect(result.adapterType).toBe(expected);
    expect(state.ssh).not.toHaveBeenCalled();
    expect(state.resolveEnvironment).not.toHaveBeenCalled();
    if (expected === "codex_local") await expect(resolveNewAgentRunnerForCompany({} as never, "company", { adapterType: "codex_local", runner: "paperclip", defaultEnvironmentId: "sandbox" })).rejects.toMatchObject({ status: 422 });
  });
  it("does not infer a sandbox image architecture from its driver", async () => {
    state.getEnvironment.mockResolvedValue({ id: "sandbox", driver: "sandbox", status: "active", config: { provider: "daytona" } });
    const result = await resolveNewAgentRunnerForCompany({} as never, "company", { adapterType: "codex_local", defaultEnvironmentId: "sandbox" });
    expect(result.adapterType).toBe("codex_local"); expect(state.ssh).not.toHaveBeenCalled();
    expect(state.sandboxQualification).toHaveBeenCalledWith({}, expect.objectContaining({ id: "sandbox" }), "company");
    await expect(resolveNewAgentRunnerForCompany({} as never, "company", { adapterType: "codex_local", runner: "paperclip", defaultEnvironmentId: "sandbox" })).rejects.toMatchObject({ status: 422, details: { code: "agent_runner_unavailable" } });
  });
});

describe("Codex creation runner contract", () => {
  it("graduates only Codex and retains saved provider identity", () => {
    expect(paperclipRunnerProfileForHarness("codex_local")).toEqual({ provider: "codex" });
    expect(paperclipRunnerProfileForHarness("claude_local")).toEqual({ provider: "acpx", acpxAgent: "claude" });
    for (const harness of ["opencode_local", "grok_local", "cursor", "pi_local", "process"]) expect(paperclipRunnerProfileForHarness(harness)).toBeUndefined();
    expect(agentHarnessType("paperclip_runner", { provider: "codex" })).toBe("codex_local");
    expect(agentHarnessType("paperclip_runner", { provider: "acpx", acpxAgent: "claude" })).toBe("claude_local");
    expect(agentHarnessType("paperclip_runner", { provider: "unknown" })).toBe("unknown");
    expect(agentHarnessType("paperclip_runner", { provider: "acpx", acpxAgent: "unknown" })).toBe("acpx:unknown");
    expect(agentRunner("codex_local")).toBe("legacy");
    expect(agentRunner("paperclip_runner")).toBe("paperclip");
  });
  it("qualifies only the Codex daemon targets shipped in public server packages", () => {
    for (const { platform, architecture } of qualifiedTargets) expect(paperclipRunnerSupportsPlatform("codex_local", platform, architecture)).toBe(true);
    for (const architecture of ["x64", "arm64"]) {
      expect(paperclipRunnerSupportsPlatform("codex_local", "linux", architecture, "glibc")).toBe(true);
      expect(paperclipRunnerSupportsPlatform("codex_local", "linux", architecture, "musl")).toBe(false);
      expect(paperclipRunnerSupportsPlatform("codex_local", "linux", architecture, "unknown")).toBe(false);
    }
    for (const [platform, architecture] of [["darwin", "ia32"], ["linux", "arm"], ["win32", "x64"], ["win32", "arm64"], ["freebsd", "x64"]]) expect(paperclipRunnerSupportsPlatform("codex_local", platform, architecture)).toBe(false);
    expect(paperclipRunnerSupportsPlatform("claude_local", "darwin", "arm64")).toBe(true);
  });
  it("keeps auto out of saved update defaults and validates request intent", () => {
    expect(createAgentSchema.parse({ name: "Codex", adapterType: "codex_local" }).runner).toBeUndefined();
    expect(updateAgentSchema.parse({ title: "same execution" })).not.toHaveProperty("runner");
    expect(testAdapterEnvironmentSchema.parse({ runner: "legacy" }).runner).toBe("legacy");
    expect(createAgentSchema.safeParse({ name: "Codex", adapterType: "codex_local", runner: "other" }).success).toBe(false);
  });
});


describe("Claude runner defaults", () => {
  const mac = { driver: "local", platform: "darwin", architecture: "arm64" };
  beforeEach(() => { state.disabled = []; state.overridden.clear(); });
  it.each(qualifiedTargets)("defaults Claude to the qualified $platform $architecture profile", target => {
    expect(agentRunnerAvailability("claude_local", target)).toEqual({ supportedRunners: ["paperclip", "legacy"], defaultRunner: "paperclip" });
    expect(resolveNewAgentRunner({ adapterType: "claude_local", target })).toEqual({
      adapterType: "paperclip_runner", adapterConfig: { provider: "acpx", acpxAgent: "claude", model: "claude-opus-5-5", acpxPermissionMode: "approve-all", lifecycleMode: "per_turn" },
    });
    expect(resolveNewAgentRunner({ adapterType: "claude_local", target, runner: "legacy", adapterConfig: { model: "custom", dangerouslySkipPermissions: true } }))
      .toEqual({ adapterType: "claude_local", adapterConfig: { model: "custom", dangerouslySkipPermissions: true } });
  });
  it.each(["x64", "arm64"])("keeps Darwin SSH %s automatic selection Legacy while preserving explicit assets", architecture => {
    const target = { driver: "ssh", platform: "darwin", architecture };
    expect(agentRunnerAvailability("claude_local", target)).toEqual({ supportedRunners: ["paperclip", "legacy"], defaultRunner: "legacy" });
    const config = { model: "custom-model", dangerouslySkipPermissions: false };
    expect(resolveNewAgentRunner({ adapterType: "claude_local", target, adapterConfig: config })).toEqual({ adapterType: "claude_local", adapterConfig: config });
    const assets = { runnerRemoteProviderPackPath: "/operator/mac-pack", runnerRemoteBinaryPath: "/operator/mac-daemon" };
    expect(resolveNewAgentRunner({ adapterType: "claude_local", target, runner: "paperclip", adapterConfig: assets }))
      .toMatchObject({ adapterType: "paperclip_runner", adapterConfig: { ...assets, provider: "acpx", acpxAgent: "claude" } });
    const saved = { adapterType: "paperclip_runner", adapterConfig: { ...assets, provider: "acpx", acpxAgent: "claude" }, target };
    expect(resolveNewAgentRunner(saved)).toEqual({ adapterType: saved.adapterType, adapterConfig: saved.adapterConfig });
  });
  it.each(["x64", "arm64"])("keeps incompatible Linux Claude %s targets legacy", architecture => {
    for (const libc of ["musl", "unknown"] as const) {
      expect(agentRunnerAvailability("claude_local", { driver: "local", platform: "linux", architecture, libc }).defaultRunner).toBe("legacy");
    }
    expect(agentRunnerAvailability("claude_local", { driver: "local", platform: "linux", architecture, libc: "glibc", glibcVersion: "2.17" }).defaultRunner).toBe("legacy");
  });
  it("saves native Claude with Opus 5.5, preserving credentials and shared settings", () => {
    const config = { env: { ANTHROPIC_API_KEY: { type: "secret_ref", secretId: "key" } }, instructionsFilePath: "/workspace/AGENTS.md", timeoutSec: 180, dangerouslySkipPermissions: true };
    const result = resolveNewAgentRunner({ adapterType: "claude_local", target: mac, adapterConfig: config });
    expect(result).toEqual({ adapterType: "paperclip_runner", adapterConfig: { env: config.env, instructionsFilePath: config.instructionsFilePath, timeoutSec: 180, provider: "acpx", acpxAgent: "claude", model: "claude-opus-5-5", acpxPermissionMode: "approve-all", lifecycleMode: "per_turn" } });
    expect(resolveNewAgentRunner(result)).toEqual(result);
    expect(config.dangerouslySkipPermissions).toBe(true);
  });
  it("preserves explicit models and Legacy choices", () => {
    const legacy = { adapterType: "claude_local", target: mac, runner: "legacy" as const, adapterConfig: { model: "custom", chrome: true } };
    expect(resolveNewAgentRunner(legacy)).toEqual({ adapterType: legacy.adapterType, adapterConfig: legacy.adapterConfig });
    expect(resolveNewAgentRunner({ adapterType: "claude_local", target: mac, adapterConfig: { model: "custom" } }).adapterConfig.model).toBe("custom");
  });
  it.each(["claude-sonnet-5-5", "custom-model"])("preserves the plain environment model binding %s", model => {
    const env = { ANTHROPIC_MODEL: { type: "plain", value: model } };
    const native = resolveNewAgentRunner({ adapterType: "claude_local", target: mac, adapterConfig: { env } });
    expect(native.adapterConfig.model).toBe(model);
    expect(native.adapterConfig.env).toEqual(env);
  });
  it.each(["ANTHROPIC_MODEL", "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX", "ANTHROPIC_BEDROCK_BASE_URL"])("rejects unresolved %s before choosing a default", key => {
    const env = { [key]: { type: "secret_ref", secretId: "override" } };
    expect(() => resolveNewAgentRunner({ adapterType: "claude_local", target: mac, adapterConfig: { env } })).toThrow(`env.${key}`);
    expect(resolveNewAgentRunner({ adapterType: "claude_local", target: mac, adapterConfig: { env, model: "custom-model" } }).adapterConfig.model).toBe("custom-model");
  });
  it("does not pin the ordinary model over a plain provider-routing binding", () => {
    expect(() => resolveNewAgentRunner({ adapterType: "claude_local", target: mac,
      adapterConfig: { env: { CLAUDE_CODE_USE_BEDROCK: { type: "plain", value: "1" } } } })).toThrow("Legacy runner");
  });
  it.each(["permissionMode", "acpPermissionMode"])("translates the legacy Claude %s without granting broader permissions", key => {
    for (const mode of ["deny-all", "approve-reads", "approve-all"]) {
      const native = resolveNewAgentRunner({ adapterType: "claude_local", target: mac, adapterConfig: { engine: "acp", [key]: mode } });
      expect(native.adapterConfig.acpxPermissionMode).toBe(mode);
      expect(native.adapterConfig[key]).toBeUndefined();
    }
    expect(() => resolveNewAgentRunner({ adapterType: "claude_local", target: mac, adapterConfig: { [key]: "deny-all", acpxPermissionMode: "approve-all" } })).toThrow("cannot honor");
    expect(() => resolveNewAgentRunner({ adapterType: "claude_local", target: mac, adapterConfig: { [key]: "unrecognized" } })).toThrow("Legacy runner");
  });
  it("retains saved native Claude and allows an explicit compatible Legacy switch", () => {
    const saved = { adapterType: "paperclip_runner", adapterConfig: { provider: "acpx", acpxAgent: "claude", model: "custom", acpxPermissionMode: "approve-all", lifecycleMode: "per_turn" } };
    expect(resolveNewAgentRunner(saved)).toEqual(saved);
    expect(resolveNewAgentRunner({ ...saved, runner: "legacy" })).toEqual({ adapterType: "claude_local", adapterConfig: { model: "custom", dangerouslySkipPermissions: true } });
    expect(() => resolveNewAgentRunner({ ...saved, runner: "legacy", adapterConfig: { ...saved.adapterConfig, acpxPermissionMode: "deny-all" } })).toThrow("cannot honor");
  });
  it.each(["chrome", "agentCommand", "maxTurnsPerRun", "networkScope"])("rejects unsupported %s without fallback", key => {
    expect(() => resolveNewAgentRunner({ adapterType: "claude_local", target: mac, adapterConfig: { [key]: "configured" } })).toThrow("Legacy runner");
  });
  it.each(["low", "medium", "high", "xhigh", "max"])("translates Claude effort %s and preserves it on an explicit Legacy switch", effort => {
    const native = resolveNewAgentRunner({ adapterType: "claude_local", target: mac, adapterConfig: { effort } });
    expect(native.adapterConfig.modelReasoningEffort).toBe(effort);
    expect(native.adapterConfig.effort).toBeUndefined();
    expect(resolveNewAgentRunner({ ...native, runner: "legacy" }).adapterConfig).toMatchObject({ effort });
  });
  it("rejects invalid effort and unknown platform defaults", () => {
    expect(() => resolveNewAgentRunner({ adapterType: "claude_local", target: mac, adapterConfig: { effort: "ultra" } })).toThrow("Claude effort");
    expect(agentRunnerAvailability("claude_local", { driver: "sandbox" }).defaultRunner).toBe("legacy");
  });
  it("keeps unqualified targets and overrides legacy", () => {
    expect(agentRunnerAvailability("claude_local", { driver: "local", platform: "win32", architecture: "x64" }).defaultRunner).toBe("legacy");
    state.overridden.add("claude_local");
    expect(agentRunnerAvailability("claude_local", mac).defaultRunner).toBe("legacy");
    state.overridden.clear(); state.disabled = ["claude_local"];
    expect(() => resolveNewAgentRunner({ adapterType: "claude_local", target: mac })).toThrow("Claude is disabled");
  });
});
