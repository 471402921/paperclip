import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  CARGO_BUILD_ARGS,
  RunnerBuildError,
  STAGE_BINARY_STEP,
  STEPS_AFTER_BINARY,
  STEPS_DURING_CARGO,
  STEP_PRIORITY_DURING_CARGO,
  TIMING_LINE_PREFIX,
  defaultCargoCommand,
  defaultCommandFor,
  describeStep,
  runRunnerBuild,
} from "./build-runner-package.mjs";

// Every stand-in appends "<name> start", "<name> priority <nice>" and
// "<name> end" to a shared event log, so a test can assert what ran before
// what and at which scheduling priority. Its arguments, after the log and
// the name: exit code, marker to write at start, file to wait for before
// logging its start, file to wait for before ending, marker to write at the
// end. Waiting before the start line is what makes the order between two
// processes launched back to back deterministic. The cargo stand-in also
// records its pid so a test can check that the build stopped it.
const STAND_IN = `
const fs = require("node:fs");
const os = require("node:os");
const [log, name, exitCode, startMarker, waitBeforeStart, waitBeforeEnd, endMarker] = process.argv.slice(1);
const append = (line) => fs.appendFileSync(log, line + "\\n");
const waitFor = (file) => {
  const deadline = Date.now() + 15000;
  while (file && !fs.existsSync(file)) {
    if (Date.now() > deadline) { append(name + " timeout"); process.exit(3); }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
  }
};
if (name === "cargo") fs.writeFileSync(log + ".cargo.pid", String(process.pid));
if (startMarker) fs.writeFileSync(startMarker, "");
waitFor(waitBeforeStart);
append(name + " start");
append(name + " priority " + os.getPriority());
waitFor(waitBeforeEnd);
if (endMarker) fs.writeFileSync(endMarker, "");
append(name + " end");
process.exit(Number(exitCode));
`;

const FIRST_STEP = describeStep(STEPS_DURING_CARGO[0]);
const RELEASE_STEP = describeStep(STEPS_DURING_CARGO[STEPS_DURING_CARGO.length - 1]);

function harness({ exitCodes = {}, cargoExit = 0, cargoWaitsForRelease = true, cargoEndMarker = "", firstStepWaitsFor } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "runner-build-"));
  const log = path.join(root, "events.log");
  const cargoStarted = path.join(root, "cargo.started");
  const release = path.join(root, "release");
  const launches = [];
  const standIn = (name, exitCode, { startMarker = "", waitBeforeStart = "", waitBeforeEnd = "", endMarker = "" } = {}) => ({
    command: process.execPath,
    args: ["-e", STAND_IN, log, name, String(exitCode), startMarker, waitBeforeStart, waitBeforeEnd, endMarker],
  });
  return {
    root,
    log,
    launches,
    events: () => (existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : []),
    priorityOf(name) {
      const line = this.events().find((entry) => entry.startsWith(`${name} priority `));
      assert.ok(line, `missing priority line for ${name}`);
      return Number(line.slice(`${name} priority `.length));
    },
    cargoPid: () => Number(readFileSync(`${log}.cargo.pid`, "utf8")),
    options: {
      cwd: root,
      env: { ...process.env, PAPERCLIP_RUNNER_BUILD_SERIAL: "" },
      log: () => {},
      cargoCommand: () => {
        launches.push("cargo");
        return standIn("cargo", cargoExit, {
          startMarker: cargoStarted,
          waitBeforeEnd: cargoWaitsForRelease ? release : "",
          endMarker: cargoEndMarker,
        });
      },
      commandFor: (step) => {
        const name = describeStep(step);
        launches.push(name);
        // The first step logs its start only once cargo's start marker
        // exists; the last step during cargo releases the cargo stand-in.
        return standIn(name, exitCodes[name] ?? 0, {
          waitBeforeStart:
            name === FIRST_STEP ? (firstStepWaitsFor ?? (cargoWaitsForRelease ? cargoStarted : "")) : "",
          endMarker: name === RELEASE_STEP ? release : "",
        });
      },
    },
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
};

