import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  activityLog,
  companies,
  companySecrets,
  pluginSecrets,
  plugins,
  createDb,
  type Db,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { pluginPrivateSecretService } from "../services/plugin-private-secrets.js";
import { localEncryptedProvider } from "../secrets/local-encrypted-provider.js";

const support = await getEmbeddedPostgresTestSupport();
(support.supported ? describe : describe.skip)(
  "plugin-private credentials",
  () => {
    let database: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>>,
      db: Db;
    const companyId = randomUUID(),
      otherCompanyId = randomUUID(),
      pluginId = randomUUID(),
      otherPluginId = randomUUID();
    const value = "fixture-mount-credential";
    beforeAll(async () => {
      vi.stubEnv(
        "PAPERCLIP_SECRETS_MASTER_KEY",
        randomBytes(32).toString("base64"),
      );
      database = await startEmbeddedPostgresTestDatabase(
        "paperclip-plugin-secrets-",
      );
      db = createDb(database.connectionString);
      for (const id of [companyId, otherCompanyId])
        await db
          .insert(companies)
          .values({
            id,
            name: "Private credential fixture",
            issuePrefix: id.slice(0, 6),
          });
      for (const id of [pluginId, otherPluginId])
        await db
          .insert(plugins)
          .values({
            id,
            pluginKey: id,
            packageName: "private-credential-fixture",
            version: "1.0.0",
            manifestJson: {} as never,
          });
    }, 90_000);
    afterAll(async () => {
      await database?.cleanup();
      vi.unstubAllEnvs();
    });
    const address = () => ({ companyId, key: `mounts:${randomUUID()}` });
    const service = () => pluginPrivateSecretService(db, pluginId);

    it("encrypts at rest, survives restart, and isolates companies and installed plugins", async () => {
      const input = address();
      expect(await service().get(input)).toEqual({ version: 0, value: null });
      await service().set({ ...input, value, expectedVersion: 0 });
      const [row] = await db
        .select()
        .from(pluginSecrets)
        .where(eq(pluginSecrets.key, input.key));
      expect(JSON.stringify(row)).not.toContain(value);
      expect(
        await pluginPrivateSecretService(
          createDb(database.connectionString),
          pluginId,
        ).get(input),
      ).toEqual({ version: 1, value });
      expect(
        await service().get({ ...input, companyId: otherCompanyId }),
      ).toEqual({ version: 0, value: null });
      expect(
        await pluginPrivateSecretService(db, otherPluginId).get(input),
      ).toEqual({ version: 0, value: null });
      expect(
        await db
          .select()
          .from(companySecrets)
          .where(eq(companySecrets.companyId, companyId)),
      ).toEqual([]);
      expect(
        JSON.stringify(
          await db
            .select()
            .from(activityLog)
            .where(eq(activityLog.entityId, pluginId)),
        ),
      ).not.toContain(value);
    });
    it("rejects racing writes, rotates values and fences resurrection after removal", async () => {
      const input = address();
      const races = await Promise.allSettled([
        service().set({ ...input, expectedVersion: 0, value }),
        service().set({ ...input, expectedVersion: 0, value: "other" }),
      ]);
      expect(
        races.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        races.filter((result) => result.status === "rejected"),
      ).toHaveLength(1);
      await service().set({ ...input, expectedVersion: 1, value: "rotated" });
      expect(await service().get(input)).toEqual({
        version: 2,
        value: "rotated",
      });
      await service().set({ ...input, expectedVersion: 2, value: null });
      expect(await service().get(input)).toEqual({ version: 3, value: null });
      const [row] = await db
        .select()
        .from(pluginSecrets)
        .where(eq(pluginSecrets.key, input.key));
      expect(row.material).toBeNull();
      for (const expectedVersion of [0, 1, 2])
        await expect(
          service().set({ ...input, value, expectedVersion }),
        ).rejects.toThrow("version changed");
    });
    it("fails closed on swapped ciphertext or unavailable encryption and never echoes values", async () => {
      const input = address(),
        other = address();
      await service().set({ ...input, expectedVersion: 0, value });
      await service().set({ ...other, expectedVersion: 0, value });
      const [row] = await db
        .select()
        .from(pluginSecrets)
        .where(eq(pluginSecrets.key, input.key));
      await db
        .update(pluginSecrets)
        .set({ material: row.material })
        .where(eq(pluginSecrets.key, other.key));
      await expect(service().get(other)).rejects.toThrow(
        "Private plugin secret unavailable",
      );
      const spy = vi
        .spyOn(localEncryptedProvider, "createSecret")
        .mockRejectedValueOnce(new Error(value));
      try {
        await expect(
          service().set({ ...input, expectedVersion: 1, value }),
        ).rejects.toThrow(/^Private plugin secret storage unavailable$/);
      } finally {
        spy.mockRestore();
      }
      expect(await service().get(input)).toEqual({ version: 1, value });
    });
    it("validates scope, value sizes and expected versions", async () => {
      for (const patch of [
        { companyId: "bad" },
        { key: "../mounts" },
        { expectedVersion: -1 },
        { expectedVersion: 1.5 },
        { value: "" },
        { value: "a".repeat(131073) },
      ]) {
        await expect(
          service().set({ ...address(), value, expectedVersion: 0, ...patch }),
        ).rejects.toThrow(/Invalid private secret/);
      }
    });
  },
);
