# Proven shard test consolidation

Proof base: #16099 exact tree 8e955181d8a3776acc86e4662de3c77933231a76, extracted with git archive into an isolated temporary snapshot. Node built-in tests require no dependency installation. All runs serial; no shared checkout edits, commits, pushes or PRs.

Result: PROVEN. Retire three repeated executions, preserving all original assertions in named keepers. Test lines 547 -> 521 (26 net removed, including redundant blank normalization); registered cases 32 -> 29; exactly 22 repeated dry-run Node calls removed: 9 serialized partition launches, 12 PR partition launches, 1 general shard-zero launch. The subprocess delta comes from exact unchanged loop bounds/args, not a sampled timing estimate. No CI-time improvement claimed.

| Complete-owner phase | Tests | Pass | Fail | Exit |
|---|---:|---:|---:|---:|
| baseline | 32 | 32 | 0 | 0 |
| candidate | 29 | 29 | 0 | 0 |
| serialized-duplicate-original | 32 | 31 | 1 | 1 |
| serialized-duplicate-keeper | 29 | 28 | 1 | 1 |
| balance-wrong-bin-original | 32 | 28 | 4 | 1 |
| balance-wrong-bin-keeper | 29 | 25 | 4 | 1 |
| route-wrong-lane-original | 32 | 30 | 2 | 1 |
| route-wrong-lane-keeper | 29 | 28 | 1 | 1 |
| restored-candidate | 29 | 29 | 0 | 0 |
| stack-candidate | 29 | 29 | 0 | 0 |

Every run has 0 skipped/cancelled/todo. The 13 failures in mutation runs are deliberate direct assertion failures; no setup, worker or timeout failures. Unmutated baseline/candidate/restored/integrated controls all pass.

## Exact keeper and regression guards

- Serialized completeness moves into serialized duration-balance keeper. Mutate selectSerializedSuites to duplicate one actual selected file on shard zero. Original and keeper fail `every serialized suite must be selected exactly once`: 159 actual vs 158 expected. Each full owner has exactly one failing case.
- PR duration-balance moves into PR exact-coverage keeper. Invert scheduler's lightest-bin `<` comparison to `>`. Original and keeper directly fail `shard weight spread 5003719.5ms exceeds heaviest suite 136113ms`. Each full owner has four failing cases: synthetic skew balance, empty-manifest uniform balance, real serialized balance, real general balance. All are direct meaningful scheduling assertions; complete coverage alone would miss the regression.
- Route/authz exclusion moves into general partition keeper's existing per-file loop, extending the unchanged guard from shard zero to all shards. Actual executed mutation adds a real serialized route to the dry-run general shard-zero selection: `server/src/__tests__/access-routes-hidden-floor.test.ts`. Original route guard and keeper fail the identical route-exclusion assertion naming that actual path. Original owner has two failures (also total count); keeper has one, reaching the relocated route guard before the count assertion. The executable mutation differs from the discovery-map suggestion only in using the selected dry-run membership expression directly; it protects the same wrong-lane behavior.

Production modifications were applied one at a time; each pair ran complete original and candidate test owners under the same mutated bytes. Original test restored between groups. Every production owner restored in finally and hash-verified. Final restored-candidate run passes 29/29, and isolated baseline snapshot subsequently restores all three owners to exact base bytes.

## Hashes and stacked integration

- Original test SHA256: 3b658c7ff55e35619d70ec8381325d07777c3a46a851edc7f5c5d84a7976eacc
- Proven candidate test SHA256: 58ecff8ddceecb8e0c44240fa3dbf7ae6a9756dbac35b5ad52a14e655cfc8327
- Restored run-vitest-stable.mjs SHA256: 71da62d4317591b590f877436ac16c6185b650b497b7fa843b68c801ecb4f353
- Restored general-server-shard.mjs SHA256: ce809911cac307063fc2746118c1d6229c280e3d866b82ee5b776c89f5c016f3

Fetched public branch into an isolated bare Git directory after the default sandbox attempt failed DNS resolution. Fetch succeeds through approved network escalation and resolves exactly #16106 head 397459400c6e7b18b462dcac3d8886b390ca8e8c. All seven relevant test/production owner blobs are identical to the #16099 proof base (stack-provenance.json). The exact proven patch passes git apply --check, applies without conflict to an extracted #16106 snapshot, retains the candidate hash, and passes the complete owner 29/29 on that snapshot. No cherry-pick or rebase commit was created.

Files: proven-run-vitest-stable-shard.patch is the deliverable; runs.json records every baseline/control run with complete failure bodies, source hashes and TAP digests; stack-run.json records the integrated run; success.json records final restoration; stack-provenance.json records exact-head owner comparisons; three *.mutation.patch files pin the actual regressions; all *.tap files retain raw output. SHA256 values identify executable evidence, not CI evidence. No broader tests/build/typecheck run or success claim.
