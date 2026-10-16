import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function planVitestTransformCache({ files, read, root, scope }) {
  const names = [...new Set(files)].sort();
  if (!names.includes("pnpm-lock.yaml") || !names.includes("package.json")) return null;
  const hash = createHash("sha256").update(JSON.stringify({ root, scope, names }));
  for (const name of names) {
    if (path.isAbsolute(name) || name.split("/").includes("..")) throw new Error("Cache input escapes the checkout");
    if (!/(^|\/)package\.json$|(^|\/)vite(?:st)?(?:\.[\w-]+)?\.config\.|(^|\/)tsconfig[^/]*\.json$|(^|\/)\.env(?:\.|$)/.test(name)
      && !["pnpm-lock.yaml", "pnpm-workspace.yaml", ".npmrc", ".pnpmfile.cjs", "pnpmfile.cjs"].includes(name)
      && !name.startsWith("scripts/") && !name.startsWith("patches/")) continue;
    const value = read(name);
    if (value === null) return null;
    hash.update(JSON.stringify([name, value.length])).update(value);
  }
  const digest = hash.digest("hex");
  return {
    key: `ci-vitest-transforms-v1-${digest}`,
    directory: path.join(root, "node_modules", ".vitest-cache", `v1-${digest}`),
  };
}

export function vitestTransformCache(root, env = process.env) {
  if (env.PAPERCLIP_VITEST_FS_MODULE_CACHE === "false") return null;
  try {
    const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root }).toString().split("\0").filter(Boolean);
    const configDirs = new Set([".", ...files.filter(name => /(^|\/)vite(?:st)?(?:\.[\w-]+)?\.config\./.test(name)).map(name => path.posix.dirname(name))]);
    for (const directory of configDirs) {
      for (const name of [".env", ".env.local", ".env.test", ".env.test.local"]) {
        const file = path.posix.join(directory, name);
        if (existsSync(path.join(root, file))) files.push(file);
      }
    }
    return planVitestTransformCache({
      files, root: realpathSync(root),
      scope: {
        node: process.version, v8: process.versions.v8, platform: process.platform, arch: process.arch,
        nodeEnv: env.NODE_ENV ?? "test", nodeOptions: env.NODE_OPTIONS ?? "", ci: env.CI ?? "",
        viteEnv: Object.fromEntries(Object.entries(env).filter(([name]) => name.startsWith("VITE_")).sort(([a], [b]) => a.localeCompare(b))),
      },
      read: name => {
        const file = path.join(root, name);
        return existsSync(file) && !lstatSync(file).isSymbolicLink() ? readFileSync(file) : null;
      },
    });
  } catch {
    return null;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const plan = vitestTransformCache(process.cwd());
  const output = [`cacheable=${plan !== null}`, `key=${plan?.key ?? ""}`, `directory=${plan?.directory ?? ""}`].join("\n") + "\n";
  process.stdout.write(output);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output);
}
