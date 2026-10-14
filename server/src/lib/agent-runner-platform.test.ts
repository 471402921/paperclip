import { afterEach, expect, it, vi } from "vitest";
import { localAgentRunnerTarget } from "./agent-runner-platform.js";

const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")!;
const report = process.report as typeof process.report & { excludeNetwork: boolean };
const originalExcludeNetwork = report.excludeNetwork;

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(process, "platform", originalPlatform);
  report.excludeNetwork = originalExcludeNetwork;
});

it.each([false, true])("measures Linux libc without network discovery and restores excludeNetwork=%s", previous => {
  Object.defineProperty(process, "platform", { ...originalPlatform, value: "linux" });
  report.excludeNetwork = previous;
  vi.spyOn(report, "getReport").mockImplementation(() => {
    if (!report.excludeNetwork) throw new Error("Network discovery would block");
    return { header: { glibcVersionRuntime: "2.39" }, environmentVariables: { SECRET_SENTINEL: "private" } } as never;
  });

  expect(localAgentRunnerTarget()).toEqual({ driver: "local", platform: "linux", architecture: process.arch, libc: "glibc", glibcVersion: "2.39" });
  expect(report.excludeNetwork).toBe(previous);
});

it.each([false, true])("fails closed and restores excludeNetwork=%s when the platform report fails", previous => {
  Object.defineProperty(process, "platform", { ...originalPlatform, value: "linux" });
  report.excludeNetwork = previous;
  let networkExcluded = false;
  vi.spyOn(report, "getReport").mockImplementation(() => {
    networkExcluded = report.excludeNetwork;
    throw new Error("Unavailable platform report");
  });

  expect(localAgentRunnerTarget()).toEqual({ driver: "local", platform: "linux", architecture: process.arch, libc: "unknown" });
  expect(networkExcluded).toBe(true);
  expect(report.excludeNetwork).toBe(previous);
});
