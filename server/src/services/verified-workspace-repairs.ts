import { and, asc, desc, eq, sql } from "drizzle-orm";
import { environmentLeases, heartbeatRuns, issueRecoveryActions, issues, workspaceOperations, type Db } from "@paperclipai/db";
import { hasRemoteTerminationReceipt } from "./remote-execution-termination.js";
import { hasRequiredWorkspaceRecovery, LEGACY_WORKSPACE_RECOVERY_SCHEMA } from "./workspace-restore-recovery-state.js";
import { persistActivity, publishActivity } from "./activity-log.js";
import { logger } from "../middleware/logger.js";

type SweepCursor = { updatedAt: string; id: string };
const cursors = new WeakMap<Db, SweepCursor>();

/** A late successful copy-back can settle a shutdown retention hold without a
 * provider call, model turn, or invented claim about earlier external actions. */
export async function reconcileVerifiedWorkspaceRepairs(db: Db) {
  const selectCandidates = (connection: Db, cursor?: SweepCursor) => connection.select({ id: issueRecoveryActions.id, companyId: issueRecoveryActions.companyId,
    cursorTime: sql<string>`${issueRecoveryActions.updatedAt}::text`,
    issueId: issueRecoveryActions.sourceIssueId }).from(issueRecoveryActions).where(and(
    eq(issueRecoveryActions.cause, "legacy_execution_requires_reconciliation"),
    eq(issueRecoveryActions.ownerType, "board"),
    eq(issueRecoveryActions.status, "resolved"),
    sql`${issueRecoveryActions.evidence}->'automaticRecovery'->>'replay' = 'blocked'`,
    sql`${issueRecoveryActions.evidence}->'workspaceRestoreRecovery'->>'schema' = ${LEGACY_WORKSPACE_RECOVERY_SCHEMA}`,
    // Keep PostgreSQL's timestamp precision; a JS Date loses microseconds and
    // would repeatedly select the final row instead of wrapping the scan.
    cursor ? sql`(${issueRecoveryActions.updatedAt}, ${issueRecoveryActions.id})
      > (${cursor.updatedAt}::timestamptz, ${cursor.id}::uuid)` : undefined,
    sql`exists (select 1 from ${workspaceOperations} where ${workspaceOperations.companyId} = ${issueRecoveryActions.companyId}
      and ${workspaceOperations.issueId} = ${issueRecoveryActions.sourceIssueId}
      and ${workspaceOperations.heartbeatRunId}::text = ${issueRecoveryActions.evidence}->>'runId'
      and ${workspaceOperations.phase} = 'workspace_finalize' and ${workspaceOperations.status} = 'succeeded'
      and ${workspaceOperations.finishedAt} >= ${issueRecoveryActions.createdAt})`,
  )).orderBy(asc(issueRecoveryActions.updatedAt), issueRecoveryActions.id).limit(25);
  const candidates = await db.transaction(async tx => {
    await tx.execute(sql`select set_config('statement_timeout', '5000', true), set_config('lock_timeout', '1000', true)`);
    let rows = await selectCandidates(tx as unknown as Db, cursors.get(db));
    if (!rows.length && cursors.has(db)) {
      cursors.delete(db);
      rows = await selectCandidates(tx as unknown as Db);
    }
    return rows;
  });
  // Ineligible evidence must not permanently hide later repairable incidents.
  // A process restart can safely restart this idempotent scan from the beginning.
  const last = candidates.at(-1);
  if (last) cursors.set(db, { updatedAt: last.cursorTime, id: last.id });
  let repaired = 0;
  for (const candidate of candidates) {
    try {
      const publication = await db.transaction(async tx => {
        await tx.execute(sql`select set_config('statement_timeout', '5000', true), set_config('lock_timeout', '1000', true)`);
        // Same issue -> source action -> run order as file-only resolution. Never change
        // task ownership, status, review/approval state, or a newer recovery.
        const [issue] = await tx.select().from(issues).where(and(eq(issues.companyId, candidate.companyId), eq(issues.id, candidate.issueId))).for("update");
        const [action] = await tx.select().from(issueRecoveryActions).where(and(eq(issueRecoveryActions.companyId, candidate.companyId), eq(issueRecoveryActions.id, candidate.id))).for("update");
        const automatic = action?.evidence.automaticRecovery as Record<string, unknown> | undefined;
        const runId = action?.evidence.runId;
        if (!issue || !action || action.sourceIssueId !== issue.id || action.ownerType !== "board"
          || action.cause !== "legacy_execution_requires_reconciliation" || typeof runId !== "string" || action.status !== "resolved"
          || automatic?.replay !== "blocked" || !hasRequiredWorkspaceRecovery(action.evidence)) return null;
        const [run] = await tx.select().from(heartbeatRuns).where(and(eq(heartbeatRuns.companyId, candidate.companyId), eq(heartbeatRuns.id, runId))).for("update");
        if (!run || run.runtimeMode !== "legacy" || !["interrupted", "failed", "timed_out", "cancelled"].includes(run.status)
          || (run.issueId ?? run.nativeIssueId ?? run.contextSnapshot?.issueId) !== issue.id || !hasRequiredWorkspaceRecovery(run.resultJson)
          || run.errorCode !== "server_shutdown_interrupted" || run.resultJson?.conversationContinuation !== "continue_conversation_v1"
          || run.resultJson?.workspaceRestoreFailure !== "restore_failed") return null;
        const [barrier] = await tx.select().from(workspaceOperations).where(and(eq(workspaceOperations.companyId, candidate.companyId),
          eq(workspaceOperations.issueId, issue.id), eq(workspaceOperations.heartbeatRunId, run.id),
          eq(workspaceOperations.phase, "workspace_finalize"))).orderBy(desc(workspaceOperations.createdAt), desc(workspaceOperations.id)).limit(1);
        const failureRecordedAt = action.createdAt.getTime();
        if (!barrier || !barrier.executionWorkspaceId || barrier.status !== "succeeded" || !barrier.finishedAt || !barrier.startedAt || barrier.finishedAt < barrier.startedAt
          || !Number.isFinite(failureRecordedAt) || barrier.finishedAt.getTime() < failureRecordedAt || barrier.metadata?.workspaceRestoreFailure) return null;
        const leases = await tx.select().from(environmentLeases).where(and(eq(environmentLeases.companyId, candidate.companyId), eq(environmentLeases.heartbeatRunId, run.id))).for("update");
        const recovery = run.resultJson!.workspaceRestoreRecovery as { leaseIds?: unknown };
        if (!Array.isArray(recovery.leaseIds) || !recovery.leaseIds.length || !leases.length
          || !recovery.leaseIds.every(id => typeof id === "string" && leases.some(lease => lease.id === id && hasRemoteTerminationReceipt(lease)))
          || !leases.every(lease => hasRemoteTerminationReceipt(lease) && lease.executionWorkspaceId === barrier.executionWorkspaceId)) return null;
        const now = new Date();
        const proof = { schema: "paperclip.verified-workspace-repair.v1", kind: "same_run_finalization",
          runId: run.id, workspaceOperationId: barrier.id, leaseIds: recovery.leaseIds, recordedAt: now.toISOString() };
        const { workspaceRestoreFailure, ...result } = run.resultJson!;
        await tx.update(heartbeatRuns).set({ resultJson: { ...result,
          repairedWorkspaceRestoreFailure: workspaceRestoreFailure, workspaceRepair: proof }, updatedAt: now }).where(eq(heartbeatRuns.id, run.id));
        await tx.update(issueRecoveryActions).set({ outcome: "restored", resolvedAt: now, updatedAt: now,
          evidence: { ...action.evidence, workspaceRepair: proof,
            automaticRecovery: { ...automatic, replay: "not_requested" }, continuationDelivery: "not_requested" },
          nextAction: "Workspace copy-back was verified from this run's completed finalization and exact stop receipts. The task's existing review, approval, and continuation rules still apply.",
        }).where(eq(issueRecoveryActions.id, action.id));
        return persistActivity(tx as unknown as Db, { companyId: candidate.companyId, actorType: "system", actorId: "workspace-recovery",
          action: "issue.workspace_repair_verified", entityType: "issue", entityId: issue.id, runId: run.id,
          details: { recoveryActionId: action.id, workspaceOperationId: barrier.id, leaseIds: recovery.leaseIds, continuationRequested: false } });
      });
      if (publication) { repaired++; publishActivity(publication.publication); }
    } catch {
      logger.warn({ recoveryActionId: candidate.id }, "Verified workspace repair remains pending");
    }
  }
  return { scanned: candidates.length, repaired };
}
