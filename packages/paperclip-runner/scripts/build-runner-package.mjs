#!/usr/bin/env node
// Build the Runner package with the Rust binary compiling while the
// TypeScript surface builds and its checks run.
//
// `pnpm run build` used to be one `&&` chain: seven TypeScript steps (about
// 17s on the CI Build job), then `cargo build` (about 36s with the dependency
// cache restored), then two checks that read the staged binary. Nothing in
// the first seven steps reads the binary or runner/target, and cargo reads
// nothing those steps write: its only non-Rust inputs are the committed
// fixtures and schemas under protocol/, which the steps check but never
// regenerate. So cargo starts first, the TypeScript steps run while it
// compiles, the binary is staged once both are done, and the last two steps
// keep their place after staging.
//
// This build sits on the critical path of `pnpm -r build`: every adapter,
// plugin package and the server wait for it.
//
// cargo saturates the four cores of the CI runner, so the TypeScript steps
// run at a lower scheduling priority: cargo keeps the cores it would have
// had alone and the steps fill whatever it leaves (the single-threaded tail
// of codegen and linking). Without that, the first measured run had cargo
// slow from 36s to 55s under the competition and the overlap saved nothing.
//
// PAPERCLIP_RUNNER_BUILD_SERIAL=1 runs cargo after the TypeScript steps
// instead, for a machine that cannot afford both at once.

import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const CARGO_BUILD_ARGS = [
  "build",
  "--release",
  "--manifest-path",
  "runner/Cargo.toml",
  "--locked",
  "-p",
  "paperclip-runner-core",
  "--bin",
  "paperclip-runnerd",
];

// Steps that run while cargo compiles, in this order. A `run` entry names a
// script in package.json. A `node` entry runs a script directly because the
// matching `check:*` wrapper rebuilds the TypeScript surface first for
// standalone use, and this build compiles it exactly once.
export const STEPS_DURING_CARGO = Object.freeze([
  { run: "check:protocol-manifest" },
  { run: "build:typescript" },
  { run: "check:capability-contract" },
  { run: "check:capability-inventory" },
  { run: "check:protocol-coverage" },
  { node: ["scripts/generate-semantic-contracts.mjs", "--check"] },
  { node: ["scripts/check-runner-workflow-traceability.mjs"] },
]);

// Runs after cargo has exited successfully and before anything reads the binary.
export const STAGE_BINARY_STEP = Object.freeze({ node: ["scripts/stage-runner-binary.mjs"] });

// Steps that read the staged binary, in this order.
export const STEPS_AFTER_BINARY = Object.freeze([
  { node: ["scripts/generate-replay-goldens.mjs", "--check"] },
  { node: ["scripts/generate-semantic-action-catalog.mjs", "--check"] },
]);

export const TIMING_LINE_PREFIX = "paperclip.runner-build.timing.v1";

// Scheduling priority for the TypeScript steps while cargo runs. On POSIX
// this is the nice value; children of a step (the nested pnpm, tsc, node)
// inherit it. Raising a process's own nice value needs no privilege.
export const STEP_PRIORITY_DURING_CARGO = os.constants.priority.PRIORITY_BELOW_NORMAL;

const STOP_GRACE_MS = 5_000;

export function describeStep(step) {
  return step.run ? `pnpm run ${step.run}` : `node ${step.node.join(" ")}`;
}

export class RunnerBuildError extends Error {
  constructor(name, result) {
    const reason = result.error
      ? `could not start (${result.error.message})`
      : result.signal
        ? `was stopped by ${result.signal}`
        : `exited with code ${result.code}`;
    super(`${name} ${reason}`);
    this.name = "RunnerBuildError";
    this.step = name;
    this.result = result;
  }
}

function pnpmCommand(env) {
  // pnpm sets npm_execpath to its own entry point while it runs this script,
  // so a nested `pnpm run` uses the same pnpm. That entry point is a
  // JavaScript file under corepack or an npm install, and a native
  // executable under the standalone pnpm build: only the former goes
  // through Node (same rule as the CLI's resolvePnpmInstallInvocation).
  // Outside pnpm, use the one on PATH; Windows needs a shell to resolve the
  // .cmd shim.
  const execPath = env.npm_execpath;
  if (execPath && /pnpm/i.test(path.basename(execPath))) {
    return /\.(cjs|mjs|js)$/i.test(execPath)
      ? { command: process.execPath, args: [execPath] }
      : { command: execPath, args: [] };
  }
  return process.platform === "win32"
    ? { command: "pnpm", args: [], shell: true }
    : { command: "pnpm", args: [] };
}

export function defaultCommandFor(step, env = process.env) {
  if (step.node) {
    return { command: process.execPath, args: [...step.node] };
  }
  const pnpm = pnpmCommand(env);
  return { command: pnpm.command, args: [...pnpm.args, "run", step.run], shell: pnpm.shell };
}

export function defaultCargoCommand() {
  return { command: "cargo", args: [...CARGO_BUILD_ARGS] };
}

