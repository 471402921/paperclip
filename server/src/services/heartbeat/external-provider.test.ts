import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildNativeExecutionInput } from "../native-runtime/native-execution-input.js";
import { nativeRuntimeContextFixture } from "../native-runtime/runtime-context.test-fixture.js";
import { parseNativeExecutionInput, type NativeExecutionInput } from "../../vendor/paperclip-runner/index.js";
import { heartbeatExternalProvider, nativeRuntimeHasInstructionFilesystem, nativeExecutionUsesTaskWorkspace } from "./external-provider.js";

function execution(provider: "muse" | "openai_dot" | "codex"): NativeExecutionInput {
  const companyId = randomUUID(), agentId = randomUUID(), runId = randomUUID(), issueId = randomUUID();
  const binding = { companyId, agentId, bindingId: randomUUID(), bindingGeneration: 1,
    acceptByUnixMs: Date.now() + 60_000, expiresAtUnixMs: Date.now() + 600_000 };
  const completionContract = { id: randomUUID(), sha256: `sha256:${"a".repeat(64)}`, schemaVersion: "paperclip.run-result.v1",
    contract: { revision: "1", objective: "Complete the task", criteria: [{ id: "objective", requirement: "Complete the task" }] } };
  const runtimeContext = nativeRuntimeContextFixture();
  // Foundation declares the closed V7 contract; its server Muse builder belongs
  // to the later feature slice,so exercise the actual Runner parser directly.
  if (provider === "muse") return parseNativeExecutionInput({
    schema: "paperclip.native-execution-input.v7", binding: { companyId, agentId, runId, issueId, executionWorkspaceId: randomUUID() },
    task: { identifier: "EXT-1", title: "Bound task", description: null, prompt: "Complete the task", workMode: "standard" },
    provider: { kind: "muse", model: null, binding, bridgeRevision: "muse-v1" },
    workspace: { access: "none", cwd: null, repoUrl: null, repoRef: null, branchName: null },
    session: { normalizedSessionId: randomUUID(), driverKind: "muse_external", protocolVersion: 1, lifecyclePolicy: { mode: "per_turn", idleTimeoutMs: null } },
    executionMode: "default", planningContext: null, completionContract, runtimeContext, interactionResponses: [], credentialBindings: [],
  });
  const input = { companyId, agentId, runId, issue: { id: issueId, identifier: "EXT-1", title: "Bound task", description: null, workMode: "standard" as const },
    taskPrompt: "Complete the task", normalizedSessionId: randomUUID(),
    workspace: { id: randomUUID(), cwd: "/controller", repoUrl: null, repoRef: null, branchName: null }, completionContract, runtimeContext };
  return provider === "openai_dot" ? buildNativeExecutionInput({ ...input, provider, dotBinding: binding })
    : buildNativeExecutionInput({ ...input, provider: "codex" });
}

describe("shared external heartbeat classification", () => {
  it.each(["muse", "openai_dot", "codex"] as const)("classifies fresh%s admission without starting a runtime", provider => {
    expect(heartbeatExternalProvider({ agent: { adapterType: "paperclip_runner", adapterConfig: { provider } },
      run: { runtimeMode: "legacy", runnerProfileJson: null } })).toBe(provider === "codex" ? null : provider);
  });
  it.each(["muse", "openai_dot", "codex"] as const)("preserves admitted%s placement across configured provider changes", provider => {
    expect(heartbeatExternalProvider({ agent: { adapterType: "paperclip_runner", adapterConfig: { provider: provider === "muse" ? "codex" : "muse" } },
      run: { runtimeMode: "native", runnerProfileJson: { nativeExecutionInput: execution(provider) } } })).toBe(provider === "codex" ? null : provider);
  });
  it.each(["muse", "openai_dot"] as const)("keeps%s outside task and instruction filesystem authority", provider => {
    const admitted = execution(provider);
    expect(nativeRuntimeHasInstructionFilesystem(admitted.session.driverKind)).toBe(false);
    expect(nativeExecutionUsesTaskWorkspace(admitted)).toBe(false);
  });
  it("retains local workspace authority and ignores external-looking process configuration", () => {
    expect(nativeRuntimeHasInstructionFilesystem("codex_app_server")).toBe(true);
    expect(nativeExecutionUsesTaskWorkspace(execution("codex"))).toBe(true);
    expect(nativeExecutionUsesTaskWorkspace(null)).toBe(false);
    expect(heartbeatExternalProvider({ agent: { adapterType: "process", adapterConfig: { provider: "muse" } },
      run: { runtimeMode: "legacy", runnerProfileJson: null } })).toBeNull();
  });
});
