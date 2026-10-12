#!/usr/bin/env node
// Run on a disposable Linux verification host after pnpm build. No publication,
// credentials, inference, or changes to release versions. Native provisioning is
// explicit and separate from npm installation, and is removed in finally.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { materializePublishManifest, prepareBundledPackage } from './prepare-bundled-package.mjs';
import { GROK_PUBLIC_INSTALL_IMAGE, GROK_PUBLIC_INSTALL_LIFECYCLE, assertNoBundledCodexPayloads, grokConsumerDockerArgs, installedCodexProbeSource, installedDaemonProbeSource, macPublicInstallLifecycleProfile, macInstalledStartupProbeSource } from './grok-public-install-sandbox.mjs';
import { retainRunnerQualificationPackages } from './retain-runner-qualification-packages.mjs';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function verifyMacConsumer(packageDirectory, sourceRevision, receiptPath) {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Mac clean consumers run only on disposable hosted CI');
  assert.equal(process.platform, 'darwin');
  assert.ok(['arm64', 'x64'].includes(process.arch));
  assert.match(sourceRevision, /^[a-f0-9]{40}$/);
  const packages = realpathSync(packageDirectory);
  const manifest = JSON.parse(readFileSync(join(packages, 'manifest.json'), 'utf8'));
  assert.equal(manifest.schema, 'paperclip.runner.public-packages/v1');
  assert.equal(manifest.sourceRevision, sourceRevision);
  assert.ok(manifest.archives.some(entry => entry.name === '@paperclipai/server'));
  assert.ok(manifest.archives.some(entry => entry.name === 'paperclipai'));
  assert.equal(new Set(manifest.archives.map(entry => entry.name)).size, manifest.archives.length);
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'paperclip-mac-public-install-')));
  try {
    const consumer = join(root, 'consumer'), home = join(root, 'home'), tools = join(root, 'tools');
    for (const directory of [consumer, home, tools, join(root, 'tmp'), join(root, 'cache')]) mkdirSync(directory);
    const npmCli = realpathSync(execFileSync('/usr/bin/which', ['npm'], { encoding: 'utf8' }).trim());
    symlinkSync(process.execPath, join(tools, 'node'));
    // npm subprocesses get a Node-only owned tool directory; no ambient harness
    // command can hide missing installed dependencies.
    const env = { PATH: `${tools}:/usr/bin:/bin:/usr/sbin:/sbin`, HOME: home, TMPDIR: join(root, 'tmp'),
      npm_config_cache: join(root, 'cache'), npm_config_audit: 'false', npm_config_fund: 'false' };
    const run = (command, args, cwd = consumer) => execFileSync(command, args, { cwd, env,
      timeout: 10 * 60_000, maxBuffer: 32 * 1024 * 1024, encoding: 'utf8' });
    const tarballs = manifest.archives.map(entry => {
      assert.match(entry.file, /^[A-Za-z0-9._-]+\.tgz$/); assert.match(entry.sha256, /^[a-f0-9]{64}$/);
      const path = join(packages, entry.file);
      assert.equal(realpathSync(path), path);
      assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), entry.sha256);
      assertNoBundledCodexPayloads(run('/usr/bin/tar', ['-tzf', path]).trim().split('\n'));
      return path;
    });
    writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
    const sentinelSource = join(root, 'lifecycle-sentinel'); mkdirSync(sentinelSource);
    writeFileSync(join(sentinelSource, 'package.json'), JSON.stringify({ name: 'paperclip-verification-lifecycle-sentinel', version: '1.0.0',
      scripts: { postinstall: 'node -e "require(\'node:fs\').writeFileSync(\'lifecycle-ran\', \'ok\')"' } }));
    run(process.execPath, [npmCli, 'pack', '--ignore-scripts', '--pack-destination', root], sentinelSource);
    const sentinelTar = join(root, readdirSync(root).find(name => name.endsWith('.tgz')));
    run(process.execPath, [npmCli, 'install', '--ignore-scripts', '--omit=dev', ...tarballs, sentinelTar]);
    const sentinel = join(consumer, 'node_modules/paperclip-verification-lifecycle-sentinel/lifecycle-ran');
    assert.equal(existsSync(sentinel), false);
    const lock = readFileSync(join(consumer, 'package-lock.json'), 'utf8');
    const profile = join(root, 'lifecycle.sb'); writeFileSync(profile, macPublicInstallLifecycleProfile(root));
    const listener = createServer(socket => socket.end());
    await new Promise((resolve, reject) => { listener.once('error', reject); listener.listen(0, '127.0.0.1', resolve); });
    try {
      const port = listener.address().port;
      const networkProbe = `import assert from 'node:assert/strict'; import net from 'node:net';
        const socket = net.connect({host:'127.0.0.1',port:${port}}); socket.setTimeout(3000,()=>process.exit(2));
        socket.once('connect',()=>{socket.destroy(); ${"process.argv[1] === 'denied' ? process.exit(3) : process.exit(0)"};});
        socket.once('error',error=>{assert.equal(process.argv[1],'denied'); assert.equal(error.code,'EPERM');});`;
      run(process.execPath, ['--input-type=module', '-e', networkProbe, 'allowed']);
      run('/usr/bin/sandbox-exec', ['-f', profile, process.execPath, '--input-type=module', '-e', networkProbe, 'denied']);
    } finally { await new Promise(resolve => listener.close(resolve)); }
    run('/usr/bin/sandbox-exec', ['-f', profile, process.execPath, npmCli, 'rebuild', '--offline', '--ignore-scripts=false', '--dangerously-allow-all-scripts', '--foreground-scripts']);
    assert.equal(readFileSync(sentinel, 'utf8'), 'ok');
    assert.equal(readFileSync(join(consumer, 'package-lock.json'), 'utf8'), lock);
    for (const entry of manifest.archives) {
      assert.equal(JSON.parse(readFileSync(join(consumer, 'node_modules', entry.name, 'package.json'))).version, manifest.releaseVersion);
    }
    const server = join(consumer, 'node_modules/@paperclipai/server'), installed = join(server, 'dist/vendor/paperclip-runner');
    const probe = (name, source) => { const file = join(root, name); writeFileSync(file, source); return JSON.parse(run(process.execPath, [file]).trim()); };
    const daemon = probe('daemon-probe.mjs', installedDaemonProbeSource(installed, consumer, sourceRevision));
    const codex = probe('codex-probe.mjs', installedCodexProbeSource(join(installed, 'index.js'), consumer, undefined, { nativeCodex: true }));
    const startupScript = macInstalledStartupProbeSource(consumer, server, daemon.sha256, join(repo, 'tests/runner-e2e/installed-cli.ts'));
    const startupFile = join(root, 'startup-probe.mts'); writeFileSync(startupFile, startupScript);
    const startup = JSON.parse(run(process.execPath, ['--import', 'tsx', startupFile], join(repo, 'server')).trim());
    const receipt = { schema: 'paperclip.runner.mac-public-install.v1', sourceRevision, platform: process.platform, architecture: process.arch,
      cleanNpmInstall: true, packageCount: manifest.archives.length, codexPackedPayloadsOmitted: true,
      consumerLockPreserved: true, lifecycleSentinelVerified: true, lifecycleNetwork: 'sandbox-exec denied (loopback negative control)',
      ...daemon, ...codex, startup, providerCalls: 0 };
    writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify(receipt));
  } finally { rmSync(root, { recursive: true, force: true }); }
}
if (process.argv[2] === '--mac-consumer') {
  assert.equal(process.argv.length, 6, 'Usage: --mac-consumer PACKAGE_DIRECTORY SOURCE_SHA RECEIPT_PATH');
  await verifyMacConsumer(process.argv[3], process.argv[4], process.argv[5]);
} else {
assert.equal(process.platform, 'linux', 'Run this verification on disposable EC2 Linux, not a developer host');
const root = mkdtempSync(join(tmpdir(), 'paperclip-grok-public-install-'));
const prerequisite = join(root, 'native/grok');
const env = { ...process.env, NODE_PATH: '', PAPERCLIP_RELEASE_REUSE_UI_DIST: '1', npm_config_ignore_scripts: 'false', npm_config_audit: 'false', npm_config_fund: 'false' };
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, env, stdio: 'pipe', maxBuffer: 32 * 1024 * 1024 });
const sourceRevision = run('git', ['rev-parse', 'HEAD'], repo).toString().trim();
const releaseVersion = `0.0.0-grok-verify.${sourceRevision.slice(0, 12)}`;
try {
  const listing = run(process.execPath, [join(repo, 'scripts/release-package-map.mjs'), 'list'], repo).toString().trim().split('\n').map(line => line.split('\t'));
  const packages = new Map(listing.map(([dir, name]) => [name, { dir, manifest: JSON.parse(readFileSync(join(repo, dir, 'package.json'), 'utf8')) }]));
  const needed = new Set();
  function visit(name) {
    if (needed.has(name)) return;
    const entry = packages.get(name); assert.ok(entry, `Missing public workspace dependency ${name}`); needed.add(name);
    for (const [dep, spec] of Object.entries({ ...entry.manifest.dependencies, ...entry.manifest.optionalDependencies })) {
      if (spec.startsWith('workspace:')) visit(dep);
    }
  }
  visit('@paperclipai/server');
  visit('paperclipai');
  // Match release.sh's unified versioning in temporary staging directories.
  // Source manifests remain untouched, including independently versioned SDKs.
  run(process.execPath, [join(repo, 'scripts/build-standalone-public-packages.mjs')], repo);
  run('bash', [join(repo, 'scripts/prepare-server-ui-dist.sh')], repo);
  const tarballs = [];
  for (const [index, name] of [...needed].entries()) {
    const { dir, manifest } = packages.get(name);
    const target = join(root, `package-${index}`); mkdirSync(target);
    const stagedSource = join(root, `source-${index}`); mkdirSync(stagedSource);
    for (const file of manifest.files ?? ['dist']) {
      // release.sh stages runtime skills into these public packages before pack.
      const releaseSkills = file === 'skills' && ['server', 'packages/adapters/claude-local', 'packages/adapters/codex-local'].includes(dir);
      // Other adapters declare an optional skills directory that npm pack omits
      // when absent. Do not fabricate extra release payloads for those adapters.
      if (file === 'skills' && !releaseSkills && !existsSync(join(repo, dir, file))) continue;
      cpSync(releaseSkills ? join(repo, 'skills') : join(repo, dir, file), join(stagedSource, file), { recursive: true });
    }
    const releaseManifest = { ...manifest, version: releaseVersion };
    writeFileSync(join(stagedSource, 'package.json'), JSON.stringify(releaseManifest));
    if ((manifest.bundleDependencies ?? manifest.bundledDependencies ?? []).length) {
      prepareBundledPackage(stagedSource, target);
    } else {
      cpSync(stagedSource, target, { recursive: true });
      writeFileSync(join(target, 'package.json'), JSON.stringify(materializePublishManifest(releaseManifest)));
    }
    run('npm', ['pack', '--ignore-scripts', '--pack-destination', root], target);
    const packed = readdirSync(root).filter(f => f.endsWith('.tgz') && !tarballs.includes(join(root, f)));
    assert.equal(packed.length, 1);
    const tarball = join(root, packed[0]);
    assertNoBundledCodexPayloads(run('tar', ['-tzf', tarball]).toString().trim().split('\n'));
    tarballs.push(tarball);
  }
  // Preserve the exact Linux-produced public tarballs for independent Mac
  // consumers even if a later Linux runtime probe fails. This is a packaging
  // receipt, never an installation or provider-admission pass.
  if (process.env.PAPERCLIP_RUNNER_PUBLIC_PACKS_DIR) {
    const output = resolve(process.env.PAPERCLIP_RUNNER_PUBLIC_PACKS_DIR);
    assert.equal(JSON.parse(readFileSync(join(repo, 'server/dist/build-info.json'))).commit, sourceRevision);
    assert.ok(!existsSync(output), 'Never replace retained public packages');
    mkdirSync(output, { recursive: true });
    const { createHash } = await import('node:crypto');
    const archives = [...needed].map((name, index) => {
      const file = basename(tarballs[index]); cpSync(tarballs[index], join(output, file));
      return { name, file, sha256: createHash('sha256').update(readFileSync(tarballs[index])).digest('hex') };
    });
    writeFileSync(join(output, 'manifest.json'), JSON.stringify({
      schema: 'paperclip.runner.public-packages/v1', sourceRevision, releaseVersion,
      publicInstallationVerified: false, providerCalls: 0, archives,
    }, null, 2) + '\n');
  }
  const assets = join(root, 'assets'); mkdirSync(assets, { mode: 0o755 });
  const consumer = join(root, 'consumer'); mkdirSync(consumer);
  const cache = join(root, 'cache'); mkdirSync(cache);
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  for (const tarball of tarballs) {
    const destination = join(assets, basename(tarball)); cpSync(tarball, destination); chmodSync(destination, 0o644);
  }
  // Prove lifecycle execution is real even if npm changes its script defaults.
  const sentinelSource = join(root, 'lifecycle-sentinel'); mkdirSync(sentinelSource);
  writeFileSync(join(sentinelSource, 'package.json'), JSON.stringify({
    name: 'paperclip-verification-lifecycle-sentinel', version: '1.0.0', private: true,
    scripts: { postinstall: 'node -e "require(\'node:fs\').writeFileSync(\'lifecycle-ran\', \'ok\')"' },
  }));
  run('npm', ['pack', '--ignore-scripts', '--pack-destination', assets], sentinelSource);
  const sentinel = join(consumer, 'node_modules/paperclip-verification-lifecycle-sentinel/lifecycle-ran');
  const consumerUid = process.getuid();
  const isolated = (command, options = {}) => run('docker', grokConsumerDockerArgs({ assets, consumer, cache, uid: consumerUid, gid: process.getgid(), command, ...options }));
  // npm resolution is intentionally the public consumer graph, not the pnpm
  // workspace graph. Freeze that result before any lifecycle script can run.
  isolated(['npm', 'install', '--ignore-scripts', '--omit=dev', ...readdirSync(assets).filter(file => file.endsWith('.tgz')).map(file => `/packages/${file}`)], { download: true });
  assert.equal(existsSync(sentinel), false, 'Dependency download must not run lifecycle scripts');
  const consumerLock = readFileSync(join(consumer, 'package-lock.json'), 'utf8');
  // npm ci rejects bundled optional platform dependencies absent from its own
  // generated lock. Rebuild runs the deferred install hooks on the installed
  // graph without re-resolving it; network isolation and lock checks still hold.
  isolated(GROK_PUBLIC_INSTALL_LIFECYCLE);
  assert.equal(readFileSync(sentinel, 'utf8'), 'ok', 'Offline lifecycle scripts must actually execute');
  assert.equal(readFileSync(join(consumer, 'package-lock.json'), 'utf8'), consumerLock, 'Lifecycle execution must preserve the resolved consumer lock');
  for (const name of needed) {
    const installedManifest = JSON.parse(readFileSync(join(consumer, 'node_modules', name, 'package.json'), 'utf8'));
    assert.equal(installedManifest.version, releaseVersion, `Installed release version for ${name}`);
  }
  assert.equal(existsSync(prerequisite), false, 'npm must not provision Grok');
  const server = join(consumer, 'node_modules/@paperclipai/server');
  const installed = join(server, 'dist/vendor/paperclip-runner');
  const codexVersion = JSON.parse(readFileSync(join(repo, 'packages/paperclip-runner/acpx-profiles.json'), 'utf8')).profiles.codex.agentRuntimeVersion;
  assert.match(codexVersion, /^\d+\.\d+\.\d+$/);
  writeFileSync(join(assets, 'codex-probe.mjs'), installedCodexProbeSource(
    '/consumer/node_modules/@paperclipai/server/dist/vendor/paperclip-runner/index.js', '/consumer', codexVersion), { mode: 0o644 });
  const codex = JSON.parse(isolated(['node', '/packages/codex-probe.mjs']).toString().trim());
  assert.equal(codex.codexConsumerHostOnly, true);
  assert.equal(codex.codexPlatformPackageSource, 'official npm');
  assert.ok(existsSync(join(installed, 'providers/grok/launcher.cjs')));
  assert.equal(existsSync(join(consumer, 'node_modules/@paperclipai/grok-acp')), false);
  assert.equal(existsSync(join(installed, 'providers/grok/bin')), false);
  // Use real installed compiled code and its actual npm dependency graph. A
  // separate process prevents module resolution from borrowing this checkout.
  const probe = `
    import assert from 'node:assert/strict';
    import { verifyQualifiedAcpxInstallation } from '/consumer/node_modules/@paperclipai/server/dist/vendor/paperclip-runner/drivers/acpx/installation-integrity.js';
    import { resolveQualifiedAcpxProfile } from '/consumer/node_modules/@paperclipai/server/dist/vendor/paperclip-runner/drivers/acpx/qualified-profiles.js';
    const profile = resolveQualifiedAcpxProfile('grok', 'grok-4.7');
    const inspect = () => verifyQualifiedAcpxInstallation(profile, () => { throw new Error('Grok must not resolve an npm package'); });
    if (process.argv[2] === 'missing') await assert.rejects(inspect, /prerequisite missing/);
    else { const installation = await inspect(); assert.equal(installation.agentServerPackageJsonPath, null); assert.equal(installation.agentRuntimePackageJsonPath, null); await (await installation.openCommand()).close(); }
  `;
  writeFileSync(join(assets, 'probe.mjs'), probe, { mode: 0o644 });
  isolated(['node', '/packages/probe.mjs', 'missing']);
  // Provision as the unprivileged verification user, never into the host's /opt.
  // Only the positive probe sees this file at the canonical sandbox path.
  run(process.execPath, [join(repo, 'packages/paperclip-runner/scripts/provision-grok.mjs'), prerequisite]);
  isolated(['node', '/packages/probe.mjs', 'present'], { prerequisite });
  console.log(JSON.stringify({ schema: 'paperclip.grok.public-npm-install.v1', sourceRevision, releaseVersion, lifecycleScriptsEnabled: true, lifecycleSentinelVerified: true, lifecycleNetwork: 'none', consumerImage: GROK_PUBLIC_INSTALL_IMAGE, consumerUid, consumerLockPreserved: true, cleanNpmInstall: true, packageCount: needed.size, codexPackedPayloadsOmitted: true, codexPackedPackagesChecked: tarballs.length, ...codex, builtinLauncherPresent: true, separateGrokPackage: false, npmProvisionedBinary: false, missingPrerequisiteRejected: true, provisionedBinaryVerified: true, commandLeaseVerified: true, providerCalls: 0 }));
  // Exercise Pi's public CLI and installed server, never a private workspace
  // package or binary override. Public dependency downloads are explicit and
  // isolated; the actual admission probe runs without a network or credentials.
  const piProbe = join(assets, 'pi-public-install-probe.mjs');
  cpSync(join(repo, 'scripts/pi-public-install-probe.mjs'), piProbe); chmodSync(piProbe, 0o644);
  // Pi assembles a bundled runtime in scratch space before atomic publication.
  // Keep the existing sandbox and memory bound; only this download needs more
  // temporary capacity than the smaller offline lifecycle probes.
  const setup = isolated(['node', '/consumer/node_modules/paperclipai/dist/index.js', 'runtime', 'setup', 'pi'], { download: true, temporarySizeMiB: 2048 }).toString();
  const receipt = JSON.parse(setup.trim());
  assert.equal(receipt.status, 'installed_verified');
  assert.equal(receipt.target, 'linux-x64');
  assert.equal(readFileSync(join(consumer, 'package-lock.json'), 'utf8'), consumerLock, 'Pi setup must preserve the consumer dependency graph');
  // Verified launch leases also materialize the runtime in private scratch.
  // Docker defaults tmpfs to noexec. The offline admission probe must execute
  // its verified private snapshot while keeping lifecycle/download scratch noexec.
  console.log(isolated(['node', '/packages/pi-public-install-probe.mjs', '/consumer/node_modules/@paperclipai/server'], { temporarySizeMiB: 2048, temporaryExecutable: true }).toString().trim());
  if (process.env.PAPERCLIP_RUNNER_QUALIFICATION_PACKAGES_DIR) {
    const retained = retainRunnerQualificationPackages({ repo, output: process.env.PAPERCLIP_RUNNER_QUALIFICATION_PACKAGES_DIR, sourceRevision, releaseVersion, env,
      publicArchives: [...needed].map((name, index) => ({ name, file: tarballs[index] })),
    });
    console.log(JSON.stringify(retained));
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}
}
