import { randomUUID } from "crypto";
import type { ParsedExpense, PaymentMethod } from "../types/expense";

export const DRAFT_TTL_MS = 3 * 60 * 1000;

export type DraftStatus = "pending" | "saved" | "cancelled" | "expired";

export type ExpireKind = "auto_save" | "remove_keyboard" | "discard";

export interface ExpenseDraft {
  id: string;
  userId: string;
  chatId: number;
  messageId: number | null;
  expense: ParsedExpense;
  createdAt: number;
  savedExpenseId: string | null;
  status: DraftStatus;
}

export type DraftExpireEvent = {
  kind: ExpireKind;
  draft: ExpenseDraft;
};

export type DraftActionError =
  | "not_found"
  | "forbidden"
  | "expired"
  | "already_saved"
  | "busy";

export type ExpenseCallback =
  | { action: "ok" | "no"; id: string }
  | { action: "pm"; id: string; method: PaymentMethod };

interface InternalDraft extends ExpenseDraft {
  timeoutHandle: ReturnType<typeof setTimeout> | null;
  saving: boolean;
  expireAfterSave: boolean;
  onExpire?: (event: DraftExpireEvent) => void;
}

function toPublic(draft: InternalDraft): ExpenseDraft {
  return {
    id: draft.id,
    userId: draft.userId,
    chatId: draft.chatId,
    messageId: draft.messageId,
    expense: draft.expense,
    createdAt: draft.createdAt,
    savedExpenseId: draft.savedExpenseId,
    status: draft.status,
  };
}

function pendingExpireKind(expense: ParsedExpense): ExpireKind {
  return expense.paymentMethod ? "auto_save" : "discard";
}

export function encodeConfirmCallback(id: string): string {
  return `exp:ok:${id}`;
}

export function encodeUndoCallback(id: string): string {
  return `exp:no:${id}`;
}

export function encodePaymentMethodCallback(
  id: string,
  method: PaymentMethod,
): string {
  return `exp:pm:${id}:${method.toLowerCase()}`;
}

export function parseExpenseCallbackData(
  data: string | undefined,
): ExpenseCallback | null {
  if (!data) return null;
  const methodMatch = /^exp:pm:(.+):(cash|card|upi)$/i.exec(data);
  if (methodMatch) {
    const method = methodMatch[2].toLowerCase();
    return {
      action: "pm",
      id: methodMatch[1],
      method: method === "upi" ? "UPI" : method === "card" ? "Card" : "Cash",
    };
  }
  const match = /^exp:(ok|no):(.+)$/.exec(data);
  if (!match) return null;
  return { action: match[1] as "ok" | "no", id: match[2] };
}

