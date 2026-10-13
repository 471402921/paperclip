# Proven provisioning test consolidation

Proof base: #16106 exact head 397459400c6e7b18b462dcac3d8886b390ca8e8c, extracted into an isolated temporary snapshot. All test and production owners match exact-head Git blobs. Disjoint shard candidate reverted before this sequence. All runs serial; no shared checkout edits, commits, pushes or PR actions.

Result: PROVEN with one preserved existing tool-availability skip. Owner scripts/__tests__/provision-worktree-self-heal.test.mjs shrinks 717 -> 707 lines (10 net); registered cases 35 -> 34; one repeated top-level bash runProvision launch retired. Nested subprocess savings unquantified. No CI-time claim.

Retire `falls back to an isolated config when the base CLI cannot boot`. Keeper `reconciles deployment mode from the registered source when reusing a guest config` is renamed `isolates fallback configuration and reconciles deployment mode from the registered source when reusing a guest config`.

Both originals allocate makeBaseWorkspace({helpExit:1, initExit:0}) and call runProvision(baseCwd) with identical defaults. Move all fallback stderr, persisted config source, real database-path containment, actual .env and pending seed-manifest assertions into keeper immediately after first successful launch and before changing source config. Only lexical result.stderr -> first.stderr changes. Retain original local_trusted, second real bash launch and config reuse/reconciliation receipts.

| Complete-owner phase | Cases | Pass | Fail | Skip | Exit |
|---|---:|---:|---:|---:|---:|
| baseline | 35 | 34 | 0 | 1 | 0 |
| candidate | 34 | 33 | 0 | 1 | 0 |
| database-path-escape-original | 35 | 32 | 2 | 1 | 1 |
| database-path-escape-keeper | 34 | 32 | 1 | 1 | 1 |
| restored-candidate | 34 | 33 | 0 | 1 | 0 |

Every accepted run has zero cancelled/todo. Existing skip: ok 20 - repairs an unhealthy base install under the lock and then uses the CLI # SKIP flock or git not available on this host

## Production regression and restoration

Change only generated fallback targetConfig.database.embeddedPostgresDataDir in scripts/provision-worktree.sh from path.resolve(instanceRoot, "db") to path.resolve(worktreeHome, "..", "misdirected-worktree-db"). This writes only a config value; it does not create or touch files at that escaped path. Original and keeper both fail the exact assertion `!path.relative(worktreesHome, dataDir).startsWith("..")`, reporting the actual persisted escaped path before keeper's second launch. No setup/timeout failure qualifies the control.

Original mutated complete owner has two direct failures: exact isolation assertion, plus separate reuse case's unchanged /Reusing existing isolated Paperclip worktree config/ guard when production correctly treats escaped-path config as stale. Candidate mutated complete owner has one failure: relocated exact isolation assertion. Complete failure bodies and source hashes are in runs.json. Actual production mutation is pinned by database-path-escape.mutation.patch. Production bytes restore in finally and hash-check before restored candidate (33 passing/1 unchanged skipped). Test owner restores to exact-head original after proof.

Initial default-sandbox baseline was rejected by real localhost binding EPERM: 35 cases, 32 passing, 2 setup failures, 1 existing skip. No candidate/mutation ran during that attempt. Preserve sandbox-baseline.tap and sandbox-runs.json; these failures are not accepted controls. Approved escalation then ran the identical sequence with real localhost binding enabled, producing the accepted table above. No production behavior, assertions, deadlines, retries or skip logic changed.

## Exact executable hashes

- Original test: 29d758d74d32418ea4de53c6cea4409d29c5310252a10d558c19e08ba36a670a
- Proven candidate test: ffacee5de45871dfe9bb2613aa05ffadb452e4c1f7188b8f0519d36d70d935b2
- Restored production shell: 2d52e8e98eb913ca5fbfa3c508eb864a685ee11b7d503558cb0b2e2d517b3f48

Node subprocess.run waits/reaps every complete owner. Original test.after removes its allocated fixture roots. cleanup.json records post-proof source equality and any remaining fixture processes. No process from this proof remains when the snapshot check succeeds with an empty inventory. No production/path mutations remain.

Files: proven-provision-worktree-self-heal.patch is the proven deliverable; runs.json and raw *.tap files retain all counts/failures/source and log SHA256; success.json pins restored bytes; cleanup.json records final checks. Narrow owner proof only; broader typecheck/build/test success is not claimed. Runner-release-cache candidate remains static and unproven.
