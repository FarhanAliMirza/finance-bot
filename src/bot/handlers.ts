import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import { getUserTimeZone } from "../db/userSettings";
import {
  classifyIntent,
  type ClassifyIntentFn,
} from "../services/intentClassifier";
import { answerQuestion } from "../services/questionService";
import { editLastExpense } from "../services/editLastExpenseService";
import { sendExpenseDraft } from "./expenseDraftHandlers";
import { exportDownloadKeyboard } from "./exportHandlers";

const GENERIC_FAIL_TEXT =
  'I couldn\'t understand that. Try logging like "spent 150 on coffee", or ask how much you spent today.';

export async function handleMessage(
  msg: Message,
  bot: TelegramBot,
  deps: { classify?: ClassifyIntentFn } = {},
) {
  try {
    if (!msg.text) return;
    if (!msg.from) return;
    const userId = msg.from.id.toString();
    const timeZone = await getUserTimeZone(userId);
    const classify = deps.classify ?? classifyIntent;
    const classified = await classify(msg.text, timeZone);

    if (classified.intent === "log") {
      await sendExpenseDraft(msg, bot, classified.expense);
      return;
    }

    if (classified.intent === "question") {
      const answer = await answerQuestion(userId, classified.question, timeZone);
      if (answer.exportWindow) {
        await bot.sendMessage(msg.chat.id, answer.text, {
          reply_markup: exportDownloadKeyboard(
            answer.exportWindow,
            userId,
            msg.chat.id,
          ),
        });
      } else {
        await bot.sendMessage(msg.chat.id, answer.text);
      }
      return;
    }

    const reply = await editLastExpense(userId, classified.fields, timeZone);
    await bot.sendMessage(msg.chat.id, reply);
  } catch (err) {
    console.error(err);
    await bot.sendMessage(msg.chat.id, GENERIC_FAIL_TEXT);
  }
}
