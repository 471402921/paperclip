// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ExternalAgentInviteDialog } from "./ExternalAgentInviteDialog";
import { museBinding, museConnection, musePairing } from "../../../storybook/stories/external-agent-invite/muse-fixtures";
import { readMuseInvitationDraft } from "@/lib/muse-invitation-draft";

const identity = vi.hoisted(() => ({ userId: "operator", settled: true, failed: false }));
const settings = vi.hoisted(() => ({ enableMuse: true, enableNativeRunner: true, enableOpenAiDot: true, enablePublicMcp: true }));
const museApi = vi.hoisted(() => ({ resume: vi.fn(), create: vi.fn(), connection: vi.fn(), pair: vi.fn(), verify: vi.fn(), revoke: vi.fn(), attestStop: vi.fn() }));
const copy = vi.hoisted(() => vi.fn());
vi.mock("@/api/museInvitations", () => ({ museInvitationsApi: museApi }));
vi.mock("@/api/companies-query", () => ({ useAccountIdentity: () => identity }));
vi.mock("@/api/instanceSettings", () => ({ instanceSettingsApi: { getExperimental: async () => settings } }));
vi.mock("@/context/CompanyContext", () => ({ useCompany: () => ({ selectedCompany: { name: "Paperclip" } }) }));
vi.mock("@/lib/router", () => ({ Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => createElement("a", { href: to, ...props }, children) }));
vi.mock("@/lib/clipboard", () => ({ copyTextToClipboard: copy }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root; let container: HTMLDivElement; let cache: QueryClient;
const close = vi.fn();
const agent = { id: "muse-agent", name: "Maia", status: "idle" };
const pendingBinding = { ...museBinding, status: "pairing" as const, paired: false, receiverDetected: false };
async function flush() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); }); }
async function render(companyId = "company") {
  await act(async () => root.render(<QueryClientProvider client={cache}><ExternalAgentInviteDialog companyId={companyId} onClose={close} onBack={vi.fn()} /></QueryClientProvider>)); await flush();
}
async function click(label: string) {
  const b = [...document.querySelectorAll("button")].find(button => button.textContent?.trim() === label || button.getAttribute("aria-label") === label);
  expect(b, label).toBeTruthy(); await act(async () => b!.click()); await flush();
}
beforeEach(() => {
  vi.clearAllMocks(); Object.values(museApi).forEach(mock => mock.mockReset());
  settings.enableMuse = true; settings.enableNativeRunner = true; identity.userId = "operator";
  localStorage.clear(); copy.mockResolvedValue(undefined);
  museApi.resume.mockResolvedValue(null);
  museApi.create.mockResolvedValue({ agent, approvalId: null, binding: null });
  museApi.connection.mockResolvedValue({ ...museConnection, binding: null });
  museApi.pair.mockImplementation(async () => {
    museApi.connection.mockResolvedValue({ ...museConnection, binding: pendingBinding });
    return { ...musePairing, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() };
  });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(async () => { await act(async () => root.unmount()); cache.clear(); container.remove(); localStorage.clear(); });
it("gates Muse on both flags without changing Dot availability", async () => {
  settings.enableNativeRunner = false; await render();
  expect(document.body.textContent).toContain("Your Dot in ChatGPT");
  expect(document.body.textContent).not.toContain("Muse — Personal agent");
  expect(museApi.resume).not.toHaveBeenCalled();
});
it("retains a nonsecret name/role draft and has one aligned footer", async () => {
  await render(); await click("Muse — Personal agentYour personal Muse at muse.ai");
  const name = document.querySelector<HTMLInputElement>('input[placeholder="Muse"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(name, "Maia");
    name.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const select = document.querySelector<HTMLSelectElement>("select")!;
  await act(async () => { select.value = "researcher"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(readMuseInvitationDraft("company", "operator")).toEqual({ name: "Maia", role: "researcher" });
  const footer = [...document.querySelectorAll("button")].find(b => b.textContent === "Continue")!.parentElement!;
  expect(footer.textContent).toContain("Save & exit");
  await click("Continue");
  expect(museApi.create).toHaveBeenCalledWith("company", { name: "Maia", role: "researcher" });
  expect(museApi.pair).toHaveBeenCalledWith("company", agent.id, {});
  expect(JSON.stringify(cache.getMutationCache().getAll().map(mutation => mutation.state))).not.toContain(musePairing.ticket);
  expect(JSON.stringify(cache.getQueryCache().getAll().map(query => query.state.data))).not.toContain(musePairing.ticket);
  expect([...Array(localStorage.length)].map((_, i) => localStorage.getItem(localStorage.key(i)!)).join()).not.toContain(musePairing.ticket);
});
it("resumes the server agent and replaces a stale prompt with the exact binding revision", async () => {
  museApi.resume.mockResolvedValue({ agent, approvalId: null, binding: pendingBinding });
  museApi.connection.mockResolvedValue({ ...museConnection, binding: pendingBinding });
  await render(); await click("Muse — Personal agentYour personal Muse at muse.ai");
  expect(museApi.create).not.toHaveBeenCalled();
  expect(museApi.pair).toHaveBeenCalledWith("company", agent.id, { replaceBindingId: museBinding.id, expectedRevision: museBinding.revision });
  await click("Copy setup prompt");
  expect(copy).toHaveBeenCalledWith(musePairing.setupInstruction);
  // Closing/reopening has no recoverable browser ticket; resume the same agent instead.
  await act(async () => root.render(null)); await render(); await click("Muse — Personal agentYour personal Muse at muse.ai");
  expect(museApi.create).not.toHaveBeenCalled();
  expect(museApi.pair).toHaveBeenCalledTimes(2);
});
it("keeps every connection milestone behind the real hire approval", async () => {
  museApi.resume.mockResolvedValue({ agent: { ...agent, status: "pending_approval" }, approvalId: "hire", binding: null });
  museApi.connection.mockResolvedValue({ ...museConnection, agentStatus: "pending_approval", agentLifecycleState: "pending_approval", canConfigureConnection: false, binding: null });
  await render(); await click("Muse — Personal agentYour personal Muse at muse.ai");
  expect(document.body.textContent).toContain("needs to approve this agent before Muse can connect");
  expect(document.querySelector('a[href="/approvals/hire"]')).not.toBeNull();
  expect(museApi.pair).not.toHaveBeenCalled();
  expect([...document.querySelectorAll("button")].some(b => b.textContent === "Done")).toBe(false);
});
