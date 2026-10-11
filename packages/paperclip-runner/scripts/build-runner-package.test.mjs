import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  CARGO_BUILD_ARGS,
  RunnerBuildError,
  STAGE_BINARY_STEP,
  STEPS_AFTER_BINARY,
  STEPS_DURING_CARGO,
  TIMING_LINE_PREFIX,
  defaultCargoCommand,
  defaultCommandFor,
  describeStep,
  runRunnerBuild,
} from "./build-runner-package.mjs";

// Every stand-in appends "<name> start" and "<name> end" to a shared event
// log, so a test can assert what ran before what. Its arguments:
//   log, name, exit code, marker to write at start, file to wait for before
//   ending, marker to write at the end. The cargo stand-in also records its
//   pid so a test can check that the build stopped it.
const STAND_IN = `
const fs = require("node:fs");
const [log, name, exitCode, startMarker, waitFor, endMarker] = process.argv.slice(1);
const append = (line) => fs.appendFileSync(log, line + "\\n");
if (name === "cargo") fs.writeFileSync(log + ".cargo.pid", String(process.pid));
append(name + " start");
if (startMarker) fs.writeFileSync(startMarker, "");
const deadline = Date.now() + 15000;
while (waitFor && !fs.existsSync(waitFor)) {
  if (Date.now() > deadline) { append(name + " timeout"); process.exit(3); }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
}
if (endMarker) fs.writeFileSync(endMarker, "");
append(name + " end");
process.exit(Number(exitCode));
`;

const FIRST_STEP = describeStep(STEPS_DURING_CARGO[0]);
const RELEASE_STEP = describeStep(STEPS_DURING_CARGO[STEPS_DURING_CARGO.length - 1]);

function harness({ exitCodes = {}, cargoExit = 0, cargoWaitsForRelease = true } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "runner-build-"));
  const log = path.join(root, "events.log");
  const cargoStarted = path.join(root, "cargo.started");
  const release = path.join(root, "release");
  const standIn = (name, exitCode, startMarker = "", waitFor = "", endMarker = "") => ({
    command: process.execPath,
    args: ["-e", STAND_IN, log, name, String(exitCode), startMarker, waitFor, endMarker],
  });
  return {
    root,
    log,
    events: () => (existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : []),
    cargoPid: () => Number(readFileSync(`${log}.cargo.pid`, "utf8")),
    options: {
      cwd: root,
      env: { ...process.env, PAPERCLIP_RUNNER_BUILD_SERIAL: "" },
      log: () => {},
      cargoCommand: () => standIn("cargo", cargoExit, cargoStarted, cargoWaitsForRelease ? release : ""),
      commandFor: (step) => {
        const name = describeStep(step);
        // The first step waits for cargo's start marker so the event order
        // between two processes started back to back is not left to chance.
        // The last step during cargo releases the cargo stand-in.
        return standIn(
          name,
          exitCodes[name] ?? 0,
          "",
          name === FIRST_STEP && cargoWaitsForRelease ? cargoStarted : "",
          name === RELEASE_STEP ? release : "",
        );
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

test("cargo starts before the first TypeScript step and is joined before the binary is staged", async () => {
  const h = harness();
  try {
    const summary = await runRunnerBuild(h.options);
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

test("a failing TypeScript step stops cargo and names the step", async () => {
  const failing = describeStep(STEPS_DURING_CARGO[1]);
  const h = harness({ exitCodes: { [failing]: 7 } });
  try {
    await assert.rejects(runRunnerBuild(h.options), (error) => {
      assert.ok(error instanceof RunnerBuildError);
      assert.equal(error.step, failing);
      assert.match(error.message, /exited with code 7/);
      return true;
    });
    assert.ok(await waitUntilGone(h.cargoPid()), "cargo stand-in outlived the failed build");
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
  const h = harness({ cargoExit: 2, cargoWaitsForRelease: false });
  // The cargo stand-in fails at once and leaves a marker; the first step
  // holds until that marker exists, so cargo's failure is known before the
  // second step would start.
  const cargoDone = path.join(h.root, "cargo.done");
  const innerCargo = h.options.cargoCommand;
  h.options.cargoCommand = () => {
    const spec = innerCargo();
    spec.args[spec.args.length - 1] = cargoDone;
    return spec;
  };
  const innerStep = h.options.commandFor;
  h.options.commandFor = (step) => {
    const spec = innerStep(step);
    if (describeStep(step) === FIRST_STEP) spec.args[spec.args.length - 2] = cargoDone;
    return spec;
  };
  try {
    await assert.rejects(runRunnerBuild(h.options), (error) => {
      assert.equal(error.step, "cargo build");
      return true;
    });
    const events = h.events();
    assert.ok(events.includes(`${FIRST_STEP} end`), `first step should have run to its end: ${events.join(" | ")}`);
    assert.ok(!events.some((line) => line.startsWith(describeStep(STEPS_DURING_CARGO[1]))), "the second step ran after cargo had failed");
  } finally {
    h.cleanup();
  }
});

test("PAPERCLIP_RUNNER_BUILD_SERIAL=1 runs cargo after the TypeScript steps", async () => {
  const h = harness({ cargoWaitsForRelease: false });
  h.options.env = { ...process.env, PAPERCLIP_RUNNER_BUILD_SERIAL: "1" };
  try {
    const summary = await runRunnerBuild(h.options);
    const events = h.events();
    assert.ok(events.indexOf(`${RELEASE_STEP} end`) < events.indexOf("cargo start"));
    assert.ok(events.indexOf("cargo end") < events.indexOf(`${describeStep(STAGE_BINARY_STEP)} start`));
    assert.equal(summary.mode, "serial");
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
});

test("nested pnpm runs use the pnpm that started the build", () => {
  const viaPnpm = defaultCommandFor({ run: "build:typescript" }, { npm_execpath: "/opt/pnpm/bin/pnpm.cjs" });
  assert.deepEqual(viaPnpm, { command: process.execPath, args: ["/opt/pnpm/bin/pnpm.cjs", "run", "build:typescript"], shell: undefined });
  const viaPath = defaultCommandFor({ run: "build:typescript" }, {});
  assert.equal(viaPath.command, "pnpm");
  assert.deepEqual(viaPath.args, ["run", "build:typescript"]);
  const direct = defaultCommandFor({ node: ["scripts/stage-runner-binary.mjs"] }, {});
  assert.deepEqual(direct, { command: process.execPath, args: ["scripts/stage-runner-binary.mjs"] });
});
