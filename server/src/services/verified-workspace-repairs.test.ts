import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { agents, companies, heartbeatRuns, environmentLeases, executionWorkspaces, issueRecoveryActions, issues, projects, workspaceOperations,
  createDb, ensurePostgresDatabase, applyPendingMigrations } from "@paperclipai/db";
import { getEmbeddedPostgresTestSupport, startEmbeddedPostgresTestDatabase } from "../__tests__/helpers/embedded-postgres.js";
import { reconcileVerifiedWorkspaceRepairs, verifiedWorkspaceRepairCandidates } from "./verified-workspace-repairs.js";
import { remoteTerminationReceipt } from "./remote-execution-termination.js";
import { getExecutionBlocker } from "./execution-blocker.js";

const external = process.env.PAPERCLIP_TEST_DATABASE_URL;
const support = external ? { supported: true } : await getEmbeddedPostgresTestSupport();
(support.supported ? describe : describe.skip)("verified shutdown workspace repair", () => {
  let db: ReturnType<typeof createDb>;
  let temp: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | undefined;
  beforeAll(async () => {
    if (external) {
      const url = new URL(external); url.pathname = "/verified_" + randomUUID().replaceAll("-", "");
      await ensurePostgresDatabase(external, url.pathname.slice(1)); await applyPendingMigrations(url.toString()); db = createDb(url.toString());
    } else { temp = await startEmbeddedPostgresTestDatabase("verified-workspace-repairs-"); db = createDb(temp.connectionString); }
  }, 30000);
  afterAll(async () => { await db?.$client.end(); await temp?.cleanup(); });
  async function fixture() {
    const [company] = await db.insert(companies).values({ name: "Verified repair", issuePrefix: `V${randomUUID().slice(0, 6)}` }).returning();
    const [agent] = await db.insert(agents).values({ companyId: company.id, name: "Owner", adapterType: "claude_local" }).returning();
    const [issue] = await db.insert(issues).values({ companyId: company.id, title: "Human review stays pending", status: "in_review", assigneeAgentId: agent.id }).returning();
    const [project] = await db.insert(projects).values({ companyId: company.id, name: "Source project" }).returning();
    const [workspace] = await db.insert(executionWorkspaces).values({ companyId: company.id, projectId: project.id,
      sourceIssueId: issue.id, name: "Retained source", mode: "isolated", strategyType: "git_worktree" }).returning();
    const runId = randomUUID(), leaseId = randomUUID(), providerLeaseId = randomUUID();
    const incidentAt = new Date(Date.now() - 5000);
    const recovery = { schema: "paperclip.workspace-restore-recovery.v1", leaseIds: [leaseId] };
    const [run] = await db.insert(heartbeatRuns).values({ id: runId, companyId: company.id, agentId: agent.id, issueId: issue.id,
      contextSnapshot: { issueId: issue.id }, status: "interrupted", finishedAt: incidentAt, runtimeMode: "legacy", errorCode: "server_shutdown_interrupted",
      resultJson: { conversationContinuation: "continue_conversation_v1", workspaceRestoreFailure: "restore_failed", workspaceRestoreRecovery: recovery } }).returning();
    const identity = { id: leaseId, companyId: company.id, heartbeatRunId: runId, provider: "daytona", providerLeaseId };
    const [lease] = await db.insert(environmentLeases).values({ ...identity, issueId: issue.id, executionWorkspaceId: workspace.id, status: "released", leasePolicy: "retain_on_failure",
      cleanupStatus: "success", releasedAt: new Date(), metadata: { remoteExecutionTermination: remoteTerminationReceipt(identity, { providerLeaseId, state: "stopped" }) } }).returning();
    const recordedAt = incidentAt;
    const [action] = await db.insert(issueRecoveryActions).values({ companyId: company.id, sourceIssueId: issue.id,
      kind: "active_run_watchdog", cause: "legacy_execution_requires_reconciliation", ownerType: "board", status: "resolved", outcome: "blocked",
      fingerprint: run.id, nextAction: "Recover files", createdAt: recordedAt,
      evidence: { runId, workspaceRestoreFailure: "restore_failed", workspaceRestoreRecovery: recovery,
        automaticRecovery: { replay: "blocked", actionOutcome: "unknown", recordedAt: recordedAt.toISOString() } } }).returning();
    const [barrier] = await db.insert(workspaceOperations).values({ companyId: company.id, issueId: issue.id, heartbeatRunId: run.id, executionWorkspaceId: workspace.id,
      phase: "workspace_finalize", status: "succeeded", startedAt: recordedAt, finishedAt: new Date() }).returning();
    return { company, agent, issue, run, lease, action, barrier };
  }
  it("settles exact saved-file proof once without task changes, continuation or external-action claims", async () => {
    const f = await fixture();
    // The retention sweep may refresh its observation long after copy-back
    // completed; that does not change when the original incident began.
    await db.update(issueRecoveryActions).set({ evidence: { ...f.action.evidence,
      automaticRecovery: { replay: "blocked", actionOutcome: "unknown", recordedAt: new Date(Date.now() + 60000).toISOString() } } })
      .where(eq(issueRecoveryActions.id, f.action.id));
    const [newer] = await db.insert(issueRecoveryActions).values({ companyId: f.company.id, sourceIssueId: f.issue.id, kind: "active_run_watchdog",
      cause: "legacy_execution_requires_reconciliation", ownerType: "board", status: "active", fingerprint: randomUUID(), nextAction: "Another incident", evidence: { runId: randomUUID() } }).returning();
    expect((await reconcileVerifiedWorkspaceRepairs(db)).repaired).toBe(1);
    expect((await reconcileVerifiedWorkspaceRepairs(db)).repaired).toBe(0);
    const [action] = await db.select().from(issueRecoveryActions).where(eq(issueRecoveryActions.id, f.action.id));
    expect(action.evidence).toMatchObject({ workspaceRepair: { workspaceOperationId: f.barrier.id },
      automaticRecovery: { actionOutcome: "unknown", replay: "not_requested" }, continuationDelivery: "not_requested" });
    expect(action.evidence.executionReconciliation).toBeUndefined();
    expect((await db.select().from(issues).where(eq(issues.id, f.issue.id)))[0]).toEqual(f.issue);
    expect((await db.select().from(issueRecoveryActions).where(eq(issueRecoveryActions.id, newer.id)))[0]).toEqual(newer);
    expect((await db.select().from(environmentLeases).where(eq(environmentLeases.id, f.lease.id)))[0]).toEqual(f.lease);
    await db.delete(issueRecoveryActions).where(eq(issueRecoveryActions.id, newer.id));
    expect(await getExecutionBlocker(db, f.company.id, f.issue.id)).toBeNull();
    const [run] = await db.select().from(heartbeatRuns).where(eq(heartbeatRuns.id, f.run.id));
    expect(run.status).toBe("interrupted");
    expect(run.resultJson?.workspaceRestoreFailure).toBeUndefined();
    expect(run.resultJson?.repairedWorkspaceRestoreFailure).toBe("restore_failed");
  });
  it.each(["wrong_stop", "live_lease", "late_failure", "old_success", "provider_outcome_unknown", "unsafe_archive", "missing_workspace", "wrong_workspace"])("preserves the hold for %s", async scenario => {
    const f = await fixture();
    if (scenario === "wrong_stop") await db.update(environmentLeases).set({ metadata: {} }).where(eq(environmentLeases.id, f.lease.id));
    if (scenario === "live_lease") await db.update(environmentLeases).set({ status: "active", releasedAt: null }).where(eq(environmentLeases.id, f.lease.id));
    if (scenario === "late_failure") await db.insert(workspaceOperations).values({ companyId: f.company.id, issueId: f.issue.id, heartbeatRunId: f.run.id,
      phase: "workspace_finalize", status: "failed", createdAt: new Date(Date.now() + 1), finishedAt: new Date() });
    if (scenario === "old_success") await db.update(workspaceOperations).set({ finishedAt: new Date("2000-01-01") }).where(eq(workspaceOperations.id, f.barrier.id));
    if (scenario === "provider_outcome_unknown") await db.update(heartbeatRuns).set({ resultJson: { ...f.run.resultJson, conversationContinuation: null } }).where(eq(heartbeatRuns.id, f.run.id));
    if (scenario === "unsafe_archive") await db.update(heartbeatRuns).set({ resultJson: { ...f.run.resultJson, workspaceRestoreFailure: "restore_unsafe_archive" } }).where(eq(heartbeatRuns.id, f.run.id));
    if (scenario === "missing_workspace") await db.update(workspaceOperations).set({ executionWorkspaceId: null }).where(eq(workspaceOperations.id, f.barrier.id));
    if (scenario === "wrong_workspace") await db.update(environmentLeases).set({ executionWorkspaceId: null }).where(eq(environmentLeases.id, f.lease.id));
    expect((await reconcileVerifiedWorkspaceRepairs(db)).repaired).toBe(0);
    expect((await db.select().from(issueRecoveryActions).where(eq(issueRecoveryActions.id, f.action.id)))[0].evidence.automaticRecovery).toMatchObject({ replay: "blocked" });
  });
  it("uses the original shutdown time when restart creates the first hold after copyback", async () => {
    const f = await fixture();
    await db.update(issueRecoveryActions).set({ createdAt: new Date(f.barrier.finishedAt!.getTime() + 1000) })
      .where(eq(issueRecoveryActions.id, f.action.id));
    // Earlier invalid candidates can occupy the first bounded page.
    let repaired = 0;
    for (let sweep = 0; sweep < 2; sweep++) repaired += (await reconcileVerifiedWorkspaceRepairs(db)).repaired;
    expect(repaired).toBe(1);
    expect((await db.select().from(heartbeatRuns).where(eq(heartbeatRuns.id, f.run.id)))[0].resultJson?.workspaceRestoreFailure).toBeUndefined();
  });
  it("uses the partial sweep index with a representative resolved history", async () => {
    const f = await fixture();
    await db.insert(issueRecoveryActions).values(Array.from({ length: 3000 }, () => ({ companyId: f.company.id,
      sourceIssueId: f.issue.id, kind: "active_run_watchdog", cause: "unrelated_history", ownerType: "board",
      status: "resolved", outcome: "restored", fingerprint: randomUUID(), nextAction: "Complete", evidence: {} })));
    await db.execute('analyze issue_recovery_actions');
    const query = verifiedWorkspaceRepairCandidates(db).toSQL();
    const rows = await db.$client.unsafe('explain (analyze, buffers, format json) ' + query.sql, query.params as (string | number)[]);
    const plan = JSON.stringify(rows);
    expect(plan).toContain("issue_recovery_actions_workspace_repair_sweep_idx");
    expect(query.sql).not.toContain('heartbeat_run_id"::text');
    // Do not leave another repairable candidate for the pagination fixture.
    for (let sweep = 0; sweep < 2; sweep++) await reconcileVerifiedWorkspaceRepairs(db);
  });
  it("pages past a full batch of unverified sources to reach later repairable work", async () => {
    const blocked = [];
    for (let index = 0; index < 25; index++) {
      const f = await fixture();
      blocked.push(f);
      await db.update(environmentLeases).set({ metadata: {} }).where(eq(environmentLeases.id, f.lease.id));
    }
    const repairable = await fixture();
    let repaired = 0;
    for (let sweep = 0; sweep < 3; sweep++) repaired += (await reconcileVerifiedWorkspaceRepairs(db)).repaired;
    expect(repaired).toBe(1);
    expect((await db.select().from(heartbeatRuns).where(eq(heartbeatRuns.id, repairable.run.id)))[0].resultJson?.workspaceRestoreFailure).toBeUndefined();
    // New exact proof for an earlier incident is picked up after wrapping.
    const first = blocked[0];
    await db.update(environmentLeases).set({ metadata: first.lease.metadata }).where(eq(environmentLeases.id, first.lease.id));
    repaired = 0;
    for (let sweep = 0; sweep < 3; sweep++) repaired += (await reconcileVerifiedWorkspaceRepairs(db)).repaired;
    expect(repaired).toBe(1);
  });
});
