import { and, eq } from "drizzle-orm";
import { pluginSecrets, type Db } from "@paperclipai/db";
import { localEncryptedProvider } from "../secrets/local-encrypted-provider.js";
import { conflict, unprocessable } from "../errors.js";
import { persistActivity } from "./activity-log.js";

type Address = { companyId: string; key: string };
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;

export function pluginPrivateSecretService(db: Db, pluginId: string) {
  function validate(input: Address) {
    if (
      !uuid.test(input.companyId) ||
      !uuid.test(pluginId) ||
      typeof input.key !== "string" ||
      !/^[a-z][a-z0-9_.:-]{0,159}$/.test(input.key)
    ) {
      throw unprocessable("Invalid private secret scope");
    }
  }
  const where = (input: Address) =>
    and(
      eq(pluginSecrets.companyId, input.companyId),
      eq(pluginSecrets.pluginId, pluginId),
      eq(pluginSecrets.key, input.key),
    );
  return {
    async get(
      input: Address,
    ): Promise<{ version: number; value: string | null }> {
      validate(input);
      const [row] = await db.select().from(pluginSecrets).where(where(input));
      if (!row?.material) return { version: row?.version ?? 0, value: null };
      try {
        const decoded = JSON.parse(
          await localEncryptedProvider.resolveVersion({
            material: row.material,
            externalRef: null,
          }),
        );
        if (
          decoded.companyId !== input.companyId ||
          decoded.pluginId !== pluginId ||
          decoded.key !== input.key ||
          decoded.version !== row.version ||
          typeof decoded.value !== "string"
        )
          throw new Error();
        return { version: row.version, value: decoded.value };
      } catch {
        throw new Error("Private plugin secret unavailable");
      }
    },
    async set(
      input: Address & { value: string | null; expectedVersion: number },
    ): Promise<{ version: number }> {
      validate(input);
      if (
        !Number.isSafeInteger(input.expectedVersion) ||
        input.expectedVersion < 0 ||
        input.expectedVersion >= 2147483647 ||
        (input.value !== null &&
          (typeof input.value !== "string" ||
            !input.value.trim() ||
            Buffer.byteLength(input.value) > 131072))
      )
        throw unprocessable("Invalid private secret update");
      const version = input.expectedVersion + 1;
      let material: Record<string, unknown> | null = null;
      if (input.value !== null) {
        try {
          material = (
            await localEncryptedProvider.createSecret({
              value: JSON.stringify({
                companyId: input.companyId,
                pluginId,
                key: input.key,
                version,
                value: input.value,
              }),
            })
          ).material;
        } catch {
          throw new Error("Private plugin secret storage unavailable");
        }
      }
      return db.transaction(async (tx) => {
        const values = {
          companyId: input.companyId,
          pluginId,
          key: input.key,
          version,
          material,
          updatedAt: new Date(),
        };
        const rows =
          input.expectedVersion === 0
            ? await tx
                .insert(pluginSecrets)
                .values(values)
                .onConflictDoNothing()
                .returning()
            : await tx
                .update(pluginSecrets)
                .set({ version, material, updatedAt: values.updatedAt })
                .where(
                  and(
                    where(input),
                    eq(pluginSecrets.version, input.expectedVersion),
                  ),
                )
                .returning();
        if (!rows.length)
          throw conflict("Private plugin secret version changed");
        await persistActivity(tx as unknown as Db, {
          companyId: input.companyId,
          actorType: "plugin",
          actorId: pluginId,
          action:
            input.value === null
              ? "plugin.private_secret.removed"
              : "plugin.private_secret.saved",
          entityType: "plugin",
          entityId: pluginId,
          details: { key: input.key, version },
        });
        return { version };
      });
    },
  };
}
