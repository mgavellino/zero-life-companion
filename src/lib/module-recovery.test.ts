import { describe, expect, it } from "vitest";
import { claimModuleReload, isModuleLoadError } from "./module-recovery";
describe("module loading recovery", () => {
  it("recognises the reported Safari import failure, not application errors", () => {
    expect(isModuleLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isModuleLoadError(new Error("Failed to fetch dynamically imported module: /assets/chat.js"))).toBe(true);
    expect(isModuleLoadError(new Error("Invalid task"))).toBe(false);
  });
  it("permits one reload and prevents a reload loop", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(claimModuleReload(storage, 100_000)).toBe(true);
    expect(claimModuleReload(storage, 100_001)).toBe(false);
    expect(claimModuleReload(storage, 130_001)).toBe(true);
  });
  it("does not throw when browser storage is blocked", () => {
    expect(claimModuleReload({ getItem: () => { throw new Error("blocked"); }, setItem: () => {} })).toBe(false);
  });
});