async function waitUntilGone(pid) {
  const deadline = Date.now() + 10_000;
  while (alive(pid) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return !alive(pid);
}

const activeTimeouts = () => process.getActiveResourcesInfo().filter((kind) => kind === "Timeout").length;

test("cargo starts before the first TypeScript step and is joined before the binary is staged", async () => {
  const h = harness();
  try {
    const summary = await runRunnerBuild(h.options);
    // What the build controls: it launched cargo before it launched any step.
    assert.deepEqual(h.launches.slice(0, 2), ["cargo", FIRST_STEP]);
    const events = h.events();
    const at = (line) => {
      const index = events.indexOf(line);
      assert.notEqual(index, -1, `missing event ${line} in ${events.join(" | ")}`);
      return index;
    };
    assert.ok(at("cargo start") < at(`${FIRST_STEP} start`), "cargo started after the first step");
    for (let i = 1; i < STEPS_DURING_CARGO.length; i += 1) {
      assert.ok(
        at(`${describeStep(STEPS_DURING_CARGO[i - 1])} end`) < at(`${describeStep(STEPS_DURING_CARGO[i])} start`),
        "TypeScript steps ran out of order",
      );
    }
    // cargo was still running while the steps ran: it only ends once the last step releases it.
    assert.ok(at(`${RELEASE_STEP} start`) < at("cargo end"), "cargo ended before the steps finished");
    assert.ok(at("cargo end") < at(`${describeStep(STAGE_BINARY_STEP)} start`), "binary staged before cargo ended");
    const afterNames = STEPS_AFTER_BINARY.map(describeStep);
    assert.ok(at(`${describeStep(STAGE_BINARY_STEP)} end`) < at(`${afterNames[0]} start`));
    assert.ok(at(`${afterNames[0]} end`) < at(`${afterNames[1]} start`));
    assert.equal(summary.mode, "overlap");
    for (const key of ["cargo_ms", "steps_ms", "cargo_wait_ms", "total_ms"]) {
      assert.equal(typeof summary[key], "number", key);
      assert.ok(summary[key] >= 0, key);
    }
  } finally {
    h.cleanup();
  }
});

test("the TypeScript steps yield the cores to cargo while it runs", async () => {
  const h = harness();
  try {
    const summary = await runRunnerBuild(h.options);
    const parent = os.getPriority();
    const expectedStepPriority = Math.max(parent, STEP_PRIORITY_DURING_CARGO);
    assert.equal(h.priorityOf("cargo"), parent, "cargo must keep the parent's priority");
    for (const step of STEPS_DURING_CARGO) {
      assert.equal(h.priorityOf(describeStep(step)), expectedStepPriority, `${describeStep(step)} priority`);
    }
    // Nothing competes with the steps after cargo: they run at the parent's priority.
    for (const step of [STAGE_BINARY_STEP, ...STEPS_AFTER_BINARY]) {
      assert.equal(h.priorityOf(describeStep(step)), parent, `${describeStep(step)} priority`);
    }
    assert.equal(summary.steps_priority, "below_normal");
  } finally {
    h.cleanup();
  }
});

test("a failing TypeScript step stops cargo and names the step", async () => {
  const failing = describeStep(STEPS_DURING_CARGO[1]);
  const h = harness({ exitCodes: { [failing]: 7 } });
  const timeoutsBefore = activeTimeouts();
  try {
    await assert.rejects(runRunnerBuild(h.options), (error) => {
      assert.ok(error instanceof RunnerBuildError);
      assert.equal(error.step, failing);
      assert.match(error.message, /exited with code 7/);
      return true;
    });
    assert.ok(await waitUntilGone(h.cargoPid()), "cargo stand-in outlived the failed build");
    // The stop grace timer is cleared once cargo is gone, so a failed build
    // does not keep the process alive for the grace period.
    assert.equal(activeTimeouts(), timeoutsBefore, "the stop grace timer is still pending");
    const events = h.events();
    assert.ok(!events.includes("cargo end"), "cargo ran to completion after the failure");
    assert.ok(!events.some((line) => line.startsWith(describeStep(STEPS_DURING_CARGO[2]))), "a later step ran after the failure");
    assert.ok(!events.some((line) => line.startsWith(describeStep(STAGE_BINARY_STEP))), "the binary was staged after the failure");
  } finally {
    h.cleanup();
  }
});

test("a failing cargo build fails the build before the binary is staged", async () => {
  const h = harness({ cargoExit: 2, cargoWaitsForRelease: false });
  try {
    await assert.rejects(runRunnerBuild(h.options), (error) => {
      assert.ok(error instanceof RunnerBuildError);
      assert.equal(error.step, "cargo build");
      assert.match(error.message, /exited with code 2/);
      return true;
    });
    const events = h.events();
    assert.ok(events.includes("cargo end"));
    assert.ok(!events.some((line) => line.startsWith(describeStep(STAGE_BINARY_STEP))), "the binary was staged after cargo failed");
    assert.ok(!events.some((line) => line.startsWith(describeStep(STEPS_AFTER_BINARY[0]))), "a post-binary step ran after cargo failed");
  } finally {
    h.cleanup();
  }
});

test("a cargo failure that surfaces early ends the TypeScript chain at the next step", async () => {
  // The cargo stand-in fails at once and leaves a marker; the first step
  // holds until that marker exists, so cargo's failure is known before the
  // second step would start.
  const cargoDone = path.join(os.tmpdir(), `runner-build-cargo-done-${process.pid}-${Date.now()}`);
  const h = harness({ cargoExit: 2, cargoWaitsForRelease: false, cargoEndMarker: cargoDone, firstStepWaitsFor: cargoDone });
  try {
    await assert.rejects(runRunnerBuild(h.options), (error) => {
      assert.equal(error.step, "cargo build");
      return true;
    });
    const events = h.events();
    assert.ok(events.includes(`${FIRST_STEP} end`), `first step should have run to its end: ${events.join(" | ")}`);
    assert.ok(!events.some((line) => line.startsWith(describeStep(STEPS_DURING_CARGO[1]))), "the second step ran after cargo had failed");
  } finally {
    rmSync(cargoDone, { force: true });
    h.cleanup();
  }
});

test("PAPERCLIP_RUNNER_BUILD_SERIAL=1 runs cargo after the TypeScript steps at one priority", async () => {
  const h = harness({ cargoWaitsForRelease: false });
  h.options.env = { ...process.env, PAPERCLIP_RUNNER_BUILD_SERIAL: "1" };
  try {
    const summary = await runRunnerBuild(h.options);
    const events = h.events();
    assert.ok(events.indexOf(`${RELEASE_STEP} end`) < events.indexOf("cargo start"));
    assert.ok(events.indexOf("cargo end") < events.indexOf(`${describeStep(STAGE_BINARY_STEP)} start`));
    assert.equal(h.launches[0], FIRST_STEP);
    const parent = os.getPriority();
    for (const step of STEPS_DURING_CARGO) {
      assert.equal(h.priorityOf(describeStep(step)), parent, `${describeStep(step)} priority`);
    }
    assert.equal(summary.mode, "serial");
    assert.equal(summary.steps_priority, "normal");
  } finally {
    h.cleanup();
  }
});

test("the plan compiles the TypeScript surface once and keeps the binary readers after staging", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.scripts.build, "node scripts/build-runner-package.mjs");
  const wrapped = STEPS_DURING_CARGO.filter((step) => step.run).map((step) => step.run);
  for (const name of wrapped) assert.ok(packageJson.scripts[name], `missing script ${name}`);
  const compiles = (name) => name === "build:typescript" || packageJson.scripts[name].includes("build:typescript");
  assert.deepEqual(wrapped.filter(compiles), ["build:typescript"]);
  for (const step of [...STEPS_DURING_CARGO, STAGE_BINARY_STEP, ...STEPS_AFTER_BINARY]) {
    assert.ok(!step.run || step.run !== "build:binary", "the plan must not run build:binary; the build runs cargo itself");
    if (step.node) assert.ok(existsSync(new URL(`../${step.node[0]}`, import.meta.url)), `missing ${step.node[0]}`);
  }
  // build:binary stays the standalone way to compile and stage the binary,
  // and the build runs the same cargo invocation.
  const standalone = packageJson.scripts["build:binary"];
  assert.equal(standalone, `cargo ${CARGO_BUILD_ARGS.join(" ")} && node ${STAGE_BINARY_STEP.node.join(" ")}`);
  assert.deepEqual(defaultCargoCommand(), { command: "cargo", args: CARGO_BUILD_ARGS });
  assert.deepEqual(STEPS_AFTER_BINARY.map(describeStep), [
    "node scripts/generate-replay-goldens.mjs --check",
    "node scripts/generate-semantic-action-catalog.mjs --check",
  ]);
  assert.equal(typeof TIMING_LINE_PREFIX, "string");
  assert.equal(STEP_PRIORITY_DURING_CARGO, os.constants.priority.PRIORITY_BELOW_NORMAL);
});

