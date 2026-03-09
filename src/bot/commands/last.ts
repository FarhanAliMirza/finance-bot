import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import { getLastExpensesMessage } from "../../services/lastExpenseService";

export async function lastCommand(msg: Message, bot: TelegramBot) {
  const userId = msg.from?.id?.toString();
  if (!userId) {
    await bot.sendMessage(msg.chat.id, "User not found.");
    return;
  }

  const response = await getLastExpensesMessage(userId);
  await bot.sendMessage(msg.chat.id, response);
}
