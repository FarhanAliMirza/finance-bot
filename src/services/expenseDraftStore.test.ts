import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DRAFT_TTL_MS,
  createExpenseDraftStore,
  encodeConfirmCallback,
  encodePaymentMethodCallback,
  encodeUndoCallback,
  parseExpenseCallbackData,
  type DraftExpireEvent,
  type ExpenseDraftStore,
} from "./expenseDraftStore";
import type { ParsedExpense } from "../types/expense";

const expense: ParsedExpense = {
  amount: 150,
  category: "Food",
  description: "Lunch at cafe",
  date: "2026-08-27",
};

const USER = "111";
const OTHER = "222";

function makeDraft(store: ExpenseDraftStore) {
  const events: DraftExpireEvent[] = [];
  const draft = store.create({
    userId: USER,
    chatId: 99,
    expense,
    onExpire: (event) => events.push(event),
  });
  return { draft, events };
}

describe("expense callback_data", () => {
  it("encodes confirm/undo under Telegram's 64-byte limit", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(encodeConfirmCallback(id).length).toBeLessThanOrEqual(64);
    expect(encodeUndoCallback(id).length).toBeLessThanOrEqual(64);
    expect(parseExpenseCallbackData(encodeConfirmCallback(id))).toEqual({
      action: "ok",
      id,
    });
    expect(parseExpenseCallbackData(encodeUndoCallback(id))).toEqual({
      action: "no",
      id,
    });
    expect(encodePaymentMethodCallback(id, "UPI").length).toBeLessThanOrEqual(
      64,
    );
    expect(parseExpenseCallbackData(encodePaymentMethodCallback(id, "UPI"))).toEqual(
      {
        action: "pm",
        id,
        method: "UPI",
      },
    );
    expect(
      parseExpenseCallbackData(encodePaymentMethodCallback(id, "Cash")),
    ).toEqual({ action: "pm", id, method: "Cash" });
    expect(
      parseExpenseCallbackData(encodePaymentMethodCallback(id, "Card")),
    ).toEqual({ action: "pm", id, method: "Card" });
  });

  it("returns null for unrelated callback data", () => {
    expect(parseExpenseCallbackData("help:ok:1")).toBeNull();
    expect(parseExpenseCallbackData("onb:skip")).toBeNull();
    expect(parseExpenseCallbackData(undefined)).toBeNull();
  });
});

