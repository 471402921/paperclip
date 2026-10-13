# Delivery fixture consolidation receipt

Exact parent: #16111, `06c1b2035df44fa03c065ddd69e8bf8df8513b86`.

The first delivery test in `server/src/__tests__/execution-workspaces-service.test.ts` creates a second Git topology that `seedTerminalWorkspace()` already creates. `candidate.patch` removes the manual repository/worktree and redundant PR-head overwrite. The original DB update and its updatedAt timing remain, with two path references redirected to the seeded fixture.

Savings: +2/-17, net15 test lines; one repository/worktree and11 duplicate fixture Git subprocesses. All67 registered cases remain. All six keeper assertions and61 other declaration ASTs are unchanged. The12 retained keeper statements match after the physical-path alias.

| Phase | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Baseline |67|0|0|
| Candidate |67|0|0|
| Full revert |67|0|0|
| Production mutation |50|17|0|
| Restored candidate |67|0|0|

The production mutation in `server/src/services/execution-workspaces.ts` incorrectly requires Git ancestry for merged-PR delivery. The exact intended keeper fails at candidate test line542: unmerged received instead of merged_via_pr. Full mutation failure evidence is in proof/mutation-pr-ancestry.json.

Source files are restored byte-for-byte, HEAD is unchanged, and the scratch checkout is clean. No branch or PR was created. No shared-checkout source was edited. No further owner tests are running. Runtime slot reservation arrived after this replay started; it finished during stop attempts and may have overlapped the other non-DB lane. No global serialization or CI timing saving is claimed.

receipt.json uses checkout-relative source paths and evidence-relative artifacts. Commands run from server/; set AUDIT_EVIDENCE_DIR to this folder. Baseline source snapshots, all five reports/logs, mutation patch and AST proof are included in proof/. The reviewed candidate is only candidate.patch; no mutation belongs in the proposed change.

## Reproduce from the PR

The candidate-only patch is the change to `server/src/__tests__/execution-workspaces-service.test.ts` in this PR. From a checkout with this branch fetched, generate it against the exact proof parent:

```sh
git fetch origin codex/test-audit-workspace-fixture
git diff 06c1b2035df44fa03c065ddd69e8bf8df8513b86 FETCH_HEAD -- server/src/__tests__/execution-workspaces-service.test.ts > /tmp/workspace-fixture.patch
git apply --check /tmp/workspace-fixture.patch
```

Run the owner suite from `server/` with `node ../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/__tests__/execution-workspaces-service.test.ts --reporter=default`. The baseline and candidate each pass 67/67. Apply the patch to a clean proof-parent checkout to reproduce the candidate; `git apply -R /tmp/workspace-fixture.patch` restores the baseline. The patch SHA256 from the isolated proof run is `be63698b27a3c465bffd86f2fa52dc53969da9b2904baa41d33903764b165984`.

## Mutation proof

The keeper is `reports a squash cross-branch delivery as merged_via_pr and suppresses the ancestry warning`. In `server/src/services/execution-workspaces.ts`, changing the first condition in `deriveExecutionWorkspaceDeliveryState` from `input.sourceIssueTerminal && input.mergedPullRequest` to `input.sourceIssueTerminal && input.mergedPullRequest && input.isMergedIntoBase === true` rejects a legitimate squash/cross-branch PR. The keeper then receives `unmerged` instead of `merged_via_pr`. In the full owner run this mutation produced 17 failures; the named keeper failed at candidate line 542. The mutation and test candidate were both restored byte-for-byte after proof.

The accepted phases were baseline 67/67, candidate 67/67, full revert 67/67, mutated owner 50 pass / 17 fail, and restored candidate 67/67, with zero skipped cases. The mutation controls production behavior; the PR itself changes tests only.

The proof replay finished during a stop attempt after a runtime-lane reservation arrived. It may have overlapped that lane's non-database test process. No host-wide serialization or CI-time savings are claimed. Proof source hashes, AST comparison, reports, and logs remain in the isolated audit workspace and are not represented as checked-in files.
