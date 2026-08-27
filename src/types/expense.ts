export const EXPENSE_CATEGORIES = [
  "Food",
  "Travel",
  "Utilities",
  "Shopping",
  "Medical",
  "Subscription",
  "Entertainment",
  "Gift",
  "Investment",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PAYMENT_METHODS = ["Cash", "Card", "UPI"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface ParsedExpense {
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string; // YYYY-MM-DD
  paymentMethod?: PaymentMethod;
}
