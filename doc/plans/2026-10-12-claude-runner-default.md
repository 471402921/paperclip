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
2. Core settings propagation, all preservation paths, subscription acceptance.
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


## Platform candidate implementation

The isolated platform checkout is `/private/tmp/claude-runner-platform-pr` on
`codex/claude-runner-platforms`. It preserves behavior candidate `8d07b40907`.
The pinned Linux ARM64 Claude SDK 0.3.286 archive passed registry SHA512
integrity, ELF aarch64 inspection and an actual no-prompt version launch on
the authorized cloud ARM host. Its executable SHA256 is
`0292fa22ac2fd43e16be9d0e511ddd8347280d6e0ebaca744ef5b27e05d8d0f8`.
Native admission retains descriptor/no-follow, package and architecture checks.

Release producers now retain target-owned Linux x64 and ARM64 provider-pack
identities and relocatable archives separately from daemon receipts. Assembly
binds both target identities to its daemon source and vendors the manifests.
ARM inventories cannot claim additional Pi, Cursor or Copilot qualification.
Mac controllers probe the selected Claude remote target and select its packaged
identity without a development override. Installed SSH hosts use the standard
pack locations. Additional automatic defaults remain gated pending evidence.

Focused platform checks: pack integrity11, release workflow67, native remote
manifest/selection12, executable/profile/path86 passed (six platform skips).
The first new ARM selection test failed from shared durable fixture identity;
a unique workspace/session per case fixed the fixture. No product guard was
removed. Platform TypeScript build passed. Cloud package and actual Linux task
pairs remain required. Current behavior package campaign:
https://github.com/paperclipai/paperclip/actions/runs/38284813521 .

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

### Independent cloud pack comparison and explicit-asset compatibility

The cloud image build `38293576503` passed. Its immutable image is
`ghcr.io/paperclipai/paperclip-daytona-runner@sha256:d9dbda3a9435e3e555f431bdeb0ba22e1241ae9103184e6c1646a200e26423e1`.
The image manifest, copied from a stopped disposable container on the cloud
host, exactly matches the independently downloaded Linux x64 producer manifest:
pack digest `sha256:97f44524d1b35ed6295c922f6b52ac376960213be0a0e09a3635c281db26aecf`;
Node digest `sha256:7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c`;
provider-tree digest `sha256:83aafb7d6c951c1fa31c0d8bbbfd32c39b4d265b01607cd566c55c8d9b4a6143`.
Both bind source 557c3064a3. This is actual byte-identity proof, not task execution.

The independently downloaded ARM producer archive has storage SHA256
`7c219420b02149cdc3f44c6c5073bed40631d26c03d06f0b109a9ff36962c9c7`;
its pack digest is `sha256:51fe734d79211b474ee13f53080ac60f07cdc9315ebd33b703ecf4a7dc0f8ce1`.
Bounded extraction checked 7,244 members, all recorded artifact hashes and
absence of controller binaries. The shipped Claude admission probe passed on
the native cloud ARM host with zero provider turns and no credentials.
The prior installed pack remains available separately.

Latest platform review found the automatic Linux restriction also affected
explicit Mac SSH assets. The restriction now applies only when selecting a
bundled pack; explicit assets retain their existing manifest integrity checks.
Eight targeted controls passed, including both Mac architectures and unchanged
automatic Linux selection. Final broad source checks run in the cloud on
reconciled `06c4f5e5a0`: [campaign 38296110502](https://github.com/paperclipai/paperclip/actions/runs/38296110502).
The behavior head `2874232d25` received 5/5 after its three settings fixes.

Installed Mac proof is available as a Paperclip
[acceptance report](http://127.0.0.1:3105/api/attachments/61653e0a-3ae0-459c-b1d1-20b5d1db73d6/content?download=1)
and [screenshot](http://127.0.0.1:3105/api/attachments/bce37c56-3984-45b9-a995-b6a23cc9a85d/content?download=1),
with artifact work products on CLAA-2. The actual native SDK is the server's
nested 0.3.286 package, executable SHA256
`75e3016e9d2570767b08e43a7467d4817a4f149232c169ca295f2c95fef21433`;
the top-level Legacy SDK is a separate dependency and was not this runtime.
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
Known Claude API estimates now total $2.2465814, excluding earlier unknown
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
