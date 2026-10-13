# Initial Storybook review — 2026-10-12

Source baseline: `f0e12c851971a21f7aadf0835b016bfaf2067314`.
Scope: complete source inventory and initial classification, with targeted source
comparison and browser checks. This is not full state parity, full interaction
coverage, or production acceptance for all stories.

## Inventory and organization

There is one Storybook, already centralized under `ui/storybook/`. At the initial
baseline, its 223 story files were split between 176 files at the stories root and
47 nested files, with 51 top-level sidebar groups. The initial pass recorded
product meaning, provenance, and review status before changing that organization.
The follow-up organization pass below moves the files and sidebar together.

The downstream catalog gives each file a primary feature home and related stable
capability IDs. The generated index includes all 171 upstream capabilities across
35 feature areas. The existing Overview story now provides searchable feature
navigation into the actual built story index. The initial pass kept sidebar titles
stable; the follow-up uses explicit IDs to preserve links while changing titles.

| Dimension | Initial classification |
| --- | --- |
| Product alignment | 18 current subjects, 4 proposals, 5 historical suites, 8 mixed suites, 188 requiring deeper parity review |
| Rendered subject | 199 production, 8 prototype, 11 mixed, 5 guides |
| Data boundary | 217 fixture-based, 1 separate fixture server, 5 static guides |

A production subject can have unreviewed state parity. A current subject can still
have untested loading, error, permission, or backend behavior. The catalog's notes
and source references qualify these labels; none are a substitute for live proof.

## Corrections and retained history

- **Question dismissal and send:** the local interaction-above-composer harness
  kept a pending badge for dismissed questions and left the question open after
  a normal send. Production `TaskChatThread` excludes questions from
  `pendingReminderInputs` and dismisses the selected question on send. The harness
  now matches those rules. Added question-dismiss and confirmation-reopen cases;
  corrected the send case's stale editor selector. The story still does not prove
  persisted dismissal or history behavior.
- **Fast response helpers:** `empty`, `configured`, and `result` were exported
  fixtures which Storybook also treated as stories. Their IDs collided with
  `Empty`, `Configured`, and `Result`. Explicit exclusion removes the false exports
  while retaining the real stories and imported fixtures. Browser review also
  exposed a missing explicit `onConnectionChange` spy after the production view
  began calling it on mount; added that fixture callback.
- **Chat provenance:** the main chat wrapper combines production conversation/task
  pages with a local landing view. The separate first-created-agent chat-entry
  design is historical; current primary-agent examples are its replacement.
- **Historical designs retained:** GitHub chat, old agent onboarding, connect-model
  tiles, paused composer, and chat-entry remain available with their purpose and
  replacement references. Local proposals are labeled rather than deleted.
- **Prototype folder is not a verdict:** some files re-export production subjects;
  others implement local compositions. Static import traversal found no obvious
  orphan prototype TS/TSX module. This is not proof that each is still useful.
- **Contributor guidance:** replaced the old Overview's manual coverage claims,
  corrected the interaction-authoring skill's obsolete story path, and updated the
  prototype README's catalog source count to match the shipped five sources.

## Verification

Environment: local macOS, headless Chromium, built Storybook 10.6.0, fixture data.
The following nine `play` cases reached Storybook's `storyFinished: success` event
without a browser page exception. These results establish story interactions only.

| Story ID | Subject / assertion |
| --- | --- |
| `composer-interaction-above-composer--ask-user-questions-and-send` | Production card/composer in local harness; normal send dismisses question without a pending badge |
| `composer-interaction-above-composer--dismiss-question-without-pending-badge` | Production card/composer; dismiss leaves editable composer without pending badge |
| `composer-interaction-above-composer--dismiss-confirmation-keeps-pending-badge` | Production card/composer; dismiss retains confirmation badge and reopening works |
| `composer-new-task--empty` | Production composer wrapper; existing play assertions |
| `design-explorations-agent-chat-sidebar-components--add-and-reopen-chat` | Production sidebar; fixture add/reopen assertions |
| `assistant-connections-consent--choose-organization` | Production consent surface; fixture organization selection assertions |
| `historical-github-chat-prototypes--standard-trust-warning` | Historical prototype; existing trust-warning assertions, not current GitHub acceptance |
| `design-previews-recovery-notice--retry-request-failed` | Production recovery notice; fixture failure-state assertions |
| `composer-mobile-assignee-picker--picker-open` | Production picker; existing open-picker assertions |

