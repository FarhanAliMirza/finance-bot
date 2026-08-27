import { describe, expect, it } from "vitest";
import { computeBudgetPace } from "./budgetPace";
import {
  EXPENSE_CANCELLED_TEXT,
  EXPENSE_EXPIRED_UNSAVED_TEXT,
  EXPENSE_UNDONE_TEXT,
  formatBudgetCommandReply,
  formatExpenseDraftReply,
  formatExpenseLogReply,
} from "./budgetMessages";

const onTrackPace = computeBudgetPace({
  spent: 2650,
  monthlyBudget: 15000,
  dayOfMonth: 6,
  daysInMonth: 31,
});

describe("formatExpenseLogReply", () => {
  const expense = {
    amount: 150,
    category: "Food",
    description: "Lunch at cafe",
    date: "2026-08-27",
  };

  it("omits the budget block when no budget is set", () => {
    const message = formatExpenseLogReply(expense, null);
    const lines = message.split("\n");
    expect(lines[0]).toBe("✅ Logged ₹150 (Food)");
    expect(lines[1]).toBe("Lunch at cafe");
    expect(lines[2]).toMatch(/^27 Aug( \d{4})?$/);
    expect(lines).toHaveLength(3);
    expect(message).not.toContain("Budget remaining");
    expect(message).not.toContain("Usage:");
    expect(message).not.toContain("/setBudget");
  });

  it("includes the payment method in the amount line when present", () => {
    const message = formatExpenseLogReply(
      { ...expense, paymentMethod: "UPI" },
      null,
    );
    expect(message.split("\n")[0]).toBe("✅ Logged ₹150 (Food, UPI)");
  });

  it("includes remaining, usage, and status when a budget is set", () => {
    expect(onTrackPace.statusKind).toBe("on_track");
    const message = formatExpenseLogReply(expense, onTrackPace);
    expect(message).toContain("✅ Logged ₹150 (Food)");
    expect(message).toContain("Lunch at cafe");
    expect(message).toMatch(/27 Aug( \d{4})?/);
    expect(message).toContain("Budget remaining: ₹12,350");
    expect(message).toContain(`Usage: ${onTrackPace.usagePct}%`);
    expect(message).toContain("On track for this point in the month.");
  });

  it("omits description when it is empty", () => {
    const message = formatExpenseLogReply(
      { ...expense, description: "  " },
      null,
    );
    const lines = message.split("\n");
    expect(lines[0]).toBe("✅ Logged ₹150 (Food)");
    expect(lines[1]).toMatch(/^27 Aug( \d{4})?$/);
    expect(lines).toHaveLength(2);
  });

  it("shows negative remaining and over-by when over budget", () => {
    const over = computeBudgetPace({
      spent: 15400,
      monthlyBudget: 15000,
      dayOfMonth: 27,
      daysInMonth: 31,
    });
    const message = formatExpenseLogReply(expense, over);
    expect(message).toContain("Budget remaining: -₹400");
    expect(message).toContain("Over by ₹400");
    expect(message).not.toContain("On track");
  });

  it("shows too-fast copy for early-month overspend", () => {
    const tooFast = computeBudgetPace({
      spent: 12000,
      monthlyBudget: 15000,
      dayOfMonth: 5,
      daysInMonth: 31,
    });
    const message = formatExpenseLogReply(expense, tooFast);
    expect(message).toContain("Budget remaining:");
    expect(message).toContain("Usage:");
    expect(message).toContain("Spending faster than the month");
    expect(message).toContain("most of the month left");
  });
});

describe("formatExpenseDraftReply", () => {
  const expense = {
    amount: 150,
    category: "Food",
    description: "Lunch at cafe",
    date: "2026-08-27",
  };

  it("uses the same details and projected budget block as the log reply", () => {
    const message = formatExpenseDraftReply(expense, onTrackPace);
    const lines = message.split("\n");
    expect(lines[0]).toBe("📝 Confirm this expense?");
    expect(lines[1]).toBe("₹150 (Food)");
    expect(lines[2]).toBe("Lunch at cafe");
    expect(lines[3]).toMatch(/^27 Aug( \d{4})?$/);
    expect(message).toContain("Budget remaining: ₹12,350");
    expect(message).toContain(`Usage: ${onTrackPace.usagePct}%`);
    expect(message).toContain("On track for this point in the month.");
  });

  it("omits the budget block when no budget is set", () => {
    const message = formatExpenseDraftReply(expense, null);
    expect(message).not.toContain("Budget remaining");
    expect(message).not.toContain("Usage:");
  });

  it("asks how they paid when the method is missing", () => {
    const message = formatExpenseDraftReply(expense, null);
    expect(message).toContain("How did you pay?");
    expect(message.split("\n")[1]).toBe("₹150 (Food)");
  });

  it("shows the inferred method and skips the pay prompt", () => {
    const message = formatExpenseDraftReply(
      { ...expense, paymentMethod: "Cash" },
      null,
    );
    expect(message.split("\n")[1]).toBe("₹150 (Food, Cash)");
    expect(message).not.toContain("How did you pay?");
  });
});

describe("expense draft outcome copy", () => {
  it("uses a cancelled state, an undone-saved state, and expire-without-save copy", () => {
    expect(EXPENSE_CANCELLED_TEXT).toBe("❌ Cancelled — not saved.");
    expect(EXPENSE_UNDONE_TEXT).toBe("↩️ Undone — expense removed.");
    expect(EXPENSE_EXPIRED_UNSAVED_TEXT).toBe(
      "⏱️ Not saved — send the expense again.",
    );
  });
});

describe("formatBudgetCommandReply", () => {
  it("uses the same remaining, usage, and pace status as the log reply", () => {
    const message = formatBudgetCommandReply("August", 15000, onTrackPace);
    expect(message).toContain("Budget remaining: ₹12,350");
    expect(message).toContain(`Usage: ${onTrackPace.usagePct}%`);
    expect(message).toContain("On track for this point in the month.");
    expect(message).toContain("Current Spendings : ₹2,650");
  });

  it("shows negative remaining when over budget", () => {
    const over = computeBudgetPace({
      spent: 15400,
      monthlyBudget: 15000,
      dayOfMonth: 27,
      daysInMonth: 31,
    });
    const message = formatBudgetCommandReply("August", 15000, over);
    expect(message).toContain("Budget remaining: -₹400");
    expect(message).toContain("Over by ₹400");
  });
});
