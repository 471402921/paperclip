import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { materializeIndependentProviderPackFiles } from "./provider-pack-file-layout.mjs";

test("new pack files remain independent after a real tar round trip without changing source bytes, modes or symlinks", () => {
  const root = mkdtempSync(join(tmpdir(), "provider-pack-layout-"));
  try {
    const pack = join(root, "pack"); mkdirSync(pack);
    const outside = join(root, "store"); mkdirSync(outside);
    const source = join(outside, "source"); writeFileSync(source, "identical module bytes\n"); chmodSync(source, 0o755);
    linkSync(source, join(pack, "a")); linkSync(source, join(pack, "b"));
    writeFileSync(join(pack, "c"), "identical module bytes\n");
    symlinkSync("a", join(pack, "relative-link"));
    symlinkSync(outside, join(pack, "external-directory-link"));
    writeFileSync(join(outside, "untouched-a"), "outside");
    linkSync(join(outside, "untouched-a"), join(outside, "untouched-b"));
    const outsideInode = lstatSync(join(outside, "untouched-a")).ino;
    const original = lstatSync(source);
    // Prove plain tar preserves the old hardlink topology.
    execFileSync("tar", ["-czf", join(root, "legacy.tgz"), "-C", pack, "."]);
    const legacy = join(root, "legacy"); mkdirSync(legacy);
    execFileSync("tar", ["-xzf", join(root, "legacy.tgz"), "-C", legacy]);
    assert.equal(lstatSync(join(legacy, "a")).ino, lstatSync(join(legacy, "b")).ino);
    assert.equal(lstatSync(join(legacy, "a")).nlink, 2);
    materializeIndependentProviderPackFiles(pack);
    const once = ["a", "b", "c"].map(name => lstatSync(join(pack, name)).ino);
    materializeIndependentProviderPackFiles(pack);
    assert.deepEqual(["a", "b", "c"].map(name => lstatSync(join(pack, name)).ino), once);
    execFileSync("tar", ["-czf", join(root, "independent.tgz"), "-C", pack, "."]);
    const unpacked = join(root, "unpacked"); mkdirSync(unpacked);
    execFileSync("tar", ["-xzf", join(root, "independent.tgz"), "-C", unpacked]);
    const stats = ["a", "b", "c"].map(name => lstatSync(join(unpacked, name)));
    assert.equal(new Set(stats.map(stat => stat.ino)).size, 3);
    assert.ok(stats.every(stat => stat.nlink === 1));
    for (const name of ["a", "b", "c"]) assert.equal(readFileSync(join(unpacked, name), "utf8"), "identical module bytes\n");
    assert.equal(stats[0].mode & 0o7777, 0o755);
    assert.equal(stats[1].mode & 0o7777, 0o755);
    assert.equal(readlinkSync(join(unpacked, "relative-link")), "a");
    assert.equal(readlinkSync(join(unpacked, "external-directory-link")), outside);
    const after = lstatSync(source);
    assert.equal(after.ino, original.ino); assert.equal(after.mode, original.mode);
    assert.equal(after.mtimeMs, original.mtimeMs); assert.equal(after.nlink, 1);
    assert.equal(readFileSync(source, "utf8"), "identical module bytes\n");
    for (const name of ["untouched-a", "untouched-b"]) {
      assert.equal(lstatSync(join(outside, name)).ino, outsideInode);
      assert.equal(lstatSync(join(outside, name)).nlink, 2);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("does not accept a symlink as the unpublished root", () => {
  const root = mkdtempSync(join(tmpdir(), "provider-pack-layout-root-"));
  try {
    mkdirSync(join(root, "tree")); symlinkSync(join(root, "tree"), join(root, "link"));
    assert.throws(() => materializeIndependentProviderPackFiles(join(root, "link")), /build root/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
