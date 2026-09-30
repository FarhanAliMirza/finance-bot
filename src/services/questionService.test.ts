import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/expenses", () => ({
  getExpensesByDescription: vi.fn(),
  getExpensesBetween: vi.fn(),
  getLatestExpenses: vi.fn(),
}));
vi.mock("./budgetService", () => ({
  getMonthBudgetSnapshot: vi.fn(),
}));

import {
  getExpensesByDescription,
  getExpensesBetween,
} from "../db/expenses";
import { answerQuestion } from "./questionService";

const KOLKATA = "Asia/Kolkata";
const NOW = new Date("2026-08-15T06:30:00.000Z");

describe("answerQuestion spend_by_method", () => {
  beforeEach(() => {
    vi.mocked(getExpensesByDescription).mockReset();
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
        descriptionKeyword: null,
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
        descriptionKeyword: null,
        limit: null,
      },
      KOLKATA,
      NOW,
    );

    expect(reply.text).toBe("No expenses this week yet.");
    expect(reply.exportWindow).toBeUndefined();
  });
});

describe("answerQuestion spend_by_description", () => {
  beforeEach(() => {
    vi.mocked(getExpensesByDescription).mockReset();
    vi.mocked(getExpensesBetween).mockReset();
  });

  it("totals only database matches and does not offer an unfiltered export", async () => {
    vi.mocked(getExpensesByDescription).mockResolvedValue([
      { amount: 180, description: "Coffee beans" },
      { amount: 120, description: "coffee at work" },
    ] as never);

    const reply = await answerQuestion(
      "42",
      {
        kind: "spend_by_description",
        period: "month",
        from: null,
        to: null,
        category: null,
        paymentMethod: null,
        descriptionKeyword: "coffee",
        limit: null,
      },
      KOLKATA,
      NOW,
    );

    expect(reply.text).toBe(
      'Expenses matching "coffee" this month total ₹300 (2 expenses).',
    );
    expect(reply.exportWindow).toBeUndefined();
    expect(getExpensesBetween).not.toHaveBeenCalled();
    expect(getExpensesByDescription).toHaveBeenCalledWith(
      "42",
      "coffee",
      new Date("2026-07-31T18:30:00.000Z"),
      new Date("2026-08-15T18:30:00.000Z"),
    );
  });

  it("reports no matches while preserving punctuation in the literal term", async () => {
    vi.mocked(getExpensesByDescription).mockResolvedValue([] as never);

    const reply = await answerQuestion(
      "another-user",
      {
        kind: "spend_by_description",
        period: "week",
        from: null,
        to: null,
        category: null,
        paymentMethod: null,
        descriptionKeyword: "Joe's",
        limit: null,
      },
      KOLKATA,
      NOW,
    );

    expect(reply.text).toBe(
      'No expenses matching "Joe\'s" this week (₹0 across 0 expenses).',
    );
    expect(getExpensesByDescription).toHaveBeenCalledWith(
      "another-user",
      "Joe's",
      expect.any(Date),
      expect.any(Date),
    );
  });

  it("uses the existing inclusive custom-day timezone range", async () => {
    vi.mocked(getExpensesByDescription).mockResolvedValue([
      { amount: 500, description: "medicines" },
    ] as never);

    const reply = await answerQuestion(
      "42",
      {
        kind: "spend_by_description",
        period: "custom",
        from: "2026-09-01",
        to: "2026-09-15",
        category: null,
        paymentMethod: null,
        descriptionKeyword: "medicines",
        limit: null,
      },
      KOLKATA,
      NOW,
    );

    expect(reply.text).toBe(
      'Expenses matching "medicines" from 1 Sep to 15 Sep total ₹500 (1 expense).',
    );
    expect(getExpensesByDescription).toHaveBeenCalledWith(
      "42",
      "medicines",
      new Date("2026-08-31T18:30:00.000Z"),
      new Date("2026-09-15T18:30:00.000Z"),
    );
  });
});
