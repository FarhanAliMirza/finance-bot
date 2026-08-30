import { EXPENSE_CATEGORIES, type ExpenseCategory } from "../types/expense";
import { UNSPECIFIED_METHOD_LABEL } from "./paymentMethods";

/** Dark enough to stay readable on pastel fills. */
export const EXPORT_TEXT_HEX = "#3A3A3A";

/** Very light warm linen for the header row only. */
export const HEADER_FILL_HEX = "#F4F1EB";

/** Subtle warm gray for thin cell borders. */
export const EXPORT_BORDER_HEX = "#DDD8D0";

/**
 * Pastel fills for the Category column.
 * Low saturation, high lightness — sage, peach, lavender, dusty rose, etc.
 */
export const CATEGORY_PASTEL_HEX: Record<ExpenseCategory, string> = {
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
};

export type ExportPaymentMethodLabel =
  | "Cash"
  | "Card"
  | "UPI"
  | typeof UNSPECIFIED_METHOD_LABEL;

/**
 * Pastel fills for the Payment method column.
 * Distinct from each other; calm, not neon.
 */
export const PAYMENT_METHOD_PASTEL_HEX: Record<
  ExportPaymentMethodLabel,
  string
> = {
  Cash: "#D4E8D4",
  Card: "#DDD4EC",
  UPI: "#D0E0F0",
  Unspecified: "#E4E0D8",
};

export const EXPORT_PAYMENT_METHOD_LABELS = [
  "Cash",
  "Card",
  "UPI",
  UNSPECIFIED_METHOD_LABEL,
] as const satisfies readonly ExportPaymentMethodLabel[];

export function hexToArgb(hex: string): string {
  const cleaned = hex.replace(/^#/, "").toUpperCase();
  return cleaned.length === 8 ? cleaned : `FF${cleaned}`;
}

export function categoryPastelHex(category: string): string {
  if ((EXPENSE_CATEGORIES as readonly string[]).includes(category)) {
    return CATEGORY_PASTEL_HEX[category as ExpenseCategory];
  }
  return CATEGORY_PASTEL_HEX.Other;
}

export function paymentMethodPastelHex(method: string): string {
  if (
    (EXPORT_PAYMENT_METHOD_LABELS as readonly string[]).includes(method)
  ) {
    return PAYMENT_METHOD_PASTEL_HEX[method as ExportPaymentMethodLabel];
  }
  return PAYMENT_METHOD_PASTEL_HEX.Unspecified;
}