test("nested pnpm runs use the pnpm that started the build", () => {
  // corepack and an npm-installed pnpm point npm_execpath at a JavaScript entry.
  const viaScript = defaultCommandFor({ run: "build:typescript" }, { npm_execpath: "/opt/pnpm/bin/pnpm.cjs" });
  assert.deepEqual(viaScript, { command: process.execPath, args: ["/opt/pnpm/bin/pnpm.cjs", "run", "build:typescript"], shell: undefined });
  // The standalone pnpm build points it at a native executable, which Node cannot run.
  const viaExecutable = defaultCommandFor({ run: "build:typescript" }, { npm_execpath: "/home/ci/.local/share/pnpm/pnpm" });
  assert.deepEqual(viaExecutable, { command: "/home/ci/.local/share/pnpm/pnpm", args: ["run", "build:typescript"], shell: undefined });
  const viaWindowsExecutable = defaultCommandFor({ run: "build:typescript" }, { npm_execpath: "C:\\pnpm\\pnpm.exe" });
  assert.deepEqual(viaWindowsExecutable, { command: "C:\\pnpm\\pnpm.exe", args: ["run", "build:typescript"], shell: undefined });
  const viaPath = defaultCommandFor({ run: "build:typescript" }, {});
  assert.equal(viaPath.command, "pnpm");
  assert.deepEqual(viaPath.args, ["run", "build:typescript"]);
  const direct = defaultCommandFor({ node: ["scripts/stage-runner-binary.mjs"] }, {});
  assert.deepEqual(direct, { command: process.execPath, args: ["scripts/stage-runner-binary.mjs"] });
});
