import { createRequire } from "node:module";
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import {
  acpxBootstrapBlockedError,
  acpxSidecarErrorCode,
  enqueueAcpxSidecarInput,
  recordAcpxBootstrapFailure,
} from "./acpx-sidecar-input.js";

describe("ACPX sidecar input sequencing", () => {
  it("classifies a retired tool callback without copying provider text into its identity", () => {
    const error = Object.assign(new Error("private-token-canary"), { code: "ACPX_TOOL_CALL_STALE" });
    expect(acpxSidecarErrorCode(error)).toBe("ACPX_TOOL_CALL_STALE");
    error.code = "ACPX_TOOL_CALL_STALE_EXTRA";
    expect(acpxSidecarErrorCode(error)).toBe("acpx_sidecar_command_failed");
  });
  it("drains initialize, session.open, and suspend in input order", async () => {
    const events: string[] = [];
    let pending = Promise.resolve();
    for (const command of ["initialize", "session.open", "session.suspend"]) {
      pending = enqueueAcpxSidecarInput(
        pending,
        async () => {
          events.push(command);
        },
        () => events.push(`${command}:error`),
      );
    }
    const shutdown = pending.then(() => events.push("shutdown"));

    await shutdown;
    expect(events).toEqual([
      "initialize",
      "session.open",
      "session.suspend",
      "shutdown",
    ]);
  });

  it("keeps the queue live after operation and diagnostic failures", async () => {
    const events: string[] = [];
    const failed = enqueueAcpxSidecarInput(
      Promise.resolve(),
      async () => {
        events.push("failed");
        throw new Error("bad frame");
      },
      async () => {
        events.push("diagnostic");
        await Promise.resolve();
        throw new Error("diagnostic transport failed");
      },
    );
    const recovered = enqueueAcpxSidecarInput(
      failed,
      async () => {
        events.push("recovered");
      },
      () => events.push("unexpected"),
    );

    await recovered;
    expect(events).toEqual(["failed", "diagnostic", "recovered"]);
  });

  it("does not let an unbounded diagnostic block later input or shutdown", async () => {
    const events: string[] = [];
    const neverSettles = new Promise<void>(() => undefined);
    const failed = enqueueAcpxSidecarInput(
      Promise.resolve(),
      async () => {
        events.push("failed");
        throw new Error("bad frame");
      },
      () => {
        events.push("diagnostic");
        return neverSettles;
      },
    );
    const recovered = enqueueAcpxSidecarInput(
      failed,
      async () => {
        events.push("recovered");
      },
      () => events.push("unexpected"),
    );

    await expect(
      Promise.race([
        recovered.then(() => "drained"),
        new Promise<string>((resolve) => {
          setTimeout(() => resolve("blocked"), 50);
        }),
      ]),
    ).resolves.toBe("drained");
    expect(events).toEqual(["failed", "diagnostic", "recovered"]);
  });

  it("preserves the first bootstrap failure and blocks dependent commands", () => {
    const rootCause = new Error("agent initialize exited");
    const failure = recordAcpxBootstrapFailure(null, "session.open", rootCause);

    expect(failure).toBe(rootCause);
    expect(acpxBootstrapBlockedError(failure, "session.suspend")?.message).toBe(
      "ACPX provider bootstrap failed before session.suspend: agent initialize exited",
    );
    expect(
      recordAcpxBootstrapFailure(
        failure,
        "session.suspend",
        new Error("secondary"),
      ),
    ).toBe(rootCause);
  });

  it("does not make an ordinary command failure a sticky bootstrap error", () => {
    expect(
      recordAcpxBootstrapFailure(null, "turn.start", new Error("turn failed")),
    ).toBeNull();
    expect(acpxBootstrapBlockedError(null, "turn.start")).toBeNull();
  });

  it.each(["COPILOT_POLICY_VIOLATION", "COPILOT_DETACHED_WORK_UNSUPPORTED"])("preserves Copilot policy identity %s", code => {
    const error = Object.assign(new Error("safe fixed policy message"), { code });
    expect(acpxSidecarErrorCode(error)).toBe(code);
    expect(acpxSidecarErrorCode(new Error("wrapped", { cause: error }))).toBe(code);
  });

  it.each(["RESOLUTION", "OPEN", "BOUNDS", "ANCESTRY", "FORMAT", "PATH_IDENTITY", "READ_RESULT",
    "SIZE", "DEVICE", "INODE", "MODE", "UID", "GID", "LINK_COUNT", "MTIME", "BYTE_CONTINUITY", "REPEATED_CTIME"])(
    "preserves only closed module fence %s", fence => {
      const classify = (marker: string) => acpxSidecarErrorCode(Object.assign(new Error("private-canary"), {
        detailCode: "AGENT_STARTUP_FAILED", stderrSummary: `${marker}\nprivate-canary /secret`, exitCode: 1,
      }));
      expect(classify(`PAPERCLIP_ACPX_IMPORT_FAILURE:UNVERIFIED_MODULE:${fence}`))
        .toBe(`AGENT_STARTUP_FAILED.UNVERIFIED_MODULE.${fence}`);
      for (const suffix of ["PRIVATE_CANARY", `${fence} private-canary`, `${fence}.PRIVATE_CANARY`]) {
        expect(classify(`PAPERCLIP_ACPX_IMPORT_FAILURE:UNVERIFIED_MODULE:${suffix}`))
          .toBe("AGENT_STARTUP_FAILED.EXIT_NONZERO");
      }
    },
  );

  it.each(["RESOLUTION", "OPEN", "BOUNDS", "ANCESTRY", "FORMAT", "PATH_IDENTITY", "READ_RESULT",
    "SIZE", "DEVICE", "INODE", "MODE", "UID", "GID", "LINK_COUNT", "MTIME", "BYTE_CONTINUITY", "REPEATED_CTIME"])(
    "preserves delimited fence %s through ACPX stderr summarization", fence => {
      // ACPX 0.13.1 summarizeStartupStderr collapses whitespace before exposing
      // AgentStartupError.stderrSummary; line boundaries do not survive.
      const summarize = (stderr: string) => stderr.replace(/\s+/gu, " ").trim().slice(0, 8192);
      const classify = (stderr: string) => acpxSidecarErrorCode(Object.assign(new Error("private-canary"), {
        detailCode: "AGENT_STARTUP_FAILED", stderrSummary: summarize(stderr), exitCode: 1,
      }));
      expect(classify(`prior diagnostic\nPAPERCLIP_ACPX_IMPORT_FAILURE:UNVERIFIED_MODULE:${fence}:END\nError: private-canary /secret\ncode: ERR_ACPX_UNVERIFIED_MODULE`))
        .toBe(`AGENT_STARTUP_FAILED.UNVERIFIED_MODULE.${fence}`);
      for (const marker of [
        `UNVERIFIED_MODULE:${fence}:EN`,
        `UNVERIFIED_MODULE:${fence}:END_PRIVATE_CANARY`,
        `UNVERIFIED_MODULE:${fence}.PRIVATE_CANARY:END`,
        "UNVERIFIED_MODULE:PRIVATE_CANARY:END",
      ]) {
        expect(classify(`PAPERCLIP_ACPX_IMPORT_FAILURE:${marker}\nprivate-canary`))
          .toBe("AGENT_STARTUP_FAILED.EXIT_NONZERO");
      }
    },
  );

  it.each(["OTHER", "UNVERIFIED_MODULE"])("classifies closed import marker %s without private stderr", category => {
    const classify = (stderrSummary: string) => acpxSidecarErrorCode(Object.assign(new Error("private-canary"), {
      detailCode: "AGENT_STARTUP_FAILED", stderrSummary, exitCode: 1,
    }));
    expect(classify(`PAPERCLIP_ACPX_IMPORT_FAILURE:${category}\nprivate-canary /secret`))
      .toBe(`AGENT_STARTUP_FAILED.${category}`);
    expect(classify(`private-canary PAPERCLIP_ACPX_IMPORT_FAILURE:OTHER\n`))
      .toBe("AGENT_STARTUP_FAILED.EXIT_NONZERO");
    expect(classify(`PAPERCLIP_ACPX_IMPORT_FAILURE:OTHER private-canary\n`))
      .toBe("AGENT_STARTUP_FAILED.EXIT_NONZERO");
  });

  it.each([
    ["Error [ERR_MODULE_NOT_FOUND]: private-canary", "MODULE_NOT_FOUND"],
    ["SyntaxError: private-canary", "SYNTAX_ERROR"],
  ])("preserves detailed closed startup category with a generic import marker (%s)", (detail, category) => {
    expect(acpxSidecarErrorCode(Object.assign(new Error("private-canary"), {
      detailCode: "AGENT_STARTUP_FAILED",
      stderrSummary: `PAPERCLIP_ACPX_IMPORT_FAILURE:OTHER\n${detail}`,
    }))).toBe(`AGENT_STARTUP_FAILED.${category}`);
  });

  it("preserves stable ACPX error identities without copying startup stderr", () => {
    const missingModule = Object.assign(new Error("provider exited"), {
      detailCode: "AGENT_STARTUP_FAILED",
      stderrSummary:
        "Error [ERR_MODULE_NOT_FOUND]: violet-circuit-4821 was not found",
      exitCode: 1,
    });
    const opaqueExit = Object.assign(new Error("provider exited"), {
      detailCode: "AGENT_STARTUP_FAILED",
      stderrSummary: "violet-circuit-4821",
      exitCode: 1,
    });
    const model = Object.assign(new Error("model rejected"), {
      code: "ACP_MODEL_UNSUPPORTED",
      detailCode: "AGENT_STARTUP_FAILED",
    });
    const genericStartup = Object.assign(new Error("provider exited"), {
      outputCode: "RUNTIME",
      detailCode: "AGENT_STARTUP_FAILED",
      stderrSummary: "Error [ERR_MODULE_NOT_FOUND]: package was not found",
      exitCode: 1,
    });
    const genericRuntime = Object.assign(new Error("provider rejected"), {
      outputCode: "RUNTIME",
    });
    const nestedHandshake = new AggregateError(
      [
        Object.assign(new Error("admission deadline"), {
          name: "AcpxSessionHandshakeTimeoutError",
        }),
      ],
      "runtime initialization cleanup failed",
    );
    const codedWrapper = Object.assign(new Error("opaque wrapper"), {
      code: "ERR_UNCLASSIFIED_WRAPPER",
      cause: missingModule,
    });

    expect(acpxSidecarErrorCode(missingModule)).toBe(
      "AGENT_STARTUP_FAILED.MODULE_NOT_FOUND",
    );
    expect(acpxSidecarErrorCode(opaqueExit)).toBe(
      "AGENT_STARTUP_FAILED.EXIT_NONZERO",
    );
    expect(acpxSidecarErrorCode(opaqueExit)).not.toContain(
      "violet-circuit-4821",
    );
    expect(acpxSidecarErrorCode(model)).toBe("ACP_MODEL_UNSUPPORTED");
    expect(acpxSidecarErrorCode(genericStartup)).toBe(
      "AGENT_STARTUP_FAILED.MODULE_NOT_FOUND",
    );
    expect(acpxSidecarErrorCode(genericRuntime)).toBe("RUNTIME");
    expect(acpxSidecarErrorCode(codedWrapper)).toBe(
      "AGENT_STARTUP_FAILED.MODULE_NOT_FOUND",
    );
    expect(acpxSidecarErrorCode(nestedHandshake)).toBe(
      "ACPX_SESSION_HANDSHAKE_TIMEOUT",
    );
  });
});


