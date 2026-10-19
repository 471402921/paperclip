import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Export the authority from the same pinned stage used by the Daytona image. */
export async function buildReleaseProviderPackManifest({ repo, sourceRevision, output }) {
  repo = resolve(repo); output = resolve(output);
  assert.match(sourceRevision, /^[a-f0-9]{40}$/);
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), sourceRevision);
  assert.ok(!existsSync(output), 'Never replace retained provider-pack authority');
  const temporary = mkdtempSync(join(tmpdir(), 'paperclip-release-pack-'));
  try {
    const context = join(temporary, 'context'), exported = join(temporary, 'export');
    mkdirSync(context);
    const archive = join(temporary, 'source.tar');
    execFileSync('git', ['archive', '--format=tar', '--output', archive, sourceRevision], { cwd: repo });
    execFileSync('tar', ['-xf', archive, '-C', context]);
    const dockerfile = readFileSync(join(context, 'docker/daytona-runner/Dockerfile'), 'utf8');
    assert.match(dockerfile, / AS provider-pack-build\r?$/m, 'Source has no pinned provider-pack build stage');
    const exportFile = join(context, 'release-provider-pack.Dockerfile');
    writeFileSync(exportFile, `${dockerfile}\nFROM scratch AS release-provider-pack-manifest\nCOPY --from=provider-pack-build /provider-pack/provider-pack.json /provider-pack.json\n`);
    const lockSha256 = createHash('sha256').update(readFileSync(join(context, 'pnpm-lock.yaml'))).digest('hex');
    execFileSync('docker', ['buildx', 'build', '--platform', 'linux/amd64', '--file', exportFile,
      '--target', 'release-provider-pack-manifest', '--output', `type=local,dest=${exported}`,
      '--build-arg', `PAPERCLIP_RUNNER_SOURCE_REVISION=${sourceRevision}`,
      '--build-arg', `PAPERCLIP_RUNNER_LOCK_SHA256=${lockSha256}`, context],
    { cwd: repo, stdio: 'inherit', timeout: 20 * 60_000 });
    const file = join(exported, 'provider-pack.json'), stat = lstatSync(file);
    assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0 && stat.size <= 512 * 1024);
    const bytes = readFileSync(file);
    const { verifyReleaseProviderPack } = await import(pathToFileURL(join(repo, 'packages/paperclip-runner/scripts/release-provider-pack.mjs')));
    const identity = verifyReleaseProviderPack(JSON.parse(bytes), sourceRevision);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    mkdirSync(output, { recursive: true });
    writeFileSync(join(output, 'provider-pack.json'), bytes, { flag: 'wx' });
    writeFileSync(join(output, 'provider-pack.json.sha256'), `${sha256}  provider-pack.json\n`, { flag: 'wx' });
    const receipt = { schema: 'paperclip.runner.release-provider-pack.v1', sourceRevision,
      sha256, digest: identity.digest, sourceLockSha256: lockSha256,
      dockerfileSha256: createHash('sha256').update(dockerfile).digest('hex'), providerCalls: 0 };
    writeFileSync(join(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    return receipt;
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 4, 'Usage: build-release-provider-pack-manifest.mjs SOURCE_SHA OUTPUT');
  console.log(JSON.stringify(await buildReleaseProviderPackManifest({ repo: process.cwd(), sourceRevision: process.argv[2], output: process.argv[3] })));
}
