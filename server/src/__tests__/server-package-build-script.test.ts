import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageJsonPath = fileURLToPath(
  new URL("../../package.json", import.meta.url),
);
const runnerShimPath = fileURLToPath(
  new URL("../vendor/paperclip-runner/index.ts", import.meta.url),
);
const evidenceClassifierPath = fileURLToPath(
  new URL("../services/native-runtime/evidence-classifier.ts", import.meta.url),
);
const workspaceDiffReprojectionPath = fileURLToPath(
  new URL("../services/provider-trace-workspace-diff-reprojection.ts", import.meta.url),
);

describe("server package build script", () => {
  it("builds the compiled package entry during prepack", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.prepack).toBe(
      "pnpm run prepare:ui-dist && pnpm run build",
    );
  });

  it("copies static runtime asset directories into dist", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };
    const buildScript = packageJson.scripts?.build ?? "";

    expect(buildScript).toContain(
      "mkdir -p dist/onboarding-assets dist/built-ins",
    );
    expect(buildScript).toContain(
      "cp -R src/onboarding-assets/. dist/onboarding-assets/",
    );
    expect(buildScript).toContain("cp -R src/built-ins/. dist/built-ins/");
  });

  it("vendors the private runner runtime without a production workspace dependency", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(
      packageJson.dependencies?.["@paperclipai/paperclip-runner"],
    ).toBeUndefined();
    expect(packageJson.devDependencies?.["@paperclipai/paperclip-runner"]).toBe(
      "workspace:*",
    );
    expect(packageJson.scripts?.["prepare:runner-vendor"]).toBe(
      "pnpm --filter @paperclipai/paperclip-runner build",
    );
    expect(packageJson.scripts?.build).toContain(
      "cp -Rf ../packages/paperclip-runner/dist/. dist/vendor/paperclip-runner/",
    );
  });

  it("replaces an existing read-only image manifest with the build's copy step", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    const step = packageJson.scripts.build.split(" && ").find((command: string) =>
      command.includes("../packages/paperclip-runner/dist/."));
    expect(step).toBeDefined();
    const [command, ...args] = step.split(" ");
    const root = mkdtempSync(path.join(tmpdir(), "runner-vendor-copy-"));
    try {
      const relative = "remote-provider-packs/linux-x64/provider-pack.json";
      const source = path.join(root, "packages/paperclip-runner/dist", relative);
      const destination = path.join(root, "server/dist/vendor/paperclip-runner", relative);
      mkdirSync(path.dirname(source), { recursive: true });
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(source, "qualified image identity", { mode: 0o444 });
      writeFileSync(destination, "previous image identity", { mode: 0o444 });
      execFileSync(command, args, { cwd: path.join(root, "server") });
      expect(readFileSync(destination, "utf8")).toBe("qualified image identity");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("verifies vendored runner dependencies are mirrored before building", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    // See scripts/verify-runner-vendor-dependencies.mjs: packages/paperclip-runner
    // is vendored with a raw copy of its compiled dist/, so every runtime
    // dependency it imports must also be a direct dependency of server. This
    // check derives that requirement from an esbuild scan of the vendored
    // entry points instead of relying on a human to have kept a hand-copied
    // list in sync (the smol-toml incident in #13110/#13116).
    expect(packageJson.scripts?.build).toContain(
      "node scripts/verify-runner-vendor-dependencies.mjs",
    );
  });

  it("compiles the vendored Runner's TypeScript surface once per build", async () => {
    // prepare:runner-vendor runs the Runner's full build, and `pnpm -r build`
    // has already run it once by the time the server builds. Each extra
    // build:typescript inside that build (two tsc projects plus the eval-kernel
    // rebuild) costs about 7s on the CI Build job's critical path, twice.
    // Checks that read dist/ must call their script directly, the way
    // generate-replay-goldens.mjs already does, not through a `check:*`
    // wrapper that rebuilds first for standalone use.
    //
    // The Runner's build is scripts/build-runner-package.mjs, which runs the
    // TypeScript steps while cargo compiles and exports the step plan, so the
    // plan is read from the module rather than parsed out of a shell chain.
    const runnerRoot = new URL("../../../packages/paperclip-runner/", import.meta.url);
    const runner = JSON.parse(readFileSync(
      new URL("package.json", runnerRoot), "utf8",
    )) as { scripts: Record<string, string> };
    expect(runner.scripts.build).toBe("node scripts/build-runner-package.mjs");

    const plan = await import(new URL("scripts/build-runner-package.mjs", runnerRoot).href) as {
      STEPS_DURING_CARGO: ReadonlyArray<{ run?: string; node?: string[] }>;
      STAGE_BINARY_STEP: { node: string[] };
      STEPS_AFTER_BINARY: ReadonlyArray<{ run?: string; node?: string[] }>;
      describeStep: (step: { run?: string; node?: string[] }) => string;
    };
    const wrapped = plan.STEPS_DURING_CARGO
      .filter((step) => step.run)
      .map((step) => step.run as string);
    for (const name of wrapped) {
      expect(runner.scripts[name], `build step ${name}`).toBeDefined();
    }
    const compiles = (step: string) =>
      step === "build:typescript" || (runner.scripts[step] ?? "").includes("build:typescript");

    expect(wrapped.filter(compiles)).toEqual(["build:typescript"]);
    const steps = plan.STEPS_DURING_CARGO.map(plan.describeStep);
    expect(steps).toContain("node scripts/generate-semantic-contracts.mjs --check");
    expect(steps).toContain("node scripts/check-runner-workflow-traceability.mjs");
    expect(steps.indexOf("node scripts/generate-semantic-contracts.mjs --check"))
      .toBeGreaterThan(steps.indexOf("pnpm run build:typescript"));
    expect(steps.indexOf("node scripts/check-runner-workflow-traceability.mjs"))
      .toBeGreaterThan(steps.indexOf("pnpm run build:typescript"));
    // The binary the server vendors is staged by the build itself, after
    // cargo, and the steps that read it stay behind the staging step.
    expect(plan.describeStep(plan.STAGE_BINARY_STEP)).toBe("node scripts/stage-runner-binary.mjs");
    expect(plan.STEPS_AFTER_BINARY.map(plan.describeStep)).toEqual([
      "node scripts/generate-replay-goldens.mjs --check",
      "node scripts/generate-semantic-action-catalog.mjs --check",
    ]);
    expect([...plan.STEPS_DURING_CARGO, ...plan.STEPS_AFTER_BINARY].map(plan.describeStep))
      .not.toContain("pnpm run build:binary");
  });

  it("ships the pinned OpenCode dependency resolved by the vendored Runner", () => {
    const server = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    const runner = JSON.parse(readFileSync(new URL(
      "../../../packages/paperclip-runner/package.json", import.meta.url,
    ), "utf8"));
    // createRequire resolution is dynamic and is not covered by the import scan.
    expect(server.dependencies["opencode-ai"]).toBe("1.18.34");
    expect(server.dependencies["opencode-ai"]).toBe(runner.dependencies["opencode-ai"]);
  });

  it("loads runner source when the source server starts before workspace builds", () => {
    const shim = readFileSync(runnerShimPath, "utf8");

    expect(shim).toContain(
      '"../../../../packages/paperclip-runner/src/index.ts"',
    );
    expect(shim).not.toContain(
      'export * from "@paperclipai/paperclip-runner"',
    );
  });

  it("routes source-mode runtime imports through the runner shim", () => {
    for (const consumerPath of [
      evidenceClassifierPath,
      workspaceDiffReprojectionPath,
    ]) {
      const consumer = readFileSync(consumerPath, "utf8");

      expect(consumer).toContain('vendor/paperclip-runner/index.js"');
      expect(consumer).not.toContain('from "@paperclipai/paperclip-runner"');
    }
  });
});
