import { describe, expect, it } from "vitest";
import { EXPENSE_CATEGORIES } from "../types/expense";
import { UNSPECIFIED_METHOD_LABEL } from "./paymentMethods";
import {
  CATEGORY_PASTEL_HEX,
  EXPORT_PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_PASTEL_HEX,
  categoryPastelHex,
  hexToArgb,
  paymentMethodPastelHex,
} from "./exportColors";

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

function hexLightness(hex: string): number {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

describe("export pastel hex map", () => {
  it("maps every category to a distinct pastel", () => {
    expect(Object.keys(CATEGORY_PASTEL_HEX)).toEqual([...EXPENSE_CATEGORIES]);
    expect(CATEGORY_PASTEL_HEX).toEqual({
      Food: "#F5D6C4",
      Travel: "#C9D8EC",
      Utilities: "#C9D9D6",
      Shopping: "#E8C9C9",
      Medical: "#D0E6D4",
      Subscription: "#D6CEE8",
      Entertainment: "#E4D4EA",
      Gift: "#F0D6DE",
      Investment: "#D6E2C8",
      Other: "#E2DDD4",
    });

    const hexes = Object.values(CATEGORY_PASTEL_HEX);
    expect(new Set(hexes).size).toBe(hexes.length);
    for (const hex of hexes) {
      expect(hex).toMatch(HEX6);
      expect(hexLightness(hex)).toBeGreaterThanOrEqual(0.78);
    }
  });

  it("maps every payment method to a distinct pastel", () => {
    expect([...EXPORT_PAYMENT_METHOD_LABELS]).toEqual([
      "Cash",
      "Card",
      "UPI",
      UNSPECIFIED_METHOD_LABEL,
    ]);
    expect(PAYMENT_METHOD_PASTEL_HEX).toEqual({
      Cash: "#D4E8D4",
      Card: "#DDD4EC",
      UPI: "#D0E0F0",
      Unspecified: "#E4E0D8",
    });

    const hexes = Object.values(PAYMENT_METHOD_PASTEL_HEX);
    expect(new Set(hexes).size).toBe(hexes.length);
    for (const hex of hexes) {
      expect(hex).toMatch(HEX6);
      expect(hexLightness(hex)).toBeGreaterThanOrEqual(0.78);
    }
  });

  it("falls back to Other / Unspecified for unknown labels", () => {
    expect(categoryPastelHex("Unknown")).toBe(CATEGORY_PASTEL_HEX.Other);
    expect(paymentMethodPastelHex("Bitcoin")).toBe(
      PAYMENT_METHOD_PASTEL_HEX.Unspecified,
    );
  });

  it("converts #RRGGBB to Excel ARGB", () => {
    expect(hexToArgb("#F5D6C4")).toBe("FFF5D6C4");
    expect(hexToArgb("d4e8d4")).toBe("FFD4E8D4");
  });
});
