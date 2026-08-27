import TelegramBot from "node-telegram-bot-api";
import type { CallbackQuery, Message } from "node-telegram-bot-api";
import { OnboardingStep } from "../../generated/prisma";
import {
  getUserOnboarding,
  markOnboardingComplete,
  upsertUserOnboarding,
  userHasPriorActivity,
} from "../db/onboarding";
import { getUserBudget, setUserBudget, updateUserBudget } from "../db/budget";

export const SKIP_BUDGET_CALLBACK_DATA = "onb:skip";

const EMPTY_KEYBOARD: TelegramBot.InlineKeyboardMarkup = {
  inline_keyboard: [],
};

const SKIP_BUDGET_KEYBOARD: TelegramBot.InlineKeyboardMarkup = {
  inline_keyboard: [
    [{ text: "Skip", callback_data: SKIP_BUDGET_CALLBACK_DATA }],
  ],
};

const WELCOME_TEXT = `👋 Welcome to Finance Bot!

I help you track spending with plain English — no forms.

You'll learn how to:
• Log expenses naturally
• Set a monthly budget
• Check spending with simple commands`;

const EXPENSE_INTRO_TEXT = `📝 Logging expenses

Just send a normal sentence. Examples:
• "Spent 150 on coffee"
• "Paid 500 for taxi yesterday"

I'll pick out the amount, category, and description.

Next: you can set a monthly budget, or skip and do it later.`;

export const BUDGET_PROMPT_TEXT = `💰 Set your monthly budget (optional)

Reply with a number (e.g. 15000), or use:
/setBudget 15000

Or tap Skip (or type skip) to continue without a budget.`;

const BUDGET_RETRY_TEXT = `This step is optional.

Reply with a number like 15000, /setBudget 15000, or Skip.`;

const COMPLETE_TEXT = `✅ You're all set!

Budget is saved. From now on, send expenses in plain English anytime.

Commands:
/today /week /month — spending summaries
/budget — budget status
/setBudget <amount> — update budget
/last — recent expenses
/delete — undo last expense`;

export const SKIPPED_COMPLETE_TEXT = `✅ You're all set!

You can set a monthly budget later with /setBudget.

From now on, send expenses in plain English anytime.

Commands:
/today /week /month — spending summaries
/budget — budget status
/setBudget <amount> — set budget
/last — recent expenses
/delete — undo last expense`;

const RETURNING_WELCOME_TEXT = `👋 Welcome back!

Send an expense in plain English, or use /today, /week, /month, /budget.`;

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const record = await getUserOnboarding(userId);
  if (record?.step === OnboardingStep.COMPLETED || record?.completedAt) {
    return true;
  }

  // Existing users from before this feature: skip the walkthrough once.
  if (!record && (await userHasPriorActivity(userId))) {
    await markOnboardingComplete(userId);
    return true;
  }

  return false;
}

export async function startOnboarding(
  msg: Message,
  bot: TelegramBot,
): Promise<void> {
  const userId = msg.from?.id?.toString();
  if (!userId) return;

  await upsertUserOnboarding(userId, OnboardingStep.EXPENSE_INTRO);
  await bot.sendMessage(msg.chat.id, WELCOME_TEXT);
  await bot.sendMessage(msg.chat.id, EXPENSE_INTRO_TEXT);
  await upsertUserOnboarding(userId, OnboardingStep.SET_BUDGET);
  await sendBudgetPrompt(msg.chat.id, bot);
}

export async function handleStartCommand(
  msg: Message,
  bot: TelegramBot,
): Promise<void> {
  const userId = msg.from?.id?.toString();
  if (!userId) {
    await bot.sendMessage(msg.chat.id, "User not found.");
    return;
  }

  if (await isOnboardingComplete(userId)) {
    await bot.sendMessage(msg.chat.id, RETURNING_WELCOME_TEXT);
    return;
  }

  await startOnboarding(msg, bot);
}

export function isSkipBudgetText(text: string): boolean {
  return text.trim().toLowerCase() === "skip";
}

export function parseBudgetAmount(text: string): number | null {
  const trimmed = text.trim();
  const fromCommand = trimmed.match(/^\/setBudget(?:@\w+)?\s+(\d+)/i);
  if (fromCommand) {
    const amount = parseInt(fromCommand[1], 10);
    return Number.isNaN(amount) ? null : amount;
  }

  if (/^\d+$/.test(trimmed)) {
    const amount = parseInt(trimmed, 10);
    return Number.isNaN(amount) ? null : amount;
  }

  return null;
}

async function sendBudgetPrompt(chatId: number, bot: TelegramBot): Promise<void> {
  await bot.sendMessage(chatId, BUDGET_PROMPT_TEXT, {
    reply_markup: SKIP_BUDGET_KEYBOARD,
  });
}

