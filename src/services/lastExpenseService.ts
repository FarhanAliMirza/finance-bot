import { prisma } from "../db/prisma";
import { formatCategoryWithMethod } from "../utils/paymentMethods";

export async function getLastExpensesMessage(userId: string): Promise<string> {
  const expenses = await prisma.expense.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (expenses.length === 0) {
    return "No expenses found.";
  }

  const expenseLines = expenses
    .map(
      (expense) =>
        `- ₹${expense.amount} (${formatCategoryWithMethod(expense.category, expense.paymentMethod)}) - ${expense.description}`,
    )
    .join("\n");

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return `🧾 Last 5 expenses:\n\n${expenseLines}\n\n💸 Total: ${total}`;
}