function launch({ command, args, shell }, { cwd, env, priority }) {
  const child = spawn(command, args, { cwd, env, stdio: "inherit", shell: shell === true });
  let priorityApplied = false;
  if (priority !== undefined && child.pid) {
    try {
      // Never raise the child above the parent: a parent already running
      // at a lower priority would need privilege to do that.
      os.setPriority(child.pid, Math.max(os.getPriority(), priority));
      priorityApplied = true;
    } catch {
      // The child is already gone or the platform refused; it runs at the
      // parent's priority, which is what happened before this script.
    }
  }
  let settled = null;
  const exit = new Promise((resolve) => {
    const settle = (result) => {
      if (!settled) {
        settled = result;
        resolve(result);
      }
    };
    child.once("error", (error) => settle({ error }));
    child.once("exit", (code, signal) => settle({ code, signal }));
  });
  return { child, exit, result: () => settled, priorityApplied };
}

const succeeded = (result) => !result.error && result.code === 0 && !result.signal;

async function stop(running) {
  if (running.result()) return running.result();
  try {
    running.child.kill("SIGTERM");
  } catch {
    // Already gone.
  }
  // The grace timer is cleared once the child exits so a build that failed
  // early does not keep the process alive for the full grace period.
  let handle = null;
  const timer = new Promise((resolve) => {
    handle = setTimeout(resolve, STOP_GRACE_MS, "timeout");
  });
  try {
    if ((await Promise.race([running.exit, timer])) === "timeout" && !running.result()) {
      try {
        running.child.kill("SIGKILL");
      } catch {
        // Already gone.
      }
    }
  } finally {
    clearTimeout(handle);
  }
  return running.exit;
}

/**
 * Run the Runner build. `commandFor` and `cargoCommand` exist so tests can
 * stand in for pnpm and cargo with local Node processes.
 */
export async function runRunnerBuild({
  cwd = packageRoot,
  env = process.env,
  serial = env.PAPERCLIP_RUNNER_BUILD_SERIAL === "1",
  commandFor = (step) => defaultCommandFor(step, env),
  cargoCommand = defaultCargoCommand,
  log = (line) => process.stderr.write(`${line}\n`),
} = {}) {
  const startedAt = Date.now();
  const timing = { cargoStartedAt: null, cargoEndedAt: null, stepsEndedAt: null };
  let cargo = null;
  // Steps that overlap cargo yield the cores to it; everything else runs at
  // the parent's priority. Set from the first overlapped step that starts.
  let stepsPriority = "normal";

  const startCargo = () => {
    const spec = cargoCommand();
    log(`[runner build] ${spec.command} ${spec.args.join(" ")}`);
    timing.cargoStartedAt = Date.now();
    cargo = launch(spec, { cwd, env });
    void cargo.exit.then(() => {
      timing.cargoEndedAt = Date.now();
    });
  };

  const runStep = async (step, { duringCargo = false } = {}) => {
    const name = describeStep(step);
    log(`[runner build] ${name}`);
    const running = launch(commandFor(step), {
      cwd,
      env,
      priority: duringCargo ? STEP_PRIORITY_DURING_CARGO : undefined,
    });
    if (duringCargo && running.priorityApplied) stepsPriority = "below_normal";
    const result = await running.exit;
    if (!succeeded(result)) throw new RunnerBuildError(name, result);
  };

  const cargoFailure = () => {
    const result = cargo?.result();
    return result && !succeeded(result) ? new RunnerBuildError("cargo build", result) : null;
  };

  if (!serial) startCargo();
  try {
    for (const step of STEPS_DURING_CARGO) {
      // A cargo failure that has already surfaced ends the build before the
      // next step, instead of after the whole TypeScript chain.
      const failure = cargoFailure();
      if (failure) throw failure;
      await runStep(step, { duringCargo: !serial });
    }
  } catch (error) {
    if (cargo) await stop(cargo);
    throw error;
  }
  timing.stepsEndedAt = Date.now();

  if (serial) startCargo();
  const cargoResult = await cargo.exit;
  if (!succeeded(cargoResult)) throw new RunnerBuildError("cargo build", cargoResult);

  await runStep(STAGE_BINARY_STEP);
  for (const step of STEPS_AFTER_BINARY) await runStep(step);

  const endedAt = Date.now();
  const summary = {
    mode: serial ? "serial" : "overlap",
    steps_priority: stepsPriority,
    cargo_ms: timing.cargoEndedAt - timing.cargoStartedAt,
    steps_ms: timing.stepsEndedAt - startedAt,
    // How long the build waited on cargo alone after the TypeScript steps.
    cargo_wait_ms: Math.max(0, timing.cargoEndedAt - timing.stepsEndedAt),
    total_ms: endedAt - startedAt,
  };
  log(
    `${TIMING_LINE_PREFIX},${Object.entries(summary)
      .map(([key, value]) => `${key}:${value}`)
      .join(",")}`,
  );
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runRunnerBuild().catch((error) => {
    process.stderr.write(`[runner build] ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
