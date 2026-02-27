import TelegramBot from "node-telegram-bot-api";
import { getExpensesBetween } from "../../db/expenses";
import { startOfWeek, today } from "../../utils/dates";
import type { Message } from "node-telegram-bot-api";
import { Expense } from "@prisma/client";

export async function weekCommand(msg: Message, bot: TelegramBot) {
  const userId = msg.from?.id?.toString();
  if (!userId) {
    await bot.sendMessage(msg.chat.id, "User not found.");
    return;
  }
  const start = startOfWeek() + "T00:00:00.000Z";
  const end = today() + "T00:00:00.000Z";
  const expenses = await getExpensesBetween(userId, start, end);

  if (!expenses || expenses.length === 0) {
    await bot.sendMessage(msg.chat.id, "No expenses recorded this week.");
    return;
  }

  const categoryTotals: Record<string, number> = {};
  for (const e of expenses) {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  }
  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([cat, amt]) => `• ${cat}: ₹${amt}`)
    .join("\n");

  const largest = expenses.reduce(
    (max: Expense, e: Expense) => (e.amount > max.amount ? e : max),
    expenses[0],
  );
  const total = expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
  const count = expenses.length;
  const dates = `${start.split("T")[0]} - ${end.split("T")[0]}`;
  const summary = `🗓️ Week (${dates})\n\nCategory Breakdown:\n${categoryBreakdown}\n\n📊 Total spent: ₹${total}\n🔢 Transactions: ${count}\n💸 Largest spend: ₹${largest.amount} (${largest.category}) - ${largest.description}`;

  await bot.sendMessage(msg.chat.id, summary);
}
