import { describe, expect, it } from "vitest";
import {
  formatPaymentMethodBreakdown,
  summarizePaymentMethods,
} from "./paymentMethodMessages";

describe("summarizePaymentMethods", () => {
  it("totals amount and count, sorted by amount descending", () => {
    const rows = summarizePaymentMethods([
      { amount: 40, paymentMethod: "Cash" },
      { amount: 40, paymentMethod: "Cash" },
      { amount: 12000, paymentMethod: "UPI" },
      { amount: 3000, paymentMethod: "Card" },
    ]);
    expect(rows).toEqual([
      { method: "UPI", amount: 12000, count: 1 },
      { method: "Card", amount: 3000, count: 1 },
      { method: "Cash", amount: 80, count: 2 },
    ]);
  });

  it("labels missing methods as Unspecified only when those rows exist", () => {
    const rows = summarizePaymentMethods([
      { amount: 150, paymentMethod: "UPI" },
      { amount: 80, paymentMethod: null },
    ]);
    expect(rows).toEqual([
      { method: "UPI", amount: 150, count: 1 },
      { method: "Unspecified", amount: 80, count: 1 },
    ]);
    expect(
      summarizePaymentMethods([{ amount: 150, paymentMethod: "Cash" }]).some(
        (row) => row.method === "Unspecified",
      ),
    ).toBe(false);
  });
});

describe("formatPaymentMethodBreakdown", () => {
  it("formats amount and count per method", () => {
    expect(
      formatPaymentMethodBreakdown([
        { amount: 8400, paymentMethod: "UPI" },
        { amount: 1200, paymentMethod: "Cash" },
        { amount: 3000, paymentMethod: "Card" },
      ]),
    ).toBe(
      [
        "Payment methods:",
        "• UPI: ₹8,400 (1)",
        "• Card: ₹3,000 (1)",
        "• Cash: ₹1,200 (1)",
      ].join("\n"),
    );
  });

  it("returns null when there are no expenses", () => {
    expect(formatPaymentMethodBreakdown([])).toBeNull();
  });
});
