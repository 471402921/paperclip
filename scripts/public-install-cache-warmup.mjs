import { existsSync, readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { setTimeout } from 'node:timers/promises';

const read = file => {
  try { return readFileSync(file, 'utf8'); } catch { return ''; }
};

export async function waitForPublicInstallNpmCache({
  statusFile = process.env.PAPERCLIP_PUBLIC_INSTALL_NPM_CACHE_STATUS,
  logFile = process.env.PAPERCLIP_PUBLIC_INSTALL_NPM_CACHE_LOG,
  timeoutMs = 180_000,
  pollMs = 1_000,
  log = console.log,
} = {}) {
  if (!statusFile) return { state: 'unconfigured', waitMs: 0 };
  const started = performance.now();
  while (!existsSync(statusFile) && performance.now() - started < timeoutMs) {
    await setTimeout(Math.min(pollMs, Math.max(0, timeoutMs - (performance.now() - started))));
  }
  const complete = existsSync(statusFile);
  const ready = complete && read(statusFile).trim() === '0';
  if (!ready) log('::notice title=Public-install npm cache::warm-up did not finish cleanly; the verifier fetches what is missing');
  if (logFile) {
    const tail = read(logFile).trimEnd();
    if (tail) for (const line of tail.split(/\r?\n/).slice(ready ? -1 : -20)) log(line);
  }
  return { state: ready ? 'ready' : complete ? 'failed' : 'timed_out', waitMs: Math.round(performance.now() - started) };
}
