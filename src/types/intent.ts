import type { ParsedExpense, PaymentMethod } from "./expense";

export type ExpenseCategory = ParsedExpense["category"];
export type { PaymentMethod };

export type IntentKind = "log" | "question" | "edit_last";

export type HeuristicIntent = IntentKind | "ambiguous";

export type QuestionKind =
  | "spend_total"
  | "spend_by_category"
  | "spend_by_method"
  | "budget_status"
  | "last_expenses"
  | "other";

export type QuestionPeriod = "today" | "week" | "month" | "custom";

export interface QuestionSlots {
  kind: QuestionKind;
  period: QuestionPeriod;
  from: string | null;
  to: string | null;
  category: ExpenseCategory | null;
  paymentMethod: PaymentMethod | null;
  limit: number | null;
}

export interface EditLastFields {
  amount?: number;
  category?: ExpenseCategory;
  description?: string;
  date?: string;
  paymentMethod?: PaymentMethod;
}

export type ClassifiedIntent =
  | { intent: "log"; expense: ParsedExpense }
  | { intent: "question"; question: QuestionSlots }
  | { intent: "edit_last"; fields: EditLastFields };
