import { describe, expect, it } from "vitest";
import {
  NOTHING_TO_CHANGE_TEXT,
  NO_LAST_EXPENSE_TEXT,
  mergeExpenseEdit,
} from "./editLastExpenseService";

const current = {
  amount: 150,
  category: "Food",
  description: "Lunch at cafe",
  date: "2026-08-27",
  paymentMethod: null as const,
};

describe("mergeExpenseEdit", () => {
  it("applies a partial amount and category patch", () => {
    const result = mergeExpenseEdit(current, {
      amount: 200,
      category: "Travel",
    });
    expect(result).toEqual({
      ok: true,
      changed: ["amount", "category"],
      next: {
        amount: 200,
        category: "Travel",
        description: "Lunch at cafe",
        date: "2026-08-27",
        paymentMethod: null,
      },
    });
  });

  it("applies a date-only patch and leaves other fields", () => {
    const result = mergeExpenseEdit(current, { date: "2026-08-26" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.changed).toEqual(["date"]);
      expect(result.next).toEqual({
        ...current,
        date: "2026-08-26",
      });
    }
  });

  it("applies a payment-method patch", () => {
    const result = mergeExpenseEdit(current, { paymentMethod: "UPI" });
    expect(result).toEqual({
      ok: true,
      changed: ["paymentMethod"],
      next: {
        ...current,
        paymentMethod: "UPI",
      },
    });
  });

  it("returns nothing_to_change when the patch is empty or identical", () => {
    expect(mergeExpenseEdit(current, {})).toEqual({
      ok: false,
      reason: "nothing_to_change",
    });
    expect(mergeExpenseEdit(current, { amount: 150, category: "Food" })).toEqual(
      {
        ok: false,
        reason: "nothing_to_change",
      },
    );
  });
});

describe("edit last copy", () => {
  it("has NL errors for missing expense and empty patch", () => {
    expect(NO_LAST_EXPENSE_TEXT).toBe(
      "You don't have a saved expense to edit yet.",
    );
    expect(NOTHING_TO_CHANGE_TEXT).toMatch(/make it UPI/i);
  });
});
