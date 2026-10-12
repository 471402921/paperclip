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
