# Claude runner defaults

Updated 2026-10-12.

## Outcome and constraints

Start from `058af8f1b69c5fa3d9bc974b9eab73c141b52823`; branch `codex/claude-runner-default`, checkout `/Users/dotta/.codex/worktrees/670b/paperclip`. New Claude agents eventually default to native ACPX Claude on Apple Silicon, Intel Mac, Linux x64 and Linux ARM64. Codex selection remains owned by the dependency branch. On 2026-10-12 the user explicitly approved preserving its latest Linux ARM64 default from `dcdf09a0f33536fa2b6daaf6e731d921d5711282` during reconciliation. Ordinary Claude defaults become Opus 5.5; explicit models and existing runner selections remain intact.

Local Apple Silicon API-key task and follow-up are the first gate. Keep existing connection/login tools. Complete core settings and local subscription next, then package/qualify other targets. Two behavior/platform delivery boundaries plus the user-approved protocol prerequisite PR; no merge or deployment. Linux ARM64 covers installed hosts and SSH, not ARM cloud images. Separate $50 Claude ceiling including setup probes, unknown-charge holds and task turns. No automatic paid retry loops. Docker and expensive Rust builds run in cloud infrastructure; never build Docker images on this Mac.

## Current state

- Review boundaries: the user approved a separate shared-protocol prerequisite to keep each PR below the repository's 100-file limit. The behavior PR is [#15993](https://github.com/paperclipai/paperclip/pull/15993); the platform branch is `codex/claude-runner-platforms` and remains gated. Protocol prerequisite [#15994](https://github.com/paperclipai/paperclip/pull/15994), initial candidate `2e8d5e906e`, has 44 source files and preserves latest Codex startup changes from `a200495cc7`. Behavior candidate `12f30702d7` includes that prerequisite.
- Review corrections preserve legacy ACP permission aliases, retained native import settings and fixed Claude OAuth claims through native creation. Unknown inherited-property model names stay unpriced. Legacy onboarding cases now explicitly select Legacy; ordinary native Claude onboarding skips unqualified controller targets before provisioning. Focused import52, selection/pricing117, OAuth54, CLI fixture104, shared Pi92, Copilot28 and Pi evidence72 controls passed; final CI/review remains required.
- Shared source attestations are versioned rather than rewriting historical identities: Pi v23 and pending Copilot v18 bind the changed Claude effort sources. Prior declarations remain. Executable closures and platform qualification are unchanged; prior mismatched profiles require session reopening. These new generated bindings require a current-source daemon/package build.
- Local ordinary API-key onboarding, useful task, revision, cold resume with high effort, independent artifact downloads and persistence passed. The active preview is `http://127.0.0.1:3105/CLAA/issues/CLAA-1`.
- The user redirected the remaining live checks to API keys. Subscription login remains supported, but no further attended subscription qualification is required; subscription follow-up is not claimed.
- Shared runner controls passed light/dark, 390-pixel mobile and keyboard opening/closing checks. The walkthrough found native Command/Extra args controls; they are now hidden for native execution. The saved Claude preservation test covers this path. Agent form 111 tests, UI TypeScript and token gates passed.
- Four-target cloud producers and required source checks are running on 9788c05; clean-install consumers are still pending. The existing authorized SSH development host is Linux ARM64 with GNU libc 2.39; qualification will use an isolated directory and preserve its other services.
- Reviewed source chat “Make Paperclip Runner the default”; source worktree remains separate and active.
- Isolated feature branch starts at the exact requested SHA.
- Workspace dependencies installed with pinned pnpm 9.15.4 and lifecycle scripts disabled.
- Local key source exists; no credentials retained here.
- Verified baseline Apple Silicon daemon is available at `/private/tmp/pr2-d522-mac-remote-daemon/darwin-arm64/paperclip-runnerd`; use its receipt and digest for phase 1.
- Local default selection, narrow experimental-gate graduation, Opus defaults, and shared runner UI are being implemented. Claude effort transport and acknowledgment are being implemented; the live milestone used default effort on the unchanged baseline daemon.

## Remaining gates

1. Local API-key onboarding/task/follow-up passed; retain evidence while runtime components change.
2. Core settings propagation and preservation paths. The user redirected the remaining subscription acceptance to API-key qualification; subscription follow-up remains unverified.
3. Four-target package and remote proof; enable additional defaults only after qualification.
4. Required checks, final-source review, PRs, inspectable evidence and working preview.

## Budget

Ceiling: $50. Two successful API-key task turns and one successful built-in setup probe. Retain $8 for the initial unpriced receipt/setup uncertainty, plus an $8 additional billed-spend allowance with hard stops and no automatic paid retries; total conservative hold/allowance $16. The follow-up estimate consumes $0.269886 of that additional allowance. These are qualification estimates/reservations, not provider invoices.

## Local API checkpoint

Source base plus uncommitted feature changes; preview `http://127.0.0.1:3105`, isolated home `/private/tmp/claude-runner-default-qa`. Initial CLI seed and ordinary UI creation both saved native Claude / Opus 5.5. Native experiment was disabled before UI setup and task. Existing setup tools succeeded using the verified SDK CLI 2.1.286 in this instance-only PATH; global CLI 2.1.245 was insufficient for Opus 5.5 and was not modified. PostgreSQL install required local postinstall links/signature repair after lifecycle-disabled installation.

UI agent `a0e75080-86de-427a-8ac3-3743c6d076ae`; task `CLA-1`, `6ddff45d-9974-4bd6-976a-f586393ed8f5`. First native run `42773dcb-cbb2-4deb-a495-ca5b3f451780` succeeded with `acpx_runtime` and observed model `claude-opus-5-5`. Independent attachment download: 125 bytes, sha256 `839680679537dfcc8700661347623f0fc1eef7a35e4593dd851a1389bbdc14fc`, three requested checklist items.

The run exposed missing Opus 5.5 pricing. Its immutable receipt remains unpriced, with reported input 15611, cache-write 15599, cached-input 135871 and output 2194 tokens. Preserve an $8 hold. A narrow rate-card addition uses official standard rates 4 / 0.2 / 8 (one-hour cache-write upper bound) / 20 USD per million; first-run independent upper-rate estimate is $0.1958942, not an invoice. Both QA policies blocked unpriced usage and paused after completion. Before the follow-up, retain the $8 hold as explicit policy reservation, allow the known historical unpriced receipt only in these disposable QA policies, keep the $8 additional billed-spend hard stop and no automatic paid retries. Total conservative hold/allowance $16 of the $50 ceiling. No historical receipt is rewritten.

Checks: 66 selection/model tests, 111 agent form tests, 78 other affected UI tests, UI/server noemit and token gates passed. Native eligibility regression passes; Opus pricing check passes after the provenance formatting correction. The mocked route suite subsequently passed 47 tests with localhost access enabled; the initial timeouts came from sandbox listener restrictions.


Follow-up run `60e7f9a2-aff3-40b3-8493-2ede6c59da72` succeeded after a controller restart. The task session was reused and the observed model remained Opus 5.5. Estimated Anthropic API usage: `$0.269886000`. Second attachment is 178 bytes, sha256 `ae6fad75dfa46c4c444ad203dff8029359721e19249c04ec1faba9eb6c3d3341`, preserving the first three items and adding the requested revision. Independently re-downloaded the original after the follow-up and confirmed it remained unchanged. Both runs reached Done; saved agent configuration and native experiment=false persisted across restart.

