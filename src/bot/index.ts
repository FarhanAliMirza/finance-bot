import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";

export const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, {
  polling: true,
});

// bot.on("message", (msg) => {
//   bot.sendMessage(msg.chat.id, "Bot is working ✅");
// });
