import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import { handleMessage } from "./handlers";
import { todayCommand } from "./commands/today";
import { weekCommand } from "./commands/week";
import { monthCommand } from "./commands/month";
import { budgetCommand } from "./commands/getBudget";
import { setBudgetCommand } from "./commands/setBudget";
import { lastCommand } from "./commands/last";
import { deleteCommand } from "./commands/delete";

export const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, {
  polling: true,
});

bot.on("message", async (msg) => {
  if (!msg.text) return;
  const text = msg.text;

  if (text.startsWith("/")) {
    if (text.startsWith("/start")) {
      await bot.sendMessage(msg.chat.id, "🤖 Finance bot running...");
    }
    if (text.startsWith("/today")) {
      await todayCommand(msg, bot);
    }
    if (text.startsWith("/week")) {
      await weekCommand(msg, bot);
    }
    if (text.startsWith("/month")) {
      await monthCommand(msg, bot);
    }
    if (text.startsWith("/budget")) {
      await budgetCommand(msg, bot);
    }
    if (text.startsWith("/setBudget")) {
      await setBudgetCommand(msg, bot);
    }
    if (text.startsWith("/last")) {
      await lastCommand(msg, bot);
    }
    if (text.startsWith("/delete")) {
      await deleteCommand(msg, bot);
    }
  } else {
    await handleMessage(msg, bot);
  }
});
