import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { activityLog, authUsers, boardApiKeys, cliAuthChallenges, companies, companyMemberships, createDb, getEmbeddedPostgresTestSupport, startEmbeddedPostgresTestDatabase } from "@paperclipai/db";
import type { Db } from "@paperclipai/db";
import { boardAuthService } from "./board-auth.js";

describe("boardAuthService touchBoardApiKey", () => {
  it("retries the audit write after a transient failure", async () => {
    const writes = [Promise.reject(new Error("transient")), Promise.resolve([])];
    const update = vi.fn(() => ({
      set: () => ({
        where: () => writes.shift(),
      }),
    }));
    const service = boardAuthService({ update } as unknown as Db);

    await expect(service.touchBoardApiKey("key-1")).rejects.toThrow("transient");
    await expect(service.touchBoardApiKey("key-1")).resolves.toBeUndefined();

    expect(update).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight audit write across concurrent touches", async () => {
    let releaseWrite: (() => void) | undefined;
    const write = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    const update = vi.fn(() => ({
      set: () => ({
        where: () => write,
      }),
    }));
    const service = boardAuthService({ update } as unknown as Db);

    const first = service.touchBoardApiKey("key-1");
    const second = service.touchBoardApiKey("key-1");
    releaseWrite?.();
    await Promise.all([first, second]);

    expect(update).toHaveBeenCalledTimes(1);
  });
});

const external = process.env.PAPERCLIP_TEST_DATABASE_URL;
const support = external ? { supported: true } : await getEmbeddedPostgresTestSupport();
const databaseSuite = support.supported ? describe : describe.skip;

