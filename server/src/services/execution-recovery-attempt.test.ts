import { describe, expect, it } from "vitest";
import { executionFailureRetryCount, isComputerAdmissionWait } from "./execution-recovery-attempt.js";

describe("failure attempts across resource waits", () => {
  it("preserves prior failures through subscription waits without trusting unrelated context", () => {
    expect(executionFailureRetryCount({ scheduledRetryReason: "ai_connection_busy", scheduledRetryAttempt: 12,
      contextSnapshot: { failureRetriesBeforeAiConnectionWait: 1 } })).toBe(1);
    expect(executionFailureRetryCount({ scheduledRetryReason: "transient_failure", scheduledRetryAttempt: 2,
      contextSnapshot: { failureRetriesBeforeAiConnectionWait: 0 } })).toBe(2);
    for (const count of [undefined, -1, 1.5, "0"]) {
      expect(executionFailureRetryCount({ scheduledRetryReason: "ai_connection_busy", scheduledRetryAttempt: 4,
        contextSnapshot: { failureRetriesBeforeAiConnectionWait: count } })).toBe(4);
    }
  });
  it("preserves prior failures through repeated workspace waits", () => {
    expect(executionFailureRetryCount({ scheduledRetryReason: "workspace_busy", scheduledRetryAttempt: 12,
      contextSnapshot: { failureRetriesBeforeWorkspaceWait: 1 } })).toBe(1);
  });
  it("does not trust a caller-supplied count outside a server-created workspace retry", () => {
    expect(executionFailureRetryCount({ scheduledRetryReason: "transient_failure", scheduledRetryAttempt: 2,
      contextSnapshot: { failureRetriesBeforeWorkspaceWait: 0 } })).toBe(2);
  });
  it("keeps ambiguous historical counts without treating a historical productive count as failures", () => {
    expect(executionFailureRetryCount({ scheduledRetryReason: "workspace_busy", scheduledRetryAttempt: 4 })).toBe(4);
    expect(executionFailureRetryCount({ scheduledRetryReason: "max_turns_continuation", scheduledRetryAttempt: 4 })).toBe(0);
  });
});

describe("persisted independent accounting", () => {
  it.each(["computer_admission_wait", "max_turns_continuation", "issue_disposition_repair", "workspace_busy", "ai_connection_busy", "ai_connection_pool_wait"])("%s cannot erase prior infrastructure debits or spend more", scheduledRetryReason => {
    expect(executionFailureRetryCount({ scheduledRetryReason, scheduledRetryAttempt: 20,
      contextSnapshot: { executionRetryAccounting: { version: 1, failureRetries: 2, maxTurnContinuations: 1 } },
    })).toBe(2);
  });
  it("never lowers the current failure count from a partial or stale ledger", () => {
    for (const executionRetryAccounting of [
      { version: 1, failureRetries: 0, maxTurnContinuations: 1 },
      { version: 1, failureRetries: -1, maxTurnContinuations: 1 },
      { version: 1, failureRetries: "0", maxTurnContinuations: 1 },
      { version: 2, failureRetries: 0, maxTurnContinuations: 1 },
    ]) expect(executionFailureRetryCount({ scheduledRetryReason: "transient_failure", scheduledRetryAttempt: 2,
      contextSnapshot: { executionRetryAccounting },
    })).toBe(2);
  });
});


describe("structural computer admission wait receipt", () => {
  function receipt() {
    return {
      id: "run-1", companyId: "company-1", status: "cancelled", runtimeMode: "legacy",
      errorCode: "computer_admission_wait",
      resultJson: {
        executionRecovery: { kind: "computer_admission_wait", providerWorkStarted: false },
        cancellation: { expected: true, source: "control_plane", initiator: { type: "system" } },
        computerAdmission: {
          runId: "run-1", companyId: "company-1",
          computerId: "11111111-1111-4111-8111-111111111111",
          environmentId: "22222222-2222-4222-8222-222222222222", stopId: "stop-1",
        },
      },
    };
  }

  it("recognizes the recorded never-dispatched wait without treating a code alone as proof", () => {
    const run = receipt();
    expect(isComputerAdmissionWait(run)).toBe(true);
    expect(isComputerAdmissionWait({ ...run, resultJson: {} })).toBe(false);
    expect(isComputerAdmissionWait({ ...run, resultJson: { ...run.resultJson, executionRecovery: { kind: "computer_admission_wait", providerWorkStarted: true } } })).toBe(false);
    expect(isComputerAdmissionWait({ ...run, resultJson: { ...run.resultJson, cancellation: { ...run.resultJson.cancellation, initiator: { type: "user" } } } })).toBe(false);
  });

  it("rejects foreign run/company receipts, invalid identities and already settled retries", () => {
    const run = receipt();
    for (const computerAdmission of [
      { ...run.resultJson.computerAdmission, runId: "another-run" },
      { ...run.resultJson.computerAdmission, companyId: "another-company" },
      { ...run.resultJson.computerAdmission, computerId: "invalid" },
      { ...run.resultJson.computerAdmission, environmentId: "invalid" },
      { ...run.resultJson.computerAdmission, stopId: "" },
    ]) expect(isComputerAdmissionWait({ ...run, resultJson: { ...run.resultJson, computerAdmission } })).toBe(false);
    expect(isComputerAdmissionWait({ ...run, resultJson: { ...run.resultJson, computerAdmissionRetryOutcome: "superseded" } })).toBe(false);
    expect(isComputerAdmissionWait({ ...run, runnerProfileJson: { nativeExecutionInput: { version: 1 } } })).toBe(false);
    expect(isComputerAdmissionWait({ ...run, runtimeMode: "native" })).toBe(false);
    expect(isComputerAdmissionWait({ ...run, status: "failed" })).toBe(false);
  });
});
