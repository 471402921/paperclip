import { describe, expect, it } from "vitest";
import { createTurnAdmissionDiagnostics, type AcpxTurnAdmissionStage } from "./turn-admission-diagnostics.js";

describe("closed turn admission diagnostics", () => {
  it.each([
    ["initialize", "turn_initialize", "turn_initialized"],
    ["session/load", "turn_session_load", "turn_session_loaded"],
    ["session/resume", "turn_session_resume", "turn_session_resumed"],
    ["session/new", "turn_session_new", "turn_session_created"],
  ] as const)("retains pending %s without exposing wire data", (method, sent, completed) => {
    const stages: AcpxTurnAdmissionStage[] = [];
    const diagnostics = createTurnAdmissionDiagnostics(stage => stages.push(stage));
    diagnostics.onAcpMessage("outbound", { id: 1, method });
    expect(stages).toEqual([]);
    diagnostics.begin();
    diagnostics.onAcpMessage("outbound", { id: "private-id-canary", method, params: { path: "/secret-canary", token: "token-canary" } });
    expect(stages.at(-1)).toBe(sent);
    diagnostics.onAcpMessage("inbound", { id: "unrelated", result: {} });
    expect(stages.at(-1)).toBe(sent);
    diagnostics.onAcpMessage("inbound", { id: "private-id-canary", result: { content: "response-canary" } });
    expect(stages.at(-1)).toBe(completed);
    expect(JSON.stringify(stages)).not.toMatch(/canary/);
  });

  it("ignores rejected, unknown, stale and oversized requests", () => {
    const stages: AcpxTurnAdmissionStage[] = [];
    const diagnostics = createTurnAdmissionDiagnostics(stage => stages.push(stage));
    const old = diagnostics.begin();
    diagnostics.onAcpMessage("outbound", { id: 1, method: "session/load" });
    diagnostics.onAcpMessage("inbound", { id: 1, error: { message: "private-canary" } });
    expect(stages.at(-1)).toBe("turn_session_load");
    diagnostics.onAcpMessage("outbound", { id: 2, method: "initialize" });
    diagnostics.begin();
    const count = stages.length;
    old.report("turn_ownership_verified");
    old.end();
    diagnostics.onAcpMessage("inbound", { id: 2, result: {} });
    diagnostics.onAcpMessage("outbound", { id: 3, method: "constructor" });
    diagnostics.onAcpMessage("outbound", { id: "x".repeat(129), method: "initialize" });
    expect(stages).toHaveLength(count);
    diagnostics.report("turn_spawn");
    expect(stages.at(-1)).toBe("turn_spawn");
  });

  it.each([false, true])("isolates throwing/rejecting observers (async=%s)", async (async) => {
    const diagnostics = createTurnAdmissionDiagnostics(() => {
      if (async) return Promise.reject(new Error("observer-canary"));
      throw new Error("observer-canary");
    });
    expect(() => {
      const turn = diagnostics.begin();
      diagnostics.onAcpMessage("outbound", { id: 1, method: "initialize" });
      diagnostics.onAcpMessage("inbound", { id: 1, result: {} });
      turn.report("turn_prompt_submitted");
      turn.end();
    }).not.toThrow();
    await Promise.resolve();
  });
});