databaseSuite("CLI challenge authority and transitions (real PostgreSQL)", () => {
  let db: ReturnType<typeof createDb>;
  let temporary: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | undefined;
  beforeAll(async () => {
    if (external) db = createDb(external);
    else {
      temporary = await startEmbeddedPostgresTestDatabase("board-cli-challenge-");
      db = createDb(temporary.connectionString);
    }
  }, 60_000);
  afterAll(async () => {
    await db?.$client.end();
    await temporary?.cleanup();
  });

  async function fixture() {
    const companyId = randomUUID(), userId = randomUUID(), otherUserId = randomUUID();
    const now = new Date();
    await db.insert(authUsers).values([userId, otherUserId].map(id => ({
      id, name: "CLI approver", email: `${id}@example.invalid`, createdAt: now, updatedAt: now,
    })));
    await db.insert(companies).values({ id: companyId, name: "Private CLI organization", issuePrefix: `C${companyId.slice(0, 7)}` });
    await db.insert(companyMemberships).values([userId, otherUserId].map(principalId => ({
      companyId, principalType: "user", principalId, status: "active", membershipRole: "owner",
    })));
    const service = boardAuthService(db);
    const created = await service.createCliAuthChallenge({ command: "paperclipai auth login", requestedAccess: "board", requestedCompanyId: companyId });
    return { companyId, userId, otherUserId, service, ...created };
  }

  async function waitForChallengeLock() {
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      const rows = await db.execute<{ waiting: boolean }>(sql`
        select exists(select 1 from pg_stat_activity where datname = current_database()
          and pid <> pg_backend_pid() and wait_event_type = 'Lock'
          and query ilike '%cli_auth_challenges%') as waiting
      `);
      if (rows[0]?.waiting) return;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error("CLI challenge contender did not reach the held database lock");
  }

  it("keeps pending tokens unusable and stores only independent secret digests", async () => {
    const f = await fixture();
    expect(f.challenge.secretHash).not.toBe(f.challenge.pendingKeyHash);
    expect(f.challenge.secretHash).not.toContain(f.challengeSecret);
    expect(f.challenge.pendingKeyHash).not.toContain(f.pendingBoardToken);
    expect(await f.service.findBoardApiKeyByToken(f.pendingBoardToken)).toBeNull();
    expect(await f.service.getCliAuthChallengeBySecret(f.challenge.id, "wrong-secret")).toBeNull();
    await db.update(cliAuthChallenges).set({ expiresAt: new Date(Date.now() - 1) }).where(eq(cliAuthChallenges.id, f.challenge.id));
    expect((await f.service.approveCliAuthChallenge(f.challenge.id, f.challengeSecret, f.userId)).status).toBe("expired");
    expect(await f.service.findBoardApiKeyByToken(f.pendingBoardToken)).toBeNull();
  });

  it("retains the first key owner and approver on same-user and competing-user replay", async () => {
    const f = await fixture();
    const first = await f.service.approveCliAuthChallenge(f.challenge.id, f.challengeSecret, f.userId);
    await expect(f.service.approveCliAuthChallenge(f.challenge.id, f.challengeSecret, f.otherUserId)).rejects.toThrow("another user");
    const repeat = await f.service.approveCliAuthChallenge(f.challenge.id, f.challengeSecret, f.userId);
    expect(repeat.challenge).toEqual(first.challenge);
    const [stored] = await db.select().from(cliAuthChallenges).where(eq(cliAuthChallenges.id, f.challenge.id));
    expect(stored).toEqual(first.challenge);
    const key = await f.service.findBoardApiKeyByToken(f.pendingBoardToken);
    expect(key?.userId).toBe(f.userId);
    expect(stored.approvedByUserId).toBe(key?.userId);
    expect(await db.select().from(boardApiKeys).where(eq(boardApiKeys.keyHash, f.challenge.pendingKeyHash))).toHaveLength(1);
  });

  it("denies an inaccessible requested company before key creation or audit fallback", async () => {
    const f = await fixture();
    await db.delete(companyMemberships).where(eq(companyMemberships.principalId, f.otherUserId));
    await expect(f.service.approveCliAuthChallenge(f.challenge.id, f.challengeSecret, f.otherUserId)).rejects.toThrow("requested organization");
    expect(await f.service.findBoardApiKeyByToken(f.pendingBoardToken)).toBeNull();
    expect(await f.service.resolveBoardActivityCompanyIds({ userId: f.otherUserId, requestedCompanyId: f.companyId })).toEqual([]);
  });

  it("rechecks company membership after waiting for the approval lock", async () => {
    const f = await fixture();
    let release!: () => void, locked!: () => void;
    const held = new Promise<void>(resolve => { locked = resolve; });
    const unlock = new Promise<void>(resolve => { release = resolve; });
    const holder = db.transaction(async tx => {
      await tx.execute(sql`select id from cli_auth_challenges where id = ${f.challenge.id} for update`);
      locked(); await unlock;
    });
    await held;
    const approval = f.service.approveCliAuthChallenge(f.challenge.id, f.challengeSecret, f.userId);
    const outcome = approval.then(value => ({ value }), error => ({ error }));
    try {
      await waitForChallengeLock();
      await db.update(companyMemberships).set({ status: "suspended" }).where(eq(companyMemberships.principalId, f.userId));
    } finally { release(); await holder; }
    const result = await outcome;
    expect(result).toHaveProperty("error");
    expect("error" in result ? String(result.error) : "").toContain("requested organization");
    expect(await f.service.findBoardApiKeyByToken(f.pendingBoardToken)).toBeNull();
  });

  it("serializes cancellation behind an actual approval transaction without cancelling its live key", async () => {
    const f = await fixture();
    let release!: () => void, prepared!: () => void;
    const ready = new Promise<void>(resolve => { prepared = resolve; });
    const unlock = new Promise<void>(resolve => { release = resolve; });
    const gated = Object.create(db) as Db;
    gated.transaction = ((callback: Parameters<Db["transaction"]>[0]) => db.transaction(async tx => {
      const result = await callback(tx);
      prepared(); await unlock;
      return result;
    })) as Db["transaction"];
    const approval = boardAuthService(gated).approveCliAuthChallenge(f.challenge.id, f.challengeSecret, f.userId);
    await ready;
    const cancellation = f.service.cancelCliAuthChallenge(f.challenge.id, f.challengeSecret);
    const outcome = cancellation.then(value => ({ value }), error => ({ error }));
    try { await waitForChallengeLock(); }
    finally { release(); await approval; }
    const result = await outcome;
    expect(result).toHaveProperty("value.status", "approved");
    const [stored] = await db.select().from(cliAuthChallenges).where(eq(cliAuthChallenges.id, f.challenge.id));
    expect(stored.cancelledAt).toBeNull();
    expect(stored.approvedByUserId).toBe(f.userId);
    expect(await f.service.findBoardApiKeyByToken(f.pendingBoardToken)).toMatchObject({ userId: f.userId });
  });

  it("never grants a key after cancellation and keeps duplicate cancellation stable", async () => {
    const f = await fixture();
    const first = await f.service.cancelCliAuthChallenge(f.challenge.id, f.challengeSecret);
    expect((await f.service.cancelCliAuthChallenge(f.challenge.id, f.challengeSecret)).challenge).toEqual(first.challenge);
    expect((await f.service.approveCliAuthChallenge(f.challenge.id, f.challengeSecret, f.userId)).status).toBe("cancelled");
    expect(await f.service.findBoardApiKeyByToken(f.pendingBoardToken)).toBeNull();
  });

  it("shows the requested company name only to a currently authorized viewer", async () => {
    const f = await fixture();
    expect(await f.service.describeCliAuthChallenge(f.challenge.id, f.challengeSecret, { viewerUserId: f.userId }))
      .toMatchObject({ requestedCompanyName: "Private CLI organization", approvedByUser: null });
    await db.update(companyMemberships).set({ status: "suspended" }).where(eq(companyMemberships.principalId, f.otherUserId));
    expect(await f.service.describeCliAuthChallenge(f.challenge.id, f.challengeSecret, { viewerUserId: f.otherUserId }))
      .toMatchObject({ requestedCompanyName: null, approvedByUser: null });
  });

  it("keeps instance-admin approval and current full-Board key authentication compatible", async () => {
    const f = await fixture();
    const { instanceUserRoles } = await import("@paperclipai/db");
    await db.delete(companyMemberships).where(eq(companyMemberships.principalId, f.userId));
    await db.insert(instanceUserRoles).values({ userId: f.userId, role: "instance_admin" });
    const created = await f.service.createCliAuthChallenge({ command: "paperclipai auth login", requestedAccess: "instance_admin_required", requestedCompanyId: f.companyId });
    await expect(f.service.approveCliAuthChallenge(created.challenge.id, created.challengeSecret, f.otherUserId)).rejects.toThrow("Instance admin required");
    const approved = await f.service.approveCliAuthChallenge(created.challenge.id, created.challengeSecret, f.userId);
    expect(approved.status).toBe("approved");
    expect(await f.service.findBoardApiKeyByToken(created.pendingBoardToken)).toMatchObject({ userId: f.userId });
    expect((await f.service.resolveBoardAccess(f.userId)).isInstanceAdmin).toBe(true);
  });

  it("authenticates the real pending, approved and revoked HTTP handshake without synthesizing an anonymous actor", async () => {
    const f = await fixture();
    const [{ default: express }, { default: request }, { actorMiddleware }, { accessRoutes }, { errorHandler }] = await Promise.all([
      import("express"), import("supertest"), import("../middleware/auth.js"), import("../routes/access.js"), import("../middleware/error-handler.js"),
    ]);
    const app = express();
    app.use(express.json());
    app.use(actorMiddleware(db, { deploymentMode: "authenticated", resolveSession: async req => (req.header("X-Test-Session") === f.userId || req.header("X-Test-Session") === f.otherUserId)
      ? { session: { id: "isolated-cli-session" }, user: { id: req.header("X-Test-Session"), name: "CLI approver", email: "synthetic-session@example.invalid" } } as any
      : null }));
    app.use("/api", accessRoutes(db, { deploymentMode: "authenticated", deploymentExposure: "private", bindHost: "127.0.0.1", allowedHostnames: [] }));
    app.use(errorHandler);
    const created = await request(app).post("/api/cli-auth/challenges")
      .send({ command: "paperclipai auth login", requestedCompanyId: f.companyId });
    expect(created.status).toBe(201);
    const { id, token, boardApiToken } = created.body;
    expect((await request(app).get("/api/cli-auth/me").set("Authorization", `Bearer ${boardApiToken}`)).status).toBe(401);
    const anonymous = await request(app).get(`/api/cli-auth/challenges/${id}?token=${token}`);
    expect(anonymous.body).toMatchObject({ status: "pending", canApprove: false, requestedCompanyName: null, approvedByUser: null });
    expect((await request(app).post(`/api/cli-auth/challenges/${id}/approve`).send({ token })).status).toBe(401);
    await db.delete(companyMemberships).where(eq(companyMemberships.principalId, f.otherUserId));
    expect((await request(app).post(`/api/cli-auth/challenges/${id}/approve`).set("X-Test-Session", f.otherUserId).send({ token })).status).toBe(403);
    expect(await f.service.findBoardApiKeyByToken(boardApiToken)).toBeNull();
    expect(await db.select().from(activityLog).where(eq(activityLog.actorId, f.otherUserId))).toHaveLength(0);
    const browser = await request(app).get(`/api/cli-auth/challenges/${id}?token=${token}`).set("X-Test-Session", f.userId);
    expect(browser.body).toMatchObject({ canApprove: true, requestedCompanyName: "Private CLI organization" });
    expect((await request(app).post(`/api/cli-auth/challenges/${id}/approve`).set("X-Test-Session", f.userId).send({ token })).status).toBe(200);
    expect((await request(app).post(`/api/cli-auth/challenges/${id}/approve`).set("X-Test-Session", f.userId).send({ token })).status).toBe(200);
    const audit = await db.select().from(activityLog).where(eq(activityLog.actorId, f.userId));
    expect(audit.filter(row => row.action === "board_api_key.created")).toHaveLength(1);
    expect(JSON.stringify(audit)).not.toContain(boardApiToken);
    expect(JSON.stringify(audit)).not.toContain(token);
    const identity = await request(app).get("/api/cli-auth/me").set("Authorization", `Bearer ${boardApiToken}`);
    expect(identity.body).toMatchObject({ userId: f.userId, companyIds: [f.companyId], source: "board_key" });
    expect((await request(app).post("/api/cli-auth/revoke-current").set("Authorization", `Bearer ${boardApiToken}`)).status).toBe(200);
    expect((await request(app).get("/api/cli-auth/me").set("Authorization", `Bearer ${boardApiToken}`)).status).toBe(401);
  });

  it("omits private organization and approver identity from anonymous capability polling", async () => {
    const f = await fixture();
    const pending = await f.service.describeCliAuthChallenge(f.challenge.id, f.challengeSecret);
    expect(pending?.requestedCompanyName).toBeNull();
    await f.service.approveCliAuthChallenge(f.challenge.id, f.challengeSecret, f.userId);
    const approved = await f.service.describeCliAuthChallenge(f.challenge.id, f.challengeSecret);
    expect(approved).toMatchObject({ status: "approved", requestedCompanyName: null, approvedByUser: null });
    expect(JSON.stringify(approved)).not.toContain(`${f.userId}@example.invalid`);
  });
});