export function createExpenseDraftStore() {
  const drafts = new Map<string, InternalDraft>();

  function clearTimer(draft: InternalDraft) {
    if (draft.timeoutHandle) {
      clearTimeout(draft.timeoutHandle);
      draft.timeoutHandle = null;
    }
  }

  function applyTimeout(id: string) {
    const draft = drafts.get(id);
    if (!draft) return;
    draft.timeoutHandle = null;
    if (draft.status === "cancelled" || draft.status === "expired") return;
    if (draft.saving) {
      draft.expireAfterSave = true;
      return;
    }
    if (draft.status === "pending") {
      draft.status = "expired";
      draft.onExpire?.({
        kind: pendingExpireKind(draft.expense),
        draft: toPublic(draft),
      });
      return;
    }
    if (draft.status === "saved") {
      draft.status = "expired";
      draft.onExpire?.({ kind: "remove_keyboard", draft: toPublic(draft) });
    }
  }

  return {
    create(input: {
      userId: string;
      chatId: number;
      expense: ParsedExpense;
      onExpire?: (event: DraftExpireEvent) => void;
    }): ExpenseDraft {
      const id = randomUUID();
      const draft: InternalDraft = {
        id,
        userId: input.userId,
        chatId: input.chatId,
        messageId: null,
        expense: input.expense,
        createdAt: Date.now(),
        savedExpenseId: null,
        status: "pending",
        timeoutHandle: null,
        saving: false,
        expireAfterSave: false,
        onExpire: input.onExpire,
      };
      drafts.set(id, draft);
      draft.timeoutHandle = setTimeout(() => applyTimeout(id), DRAFT_TTL_MS);
      return toPublic(draft);
    },

    bindMessage(id: string, messageId: number) {
      const draft = drafts.get(id);
      if (draft) draft.messageId = messageId;
    },

    get(id: string): ExpenseDraft | undefined {
      const draft = drafts.get(id);
      return draft ? toPublic(draft) : undefined;
    },

    setPaymentMethod(
      id: string,
      userId: string,
      method: PaymentMethod,
    ):
      | { ok: true; draft: ExpenseDraft }
      | { ok: false; reason: DraftActionError } {
      const draft = drafts.get(id);
      if (!draft) return { ok: false, reason: "not_found" };
      if (draft.userId !== userId) return { ok: false, reason: "forbidden" };
      if (draft.status === "cancelled" || draft.status === "expired") {
        return { ok: false, reason: "expired" };
      }
      if (draft.status === "saved") return { ok: false, reason: "already_saved" };
      if (draft.saving) return { ok: false, reason: "busy" };
      draft.expense = { ...draft.expense, paymentMethod: method };
      return { ok: true, draft: toPublic(draft) };
    },

    startSave(
      id: string,
      userId: string,
    ):
      | { ok: true; draft: ExpenseDraft }
      | { ok: false; reason: DraftActionError } {
      const draft = drafts.get(id);
      if (!draft) return { ok: false, reason: "not_found" };
      if (draft.userId !== userId) return { ok: false, reason: "forbidden" };
      if (draft.status === "cancelled" || draft.status === "expired") {
        return { ok: false, reason: "expired" };
      }
      if (draft.status === "saved") return { ok: false, reason: "already_saved" };
      if (draft.saving) return { ok: false, reason: "busy" };
      draft.saving = true;
      return { ok: true, draft: toPublic(draft) };
    },

    finishSave(id: string, expenseId: string): ExpenseDraft {
      const draft = drafts.get(id);
      if (!draft) {
        throw new Error(`Draft ${id} not found`);
      }
      draft.saving = false;
      draft.savedExpenseId = expenseId;
      if (draft.status === "cancelled") return toPublic(draft);
      if (draft.expireAfterSave) {
        draft.status = "expired";
        clearTimer(draft);
      } else {
        draft.status = "saved";
      }
      return toPublic(draft);
    },

    abortSave(id: string) {
      const draft = drafts.get(id);
      if (!draft) return;
      draft.saving = false;
      if (draft.expireAfterSave && draft.status === "pending") {
        draft.status = "expired";
        draft.onExpire?.({
          kind: pendingExpireKind(draft.expense),
          draft: toPublic(draft),
        });
      }
    },

    cancel(
      id: string,
      userId: string,
    ):
      | { ok: true; draft: ExpenseDraft; wasSaved: boolean }
      | { ok: false; reason: DraftActionError } {
      const draft = drafts.get(id);
      if (!draft) return { ok: false, reason: "not_found" };
      if (draft.userId !== userId) return { ok: false, reason: "forbidden" };
      if (draft.status === "cancelled" || draft.status === "expired") {
        return { ok: false, reason: "expired" };
      }
      if (draft.saving) return { ok: false, reason: "busy" };
      const wasSaved = draft.status === "saved";
      draft.status = "cancelled";
      clearTimer(draft);
      return { ok: true, draft: toPublic(draft), wasSaved };
    },

    attachSavedExpenseId(id: string, expenseId: string) {
      const draft = drafts.get(id);
      if (draft) draft.savedExpenseId = expenseId;
    },

    discard(id: string) {
      const draft = drafts.get(id);
      if (!draft) return;
      clearTimer(draft);
      drafts.delete(id);
    },

    size() {
      return drafts.size;
    },

    clearAll() {
      for (const draft of drafts.values()) {
        clearTimer(draft);
      }
      drafts.clear();
    },
  };
}

export type ExpenseDraftStore = ReturnType<typeof createExpenseDraftStore>;

export const expenseDrafts = createExpenseDraftStore();