Additional manual browser checks passed: search the guide for `steering/queue`,
follow its link to the real queued-message story, dismiss a question, then reload
and verify that the fixture resets to an open question. Screenshots were inspected
locally and are not committed as new regression baselines.

Built-index comparison: all 2,208 prior story IDs remain; only the two new dismissal
regressions were added (2,210 total). Catalog validation, eight checker tests,
feature-map validation, both skill validators, token gates, workspace typecheck,
and workspace build passed. Fast-response settings `empty`, `configured`, and
`result` subsequently reached `storyFinished: success` with no page exceptions
following the explicit callback fix. These three cases are render checks, not save
or backend-persistence tests. The UI Vitest project passed all 8,176 tests in 728
files. The full `pnpm test:run` reported a 15-second timeout in the unchanged backend
case `connects advertised Workspace gmail.read without mutating definitions in
authenticated`. That exact case passed standalone without changing expectations
or timeouts. The remaining broad run was stopped after this failure; a complete
repository suite pass is not established.

Automated review found missing directly rendered subjects in the initial dependency
list. Expanded the catalog across affected suites, including relative production
imports, all direct non-primitive subjects in local wrappers, and the primitives
that foundation stories demonstrate. Explanatory review guides keep their separate
guide classification. This records change detection, not new parity
acceptance. Added a real CSF parser regression for nested discovery, include/exclude
rules, stable explicit IDs, and play counts.

## Feature organization follow-up — 2026-10-12

