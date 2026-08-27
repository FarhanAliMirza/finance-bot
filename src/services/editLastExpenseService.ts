import { getLatestExpense, updateExpenseById } from "../db/expenses";
import type { EditLastFields, ExpenseCategory, PaymentMethod } from "../types/intent";
import {
  calendarDateInTimeZone,
  createdAtForParsedDate,
  formatIsoDate,
} from "../utils/dates";
import { formatEditLastConfirmation } from "../utils/questionMessages";

export const NO_LAST_EXPENSE_TEXT =
  "You don't have a saved expense to edit yet.";

export const NOTHING_TO_CHANGE_TEXT =
  'I couldn\'t tell what to change on your last expense. Try "change that to 200", "make it Food", or "make it UPI".';

export interface ExpenseSnapshot {
  amount: number;
  category: string;
  description: string;
  date: string;
  paymentMethod: PaymentMethod | null;
}

export function mergeExpenseEdit(
  current: ExpenseSnapshot,
  patch: EditLastFields,
):
  | { ok: true; next: ExpenseSnapshot; changed: (keyof EditLastFields)[] }
  | { ok: false; reason: "nothing_to_change" } {
  const next: ExpenseSnapshot = { ...current };
  const changed: (keyof EditLastFields)[] = [];

  if (patch.amount != null && patch.amount !== current.amount) {
    next.amount = patch.amount;
    changed.push("amount");
  }
  if (patch.category && patch.category !== current.category) {
    next.category = patch.category;
    changed.push("category");
  }
  if (
    patch.description != null &&
    patch.description.trim() !== current.description
  ) {
    next.description = patch.description.trim();
    changed.push("description");
  }
  if (patch.date && patch.date !== current.date) {
    next.date = patch.date;
    changed.push("date");
  }
  if (
    patch.paymentMethod &&
    patch.paymentMethod !== current.paymentMethod
  ) {
    next.paymentMethod = patch.paymentMethod;
    changed.push("paymentMethod");
  }

  if (changed.length === 0) return { ok: false, reason: "nothing_to_change" };
  return { ok: true, next, changed };
}

export async function editLastExpense(
  userId: string,
  fields: EditLastFields,
  timeZone: string,
  now: Date = new Date(),
): Promise<string> {
  const latest = await getLatestExpense(userId);
  if (!latest) return NO_LAST_EXPENSE_TEXT;

  const current: ExpenseSnapshot = {
    amount: latest.amount,
    category: latest.category,
    description: latest.description,
    date: formatIsoDate(calendarDateInTimeZone(latest.createdAt, timeZone)),
    paymentMethod: latest.paymentMethod,
  };

  const merged = mergeExpenseEdit(current, fields);
  if (!merged.ok) return NOTHING_TO_CHANGE_TEXT;

  const data: {
    amount?: number;
    category?: string;
    description?: string;
    paymentMethod?: PaymentMethod | null;
    createdAt?: Date;
  } = {};
  if (merged.changed.includes("amount")) data.amount = merged.next.amount;
  if (merged.changed.includes("category")) data.category = merged.next.category;
  if (merged.changed.includes("description")) {
    data.description = merged.next.description;
  }
  if (merged.changed.includes("date")) {
    data.createdAt = createdAtForParsedDate(merged.next.date, timeZone, now);
  }
  if (merged.changed.includes("paymentMethod")) {
    data.paymentMethod = merged.next.paymentMethod;
  }

  const updated = await updateExpenseById(userId, latest.id, data);
  if (!updated) return NO_LAST_EXPENSE_TEXT;

  return formatEditLastConfirmation(
    {
      amount: merged.next.amount,
      category: merged.next.category as ExpenseCategory,
      description: merged.next.description,
      date: merged.next.date,
      paymentMethod: merged.next.paymentMethod,
    },
    timeZone,
    now,
  );
}
