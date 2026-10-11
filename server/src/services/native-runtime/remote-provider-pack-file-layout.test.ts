import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { verifyProviderPackFileLayout } from "./remote-provider-pack-file-layout.js";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
function fixture() {
  const root = fs.mkdtempSync(path.join(tmpdir(), "remote-file-layout-")); roots.push(root);
  fs.mkdirSync(path.join(root, "nested")); fs.writeFileSync(path.join(root, "nested", "one"), "same bytes");
  fs.symlinkSync("nested/one", path.join(root, "link"));
  return root;
}
function check(root: string, policy: unknown, remote: boolean) {
  if (!remote) return verifyProviderPackFileLayout(root, policy, fs, path);
  // Exercise precisely the self-contained function serialized by the guest verifier.
  const program = `const fs=require('node:fs'),path=require('node:path');(${verifyProviderPackFileLayout.toString()})(process.argv[1],JSON.parse(process.argv[2]).policy,fs,path)`;
  execFileSync(process.execPath, ["-e", program, root, JSON.stringify({ policy })], { stdio: "pipe" });
}
describe.each([false, true])("provider file layout validation remote=%s", remote => {
  it("accepts independent files and symlinks; rejects later hardlinks without repair", () => {
    const root = fixture(); const policy = "independent-regular-files-v1";
    check(root, policy, remote);
    fs.linkSync(path.join(root, "nested", "one"), path.join(root, "two"));
    expect(() => check(root, policy, remote)).toThrow("runner_remote_provider_artifact_incompatible: provider pack file layout");
    expect(fs.lstatSync(path.join(root, "two")).nlink).toBe(2);
    check(root, undefined, remote); // Legacy caches remain readable and unchanged.
    expect(fs.lstatSync(path.join(root, "two")).nlink).toBe(2);
  });
  it("accepts an authority-selected preinstalled root alias without following interior directory aliases", () => {
    const root = fixture();
    const aliasParent = fs.mkdtempSync(path.join(tmpdir(), "preinstalled-file-layout-")); roots.push(aliasParent);
    const alias = path.join(aliasParent, "approved-image-pack"); fs.symlinkSync(root, alias);
    const outside = path.join(aliasParent, "outside"); fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "one"), "unrelated");
    fs.linkSync(path.join(outside, "one"), path.join(outside, "two"));
    fs.symlinkSync(outside, path.join(root, "interior-directory-alias"));
    check(alias, "independent-regular-files-v1", remote);
    expect(fs.lstatSync(path.join(outside, "one")).nlink).toBe(2);
    fs.linkSync(path.join(root, "nested", "one"), path.join(root, "two"));
    expect(() => check(alias, "independent-regular-files-v1", remote)).toThrow("runner_remote_provider_artifact_incompatible: provider pack file layout");
  });
  it.each([null, "unknown-policy", {}, 1])("rejects unknown policy %j", policy => {
    expect(() => check(fixture(), policy, remote)).toThrow("runner_remote_provider_artifact_incompatible: provider pack file layout");
  });
});
