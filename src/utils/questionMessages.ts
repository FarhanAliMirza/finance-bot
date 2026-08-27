import type { ExpenseCategory, QuestionPeriod } from "../types/intent";
import type { BudgetPace } from "./budgetPace";
import { DEFAULT_TIMEZONE, formatHumanDate } from "./dates";
import { formatRupees } from "./money";
import { formatCategoryWithMethod } from "./paymentMethods";

export const UNANSWERED_QUESTION_TEXT =
  "I can tell you spending for today, this week, this month, by category, by payment method, or your last expenses.";

export const NO_BUDGET_NL_TEXT =
  "You don't have a monthly budget set. Use /setBudget to add one.";

function expenseWord(count: number): string {
  return count === 1 ? "expense" : "expenses";
}

export function formatPeriodLabel(
  period: QuestionPeriod,
  from?: string | null,
  to?: string | null,
  timeZone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): string {
  switch (period) {
    case "today":
      return "today";
    case "week":
      return "this week";
    case "month":
      return "this month";
    case "custom": {
      const start = from ?? to;
      const end = to ?? from;
      if (!start || !end) return "this month";
      if (start === end) return `on ${formatHumanDate(start, timeZone, now)}`;
      return `from ${formatHumanDate(start, timeZone, now)} to ${formatHumanDate(end, timeZone, now)}`;
    }
  }
}

export function formatSpendTotalReply(input: {
  periodLabel: string;
  total: number;
  count: number;
}): string {
  const { periodLabel, total, count } = input;
  if (count === 0) return `No expenses ${periodLabel} yet.`;
  return `You spent ${formatRupees(total)} ${periodLabel} across ${count} ${expenseWord(count)}.`;
}

export function formatSpendByCategoryReply(input: {
  category: string;
  periodLabel: string;
  total: number;
  count: number;
}): string {
  const { category, periodLabel, total, count } = input;
  if (count === 0) {
    return `No ${category.toLowerCase()} expenses ${periodLabel} yet.`;
  }
  return `${category} ${periodLabel} is ${formatRupees(total)} (${count} ${expenseWord(count)}).`;
}

export function formatSpendByMethodReply(input: {
  paymentMethod: string;
  periodLabel: string;
  total: number;
  count: number;
}): string {
  const { paymentMethod, periodLabel, total, count } = input;
  if (count === 0) {
    return `No ${paymentMethod} expenses ${periodLabel} yet.`;
  }
  return `${paymentMethod} ${periodLabel} is ${formatRupees(total)} (${count} ${expenseWord(count)}).`;
}

export function formatBudgetStatusNlReply(
  monthlyBudget: number,
  pace: BudgetPace,
): string {
  if (pace.statusKind === "over") {
    return `This month you've used ${formatRupees(pace.spent)} of your ${formatRupees(monthlyBudget)} budget — over by ${formatRupees(Math.abs(pace.remaining))}.`;
  }
  const paceClause = pace.statusText
    ? pace.statusText.charAt(0).toLowerCase() + pace.statusText.slice(1)
    : "on track for this point in the month.";
  return `This month you've used ${formatRupees(pace.spent)} of your ${formatRupees(monthlyBudget)} budget — ${formatRupees(pace.remaining)} left, ${paceClause}`;
}

export function formatLastExpensesNlReply(
  items: Array<{
    amount: number;
    category: string;
    description?: string | null;
    date: string;
    paymentMethod?: string | null;
  }>,
  timeZone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): string {
  if (items.length === 0) return "You don't have any saved expenses yet.";

  if (items.length === 1) {
    const e = items[0];
    const desc = e.description?.trim();
    const date = formatHumanDate(e.date, timeZone, now);
    const extra = desc ? ` — ${desc}, ${date}` : `, ${date}`;
    return `Your last expense was ${formatRupees(e.amount)} on ${formatCategoryWithMethod(e.category, e.paymentMethod)}${extra}.`;
  }

  const parts = items.map((e) => {
    const desc = e.description?.trim();
    return `${formatRupees(e.amount)} on ${formatCategoryWithMethod(e.category, e.paymentMethod)}${desc ? ` (${desc})` : ""}`;
  });
  const last = parts.pop()!;
  const joined =
    parts.length === 1 ? `${parts[0]} and ${last}` : `${parts.join(", ")}, and ${last}`;
  return `Your last ${items.length} expenses were ${joined}.`;
}

export function formatEditLastConfirmation(
  expense: {
    amount: number;
    category: ExpenseCategory | string;
    description?: string | null;
    date: string;
    paymentMethod?: string | null;
  },
  timeZone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): string {
  const desc = expense.description?.trim();
  const date = formatHumanDate(expense.date, timeZone, now);
  const extra = desc ? ` — ${desc}, ${date}` : `, ${date}`;
  return `Updated your last expense to ${formatRupees(expense.amount)} (${formatCategoryWithMethod(expense.category, expense.paymentMethod)})${extra}.`;
}
