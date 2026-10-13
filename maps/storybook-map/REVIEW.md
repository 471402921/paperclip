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

## Complete feature index follow-up — 2026-10-12

Source baseline: `88bf4c6c1d222f818faa56257efe79207c892a6c` (merged PR #16049).
Storybook now derives all eight sections, 35 feature families, and 171 capabilities
from the feature map. Each feature has a generated Overview, including the seven
without primary suites. Related example links cross primary homes without copying
stories. Generated guides are separate from the authored catalog and example counts.
The upstream feature map remains unchanged. Deeper authored scenario groups remain
intact; this pass does not establish new production parity.

The built index preserved all 2,210 existing story IDs and the docs ID, adding only
35 feature overviews in map order. Catalog/generator tests (16), token gates, map
checks, both skill validators, workspace typecheck, workspace build, and Storybook
build passed. The UI project passed 8,170 tests in 728 files. The broad local test
run encountered a failure in the unchanged GitHub chat case `authorizes description
edits as the editor, never inheriting the original author's access`; that exact
case passed alone without changing code or expectations. A complete local repository
suite pass is not established. PR #16052 records the final CI result separately.

The local built Storybook passed browser checks for the complete index/sidebar,
capability-ID search, empty search, Goals cross-feature suite links, all five
Execution environments capability gaps, and the existing Questions suite links.
The original `composer-question-flow--editable-initial-text` bookmark still renders.
The CLI feature uses a comma in its sidebar label because Storybook treats `/` as
a folder separator; its guide heading retains the upstream name.

Review fixes retain matching shared foundations during search and validate review
fingerprints after generated files are written. Searching `Primitive Matrix` shows
and opens the existing foundation story. A regression test changes a capability
description and proves regeneration reports the resulting review drift without
updating fingerprints. These checks establish navigation and generation behavior,
not production acceptance or visual-baseline comparison.

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

## Task workspace reconciliation — 2026-10-12

Scope: the 26 declared-source entries affected by task-workspace work at
`88b1d3a2`, compared with master `dabb8c5daf`, including subsequent comment-only
cleanup and the fixture corrections below. This is a bounded source review,
not a new review of all Storybook states. Reconciliation onto `b5046ec022`
preserves its new feature folders, sidebar titles and explicit stable IDs, along
with the existing exports, classification and simulation boundaries. Shared GitHub
fixtures now live under `ui/storybook/support/github-bot-management/`.

Twenty-one entries changed only through the expanded chat/workspace recipes.
Their setup, identity, browser, artifact, picker and service examples are retained;
the new recipe requirements do not become covered merely because they reference
the same capability. Five entries also depend on changed production subjects:

| Story file under `ui/storybook/stories/` | Source review and remaining scope |
| --- | --- |
| `chat-channels/chat-management/chat-management.stories.tsx` | Mounted endpoint includes connection/destination defaults. Added the missing selectable-workspace fixture response; existing endpoint PATCH and resource PUT retain defaults. No browser save, error, reload or inheritance proof in this pass. |
| `chat-channels/github-bot-management/management.stories.tsx` | Mounted endpoint/repository editors include defaults. Fixed the endpoint mock to persist PATCH values instead of returning the original endpoint. Resource PUT already distinguishes omitted, null and concrete values. Project/workspace choices are intentionally empty fixtures. |
| `chat-channels/imessage-photon.stories.tsx` | Existing scenarios mount setup/access and simulate task conversations. They do not exercise the newly added settings editor or its workspace-choice request. Kept unreviewed rather than claiming settings coverage. |
| `projects/projects-goals-workspaces.stories.tsx` | Existing project-bound summaries still match the rendered components. New nullable project references and runtime invalidation branches have no projectless story scenario here. |
| `workspaces/workspace-runtime-provisioning.stories.tsx` | The demonstrated status subcomponent is unchanged. Its local context row does not prove the full detail page's new projectless behavior. |

The three endpoint-management entries now declare `ChatExecutionDefaults` and its
API clients as review dependencies. AgentMail settings still demonstrates only
the inbox subsection, not the surrounding endpoint defaults. Historical GitHub
designs remain historical; existing unreviewed entries remain unreviewed. None of
these fixture examples establishes source authorization, retained file privacy,
pending workspace selection, sandbox admission or existing-conversation continuity.

Executed: the GitHub fixture's two Vitest cases passed, including default save,
subsequent GET, omitted-value preservation, explicit null clearing and fresh-mount
reset. After the folder rebase, both fixture tests and all nine catalog checker
tests passed again; token gates passed before the path-only reconciliation. After the final
source freeze, only the 26 reviewed fingerprints were refreshed; catalog validation
passed for all 223 files and all 2,210 source-parsed story IDs were unchanged.
All 223 upstream file paths, explicit stable IDs and sidebar titles were preserved.
Not run in this pass: Storybook build, browser rendering or `play`, screenshot
comparisons, provider calls and live production acceptance. No new visual
baselines were accepted. Fixture tests are boundary simulations, not server
persistence or permission tests.

## Workspace safety recipe follow-up — 2026-10-12

Reviewed the twelve entries that depend on the workspace feature recipe: browser-use activity/footer/page, the three HTML-artifact suites, project execution strategy and project workspace summaries, searchable selection, workspace files, runtime provisioning and service controls. Their production subjects, fixtures, feature folders, sidebar titles and stable IDs are unchanged. The recipe now requires prospective child boundary checks, safe low-trust reopening, and coherent returned checkpoint ancestry. These backend safety contracts are not exercised by those fixtures. Each entry remains unreviewed for full production parity. Only the reviewed recipe fingerprints were refreshed; no browser render, play, screenshot baseline or production acceptance was run for this follow-up.


## Remote provisioning recipe follow-up — 2026-10-13

Reviewed the same twelve workspace-recipe-dependent entries after extending the controller-provisioning boundary to standard-trust sandbox and SSH selections. Their components, fixtures and stable IDs are unchanged. Project strategy stories demonstrate configuration fields with environment selection disabled; runtime provisioning stories demonstrate status values with a no-operation log handler. Browser, artifact, file and service-control fixtures do not execute source scripts or prove admission placement. The new recipe requires controller marker denial independent of source write grants while copying and dispatch remain available, including local copy-only selections, retained deny-only metadata and closed-worktree reopening. Implicit trusted local defaults remain separate positive controls. All twelve entries retain their unreviewed production classification. Refreshed only these recipe fingerprints after this source review; no browser render, play, screenshot, Storybook build or live runtime qualification is claimed.

## Default-source recipe follow-up — 2026-10-13

Reviewed the twelve unchanged workspace recipe subjects and fixtures after correcting implicit default selection. Task creation and controller classification now share configured-policy, primary, creation-time and ID precedence. Explicit choices and retained denial markers still suppress controller hooks. Project strategy fixtures show configuration, while runtime status and file/browser/artifact/service fixtures do not execute source scripts or prove this backend ordering. Refreshed only their reviewed recipe fingerprints and retained all classifications and stable IDs. No browser render, play, screenshot, Storybook build or live runtime acceptance was performed.

## Workspace finalization UI refinement — 2026-10-13

Source base: `f07efa2802`, followed by scoped edits to the production recovery notice and its two story suites. Reviewed `recovery/workspace` and `recovery/source-action`; stable story IDs and administrator admission remain unchanged. The notice leads with saved work, discloses controller metadata, explains evidence/confirmation requirements, and distinguishes queue acknowledgement from completion. A stale controller error preserves the note and clears confirmation so the operator must verify again. The task composition uses viewer identity for human bubbles and omits a routine status badge.

MacOS in-app browser inspection passed for the task journey at desktop and 390px mobile widths: controller disclosure with Enter, evidence without confirmation remaining disabled, explicit confirmation enabling submission, and a simulated queued result in place. The `owner-changed` story's play assertions passed; the friendly error was visible, the note remained, confirmation cleared and the action was disabled. The `long-controller-name` story rendered at 390px without horizontal overflow. The mobile task shell showed its bottom navigation; evidence text computed to 16px and Tab reached the enabled action. No physical mobile keyboard, Linux screenshot baseline, live deployment stop, real API admission or provider copyback acceptance is claimed. Other story states received source review, not a full browser execution pass.

Refreshed the two reviewed catalog entries only. Global catalog validation already reported unrelated source-fingerprint drift before this work; those entries require their own review.

## Automatic workspace recovery revision — 2026-10-13

Supersedes the task shutdown form reviewed above. The production task now renders
only a quiet restoration status or an honest operator-assistance fallback. It
contains no process metadata, evidence field, confirmation checkbox or resume
button. The task thread omits the duplicate technical recovery card. Obsolete
form stories and their simulated API fixture were removed; suite IDs remain
stable. The composed task journey includes a saved state without the notice.

Observed in the macOS in-app browser: automatic status in the production shell,
completed example without the status, retained approval-wait message, and mobile
bottom navigation with equal content and viewport widths (no horizontal overflow).
These are fixture UI observations, not live provider shutdown or task commitment.
The production component test verifies removal on a resolved action update. The
real reconciler's database tests separately preserve accepted-result identity,
monitor and approval waits, and create no new run or wake request.

Only the two reviewed suites have refreshed fingerprints. Global validation has
71 other source-fingerprint errors, including recovery-recipe dependents after
the operator instructions changed. It is not globally green. No unrelated review
fingerprints or visual baselines were accepted.

## Inherited activity, inbox and recovery recipes — 2026-10-12

Source comparison: master `e168512f7bdbb6af6ea01954c6d7ed80b91e903e`
against previous master `f329b24ee12496e710ad17377ec7716e0eee22ef`,
while reconciling the native-runtime prerequisite. All 25 affected catalog
entries are identical to e168 master; their stale fingerprints were inherited.

The 101 unique declared inputs have three changed feature recipes. The remaining 98 inputs, including all 25 story files, are unchanged
between those masters and the merged worktree. They include 92 non-map
story, subject, wrapper and fixture sources and six unchanged map files. The reviewed recipe
bytes have these SHA-256 identities:

- `maps/feature-map/activity.md`: `3867cc392c031cc5ca9ec61bfc4211d685da37e39fb36e9b152497b7cf970caf`.
- `maps/feature-map/inbox-search.md`: `8ff5431ddfe54c0c288eecffb785f864d8bfeb38be50c66615999ffbbfba6863`.
- `maps/feature-map/recovery.md`: `46fee5940f23a6d1483697e0b07817a78d993d4748b51121d2e113dd2a96173b`.

The activity addition names issue-scoped activity authorization and sandbox
bridge controls; company audit/display fixtures do not establish live sandbox
agent access. The inbox recipe excludes automatic historical read cleanup from
user participation while retaining explicit decisions; static inbox/decision
examples do not execute that query or the newly required user/company journey.
The recovery recipe retains native workspace-owner holds across task completion
and repeated reads until exact operator retirement; recovery display fixtures
do not establish ownership, copyback denial, action identity or live operator
recovery. These backend acceptance requirements remain separate gaps.

The proposed maintenance changes only those 25 reviewed dependency fingerprints.
Retain the existing 24 unreviewed and one current classification, simulation
boundaries, story exports, titles and stable IDs. No fixture or story correction
is indicated by this declared-source comparison. This does not promote full
state parity or coverage for the added backend requirements.

Source inspection only: no browser rendering, play, visual baseline, provider
run or live production acceptance was performed for this reconciliation. The
existing catalog checker must run on the actual merged tree after synchronization;
its result verifies structure and declared hashes, not these live journeys.

## 2026-10-13 master merge reconciliation

Reviewed the source delta from `4808adc34e` to merge `63b2e7b8ad`
(master parent `d67e3507b2`). The text conflict in INDEX retained the feature-map
ordering and upstream workspace review notes. Regenerated INDEX after reviewing
61 stale catalog entries against the changed declared sources.

The inspected changes add assignment-history recipient suggestions and preserve
manual selections, expand backend verification recipes, and add channel task
defaults and access avatars with matching fixture changes. Entries record those
limits. The sidebar suite that also mounts IssueDetail is now unreviewed because
its route fixture has not been exercised against the new activity query. Existing
composer examples omit the new optional suggested-assignee prop and retain their
previous scenarios; their classifications do not certify the new behavior.

All 223 authored suites and 2,210 authored story IDs remain. Generated feature
pages still cover 35 areas and 171 capabilities. Catalog/generator tests (16),
catalog validation, map checks and token gates pass. This is source reconciliation,
not a new visual or live production acceptance claim.

## 2026-10-13 capability association reconciliation

Source baseline: `60bc0d5fee9a6e48db08fc016521fee3d9f57d67`.
Reviewed the complete authored inventory and missing-capability lookup, then
inspected the candidate story exports, wrappers, fixture behavior and shipped
subjects. This pass corrects navigation associations; it is not a full parity,
interaction or visual review of all 223 suites.

Added 55 references across 34 suites. Primary-agent suites now use their own
capability instead of organization/reporting. Shared foundations retain their
physical and sidebar home while cross-listing `developer-labs/design` through
an explicit, reasoned Foundations override. No story was moved, renamed or removed.
The parser comparison preserves all 223 files and 2,210 authored story IDs.

The map had three omissions revealed by stories and confirmed in shipped source:

- `agents/primary-agent`: personal choice, confirmation and fallback presentation,
  distinct from organization/reporting. The production provider and self-service
  API have user/company scope; the story presentation provider simulates changes.
- `companies/decision-models`: connection/model/sponsorship configuration,
  bounded testing and history. Settings require board connection management;
  history and task-link visibility have separate read policies.
- `companies/fast-responses`: experimental acknowledgement configuration,
  tests and history. A receipt does not establish completed agent work.

Added their production recipes and same-ID agent-access companions. Existing
capability IDs remain. Both maps now contain 35 families and 174 capabilities.
New access evidence is source-only; no live provider or agent-access claim.

Confirmed association evidence and limits:

| Existing suites | Added lookup | Demonstrated scope |
| --- | --- | --- |
| Four shared foundation suites | Developer design | Production controls and contributor visual states; no application journey claim. |
| Agent chat | Handoff | Project-created, existing-project, repository and failure results; tool results/navigation simulated. |
| Agent management | Environment assignment | Forced Kubernetes target and missing-target warning; no saved assignment or execution. |
| Team catalog | Installation/configuration | Progress/success results and adapter choices; no real install, account setup or routed catalog. |
| Issue-thread interactions | Plan review/continuation | Approval, stale-revision and accepted-but-resume-failed states; no successful resume or duplicate-suppression proof. |
| New-task composer | Workspace binding | Worktree selection and submitted request values; no execution admission. |
| GitHub skills journey/detail | Policy/versions | Assignment selection and fixture revisions; no runtime enforcement or durable no-op callbacks. |
| Routine webhook/detail | History/audit | Production Runs/Activity with fixture tasks/events; no scheduler or audit-persistence proof. |
| Budget finance | Incidents | Warning/resolved/pending/escalated cards; resolution callbacks are no-ops. |
| Public-MCP setting | Instance configuration | Experimental flag toggles, cloud restrictions and failed-save rollback; no other instance settings. |
| Arcade/Composio/Executor/Zapier setup | Draft recovery, identity, action policy/testing | Production setup/permissions with in-memory drafts; reload loses the draft. |
| Chat management/iMessage Photon | Provider, identity, conversation, lifecycle and setup/failure | Shipped hosts with simulated provider/identity/delivery data. |
| Primary-agent suites and decision/fast-response suites | New map capabilities | Production UI subjects plus simulated preference/provider/result boundaries. |

Eleven previously empty capability lookups now have related examples. With the
three newly mapped capabilities also linked, the absent-example count changes
from 70 of 171 to 59 of 174. This measures catalog links, not complete behavior
coverage. Review classifications were not promoted by this association pass.

Retained gaps and rejected lookalikes:

- Document preview/annotations do not establish version editing/restoration.
- Seeded drafts do not establish task switching, reload or uncertain submission.
- Approval resume failure does not establish durable approval delivery.
- NewToolsAllowed does not establish quarantined-action review.
- Assistant OAuth revocation does not establish gateway token scope/revocation.
- Budget resolution controls with no-op handlers do not establish relief/resumption.
- A closed browser session does not establish workspace closure/reopening.
- Team fixtures and Skill Studio route presence do not establish working installs
  or Studio test execution/results.

The gateway-token fixture needs separate review before advertising coverage:
its token data may omit fields read by the production token panel. The missing
lookup remains explicit. Rendering/interaction checks below cover selected
association navigation, not all source-audited suites or production acceptance.

Executed checks: 27 catalog/generator/map tests, catalog and map validation,
token gates, skill validation, repository typecheck/build and Storybook build
passed. The built index has 2,246 entries and loses none of the original 2,211.
In the browser, the developer Design lookup opens the preserved primitive URL;
company-service sections link the existing settings/history/journey suites.
The decision SetupToHistory journey passed its 12 interaction steps and showed
the simulated test receipt in history. Primary-agent ReplacePrimary passed its
four interaction steps and displayed the replacement confirmation. No console
errors were observed in those selected checks. No visual-baseline comparison.

The broad local repository test run was interrupted before completion to merge
new master changes; no full local suite pass is claimed. Fresh CI on the updated
branch supplies repository-wide verification. The merge retains master’s native
REST transport updates alongside the three new capability records; new live
provider and agent-credential verification remains not run.
## Slack DM mention exemption — 2026-10-13

Scoped source review: Slack DMs no longer require an at-mention, while channel
messages and channel thread replies retain the saved mention policy. Top-level
DM replies remain linear. The production `ChatEndpointDetail` settings copy and
the feature-map manual recipe now state this distinction.

The Chat management story mounts that production settings page and merges
endpoint PATCH values in its local fixture. GitHub bot management and Photon
also reference the page, but do not render its Slack-only toggle. No story UI,
fixture behavior, or story identity changed, and no browser proof is claimed.

After rebasing onto master `60bc0d5fee`, the upstream catalog reconciliation
supplies the reviewed baseline for the previously stale entries. Refreshed the
fourteen entries affected by this change: all reference the updated chat recipe,
and three also reference the Slack-only settings copy. Other source bytes and
all classifications, fixture boundaries, story IDs and sidebar titles remain
unchanged from that baseline. Catalog checks validate these references and
fingerprints, not live Slack behavior.

### Current-master reconciliation

Merged master `5e8e992df2`. The newer catalog supplies the baseline associations
and reviews. Compared every declared input against that master: only seven
inputs changed for this feature (recovery recipe, recovery card, task page, quiet
status, two stories and their fixture). Reviewed those changes and the unchanged
subjects/fixtures they affect; refreshed the 26 dependent fingerprints while
retaining their classifications and simulation boundaries. The task-page change
adds the quiet status and suppresses only the owner-unverified duplicate card;
other task variants retain their behavior. The recovery-card change blocks
unsafe generic dismissal. Existing card regressions cover that denial.

Five remaining errors have unchanged source bytes and metadata inherited from
master: shared setup, decision-card, decisions-desk, search and what-needs-me.
These require a separate review; no hashes or visual baselines were accepted for
them. The earlier 71-error count above describes the pre-merge baseline.

### Inherited index metadata follow-up

The current master's personal-toast recipe also left shared setup and four inbox
suites with stale metadata. Reviewed the recipe's added toast capability and
verification limits: decision-card, decisions-desk and search still demonstrate
their existing isolated subjects; what-needs-me's toast fixture does not prove
viewer eligibility. Their subject and fixture bytes are unchanged from master;
retained all unreviewed classifications and fixture boundaries. The generator
adds the missing toast capability and description to the existing inbox feature,
without changing feature order or IDs. Reviewed that generated diff and refreshed
these four entries, the shared setup and Overview fingerprints. No toast behavior,
new browser acceptance or visual baseline is claimed. Global catalog validation
now passes. This supersedes the five inherited-error count above.

### Confirmed recovery status

Reviewed the shipped notice, server evidence contract and both recovery fixtures.
Platform identity alone no longer means work is restoring: the server marks the
exact recovery receipt resuming only after verified stop proof and a successful
owner claim. Missing proof remains operator-required. The new unavailable-proof
story covers a platform-bound receipt without progress; confirmed and queued
stories retain the quiet status. Updated only the two affected fingerprints.
This is component/fixture evidence, not deployed harness acceptance.

### Latest master reconciliation

Retained master’s task-creation visibility scenarios, source-review notes and
unreviewed classifications. Seven overlapping entries differ from master only
in the already reviewed recovery recipe or task-detail recovery notice wiring.
Refreshed those combined-source fingerprints and regenerated the index. No new
creation-visibility acceptance or visual baseline is claimed.

## Verification routes for unassociated capabilities — 2026-10-13

Source classification against merged master `5e8e992df2`: [VERIFICATION.md](VERIFICATION.md)
accounts for all 60 capabilities without non-guide example associations. It
records 49 UI example gaps with separate production contracts, eight CLI/operator
operations and three browser verification boundaries. Existing tests are starting
points; no new live journey, rendering, interaction or visual evidence is claimed.
The targeted association revisit found no further justified links. This does not
complete parity review of the 184 example suites still classified `unreviewed`.

Master includes #16153's personal task-toast capability. Its upstream README and
recipe were inspected; reconstructing the five inbox-suite and shared fingerprints
with the pre-toast recipe bytes matches the stored baseline. No other declared
source changed for those suites. Regeneration adds the capability/description to
the feature index, which also changes the guide fingerprint. Refreshing those
review fingerprints preserves statuses, associations and all 2,212 authored IDs.

Catalog/map checks, 27 catalog/generator/map tests and maintenance-skill validation
passed. The 60-row inventory and all local links were checked against current
source. Repository-wide typecheck/tests/build and Storybook build are not run for
this documentation and generated-data pass; runtime behavior is unchanged.

Review correction: backup retention already has shipped controls in
`InstanceGeneralSettings`, embedded in `CompanySettings`. The backup row therefore
keeps missing retention UI examples alongside separate CLI backup/restore proof;
it is not a wholesale Storybook exemption. No existing story mounts those controls.

## Verification-parent merge reconciliation — 2026-10-13

Reconciled master `da9af67415` while preserving its catalog records and both
review histories. Inspected the intervening recipe changes for Telegram
maintenance, liveness/readiness and trusted instance-secret lifecycle, and the
soft-warning versus hard-stop budget UI. Refreshed only dependent review
fingerprints with notes naming those boundaries; classifications remain unchanged.
The generated feature index reflects the current recipes. No new rendering,
provider journey or whole-suite parity review is claimed. Catalog/map validation
and all 27 catalog/generator/map tests pass with the pinned Storybook parser.

## Production-subject UI gap examples — 2026-10-13

Step 3 adds 37 suites and 257 scenarios associated with the 49 UI capabilities
from [VERIFICATION.md](VERIFICATION.md). Subjects are shipped pages/components;
API replies, sockets, callbacks and storage seeds remain simulated. Source
review uses production snapshot `a9ef9e8ebc1f41bb7047142704655d08b3e47be7`;
the story revision is `36689fc8149c31858d0b4c6f7839ecc663404073` plus the review
corrections in this commit. Catalog fingerprints identify the tested source bytes.
Existing suite classifications and all 2,248 prior built entry IDs are preserved;
the new built index has 2,505 entries. Existing unreviewed suites remain unreviewed.

Executed the focused browser suite against this checkout's static build on macOS
Chromium at 1280 × 900 with reduced motion: **260 checks passed**. Every new story
was exercised: 129 declared play functions passed; the remaining 128 scenarios
have explicit subject-content, skeleton, editable-control or documented fallback
assertions. The only intentionally empty root is the zero-entry durable-response
queue, whose shipped component returns null. Additional checks verified token
fixture reset through sidebar navigation and backup retention at 390 × 844 in
light and dark themes. No browser page errors were observed. The test names
identify each story ID; rerun with the command in VERIFICATION.md. Selected
screenshots are inspection captures, not pinned Linux visual-baseline comparisons.

Review corrections give empty stage settings zero stages and assert its message,
make failed reads return HTTP 500 rather than the service-warmup HTTP 503,
provide Inbox dependencies and actual plugin redirect destinations, use distinct
attachment paths and a valid uncertain-submission UUID, and select Interactions
before play starts so the browser harness does not steal input/menu focus.

Repository typecheck/build, the UI Vitest suite (730 files, 8,208 tests),
four fixture-boundary tests, 27 catalog/generator/map tests, token gates and
Storybook build passed. The full local repository test command could not complete:
embedded PostgreSQL exhausted host shared-memory allocation, and native-runner
tests reported timeouts. No host settings or other jobs were changed.

Production acceptance and pinned Linux visual comparisons were not run. The
scenario inventory retains outstanding recipe variants and real authorization,
persistence and provider contracts. Examples expose existing read-error/loading
fallbacks rather than inventing feedback; those limits are named in VERIFICATION.md.

## Step-3 merge reconciliation — 2026-10-13

Merged current master `da9af67415` through the verification parent. Preserved
upstream story additions, review notes and classifications and all 37 new suites.
Compared changed catalog inputs with the reviewed step-2 snapshot: five feature
recipes, the generated feature index, BudgetIncidentCard/Costs, Inbox and the
recovery notice wiring changed. The two preview-hook lines remain as reviewed.
The new budget fixtures explicitly use hard thresholds; their action labels and
callbacks are retained. Inbox fixtures use human-created tasks; unrelated
automation discovery remains outside their asserted scope. Recovery fixtures use
generic exhaustion/unknown-outcome causes, not the newly gated native-owner path.
Recipe additions concern Telegram maintenance, liveness versus readiness, trusted
instance-secret lifecycle and native copyback verification, which these isolated
UI stories do not establish. Reviewed those differences, refreshed affected
fingerprints with scoped notes, and retained all statuses. No new live acceptance
or rendering evidence is claimed for the merge; the earlier 260-check pass names
its tested revision. Catalog/map validation and 27 targeted tests pass.

## Draft-fixture isolation correction before merge — 2026-10-13

After #16167 merged as `252d9b5077`, retained the step-3 catalog and scenarios
while reconciling its squash-merged verification file. Review found that
`clearDraft` correctly refuses to clear a retained submission without its
matching attempt ID. Story setup/cleanup now passes that ID for the two
Storybook-owned draft keys before reseeding them. Production draft guards are
unchanged. The new same-browser check switches from UncertainSubmission to
Empty, SentClearsDraft and SendFailedKeepsDraft; it asserts the warning disappears
and the expected empty or retained draft is shown, with declared play passing.
All six draft stories plus that switching regression passed (seven browser
checks) on the owned macOS Chromium development preview after cold dependency
optimization. UI typecheck, 16 existing draft-persistence tests and the 27
catalog/generator/map tests passed. No whole-suite browser rerun, production
submission journey or visual-baseline comparison is claimed for this narrow fix.

Static merge verification: Storybook build passed after restoring the checkout's
renderer dependencies. All 2,248 original built IDs remain in the 2,517-entry
index. The 25 budget/inbox/recovery examples affected by upstream source changes,
six draft examples and same-browser reset check passed on the static preview
(32 checks). The reset check uses the sidebar for Empty and reloads send stories
within the same browser/storage context, so it cannot read the prior story's
completed play status while the new play starts. No isolated-context substitute
is used for the retained-submission regression. The unchanged GitHub bot-management
suite also passed locally (34 tests) after its CI assertion failed; a separate
server job reported cancellation. Those CI jobs require a fresh passing run.

## Named play-result assertions — 2026-10-13

Strengthened four review cases: UnavailableCompanyDraft waits for the visible
wizard and an empty agent-name input before rejecting the foreign draft; Probing
asserts a disabled Testing button; FilterNoMatches asserts the filtered empty
message and absence of the seeded run; Delivering asserts the queue's optimistic
removal after clicking a loaded row. The shipped queue returns null while that
delivery remains pending, so this story records the missing visible progress
presentation rather than inventing it. All four browser cases passed on the
owned preview, as did UI typecheck and 27 catalog/generator/map tests.
