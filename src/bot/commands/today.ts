import TelegramBot from "node-telegram-bot-api";
import { getExpensesBetween } from "../../db/expenses";
import { today } from "../../utils/dates";
import type { Message } from "node-telegram-bot-api";
import { Expense } from "@prisma/client";

export async function todayCommand(msg: Message, bot: TelegramBot) {
  const userId = msg.from?.id?.toString();
  if (!userId) {
    await bot.sendMessage(msg.chat.id, "User not found.");
    return;
  }
  const date = today()+"T00:00:00.000Z";
  const expenses = await getExpensesBetween(userId, date, date);

  if (!expenses || expenses.length === 0) {
    await bot.sendMessage(msg.chat.id, "No expenses recorded today.");
    return;
  }

  // List of expenses
  const expenseList = expenses
    .map((e: Expense) => `• ₹${e.amount} (${e.category}) - ${e.description}`)
    .join("\n");

  // Largest spend
  const largest = expenses.reduce(
    (max: Expense, e: Expense) => (e.amount > max.amount ? e : max),
    expenses[0],
  );

  // Summary
  const total = expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
  const count = expenses.length;
  const dates = today();
  const summary = `🗓️ Today (${dates})\n\n${expenseList}\n\n💸 Largest spend: ₹${largest.amount} (${largest.category})\n📊 Total spent: ₹${total}\n🔢 Transactions: ${count}`;

  await bot.sendMessage(msg.chat.id, summary);
}
