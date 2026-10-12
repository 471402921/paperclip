# Runner defaults: staged delivery

Updated 2026-10-12.

## Latest checkpoint: ARM qualification and master integration

The Rust daemon, protocol, Codex driver, creation policy, and provider
requirements remain unchanged from qualified source
`a200495cc7488f4d59da570407e516cf702e5af8`. Its verified 18-package archive
retains that literal identity. All four hosted daemon producers, Linux x64 clean
installation, and both Mac installed startup/cleanup consumers pass. The original
unprepared ARM failure remains recorded; qualified ARM startup passes with stock
scoped OS prerequisites and no global restriction change.

The [committed-helper consumer](https://github.com/paperclipai/paperclip/actions/runs/38290234153)
passes using tooling `0690801` and literal `a200495` packages. Receipt:
`/private/tmp/ci-final-0690801-integrated-arm-receipt.json`.
Fresh review at `a5b1683` is 5/5, with all 16 threads resolved. That correction
loads the helper from the immutable workflow definition rather than an older
frozen product checkout that does not contain it. A separate sparse checkout
uses `job.workflow_repository`/`job.workflow_sha`; both source identities and
the helper digest enter the existing report. No mutable branch or caller-source
fallback is used. The original product consumer and archive guards stay intact.

The [actual final workflow wiring](https://github.com/paperclipai/paperclip/actions/runs/38291535914)
also passes: immutable helper checkout, stock prerequisite preparation, native
session, default daemon, read-only model context, and joined cleanup. Its three
critical steps are byte-preserved from the delivery workflow. Literal product
source is `a200495`, definition base is `a5b1683`, and actual tooling source is
`8eb3595a`. All 18 packages and lock/daemon/official-launcher/native-payload
hashes remain unchanged. Global restrictions stay 1/Y/1; scoped profiles stay
enforced. No overlay, direct-control substitute, Rust rebuild, credentials, or
provider turns were used. Receipt:
`/private/tmp/ci-final-a5b1683-final-wiring-receipt.json`.
Normal OS APT installation and paid ARM task/follow-up remain unproven.

Master `82274853729f8c5b0f812da08595020f7eb64d66` requires one test-fixture
conflict resolution. Its shared test-home cleanup replaces the duplicate
traversal. Real Mac Node 24 tests expose `ENOTEMPTY` for read-only descendants;
the shared helper now retries only after restoring owned directory permissions.
Unrelated errors remain visible; symlinks and immutable file modes stay intact.
All 84 fixture/selection controls, server typecheck, 80 merged workflow/cache
controls, and token gates pass. Both master's general release-crate cache and
this branch's native producer dependency cache remain. Receipts:
`/private/tmp/codex-default-master-home-cleanup-fix-receipt.json` and
`/private/tmp/codex-default-master822748-readonly-audit.json`.

Master's heartbeat extraction updates server orchestration. Historical frozen
package startup and useful-task evidence remain component proof with literal
revisions; they are not relabeled as complete current-server onboarding proof.
The last verified preview restart serves `2026.1005.0+352.git.0690801f13` at
[3125](http://127.0.0.1:3125/COD/agents/all), preserving all four agent
configurations and both historical native runs. The downloaded Apple Silicon
daemon requires no source build or binary override.

Fresh review at `665c155` reports three valid findings. Remote sandbox setup and
execution now share the existing actual-target OS/architecture resolver rather
than selecting the Mac controller's daemon. Thirteen new baseline failures
reproduce the issue; 124 target/setup/backend and retained-artifact/version
controls pass after the fix, with server typecheck. Header, digest, preinstalled
artifact, and remote build-metadata verification stay strict. Foreign artifacts
are read/hashed on the controller and executed through the remote launcher.
Local and non-Codex paths remain unchanged. Receipt:
`/private/tmp/codex-default-sandbox-target-fix-receipt.json`.

Unchanged saved setup choices now bypass only new-selection resolution, retaining
later secret, company/environment, authentication, and runtime validation. The
actual disabled legacy baseline returned 422 before its probe. Treatment passes
175 existing controls plus a native-provider switch negative, with server
typecheck. New, explicit, draft, and changed-harness choices keep the disabled
adapter policy. Receipt: `/private/tmp/pr2-disabled-saved-codex-owned-receipt.json`.

The actual served Codex guide reproduces stale Mac/ARM legacy text at `665c155`.
It now uses the shared GNU libc floor, lists qualified Linux/Mac architectures,
distinguishes legacy fields, and preserves existing-runner and failure semantics.
Adapter typecheck passes; the updated served guide needs final-preview proof.
These corrections update server setup/execution and guide source. The qualified
`a200495` package startup and historical task evidence retain their literal
component boundaries; no new managed live proof or paid turn is claimed.

Fresh review at `e79254b` verifies the preceding fixes and reports one valid
development override edge. The common remote resolver now preserves
`PAPERCLIP_RUNNER_BINARY` only when the measured target OS/CPU matches the
controller. Explicit remote overrides retain priority; every selected artifact
still requires a matching native header. Cross-target selection ignores the
controller override. Seven new baseline failures reproduce the defect; 133
target/setup/backend/retained/version controls and server typecheck pass after
the correction. Receipt:
`/private/tmp/codex-default-same-host-override-fix-receipt.json`.

The `e79254b` preview restart preserves all four configurations and both
historical native runs. Its actual served guide now reports the shared GNU floor
and qualified Mac/ARM targets. No native build, Docker build, or provider call
runs locally. Main CI's selector remains unallocated; other PRs share this queue.
No environment approval, owned concurrency conflict, or routing failure was
found. Org capacity versus GitHub allocation is unconfirmed. Receipt:
`/private/tmp/pr2-e792-selector-queue-investigation.json`. Required final CI
aggregates and fresh review remain pending, not passed.

Next action: require fresh CI/review on the final corrected candidate, refresh the
matched preview, and publish final conclusions in the canonical PR's evidence
index. Human code-owner approval, managed staging onboarding, and actual
post-merge Cloud composition remain outstanding. No merge or production
deployment is authorized. Historical unknown costs and cleanup holds remain
reserved; all Dockerfile/native builds stay remote.

## Current amendment: remote build performance and Linux baseline

The user requires Cargo dependency caching and overlapping JavaScript/native
preparation in the existing hosted jobs. Dockerfile and native builds must stay
off this Mac. Reuse the current child supervisor for concurrent commands and
failure/cancellation cleanup; join both outputs before source, header, signature,
and hash recording. Cache dependency crates only, keyed by target, OS baseline,
compiler, lockfile, and external contract inputs. Only canonical exact-source
master pushes may save trusted caches. Preview jobs restore only. Seventy-nine
workflow/process controls pass; actual speed or cache hits remain unproven until
the final hosted run. Receipt:
`/private/tmp/pr2-native-cache-parallel-owned-receipt.json`.

The exact `dcdf09a0f33536fa2b6daaf6e731d921d5711282` four-target qualifier
[38268767165](https://github.com/paperclipai/paperclip/actions/runs/38268767165)
has built all four actual daemons. Linux package installation passes, as does
the clean Apple Silicon consumer. ARM64 installs successfully but native session
startup fails; cleanup masked the original cause. Ordinary CI passes at that
source. Fresh review found a target-daemon
selection mismatch for cross-architecture SSH: an x64 controller could select
its own daemon for an ARM64 environment. The existing resolver/setup/execution
seams now select and verify the actual target header. One hundred four affected
controls and both typechecks pass. Setup and execution share the fix; missing or
wrong artifacts fail explicitly. Receipt:
`/private/tmp/pr2-native-ubuntu-ssh-owned-receipt.json`.

The existing installed startup fixture now preserves the primary error and
separately records cleanup failure. Fourteen controls and E2E typecheck pass.
Docker isolation, no-network policy, and zero provider turns stay unchanged.
Use the exact failed package artifact `11757308120` from run `38268767165` in
one disposable hosted ARM diagnostic job. Keep corrected tooling provenance
separate from its literal `dcdf09a` product source. Verify registry ZIP digest,
bounded archive members, source, and every package hash before using the
existing consumer. This temporary diagnostic ref adds no permanent test suite
or workflow inputs. The primary cause and final ARM startup remain unresolved.
Receipts: `/private/tmp/pr2-installed-startup-error-preservation-receipt.json`
and `/private/tmp/ci-final-dcdf09a-arm-startup-failure-receipt.json`.

Independent inert ELF inspection of both Linux artifacts at this revision
confirms required `GLIBC_2.39`, GNU loaders, `libc.so.6`, `libm.so.6`, and
`libgcc_s.so.1`. Neither binary was executed locally. The published Linux
baseline is therefore GNU libc >=2.39 on x64/AArch64. Pin current producers to
Ubuntu 24.04; clean consumers use the pinned Debian 13 Node image. Do not claim
older distribution/kernel qualification. Automatic new-agent selection rejects
measured older, musl, or unknown Linux libc; existing native configurations keep
their execution. Windows and Alpine/musl remain deferred. Receipts:
`/private/tmp/ci-final-dcdf09a-linux-arm64-data/elf-dependencies.json` and
`/private/tmp/ci-final-dcdf09a-linux-x64-data/elf-dependencies.json`.

The libc guard passes 209 focused controls and both typechecks. Seven actual
POSIX probe/version controls pass. Forty-one built-in database cases did not
execute because embedded PostgreSQL timed out on this Mac; require Linux CI.
Token gates pass with the pinned pnpm launcher. Receipt:
`/private/tmp/codex-default-glibc-floor-receipt.json`.

Next action: freeze corrected diagnostic tooling, identify and fix the actual
ARM startup cause, then require fresh hosted qualification, CI, and review. Keep
the current branch, PR, test-drive, budget holds, and no-Codex-bundling boundary.
No merge or production deployment is authorized.

Checkpoint `695506ad3912fa63604ca784fda50416fba983d6` is pushed and passes
ordinary CI (53 successful checks, four conditional skips). The restarted
test-drive serves `2026.1005.0+348.git.695506ad39`; four complete agent execution
configurations and both historical native runs survive unchanged, with the old
experimental flag false. Normal staging selects the verified Mac target and
reports `needsBuild: false`; there is no binary override or local Cargo build.
Receipt: `/private/tmp/pr2-final-preservation-after.json`.

The hosted [ARM diagnostic](https://github.com/paperclipai/paperclip/actions/runs/38273898742)
used tooling `695506ad` and the literal `dcdf09a` package archives. It recovered
the primary failure: Codex's bubblewrap cannot create a namespace inside the
restricted Docker fixture. Daemon/CLI installation and ABI were not the cause.
The existing consumer now retains that Docker install/lifecycle proof and
uses the same installed graph on the actual ARM host for unchanged read-only
startup. Lock, daemon, and official Codex command hashes must match across
Docker/host and before/after. Twenty-one controls and independent review pass.
No external-sandbox substitution, sudo, sysctl, namespace flags, or product
permission policy changes are used. Actual host capability still needs proof.
Receipt: `/private/tmp/pr2-arm-host-split-owned-receipt.json`.

Fresh review also found that the daemon's new libc gate had accidentally sent
older Linux browser login to PATH-only lookup. A two-file fix restores owned
Codex CLI resolution independently of daemon eligibility. One hundred twenty-four
focused cases and server typecheck pass; nine regressions fail before the fix.
Creation's libc floor remains unchanged. Receipt:
`/private/tmp/codex-default-login-libc-decoupling-receipt.json`.

Next action: freeze this corrected tooling and run one remote ARM host treatment
against the same verified archives. Require actual host startup before the final
four-target qualification; retain literal product/tool source identities.

The [host treatment](https://github.com/paperclipai/paperclip/actions/runs/38276826878)
at tooling `123a18837478d8cd0e2aff23f7e7aa86c9107de3` also fails native startup.
The actual ARM host reaches the installed daemon and Codex, then bubblewrap
fails loopback `RTM_NEWADDR` with `Operation not permitted`. No successful
native session or after-start continuity is claimed. Docker/host installation
identity passed. Exact upstream Codex 0.160 source places namespace creation
before its own seccomp filter and always restricts networking for filesystem
helpers. A Paperclip network-mode change would not solve this. Prepare one
temporary same-policy direct Codex control plus read-only host namespace facts
to distinguish host enforcement from native mediation. Do not alter kernel,
Docker, or product permission policy. Receipts:
`/private/tmp/ci-final-arm-host-diagnostic-123-receipt.json` and
`/private/tmp/codex-default-arm-sandbox-source-diagnosis.json`.

Fresh `123a188` review is 5/5 with one payload-continuity finding. The existing
consumer now hashes the actual official Codex native executable separately
from its launcher, checks containment/header, and compares both across Docker,
host, and before/after. Twenty-one controls pass, including native-only mutation
and an older supported package layout. Receipt:
`/private/tmp/pr2-native-codex-payload-and-control-preparation-receipt.json`.

Ordinary `123a188` CI found two test gaps. Nine new login fixture controls were
shadowed by Vitest's global module bridge. The existing bounded plain-Node
resolver seam now proves private package selection and containment before only
fake login; all 27 login cases and typecheck pass. A repository test reloaded one
millisecond after Save, before any update request reached the server. It now
awaits the real saved-value render, then retains the persistence assertion after
reload. No product repository code changes. Receipts:
`/private/tmp/codex-default-login-resolver-isolation-receipt.json` and
`/private/tmp/ci-final-123a188-repository-e2e-analysis.json`.

Next action: freeze these review/test fixes, run the bounded direct ARM control,
and require fresh Linux CI. Keep ARM startup sign-off unresolved until proven
on a compatible target; package installation and direct execution alone do not
qualify the native runner. All Docker/native builds remain remote.

Checkpoint `598e190cb308f4d7f8f43c188c2e7d88c3fc90d1` passes
[ordinary CI](https://github.com/paperclipai/paperclip/actions/runs/38279960223):
both required gates, 54 successful checks/statuses, and four conditional skips.
Fresh review is 5/5; all 15 review threads are resolved. Human code-owner approval
is still absent. The test-drive serves `2026.1005.0+350.git.598e190cb3`; all four
execution configurations and both historical native runs survive restart.
The verified Apple Silicon daemon remains unchanged, `needsBuild: false`, with
no binary override, native compilation, Docker build, or provider turn locally.
Receipts: `/private/tmp/ci-final-598e190-ci-review-receipt.json` and
`/private/tmp/pr2-final-preservation-after.json`.

The [direct/native ARM diagnostic](https://github.com/paperclipai/paperclip/actions/runs/38280515437)
records GNU libc 2.39, AppArmor enabled with restricted unprivileged user
namespaces, an unconfined current profile, zero effective capabilities, and no
seccomp filter. Native startup still fails at bubblewrap loopback `RTM_NEWADDR`.
The direct control stopped before Codex spawn at a TOML preservation guard,
so it does not establish the sandbox failure's cause. Receipt:
`/private/tmp/ci-final-arm-direct-diagnostic-598-receipt.json`.

Pure, integrity-bound public `smol-toml` 1.9.1 reproduction identifies that guard
failure: its null-prototype tables differ from the writer's spread-created
ordinary objects. Preserve the parser's tables while changing only the intended
trust field; keep strict comparison, original comments/bytes, private writes,
and malformed-input rejection. No parser pin, semantic bypass, or permission
change. The existing suite passes 22 controls across both table representations;
real 1.9.1 treatment repairs five valid configurations and keeps two invalid
configurations unchanged. Runner/server typechecks pass. Receipt:
`/private/tmp/codex-default-startup-trust-fix-receipt.json`.

The [four-target performance qualifier](https://github.com/paperclipai/paperclip/actions/runs/38281631416)
uses literal `598e190` product/workflow source. Observed Linux x64/ARM64 and Apple
Silicon builds pass with actual concurrent JavaScript/native preparation.
Cache restore is exercised; observed results are cold misses, not measured
speedups. The cache writer is reachable through the existing verified master
canary push, with exact source and repository guards; no write-gate expansion
is needed. Linux daemon bytes match the measured GNU 2.39 baseline. Remaining
producer/consumer results must be recorded before qualification claims.

Next action: freeze the narrow trust correction, repeat the bounded direct
control with explicit corrected-tooling provenance, and retain native startup
as mandatory. A private namespace negative control and bounded read-only
AppArmor journal may help distinguish host denial. Do not modify host policy,
relax Codex's sandbox, or substitute direct execution for native qualification.
Require fresh CI/review after the correction. ARM startup and managed staging
remain unresolved; no merge or production recommendation is made.

The frozen production checkpoint `a200495cc7488f4d59da570407e516cf702e5af8`
passes [CI](https://github.com/paperclipai/paperclip/actions/runs/38283122068)
(54 successful checks/statuses, four conditional skips) and fresh 5/5 review;
all 15 review threads are resolved. It serves the test-drive at
`2026.1005.0+351.git.a200495cc7`, with four complete agent configurations and two
historical native runs unchanged after restart. No local native/Docker build
or additional provider turn ran.

Its [exact-source qualifier](https://github.com/paperclipai/paperclip/actions/runs/38283695248)
builds and verifies all four daemons. Linux clean installation and both actual
Mac native startup/cleanup consumers pass. Cache restores are real cold misses;
JavaScript/native preparation overlaps on all four producers. The unchanged
host's ARM startup fails at AppArmor's namespace capability restriction, so that
original run remains failed. Public artifact `11763536756` contains the verified
18-package graph. Receipts: `/private/tmp/ci-final-a200495-hosted-qualification-receipt.json`
and `/private/tmp/ci-final-a200495-cached-producer-observations.json`.

The separate [stock-prerequisite ARM treatment](https://github.com/paperclipai/paperclip/actions/runs/38287918968)
passes actual native startup, default daemon resolution, model selection,
read-only context, and joined cleanup on the exact same packages. Lock, daemon,
official Codex launcher, and native payload hashes match before/after. GNU libc
is 2.39. Global AppArmor enforcement, namespace restriction, and clone setting
remain Y/1/1. Authenticated Ubuntu package files provide system bubblewrap and
its reviewed stock scoped profile. Only those files are materialized; no package
maintainer scripts, sysctl writes, or broad profile reload runs. This is a
qualified target prerequisite, not a product permission-policy change.
The user has no other QA ARM host. No new paid environment was provisioned.
Receipt: `/private/tmp/ci-final-a200495-arm-stock-prerequisite-receipt.json`.

Keep the boundaries explicit: normal OS APT installation is unproven; the actual
Paperclip npm installation and native startup are proven. The separate direct
control hits a read-only temporary-home error and is excluded from native
qualification. No ARM paid task/follow-up is claimed. Actual Apple Silicon
useful-task/follow-up evidence remains tied to its recorded source and identical
verified daemon bytes. Existing agents keep their runners.

The tested setup body is integrated as
`scripts/prepare-linux-arm64-qualification.sh`, with an early hosted-Linux guard.
The existing ARM-only qualification step invokes it before the existing consumer
and uploads its report through the same artifact pipeline. Four focused workflow
and guard controls pass; syntax and diff checks pass. Receipt:
`/private/tmp/codex-default-arm-prerequisite-ci-integration-receipt.json`.

Next action: require latest-head CI/review and one hosted consumer against the
unchanged `a200495` production packages using the integrated helper. Production
code remains frozen there; subsequent edits are qualification tooling or
documentation and retain separate source identities when reusing those literal
package archives. Managed staging, human
code-owner approval, actual post-merge cloud composition, and production sign-off
remain outstanding. No merge or deployment is authorized.

## Current addition: Linux ARM64

The user now requires ARM Linux support as well. Treat ARM Linux as ARM64
(`aarch64`), alongside Linux x64 and both macOS architectures. The earlier
Linux ARM deferral below is superseded for ARM64; 32-bit ARM and Windows retain
legacy defaults. Existing agents keep their saved execution.

Extend the same native Codex creation/discovery contract and existing selection,
login, built-in and plugin fixtures. Extend the current release assembler and
remote workflow matrix to the fourth target, with an actual ARM64 hosted build
and clean installation. Reuse the installed no-turn Codex startup check and
the same public npm tarballs. Read required targets from the selected source
so historical three-target promotions still work. Keep the Linux x64 managed
provider pack distinct from the local ARM64 daemon.

No local Rust/Docker builds or new paid Linux campaign. Apple Silicon task and
follow-up acceptance remains valid at the explicitly recorded source; Linux
ARM64 build/install/startup must acquire its own evidence. The existing
[three-target qualifier](https://github.com/paperclipai/paperclip/actions/runs/38259364638)
completed successfully at `d522822`, including both clean Mac consumers. It does
not qualify ARM64. Candidate `058af8f1b69c5fa3d9bc974b9eab73c141b52823` passed
ordinary CI and fresh 5/5 review. Its remaining import display finding is fixed
by sharing the existing legacy argument-policy calculation with the UI without
changing execution permissions. Ninety-five focused controls pass; all 45 exact
argument cases also pass against the original builder. Four component cases fail
on the original page. A no-provider protected preview shows Legacy with bypass
off, matching `--sandbox read-only`; it does not apply another import.
Receipt: `/private/tmp/codex-default-dc-import-live/legacy-policy-p2-receipt.json`.

ARM64 selection/discovery controls pass 46 and 29 cases. Fourteen isolated
browser-login tests pass after replacing the hardcoded ARM64 legacy login branch
with the shared platform contract. This uses native execution's owned Codex
resolver on ARM64 and retains PATH lookup for unqualified platforms. Shared
typecheck passes. Built-in and plugin fixtures now include ARM64; their database
checks remain in normal Linux CI. Receipt:
`/private/tmp/pr2-linux-arm64-selection-checkpoint.json`.

The packaging patch passes 97 existing controls: 15 assembler/provider-pack,
20 consumer-boundary and 62 workflow tests. The first full workflow attempt was
blocked by sandbox localhost permissions; the same full suite passes with its
temporary listener access. Three workflow YAML files and MJS/shell syntax pass.
Independent review confirms historical source compatibility and the unprivileged
offline consumer boundaries. Official registry metadata confirms the pinned
Node image has a native ARM64 manifest and the installed Codex dependency has
an ARM64 package. No image or binary was pulled to this Mac. Receipt:
`/private/tmp/pr2-linux-arm-packaging-owned-receipt.json`.

Actual ARM64 daemon build and clean npm/native startup remain unexecuted at this
source freeze. The test-drive stays on its existing verified Mac daemon; its
last restart at `058af8f` preserved both full execution digests, both recorded
native runs and both paused imports, with the deprecated flag false. Receipt:
`/private/tmp/codex-default-dc-import-live/final-restart-receipt.json`.

Next action: integrate the narrow policy display and ARM64 source/package fixes,
run targeted controls, freeze/push one candidate, then run the existing hosted
qualification once with all source-declared targets and require fresh CI/review.
Keep the same branch, PR, preview and evidence index below. No merge or
production deployment is authorized.

## Current amendment: include macOS in this PR

The user requires macOS support in the same Codex-default PR. The earlier
Linux-only scope and macOS deferral below are superseded. Qualify Linux x64,
macOS arm64 and macOS x64 through the shipped package path. Windows and Linux
ARM keep their legacy defaults. Existing agents retain recorded execution.
The user explicitly invoked `dotta:paperclip-test-drive`. Real task/follow-up
acceptance is required on this Apple Silicon Mac. Intel builds must be attempted;
an attended Intel provider journey is not required. Reuse the healthy test drive
and the existing Product E2E helpers rather than create another test system.

Keep the current PR and branch: [#15683](https://github.com/paperclipai/paperclip/pull/15683),
`codex/codex-runner-default`. The Mac qualification source is
`d522822a5daeb72d124360b576b82a8bb52b43f4`; its
[ordinary CI](https://github.com/paperclipai/paperclip/actions/runs/38259205327)
is green. Fresh automated review is 5/5. The development release-manifest
finding is fixed with focused tests and awaits fresh final-head review.
Earlier Linux-only source `6ca302426b768791b499d2d563bbca4276f2c908` had fresh
5/5 review and eight resolved threads. That historical review does not qualify
the macOS amendment. Master integration conflicts are resolved.

The [test-drive server](http://127.0.0.1:3125/COD/agents/all) is running through
the normal dev supervisor at the Mac qualification source. Health and bootstrap
are ready; the actual listener belongs to this worktree. The preserved legacy
and new native Codex QA agents are idle, with unrelated title edits intact. Dependencies
and ignored configuration had been cleared, so startup restored them and the
normal CLI signing keys while retaining the database and encrypted account key.
The initial borrowed development daemon was removed before paid testing.
The production resolver selects the source-bound CI arm64 daemon. Both native
task runs and restart preservation use the verified runtime below.

Implementation ownership:

- Packaging worker: reuse the existing daemon assembler, release verification
  and release-smoke workflows to produce source-bound Linux and both macOS
  artifacts. Pack the normal npm graph, then test those same tarballs on actual
  Mac hosts. Retain the Linux and provider-pack controls. Never bundle Codex
  native payloads; use the installed official npm dependency and real protocol
  compatibility. Compile Rust and Docker only on remote hosts.
- Selection worker: extend the shared availability contract and existing
  creation, onboarding, discovery, approval, import and UI fixtures. Preserve
  explicit legacy choices, external overrides and existing execution.
- Runtime worker: verify the existing Mac native launch, account isolation,
  file delivery and continuity seams; fix only actual gaps. Keep the Linux-only
  sandboxed workspace-command capability gated on unsupported platforms.
- Lead: integrate, run targeted and required checks, verify useful Mac native
  task/follow-up artifacts and ordinary editing, refresh the test-drive on the
  verified revision, and update the same PR and evidence record.

Reuse existing evaluations and assertions. Provider-free packaging and protocol
checks do not substitute for authenticated task completion. Preserve the $250
ceiling and historical unknown/cleanup holds; reconcile only documented
unstarted future reservations before any new provider turns. No additional
paid Linux campaign is authorized by this amendment. Embedded-browser-only
login, no automatic agent migration, and no merge or production deployment
remain constraints.

The macOS source checkpoint is `7b8d29a856b54217234131474ea47ea1a38fb0aa`.
The frozen master integration target is `b189f586d2f01c078725193b8a5ce4372b4acb3d`.
Conflicts are being reconciled by file ownership, retaining the newer transport,
lifecycle and release verification fixes. Focused macOS selection, installed-hook,
file confinement and packaging controls pass. These are source/protocol controls,
not real provider execution. The existing saved OpenAI subscription is connected.
The ordinary production agent-config render suite passes 111 cases after its merge.

Budget reconciliation assigns $3 of the documented unstarted $5.50 managed
reservation to Apple Silicon native test-drive acceptance, leaving $2.50 for the
managed journey. The completed legacy subscription journey's entire $2.50 hold
remains reserved as unpriced. No historical unknown or cleanup reserve is released;
the $250 ceiling and $248.18 combined cost/reservation total remain unchanged.
Limit the Mac journey to two task turns, 180 seconds each, no automatic retry,
and an independently checked useful file plus revision.

### Mac acceptance checkpoint

The real [Apple Silicon task and follow-up](http://127.0.0.1:3125/COD/issues/COD-2)
passed at runtime source `f4abdc2cfcd779d5ad9b9c0ea8b63114c1a18a9b`.
The ordinary picker submitted `codex_local` without a runner override and saved
`paperclip_runner` / `codex`. Saved subscription reuse and native setup passed.
Both task runs succeeded with driver `codex_app_server`, observed model
`gpt-5.6-sol`, and the same provider session. Independent attachment downloads
verified exact 61-byte and 102-byte Markdown files, including preservation of
the first attachment. Reload retained the native configuration.

The actual owned daemon process loaded the source-bound CI bytes:
`sha256:d0656673f7b6dfa6f2554fac18f3e0b42e2eb10f444b06f6063255335d71aa14`.
Mach-O arm64, production contract, source receipt and code signature passed.
The borrowed development daemon override was removed. Startup at this revision
preserved the old legacy agent's full execution digest. Unrelated UI title edits
and reload preserved complete legacy/native execution digests; the shared runner
picker passed light/dark, mobile and keyboard checks. Screenshots and sanitized
receipts are under `/private/tmp/pr2-f4-mac-ui/`.

The corrected qualifier's exact `d522822` Apple Silicon artifact independently
matches those same bytes and metadata. Artifact `11752770004` passed native
header, source receipt and strict ad-hoc signature checks. Rust tree
`6ca713d5f1f0a059c7f01a37d21f268817e0c93c` and runner TypeScript tree
`ba9744db7fe79301cb0ab442e9546de3282a4bf4` are identical to the paid-task source.
The receipt is `/private/tmp/pr2-d522-mac-remote-daemon/sanitized-verification-receipt.json`.
Restarting the test-drive at `d522822` preserved both complete execution digests,
titles and both native run records, with no additional provider calls.

The deprecated `enableNativeRunner` field is now false on this QA instance.
The native export/import UI journey passes with that field disabled. Import
submission omitted adapter overrides, preserved native Codex/model identity,
and left the new agent paused with its import hold. The explicit Legacy round
trip also passes: the request sends `runner: legacy` without replacing source
configuration, and the saved agent is `codex_local` with the import hold intact.
Both survive reload; the source agent remains unchanged. These imports do not
run setup probes or provider turns.
Evidence is under `/private/tmp/codex-default-dc-import-live/`.

The live import journey found one incorrect policy display. Native Codex's
preserved `never` policy translated to Legacy bypass true, while its checkbox
showed false. A narrow hydration fix uses the existing policy defaults and
canonical booleans; it does not change server permission translation. Against
the pre-fix page, three display cases fail and four safe controls pass. The
fixed page passes 42 component cases and 40 selection controls. The no-provider
preview check passes: the corrected control matches the already-saved paused
agent. Exactly two paused imports were submitted, with no third Apply. The
combined receipt is `/private/tmp/codex-default-dc-import-live/receipt.json`;
it separates `d522822` persistence proof from the corrected UI's content hashes.

[Three-target qualification](https://github.com/paperclipai/paperclip/actions/runs/38252137381)
built all three daemons, including actual Intel Mac. Its clean Linux consumer
passed the 18-package installation and Codex ownership controls, then a Pi probe
failed because it expected the old flat daemon path. Both Mac consumers reached
deferred offline lifecycle scripts but Node-gyp tried a forbidden header download.
Narrow verifier corrections preserve the startup/network/lock/sentinel assertions
and use the host SDK. These failed attempts remain evidence; installed-package
qualification still requires a passing corrected run.

Test-only head `dc7304d7c4db1c9c9ee2ed80a98d004371372771` is production-byte
identical to `f4abdc2`. Its [ordinary CI](https://github.com/paperclipai/paperclip/actions/runs/38253941991)
passes the required checks. Two fixture repairs enabled Dot only in its intended
experiment cases and restored owner directory permissions only inside each test
worker's scratch home for teardown. The actual asset producer/symlink control
passed. Fresh review identified import override/availability gaps and stale dev
host binaries. Their fixes now pass 38 real-component import cases (eight fail
on the old page) and 12 dev-stager/freshness controls. Unknown/gated providers
retain their identity. Rebuilding refreshes an existing host target atomically
and keeps a running old executable intact. Fresh final-head checks/review remain
required. The corrected Pi/Mac installation probes pass 19 focused controls
and independent source review; actual hosted consumers remain pending.

The two native runs report included subscription use without a dollar amount.
The complete $3 setup/task hold remains reserved as unpriced. No historical
unknown or cleanup hold was released, no automatic retry ran, and no additional
paid Linux campaign started. The aggregate ceiling remains $250.

The import, dev-stager and installation-probe fixes are pushed at `d522822`.
The [corrected three-target qualifier](https://github.com/paperclipai/paperclip/actions/runs/38259364638)
has passed all three daemon producers and the real Linux clean installation,
including the corrected Pi probe. Both Mac consumers are checking the same
18 tarballs. Ordinary CI reports 53 successful check runs, Snyk success and four
conditional skips. Fresh review reports 5/5, with one new development-only
manifest issue: rebuilding a host daemon must not corrupt released artifact
identity. Its fix separates local development selection from release assets;
it does not alter the Rust runner, production selector or release assembler.
Fourteen focused controls prove preserved release targets/hash manifest, running
old inodes, correct Mac host selection and future source freshness. Independent
review verifies that the atomic flat publisher and qualified release components
remain unchanged. The actual Mac still selects the verified release target and
does not require Cargo. Receipts are
`/private/tmp/pr2-dev-release-preservation-checkpoint.json` and
`/private/tmp/ci-final-d522-dev-equivalence-audit.json`.

Next action: commit the verified development/import display fixes and this state
record together. Run fresh final-head CI/review in parallel with the remaining
clean package consumers, then record their exact conclusions in the PR evidence
index. Keep `d522822` as the qualification source; subsequent UI/development
checks have their own source identity. Keep exact sources in every receipt.
Do not repeat unchanged paid task turns or qualification components merely for
the development-only fix.

This is the 2026-10-12 source-freeze snapshot. The PR verification section is
the linked evidence index for final CI, review and consumer conclusions. Current
qualification links above retain their literal tested source rather than claim
that an earlier workflow ran on a later development/UI commit.
Managed staging execution/access renewal, code-owner approval and actual
post-merge Cloud composition remain unverified. Prior staging preflight evidence
is retained at [37962635959](https://github.com/paperclipai/paperclip/actions/runs/37962635959)
and [37965658123](https://github.com/paperclipai/paperclip-cloud/actions/runs/37965658123).

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

## Completed prerequisite

[PR #15555](https://github.com/paperclipai/paperclip/pull/15555) merged at
`6f9d0a56ba3c2f0059a723b7de434320eed7eb22`. Its final candidate `dde37d7`
passed 47 ordinary CI jobs and fresh 5/5 automated review. The actual clean Linux
npm consumer checked all 17 tarballs for absent Codex native payloads and official
npm host dependencies. Actual Codex 0.156.1 startup passed on macOS ARM64.
[Bot lockfile refresh #15673](https://github.com/paperclipai/paperclip/pull/15673)
is merged. These checks did not qualify onboarding or cloud rollout.

Removed prerequisite work remains on `codex/runner-packaging-full-snapshot` at
`6f3060beaa842ffcee21af058370d3cab5f571e9`. Do not restore its release workflows,
Docker materialization, Git installer, or extra login isolation wholesale.

## Current slice: Codex defaults

Authorized 2026-10-09. Canonical branch: `codex/codex-runner-default`.
Integration base: master `2dd9811e8be1dab59cccd86cdb25e8953b02fe07`.
Canonical PR: [draft #15683](https://github.com/paperclipai/paperclip/pull/15683).
Last pushed candidate: `ad5d8826ad18f72d672fcafbdd9fec24ef8c9fef`.
It integrates the current agent lifecycle boundary. The next narrow follow-up
restores the native Codex sign-in action and settles an existing chat test's
canonical lookup before interaction. The PR remains under 100 files, with no
workflow, lockfile, or database migration changes. Fresh final-head CI and
review are required after that follow-up.
Preview: [isolated Codex QA](http://127.0.0.1:3125), normal dev supervisor,
separate database. Hosted Linux live onboarding passed at `38199ea8`; it remains
historical proof after the lifecycle integration. UI has separate revision-bound proof.
Attended local subscription and managed staging journeys remain unverified.

New Codex agents select Paperclip Runner on qualified Linux x64 targets. Users
choose Codex, with Paperclip Runner or Legacy runner inside Advanced. Other
harness defaults stay unchanged. Existing legacy/native agents and ordinary
edits retain recorded execution; explicit runner changes use revisions/session
invalidation. No database migration or permission-policy change.

Resolve before validation/auth/instructions/skills at the common creation
boundary. Cover direct/API/CLI creation, onboarding seeds, hires, frozen
approvals, built-ins, plugins, and import/export. Unsupported platforms or active
external overrides retain legacy selection. Missing dependencies, invalid models,
authentication failures, and incompatible settings remain actionable errors,
without silently choosing another runner. Native Codex bypasses the experimental
gate; other native providers retain their existing gate.

Finish line: one narrow reviewable PR, affected regressions and required checks
passing, useful Codex tasks plus follow-up and independently checked artifacts,
onboarding and existing-agent preservation verified locally and on qualified
managed staging, and inspectable evidence. Human merge and production deployment
remain separate actions. Actual production composition remains a post-merge gate.

## Coverage and execution ownership

Reuse Product E2E profiles, fixtures, graders, reports, and installation checks.
The `first-task` native Codex case now inspects the wizard's saved default directly
with the experimental flag disabled. The legacy control selects its override
before authentication. Each isolated onboarding company has a $5 task budget;
setup probes require their own reserved allowance.
Claude's explicit native fixture is unchanged until its later default PR.

| Area | Owner | Current state |
| --- | --- | --- |
| Shared contract, server resolution, setup readiness | Core worker | Integrated lifecycle: 210 core cases, 109 connection cases and five affected refresh controls pass; server noemit passes; counts overlap |
| Production create/edit/onboarding UI and stories | UI worker | 171 fresh focused cases, 30 desktop/10 mobile captures and six keyboard checks; built-in follow-up passes 15 cases, UI typecheck and token gates |
| Built-ins, plugins, approvals, imports/exports, CLI | Creation-path worker | Integrated lifecycle: 105 portability, eight approval and three asset cases pass; 73 DB cases skipped on macOS; final Linux checks required |
| Execution/dev gate, E2E gaps, packaging, live journeys | Lead | Selected Linux onboarding case passes all 13 assertions, actual task/artifact/follow-up and cleanup; 149 public-projection/support cases pass |
| Full CI and final review | Lead | Integrated head: 49 checks pass, three fail, four skip; native auth action finding and existing chat readiness fixture fixed locally; fresh combined-head checks/review required |
| Local subscription task + follow-up | Lead | Embedded-browser Codex sign-in and first-agent creation completed; saved codex_local is expected on macOS; useful task/follow-up still pending |
| Managed staging API/subscription onboarding | Lead | Fleet Admin sign-in completed; dedicated tenant exists, active/awake and pinned to old release; scoped one-hour QA owner access approved; final serving revision/snapshot/runtime/cleanup qualification pending |
| Shipped npm/Docker/cloud artifacts | Lead | Integrated-head clean Linux npm consumer passes: 18 packages, no Codex payloads, host dependency from official npm; immutable staging preparation reports missing matching DB package; actual cloud composition is post-merge |

Keep CPU-heavy Rust/Docker builds in hosted CI. Use Node 24, bounded workers,
conservative provider turns/timeouts and existing QA accounts. Login interactions
use the embedded browser. Do not change user preview services or production.

The original $250 ceiling remains. Historical receipts include unknown-charge
reserves; the latest retained ledger holds $248.18 in costs/reservations and
reports $1.82 unallocated, not a certified invoice balance. Reconcile unstarted
reservations and current resource/credential state before paid runs. Do not reset
the ceiling or treat missing charges as zero. The single new Linux campaign has
four ready rate-card estimates totaling $1.265460800; its entire $12 hold remains
reserved. Keep exact source/artifact/runtime identities and failed attempts in the
existing report pipeline; mocks and passing CI do not close live acceptance.

Integration found and fixed an import preservation gap: same-harness model edits
must retain the package's explicit runner or the existing agent's runner. Native
setup reuses production remote artifact preparation and verifies the actual
app-server/model path; a version number alone does not reject installed Codex.
Known unsupported local/SSH platforms retain legacy defaults. Sandbox support
does not infer an image architecture; setup verifies its actual artifacts.

Public package audit found flat Linux x64 daemons in current stable and canary
server tarballs. Normal release builds stage only the build host's daemon; the
multi-platform assembly helper has no release caller or macOS artifact producer.
Automatic macOS/Windows/Linux ARM defaults therefore remain legacy in this slice.
Existing explicit native agents remain usable with their installed runtime.
macOS runner artifact assembly is a separate prerequisite for its default.
Codex setup required three small Rust seams: read-only probes, observed model
reporting, and reasoning effort. Old cached daemon bytes do not verify these.

Local startup hit the macOS shared-memory ID limit. One detached 56-byte segment
was released only after zero attachments and exited owners were verified. No
running server or database file was changed. The separate QA server is healthy.

Next action: verify the final candidate through existing Linux CI/install checks,
fresh review, and bounded actual journeys. Preserve
failed attempts and costs. Unrelated findings and remaining harness qualification
belong to later slices.

Post-rebase UI checks pass (126 cases, typecheck, token gates). Product E2E
catalog/onboarding support passes (122 cases), plus 47 confirmation fixture
checks and E2E noemit. Existing Pi companion/executor controls pass (26 and 34
cases); core selection/setup passes 87 cases and transport passes six.
Production Storybook build and 26 desktop/six mobile captures were completed
before the Pi rebase; they are component evidence, not live execution proof.
Both final integration gaps are implemented: discovery resolves the selected
environment through the same helper as saving, and explicit native export/import
profiles remain valid on macOS while new automatic defaults stay legacy.
Scoped discovery/authorization passes 63 checks. UI context and recovery checks
pass 280 cases plus three final regressions. Missing discovery metadata shows
loading or the server error with Retry; explicit Legacy remains available.
Final portability checks pass 105 cases; approval, built-in asset and CLI unit
controls pass eight, three and three. The 72 skipped DB cases still need Linux.
Candidate `b7194275e` completed 38 CI checks but failed 14, including aggregate
checks. Its fresh review reported three P1 findings. The fixes preserve explicit
legacy sandbox policy, return refreshed unmanaged subscription credentials to
their authorized source account, and restore gated experimental native choices
for other providers under Advanced. Actor restrictions now run before harness
translation and again on the resolved configuration. Existing route fixtures
use the real resolver; legacy execution controls request Legacy explicitly.
Capability drift was fixed by preserving existing documentation heading anchors,
without changing generated contracts. The retired Codex flag control now uses
an experimental OpenCode profile; all 45 corpus regressions pass locally.
Core regression checks pass 394 cases, with 147 final guard/inheritance controls;
server noemit passes. UI checks pass 212 cases, typecheck and token gates. The
original touch/wheel journeys pass two cases against the isolated preview.
Final desktop/mobile/keyboard captures and the Advanced experimental story are
being checked against the frozen UI tree. Earlier 26 desktop/six mobile/three
keyboard checks passed on the previous UI revision. The built-in regression
checks nondefault settings through runner-only switches in both directions.

Exactly $22 of documented unstarted staging reservations were reassigned to
Codex-only proof: $12 Linux onboarding (one existing campaign, at most two
attempts), $5.50 managed onboarding, $2.50 attended local proof, and $2 incremental
compute/cleanup. The attempted $5 staging setup envelope remains an unknown-cost
hold. Aggregate costs/reservations stay $248.179254104 under the original $250
allocation; no historical unknown or cleanup hold was released. This is not an
invoice-certified balance. No new paid provider task has run in this slice.

Attended local Codex login is unfinished in the embedded browser; its old device
code expired. Staging Fleet Admin requires fresh attended sign-in. The dedicated
QA stack `stack-pool-d06dca5eafe7` and its old immutable environment are identified
historically; current access, serving revision, retained snapshot and physical
cleanup must be verified before reuse. Old archived probe resources and missing
compute billing remain unresolved. Do not substitute old artifacts or passing CI
for these live gates. The next candidate must pass fresh CI and review before
merge sign-off; actual private cloud composition remains post-merge work.


### 2026-10-09 Codex-only candidate qualification update

Frozen execution candidate `38199ea8e6a276eecd35084ad84d691322aba9f4` is rebased
onto master `835a022936ddc7a152b9feab0c0420d02249a6d1`. Its CI completed
48 passing, four failing and four skipped checks. The two substantive failures
are test fixtures: legacy skill expectations on Linux and a credential probe
that depended on a developer daemon. Their narrow corrections pass locally:
77 native/legacy/onboarding skill route cases and the selected-login refresh
regression. The earlier Node 26 skill run ended without a result; it is not proof.
Build, workspace typecheck, all browser E2E shards, policy checks, native
compilation, and the clean public npm consumer pass. The consumer checks all
18 packed packages contain no Codex payload and acquires host Codex from official
npm. The merge and generated-lock CI stamps are recorded separately from source.

The existing Linux Product E2E campaign [37950165589](https://github.com/paperclipai/paperclip/actions/runs/37950165589)
passed its only selected case on attempt one, without a retry. The ordinary
onboarding picker saved `paperclip_runner` / `codex`. All 13 assertions passed,
including an independently checked nonce-bearing document and follow-up with
recorded native execution and the same workspace. Four runs succeeded with
observed model `gpt-5.6-sol`; cleanup passed. Target source is exactly `38199ea8`.
The workflow deliberately applies its verified resolved lock; the source receipt
is dirty and must not be described as a pristine checkout. The report selected
one of 52 catalog cases; it is not the entire catalog qualification.

The final run ledger contains four ready rate-card estimates totaling
$1.265460800 (openai-standard-2026-09-30). Production pricing and accounting
settled. The existing E2E numeric-only cost summary omits decimal-string
costUsdExact and incorrectly reports unpriced/zero; this is a reporting follow-up,
not a production pricing failure. The full $12 campaign hold remains reserved for
setup and invoice uncertainty. Estimates are not provider invoices. No further
paid campaign was dispatched.
The existing public report includes private session identifiers in its result
summary. It is withheld from broad linking while an allowlisted public projection
is added at the existing result seam. Private artifacts and behavioral grading
remain intact. This is an evidence-publication correction, not new eval machinery.

Fresh review scored 3/5, verified the previous three fixes, and found three UI
edge cases: preserve original native setup-link intent on unqualified hosts;
retain built-in settings on runner-only changes; and record an explicit choice
when clicking the displayed automatic default. These fixes pass 171 focused UI
checks, typecheck and token gates. A fresh static build passes; affected visual
proof is in progress. Existing UI verification passed 28 desktop/eight mobile
renders, six keyboard/footer cases and two touch/wheel journeys. Final CI/review
must run after this combined follow-up is frozen.

The isolated preview uses [3125](http://127.0.0.1:3125/COD/dashboard).
Its supervisor uses the correct port and the prior backend restarted at
`2026-10-09T15:28:08.305Z`. No user preview or the separate OAuth proxy was stopped.
The owned supervisor/backend were gracefully paused during lifecycle integration;
restart and serving-source verification are required before another live journey.
The first-agent name draft survived reload. The cached local daemon is not proof
of the new native Rust seams; Linux hosted build/live execution supply that proof.
Attended subscription login and current access to the dedicated managed staging
stack remain unresolved. Canonical issue coordination is unavailable because the
original test-drive service is offline; no unrelated company was used for updates.

Public-evidence projection is complete and passes 149 existing and new support
checks. The private behavioral grader and raw evidence remain intact. Replaying
the retained result removes all 12 known private identity values and preserves
the original revision and all 13 assertion verdicts. Publication needs a new
presentation identity and operator access; the existing protected workflow has
no report-only replay input. It cannot overwrite the prior immutable report.
The prior exposed report also needs operator removal/cache remediation. No
provider rerun is justified to publish repaired evidence.

At `1be8502f`, fresh review confirms all six previous fixes and reports one more
built-in setup issue. A built-in that still needs setup must submit its displayed
configuration to complete setup even when the model is unchanged. Already
configured agents must still preserve the full saved configuration during a
runner-only edit. Both native and legacy regressions reproduced before the fix.
All 15 focused cases pass after the fix, including definition-model fallback and
ready/paused settings preservation. UI typecheck and token gates pass. Rendering
is unchanged, so existing revision-bound visual evidence remains applicable.
Native compilation passes; the main CI cleared its allocation delay and is
running, with no test failure observed yet.

Next action: freeze the built-in setup follow-up, require green
exact-head CI and fresh 5/5 review, and publish sanitized retained evidence when
operator access is available. Complete the attended and managed staging journeys
when their remaining resources are ready. The PR stays
a draft and is neither merge-ready nor production-ready yet. Merge and production
deployment remain outside authorization.

### 2026-10-09 Current-master lifecycle integration

Master merged [#15631](https://github.com/paperclipai/paperclip/pull/15631) during
qualification. GitHub blocked the new candidate on nine real merge conflicts.
The integration preserves master's agent lifecycle ownership. Common runner
resolution now runs in `prepareAgentHire`; approval activation retains the frozen
reviewed runner, responsible-user identity and credential restrictions. Existing
agent updates keep their saved execution. Obsolete source edits were removed,
and redundant generic API prose was dropped while the agent-creation skill and
its reference retain the complete runner contract. The diff remains 99 files.

Focused integration checks pass: 210 core, 109 connection, five affected refresh,
105 portability, eight approval and three built-in asset cases. Counts overlap.
Server noemit and the existing lifecycle-boundary scanner pass. Shared, DB and
plugin SDK JavaScript outputs were refreshed without migrations, Rust or Docker.
The 73 DB-heavy cases were skipped on macOS and require hosted Linux proof.
The full local route-fixture attempt was interrupted and is incomplete evidence;
loopback restrictions were identified before its bounded affected-case rerun.
That unrestricted rerun passes all 61 selected cases; 108 unrelated cases were
excluded and remain part of required full hosted CI.

The human completed Fleet Admin sign-in. The dedicated QA stack exists and is
active, awake, healthy and user-managed, so ordinary fleet rollouts skip it.
It still serves historical Core `2dbe43a4`, not this candidate. The human approved
one hour of scoped owner access for this QA tenant through the audited admin flow.
No release change, provider task, new image or fleet-wide action has run here.

Next action: freeze/push the integrated candidate,
require exact-head CI and fresh 5/5 review, restart the matched local preview and
qualify the dedicated managed target against that candidate. The previous Linux
run is retained evidence; it must not be relabeled as the new live measurement.

### 2026-10-09 Integrated-head qualification and final corrections

At `ad5d8826`, all checks completed: 49 pass, three fail and four skip. Required
verification, workspace typecheck, build, Linux server/DB suites, native
compilation and the real clean 18-package consumer pass. The consumer contains
no Codex payloads and selects its owned official-npm Codex dependency despite a
different outer version. CI merge and generated-lock identities remain separate
from the PR source. Applicable code-owner approval is still unproven.

The only browser failure is the existing selected-run denial case, whose fixture
uses the process adapter. Its URL becomes canonical before its agent query
settles. The test now waits for the successful company-scoped canonical response
and verifies its complete agent identity before clicking. All nine existing
retry cases pass against the real isolated preview with their exact request and
denial assertions unchanged. A supporting query lifecycle control reproduces
lost mutation feedback during a remount; the CI cause remains an inference,
because the controlled early-click browser reproduction did not activate.

Fresh review scored 4/5 and found one native Codex onboarding defect: an
authentication error lacked the shared check that displays the sign-in action.
The missing check reproduced before the fix. The correction retains the native
diagnostic, failed result and explicit runner choice. All 174 readiness, registry
and production-form render cases pass, including selected-environment login and
negative model/dependency controls; server/UI typechecks pass. The agent creation
skill retains the full API contract and CLI equivalents in one place, avoiding a
redundant reference edit and keeping the PR at 99 files.

The attended embedded-browser Codex sign-in succeeded, and first-agent onboarding
created the isolated Mac agent as `codex_local`, as expected on this platform.
The ordinary first-task interaction is open; task, artifact and follow-up are
not yet proven. No task provider call was made during these corrections.

The dedicated staging tenant's old release remains unchanged. Read-only
immutable preparation [37959487896](https://github.com/paperclipai/paperclip-cloud/actions/runs/37959487896)
matched the intended QA target and reported a matching DB package/migrations
artifact gap. Rollout and serving verification were skipped. Build the frozen
candidate's isolated preview image and packages through the existing trusted
remote workflow; never substitute an older image or claim private Cloud
composition from the Core-only preview. Keep the pin and provisioning default.

Next action: push these narrow corrections, run fresh full CI and review, build
matching immutable preview artifacts in hosted CI, then qualify the one QA tenant
after those gates pass. Retain all historical cost and cleanup holds. The draft
remains neither merge-ready nor production-ready.

At correction `f6a15200c`, fresh review passes 5/5 with all eight threads resolved,
and the previously failing retry E2E shard passes. One unchanged auth-signal
fixture exceeded its 15-second test deadline during a cold route import; its
previous exact version passed on the integrated head. Imports now run in the
existing setup hook after the same resets, keeping the 15-second assertion
deadline and all actor/response checks. All 127 affected auth/form/model cases
pass. A temporary 100ms assertion deadline also passes while setup takes about
six seconds, confirming the separation. Keyboard coverage moved intact into
the existing form suite; the PR stays 99 files. This correction changes only
tests and this record, with the production runtime byte-identical to `f6a15200c`.
Three hosted server shards were interrupted after passing progress and remain
incomplete evidence. The new test-only head requires fresh completed CI.

The frozen `f6a15200c` preview image is building remotely; exact-source shared/DB
preview packages are published and their source metadata verified. The isolated
local preview restarted at `2026-10-09T16:46:58.859Z`, serving that version with
startup recovery ready and no pending migrations. Its existing worktree execution
preference was off; activating it allowed the queued user onboarding response
to run. The actual legacy Codex task completed and its independently read file
contained the exact two requested lines. The same-task follow-up is running.
No second task, agent hire, or automatic runner conversion was used.
