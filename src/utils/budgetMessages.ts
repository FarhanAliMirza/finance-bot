import { DEFAULT_TIMEZONE, formatHumanDate } from "./dates";
import { formatRupees } from "./money";
import { formatCategoryWithMethod } from "./paymentMethods";
import type { BudgetPace } from "./budgetPace";

export interface ExpenseLogInput {
  amount: number;
  category: string;
  description?: string | null;
  date: string;
  paymentMethod?: string | null;
}

export function formatBudgetStatusLines(pace: BudgetPace): string[] {
  const lines = [
    `Budget remaining: ${formatRupees(pace.remaining)}`,
    `Usage: ${pace.usagePct}%`,
  ];
  if (pace.statusKind === "over") {
    lines.push(`Over by ${formatRupees(Math.abs(pace.remaining))}`);
  } else if (pace.statusText) {
    lines.push(pace.statusText);
  }
  return lines;
}

export const EXPENSE_CANCELLED_TEXT = "❌ Cancelled — not saved.";
export const EXPENSE_UNDONE_TEXT = "↩️ Undone — expense removed.";
export const EXPENSE_EXPIRED_UNSAVED_TEXT =
  "⏱️ Not saved — send the expense again.";

function amountLine(expense: ExpenseLogInput): string {
  return `${formatRupees(expense.amount)} (${formatCategoryWithMethod(expense.category, expense.paymentMethod)})`;
}

function expenseBodyLines(
  expense: ExpenseLogInput,
  timeZone: string,
): string[] {
  const lines: string[] = [];
  const description = expense.description?.trim();
  if (description) {
    lines.push(description);
  }
  lines.push(formatHumanDate(expense.date, timeZone));
  return lines;
}

function withOptionalBudgetBlock(
  lines: string[],
  pace: BudgetPace | null,
): string {
  if (pace) {
    lines.push("");
    lines.push(...formatBudgetStatusLines(pace));
  }
  return lines.join("\n");
}

export function formatExpenseLogReply(
  expense: ExpenseLogInput,
  pace: BudgetPace | null,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return withOptionalBudgetBlock(
    [
      `✅ Logged ${amountLine(expense)}`,
      ...expenseBodyLines(expense, timeZone),
    ],
    pace,
  );
}

export function formatExpenseDraftReply(
  expense: ExpenseLogInput,
  pace: BudgetPace | null,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const lines = [
    "📝 Confirm this expense?",
    amountLine(expense),
    ...expenseBodyLines(expense, timeZone),
  ];
  if (!expense.paymentMethod) {
    lines.push("How did you pay?");
  }
  return withOptionalBudgetBlock(lines, pace);
}

export function formatBudgetCommandReply(
  month: string,
  monthlyBudget: number,
  pace: BudgetPace,
): string {
  return [
    `🗓️ Budget for the month of ${month} is :`,
    formatRupees(monthlyBudget),
    "",
    `Current Spendings : ${formatRupees(pace.spent)}`,
    ...formatBudgetStatusLines(pace),
  ].join("\n");
}
