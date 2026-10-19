import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function releaseRunnerAssemblyManifest({ repo, artifacts, sourceRevision, providerPackManifest, verifyMetadata }) {
  const scripts = join(resolve(repo), 'packages/paperclip-runner/scripts');
  const { releaseDaemonManifest } = await import(pathToFileURL(join(scripts, 'stage-release-runner-binaries.mjs')));
  const { verifyReleaseProviderPack } = await import(pathToFileURL(join(scripts, 'release-provider-pack.mjs')));
  const manifest = releaseDaemonManifest(resolve(artifacts), sourceRevision, verifyMetadata);
  const file = resolve(providerPackManifest), stat = lstatSync(file);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size > 0 && stat.size <= 512 * 1024,
    'Provider-pack authority must be a bounded regular file');
  const bytes = readFileSync(file);
  verifyReleaseProviderPack(JSON.parse(bytes), sourceRevision);
  return { ...manifest, remoteProviderPack: { path: file, sha256: 'sha256:' + createHash('sha256').update(bytes).digest('hex') } };
}

export async function assembleReleaseRunnerInputs({ repo, artifacts, sourceRevision, providerPackManifest }) {
  repo = resolve(repo);
  assert.match(sourceRevision, /^[a-f0-9]{40}$/);
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), sourceRevision);
  assert.equal(JSON.parse(readFileSync(join(repo, 'server/dist/build-info.json'))).commit, sourceRevision);
  const runner = join(repo, 'packages/paperclip-runner');
  const { verifyReleaseRunnerMetadata } = await import(pathToFileURL(join(runner, 'scripts/stage-release-runner-binaries.mjs')));
  const { PAPERCLIP_RUNNER_BUILD_METADATA: expected } = await import(pathToFileURL(join(runner, 'dist/evals/build-metadata.js')));
  const { parsePaperclipRunnerdBuildMetadata } = await import(pathToFileURL(join(runner, 'dist/evals/runnerd-artifact.js')));
  const manifest = await releaseRunnerAssemblyManifest({ repo, artifacts, sourceRevision, providerPackManifest,
    verifyMetadata: value => verifyReleaseRunnerMetadata(parsePaperclipRunnerdBuildMetadata(value), expected) });
  const temporary = mkdtempSync(join(tmpdir(), 'paperclip-release-assembly-'));
  try {
    const input = join(temporary, 'manifest.json');
    writeFileSync(input, JSON.stringify(manifest));
    execFileSync(process.execPath, [join(runner, 'scripts/stage-release-runner-binaries.mjs'), input], { cwd: repo, stdio: 'inherit' });
    const server = join(repo, 'server/dist/vendor/paperclip-runner'); mkdirSync(server, { recursive: true });
    for (const directory of ['bin', 'remote-provider-packs']) {
      cpSync(join(runner, 'dist', directory), join(server, directory), { recursive: true });
    }
    return { schema: 'paperclip.runner.release-assembly.v1', sourceRevision,
      targets: Object.keys(manifest.platforms), remoteProviderPackSha256: manifest.remoteProviderPack.sha256, providerCalls: 0 };
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 5, 'Usage: assemble-release-runner-inputs.mjs ARTIFACT_DIRECTORY SOURCE_SHA PROVIDER_PACK_MANIFEST');
  console.log(JSON.stringify(await assembleReleaseRunnerInputs({ repo: process.cwd(), artifacts: process.argv[2], sourceRevision: process.argv[3], providerPackManifest: process.argv[4] })));
}
