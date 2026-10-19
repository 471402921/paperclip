import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { releaseRunnerAssemblyManifest } from '../assemble-release-runner-inputs.mjs';
import { verifyReleaseRunnerMetadata } from '../../packages/paperclip-runner/scripts/stage-release-runner-binaries.mjs';
import profiles from '../../packages/paperclip-runner/acpx-profiles.json' with { type: 'json' };
import cursor from '../../packages/paperclip-runner/cursor-distributions.json' with { type: 'json' };

const repo = fileURLToPath(new URL('../..', import.meta.url));
const sourceRevision = 'a'.repeat(40), sha = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
const expected = { contracts: { runnerdArtifact: 1, nativeExecution: 8, harnessDriver: 1 },
  package: { name: '@paperclipai/paperclip-runner', version: '0.0.0' }, prp: { name: 'PRP', minimumVersion: 1, maximumVersion: 1 } };
const metadata = { binaryContractVersion: 1, nativeExecutionVersion: 8, harnessDriverVersion: 1,
  packageName: expected.package.name, packageVersion: expected.package.version, prp: expected.prp };

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'release-runner-inputs-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const artifacts = join(root, 'daemons'); mkdirSync(artifacts);
  for (const target of ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64']) {
    const directory = join(artifacts, target); mkdirSync(directory);
    const bytes = Buffer.alloc(64);
    if (target.startsWith('linux')) {
      bytes.set([0x7f, 0x45, 0x4c, 0x46, 2, 1]); bytes.writeUInt16LE(target === 'linux-x64' ? 62 : 183, 18);
    } else {
      bytes.writeUInt32LE(0xfeedfacf, 0); bytes.writeUInt32LE(target === 'darwin-arm64' ? 0x0100000c : 0x01000007, 4);
    }
    writeFileSync(join(directory, 'paperclip-runnerd'), bytes);
    writeFileSync(join(directory, 'receipt.json'), JSON.stringify({ schema: 'paperclip.runner.release-artifact.v1',
      sourceRevision, target, sha256: sha(bytes), buildMetadata: metadata }));
  }
  const payload = { target: { platform: 'linux', architecture: 'x64' }, runnerSourceRevision: sourceRevision,
    pins: { acpx: profiles.acpxVersion },
    acpxProfileDigests: Object.fromEntries(['grok', 'claude', 'codex'].map(agent => [agent, profiles.profiles[agent].commandDigest])),
    providers: { cursor: { version: profiles.profiles.cursor.agentServerVersion, profileDigest: profiles.profiles.cursor.commandDigest,
      closureDigest: 'sha256:' + cursor.platforms['linux-x64'].closureSha256, qualification: 'qualified', path: 'provider-assets/cursor/linux-x64', sha256: 'sha256:' + 'b'.repeat(64) },
    copilot: { version: profiles.profiles.copilot.agentServerVersion, profileDigest: profiles.profiles.copilot.commandDigest,
      closureDigest: 'sha256:a3d8f4367cfa1694d79e3f8b7930b6fbfe42a229c272b375b11951d631db8d07', qualification: 'qualified', path: 'provider-assets/copilot/linux-x64', sha256: 'sha256:' + 'b'.repeat(64) } } };
  const providerPackManifest = join(root, 'provider-pack.json');
  const save = () => writeFileSync(providerPackManifest, JSON.stringify({ schema: 'paperclip-runner/remote-provider-pack/v1', payload, digest: sha(canonical(payload)) }));
  save();
  const options = { repo, artifacts, sourceRevision, providerPackManifest,
    verifyMetadata: value => verifyReleaseRunnerMetadata(value, expected) };
  return { root, payload, options, save };
}

test('assembles all four source-bound daemons with the matching Linux pack authority', async t => {
  const f = fixture(t), manifest = await releaseRunnerAssemblyManifest(f.options);
  assert.equal(Object.keys(manifest.platforms).length, 4);
  assert.equal(manifest.sourceRevision, sourceRevision);
  assert.deepEqual(manifest.remoteProviderPack, { path: f.options.providerPackManifest, sha256: sha(readFileSync(f.options.providerPackManifest)) });
});

test('rejects missing authority instead of emitting a local-only release', async t => {
  const f = fixture(t); rmSync(f.options.providerPackManifest);
  await assert.rejects(releaseRunnerAssemblyManifest(f.options), { code: 'ENOENT' });
});

test('rejects an independently rehashed stale image manifest', async t => {
  const f = fixture(t); f.payload.runnerSourceRevision = 'c'.repeat(40); f.save();
  await assert.rejects(releaseRunnerAssemblyManifest(f.options), /release source/);
});

test('rejects a rehashed incompatible Copilot profile', async t => {
  const f = fixture(t); f.payload.providers.copilot.profileDigest = 'sha256:' + 'c'.repeat(64); f.save();
  await assert.rejects(releaseRunnerAssemblyManifest(f.options), /Copilot identity/);
});

test('rejects foreign daemon source even when the provider pack matches', async t => {
  const f = fixture(t), file = join(f.options.artifacts, 'linux-x64/receipt.json');
  const receipt = JSON.parse(readFileSync(file)); receipt.sourceRevision = 'c'.repeat(40); writeFileSync(file, JSON.stringify(receipt));
  await assert.rejects(releaseRunnerAssemblyManifest(f.options), /source, digest or architecture mismatch/);
});

test('retains the daemon metadata compatibility check', async t => {
  const f = fixture(t), file = join(f.options.artifacts, 'linux-x64/receipt.json');
  const receipt = JSON.parse(readFileSync(file)); receipt.buildMetadata.nativeExecutionVersion = 999; writeFileSync(file, JSON.stringify(receipt));
  await assert.rejects(releaseRunnerAssemblyManifest(f.options), /build metadata is incompatible/);
});