Source baseline: `75bd3c977cd828d5222823850339e8204f40eb47` (parent PR #16046).
The 223 story files now live under their primary feature area in
`ui/storybook/stories/`. The sidebar uses the feature map's section and feature
labels in map order. Existing scenario groups remain below those labels.
Overview and shared Foundations have dedicated homes. Areas without stories do
not get empty sidebar groups; their gaps remain visible in the catalog.

Nineteen supporting files moved to `ui/storybook/support/`, including fixtures,
shared wrappers, guide READMEs, an HTML fixture, and a fixture test. Relative imports,
active documentation, catalog sources, and replacement references follow the
moves. Classification and review scope did not change. The upstream feature map
and its skill are unchanged.

Every suite now has an explicit meta ID, recorded as `stableId` in the catalog.
The built index comparison preserved all 2,210 story IDs, the single docs ID, and
all entry names. No story was removed or added. Catalog validation checks primary
feature folders, sidebar prefixes, and stable meta IDs; its nine tests passed.

The Storybook build, UI typecheck, all 8,176 UI tests in 728 files, token gates,
map checks, and the maintenance-skill validator passed. A source comparison found
only changed meta titles/IDs, rebased relative references, and updated fixture
path text in story files. The full repository suite was not repeated for these
file moves; the prior full-suite limitation above still applies.

Local Chromium verified the sidebar's section/feature order, rendered the guide,
searched `steering/queue`, and followed its link to the unchanged
`composer-steering-and-queued-messages--queued-while-running` ID. The nine play
cases listed above and `fast-responses-01-settings--empty` all reached
`storyFinished: success` without page exceptions after relocation. This is a
sample of interactions and rendering, not execution of all 2,210 stories.
The fixture-server story and visual-baseline comparisons remain untested for the
reasons below. The owned static preview was left running for the requested test-drive.

## Remaining review work

1. Review the 188 unreviewed suites by capability and production subject. Compare
   state transitions, payloads, errors, gates, and reset behavior before promoting
   a suite. Start with large route wrappers and shared fixture dependencies.
2. Shared preview mocks can fall through to the original fetch; some route harnesses
   return empty arrays for unmatched APIs. These can hide missing fixtures. Audit
   affected endpoints per feature rather than treating a render as API coverage.
3. The managed-accounts test-drive story needs the separately owned local API/DB
   fixture at port 4310. Its upstream providers are simulated. It was not exercised
   against an unknown existing service.
4. Screenshot comparison is blocked: the existing baseline manifest has zero
   snapshots and no published archive. Keep using the established Linux baseline
   workflow when its baseline is published. Do not bless new baselines as part of
   catalog cleanup.
5. Review fingerprints track declared sources, including feature recipes and local
   support; they do not traverse every production dependency. Add missing subjects
   when a review discovers them. Shared setup changes require reviewing callers.

Use `maintain-storybook` to correct drift and `review-storybook` to record separate
source, render, interaction, visual-comparison, and production evidence. Both skills
consume the feature map; neither changes its upstream contract.

## Native runtime prerequisite: scoped source follow-up — 2026-10-12

Source comparison: `9f59ff36cf2da963709ca19c06ab005510c835a6` against actual
master `4b958ecbd8f33a7782fe6f29ec825f80f636b833`. The reviewed
`maps/feature-map/runs-adapters.md` bytes have SHA-256
`ca5aff86608b7d7987dc0ee814475a7b93e3faff1f99ce090429d2e932b7e16b`.

Twenty-one entries in Runs, harnesses, and model accounts and Task creation and
lifecycle had review-fingerprint drift. Their 117 unique declared sources have
one changed input: the runs-adapters feature recipe. All 21 story files and the
other 116 declared production subjects, wrappers and fixture sources are
unchanged from master. The recipe adds bounded native startup and registration
retirement controls. It separates those provider-free controls from real daemon
and installed-provider proof; it changes no represented UI or fixture contract.

Refreshed only those 21 reviewed fingerprints. No story, fixture, export, stable
ID, title, capability reference or product/implementation/data classification
changed. Existing mixed and unreviewed parity limitations remain. No fixture
correction is needed for this scoped prerequisite; this does not establish full
state parity for the affected suites.

This follow-up is source inspection only. Rendering, play assertions, visual
comparisons and production provider acceptance were not run. Native lifecycle
behavior remains with the linked transport controls and their existing hosted
CI fixtures. Catalog validation proves structure and reviewed dependency hashes,
not that these live journeys passed.

## Claude/Codex runner composition review — 2026-10-12

Source context: canonical runtime prerequisite
`64c074fb8da1b31f8d6042c4fef48dc4164e759b` composed with the Codex dependency
and local Claude behavior at `304e95c320`; the catalog/story changes in this
checkpoint are recorded below. This pass covers changed source dependencies and
six selected fixture interactions. It is not a full state-parity or Linux visual
baseline comparison, and it does not qualify providers or default rollout.

The shared preview now supplies the production general-settings response and
resolved runner-discovery fields required by the matching-discovery guard. Its
Claude/Codex defaults explicitly simulate Legacy; the independent Codex creation
fixture simulates a qualified native default. The native inventory is not added
twice. Opus 5.5 joins the model metadata without replacing explicit older models.
All fixtures remain isolated from live providers and production accounts.

Fifty-three affected entries retain their previous current/mixed/historical/
unreviewed classifications. Source changes include shared runner controls,
branding, model/effort/default discovery, and the associated recipes. Existing
Select subjects remain intact while the shared module adds the runner popover;
no new primitive coverage is inferred. Direct runner-control dependencies are
listed where the rendered form/wizard uses them. The new Codex creation file is
placed in the agents feature home with explicit stable ID
`agents-codex-runner-creation`; all eight existing IDs survive. All 2,223 current
story IDs match the pre-move inventory, and 224 files are accounted for.

An owned Storybook 10.6.0 dev server on port 6195 and the in-app browser executed
these existing play functions. Each displayed `Story status: Pass`, with its
observable result checked and no captured browser errors:

| Story ID | Observed result |
| --- | --- |
| `agents-codex-runner-creation--automatic-codex` | Runner shows Paperclip Runner as default with the old experimental gate disabled |
| `agents-codex-runner-creation--explicit-legacy` | Runner remains Legacy |
| `agents-codex-runner-creation--setup-failure` | Missing-runner failure is visible and the override stays available |
| `agents-codex-runner-creation--task-ready` | Native fixture setup reaches the task-ready confirmation |
| `onboarding-agent-arc--claude-api-key` | Claude API-key entry is visible; no live key is entered |
| `onboarding-agent-arc--connect-with-saved-claude-subscription` | Simulated saved connection advances to Review |

Revisiting Automatic Codex after Task Ready restores the Connect step, its native
default and a disabled Confirmation step; no hired-agent state leaks. This is
fixture reset evidence, not persisted backend/session evidence. Other plays,
full themes/mobile variants in this Storybook, accessibility grading and Linux
baseline comparisons are not run. The retained product preview's separate mobile
inspection remains bound to its earlier compiled source, and final installed
product/provider checks remain pending. The catalog checker and nine checker
controls pass; UI noemit, maps and token gates pass on the composed source.
