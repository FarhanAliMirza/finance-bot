import { describe, expect, it } from "vitest";
import { computeBudgetPace, withAdditionalSpend } from "./budgetPace";

describe("computeBudgetPace", () => {
  it("flags early-month high spend as too fast", () => {
    const pace = computeBudgetPace({
      spent: 8000,
      monthlyBudget: 10000,
      dayOfMonth: 1,
      daysInMonth: 31,
    });
    expect(pace.statusKind).toBe("too_fast");
    expect(pace.usagePct).toBe(80);
    expect(pace.remaining).toBe(2000);
    expect(pace.statusText).toContain("most of the month left");
  });

  it("flags first-week 80% used as too fast", () => {
    const pace = computeBudgetPace({
      spent: 12000,
      monthlyBudget: 15000,
      dayOfMonth: 7,
      daysInMonth: 31,
    });
    expect(pace.statusKind).toBe("too_fast");
  });

  it("treats late-month 90% used as on track", () => {
    const pace = computeBudgetPace({
      spent: 13500,
      monthlyBudget: 15000,
      dayOfMonth: 31,
      daysInMonth: 31,
    });
    expect(pace.statusKind).toBe("on_track");
    expect(pace.usagePct).toBe(90);
    expect(pace.remaining).toBe(1500);
    expect(pace.statusText).toBe("On track for this point in the month.");
  });

  it("marks over-budget when spent exceeds monthly budget", () => {
    const pace = computeBudgetPace({
      spent: 15400,
      monthlyBudget: 15000,
      dayOfMonth: 20,
      daysInMonth: 31,
    });
    expect(pace.statusKind).toBe("over");
    expect(pace.remaining).toBe(-400);
    expect(pace.statusText).toBe("");
  });

  it("allows remaining to go negative", () => {
    const pace = computeBudgetPace({
      spent: 500,
      monthlyBudget: 100,
      dayOfMonth: 10,
      daysInMonth: 30,
    });
    expect(pace.remaining).toBe(-400);
    expect(pace.remaining).toBeLessThan(0);
  });

  it("treats mid-month spend near expected as on track", () => {
    const pace = computeBudgetPace({
      spent: 7500,
      monthlyBudget: 15000,
      dayOfMonth: 15,
      daysInMonth: 30,
    });
    expect(pace.statusKind).toBe("on_track");
    expect(pace.expectedPct).toBe(50);
    expect(pace.usagePct).toBe(50);
  });

  it("treats mid-month zero spend as under pace", () => {
    const pace = computeBudgetPace({
      spent: 0,
      monthlyBudget: 15000,
      dayOfMonth: 15,
      daysInMonth: 30,
    });
    expect(pace.statusKind).toBe("under");
    expect(pace.remaining).toBe(15000);
  });

  it("does not flip on tiny deviations from expected", () => {
    const pace = computeBudgetPace({
      spent: 7800,
      monthlyBudget: 15000,
      dayOfMonth: 15,
      daysInMonth: 30,
    });
    expect(pace.usagePct).toBe(52);
    expect(pace.statusKind).toBe("on_track");
  });

  it("projects remaining and usage as if extra spend were included", () => {
    const current = computeBudgetPace({
      spent: 2650,
      monthlyBudget: 15000,
      dayOfMonth: 6,
      daysInMonth: 31,
    });
    const projected = withAdditionalSpend(current, 150);
    expect(projected.spent).toBe(2800);
    expect(projected.remaining).toBe(12200);
    expect(projected.usagePct).toBe(Math.round((2800 / 15000) * 100));
  });
});
