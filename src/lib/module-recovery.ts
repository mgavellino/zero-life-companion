const KEY = "zero-chunk-reload";
export function isModuleLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk .+ failed/i.test(message);
}
export function claimModuleReload(storage: Pick<Storage, "getItem" | "setItem">, now = Date.now()): boolean {
  try {
    const last = Number(storage.getItem(KEY) ?? 0);
    if (last > 0 && now - last < 30_000) return false;
    storage.setItem(KEY, String(now));
    return true;
  } catch { return false; }
}
// The app booted fine, so a future failure is allowed to reload again.
export function clearModuleReloadFlag(storage: Pick<Storage, "removeItem">): void {
  try { storage.removeItem(KEY); } catch { /* ignore */ }
}