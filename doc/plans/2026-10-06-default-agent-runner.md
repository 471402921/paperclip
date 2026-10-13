# Runner defaults: staged delivery

Updated 2026-10-12.

## Production readiness: owned startup correction

The human requests production readiness; preparation and normal sequential
merges remain authorized. Production deployment and provisioning-default
promotion remain separate actions. Nothing in this checkpoint is merged or
deployed, and the stack is not production-ready.

Runtime prerequisite behavior is `ce23716503a2c9158b5a7ab74ab61571ff4ee7a3`
on `codex/runner-native-platform-prerequisites`, in
[#16028](https://github.com/paperclipai/paperclip/pull/16028). Final qualification
reproduced close returning before credential preparation drained, followed by
registration and launch. Both direct close and real driver cancellation failed
on literal `5a9ce11`. The initial shared repair from Claude commit `463ebb` is
reused, with independently identified duplicate-admission, shutdown-readiness and
resume ordering corrections. All five source findings are closed in matching
source review. Absolute cleanup deadlines, primary cancellation errors,
unauthenticated-process protection and existing agents' runner choices remain.

The existing suites pass 32 credential-free controls across three files; both
canonical runner TypeScript no-emit checks pass. No new suite, local Rust/Docker
build, provider call or credential-content read was used. Actual daemon
readiness/recovery controls remain **hosted-CI required**: local worktrees lack
the existing fake-Codex/fake-harness executables. The failed local native attempt
never reached the readiness assertion and is not qualification. Receipts are
`/private/tmp/pr2-463ebb-owned-startup-review-closure-receipt.json` and
`/private/tmp/ci-final-owned-startup-five-gap-closure-review.json`.

Normal automatic merge is disabled and the prerequisite is draft while this
correction receives fresh full CI, package qualification and 5/5 review.
Earlier green checks at `5a9ce11` remain historical. Actual code-owner approval
is still required; no protection is bypassed. The updated runs/adapters map pair
records source-only scope, bringing the prerequisite review to 63 files after the required Storybook
catalog review below.

Codex remains `1a0ca66242121e39d88455aa2b52a07acc4a07d9` in
[#15683](https://github.com/paperclipai/paperclip/pull/15683), based on the previous
prerequisite. The Claude owner retains its branches, cached guided-setup fix,
verification and separate $50 allowance. Coordinate reconciliation of the common
repair before rewriting those branches; don't duplicate it in a leaf slice.

The idle [local preview](http://127.0.0.1:3125/COD/agents/all) still serves literal
behavior `fe1ecf1c34`, recovery ready and zero active runs. Its four saved
legacy/native configurations and two historical native records remain preserved;
it has not been refreshed to this new runtime. Final local/managed acceptance
must use the tested source, independent file checks and follow-up continuity.

The prepared private execution checklist reuses existing evals, installation,
Cloud composition and campaign paths. Required holds are final source/image/
migrator, the actual verified-master private distribution, pinned QA onboarding,
warm/cold signup, production baseline and previous-image compatibility. Production
Fleet Admin sign-in is pending. Current paid holds remain $248.179254104 of $250;
unknown/cleanup holds stay reserved, and the unstarted managed envelope is $2.50.
No new image, paid resource, rollout or default promotion was dispatched.

Master reconciliation uses `4b958ecbd8f33a7782fe6f29ec825f80f636b833`.
The new contribution rules are satisfied: 157 added comment annotations were
removed from 35 files, with identical executable JavaScript/TypeScript emission,
parsed workflow values, 77 action pins and shell commands. No code file crosses
from below 1,000 lines to above that limit. Final focused checks pass 248 tests
(107 workflow/package, 54 runner, 42 server, 45 E2E support). Both runner no-emit
checks and the canonical server/E2E no-emit checks pass with isolated matching
workspace dependencies. Only JavaScript/TypeScript preparation ran locally;
root preview links and data stayed unchanged. The earlier linked-source failures
remain recorded and are superseded only by the new canonical check receipt.

The existing Storybook catalog has 21 source-review fingerprint updates because
its declared runs/adapters map input changed. All affected stories, subjects,
wrappers and fixtures remain byte-identical to master. Review classifications
stay unchanged. The catalog check passes 223 files/2,210 stories; this is
structural/source evidence, not visual or live proof. Source receipts are
`/private/tmp/pr2-9f59-comments-cleanup-receipt.json`,
`/private/tmp/pr2-storybook-owned-final-receipt.json` and
`/private/tmp/pr2-frozen-canonical-noemit-receipt.json`.

Next action: publish this reviewed prerequisite correction, require fresh hosted
gates, reconcile Codex and Claude with its actual source, then resume the existing
remote package/immutable preview and dedicated staging qualification. Merge ready
slices normally in the agreed order; actual production readiness requires the
private distribution and rollback/forward-recovery evidence afterward.

## Final review checkpoint: shared fixes and sandbox qualification

The user authorizes normal sequential merges after the applicable gates pass.
Runtime prerequisite [#16028](https://github.com/paperclipai/paperclip/pull/16028)
and Codex defaults [#15683](https://github.com/paperclipai/paperclip/pull/15683)
remain draft. Their pre-fix sources are `00ac509b0a` and `8de43be4cd`.
The shared SSH argv and verified cold-resume corrections are already composed.
Six argv controls, fourteen recovery controls, and actual SSH subprocess checks
pass. The separate Claude owner reports real ARM and Linux x64 task/follow-up
pairs across controller restarts on its literal installed-package overlays;
those results do not qualify an unmodified final Codex package.

The Mac test-drive serves `8de43be4cd` at port 3125. A read-only restart comparison
preserves four full legacy/native execution configurations and two historical
native runs with the deprecated native flag false. Zero provider turns and
zero local native/Docker builds were used. The canonical server no-emit passes
on the composed root and actual prerequisite worktree.

Both shared fixes are implemented and frozen. The actual workflow selector
rejects candidate execution/output injection in real Git fixtures. Its full
existing release-workflow suite passes 70 tests; existing target assembly passes
7 tests. Registration passes 15 focused controls and canonical runner no-emit.
An independent scoped review confirms bounded teardown and retained private
state on unconfirmed release. The first broader local workflow attempt failed
only because mock loopback listeners were sandbox-blocked; its loopback-enabled
rerun passes. No daemon/provider execution was used by these controls.

The generic sandbox qualification support passes 30 existing probe and route
controls plus the canonical server no-emit command. It accepts only OCI digest
images, checks the returned cleanup receipt, and reports conditional-update races
without claiming a record. Mutable or name-only configurations retain existing
connection behavior and receive no native compatibility credit. The default
consumer and explicit-permission/import controls are being composed next.

Fresh review found four source defects: candidate-code execution during CI runner
selection, unbounded registration teardown, a lost explicit Codex permission
setting on automatic Legacy selection, and missing sandbox platform/libc facts.
Existing subagents own narrow fixes in parallel. Use inert target data and
workflow-owned public labels; preserve primary failures and private state on
unconfirmed cleanup; preserve explicit permissions; and use server-measured
sandbox qualification bound to its effective image/config and company scope.
The existing explicit environment-probe/setup flow owns qualification. Saving
and discovery must not provision resources or accept client-authored evidence.
Unknown targets retain automatic Legacy with an actionable explicit-native error.
No new product API or database migration is planned.

Preview runs [38303434211](https://github.com/paperclipai/paperclip/actions/runs/38303434211),
[38304889308](https://github.com/paperclipai/paperclip/actions/runs/38304889308), and
[38306885592](https://github.com/paperclipai/paperclip/actions/runs/38306885592)
were cancelled as shared source defects changed their candidates. They are
excluded from final qualification. Preserve historical evidence and all cost
and cleanup holds. The next action is to finish the four fixes, run affected
controls, obtain fresh exact-source checks/review, then build the final immutable
preview and matching DB/shared pair remotely for the pinned QA tenant.
Managed Codex retains its $2.50 setup/task envelope and $2 cleanup within the
original $250 ceiling. Claude retains its separate $50 ceiling. No merge or
production deployment has occurred.


## Latest checkpoint: runtime prerequisite and authorized merges

The user authorizes preparing and merging ready PRs in dependency order.
Production deployment and provisioning-default promotion remain separate actions.
The Codex-default candidate is preserved at
`bb7591dfd0c4c8569e2a0b4303ff06de8ca3e9e2`; its running test-drive remains at
[3125](http://127.0.0.1:3125/COD/agents/all). No existing agent changes runner.

Its qualification work grew the review to 135 files. Extract the independent
runtime, installed-package and hosted-build changes onto
`codex/runner-native-platform-prerequisites`, based on master
`7d9b93aee2b79b2f035c5838741ce0b94168ec83`. This prerequisite contains 39 source
files and this record. Creation policy and experimental gates remain identical
to that master. README activation text and eight existing default-selection
controls stay in the dependent [Codex PR #15683](https://github.com/paperclipai/paperclip/pull/15683),
whose expected review is 98 files. Preserve all work and both branches.

The isolated extraction passes 276 existing focused controls. Runner no-emit
passes. The standard server no-emit initially finds a linked dependency-output
skew: the new master's ACP constants are absent from the old checkout's compiled
adapter-utils. A source-aware diagnostic passes; canonical verification remains
pending until its matching JavaScript dependency is prepared. Full hosted CI,
native compilation and fresh review are still required for the extracted head.
Do not count the diagnostic as a passing standard command.

Retained qualification keeps literal identities: four producers and Linux x64
and both Mac consumers pass at `a200495`; installed ARM native startup passes
with scoped stock Ubuntu prerequisites in
[38291535914](https://github.com/paperclipai/paperclip/actions/runs/38291535914).
Those artifacts are not relabeled as the extracted source. The Linux baseline
is GNU libc 2.39+, on x64/AArch64. Windows and Alpine remain deferred.
Cargo caches and overlapping JavaScript/native preparation use existing hosted
workflows. No local Docker/Rust builds or bundled Codex payloads are introduced.

Merge order is runtime prerequisite, Codex defaults, then the existing Claude
[protocol #15994](https://github.com/paperclipai/paperclip/pull/15994),
[default #15993](https://github.com/paperclipai/paperclip/pull/15993), and
[platform #15997](https://github.com/paperclipai/paperclip/pull/15997) PRs.
The authorized Claude chat owns its verification and fixes; this task coordinates
normal squash merges after applicable gates. The older Grok Cloud PR is an
independent lane, with its own missing snapshot-cleanup access and live proof.

Next action: open the extracted prerequisite, compose the preserved default
branch on it, require current-source CI/review, and remotely prepare the exact
Codex staging image and DB/shared pair. The existing QA tenant remains pinned to
old `2dbe43a4`. Managed Codex retains its $2.50 setup/task envelope and $2 cleanup;
historical unknown holds remain within the original $250 ceiling. Claude has
its separately authorized $50 ceiling. Missing live proof remains unresolved.

## Outcome and ownership

Users choose a harness. New agents use Paperclip Runner where the harness and
execution target are qualified. Existing agents keep their recorded runner.
The task owns implementation, verification, review fixes, and reviewable PRs.
Merging and deployment require separate authorization.

The original implementation is preserved on `codex/default-agent-runner` at
`171d841295808ca185a258aaeb10b3dee68bb2b9`. Its public review is
[PR #15422](https://github.com/paperclipai/paperclip/pull/15422).
The user approved splitting that work into four useful steps:

1. Packaged runtime reliability and Codex prerequisites, without changing defaults.
2. Codex defaults across creation, onboarding, hiring, imports, and the UI.
3. Claude defaults and authentication.
4. The remaining supported harness defaults and provider-specific fixes.

## Current slice

Canonical branch: `codex/runner-packaging-prerequisites`.
Frozen master base: `1881894973a2b25838d8abed9bd8aeebc3af4441`.
Canonical PR: [#15555](https://github.com/paperclipai/paperclip/pull/15555).
Its [checks](https://github.com/paperclipai/paperclip/pull/15555/checks) and
[commits](https://github.com/paperclipai/paperclip/pull/15555/commits) record the
final candidate. Hosted results and review disposition belong to that exact
candidate; earlier green checks do not qualify a later revision.

The user requested a smaller PR on 2026-10-08. This slice now covers Codex
executable resolution, native-free npm packaging, the installed JavaScript
dependency graph, and the sandbox resource lookup required by that npm layout.
It retains focused tests and extends the existing public npm consumer verifier.
It does not add a workflow, change Docker or Git installation, change shared
login HOME or working-directory behavior, or transfer runner release assets.
Agent defaults, saved runner choices, UI, schema, and provider qualification stay
unchanged.

The broader prerequisite implementation is preserved on the pushed branch
`codex/runner-packaging-full-snapshot` at
`6f3060beaa842ffcee21af058370d3cab5f571e9`. Its Git staging, extra login isolation,
release pipeline, Docker materialization, and unrelated test-fixture changes
remain outside this PR. Release and platform packaging must be qualified in a
separate slice before enabling new-agent defaults.

### Retained behavior

Ordinary native Codex startup, direct evals, and browser login prefer the
installed dependency. They accept usable older or newer CLI versions. If the
dependency is absent, use the selected host's PATH. Explicit commands and recorded
sessions retain precedence. Real protocol/login failures remain actionable;
there is no silent runner fallback. Release pins and the separate ACPX artifact
qualification stay unchanged. Linux ARM64 keeps its existing legacy login path.

Final review found a relative PATH regression in the retained resolver. Resolve
relative and empty PATH entries against the selected provider working directory;
retain installed-dependency preference. Extend the existing fresh-process fixture
and qualify the resulting commit separately from the green `cb5948e` candidate.

Paperclip npm tarballs retain the patched JavaScript graph and strip Codex native
payloads. The published server declares official optional host packages. npm
installs them for the consumer's OS and architecture. This avoids collisions with
the legacy adapter's separate Codex version. The server owns the bridge dependency
used by its vendored runner. Sandbox reads remain confined to the selected native
vendor resources; package identities and path containment still apply.

Browser login keeps master's provider-specific credential directories, ambient
HOME, and working directory. Only executable selection and safe errors change.

## Evidence and gates

| Gate | Status | Evidence |
| --- | --- | --- |
| Preserve original and broader work | Passed | Pushed branches and revisions above |
| Narrow scope against current master | Passed | Installed Codex/npm scope only; no workflow, Docker, Git installer, or unrelated fixture diff |
| Focused packaging and installed-consumer controls | Passed | 24 packaging tests with actual offline npm tarballs; 9 existing consumer assertion tests |
| Login controls after narrowing | Passed | 13 existing tests; HOME/config-directory/spawn semantics match frozen master |
| Codex selection, protocol, sandbox, and ACPX integrity | Passed locally | 21 selection/security/transport/eval tests; 4 npm layout integrity controls; runner TypeScript no-emit |
| Full checks and fresh review | Pending for relative PATH fix | `cb5948e` passed all 47 CI jobs and its clean Linux npm consumer; qualify the final fix with new CI and fresh 5/5 review |
| Previous broad candidate | Historical | 47 ordinary CI jobs passed at `6f3060b`; not proof for the narrowed candidate |
| Existing old CLI protocol proof | Historical | Official Codex 0.156.1 completed startup handshake; scope must be matched to retained sources |
| All-harness live onboarding and cloud qualification | Deferred | Later defaults slices; authentication probes and CI cannot close live journeys |

Use Node 24 and one worker for focused local checks. Keep heavy builds in hosted
CI. Do not build Docker images or Rust locally. Do not author a lockfile change.
No provider-backed runs or new disposable environments are needed for this
prerequisite slice. Incremental provider spend for narrowing is $0. The original
$250 ceiling and cleanup obligations remain for later live qualification.
Existing credentials and user previews remain untouched.

Next action: commit and push the narrowed candidate, rerun its checks and fresh
review, then update the PR and existing evidence report. Start the Codex-default
slice after the user chooses to proceed. Merging and deployment remain outside
this task.
