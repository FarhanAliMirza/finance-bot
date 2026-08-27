import TelegramBot from "node-telegram-bot-api";
import { getExpensesBetween } from "../../db/expenses";
import { getUserTimeZone } from "../../db/userSettings";
import { monthCalendar, monthRange, startOfMonth, today } from "../../utils/dates";
import type { Message } from "node-telegram-bot-api";
import { formatPaymentMethodBreakdown } from "../../utils/paymentMethodMessages";
import { exportDownloadKeyboard } from "../exportHandlers";

export async function monthCommand(msg: Message, bot: TelegramBot) {
  const userId = msg.from?.id?.toString();
  if (!userId) {
    await bot.sendMessage(msg.chat.id, "User not found.");
    return;
  }
  const timeZone = await getUserTimeZone(userId);
  const { startInclusive, endExclusive } = monthRange(timeZone);
  const expenses = await getExpensesBetween(
    userId,
    startInclusive,
    endExclusive,
  );

  if (!expenses || expenses.length === 0) {
    await bot.sendMessage(msg.chat.id, "No expenses recorded this month.");
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
    (max, e) => (e.amount > max.amount ? e : max),
    expenses[0],
  );

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const { dayOfMonth } = monthCalendar(timeZone);
  const dailyAvg = (total / dayOfMonth).toFixed(2);
  const count = expenses.length;
  const dates = `${startOfMonth(timeZone)} - ${today(timeZone)}`;
  const methodBlock = formatPaymentMethodBreakdown(expenses);
  const summary = `🗓️ Month (${dates})\n\nCategory Breakdown:\n${categoryBreakdown}\n\n📊 Total spent: ₹${total}\n🔢 Transactions: ${count}\n💸 Largest spend: ₹${largest.amount} (${largest.category}) - ${largest.description}\n📈 Daily average: ₹${dailyAvg}${methodBlock ? `\n\n${methodBlock}` : ""}`;

  await bot.sendMessage(msg.chat.id, summary, {
    reply_markup: exportDownloadKeyboard({ kind: "month" }, userId, msg.chat.id),
  });
}
