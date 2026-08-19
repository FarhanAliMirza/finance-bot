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
import {
  handleOnboardingMessage,
  handleStartCommand,
  maybeCompleteOnboardingFromSetBudget,
} from "../services/onboardingService";

export const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, {
  polling: true,
});

bot.on("message", async (msg) => {
  if (!msg.text) return;
  const text = msg.text;

  if (text.startsWith("/")) {
    if (text.startsWith("/start")) {
      await handleStartCommand(msg, bot);
      return;
    }
    if (text.startsWith("/today")) {
      await todayCommand(msg, bot);
      return;
    }
    if (text.startsWith("/week")) {
      await weekCommand(msg, bot);
      return;
    }
    if (text.startsWith("/month")) {
      await monthCommand(msg, bot);
      return;
    }
    if (text.startsWith("/budget")) {
      await budgetCommand(msg, bot);
      return;
    }
    if (text.startsWith("/setBudget")) {
      const finishedOnboarding = await maybeCompleteOnboardingFromSetBudget(
        msg,
        bot,
      );
      if (!finishedOnboarding) {
        await setBudgetCommand(msg, bot);
      }
      return;
    }
    if (text.startsWith("/last")) {
      await lastCommand(msg, bot);
      return;
    }
    if (text.startsWith("/delete")) {
      await deleteCommand(msg, bot);
      return;
    }
  } else {
    const handledByOnboarding = await handleOnboardingMessage(msg, bot);
    if (!handledByOnboarding) {
      await handleMessage(msg, bot);
    }
  }
});