describe("closed link-count failure detail", () => {
  const classify = (detail: string) => acpxSidecarErrorCode(Object.assign(new Error("private-canary"), {
    detailCode: "AGENT_STARTUP_FAILED", stderrSummary: `PAPERCLIP_ACPX_IMPORT_FAILURE:UNVERIFIED_MODULE:LINK_COUNT:END PAPERCLIP_ACPX_LINK_COUNT:${detail}:END private-canary /secret`,
  }));
  it.each(["1:1:2:I:11111110", "2:2:1:D:11111101", "1:0:18446744073709551615:I:11111111"])("preserves bounded metadata %s", detail => {
    expect(classify(detail)).toBe(`AGENT_STARTUP_FAILED.UNVERIFIED_MODULE.LINK_COUNT.READ.${detail.replaceAll(":", ".")}`);
  });
  it.each(["0:1:2:I:11111110", "3:1:2:I:11111110", "1:-1:2:I:11111110", "1:01:2:I:11111110", "1:1:18446744073709551616:I:11111110", "1:1:2:D:11111110", "1:1:1:I:11111110", "1:1:2:I:01111110", "1:1:2:I:111111100", "1:1:2:I:11111110.PRIVATE", "1:1:2:I:11111110:END_PRIVATE"])("drops malformed metadata without dropping fence: %s", detail => {
    expect(classify(detail)).toBe("AGENT_STARTUP_FAILED.UNVERIFIED_MODULE.LINK_COUNT");
  });
  it("survives the installed ACPX summarizer without leaking or accepting truncated details", async () => {
    const directory = dirname(createRequire(import.meta.url).resolve("acpx/runtime"));
    const chunk = (await readdir(directory)).find(name => /^live-checkpoint-.*\.js$/.test(name));
    expect(chunk).toBeDefined();
    const exports = await import(pathToFileURL(join(directory, chunk!)).href);
    const client = Object.values(exports).find(value => typeof value === "function" && typeof value.prototype?.summarizeStartupStderr === "function") as { prototype: { summarizeStartupStderr: (parts: string[]) => string } };
    const base = "PAPERCLIP_ACPX_IMPORT_FAILURE:UNVERIFIED_MODULE:LINK_COUNT:END";
    const detail = "PAPERCLIP_ACPX_LINK_COUNT:1:2:1:D:11111110:END";
    for (const complete of [true, false]) {
      const summary = client.prototype.summarizeStartupStderr([`${base}\n${complete ? detail : detail.slice(0, -1)}\nprivate-canary /secret`]);
      const code = acpxSidecarErrorCode(Object.assign(new Error("private-canary"), { detailCode: "AGENT_STARTUP_FAILED", stderrSummary: summary }));
      expect(code).toBe(`AGENT_STARTUP_FAILED.UNVERIFIED_MODULE.LINK_COUNT${complete ? ".READ.1.2.1.D.11111110" : ""}`);
      expect(code).not.toMatch(/private|secret/);
    }
  });
});
