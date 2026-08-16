const RELOAD_KEY = 'mrwhite:chunk-reload';
const MAX_RELOADS = 2;

/** Evita bucles infinitos si el fallo no es por version skew. */
export function shouldReloadForChunkError(storage: Storage = sessionStorage): boolean {
  try {
    const count = Number(storage.getItem(RELOAD_KEY) ?? '0');
    if (!Number.isFinite(count) || count >= MAX_RELOADS) return false;
    storage.setItem(RELOAD_KEY, String(count + 1));
    return true;
  } catch {
    return false;
  }
}

export function clearChunkReloadGuard(storage: Storage = sessionStorage): void {
  try {
    storage.removeItem(RELOAD_KEY);
  } catch {
    /* ignore */
  }
}

export function isChunkLoadFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
  );
}
