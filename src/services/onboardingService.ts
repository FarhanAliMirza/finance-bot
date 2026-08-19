import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import { OnboardingStep } from "../../generated/prisma";
import {
  getUserOnboarding,
  markOnboardingComplete,
  upsertUserOnboarding,
  userHasPriorActivity,
} from "../db/onboarding";
import { getUserBudget, setUserBudget, updateUserBudget } from "../db/budget";

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

Next: set your monthly budget so I can keep you on track.`;

const BUDGET_PROMPT_TEXT = `💰 Set your monthly budget

Reply with a number (e.g. 15000), or use:
/setBudget 15000`;

const COMPLETE_TEXT = `✅ You're all set!

Budget is saved. From now on, send expenses in plain English anytime.

Commands:
/today /week /month — spending summaries
/budget — budget status
/setBudget <amount> — update budget
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
  await bot.sendMessage(msg.chat.id, BUDGET_PROMPT_TEXT);
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

function parseBudgetAmount(text: string): number | null {
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
    await bot.sendMessage(msg.chat.id, BUDGET_PROMPT_TEXT);
    return true;
  }

  if (record.step === OnboardingStep.SET_BUDGET) {
    const amount = parseBudgetAmount(msg.text);
    if (amount !== null) {
      await completeOnboardingAfterBudget(msg, bot, amount);
      return true;
    }

    await bot.sendMessage(
      msg.chat.id,
      `Almost there — set a budget first.\n\nReply with a number like 15000, or /setBudget 15000.\n\nAfter that you can log expenses like "Spent 150 on coffee".`,
    );
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
