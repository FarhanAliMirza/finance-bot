import {
  getExpensesBetween,
  getLatestExpenses,
} from "../db/expenses";
import { getMonthBudgetSnapshot } from "./budgetService";
import type { QuestionSlots } from "../types/intent";
import type { ExportWindow } from "./expenseExport";
import {
  calendarDateInTimeZone,
  dateRangeForIsoDays,
  formatIsoDate,
  monthRange,
  todayRange,
  weekRange,
  type InstantRange,
} from "../utils/dates";
import {
  NO_BUDGET_NL_TEXT,
  UNANSWERED_QUESTION_TEXT,
  formatBudgetStatusNlReply,
  formatLastExpensesNlReply,
  formatPeriodLabel,
  formatSpendByCategoryReply,
  formatSpendByMethodReply,
  formatSpendTotalReply,
} from "../utils/questionMessages";

const DEFAULT_LAST_LIMIT = 1;

export type QuestionAnswer = {
  text: string;
  exportWindow?: ExportWindow;
};

function windowFromQuestion(question: QuestionSlots): ExportWindow | undefined {
  if (question.period === "custom") {
    const from = question.from ?? question.to;
    const to = question.to ?? question.from;
    if (!from || !to) return undefined;
    return from <= to
      ? { kind: "custom", from, to }
      : { kind: "custom", from: to, to: from };
  }
  return { kind: question.period };
}

function withExport(
  text: string,
  count: number,
  question: QuestionSlots,
): QuestionAnswer {
  if (count <= 0) return { text };
  const exportWindow = windowFromQuestion(question);
  return exportWindow ? { text, exportWindow } : { text };
}

function rangeForQuestion(
  question: QuestionSlots,
  timeZone: string,
  now: Date,
): InstantRange | null {
  switch (question.period) {
    case "today":
      return todayRange(timeZone, now);
    case "week":
      return weekRange(timeZone, now);
    case "month":
      return monthRange(timeZone, now);
    case "custom": {
      const from = question.from ?? question.to;
      const to = question.to ?? question.from;
      if (!from || !to) return null;
      return dateRangeForIsoDays(from, to, timeZone);
    }
  }
}

async function answerSpend(
  userId: string,
  question: QuestionSlots,
  timeZone: string,
  now: Date,
): Promise<QuestionAnswer> {
  const range = rangeForQuestion(question, timeZone, now);
  if (!range) return { text: UNANSWERED_QUESTION_TEXT };

  const expenses = await getExpensesBetween(
    userId,
    range.startInclusive,
    range.endExclusive,
  );
  const periodLabel = formatPeriodLabel(
    question.period,
    question.from,
    question.to,
    timeZone,
    now,
  );

  if (question.kind === "spend_by_category" && question.category) {
    const matched = expenses.filter((e) => {
      if (e.category !== question.category) return false;
      if (question.paymentMethod) return e.paymentMethod === question.paymentMethod;
      return true;
    });
    const total = matched.reduce((sum, e) => sum + e.amount, 0);
    return withExport(
      formatSpendByCategoryReply({
        category: question.paymentMethod
          ? `${question.category} on ${question.paymentMethod}`
          : question.category,
        periodLabel,
        total,
        count: matched.length,
      }),
      matched.length,
      question,
    );
  }

  if (question.kind === "spend_by_method" && question.paymentMethod) {
    const matched = expenses.filter(
      (e) => e.paymentMethod === question.paymentMethod,
    );
    const total = matched.reduce((sum, e) => sum + e.amount, 0);
    return withExport(
      formatSpendByMethodReply({
        paymentMethod: question.paymentMethod,
        periodLabel,
        total,
        count: matched.length,
      }),
      matched.length,
      question,
    );
  }

  const filtered = question.paymentMethod
    ? expenses.filter((e) => e.paymentMethod === question.paymentMethod)
    : expenses;
  if (question.paymentMethod) {
    const total = filtered.reduce((sum, e) => sum + e.amount, 0);
    return withExport(
      formatSpendByMethodReply({
        paymentMethod: question.paymentMethod,
        periodLabel,
        total,
        count: filtered.length,
      }),
      filtered.length,
      question,
    );
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return withExport(
    formatSpendTotalReply({
      periodLabel,
      total,
      count: expenses.length,
    }),
    expenses.length,
    question,
  );
}

async function answerBudget(userId: string): Promise<QuestionAnswer> {
  const snapshot = await getMonthBudgetSnapshot(userId);
  if (!snapshot) return { text: NO_BUDGET_NL_TEXT };
  return {
    text: formatBudgetStatusNlReply(snapshot.monthlyBudget, snapshot.pace),
  };
}

async function answerLast(
  userId: string,
  limit: number,
  timeZone: string,
  now: Date,
): Promise<QuestionAnswer> {
  const expenses = await getLatestExpenses(userId, limit);
  return {
    text: formatLastExpensesNlReply(
      expenses.map((e) => ({
        amount: e.amount,
        category: e.category,
        description: e.description,
        date: formatIsoDate(calendarDateInTimeZone(e.createdAt, timeZone)),
        paymentMethod: e.paymentMethod,
      })),
      timeZone,
      now,
    ),
  };
}

export async function answerQuestion(
  userId: string,
  question: QuestionSlots,
  timeZone: string,
  now: Date = new Date(),
): Promise<QuestionAnswer> {
  switch (question.kind) {
    case "budget_status":
      return answerBudget(userId);
    case "last_expenses":
      return answerLast(
        userId,
        question.limit ?? DEFAULT_LAST_LIMIT,
        timeZone,
        now,
      );
    case "spend_total":
    case "spend_by_category":
    case "spend_by_method":
      return answerSpend(userId, question, timeZone, now);
    case "other":
    default:
      return { text: UNANSWERED_QUESTION_TEXT };
  }
}
