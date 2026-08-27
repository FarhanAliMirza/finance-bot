import { randomUUID } from "crypto";

export const EXPORT_RANGE_TTL_MS = 10 * 60 * 1000;

export interface StoredExportRange {
  id: string;
  userId: string;
  chatId: number;
  from: string;
  to: string;
}

interface InternalRange extends StoredExportRange {
  timeoutHandle: ReturnType<typeof setTimeout> | null;
}

function newRangeId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 10);
}

export function createExportRangeStore() {
  const ranges = new Map<string, InternalRange>();

  function clearTimer(range: InternalRange) {
    if (range.timeoutHandle) {
      clearTimeout(range.timeoutHandle);
      range.timeoutHandle = null;
    }
  }

  function toPublic(range: InternalRange): StoredExportRange {
    return {
      id: range.id,
      userId: range.userId,
      chatId: range.chatId,
      from: range.from,
      to: range.to,
    };
  }

  return {
    create(input: {
      userId: string;
      chatId: number;
      from: string;
      to: string;
    }): StoredExportRange {
      let id = newRangeId();
      while (ranges.has(id)) id = newRangeId();
      const range: InternalRange = {
        id,
        userId: input.userId,
        chatId: input.chatId,
        from: input.from,
        to: input.to,
        timeoutHandle: null,
      };
      ranges.set(id, range);
      range.timeoutHandle = setTimeout(() => {
        ranges.delete(id);
      }, EXPORT_RANGE_TTL_MS);
      return toPublic(range);
    },

    get(id: string): StoredExportRange | undefined {
      const range = ranges.get(id);
      return range ? toPublic(range) : undefined;
    },

    size() {
      return ranges.size;
    },

    clearAll() {
      for (const range of ranges.values()) {
        clearTimer(range);
      }
      ranges.clear();
    },
  };
}

export type ExportRangeStore = ReturnType<typeof createExportRangeStore>;

export const exportRanges = createExportRangeStore();
