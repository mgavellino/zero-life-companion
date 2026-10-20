import { describe, expect, it } from "vitest";
import { localToUtcIso } from "./tz";
describe("localToUtcIso", () => {
  it("treats 21:27 in São Paulo as 00:27 UTC next day", () => {
    expect(localToUtcIso("2026-10-19T21:27", "America/Sao_Paulo")).toBe("2026-10-20T00:27:00.000Z");
  });
  it("keeps explicit offsets", () => {
    expect(localToUtcIso("2026-10-19T21:27:00-03:00", "Europe/Lisbon")).toBe("2026-10-20T00:27:00.000Z");
  });
});
