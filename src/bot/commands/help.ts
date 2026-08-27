import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import { HELP_TEXT } from "../commandHelp";

export async function helpCommand(msg: Message, bot: TelegramBot) {
  await bot.sendMessage(msg.chat.id, HELP_TEXT);
}
