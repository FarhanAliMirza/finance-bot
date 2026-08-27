import {
  PAYMENT_METHODS,
  type PaymentMethod,
} from "../types/expense";

export const UNSPECIFIED_METHOD_LABEL = "Unspecified";

const METHOD_PATTERNS: Array<[RegExp, PaymentMethod]> = [
  [
    /\b(upi|g-?pay|google pay|phone\s*pe|paytm|net\s*banking|netbanking|online)\b/i,
    "UPI",
  ],
  [/\b(cards?|credit|debit|visa|master\s*card)\b/i, "Card"],
  [/\bcash\b/i, "Cash"],
];

const METHOD_EDIT_RE =
  /\b((that|it)\s+was|make\s+it)\s+(upi|g-?pay|google pay|phone\s*pe|paytm|cash|cards?|credit|debit|visa|master\s*card)\b/i;

export function coercePaymentMethod(value: unknown): PaymentMethod | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return PAYMENT_METHODS.find((m) => m.toLowerCase() === trimmed.toLowerCase());
}

/**
 * Infer Cash / Card / UPI only from explicit phrases. Never guess.
 */
export function heuristicPaymentMethod(text: string): PaymentMethod | undefined {
  let best: { index: number; method: PaymentMethod } | undefined;
  for (const [re, method] of METHOD_PATTERNS) {
    const match = re.exec(text);
    if (match && (best == null || match.index < best.index)) {
      best = { index: match.index, method };
    }
  }
  return best?.method;
}

export function looksLikePaymentMethodEdit(text: string): boolean {
  return METHOD_EDIT_RE.test(text);
}

export function formatCategoryWithMethod(
  category: string,
  paymentMethod?: string | null,
): string {
  return paymentMethod ? `${category}, ${paymentMethod}` : category;
}

export function resolvePaymentMethod(
  value: unknown,
  originalText?: string,
): PaymentMethod | undefined {
  return coercePaymentMethod(value) ?? (originalText ? heuristicPaymentMethod(originalText) : undefined);
}
