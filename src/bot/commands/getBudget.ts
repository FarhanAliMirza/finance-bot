import TelegramBot from "node-telegram-bot-api";
import { getUserBudget } from "../../db/budget";
import { getBudgetSummary } from "../../services/budgetService";
import type { Message } from "node-telegram-bot-api";

export async function budgetCommand(msg: Message, bot: TelegramBot) {
  const userId = msg.from?.id?.toString();
  if (!userId) {
    await bot.sendMessage(msg.chat.id, "User not found.");
    return;
  }
  const budget = await getUserBudget(userId);
  if (!budget) {
    await bot.sendMessage(msg.chat.id, "No budget set ! Set budget with /setBudget (amount)");
    return;
  }
  const summary = await getBudgetSummary(userId, "req") || "";

  await bot.sendMessage(msg.chat.id, summary);
}