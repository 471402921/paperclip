VERIFIED: repeated Tailscale idempotent withdrawal execution retired with assertion union preserved.

Exact parent:#16099 8e955181d8a3776acc86e4662de3c77933231a76.
Worktree:/tmp/daytona-stack-wt.
Validated patch:/private/tmp/tailscale-proof/validated.patch.

Baseline22/22 pass → candidate21/21 pass → revert22/22 pass → candidate actual production mutation1 expected keeper failure(20 skipped) → restored candidate21/21 pass. Reports and logs are adjacent by phase.
Mutation removes only doExpose leaseWasExposed/substituted→appliedPorts withdrawal admission. Keeper failed at line341:expected0 greater than0. Its strengthened remove-count oracle catches real missed provider removal. Source restored in finally before final candidate test.
Production SHA256:c957d6ee89d61af6e8bfaac699bb4ed2d1d9fc1b12da89bffba613451cfd47d5,byte-equal to parent. Only broker-core.test.ts differs;593→559 lines,22→21 cases,2 insertions36 deletions. One reserve/expose/reserve/expose fake broker sequence removed. No wall-clock performance claim. No child agents,commit,push,PR or merge.

Actual full-owner command:node /tmp/daytona-stack-wt/node_modules/vitest/vitest.mjs run --config /tmp/daytona-stack-wt/packages/tailscale-https-broker/vitest.config.ts src/broker-core.test.ts --reporter=json --outputFile=/private/tmp/tailscale-proof/PHASE.json. Mutation adds-t keeper title.
An initial absolute/tmp test path selected0 tests because config resolves/private/tmp. That invalid attempt is preserved in baseline-path-filter-attempt.* and is excluded from proof. The five valid phases then ran in order with relative src filter.
