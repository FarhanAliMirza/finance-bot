import TelegramBot from "node-telegram-bot-api";
import { deleteExpense } from "../../services/deleteExpenseService";
import type { Message } from "node-telegram-bot-api";

export async function deleteCommand(msg: Message, bot: TelegramBot) {
  const userId = msg.from?.id?.toString();
  if (!userId) {
    await bot.sendMessage(msg.chat.id, "User not found.");
    return;
  }
  const response = await deleteExpense(userId);
  await bot.sendMessage(msg.chat.id, response);
}