/**
 * Recovers a tab whose lazy chunk or chunk CSS failed to load.
 *
 * A chunk or its CSS can fail to load in two ordinary ways: a parked tab
 * still runs an old bundle after a deploy replaced its hashed assets, or one
 * asset request fails while the network or the tab is briefly unavailable.
 * Either way the running bundle cannot finish the import, but a fresh
 * document can: `index.html` is served `no-store` and the service worker
 * fetches navigations network-first.
 *
 * Vite's preload helper dispatches `vite:preloadError` for every failed
 * dependency, then rejects only the first import that requested it; a later
 * import of the same chunk skips the dependency it already saw. The failure
 * can therefore land in a caller that ignores it, such as the task-page
 * prefetch, and leave the page without that CSS. `startChunkLoadRecovery`
 * reloads from the event so every caller is covered. The error boundaries
 * also call `reloadForChunkLoadError` for imports outside the helper, and
 * show a loading state instead of reporting while a recovery reload runs.
 *
 * It reloads at most once per `RELOAD_GUARD_MS`, recorded in sessionStorage,
 * so an asset that stays broken after the reload reaches the normal error UI
 * and Sentry instead of looping. Without sessionStorage there is no loop
 * guard, so it never reloads.
 */

const RELOAD_AT_KEY = "paperclip:chunk-load-reload-at";
const RELOAD_GUARD_MS = 5 * 60 * 1000;

// Vite's preload helper, then Chromium, Firefox, and WebKit dynamic import.
const CHUNK_LOAD_ERROR_PATTERNS = [
  /^Unable to preload CSS for /,
  /^Failed to fetch dynamically imported module/,
  /^error loading dynamically imported module/,
  /^Importing a module script failed/,
];

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => pattern.test(error.message));
}

type ReloadStorage = Pick<Storage, "getItem" | "setItem">;

type ChunkLoadRecoveryOptions = {
  storage?: () => ReloadStorage | null;
  reload?: () => void;
  now?: () => number;
};

function browserSessionStorage(): ReloadStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function createChunkLoadRecovery(options: ChunkLoadRecoveryOptions = {}) {
  const readStorage = options.storage ?? browserSessionStorage;
  const reload = options.reload ?? (() => window.location.reload());
  const now = options.now ?? Date.now;
  // This document already started a recovery reload. Later failures from the
  // same outage are part of it and must not reach the error UI or Sentry.
  let reloading = false;

  /**
   * Reload the page when `error` is a chunk load failure and no recovery
   * reload ran within the guard window. Returns whether a recovery reload is
   * running; the caller then shows a loading state and skips reporting.
   */
  function reloadForChunkLoadError(error: unknown): boolean {
    if (!isChunkLoadError(error)) return false;
    if (reloading) return true;
    const storage = readStorage();
    if (!storage) return false;
    const at = now();
    try {
      const lastReloadAt = Number(storage.getItem(RELOAD_AT_KEY));
      if (Number.isFinite(lastReloadAt) && lastReloadAt > 0 && at - lastReloadAt < RELOAD_GUARD_MS) {
        return false;
      }
      storage.setItem(RELOAD_AT_KEY, String(at));
    } catch {
      return false;
    }
    reloading = true;
    reload();
    return true;
  }

  /**
   * Listen for Vite's preload failures. The event stays uncancelled, so the
   * import still rejects and its caller behaves as before the reload lands.
   */
  function startChunkLoadRecovery(target: Pick<Window, "addEventListener" | "removeEventListener"> = window) {
    const onPreloadError = (event: Event) => {
      reloadForChunkLoadError((event as Event & { payload?: unknown }).payload);
    };
    target.addEventListener("vite:preloadError", onPreloadError);
    return () => target.removeEventListener("vite:preloadError", onPreloadError);
  }

  return { reloadForChunkLoadError, startChunkLoadRecovery };
}

const browserRecovery = createChunkLoadRecovery();

export const reloadForChunkLoadError = browserRecovery.reloadForChunkLoadError;
export const startChunkLoadRecovery = browserRecovery.startChunkLoadRecovery;
