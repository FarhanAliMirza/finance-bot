import TelegramBot from "node-telegram-bot-api";
import type { CallbackQuery, Message } from "node-telegram-bot-api";
import { createExpense } from "../db/expenses";
import { getUserTimeZone } from "../db/userSettings";
import { deleteExpenseById } from "../services/deleteExpenseService";
import { getMonthBudgetSnapshot } from "../services/budgetService";
import {
  expenseDrafts,
  encodeConfirmCallback,
  encodePaymentMethodCallback,
  encodeUndoCallback,
  parseExpenseCallbackData,
  type DraftActionError,
  type DraftExpireEvent,
  type ExpenseDraft,
} from "../services/expenseDraftStore";
import {
  EXPENSE_CANCELLED_TEXT,
  EXPENSE_EXPIRED_UNSAVED_TEXT,
  EXPENSE_UNDONE_TEXT,
  formatExpenseDraftReply,
  formatExpenseLogReply,
} from "../utils/budgetMessages";
import type { ParsedExpense, PaymentMethod } from "../types/expense";
import { withAdditionalSpend } from "../utils/budgetPace";
import type { BudgetPace } from "../utils/budgetPace";

const EMPTY_KEYBOARD: TelegramBot.InlineKeyboardMarkup = {
  inline_keyboard: [],
};

function confirmUndoKeyboard(id: string): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Confirm", callback_data: encodeConfirmCallback(id) },
        { text: "↩️ Undo", callback_data: encodeUndoCallback(id) },
      ],
    ],
  };
}

function undoOnlyKeyboard(id: string): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "↩️ Undo", callback_data: encodeUndoCallback(id) }],
    ],
  };
}

function paymentMethodKeyboard(id: string): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: "💵 Cash",
          callback_data: encodePaymentMethodCallback(id, "Cash"),
        },
        {
          text: "💳 Card",
          callback_data: encodePaymentMethodCallback(id, "Card"),
        },
        {
          text: "📱 UPI",
          callback_data: encodePaymentMethodCallback(id, "UPI"),
        },
      ],
      [{ text: "↩️ Cancel", callback_data: encodeUndoCallback(id) }],
    ],
  };
}

export function draftKeyboardFor(
  id: string,
  expense: ParsedExpense,
): TelegramBot.InlineKeyboardMarkup {
  return expense.paymentMethod
    ? confirmUndoKeyboard(id)
    : paymentMethodKeyboard(id);
}

