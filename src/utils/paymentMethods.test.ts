import { describe, expect, it } from "vitest";
import { PAYMENT_METHODS } from "../types/expense";
import { expenseSchema } from "./validation";
import {
  coercePaymentMethod,
  formatCategoryWithMethod,
  heuristicPaymentMethod,
} from "./paymentMethods";

describe("heuristicPaymentMethod", () => {
  it("maps common UPI phrases", () => {
    expect(heuristicPaymentMethod("Paid 150 via UPI")).toBe("UPI");
    expect(heuristicPaymentMethod("coffee 80 gpay")).toBe("UPI");
    expect(heuristicPaymentMethod("PhonePe lunch 200")).toBe("UPI");
    expect(heuristicPaymentMethod("paytm 90 snacks")).toBe("UPI");
    expect(heuristicPaymentMethod("paid 500 online")).toBe("UPI");
    expect(heuristicPaymentMethod("net banking 1200")).toBe("UPI");
  });

  it("maps card phrases", () => {
    expect(heuristicPaymentMethod("swiped the card for 800")).toBe("Card");
    expect(heuristicPaymentMethod("credit card groceries 2500")).toBe("Card");
    expect(heuristicPaymentMethod("visa 400")).toBe("Card");
  });

  it("maps cash", () => {
    expect(heuristicPaymentMethod("paid cash 150 for coffee")).toBe("Cash");
  });

  it("does not guess when the message does not mention a method", () => {
    expect(heuristicPaymentMethod("Spent 150 on coffee")).toBeUndefined();
    expect(heuristicPaymentMethod("Bought groceries for 2500")).toBeUndefined();
  });
});

describe("coercePaymentMethod", () => {
  it("accepts the closed Cash / Card / UPI set", () => {
    expect(coercePaymentMethod("upi")).toBe("UPI");
    expect(coercePaymentMethod("Card")).toBe("Card");
    expect(coercePaymentMethod("CASH")).toBe("Cash");
    expect(coercePaymentMethod("Bank")).toBeUndefined();
    expect([...PAYMENT_METHODS]).toEqual(["Cash", "Card", "UPI"]);
    expect(
      expenseSchema.safeParse({
        amount: 150,
        category: "Food",
        description: "coffee",
        date: "2026-08-27",
        paymentMethod: "UPI",
      }).success,
    ).toBe(true);
    expect(
      expenseSchema.safeParse({
        amount: 150,
        category: "Food",
        description: "coffee",
        date: "2026-08-27",
      }).success,
    ).toBe(true);
    expect(
      expenseSchema.safeParse({
        amount: 150,
        category: "Food",
        description: "coffee",
        date: "2026-08-27",
        paymentMethod: "Bank",
      }).success,
    ).toBe(false);
  });
});

describe("formatCategoryWithMethod", () => {
  it("appends the method only when present", () => {
    expect(formatCategoryWithMethod("Food")).toBe("Food");
    expect(formatCategoryWithMethod("Food", null)).toBe("Food");
    expect(formatCategoryWithMethod("Food", "UPI")).toBe("Food, UPI");
  });
});
