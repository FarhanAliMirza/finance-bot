import { getUserBudget } from "../db/budget";
import { getExpensesBetween } from "../db/expenses";
import { getUserTimeZone } from "../db/userSettings";
import { monthName, monthCalendar, monthRange } from "../utils/dates";
import { computeBudgetPace, type BudgetPace } from "../utils/budgetPace";
import { formatBudgetCommandReply } from "../utils/budgetMessages";
import { Expense } from "../../generated/prisma";

export interface MonthBudgetSnapshot {
  monthlyBudget: number;
  month: string;
  pace: BudgetPace;
}

export async function getMonthBudgetSnapshot(
  userId: string,
): Promise<MonthBudgetSnapshot | null> {
  const budgetOb = await getUserBudget(userId);
  if (!budgetOb) return null;

  const timeZone = await getUserTimeZone(userId);
  const monthlyBudget = budgetOb.monthlyBudget;
  const { startInclusive, endExclusive } = monthRange(timeZone);
  const expenses = await getExpensesBetween(
    userId,
    startInclusive,
    endExclusive,
  );
  const spent = (expenses ?? []).reduce(
    (sum: number, e: Expense) => sum + e.amount,
    0,
  );
  const { dayOfMonth, daysInMonth } = monthCalendar(timeZone);
  const pace = computeBudgetPace({
    spent,
    monthlyBudget,
    dayOfMonth,
    daysInMonth,
  });

  return {
    monthlyBudget,
    month: monthName(timeZone),
    pace,
  };
}

export async function getBudgetSummary(userId: string): Promise<string> {
  const snapshot = await getMonthBudgetSnapshot(userId);
  if (!snapshot) {
    return "No budget set ! Set budget with /setBudget (amount)";
  }
  return formatBudgetCommandReply(
    snapshot.month,
    snapshot.monthlyBudget,
    snapshot.pace,
  );
}