async function answerCallback(
  bot: TelegramBot,
  query: CallbackQuery,
  text?: string,
) {
  try {
    await bot.answerCallbackQuery(query.id, text ? { text } : {});
  } catch (err) {
    console.error(err);
  }
}

async function removeSkipKeyboard(
  bot: TelegramBot,
  chatId: number,
  messageId: number,
) {
  try {
    await bot.editMessageReplyMarkup(EMPTY_KEYBOARD, {
      chat_id: chatId,
      message_id: messageId,
    });
  } catch (err) {
    const text =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
    if (!/message is not modified/i.test(text)) {
      console.error(err);
    }
  }
}

async function saveBudget(userId: string, monthlyBudget: number): Promise<string> {
  const existing = await getUserBudget(userId);
  if (!existing) {
    await setUserBudget(userId, monthlyBudget);
    return `💰 Monthly Budget set to ₹${monthlyBudget}`;
  }
  if (existing.monthlyBudget === monthlyBudget) {
    return `💰 Monthly Budget set to ₹${monthlyBudget}`;
  }
  await updateUserBudget(userId, monthlyBudget);
  return `💰 Monthly Budget updated from ₹${existing.monthlyBudget} to ₹${monthlyBudget}`;
}

export async function completeOnboardingAfterBudget(
  msg: Message,
  bot: TelegramBot,
  monthlyBudget: number,
): Promise<void> {
  const userId = msg.from?.id?.toString();
  if (!userId) return;

  const budgetMsg = await saveBudget(userId, monthlyBudget);
  await markOnboardingComplete(userId);
  await bot.sendMessage(msg.chat.id, budgetMsg);
  await bot.sendMessage(msg.chat.id, COMPLETE_TEXT);
}

export async function completeOnboardingSkippedBudget(
  chatId: number,
  userId: string,
  bot: TelegramBot,
): Promise<void> {
  await markOnboardingComplete(userId);
  await bot.sendMessage(chatId, SKIPPED_COMPLETE_TEXT);
}

/** Returns true if the message was handled by onboarding (caller should not parse as expense). */
export async function handleOnboardingMessage(
  msg: Message,
  bot: TelegramBot,
): Promise<boolean> {
  const userId = msg.from?.id?.toString();
  if (!userId || !msg.text) return false;

  if (await isOnboardingComplete(userId)) {
    return false;
  }

  let record = await getUserOnboarding(userId);

  // First free-text contact: start the walkthrough.
  if (!record) {
    await startOnboarding(msg, bot);
    return true;
  }

  if (record.step === OnboardingStep.WELCOME) {
    await startOnboarding(msg, bot);
    return true;
  }

  if (record.step === OnboardingStep.EXPENSE_INTRO) {
    await upsertUserOnboarding(userId, OnboardingStep.SET_BUDGET);
    await sendBudgetPrompt(msg.chat.id, bot);
    return true;
  }

  if (record.step === OnboardingStep.SET_BUDGET) {
    if (isSkipBudgetText(msg.text)) {
      await completeOnboardingSkippedBudget(msg.chat.id, userId, bot);
      return true;
    }

    const amount = parseBudgetAmount(msg.text);
    if (amount !== null) {
      await completeOnboardingAfterBudget(msg, bot, amount);
      return true;
    }

    await bot.sendMessage(msg.chat.id, BUDGET_RETRY_TEXT, {
      reply_markup: SKIP_BUDGET_KEYBOARD,
    });
    return true;
  }

  return false;
}

/** If onboarding is incomplete and user uses /setBudget, finish after saving. */
export async function maybeCompleteOnboardingFromSetBudget(
  msg: Message,
  bot: TelegramBot,
): Promise<boolean> {
  const userId = msg.from?.id?.toString();
  if (!userId || !msg.text) return false;

  if (await isOnboardingComplete(userId)) {
    return false;
  }

  const amount = parseBudgetAmount(msg.text);
  if (amount === null) {
    return false;
  }

  await completeOnboardingAfterBudget(msg, bot, amount);
  return true;
}

/** Returns true if this callback was an onboarding Skip tap (caller should not treat it as an expense draft). */
export async function handleOnboardingCallbackQuery(
  query: CallbackQuery,
  bot: TelegramBot,
): Promise<boolean> {
  if (query.data !== SKIP_BUDGET_CALLBACK_DATA) {
    return false;
  }

  const userId = query.from?.id?.toString();
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;

  if (!userId || chatId == null) {
    await answerCallback(bot, query);
    return true;
  }

  if (messageId != null) {
    await removeSkipKeyboard(bot, chatId, messageId);
  }

  if (await isOnboardingComplete(userId)) {
    await answerCallback(bot, query);
    return true;
  }

  await completeOnboardingSkippedBudget(chatId, userId, bot);
  await answerCallback(bot, query, "Skipped");
  return true;
}
