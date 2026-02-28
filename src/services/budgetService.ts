import { getUserBudget, setUserBudget, updateUserBudget } from "../db/budget";
import { getExpensesBetween } from "../db/expenses";
import { today, startOfMonth, monthName } from "../utils/dates";
import { Expense } from "../../generated/prisma";

export async function getBudgetSummary(userId: string, type: "req" | "msg") {
  const budgetOb = await getUserBudget(userId);
  if (!budgetOb) {
    if (type === "req") {
      return "No budget set ! Set budget with /setBudget (amount)";
    } else {
      return;
    }
  }
  const budget = budgetOb.monthlyBudget;
  let expensesSummary;
  let comment;
  const start = startOfMonth() + "T00:00:00.000Z";
  const end = today() + "T00:00:00.000Z";
  const month = monthName();
  const expenses = await getExpensesBetween(userId, start, end);
  const userBudget = `🗓️ Budget for the month of ${month} is : \n₹${budget} \n\n`;
  if (!expenses || expenses.length === 0) {
    expensesSummary = `No expenses recorded this month.`;
  }
  if (expenses && expenses.length > 0) {
    const total = expenses.reduce(
      (sum: number, e: Expense) => sum + e.amount,
      0,
    );
    let remaining = budget - total;
    if (remaining < 0) remaining = 0;
    const usage = (total / budget) * 100;
    expensesSummary = `Current Spendings : ₹${total} \nBudget Remaining: ₹${remaining} \nUsage: ${usage.toFixed(2)}%`;
    if (usage < 50) {
      comment = `\n\n💰 You’re on track with your budget.`;
    }
    if (usage > 80) {
      comment = `\n\n🚨 Careful — you’re approaching your monthly budget limit.`;
    }
    if (usage > 100) {
      comment = `\n\n‼️ You’re over budget.`;
    }
  }
  if (type === "req") {
    return `${userBudget}${expensesSummary}${comment}`;
  } else {
    return `${expensesSummary}`;
  }
}
