import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/expenses", () => ({
  getExpensesBetween: vi.fn(),
  getLatestExpenses: vi.fn(),
}));
vi.mock("./budgetService", () => ({
  getMonthBudgetSnapshot: vi.fn(),
}));

import { getExpensesBetween } from "../db/expenses";
import { answerQuestion } from "./questionService";

const KOLKATA = "Asia/Kolkata";
const NOW = new Date("2026-08-15T06:30:00.000Z");

describe("answerQuestion spend_by_method", () => {
  beforeEach(() => {
    vi.mocked(getExpensesBetween).mockReset();
  });

  it("answers how much on UPI this month from DB rows", async () => {
    vi.mocked(getExpensesBetween).mockResolvedValue([
      { amount: 8400, category: "Food", paymentMethod: "UPI" },
      { amount: 1200, category: "Food", paymentMethod: "Cash" },
      { amount: 3000, category: "Travel", paymentMethod: "UPI" },
    ] as never);

    const reply = await answerQuestion(
      "42",
      {
        kind: "spend_by_method",
        period: "month",
        from: null,
        to: null,
        category: null,
        paymentMethod: "UPI",
        limit: null,
      },
      KOLKATA,
      NOW,
    );

    expect(reply.text).toBe("UPI this month is ₹11,400 (2 expenses).");
    expect(reply.exportWindow).toEqual({ kind: "month" });
  });

  it("does not attach an export window when the period is empty", async () => {
    vi.mocked(getExpensesBetween).mockResolvedValue([] as never);

    const reply = await answerQuestion(
      "42",
      {
        kind: "spend_total",
        period: "week",
        from: null,
        to: null,
        category: null,
        paymentMethod: null,
        limit: null,
      },
      KOLKATA,
      NOW,
    );

    expect(reply.text).toBe("No expenses this week yet.");
    expect(reply.exportWindow).toBeUndefined();
  });
});