function isNotModifiedError(err: unknown): boolean {
  const text =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  return /message is not modified/i.test(text);
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

async function editDraftMessage(
  bot: TelegramBot,
  draft: Pick<ExpenseDraft, "chatId" | "messageId">,
  text: string,
  replyMarkup: TelegramBot.InlineKeyboardMarkup = EMPTY_KEYBOARD,
) {
  if (draft.messageId == null) return;
  try {
    await bot.editMessageText(text, {
      chat_id: draft.chatId,
      message_id: draft.messageId,
      reply_markup: replyMarkup,
    });
  } catch (err) {
    if (!isNotModifiedError(err)) console.error(err);
  }
}

async function removeDraftKeyboard(
  bot: TelegramBot,
  draft: Pick<ExpenseDraft, "chatId" | "messageId">,
) {
  if (draft.messageId == null) return;
  try {
    await bot.editMessageReplyMarkup(EMPTY_KEYBOARD, {
      chat_id: draft.chatId,
      message_id: draft.messageId,
    });
  } catch (err) {
    if (!isNotModifiedError(err)) console.error(err);
  }
}

async function projectedPace(
  userId: string,
  extraAmount: number,
): Promise<BudgetPace | null> {
  const snapshot = await getMonthBudgetSnapshot(userId);
  if (!snapshot) return null;
  return withAdditionalSpend(snapshot.pace, extraAmount);
}

async function savedPace(userId: string): Promise<BudgetPace | null> {
  const snapshot = await getMonthBudgetSnapshot(userId);
  return snapshot?.pace ?? null;
}

function toastForError(reason: DraftActionError): string {
  switch (reason) {
    case "forbidden":
      return "This isn't your expense.";
    case "already_saved":
      return "Already saved";
    case "busy":
      return "Working on it…";
    case "not_found":
    case "expired":
      return "This expired";
  }
}

export async function sendExpenseDraft(
  msg: Message,
  bot: TelegramBot,
  expense: ParsedExpense,
) {
  const userId = msg.from!.id.toString();
  let pace: BudgetPace | null = null;
  const timeZone = await getUserTimeZone(userId);
  try {
    pace = await projectedPace(userId, expense.amount);
  } catch (err) {
    console.error(err);
  }

  const draft = expenseDrafts.create({
    userId,
    chatId: msg.chat.id,
    expense,
    onExpire: (event) => {
      void handleDraftExpire(event, bot);
    },
  });

  try {
    const sent = await bot.sendMessage(
      msg.chat.id,
      formatExpenseDraftReply(expense, pace, timeZone),
      { reply_markup: draftKeyboardFor(draft.id, expense) },
    );
    expenseDrafts.bindMessage(draft.id, sent.message_id);
  } catch (err) {
    console.error(err);
    expenseDrafts.discard(draft.id);
    await bot.sendMessage(
      msg.chat.id,
      "❌ Couldn't send the confirmation. Try again.",
    );
  }
}

export async function handleDraftExpire(
  event: DraftExpireEvent,
  bot: TelegramBot,
) {
  const { draft } = event;
  if (event.kind === "remove_keyboard") {
    await removeDraftKeyboard(bot, draft);
    return;
  }

  if (event.kind === "discard" || !draft.expense.paymentMethod) {
    await editDraftMessage(bot, draft, EXPENSE_EXPIRED_UNSAVED_TEXT);
    return;
  }

  try {
    const created = await createExpense(draft.userId, draft.expense);
    expenseDrafts.attachSavedExpenseId(draft.id, created.id);
    let pace: BudgetPace | null = null;
    const timeZone = await getUserTimeZone(draft.userId);
    try {
      pace = await savedPace(draft.userId);
    } catch (err) {
      console.error(err);
    }
    await editDraftMessage(
      bot,
      draft,
      formatExpenseLogReply(draft.expense, pace, timeZone),
    );
  } catch (err) {
    console.error(err);
    await editDraftMessage(
      bot,
      draft,
      "❌ Couldn't save the expense. Try sending it again.",
    );
  }
}

export async function handleExpenseCallbackQuery(
  query: CallbackQuery,
  bot: TelegramBot,
) {
  const parsed = parseExpenseCallbackData(query.data);
  if (!parsed) {
    await answerCallback(bot, query);
    return;
  }

  const userId = query.from?.id?.toString();
  if (!userId) {
    await answerCallback(bot, query, "This expired");
    return;
  }

  try {
    if (parsed.action === "ok") {
      await confirmDraft(parsed.id, userId, query, bot);
    } else if (parsed.action === "pm") {
      await saveWithMethod(parsed.id, userId, parsed.method, query, bot);
    } else {
      await undoDraft(parsed.id, userId, query, bot);
    }
  } catch (err) {
    console.error(err);
    await answerCallback(bot, query, "Something went wrong");
  }
}

async function saveWithMethod(
  id: string,
  userId: string,
  method: PaymentMethod,
  query: CallbackQuery,
  bot: TelegramBot,
) {
  const patched = expenseDrafts.setPaymentMethod(id, userId, method);
  if (!patched.ok) {
    await answerCallback(bot, query, toastForError(patched.reason));
    return;
  }
  await confirmDraft(id, userId, query, bot);
}

async function confirmDraft(
  id: string,
  userId: string,
  query: CallbackQuery,
  bot: TelegramBot,
) {
  const claimed = expenseDrafts.startSave(id, userId);
  if (!claimed.ok) {
    await answerCallback(bot, query, toastForError(claimed.reason));
    return;
  }

  if (!claimed.draft.expense.paymentMethod) {
    expenseDrafts.abortSave(id);
    await answerCallback(bot, query, "Choose how you paid");
    return;
  }

  try {
    const created = await createExpense(claimed.draft.userId, claimed.draft.expense);
    const updated = expenseDrafts.finishSave(id, created.id);
    let pace: BudgetPace | null = null;
    const timeZone = await getUserTimeZone(updated.userId);
    try {
      pace = await savedPace(updated.userId);
    } catch (err) {
      console.error(err);
    }
    const keyboard =
      updated.status === "expired"
        ? EMPTY_KEYBOARD
        : undoOnlyKeyboard(updated.id);
    await editDraftMessage(
      bot,
      updated,
      formatExpenseLogReply(updated.expense, pace, timeZone),
      keyboard,
    );
    await answerCallback(bot, query, "Saved");
  } catch (err) {
    console.error(err);
    expenseDrafts.abortSave(id);
    await answerCallback(bot, query, "Couldn't save");
  }
}

async function undoDraft(
  id: string,
  userId: string,
  query: CallbackQuery,
  bot: TelegramBot,
) {
  const result = expenseDrafts.cancel(id, userId);
  if (!result.ok) {
    await answerCallback(bot, query, toastForError(result.reason));
    return;
  }

  if (result.wasSaved && result.draft.savedExpenseId) {
    await deleteExpenseById(result.draft.userId, result.draft.savedExpenseId);
    await editDraftMessage(bot, result.draft, EXPENSE_UNDONE_TEXT);
    await answerCallback(bot, query, "Removed");
    return;
  }

  await editDraftMessage(bot, result.draft, EXPENSE_CANCELLED_TEXT);
  await answerCallback(bot, query, "Cancelled");
}