Product evidence: [task and both downloadable artifacts](http://127.0.0.1:3105/CLA/issues/CLA-1), [first artifact](http://127.0.0.1:3105/api/attachments/3b1b6033-78b4-4a0b-99ae-de363d7f5071/content?download=1), [revision](http://127.0.0.1:3105/api/attachments/857add4a-ef8c-4146-b9c5-be9affc32565/content?download=1). Sanitized receipt: `/private/tmp/claude-local-api-acceptance.json`.

Runtime: daemon source `d522822a5daeb72d124360b576b82a8bb52b43f4`, executable sha256 `d0656673f7b6dfa6f2554fac18f3e0b42e2eb10f444b06f6063255335d71aa14`; SDK CLI 2.1.286 sha256 `75e3016e9d2570767b08e43a7467d4817a4f149232c169ca295f2c95fef21433`. The planned effort transport changes require a new remotely built daemon and affected acceptance reruns; they are not covered by this baseline-runtime evidence.


## Behavior candidate and cloud checks

Implementation commit `6fd56c445d` adds the Apple Silicon default, native-input v7 effort admission, compatible settings/preservation, existing authentication routing, and Opus API pricing. Historical v1-v6 readers and Codex/Pi admission remain covered. Focused runner tests passed (197 tests before the additional three admission/recovery tests; the new focused admission/recovery suite also passed 111 tests). Focused server selection/provider projection, UI/import, routing and token gates passed; two stale experimental-gate fixtures were corrected and the New Agent suite then passed 60 tests. Updated server/runner/UI TypeScript checks passed. Required broad checks and the updated daemon run in cloud CI.

Reconcile the latest Codex dependency (`dcdf09a0f3`, direct descendant of the requested baseline), preserve its newly supplied four-target producer/consumer work, and keep Claude automatic selection restricted to Apple Silicon. No Docker build ran locally. The baseline local API proof remains tied to its original runtime; new effort acceptance requires the cloud-built candidate.


Frozen runtime candidate: `5f0b898e9ecef77afefe309a230e04d7fef66cde`. [Cloud daemon and clean-install qualification](https://github.com/paperclipai/paperclip/actions/runs/38273229107) uses the reconciled source's four-target release matrix. [Cloud required-source verification](https://github.com/paperclipai/paperclip/actions/runs/38273238920) resolves the branch to an immutable target under the trusted master workflow. Both are in progress; no passing claim yet. Image publication is disabled. All Docker/Rust compilation is remote.

Subscription setup is prepared through the ordinary Claude Code wizard. The existing host CLI account is Paperclip Team (`claude.ai`, Team subscription), but the provider browser requires fresh reauthentication after selecting that organization. The user has been asked to complete that sign-in; no credential was extracted from the host or pasted into chat. The API-key preview/artifacts remain available while the subscription draft is pending.

## Cold-resume diagnosis and corrective candidate

The remotely built candidate daemon passed all four producer builds, but package assembly failed on a TypeScript error in Claude task-effort projection: runtime selection profiles expose a backend, not provider/agent properties. The projection now reads the persisted adapter configuration. No daemon Rust change is needed for this correction.

Actual high-effort first tasks succeeded for API-key and subscription agents. Their cold follow-ups rejected session admission before a task prompt. A bounded existing-runtime diagnostic submitted zero prompts/tools and captured only static admission errors and effort options. It identified `session/resume`, newly used by the pinned ACP library, as missing from the configuration acknowledgment guard. The guard now correlates resume acknowledgments just as it does load acknowledgments. Bound effort also persists in the private Claude settings used by cold connections. The corrected diagnostic admitted high effort with `providerTurns: 0`. Focused Claude/Pi/sandbox tests passed 68 tests; focused Product E2E fixture checks passed 91 tests. Server TypeScript passed after the projection correction.

Failed qualification records remain intact, including their pending-accounting/recovery fences. No historical receipt was overwritten or invented. Automatic approval review rejected a budget-resume action as potentially restarting paid work; the user then explicitly approved bounded resume plus one manual retry. The product refused resume while accounting remained pending, and no provider retry occurred. New disposable fixtures preserve those failures while proving the corrected execution path. This recovery/accounting condition remains a recorded acceptance limitation until resolved.

Current aggregate company policy caps: original QA $17 (including an $8 unknown-charge reservation), old candidate $9 (retaining its failed-start reservation and known spend), API-effort acceptance $16, fresh subscription acceptance $8; total $50. Agent policies share their company allocations. Timer heartbeats are disabled, no automatic paid retry campaign is enabled, and only the explicit small acceptance turns are authorized. Reservations and estimates are not invoices. Known API estimates before the final pair: original follow-up $0.269886 and candidate first task $0.1906868; the original first receipt remains unpriced.

The first subscription artifact was independently downloaded and matched the exact 153-byte oracle, sha256 `ef76358a83a31dcb5759ee4384b92fa7a0ce1801b093352e5e6a548e0fbb7512`. Its run used `acpx_runtime`, observed Opus 5.5, and recorded `subscription_included`. The new API wizard saved native Claude, Opus 5.5, and high effort without a runner override; its 137-byte first artifact matched sha256 `fe24122962056946d5d01f693342c86fd83e22dbb21d6d0bc20d35f220f7952c`. Updated-runtime follow-up acceptance is still in progress.

Cloud source verification retained failures rather than claiming a pass: the projection TypeScript error; a 15-minute full-suite timeout; stale Pi catalog identities inherited from the dependency branch; installed-startup fixtures exposed to pnpm's NODE_PATH; and absent historical Git objects in the shallow checkout. The corrected fixture expectations preserve current Pi qualification boundaries and explicitly test rejection of ambient Node injection. The cloud source-check step now fetches only the two exact historical fixture trees and gives the full test command a bounded 60-minute slot inside an 80-minute check step. Required checks and clean-install consumers must be rerun on the corrected source before PR-ready handoff. Docker and Rust builds remain cloud-only.

## API-key acceptance after the resume correction

The user redirected remaining live execution checks to the API key in `~/.secrets`; the fresh subscription sign-in was closed and its unused company archived. Do not require more attended subscription sign-in for this delivery. Preserve existing connection tools and the prior successful subscription first-task evidence; subscription follow-up qualification is not claimed.

Ordinary API-key wizard agent `688ff15d-eb48-4cb5-9f31-2d394ab3fbbb` saved `paperclip_runner` / `acpx` / `claude`, model `claude-opus-5-5`, effort `high`, and the existing responsible-user API-key connection. Preview: [successful API task and revision](http://127.0.0.1:3105/CLAA/issues/CLAA-1). Runs `271e0877-c60c-4ac7-aa1a-7b075481872b` and `eb95ed4d-c219-463e-b04a-1bc4ac83c012` both succeeded with `acpx_runtime`, acknowledged high effort, and metered Anthropic API attribution. Estimated costs: $0.194798400 and $0.342168800. The task, provider, and backend session identities all matched across the controller restart; private provider IDs are omitted from the report. Both runs finished accounting. Saved settings and `enableNativeRunner=false` persisted after reload.

Independent downloads matched both byte oracles, and the original remained unchanged after the revision: v1 137 bytes, sha256 `fe24122962056946d5d01f693342c86fd83e22dbb21d6d0bc20d35f220f7952c`; v2 194 bytes, sha256 `0232a93ccc4da44fd156907b22a64b14487a981fdf12ab9cf73b4ef20d755816`. [First download](http://127.0.0.1:3105/api/attachments/fe58953d-7d1d-4b33-9548-c7611a2e82c6/content?download=1), [revision download](http://127.0.0.1:3105/api/attachments/3a0b5877-5afc-4088-b958-daa3c0b61f61/content?download=1). Sanitized report: `/private/tmp/claude-final-api-acceptance.json`.

Executable identities: daemon source `5f0b898e9ecef77afefe309a230e04d7fef66cde`, sha256 `228c7814c4786614c8358b205da01cf43df822ca5e6f6b74d5a1e8304d03a6de`; sidecar sha256 `daabddfc1373e6b6d2a754cb60bc4c33d7a8b6d6d5c3564ce511ebfaeb8a463d`; Claude SDK 0.3.286 executable sha256 `75e3016e9d2570767b08e43a7467d4817a4f149232c169ca295f2c95fef21433`. Behavior source is `9788c05d0a9825d825c0461eab3191da6a6dcad7`. Reconciled source `966b3d5bc294442f71c1def9406ed2027f41d191` merges Codex dependency `123a18837478d8cd0e2aff23f7e7aa86c9107de3`, retaining its GNU libc 2.39 gate and Linux ARM64 selection. Claude admission/sandbox/input and daemon Rust sources did not change during that reconciliation; the rebuilt sidecar digest is identical. Updated runner TypeScript build, server TypeScript, 95 selection controls and 15 installed-startup controls passed after reconciliation.

[Corrected cloud source checks](https://github.com/paperclipai/paperclip/actions/runs/38279356267) and [corrected four-target packaging](https://github.com/paperclipai/paperclip/actions/runs/38279359427) run on frozen behavior source 9788c05. Carry forward only unchanged evidence; final source and package consumers still require passing checks. Active company caps after archiving the unused subscription-only fixture total $42: original $17, failed candidate $9, API acceptance $16. Agent limits share these allocations, and unknown-charge holds remain in place. Known API estimates now total $0.9975406; this excludes the original unpriced receipt and is not a provider invoice.


## Approved prerequisite split and current CI

The behavior PR now targets the protocol branch and has 64 changed files. Protocol #15994 targets the latest Codex dependency and adds the shared v7 effort/resume contract with historical readers. Cloud Docker-context verification found that `.dockerignore` omitted the new Pi v23 and Copilot v18 identity inputs; explicit exceptions retain them without broadening the fixture context. The old 9788c05 package campaign passed all four daemon producers and Apple Silicon clean install, but the Linux ARM64 consumer failed durable-suspend settlement. Retain that failure; current-source package qualification and ARM diagnosis remain required. No local Docker or Rust compilation occurred.


## Review and qualification update after the prerequisite split

Review stack: [protocol #15994](https://github.com/paperclipai/paperclip/pull/15994),
[behavior #15993](https://github.com/paperclipai/paperclip/pull/15993),
[platform #15997](https://github.com/paperclipai/paperclip/pull/15997).
Before the latest dependency reconciliation, protocol `33c9216614` and behavior
`23d834fc0a` each received 5/5 with their findings resolved. Platform pack parity
was corrected in `4dc13aa32c`; its review still requires refresh. All remain
unmerged drafts pending checks and final qualification.

Further fixes keep explicit Auto effort cleared through native imports and use
the resolved Claude harness for task model/effort overrides and compatibility
validation, including saved profiles without `acpxAgent`. Builder/provider88,
import52 and server noemit passed. Native v7 answered-question constraints now
point to the compact envelope; native contracts/runtime-context58 passed. The
clean-install Pi probe now binds both v23 and its exact digest. Install-sandbox
controls21 passed.

Native Linux producer packs previously contained a daemon under `dist/bin`
that was absent from image packs. Both builders now exclude controller binaries
and remote-pack identities before hashing their provider tree. Parity/integrity13
and image content9 controls passed. Actual rebuilt pack/image identity and paid
remote execution remain gates. No provider boundary was widened by this fix.

Candidate campaigns `38284813521` (8d07b409) and `38285667342` (d0da37c2)
completed all four daemon producers and both Mac clean-install consumers.
Linux assembly retained package bytes but failed the stale Pi install-probe
assertion, now fixed. ARM host startup exposed the precise Codex prerequisite
error: stock Bubblewrap's network namespace was denied by the host AppArmor
policy. The latest dependency `665c155472` supplies verified stock distro
prerequisites and retains the host restriction values before and after setup.
The stack is reconciled with that branch, including its master fixes and cached
build preparation. Reconciled Pi evidence/installed controls87 passed.

The cloud ARM pack from d0da37c2 passed GitHub ZIP digest validation,
bounded archive extraction, recorded artifact hashes, relocated Node/Claude
version launches and the shipped no-follow Claude admission probe. ZIP digest:
`9589de44e923b336e6a4b09bacbfd8ae66de1473577197731bc85e8eefd174a0`;
pack identity: `sha256:6e283f3069e38a2f00cd1b752f10d8147f633dc5be4b60e85ae15a1b762bcfd1`;
daemon: `sha256:0adbf14efb2b5b2826044aa0f55f50a0a779d0f5751d7a7a2526f494ffb9e1bc`.
The pack is installed at the authorized SSH host's standard runtime location;
an ownership receipt records this disposable qualification installation. No
existing pack was replaced. These software checks submitted zero prompts and
used no API key. Pack-parity changes require a new identity before final proof.

The hash-verified 8d07b409 public packages were installed without lifecycle
scripts into `/private/tmp/claude-installed-8d07-preview/consumer` for an actual
installed preview. This is preparation, not a passing installed task claim.
The existing successful preview/data and all unknown-charge holds remain.
No additional paid turns occurred during this review/packaging work; aggregate
active company caps remain $42 of the $50 Claude ceiling. Remaining live checks
use API keys per the user's steering. No Docker or Rust build ran locally.

## Installed API-key acceptance and latest review corrections

The installed 8d07b409 public package preview is now usable at
[CLAA-2](http://127.0.0.1:3105/CLAA/issues/CLAA-2). Runs
`11155946-5239-4127-9c67-ff23acf961c2` and
`5f0e4191-9dd6-44ef-bc0a-0b66a910ec2c` succeeded using the saved API-key
connection, Opus 5.5, admitted high effort, and normal installed daemon
resolution with no runner override or ambient Claude credential. Accounting
completed: estimates $0.197602000 and $0.136576400. Known estimates now total
$1.331719; unknown-charge reservations and aggregate $42 caps remain intact.

The controller restarted between turns. Task, provider and backend session
identities matched privately; IDs are redacted from the sanitized report
`/private/tmp/claude-installed-api-acceptance.json`. Agent settings and the
completed task persisted after reload with the native experiment disabled.
Independent downloads matched v1 (168 bytes, SHA256
`858f0438f048937dcd2e357a77f77e058582968215d33d5857637cd37fcfdb94`) and
v2 (222 bytes, SHA256
`4efd87a1f3a9d946d4278906bb779c4e3c0c83ec92faafdc29b9d6da28cada6d`);
v1 remained unchanged. [v1 download](http://127.0.0.1:3105/api/attachments/4fa30ccf-f6bd-47a5-83f3-564c1b16a138/content?download=1),
[v2 download](http://127.0.0.1:3105/api/attachments/af0f2c2e-a0f1-4138-980e-f93f5b48d2cf/content?download=1).
Installed daemon SHA256:
`36bbf4d878bfaa23e2fcec443e117cf04f46006ff8815c64855491b7bd3e440f`;
sidecar SHA256:
`ca6cad1f9b2fb2822d940d281a383360076c2ac03ea2ac875e64662f4719ae13`.
This source predates subsequent review fixes; final package qualification and
subscription follow-up are not claimed.

Latest behavior corrections preserve plain environment model bindings, reject
unresolved default/model-routing bindings, retain native translation when an
import explicitly switches to Legacy, and clear every effort alias on an
incompatible model change. Selection/import/form controls: 271 passed; server
noemit and token gates passed. Current historical instruction admission: 6
passed. Platform `33077bed73` pins producer Node to the image's 24.21.0 version;
its narrow policy exception and workflow controls passed (71 tests).

[Four-target campaign](https://github.com/paperclipai/paperclip/actions/runs/38293566808)
and [cloud image build](https://github.com/paperclipai/paperclip/actions/runs/38293576503)
retain source `557c3064a30779e86e1ae312eab3d1d42c3a8b8d`. Actual pack/image
identity agreement remains required. Additional Claude defaults remain gated
pending clean-install and execution evidence. No local Docker or Rust build.

## Four-target packages and SSH launch repair — 2026-10-12

The frozen `557c3064a30779e86e1ae312eab3d1d42c3a8b8d` four-target
campaign above completed successfully, including all daemon producers, Linux
x64 public installation, both Mac consumers, and the native Linux ARM64
consumer. Consumer reports record clean npm installation and zero provider
calls. The raw packaging manifest's `publicInstallationVerified: false`
precedes those consumer checks; it is not rewritten as execution evidence.

The cloud image campaign succeeded with immutable image
`ghcr.io/paperclipai/paperclip-daytona-runner@sha256:d9dbda3a9435e3e555f431bdeb0ba22e1241ae9103184e6c1646a200e26423e1`.
Independent native/image Linux x64 manifest comparison matched pack
`sha256:97f44524d1b35ed6295c922f6b52ac376960213be0a0e09a3635c281db26aecf`,
Node `sha256:7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c`,
and distribution `sha256:83aafb7d6c951c1fa31c0d8bbbfd32c39b4d265b01607cd566c55c8d9b4a6143`.
The installed ARM pack is
`sha256:51fe734d79211b474ee13f53080ac60f07cdc9315ebd33b703ecf4a7dc0f8ce1`.
The new existing-consumer Claude SDK admission hook passed 22 controls and a
real installed Mac no-prompt probe. The earlier frozen campaign predates this
hook; its Intel report does not certify that new hook ran.

The isolated preview now uses the real 557 public package with two recorded
controller overlays: the narrow existing Claude ARM setup allowlist and the
shared SSH argument repair. Normal installed daemon/package resolution stays
in use. The source is not misrepresented as an unmodified installed package.
The user-directed remaining acceptance uses the API key in `~/.secrets`;
subscription follow-up remains unverified.

ARM attempts `5ec7bc81-8023-4b5c-84c0-1886224ac4fa` and
`ebb8a76b-60d8-4881-a6ad-e60b6604ca9c` failed before provider startup.
The first lacked a remote WSS ingress URL. Qualification now uses the existing
explicit direct-WSS transport through a private TLS relay and authenticated SSH
reverse forwarding; both endpoints bind loopback, certificate validation stays
on, and protocol authentication is unchanged. The second exposed the first
causal launch error, `sh: 7: 1: parameter not set`: the shared SSH wrapper had
flattened `sh -c`, dropping positional arguments. Failed records and unknown
accounting holds remain intact; neither failure is reported as a successful
provider turn or zero-cost accounting completion.

Protocol `b833c609cf2da1aacb6ab29d062e23bb1865624c` preserves argv, applies
environment assignments after `exec`, and validates environment names.
Six regression controls fail before and pass after; 51 shared/Codex controls
and adapter-utils typecheck pass. The authorized cloud host passed both
execFile and stdin/spawn paths with exact literal quoted arguments and zero
provider calls. Private proof: `/private/tmp/claude-ssh-no-provider-proof.json`;
installed overlay: `/private/tmp/claude-installed-557-ssh-overlay.json`.
Module SHA256 changed from
`0b89740ef859923d3bb9cdddc09a836eab8ff9296b986eaee68700f766ea5bae` to
`a7f3ec5effa48d05a8388d77d130449dba52f3693afd8bed04c16378a7c764ae`.

The stack incorporates latest Codex composed source
`d3916151f65ca08904bda309474a35e4c48c54fe`. The authorized source-chat owner
will lift the identical shared SSH fix into prerequisite
[PR #16028](https://github.com/paperclipai/paperclip/pull/16028) before Codex;
our retained commit will coalesce on later reconciliation. That owner coordinates
normal squash merge order. No dependent PR or production deployment is performed
by this qualification session.

The failed fresh ARM fixture now retains its complete $1 unknown reservation
under a reduced $1 cap and remains held. A new repaired ARM fixture has a $3
cap; original $17, candidate $9, and local acceptance $16 caps remain.
Aggregate allocated cap is $46, reserving $4 for Linux x64, within the separate
$50 ceiling. Timer heartbeats and automatic paid retries remain disabled.
Known estimates remain $1.331719, excluding unknown charges.

[Required cloud source checks](https://github.com/paperclipai/paperclip/actions/runs/38302321706)
passed authorization and await a build worker. Current-source full checks,
latest reviews, useful remote task/follow-up pairs, additional platform defaults,
and final package qualification remain gates. No local Docker or Rust build.

## SSH cold-controller acceptance — 2026-10-12

The first repaired SSH task `9a6c3417-b961-47fb-bd25-06847d82e2e6`
succeeded with a checked file, admitted high effort, and completed API accounting
($0.195194600 estimate). Its follow-up failed before provider startup with
`prior_owner_terminal_state_indeterminate`; accounting completed without a
pending charge. The successful remote turn had already persisted a suspended
verified backup, but two controller migration callers allowed that backup only
for sandbox transport. The existing quarantine and task records remain intact.

Shared repair `e833e1d6c1cac6017f4effb59fbe0d22f0a9fcf2` allows selected
SSH remote targets to use the same integrity/full-scope/suspended-owner checks.
Two positive SSH regression cases fail before the repair; all 14 sandbox/SSH
backup scenarios pass after, including corrupt, conflicting and active state
rejection. Additional active-owner/full-scope controls bring focused coverage to
16 passing tests. Server typecheck passes. The source owner lifted both shared
repairs into prerequisite `00ac509b0a85336e4948a325dbde1cbf09378572`, composed
Codex `8de43be4cd7e71e7833ea268d9e6e59e77cde381`; our stack coalesces them.

A fresh bounded [ARM task and revision](http://127.0.0.1:3105/CLAAAAAA/issues/CLAAAAAA-1)
now passed. Runs `3c297604-23b4-4a42-a0af-185af05aad01` and
`09bae36d-32a5-4634-a0b8-0349cf405dc9` succeeded with Opus 5.5,
requested/admitted high effort, metered Anthropic API billing and completed
accounting: estimates $0.219495400 and $0.186328600. The controller boot changed;
task, provider and backend session identities matched privately. Both exact
oracles passed independent downloads after the revision; v1 stayed unchanged.

- [v1](http://127.0.0.1:3105/api/attachments/e94f7320-1197-4a4a-b27e-4447a9ecc58c/content?download=1):
  166 bytes, SHA256 `6263758fb2009dd6b70df03b1c3aa314a865ba1b2b81d5bda5cc6c079a17b7ab`.
- [v2](http://127.0.0.1:3105/api/attachments/a536415a-91c3-4e7f-8b45-46b09d5520bb/content?download=1):
  220 bytes, SHA256 `b7229581fb2b566485a023ed6b016e556e6bc66f3ab4d1bcf7b81c6abf61f9f4`.
- [Sanitized report](http://127.0.0.1:3105/api/attachments/5db4c71b-cb01-4a91-972d-49bcec527d7f/content?download=1)
  and [screenshot](http://127.0.0.1:3105/api/attachments/998dac47-837f-46a9-b821-a77499809031/content?download=1)
  are attached artifact work products. Uploading them left the run count at two.

This proof uses public package source 557 with the recorded setup/argv/cold-resume
controller overlays and the verified standard installed ARM pack. It is not an
unmodified-final-package claim. The cold-resume compiled module changed from
`205e27e8a0dda494585600d87b98545d5601822e5bd77c79505101419719a1b7` to
`1c75aa00142f5657a416debba44717548ad5106a763821ed1f8cb0309167ab71`.

The prior successful-but-failed-resume fixture is paused with a conservative $1
allocation; the fresh ARM pair uses $2. Original $17/$9/$16 allocations and the
failed prelaunch ARM fixture's $1 unknown reservation remain. The Linux x64
fixture has $4, making aggregate allocated caps $50. No automatic paid retries
or timer heartbeats are enabled; remaining acceptance uses API keys per the user.

## Linux x64 task and cold-controller revision — 2026-10-12

The [Linux x64 acceptance task](http://127.0.0.1:3105/CLAAAAAAA/issues/CLAAAAAAA-1)
and follow-up succeeded on the immutable 557 cloud image through the existing
Daytona integration. Runs `ba8ff6f0-d88d-4369-b03e-a88cf2a3dafa` and
`f9675055-6f9f-4ec2-aa7c-31b3a784dffc` used Opus 5.5, acknowledged high
effort and the fixture's selected API-key connection. Accounting completed:
estimates $0.178204600 and $0.135639200. The controller restarted between
turns; private task/provider/backend session IDs matched. Both versions passed
independent exact byte/hash checks after the revision and persisted after reload.

- [v1](http://127.0.0.1:3105/api/attachments/b7ebc13d-a09f-414f-84fc-a36d0dac9975/content?download=1):
  176 bytes, SHA256 `97d7ddbea0d3d1a1aad23673692ff3719fc83d8b8e7c66da4fc1f70af79d9672`.
- [v2](http://127.0.0.1:3105/api/attachments/e238108d-3a61-42c7-a305-b2199b97a291/content?download=1):
  230 bytes, SHA256 `426e41d0c76b037322aec212c60ece80d91b05ca9064aaab17a7e7950dc9416f`.
- [Sanitized report](http://127.0.0.1:3105/api/attachments/9f619e2f-6bca-4059-9a35-7e1651863395/content?download=1)
  and [screenshot](http://127.0.0.1:3105/api/attachments/3eb53a63-f8fc-483e-8b53-18439b87185b/content?download=1)
  are attached work products.

The pinned official Daytona package `2026.1005.0` (manifest version `0.1.8`,
SDK `0.203.0`) is registered from the private qualification installation.
The first existing installer request used its shared package directory and
failed to resolve a version-suffixed package name; no global plugin record was
adopted for this fixture. Shared package files were left intact. Subsequent
installation disabled lifecycle scripts and uses the private directory.
Company-scoped Daytona and Anthropic secrets remain separate, with Anthropic
connection installation restricted to the qualification agent.

This proof uses the exact 557 installed controller plus its recorded overlays
and image/pack identities; it does not qualify an unmodified final release.
Known Claude API estimates now total $2.2465808, excluding earlier unknown
charges. Aggregate allocated company caps remain $50; holds/reservations and
failed records are preserved. No automatic paid retries or local Docker/Rust
builds occurred.

The source owner is correcting additional shared review findings and will
provide the next source freeze. Final packaging waits for that freeze. The
platform PR can now apply the additional target default changes using the
passing package/clean-install and API execution evidence, while final packaged
runtime, current-source required checks and exact-head reviews remain handoff
gates. Subscription follow-up remains unverified under the user's API-key
steering; Intel Mac requires clean installation, not attended provider turns.


## Current dependency and review reconciliation — 2026-10-12

Reconciled source-owner prerequisite `d16eccf109b524778ceb896f79ccb3881bc61a9b`
and Codex `eee0534154eaf5d0d3f2bbc97c1e24d86f34a5a5`. The latest Codex
Linux ARM64 default remains intact. Sandbox automatic selection uses the
server-owned probe bound to effective configuration and an immutable image;
unknown or mutable sandbox identity stays Legacy. Disabled Codex does not block
Claude's SSH platform probe.

The behavior composition preserves the shared ACP-alias rejection and imports
saved native configuration by applying actual form changes. Explicit empty
model/effort and account-binding removal remain removals. Mounted Codex and
Claude import cases cover ordinary edits, model/effort clears, connection-binding
removal, Legacy selection and harness changes. Switching a Legacy Claude import
to Paperclip preserves deny-all/approve-reads through the native builder.
Current import/builder controls: 123 passed; mounted existing-agent form controls:
121 passed, including hydration and explicit Auto clearing for both harnesses
and all three effort aliases. Server/UI noemit, token gates and capability-map
checks passed. Profile source controls: 31 passed. The Pi install probe now
reports the exact profile version it actually validates.

Platform review repairs retain explicit supported runner choices while keeping
Darwin SSH automatic Claude selection on Legacy until automatic Mac remote packs
exist. Local Mac defaults and GNU/Linux defaults remain qualified. Discovery
tries every standard preinstalled pack candidate through the full verifier; a
stale `/opt` pack cannot hide a matching user installation. Failed verification
still uses the existing upload/error path. These controls are separate from live
provider execution evidence.

[Cloud required-source campaign](https://github.com/paperclipai/paperclip/actions/runs/38302321706)
completed on immutable source `b754869376e7bee831e87d879d5d89575044cb04`:
recursive typecheck, build, token gates, Runner E2E typecheck, 124 Runner E2E
unit files (2619 tests), and public installation verification passed. The full
`pnpm test:run` command exceeded its 60-minute bound (exit 124); this is incomplete,
not a passing full suite. Its artifact `11775656103` preserves source, logs and
statuses. Final exact-head checks must use the existing complete sharded test
coverage or finish the full command on cloud infrastructure.

A read-only accounting audit records allocated caps of exactly $50 and known
ledger estimates of $2.246580800, excluding unknown charges. The original QA
policy retains its earlier approved `allow` setting and $8 unknown reservation
under a hard stop; other live qualification policies block unpriced work. The
historical candidate's $9 allocation and failed records remain reserved. Its
port has a listener but current API health did not respond, so its current policy
state is unconfirmed rather than asserted stopped or reverified. No accounting
hold was cleared by this audit. Timer heartbeats and automatic paid retries remain
disabled. No local Docker or Rust builds occurred.


## Complete CI fixture corrections — 2026-10-12

The first current-head matrix exposed stale fixture assumptions after graduation:
experimental harness-switch rejection still targeted Claude, Linux SSH creation
still expected Legacy, and Legacy instruction/skill cases relied on an implicit
runner. The gating case now uses Pi; all 56 validation-route controls pass.
Qualified SSH creation asserts native Claude/Opus 5.5; all 92 permission-route
controls pass. Legacy instruction/skill fixtures explicitly choose Legacy.
The native Claude creation/hire matrix now checks preserved skill-version pins
and CEO defaults, while omitting the legacy operational skill supplied by PRP.
All 111 skills-route controls pass. Builder/config controls retain the shared
package and mounted-form evidence rather than a duplicate UI pure-function test
that expected blank effort to restore saved values. The historical missing-form
fixture now deletes the property instead of assigning an invalid typed undefined;
Codex package noemit passes. These corrections make no provider calls and change
no runtime artifact identities.


## Final shared source freeze and corrective matrix — 2026-10-12

Composed published prerequisite `5a9ce11c49db31440863d633426ebe30bcc850ca`
and Codex `a583630e1c128c6d577b236b7ea9b73cf1be0bdd` without changing
Codex Linux ARM64 selection. The inherited network-admission guard rejects an
effective ACP no-network setting or a deferred policy reference with explicit
Legacy guidance; existing trusted native policy remains separate. The source
owner retains normal merge ownership and will send the actual master merge
identity before final reconciliation.

Fresh reviews reached 5/5 with no open findings for protocol `66f20c4682`,
behavior `628754f6dc` and platform `0a8677d15c`. The subsequent corrective
composition includes reviewed shared changes and the test-fixture corrections;
its exact-head review/CI remains required. Packaging/assembly controls now pass
91/91 after the inert target JSON copy fix. Composed platform selection, pack,
import and mounted-form controls pass 341/341; server noemit, maps and token gates
pass. Native declarations match the release manifest without regeneration.

Database-backed lifecycle, connection-pool and controlled catalog cases pass
121/121 on the behavior branch. Qualified platform onboarding/built-in/catalog
fixtures now assert native Claude directly, including preserved Haiku and role
skills. Their local database initialization hit hook timeouts; the existing fresh
cluster fallback skipped those suites. Neither result is an execution pass, and
full cloud execution must validate them. Custom ACP Stop/recovery browser fixtures
explicitly select Legacy for their custom commands/state paths; latest cloud
browser execution remains required. No provider turns or local native/Docker
builds were added by these corrections.


## Lifetime ownership and resolved Legacy limit — 2026-10-12

The fresh protocol review identified a real ownership violation: sandbox
preparation rewrote active Claude settings before a contender acquired the
provider lifetime lease. A fake-provider/real-lease regression reproduced losing
the active owner's saved high effort and marker when the second opener was
rejected. Repair `4cdb5ec4b38d792b432993a9a4b722090813a8ef` defers the
Claude settings write until after lifetime ownership is acquired and before
provider launch. Cancellation retains the lease until that filesystem write
settles. A later legitimate owner can initialize normally. Host, sandbox and
profile controls pass 104/104; runner noemit and unchanged declaration generation
pass. No provider process was launched by these controls.

Fresh behavior review also found the Legacy form's default 1000-turn cap was
omitted for Auto even when the selected target resolved to Legacy. The form now
passes a transient resolution to the builder; unknown/Legacy Auto and explicit
Legacy retain the cap, while resolved native omits only that Legacy default.
Explicit custom limits still reach compatibility validation. The hint is absent
from execution config and API overrides. Onboarding uses its existing discovery;
import excludes hint-only updates from meaningful edits. The same builder carries
explicit native permission choices from the ordinary create form. Mounted forms,
builder, imports and onboarding pass 298/298; adapter-utils TS build, Claude/UI
noemit, maps and token gates pass. No local Rust or Docker build or new paid turn.

The prior corrective platform source `a97a681f1caf90627505097cdcd368356811ffc1`
passed all required cloud checks and fresh 5/5 review. Behavior and protocol
required CI aggregates passed before these two findings. New repair heads require
fresh exact-head CI/review. Prerequisite #16028 is not merged: normal auto-merge
is queued for actual code-owner approval. Dependent branches have not been
retargeted as if master contains that prerequisite. Final packaged runtime and
source reconciliation remain gated; the source owner retains merge ownership.

## Guided setup and source-attestation correction — 2026-10-12

Fresh review reproduced another ordinary creation gap: `NewAgentSetup` supplied
Auto without its discovered runner, causing native Claude to receive Legacy's
1000-turn default and fail compatibility validation. Repair `e2e5c60496` passes
the existing environment-scoped discovery into the transient builder hint. All
63 mounted setup controls pass, including native, Legacy and unknown Auto with
the native experimental flag disabled. UI noemit, maps and token gates pass.
The hint is absent from saved execution configuration and request runner overrides.

Exact-head cloud runner controls also caught the ownership repair's changed Pi
shared-source closure. Declaration generation alone had not checked that closure.
Protocol repair `0ff31b2b76` publishes Pi profile 24 with command digest
`sha256:d25d674cda9a0853bdbf0521025099f1424c573d2f533630cb67d90e1bfcda3b`.
Immutable profile 23 is retained. Only the profile version and sandbox-source
attestation change; executable closures, models, effort and platform qualification
remain intact. Copilot stays at pending profile 18. TypeScript/Rust declarations,
current installed-Pi probe and historical rejection controls are synchronized.
Profile/factory controls pass 122 with one historical skip; runner noemit passes.

Host/sandbox controls pass 78/78 on restored, uninstrumented source. Earlier local
expanded runs had one varying kernel-lease acquisition failure each; their logs
are retained, not relabeled as passes. This Mac's listener inventory contained
718 TCP rows. A temporary diagnostic group passed 78/78 and was fully reverted;
occupied-port contention is suspected but not independently proven. Sandboxed
loopback execution additionally failed and is excluded from valid lease proof.
Fresh cloud execution remains required to distinguish infrastructure contention
from a regression. Production ownership checks were not weakened and unrelated
listeners were not stopped. No local native/Docker build or paid provider turn.

Current platform Darwin SSH guard keeps Auto on Legacy for both architectures;
explicit matching assets and saved native choices remain supported. Both focused
x64/arm64 controls pass. The general review comment cites historical `bfa3a966`,
which predates this guard. Final package qualification will use one frozen
candidate source through the existing provider-free cloud workflow, with tooling
and product identities recorded separately. No publication, deployment or paid
retry is part of that campaign. The actual foundation code-owner approval and
master reconciliation remain external prerequisites for normal merge sequencing.

The first corrected candidate's cloud Docker-context check independently found
profile 24 excluded by the existing explicit attestation allowlist. The new
fixture now has its own exception alongside immutable prior identities; other
fixtures remain excluded. Cloud job 115053600515 retained the exact ENOENT
failure. No local Docker invocation was used. The next composed heads must pass
this check before candidate package qualification.

## Completed-discovery onboarding guard — 2026-10-12

Fresh behavior review reproduced a separate onboarding race: saved-subscription
verification could start while runner discovery was pending, building an
unresolved Auto configuration with Legacy's 1000-turn cap. Both delayed native
and Legacy cases fail before treatment. Onboarding now enables discovery after
its environment/settings/policy queries succeed and gates manual, keyboard,
saved-account and completed-login advancement on the matching completed result.
The builder receives that resolved value. Target or runner changes invalidate
an in-flight attempt; metadata-only environment refreshes preserve it. Discovery
failure or a missing harness result stops setup and offers an explicit availability
retry, without testing or hiring. No connection/authentication mechanism changed.

All 173 mounted onboarding/guided-setup/builder controls pass, including keyboard
submission while discovery is pending, both native and Legacy results, failed
availability/retry and obsolete-target verification rejection. UI noemit, token
and map checks pass. Earlier subscription/account/login controls remain intact;
the prior environment-refresh fixture now changes metadata rather than changing
its target ID, and a separate two-target control proves actual invalidation.

Protocol source `3aaf1f8b1e1e525378f0f2330fd5453a3ac1c252` has 53 successful
current-head cloud checks, including Rust, static checks, both runner unit shards
and Docker-context integrity, with fresh 5/5 review. Earlier local varying lease
failures remain recorded. Behavior/platform need fresh gates after this UI guard;
no final candidate package campaign has been dispatched and no paid turn added.
The retained installed preview has been inspected in light/dark mode with the
original theme restored and agent Save disabled. The browser's requested mobile
override did not affect its actual 1150-pixel viewport, so that attempt is not
mobile proof and its override was reset. Final responsive qualification remains.

## Warm metadata, dependency recovery and owned startup — 2026-10-12

Three warm-cache regressions reproduced configuration construction while required
metadata was unresolved. Onboarding now waits for current environment, settings
and policy reads as well as matching runner discovery, including refetch over
cached successful data. Each prerequisite failure is visible and Retry setup
refetches the required reads without testing or hiring early. This also closes
fresh review 4253377849. The neutral-role step fixture's empty discovery response
reproduced the exact cloud failure; it now supplies valid Legacy discovery while
retaining role/name assertions. All 193 wizard/step/guided-setup/builder controls,
UI noemit, maps and token gates pass. Exploratory guided-connection changes were
removed; its existing connection flow remains intact.

Cloud platform job 115058187599 exposed ENOTEMPTY during late-bootstrap cleanup.
A deterministic held-writer test proves transport close returned before owned
credential preparation settled. A separate production-probe test proves the
helper called cleanup-confirmed during that unconfirmed preparation. These are
actual ownership defects, not a waived filesystem retry. Protocol repair
`463ebb62661d81ef1fbd79ae0a7b43ece68830f8` tracks startup, joins it within the
existing close budget and blocks later activation/launch. A drain timeout retains
state; late registration retires only its owned route. Primary setup timeout and
unconfirmed cleanup both remain in the failure. Six no-provider controls pass,
including writer drain, bounded retention, late release/error and the actual
probe callback fence. Runner noemit, declaration generation and maps pass; no
provider process, local Rust or Docker build was used. Historical Pi/Copilot
identities are unchanged by this transport-only correction.

The repair is in this chat's protocol worktree, not the frozen upstream #16028.
Its placement must be reconciled with the source owner's normal merge sequence
before either default rollout merges. Automatic approval review rejected cross-
chat status messages because it did not accept the earlier approval retrieved
from the source chat as current-chat authorization; the direct coordination
question remains pending. Public PR/evidence updates continue within this task.
Fresh exact-head cloud runner/native execution is required, including the failing
late-bootstrap case. No package campaign or new paid task has been dispatched.

## Current cloud ownership proof and durable test envelope — 2026-10-12

Behavior `be0e68872fd5e043bc6242e0634471b2c1794336` passed all 54 current
checks plus two conditional skips, required verify/E2E and fresh 5/5 review.
Protocol `463ebb62661d81ef1fbd79ae0a7b43ece68830f8` and platform
`66925e79c9d9e8f7e51fd9ee5a518a778d34acf8` passed the previously failing
real late-bootstrap case and the new ownership controls. Their remaining runner
lane failure was a different fake-transport durable-resume case: it reached the
outer 5000 ms test timeout (1599 passed, one failed, three skipped). There was no
ENOTEMPTY or primary semantic assertion failure in those runs. The exact cloud
latency stage was not recorded and is not labeled an infrastructure flake.

That fixture deliberately includes a 500 ms killed turn, a resumed turn with its
own 5000 ms bound, and durable filesystem writes. A controlled 3800 ms resumed-
turn delay (within the existing turn bound) reproduces the outer 5000 ms timeout;
the identical treatment completes its semantic/usage/deduplication assertions
with a 15000 ms outer budget. The temporary delay was removed. Only the outer
fixture deadline and its rationale are committed; internal deadlines and all
assertions remain unchanged. The full fake-transport suite passes 72 with one
existing skip; runner noemit and maps pass. Fresh exact-head runner CI remains
required after this test-only correction. No package campaign, paid provider
call, local native build, Docker build or upstream prerequisite edit.

## Guided creation with refreshed settings — 2026-10-12

Review 4253594222 on behavior head `4440df2e44e346080308e40ec3287c94c7f776a2`
identified stale cached environment selection during a background instance-settings
read. The mounted reproduction actually calls setup against cached SSH/Legacy
before the pending current settings select local/native, rather than merely
observing a loading label. Guided Claude/Codex setup now requires current completed
environment, settings, execution policy, experimental policy and matching Auto
runner discovery reads before testing or hiring. Existing connection controls stay
mounted inside a disabled fieldset while refreshing, preserving an API-key draft.
Both the cached SSH-to-local case and same-environment discovery refresh pass;
all 65 guided setup controls, UI noemit, token gates and structural maps pass.
Logs: `/private/tmp/claude-guided-current-settings-before.log`,
`/private/tmp/claude-guided-current-settings-draft-controls.log`, and
`/private/tmp/claude-guided-current-settings-final-{types,tokens,maps}.log`.
This repair is prepared locally while the source owner integrates the common
transport correction; published behavior head remains the literal 4440 revision.
No paid turns, local native builds or Docker builds were performed.

Platform head `173a73ec95386d7b9eac50d87699a16ec27da3b3` failed a credential
fixture during its two-port reservation (EADDRINUSE before the production staging
call). The existing bounded three-port fixture reservation helper is extended to
hold two candidates, retrying fixture preparation only and never a production
staging call. A foreign-collision control verifies that foreign ownership survives,
the auth sentinel stays unchanged, and preparation stops within eight attempts.
All 42 credential controls and runner noemit pass locally after supplying the
worktree's declared tsx test loader. Logs:
`/private/tmp/claude-quorum-fixture-complete-controls.log` and
`/private/tmp/claude-quorum-fixture-final-types.log`. This test-only correction
is prepared in the protocol worktree and has not been published during the parent
integration hold. The independent serialized issue-route timeout remains under
phase diagnosis; a subsequent full mocked suite passes 36 controls but does not
waive the cloud failure or prove its latency cause. Final source composition,
required CI and the provider-free cloud packaging campaign remain pending.

## Serialized route fixture initialization — 2026-10-12

The failing inherited-pause cloud case timed out at its 15000 ms outer test bound.
Temporary local phase instrumentation measured cold route imports at 9741 ms
(and 11920 ms in a separate diagnostic attempt), followed by a POST 409 response
in 11 ms and PATCH 409 in 4 ms. The subsequent full mocked suite passed 36 cases;
these measurements do not establish the exact unrecorded cloud latency. Route
module loading now runs in beforeEach after the same per-case module reset,
unmocking and mock initialization. It uses the existing 30000 ms setup-hook bound;
the 15000 ms request/test bound, application construction, policy assertions and
mutation/wakeup checks are unchanged. All 36 treatment controls pass. Temporary
phase instrumentation was removed. Evidence:
`/private/tmp/claude-pause-route-phases.txt`,
`/private/tmp/claude-pause-route-targeted-phases.log`, and
`/private/tmp/claude-pause-route-hook-controls.log`. Exact-head cloud verification
is still required; no timeout is waived and no provider or native build was run.

## Mobile retained-preview inspection — 2026-10-12

The in-app browser's viewport override did not apply, including to a fresh tab,
so it supplies no mobile acceptance evidence. The existing Product E2E
`openConnectionBrowser` helper then opened a private temporary Chromium profile
against the retained preview. At an actual 390×844 viewport, light and dark
runner menus fit within the document's 390 px scroll width. Enter opens the
Runner listbox with native/Legacy choices; Escape preserves the saved native
choice. Screenshots fast-forward CSS color transitions. Mutation requests were
blocked by the test browser (none attempted); no provider prompts or setup probes
were sent. This is a bounded UI inspection, not a catalog workflow grade.

Evidence remains tied to compiled source
`557c3064a30779e86e1ae312eab3d1d42c3a8b8d` with the recorded controller
overlays, and must be repeated against final installed packages. The older
preview's Linux Legacy default label is not evidence for the later platform Auto
change. Report, light screenshot and dark screenshot are attached to the completed
isolated x64 task as work products, with independently downloaded SHA-256 matches.
The task stays done and the agent stays idle. The Product E2E helper's local source
is `42e5d9bae436254bba6747e7d26be0cce13b3d0c`.
Report attachment: `e6206748-a785-4c02-9bbf-f4db8a3b22f9`, work product
`e7f6a023-e754-424b-bdc5-eb4087a79172`; light attachment
`7c324aa1-d1c0-45cd-b314-c3106cac302d`, work product
`e81b6b06-e64d-4ed5-aca7-c936a5235c81`; dark attachment
`2815f32b-86d5-48ed-a0f4-7e35554e54ca`, work product
`6fb9753e-19e0-496f-bf0a-f2de4d331895`.
Local receipts: `/private/tmp/claude-responsive-preview-evidence.json`,
`/private/tmp/claude-responsive-evidence-upload.json`, and
`/private/tmp/claude-responsive-evidence-independent-check.json`.

## Canonical composition and current contribution rules — 2026-10-12

The source owner committed the stronger shared startup repair as
`ce23716503a2c9158b5a7ab74ab61571ff4ee7a3`. Local additive merges preserve
that parent and this chat's Claude effort/resume changes. Eight controls that do
not need native executables and runner noemit pass in the combined protocol.
The ninth selected readiness-cycle case timed out while waiting for readiness;
read-only resolution confirms both the default runner artifact and fake provider
fixture are absent, with no private runner override. That native case remains a
hosted CI gate, not a pass. No local native build was performed. Logs:
`/private/tmp/claude-canonical-startup-composition-controls.log`,
`/private/tmp/claude-canonical-startup-no-process-controls.log`, and
`/private/tmp/claude-canonical-startup-composition-types.log`.

The source owner then reconciled current master in `9f59ff36cf`, adding the
Storybook catalog and contribution rules against new code comments and code files
crossing 1000 lines. The guided-creation fixture is extracted to
`ui/src/pages/NewAgent.test-support.tsx`; all 65 cases remain and pass, with UI
noemit and token gates passing. Fixture component rendering stays inside its
mock-owning module, including the saved-confirmation reload case. The active test
file no longer crosses the threshold. Our added explanatory comments are removed;
the source owner handles the common transport's comment cleanup. Semantic code
and internal deadlines stay unchanged.

Removing this chat's added sandbox comments changes its raw source attestation to
`144d62b3415cfedf272b5b052e14af1e41fe50a644af84247fc9c20c7ef7edde`.
Immutable Pi profiles 23 and 24 remain retained. New Pi profile 25 binds only that
source revision plus its profile version, digest
`sha256:dd67387487dadb08da76534c057dc0aa059f7698d1779cbd5fc452813828167a`.
SDK/executable closures, platforms, model/effort contract and other providers'
qualification boundaries do not change. Copilot remains pending profile 18.
Generated TS/Rust descriptors, Rust current/prior fixtures, Docker context and
current documentation are synchronized. All 119 profile/factory/admission/effort
controls pass with one existing historical skip, including corrupt-byte rejection
before spawn/bridge; runner noemit and generation checks pass. The first restricted
attempt stopped at loopback lease admission and is retained, not counted as byte
validation. Native/Rust execution and final package qualification remain cloud gates.

The maintain-storybook source review found concrete fixture incompatibilities:
the general-settings endpoint and scoped runner-discovery defaults were absent.
The shared preview now returns that settings contract and explicitly simulated
Legacy discovery for Claude/Codex, exposes the loaded native adapter, and includes
Opus 5.5 while retaining explicit older-model examples. These fixture defaults are
not rollout qualification. Catalog fingerprints/classification and affected story
rendering must be reconciled after the final parent is frozen; source-only review
is not an executed Storybook or provider pass. Published draft heads remain fixed
while the source owner finishes the canonical contribution/catalog cleanup.

## Published canonical parent and later master blocker — 2026-10-12

The canonical prerequisite is published as
`64c074fb8da1b31f8d6042c4fef48dc4164e759b`; all 54 exact-head checks pass
with four conditional skips, fresh 5/5 and all review threads resolved. Its hosted
native transport suite passes 246/246, closing the fake-native-fixture limitation
for that literal source. Its four provider-free producers also pass, while clean
consumers remain in progress. Those checks are not relabeled as this chat's Claude
input/profile composition. Root retains sequential normal merge/staging ownership;
code-owner approval is still required and production is not promoted.

Local composition preserves the source repair with no duplicate lifecycle delta:
the transport diff against 64 contains only Claude effort additions. The old Codex
base branch `1a0ca66242121e39d88455aa2b52a07acc4a07d9` still lacks the current-
master parent, so publishing the current protocol would expose 468 upstream files.
The root-owned dependency must be reconciled before the review slices can again
be verified under the 100-file limit. Cross-chat dispatch still needs direct
human authorization in this chat; a concrete dependency-coordination question is
pending. No frozen root branch was mutated.

Master then advanced to task-workspace source
`f329b24ee12496e710ad17377ec7716e0eee22ef`, making the canonical prerequisite
conflicted. The source owner is reconciling its three conflicts and requested that
leaf CI/package campaigns wait for the next published parent. All local Claude
changes and earlier package/task evidence are preserved, and no new paid turn,
local Rust/Docker build or leaf package campaign is dispatched during that hold.

The current Storybook catalog is reconciled with 224 story files and all 2,223
pre-move IDs preserved. Fifty-three source-affected entries retain their prior
review classifications. Six bounded fixture plays and reset pass; exact cases,
source scope, simulated boundaries and omitted coverage are recorded in
`maps/storybook-map/REVIEW.md`. This does not qualify the final installed runtime.

## Task-workspace composition and qualification hold — 2026-10-12

The source owner published canonical prerequisite
`16a53254c495f3e49a28cc911f5dcd60c41779fc` against task-workspace master
`f329b24ee12496e710ad17377ec7716e0eee22ef`. This chat composed it through
additive merges, retaining the Claude settings and immutable profile changes:

| Review slice | Local code identity | Files against local dependency |
| --- | --- | --- |
| Protocol prerequisite, PR #15994 | `12113e431e37379901f2a39103816c8f2afec14a` | 678 against the older Codex branch; publication held |
| Claude behavior, PR #15993 | `cf1fa2e98285cf80d25b0681ab45761389b22a9d` | 88 |
| Platform qualification, PR #15997 | `4ba521823f8a92ba3fffcb5d6f578144466d848f` | 42 |

The existing published PR heads remain unchanged. The root-owned Codex branch
still needs the same current-master dependency before the protocol can meet its
review file limit. Canonical 16a's fresh CI has one failing runner test, which its
owner is investigating; earlier 64c074fb success is not carried forward as a
16a pass. The source owner's provider-free cloud qualification is separate from
the final Claude package campaign.

Current composition checks pass: 189 guided-creation/form controls, 18
task-workspace admission/runtime-context controls, 25 platform consumer controls,
and nine Storybook catalog controls. UI, server, runner and runner-surfaces noemit,
map checks, token gates and profile generation checks pass. The platform tests
retain both Claude corrupt-package admission and the root's bounded Intel install
diagnostics. No provider task, Docker build or Rust build ran for these checks.
Logs are `/private/tmp/claude-16a-creation-form-controls.log`,
`/private/tmp/claude-16a-workspace-context-controls.log`,
`/private/tmp/claude-16a-consumer-diagnostic-controls.log` and
`/private/tmp/claude-16a-catalog-controls.log`.

Server noemit initially found a stale plugin SDK declaration where `projectId`
was still non-nullable. The source type was already correct. Refreshing ignored
shared/SDK outputs with the installed TypeScript compiler restored server noemit;
no product code or lockfile changed. The default pnpm wrapper's restricted-network
fetch failure is retained in `/private/tmp/claude-16a-sdk-refresh.log`; signature
checks were not bypassed. The successful compiler receipts are
`/private/tmp/claude-16a-shared-refresh.log`,
`/private/tmp/claude-16a-sdk-direct-refresh.log` and
`/private/tmp/claude-16a-server-types-refreshed.log`.

The usable preview remains `http://127.0.0.1:3105` on recorded installed source
557c3064 with the previously declared controller overlays. Its successful API-key
task/revision pairs and downloaded artifacts remain valid for those literal
identities. They do not certify the current composition. Final gates remain a
frozen Codex dependency, fresh checks/review on all three published slices,
four-target cloud packages and clean consumers, and current installed-runtime
acceptance within the existing $50 ceiling. Unknown-charge holds remain intact.
Merging and production deployment remain separate actions.
