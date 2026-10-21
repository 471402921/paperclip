import { describe, expect, it } from "vitest";
import { getConnectableAppDefinition } from "./app-definitions.js";
import { getAppDefinitionForApplicationKey, isConnectorFeatureEnabled, resolveConnectorAvailability } from "./connector-availability.js";
import { appDefinitionSchema } from "./validators/app-definition.js";

describe("connector availability", () => {
  const ordinary = getConnectableAppDefinition("notion")!;
  const gated = { ...ordinary, slug: "private-research", name: "Private Research", experimentalFeatureKey: "enableCases" as const };

  it("honors feature metadata for an arbitrary connector and leaves ungated connectors alone", () => {
    for (const settings of [undefined, null, {}, { enableCases: false }]) {
      expect(isConnectorFeatureEnabled(gated, settings)).toBe(false);
      expect(resolveConnectorAvailability(gated, settings).availability).toEqual({ available: false, reason: "Private Research is not available on this instance." });
      expect(isConnectorFeatureEnabled(ordinary, settings)).toBe(true);
      expect(resolveConnectorAvailability(ordinary, settings)).toBe(ordinary);
    }
    expect(isConnectorFeatureEnabled(gated, { enablePaperclipNotebook: true })).toBe(false);
    expect(resolveConnectorAvailability(gated, { enableCases: true })).toBe(gated);
    const unavailable = { ...gated, availability: { available: false, reason: "Provider unavailable" } };
    expect(resolveConnectorAvailability(unavailable, { enableCases: true })).toBe(unavailable);
  });

  it("validates the feature key and declares Notebook's hidden rollout in its manifest", () => {
    expect(appDefinitionSchema.parse(gated).experimentalFeatureKey).toBe("enableCases");
    expect(appDefinitionSchema.safeParse({ ...gated, experimentalFeatureKey: "typoFeature" }).success).toBe(false);
    const notebook = getConnectableAppDefinition("paperclip-notebook")!;
    expect(notebook.experimentalFeatureKey).toBe("enablePaperclipNotebook");
    expect(isConnectorFeatureEnabled(notebook, {})).toBe(false);
    expect(isConnectorFeatureEnabled(notebook, { enablePaperclipNotebook: true })).toBe(true);
  });

  it("resolves only exact trusted catalog application identities", () => {
    const uuid = "11111111-1111-4111-8111-111111111111";
    for (const slug of ["notion", "paperclip-notebook"]) {
      expect(getAppDefinitionForApplicationKey(slug)?.slug).toBe(slug);
      expect(getAppDefinitionForApplicationKey(`app-gallery:${slug}:${uuid}`)?.slug).toBe(slug);
      for (const key of [`prefix:${slug}`, `app-gallery:${slug}:short`, `app-gallery:${slug}:${uuid}:extra`, `app-gallery:${slug}-forged:${uuid}`, ` ${slug}`])
        expect(getAppDefinitionForApplicationKey(key)).toBeNull();
    }
    for (const key of [undefined, null, {}, "https://notebook.paperclip.app/mcp", `app-gallery:unknown:${uuid}`])
      expect(getAppDefinitionForApplicationKey(key)).toBeNull();
  });
});
