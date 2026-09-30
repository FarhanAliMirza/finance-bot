import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("./prisma", () => ({
  prisma: {
    expense: {
      findMany,
    },
  },
}));

import { getExpensesByDescription } from "./expenses";

describe("getExpensesByDescription", () => {
  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([]);
  });

  it("uses a case-insensitive literal substring query scoped to user and range", async () => {
    const start = new Date("2026-08-31T18:30:00.000Z");
    const end = new Date("2026-09-15T18:30:00.000Z");

    await getExpensesByDescription(
      "telegram-user-42",
      "Joe's (coffee)",
      start,
      end,
    );

    expect(findMany).toHaveBeenCalledWith({
      where: {
        userId: "telegram-user-42",
        createdAt: {
          gte: start,
          lt: end,
        },
        description: {
          contains: "Joe's (coffee)",
          mode: "insensitive",
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });
});
