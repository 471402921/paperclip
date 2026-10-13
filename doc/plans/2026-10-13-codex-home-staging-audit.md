# Proven Codex staging permission-test consolidation

Proof base: #16106 exact head 397459400c6e7b18b462dcac3d8886b390ca8e8c. Original test and production source match exact-head blobs before controls. Isolated snapshot only; serial runs; no shared checkout edits, commits, pushes or PRs.

Result: PROVEN. Owner packages/adapters/codex-local/src/server/codex-home.test.ts shrinks 1,412 -> 1,371 lines (41 net removed); registered cases 53 -> 50; three fixture allocations/stageCodexHomeForSync calls and their teardown sequences retired. No subprocess delta or CI-time improvement claimed.

Keeper `stageCodexHomeForSync stages exactly the allowlist, derefs auth.json to bytes, and excludes decoys` gains direct actual 0700 staged-root and 0600 checks for auth.json, config.toml, config.json and instructions.md. Retire the standalone auth mode, every-file mode and directory-mode cases. Same buildFakeHome input bytes/action apply; original runId values differ only in temporary-directory prefix. Keeper retains its run-1 prefix, real allowlist/content/symlink/decoy receipts and cleanup. Dedicated secret-bearing managed-MCP config.toml permission case remains independent.

| Complete-owner phase | Cases | Pass | Fail | Exit |
|---|---:|---:|---:|---:|
| baseline | 53 | 53 | 0 | 0 |
| candidate | 50 | 50 | 0 | 0 |
| file-mode-0644-original | 53 | 50 | 3 | 1 |
| file-mode-0644-keeper | 50 | 48 | 2 | 1 |
| directory-mode-0755-original | 53 | 52 | 1 | 1 |
| directory-mode-0755-keeper | 50 | 49 | 1 | 1 |
| restored-candidate | 50 | 50 | 0 | 0 |
| integrated-stack | 50 | 50 | 0 | 0 |

Every accepted run has zero pending/todo/skipped cases. Both real regressions produce direct intended filesystem-mode assertion failures, not setup, timeouts or worker failures.

## Actual production mutations

- File chmod: in stageCodexHomeEntry's real write path replace explicit fs.chmod(target, 0o600) with 0o644. Actual staged files become group/other readable (420 actual vs 384 expected). Original full owner fails three cases: auth.json mode, managed-MCP config.toml mode, every-file mode. Candidate fails keeper's actual auth.json stat plus the retained managed-MCP case. The duplicate security assertions now live on real staged bytes in keeper.
- Directory chmod: add fs.chmod(stagedHome, 0o755) immediately after mkdtemp and before allowlist copying. Actual staged-root mode becomes 493 vs expected 448. Original dedicated 0700 case and keeper's actual root-stat guard both fail. File bytes/permissions and fixture contents remain otherwise unchanged.

Regressions run one at a time, with full original/candidate owners under identical mutated production bytes. Test/production restores occur in finally and are byte/hash-verified after every pair. Final restored candidate passes 50/50. Source then restores to exact #16106 test and production originals. Fake fixture credentials only; no real Codex home/credentials are accessed, and no production files outside the isolated snapshot are changed.

## Dependencies and isolation

The global pnpm installer differed from the repository's pinned pnpm@9.15.4, stalled before installing the graph, and was explicitly stopped/reaped (exit 143). No tests ran under that installer. Dependency setup instead links only immutable installed third-party packages under node_modules/.pnpm, whose package.json hashes/version and exact lockfile equality are recorded in ../codex-dependencies.json. Those hashes still match after all controls. Workspace shared and adapter-utils links resolve only to source inside the exact-head isolated snapshot; no application/workspace source is borrowed from the shared checkout. Use existing Codex package Vitest config and full explicit owner path; no mocked resolver/helper or custom alias replaces production code. All controls use the same graph.

## Exact hashes and integrated stack

- Original test SHA256: 8f7a0497cb4d8a0f8de3d341585e74c8c17203ab93fe69d0d78fc59410beb220
- Proven candidate test SHA256: 8615ceaed7c04647bbc2c674448a012d15a6f597eb36c9b2bfbf854baf947cac
- Original/restored production SHA256: fd08bc782af5bdc4631d43cc41f156d97daad629d04fa8654d177f549f8b1b9e

The proven shard, provisioning and Codex test patches all pass git apply --check and apply together without conflict to exact #16106 snapshot. Integrated Codex candidate retains its executed SHA and passes 50/50 with all three patches present; integrated-receipt.json pins all three test hashes and report digest. Afterwards all three tests restore to exact #16106 original bytes. This proves the combined patches apply and Codex owner passes; it does not claim other owners were rerun in the combined state.

Files: proven-codex-stage-consolidation.patch is the deliverable; runs.json retains counts, complete failureMessages and test/production/report/log hashes for every original/candidate mutation run; success.json records restoration and line counts; two *.mutation.patch files pin executed production regressions; raw *.json and *.log files retain report/output; integrated-receipt.json records stacked application/full Codex run. No broader typecheck/build/default-suite success claim.
