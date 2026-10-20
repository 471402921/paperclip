import { describe, expect, it } from "vitest";
import { createTestHarness } from "../src/testing.js";
import type { PaperclipPluginManifestV1 } from "../src/types.js";

const manifest: PaperclipPluginManifestV1 = {
  id: "fixture.private-secrets",
  apiVersion: 1,
  version: "1.0.0",
  displayName: "Secrets",
  description: "Fixture",
  author: "Tests",
  categories: ["automation"],
  capabilities: ["secrets.manage-private"],
  entrypoints: {},
};

describe("private credential test harness", () => {
  it("isolates companies, fences stale writes and erases values", async () => {
    const h = createTestHarness({ manifest }),
      input = { companyId: "company-a", key: "mounts:project" };
    expect(await h.ctx.secrets.getPrivate(input)).toEqual({
      version: 0,
      value: null,
    });
    await h.ctx.secrets.setPrivate({
      ...input,
      value: "token",
      expectedVersion: 0,
    });
    expect(
      await h.ctx.secrets.getPrivate({ ...input, companyId: "company-b" }),
    ).toEqual({ version: 0, value: null });
    await expect(
      h.ctx.secrets.setPrivate({
        ...input,
        value: "stale",
        expectedVersion: 0,
      }),
    ).rejects.toThrow("version changed");
    await h.ctx.secrets.setPrivate({
      ...input,
      value: null,
      expectedVersion: 1,
    });
    expect(await h.ctx.secrets.getPrivate(input)).toEqual({
      version: 2,
      value: null,
    });
    await expect(
      h.ctx.secrets.setPrivate({
        ...input,
        value: "stale",
        expectedVersion: 1,
      }),
    ).rejects.toThrow("version changed");
    expect(
      h.getState({
        scopeKind: "company",
        scopeId: input.companyId,
        stateKey: input.key,
      }),
    ).toBeUndefined();
  });
  it("requires explicit private credential authority", async () => {
    const h = createTestHarness({
      manifest: { ...manifest, capabilities: ["secrets.read-ref"] },
    });
    await expect(
      h.ctx.secrets.getPrivate({ companyId: "a", key: "mounts:project" }),
    ).rejects.toThrow();
    await expect(
      h.ctx.secrets.setPrivate({
        companyId: "a",
        key: "mounts:project",
        value: "token",
        expectedVersion: 0,
      }),
    ).rejects.toThrow();
  });
});
