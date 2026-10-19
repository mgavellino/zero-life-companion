import { describe, expect, it } from "vitest";
import { formatClock, formatHeight, formatWeight, heightToCm, weightToKg, weightValue, type UnitsPrefs } from "./units";

const metric: UnitsPrefs = { weight: "kg", height: "cm", distance: "km", clock: "24", currency: "BRL" };
const imperial: UnitsPrefs = { weight: "lb", height: "ft", distance: "mi", clock: "12", currency: "USD" };

describe("units", () => {
  it("converts kg to lb and back", () => {
    expect(weightValue(70, imperial)).toBeCloseTo(154.32, 1);
    expect(weightToKg(154.32, imperial)).toBeCloseTo(70, 1);
    expect(weightValue(70, metric)).toBe(70);
  });

  it("formats weight with the preferred unit", () => {
    expect(formatWeight(70, metric)).toBe("70.0 kg");
    expect(formatWeight(70, imperial)).toContain("lb");
  });

  it("converts cm to feet/inches and back", () => {
    expect(formatHeight(180, metric)).toBe("180 cm");
    expect(formatHeight(180, imperial)).toBe("5'11\"");
    expect(heightToCm(5, imperial, 11)).toBeCloseTo(180.3, 0);
    expect(heightToCm(180, metric)).toBe(180);
  });

  it("formats clock in 24h and 12h", () => {
    const d = new Date(2026, 0, 1, 15, 30);
    expect(formatClock(d, metric)).toBe("15:30");
    expect(formatClock(d, imperial)).toBe("3:30 PM");
  });
});
