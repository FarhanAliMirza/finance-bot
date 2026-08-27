import TelegramBot from "node-telegram-bot-api";
import { getExpensesBetween } from "../../db/expenses";
import { getUserTimeZone } from "../../db/userSettings";
import { today, todayRange } from "../../utils/dates";
import type { Message } from "node-telegram-bot-api";
import { formatCategoryWithMethod } from "../../utils/paymentMethods";
import { exportDownloadKeyboard } from "../exportHandlers";

export async function todayCommand(msg: Message, bot: TelegramBot) {
  const userId = msg.from?.id?.toString();
  if (!userId) {
    await bot.sendMessage(msg.chat.id, "User not found.");
    return;
  }
  const timeZone = await getUserTimeZone(userId);
  const { startInclusive, endExclusive } = todayRange(timeZone);
  const expenses = await getExpensesBetween(
    userId,
    startInclusive,
    endExclusive,
  );

  if (!expenses || expenses.length === 0) {
    await bot.sendMessage(msg.chat.id, "No expenses recorded today.");
    return;
  }

  // List of expenses
  const expenseList = expenses
    .map(
      (e) =>
        `• ₹${e.amount} (${formatCategoryWithMethod(e.category, e.paymentMethod)}) - ${e.description}`,
    )
    .join("\n");

  // Largest spend
  const largest = expenses.reduce(
    (max, e) => (e.amount > max.amount ? e : max),
    expenses[0],
  );

  // Summary
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const count = expenses.length;
  const dates = today(timeZone);
  const summary = `🗓️ Today (${dates})\n\n${expenseList}\n\n💸 Largest spend: ₹${largest.amount} (${formatCategoryWithMethod(largest.category, largest.paymentMethod)})\n📊 Total spent: ₹${total}\n🔢 Transactions: ${count}`;

  await bot.sendMessage(msg.chat.id, summary, {
    reply_markup: exportDownloadKeyboard({ kind: "today" }, userId, msg.chat.id),
  });
}
