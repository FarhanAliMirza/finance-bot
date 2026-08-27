import TelegramBot from "node-telegram-bot-api";
import { getBudgetSummary } from "../../services/budgetService";
import type { Message } from "node-telegram-bot-api";

export async function budgetCommand(msg: Message, bot: TelegramBot) {
  const userId = msg.from?.id?.toString();
  if (!userId) {
    await bot.sendMessage(msg.chat.id, "User not found.");
    return;
  }

  const summary = await getBudgetSummary(userId);
  await bot.sendMessage(msg.chat.id, summary);
}
