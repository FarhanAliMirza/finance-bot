import TelegramBot from "node-telegram-bot-api";
import type { Message } from "node-telegram-bot-api";
import { getExpensesBetween } from "../../db/expenses";
import { getUserTimeZone } from "../../db/userSettings";
import { monthRange } from "../../utils/dates";
import { formatPaymentMethodBreakdown } from "../../utils/paymentMethodMessages";

export async function methodsCommand(msg: Message, bot: TelegramBot) {
  const userId = msg.from?.id?.toString();
  if (!userId) {
    await bot.sendMessage(msg.chat.id, "User not found.");
    return;
  }

  const timeZone = await getUserTimeZone(userId);
  const { startInclusive, endExclusive } = monthRange(timeZone);
  const expenses = await getExpensesBetween(
    userId,
    startInclusive,
    endExclusive,
  );

  if (!expenses || expenses.length === 0) {
    await bot.sendMessage(msg.chat.id, "No expenses recorded this month.");
    return;
  }

  const breakdown = formatPaymentMethodBreakdown(expenses);
  await bot.sendMessage(
    msg.chat.id,
    breakdown ?? "No expenses recorded this month.",
  );
}
