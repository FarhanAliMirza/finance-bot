import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import { handleMessage } from "./handlers";
import { handleExpenseCallbackQuery } from "./expenseDraftHandlers";
import { handleExportCallbackQuery } from "./exportHandlers";
import { todayCommand } from "./commands/today";
import { weekCommand } from "./commands/week";
import { monthCommand } from "./commands/month";
import { exportCommand } from "./commands/export";
import { budgetCommand } from "./commands/getBudget";
import { setBudgetCommand } from "./commands/setBudget";
import { lastCommand } from "./commands/last";
import { deleteCommand } from "./commands/delete";
import { helpCommand } from "./commands/help";
import { setTimezoneCommand } from "./commands/setTimezone";
import { methodsCommand } from "./commands/methods";
import {
  BOT_MENU_COMMANDS,
  UNKNOWN_COMMAND_TEXT,
  parseSlashCommand,
} from "./commandHelp";
import {
  handleOnboardingCallbackQuery,
  handleOnboardingMessage,
  handleStartCommand,
  maybeCompleteOnboardingFromSetBudget,
} from "../services/onboardingService";

export const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, {
  polling: true,
});

bot.setMyCommands(BOT_MENU_COMMANDS).catch((err) => {
  console.error("Failed to register Telegram command menu:", err);
});

bot.on("callback_query", async (query) => {
  const handledByOnboarding = await handleOnboardingCallbackQuery(query, bot);
  if (handledByOnboarding) return;
  const handledByExport = await handleExportCallbackQuery(query, bot);
  if (handledByExport) return;
  await handleExpenseCallbackQuery(query, bot);
});

bot.on("message", async (msg) => {
  if (!msg.text) return;
  const text = msg.text;

  if (text.startsWith("/")) {
    const command = parseSlashCommand(text);
    switch (command) {
      case "/start":
        await handleStartCommand(msg, bot);
        return;
      case "/help":
        await helpCommand(msg, bot);
        return;
      case "/today":
        await todayCommand(msg, bot);
        return;
      case "/week":
        await weekCommand(msg, bot);
        return;
      case "/month":
        await monthCommand(msg, bot);
        return;
      case "/export":
        await exportCommand(msg, bot);
        return;
      case "/budget":
        await budgetCommand(msg, bot);
        return;
      case "/setBudget": {
        const finishedOnboarding = await maybeCompleteOnboardingFromSetBudget(
          msg,
          bot,
        );
        if (!finishedOnboarding) {
          await setBudgetCommand(msg, bot);
        }
        return;
      }
      case "/last":
        await lastCommand(msg, bot);
        return;
      case "/delete":
        await deleteCommand(msg, bot);
        return;
      case "/setTimezone":
        await setTimezoneCommand(msg, bot);
        return;
      case "/methods":
        await methodsCommand(msg, bot);
        return;
      default:
        await bot.sendMessage(msg.chat.id, UNKNOWN_COMMAND_TEXT);
    }
    return;
  } else {
    const handledByOnboarding = await handleOnboardingMessage(msg, bot);
    if (!handledByOnboarding) {
      await handleMessage(msg, bot);
    }
  }
});
