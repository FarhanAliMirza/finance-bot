import TelegramBot from "node-telegram-bot-api";
import { getExpensesBetween } from "../../db/expenses";
import { startOfMonth, today } from "../../utils/dates";
import type { Message } from "node-telegram-bot-api";

// export async function monthCommand(msg: Message, bot: TelegramBot) {
//   const userId = msg.from?.id?.toString();
//   if (!userId) {
//     await bot.sendMessage(msg.chat.id, "User not found.");
//     return;
//   }
//   const start = startOfMonth() + "T00:00:00.000Z";
//   const end = today() + "T00:00:00.000Z";
//   const expenses = await getExpensesBetween(userId, start, end);

//   if (!expenses || expenses.length === 0) {
//     await bot.sendMessage(msg.chat.id, "No expenses recorded this week.");
//     return;
//   }

//   const categoryTotals: Record<string, number> = {};
//   for (const e of expenses) {
//     categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
//   }
//   const categoryBreakdown = Object.entries(categoryTotals)
//     .map(([cat, amt]) => `• ${cat}: ₹${amt}`)
//     .join("\n");

//   const largest = expenses.reduce(
//     (max, e) => (e.amount > max.amount ? e : max),
//     expenses[0],
//   );

//   const total = expenses.reduce((sum, e) => sum + e.amount, 0);
//   const startDate = new Date(start);
//   const endDate = new Date(end);
//   const days =
//     Math.floor(
//       (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
//     ) + 1;
//   const dailyAvg = (total / days).toFixed(2);
//   const count = expenses.length;
//   const dates = `${start.split("T")[0]} - ${end.split("T")[0]}`;
//   const summary = `🗓️ Month (${dates})\n\nCategory Breakdown:\n${categoryBreakdown}\n\n📊 Total spent: ₹${total}\n🔢 Transactions: ${count}\n💸 Largest spend: ₹${largest.amount} (${largest.category}) - ${largest.description}\n📈 Daily average: ₹${dailyAvg}`;

//   await bot.sendMessage(msg.chat.id, summary);
// }

export async function monthCommand(msg: Message, bot: TelegramBot) {
  await bot.sendMessage(msg.chat.id, "Month command in progress...");
}
