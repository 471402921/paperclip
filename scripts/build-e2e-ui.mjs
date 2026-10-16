import { spawnSync } from "node:child_process";

const result = spawnSync("pnpm", [
  "--filter", "@paperclipai/ui", "build", "--outDir", "../server/ui-dist", "--emptyOutDir",
], {
  env: { ...process.env, NODE_ENV: "production" },
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.signal) process.kill(process.pid, result.signal);
else process.exitCode = result.status ?? 1;
