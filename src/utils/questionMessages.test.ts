import { describe, expect, it } from "vitest";
import { computeBudgetPace } from "./budgetPace";
import {
  NO_BUDGET_NL_TEXT,
  UNANSWERED_QUESTION_TEXT,
  formatBudgetStatusNlReply,
  formatLastExpensesNlReply,
  formatPeriodLabel,
  formatSpendByCategoryReply,
  formatSpendByMethodReply,
  formatSpendTotalReply,
} from "./questionMessages";

const KOLKATA = "Asia/Kolkata";
const NOW = new Date("2026-08-26T20:00:00.000Z");

describe("formatSpendTotalReply", () => {
  it("summarizes today's total in one sentence", () => {
    expect(
      formatSpendTotalReply({
        periodLabel: "today",
        total: 1240,
        count: 3,
      }),
    ).toBe("You spent ₹1,240 today across 3 expenses.");
  });

  it("uses the empty-state copy when there are no expenses", () => {
    expect(
      formatSpendTotalReply({
        periodLabel: "today",
        total: 0,
        count: 0,
      }),
    ).toBe("No expenses today yet.");
  });
});

describe("formatSpendByCategoryReply", () => {
  it("summarizes a category for the week", () => {
    expect(
      formatSpendByCategoryReply({
        category: "Food",
        periodLabel: "this week",
        total: 3200,
        count: 4,
      }),
    ).toBe("Food this week is ₹3,200 (4 expenses).");
  });

  it("uses the empty-state copy when that category has no expenses", () => {
    expect(
      formatSpendByCategoryReply({
        category: "Food",
        periodLabel: "this week",
        total: 0,
        count: 0,
      }),
    ).toBe("No food expenses this week yet.");
  });
});

describe("formatSpendByMethodReply", () => {
  it("summarizes UPI spend for the month", () => {
    expect(
      formatSpendByMethodReply({
        paymentMethod: "UPI",
        periodLabel: "this month",
        total: 8400,
        count: 12,
      }),
    ).toBe("UPI this month is ₹8,400 (12 expenses).");
  });

  it("uses the empty-state copy when that method has no expenses", () => {
    expect(
      formatSpendByMethodReply({
        paymentMethod: "Cash",
        periodLabel: "this week",
        total: 0,
        count: 0,
      }),
    ).toBe("No Cash expenses this week yet.");
  });
});

describe("formatBudgetStatusNlReply", () => {
  it("includes remaining budget and pace, not the /budget dump", () => {
    const pace = computeBudgetPace({
      spent: 8400,
      monthlyBudget: 15000,
      dayOfMonth: 17,
      daysInMonth: 31,
    });
    expect(pace.statusKind).toBe("on_track");
    expect(formatBudgetStatusNlReply(15000, pace)).toBe(
      "This month you've used ₹8,400 of your ₹15,000 budget — ₹6,600 left, on track for this point in the month.",
    );
  });

  it("has a short no-budget reply", () => {
    expect(NO_BUDGET_NL_TEXT).toBe(
      "You don't have a monthly budget set. Use /setBudget to add one.",
    );
  });
});

describe("formatLastExpensesNlReply", () => {
  it("describes the latest expense in one sentence", () => {
    expect(
      formatLastExpensesNlReply(
        [
          {
            amount: 150,
            category: "Food",
            description: "Lunch at cafe",
            date: "2026-08-27",
          },
        ],
        KOLKATA,
        NOW,
      ),
    ).toBe("Your last expense was ₹150 on Food — Lunch at cafe, 27 Aug.");
  });
});

describe("formatPeriodLabel", () => {
  it("uses today / this week / this month", () => {
    expect(formatPeriodLabel("today")).toBe("today");
    expect(formatPeriodLabel("week")).toBe("this week");
    expect(formatPeriodLabel("month")).toBe("this month");
  });
});

describe("unanswered question copy", () => {
  it("suggests examples instead of logging", () => {
    expect(UNANSWERED_QUESTION_TEXT).toMatch(/today/i);
    expect(UNANSWERED_QUESTION_TEXT).toMatch(/category/i);
    expect(UNANSWERED_QUESTION_TEXT).toMatch(/payment method/i);
    expect(UNANSWERED_QUESTION_TEXT).toMatch(/last expenses/i);
  });
});
