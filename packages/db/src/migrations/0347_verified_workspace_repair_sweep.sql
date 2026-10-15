CREATE INDEX IF NOT EXISTS "issue_recovery_actions_workspace_repair_sweep_idx" ON "issue_recovery_actions" USING btree ("updated_at","id") WHERE "issue_recovery_actions"."cause" = 'legacy_execution_requires_reconciliation'
        and "issue_recovery_actions"."owner_type" = 'board' and "issue_recovery_actions"."status" = 'resolved'
        and "issue_recovery_actions"."evidence"->'automaticRecovery'->>'replay' = 'blocked'
        and "issue_recovery_actions"."evidence"->'workspaceRestoreRecovery'->>'schema' = 'paperclip.workspace-restore-recovery.v1';
