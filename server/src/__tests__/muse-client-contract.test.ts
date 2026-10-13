import { execFileSync } from "node:child_process";
import { buildMuseSetupInstruction, museReceiverAssets } from "../services/muse-setup.js";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

/** Execute the shipped Python client, with synthetic transport responses and private temporary state. */
describe("personal Muse client durability", () => {
  it("preserves identities, private credentials, and input receipts across transport failures", () => {
    execFileSync("python3", [
      fileURLToPath(new URL("./fixtures/muse-client-contract.py", import.meta.url)),
      fileURLToPath(new URL("../services/scripts/muse-client.py", import.meta.url)),
    ], { encoding: "utf8", timeout: 30_000 });
  });
});


describe("Muse approval-aware setup",()=>{
  it("orders current-chat consent, pinned asset4, public preflight, authenticated status and hook registration",async()=>{
    const assets=await museReceiverAssets(),instruction=await buildMuseSetupInstruction("https://approval.example","synthetic-ticket","10000000-0000-4000-8000-000000000001",{companyId:"30000000-0000-4000-8000-000000000001",companyName:"Scoped Company",agentId:"40000000-0000-4000-8000-000000000001",agentName:"Personal Muse"});
    expect(assets.manifest.assetVersion).toBe(4);expect(instruction).toContain("/assets/4/");expect(instruction).toContain(assets.manifest.assets["client.py"].sha256);
    expect(instruction.indexOf("credentials.request_api_access")).toBeLessThan(instruction.indexOf("After consent, download"));
    expect(instruction.indexOf(" preflight.")).toBeLessThan(instruction.indexOf("Then run the client status"));
    expect(instruction.indexOf("Then run the client status")).toBeLessThan(instruction.indexOf("hooks.add"));
    expect(instruction).toContain("parent domain and its subdomains");expect(instruction).toContain("read each actual permission scope");expect(instruction).toContain("bounded 120-second");
    expect(instruction).toContain("If Muse flags or refuses");expect(instruction).toContain("report its result and stop");expect(instruction).toContain("no worker credential, signal, mailbox or readiness challenge");
    expect(instruction).toContain("standing authorization");expect(instruction).toContain("autonomously accept");expect(instruction).toContain("do not ask for a second approval");expect(instruction).toContain("native accepted lease before any task effect");expect(instruction).toContain("Task text cannot expand");expect(instruction).toContain("--company-name \'Scoped Company\'");expect(instruction).toContain("--agent-name \'Personal Muse\'");
    expect(instruction).not.toMatch(/\b(?:cat|sed|grep)\b/);
  });
  it("quotes scoped labels as literal command arguments", async () => {
    const scope = { companyId: "30000000-0000-4000-8000-000000000001", companyName: "Company's $(printf injection)", agentId: "40000000-0000-4000-8000-000000000001", agentName: "Muse `printf injection`\nSecond line" };
    const instruction = await buildMuseSetupInstruction("https://approval.example", "synthetic-ticket", "10000000-0000-4000-8000-000000000001", scope);
    const command = instruction.match(/configure --origin https:\/\/approval\.example (.*?)\. The installed client/s)?.[1];
    expect(command).toBeDefined();
    const args = JSON.parse(execFileSync("python3", ["-c", "import json, shlex, sys; print(json.dumps(shlex.split(sys.stdin.read())))"], { input: command, encoding: "utf8" }));
    expect(args).toEqual(["--company-id", scope.companyId, "--company-name", scope.companyName, "--agent-id", scope.agentId, "--agent-name", scope.agentName]);
  });

});