describe("expense draft store", () => {
  let store: ExpenseDraftStore;

  beforeEach(() => {
    vi.useFakeTimers();
    store = createExpenseDraftStore();
  });

  afterEach(() => {
    store.clearAll();
    vi.useRealTimers();
  });

  it("creates a pending draft with a unique id", () => {
    const { draft, events } = makeDraft(store);
    expect(draft.status).toBe("pending");
    expect(draft.savedExpenseId).toBeNull();
    expect(draft.messageId).toBeNull();
    expect(events).toHaveLength(0);
  });

  it("binds the Telegram message id after send", () => {
    const { draft } = makeDraft(store);
    store.bindMessage(draft.id, 42);
    expect(store.get(draft.id)?.messageId).toBe(42);
  });

  it("confirm: pending → saved with expense id, timer still running", () => {
    const { draft, events } = makeDraft(store);
    const claimed = store.startSave(draft.id, USER);
    expect(claimed.ok).toBe(true);
    const saved = store.finishSave(draft.id, "exp-1");
    expect(saved.status).toBe("saved");
    expect(saved.savedExpenseId).toBe("exp-1");

    vi.advanceTimersByTime(DRAFT_TTL_MS - 1);
    expect(events).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(events).toEqual([
      {
        kind: "remove_keyboard",
        draft: expect.objectContaining({ id: draft.id, status: "expired" }),
      },
    ]);
    expect(store.get(draft.id)?.status).toBe("expired");
  });

  it("undo of a pending draft cancels without saving and clears the timer", () => {
    const { draft, events } = makeDraft(store);
    const result = store.cancel(draft.id, USER);
    expect(result).toEqual({
      ok: true,
      wasSaved: false,
      draft: expect.objectContaining({
        status: "cancelled",
        savedExpenseId: null,
      }),
    });
    vi.advanceTimersByTime(DRAFT_TTL_MS + 1000);
    expect(events).toHaveLength(0);
    expect(store.get(draft.id)?.status).toBe("cancelled");
  });

  it("undo of a saved draft returns wasSaved so the caller can delete by id", () => {
    const { draft, events } = makeDraft(store);
    store.startSave(draft.id, USER);
    store.finishSave(draft.id, "exp-99");
    const result = store.cancel(draft.id, USER);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.wasSaved).toBe(true);
      expect(result.draft.savedExpenseId).toBe("exp-99");
      expect(result.draft.status).toBe("cancelled");
    }
    vi.advanceTimersByTime(DRAFT_TTL_MS + 1000);
    expect(events).toHaveLength(0);
  });

  it("timeout of a pending draft without a method discards without saving", () => {
    const { draft, events } = makeDraft(store);
    vi.advanceTimersByTime(DRAFT_TTL_MS - 1);
    expect(events).toHaveLength(0);
    expect(store.get(draft.id)?.status).toBe("pending");
    vi.advanceTimersByTime(1);
    expect(events).toEqual([
      {
        kind: "discard",
        draft: expect.objectContaining({ id: draft.id, status: "expired" }),
      },
    ]);
    expect(store.get(draft.id)?.status).toBe("expired");
  });

  it("timeout of a pending draft with a method auto-saves", () => {
    const events: DraftExpireEvent[] = [];
    const draft = store.create({
      userId: USER,
      chatId: 99,
      expense: { ...expense, paymentMethod: "UPI" },
      onExpire: (event) => events.push(event),
    });
    vi.advanceTimersByTime(DRAFT_TTL_MS);
    expect(events).toEqual([
      {
        kind: "auto_save",
        draft: expect.objectContaining({ id: draft.id, status: "expired" }),
      },
    ]);
  });

  it("setPaymentMethod patches a pending draft", () => {
    const { draft } = makeDraft(store);
    const result = store.setPaymentMethod(draft.id, USER, "Card");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.expense.paymentMethod).toBe("Card");
    }
    expect(store.get(draft.id)?.expense.paymentMethod).toBe("Card");
  });

  it("timeout of an already-cancelled draft is a no-op", () => {
    const { draft, events } = makeDraft(store);
    store.cancel(draft.id, USER);
    vi.advanceTimersByTime(DRAFT_TTL_MS + 1000);
    expect(events).toHaveLength(0);
  });

  it("ignores confirm/undo from another user", () => {
    const { draft } = makeDraft(store);
    expect(store.startSave(draft.id, OTHER)).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(store.cancel(draft.id, OTHER)).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(store.get(draft.id)?.status).toBe("pending");
  });

  it("rejects confirm after timeout and undo after cancel", () => {
    const { draft } = makeDraft(store);
    vi.advanceTimersByTime(DRAFT_TTL_MS);
    expect(store.startSave(draft.id, USER)).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(store.cancel(draft.id, USER)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("confirm after save is already_saved", () => {
    const { draft } = makeDraft(store);
    store.startSave(draft.id, USER);
    store.finishSave(draft.id, "exp-1");
    expect(store.startSave(draft.id, USER)).toEqual({
      ok: false,
      reason: "already_saved",
    });
  });

  it("keeps two rapid logs as independent drafts", () => {
    const events: DraftExpireEvent[] = [];
    const a = store.create({
      userId: USER,
      chatId: 1,
      expense,
      onExpire: (e) => events.push(e),
    });
    const b = store.create({
      userId: USER,
      chatId: 1,
      expense: { ...expense, amount: 80 },
      onExpire: (e) => events.push(e),
    });
    expect(a.id).not.toBe(b.id);
    store.cancel(a.id, USER);
    vi.advanceTimersByTime(DRAFT_TTL_MS);
    expect(events).toHaveLength(1);
    expect(events[0].draft.id).toBe(b.id);
    expect(events[0].kind).toBe("discard");
    expect(store.get(a.id)?.status).toBe("cancelled");
    expect(store.get(b.id)?.status).toBe("expired");
  });

  it("if timeout fires during save, finishSave expires so the keyboard is removed", () => {
    const { draft, events } = makeDraft(store);
    expect(store.startSave(draft.id, USER).ok).toBe(true);
    vi.advanceTimersByTime(DRAFT_TTL_MS);
    expect(events).toHaveLength(0);
    expect(store.get(draft.id)?.status).toBe("pending");
    const finished = store.finishSave(draft.id, "exp-race");
    expect(finished.status).toBe("expired");
    expect(finished.savedExpenseId).toBe("exp-race");
    expect(events).toHaveLength(0);
  });

  it("unknown draft ids look expired", () => {
    expect(store.startSave("missing", USER)).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(store.cancel("missing", USER)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("second startSave while saving is busy", () => {
    const { draft } = makeDraft(store);
    expect(store.startSave(draft.id, USER).ok).toBe(true);
    expect(store.startSave(draft.id, USER)).toEqual({
      ok: false,
      reason: "busy",
    });
    expect(store.cancel(draft.id, USER)).toEqual({
      ok: false,
      reason: "busy",
    });
  });
});
