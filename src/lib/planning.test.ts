import { describe, expect, it } from "vitest";
import { activityCalories, basalCalories, dailyExpenditure, goalMonthlyRequired, habitsForDay, monthlyProjection } from "./planning";
describe("personal planning", () => {
  it("starts without default habits", () => expect(habitsForDay([], "2026-10-19")).toEqual([]));
  it("daily habit completion does not carry into tomorrow", () => {
    expect(habitsForDay([{ habit_id: "a", checked_on: "2026-10-19" }], "2026-10-20")).toEqual([]);
  });
  it("estimates resting calories from the supplied body measurements", () => {
    expect(basalCalories({ weight_kg: 70, height_cm: 175, age: 30, sex: "male" })).toBe(1649);
  });
  it("adds net activity calories without recounting resting expenditure", () => {
    expect(activityCalories(3.5, 70, 30)).toBe(92);
    expect(dailyExpenditure({ weight_kg: 70, height_cm: 175, age: 30, sex: "male" }, 92)).toBe(2071);
  });
  it("projects a month's income and spending from elapsed days", () => {
    expect(monthlyProjection(1500, 600, new Date(2026, 9, 15))).toEqual({ income: 3100, expense: 1240, balance: 1860 });
  });
  it("calculates the monthly amount needed for a savings goal", () => {
    expect(goalMonthlyRequired(1200, 200, "2026-11-19", "2026-10-19")).toBe(500);
    expect(goalMonthlyRequired(1200, 1200, "2026-11-19", "2026-10-19")).toBe(0);
  });
});