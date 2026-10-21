import { randomUUID } from "node:crypto";
import { Writable } from "node:stream";
import express from "express";
import pino from "pino";
import request from "supertest";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { activityLog, connectionGrants, createDb, heartbeatRuns, toolAccessAuditEvents, toolActionRequests,
  toolApplications, toolCallEvents, toolInvocations, toolPolicies } from "@paperclipai/db";
import { createHttpLogger } from "../middleware/logger.js";
import { HTTP_LOG_REDACT_PATHS } from "../middleware/http-log-redaction.js";
import { toolGatewayRoutes } from "../routes/tool-gateway.js";
import { connectorTransfers, createConnectorTransferRegistry } from "../services/connectors/private-transfer.js";
import { createAssignedMcpTools } from "../services/native-runtime/assigned-mcp-tools.js";
import { initializeRunIdentity } from "../services/run-identity.js";
import { createToolGatewayService } from "../services/tool-gateway.js";
import { startEmbeddedPostgresTestDatabase } from "./helpers/embedded-postgres.js";
import { createListingFixture } from "./helpers/tool-gateway-listing-fixture.js";

describe("connector private transfer gateway", () => {
  let db: ReturnType<typeof createDb>;
  let temporary: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | undefined;
  beforeAll(async () => {
    if (!process.env.PAPERCLIP_TEST_DATABASE_URL) temporary = await startEmbeddedPostgresTestDatabase("connector-transfers-");
    db = createDb(process.env.PAPERCLIP_TEST_DATABASE_URL ?? temporary!.connectionString);
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await db.$client.end();
    await temporary?.cleanup();
  });

  async function fixture(participating: boolean) {
    const value = await createListingFixture(db, 6);
    await db.update(toolApplications).set({ applicationKey: "fireflies" }).where(eq(toolApplications.id, value.application.id));
    await db.insert(connectionGrants).values({ companyId: value.company.id, connectionId: value.connection.id,
      kind: "organization", status: "active", isDefault: true });
    await initializeRunIdentity(db, { companyId: value.company.id, runId: value.run.id, issueId: value.issue.id,
      responsibleUserId: null, cause: "company_default" });
    const capability = `synthetic-transfer-${randomUUID()}`;
    const registry = createConnectorTransferRegistry(participating ? [{ applicationSlug: "fireflies",
      supports: tool => tool.upstreamToolName === "tool_0004",
      prepare: result => {
        const value = result as { data: { structuredContent: { transfer: string } } };
        if (value.data.structuredContent.transfer !== capability) throw new Error("invalid_fixture_capability");
        return { result: { content: [{ type: "text", text: "Ready" }], structuredContent: { status: "ready" } },
          privateTransfer: { restore: safe => ({ ...(safe as Record<string, unknown>), privateCapability: capability }) } };
      } }] : []);
    vi.spyOn(connectorTransfers, "supports").mockImplementation(registry.supports);
    vi.spyOn(connectorTransfers, "prepare").mockImplementation(registry.prepare);
    const upstream = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result: body.method === "initialize"
        ? { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "synthetic-export", version: "1" } }
        : { content: [{ type: "text", text: "Ready" }], structuredContent: { transfer: capability } } }),
      { headers: { "content-type": "application/json" } });
    });
    const gateway = createToolGatewayService(db, { remoteHttpRequest: upstream, toolActionSigningSecret: "synthetic-signing-secret" });
    const tools = await gateway.listToolsForNamedGateway({ gatewayId: value.namedGateway.id, bearerToken: value.token.token });
    const tool = tools.find(entry => entry.catalogEntryId === value.entries[4]!.id)!;
    const logs: Buffer[] = [];
    const stream = new Writable({ write(chunk, _encoding, done) { logs.push(Buffer.from(chunk)); done(); } });
    const app = express().use(express.json()).use(createHttpLogger(pino({ redact: [...HTTP_LOG_REDACT_PATHS] }, stream)))
      .use("/api", toolGatewayRoutes(db, gateway));
    const call = (path: string, body: unknown) => request(app).post(`/api/tool-gateway/${path}`)
      .set("x-paperclip-tool-gateway-token", value.token.token).send(body);
    const body = { tool: tool.name, connectionId: value.connection.id, parameters: {} };
    return { ...value, tool, gateway, app, call, body, capability, logs, upstream };
  }

  it("keeps temporary capabilities out of normal calls, persistence and logs while admitting a selected run transfer", async () => {
    expect(connectorTransfers.supports({ applicationKey: "fireflies" }, {})).toBe(false);
    const f = await fixture(true);
    const normal = await f.call("tools/call", { ...f.body, privateTransfer: { connectionId: f.connection.id } });
    expect(normal.status, JSON.stringify(normal.body)).toBe(200);
    expect(JSON.stringify(normal.body)).not.toContain(f.capability);
    const transferred = await f.call("connector-transfers/call", f.body).expect("Cache-Control", "no-store").expect(200);
    expect(transferred.body.result.privateCapability).toBe(f.capability);
    const recorded = JSON.stringify({ normal: normal.body, logs: Buffer.concat(f.logs).toString(),
      invocations: await db.select().from(toolInvocations), audit: await db.select().from(toolAccessAuditEvents),
      calls: await db.select().from(toolCallEvents), activity: await db.select().from(activityLog) });
    expect(recorded).not.toContain(f.capability);
    expect(recorded).not.toContain(f.token.token);
    const before = f.upstream.mock.calls.length;
    await f.call("connector-transfers/call", { ...f.body, connectionId: randomUUID() }).expect(403);
    await f.call("connector-transfers/call", { ...f.body, tool: "missing" }).expect(404);
    await request(f.app).post("/api/tool-gateway/connector-transfers/call").send(f.body).expect(401);
    expect(f.upstream).toHaveBeenCalledTimes(before);
    await db.update(heartbeatRuns).set({ status: "succeeded" }).where(eq(heartbeatRuns.id, f.run.id));
    await f.call("connector-transfers/call", f.body).expect(401);
    expect(f.upstream).toHaveBeenCalledTimes(before);
  });

  it("fails closed for nonparticipating providers without contacting the provider", async () => {
    const f = await fixture(false);
    await f.call("connector-transfers/call", f.body).expect(403);
    expect(f.upstream).not.toHaveBeenCalled();
  });

  it("enforces Ask first and Off and never persists a capability from an approved invocation", async () => {
    const f = await fixture(true);
    const [policy] = await db.insert(toolPolicies).values({ companyId: f.company.id, name: "Review export", priority: 0,
      policyType: "require_approval", selectors: { catalogEntryId: f.entries[4]!.id } }).returning();
    await f.call("connector-transfers/call", f.body).expect(409);
    expect(f.upstream).not.toHaveBeenCalled();
    const [action] = await db.select().from(toolActionRequests).where(eq(toolActionRequests.companyId, f.company.id));
    await f.gateway.approveActionRequest({ companyId: f.company.id, actionRequestId: action!.id, actor: { userId: "synthetic-reviewer" } });
    expect(f.upstream).toHaveBeenCalled();
    const replayed = await f.call("connector-transfers/call", f.body).expect(200);
    expect(replayed.body.status).toBe("replayed");
    expect(JSON.stringify(replayed.body)).not.toContain(f.capability);
    const assigned = await createAssignedMcpTools({ gateway: f.gateway, gatewayPublicId: f.namedGateway.gatewayPublicId, bearerToken: f.token.token });
    const before = f.upstream.mock.calls.length;
    await db.update(toolPolicies).set({ policyType: "block" }).where(eq(toolPolicies.id, policy!.id));
    await expect(assigned.callConnectionTool(f.connection.id, "tool_0004", {}, { privateTransfer: true })).rejects.toThrow("assigned_connection_tool_unavailable");
    await f.call("connector-transfers/call", { ...f.body, parameters: { query: "new blocked action" } }).expect(403);
    expect(f.upstream).toHaveBeenCalledTimes(before);
    const records = JSON.stringify({ invocations: await db.select().from(toolInvocations), requests: await db.select().from(toolActionRequests) });
    expect(records).not.toContain(f.capability);
  });
});
