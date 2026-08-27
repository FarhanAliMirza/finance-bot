import { describe, expect, it } from "vitest";
import {
  buildExportFile,
  exportCaption,
  exportFilename,
  isoWeekYear,
  toCsv,
  toExportRows,
  toXlsx,
  type ExportableExpense,
} from "./expenseExport";

const KOLKATA = "Asia/Kolkata";
/** Thursday 27 Aug 2026 01:30 IST */
const NOW = new Date("2026-08-26T20:00:00.000Z");

const expenses: ExportableExpense[] = [
  {
    createdAt: new Date("2026-08-27T08:00:00.000Z"),
    amount: 500,
    category: "Travel",
    paymentMethod: "Card",
    description: 'Taxi, "airport"',
  },
  {
    createdAt: new Date("2026-08-26T20:00:00.000Z"),
    amount: 150,
    category: "Food",
    paymentMethod: "UPI",
    description: "Coffee",
  },
  {
    createdAt: new Date("2026-08-27T10:00:00.000Z"),
    amount: 80.5,
    category: "Food",
    paymentMethod: null,
    description: "Snacks",
  },
];

describe("toExportRows / toCsv", () => {
  it("writes a header and chronological rows with quoted fields", () => {
    const rows = toExportRows(expenses, KOLKATA);
    expect(rows.map((r) => r.date)).toEqual([
      "2026-08-27 01:30",
      "2026-08-27 13:30",
      "2026-08-27 15:30",
    ]);
    expect(rows[2].paymentMethod).toBe("Unspecified");

    const csv = toCsv(rows);
    expect(csv).toBe(
      [
        "Date,Amount,Category,Payment method,Description",
        '2026-08-27 01:30,150,Food,UPI,Coffee',
        '2026-08-27 13:30,500,Travel,Card,"Taxi, ""airport"""',
        "2026-08-27 15:30,80.5,Food,Unspecified,Snacks",
      ].join("\n"),
    );
  });
});

describe("buildExportFile empty vs non-empty", () => {
  it("does not build a file when there are no expenses", async () => {
    const result = await buildExportFile(
      [],
      { kind: "month" },
      KOLKATA,
      "csv",
      NOW,
    );
    expect(result).toEqual({ empty: true });
  });

  it("builds a CSV buffer when there are expenses", async () => {
    const result = await buildExportFile(
      expenses,
      { kind: "month" },
      KOLKATA,
      "csv",
      NOW,
    );
    expect(result.empty).toBe(false);
    if (result.empty) return;
    expect(result.filename).toBe("expenses-2026-08.csv");
    expect(result.caption).toBe("August 2026 · 3 expenses");
    expect(result.buffer.toString("utf8")).toContain("Date,Amount,Category");
    expect(result.contentType).toContain("csv");
  });

  it("builds a real xlsx workbook", async () => {
    const result = await buildExportFile(
      expenses,
      { kind: "week" },
      KOLKATA,
      "xlsx",
      NOW,
    );
    expect(result.empty).toBe(false);
    if (result.empty) return;
    expect(result.filename).toBe("expenses-2026-W35.xlsx");
    expect(result.buffer.subarray(0, 2).toString("utf8")).toBe("PK");

    const rows = toExportRows(expenses, KOLKATA);
    const xlsx = await toXlsx(rows);
    expect(xlsx.subarray(0, 2).toString("utf8")).toBe("PK");
  });
});

describe("exportFilename", () => {
  it("names today, week, month, and custom ranges clearly", () => {
    expect(exportFilename({ kind: "today" }, "csv", KOLKATA, NOW)).toBe(
      "expenses-2026-08-27.csv",
    );
    expect(exportFilename({ kind: "week" }, "xlsx", KOLKATA, NOW)).toBe(
      "expenses-2026-W35.xlsx",
    );
    expect(exportFilename({ kind: "month" }, "csv", KOLKATA, NOW)).toBe(
      "expenses-2026-08.csv",
    );
    expect(
      exportFilename(
        { kind: "custom", from: "2026-08-01", to: "2026-08-15" },
        "csv",
        KOLKATA,
        NOW,
      ),
    ).toBe("expenses-2026-08-01-to-2026-08-15.csv");
    expect(
      exportFilename(
        { kind: "custom", from: "2026-08-27", to: "2026-08-27" },
        "csv",
        KOLKATA,
        NOW,
      ),
    ).toBe("expenses-2026-08-27.csv");
  });
});

describe("isoWeekYear", () => {
  it("puts 27 Aug 2026 in ISO week 35", () => {
    expect(isoWeekYear({ year: 2026, month: 8, day: 27 })).toEqual({
      year: 2026,
      week: 35,
    });
    expect(isoWeekYear({ year: 2025, month: 12, day: 29 })).toEqual({
      year: 2026,
      week: 1,
    });
  });
});

describe("exportCaption", () => {
  it("uses a short period label and expense count", () => {
    expect(exportCaption({ kind: "month" }, 12, KOLKATA, NOW)).toBe(
      "August 2026 · 12 expenses",
    );
    expect(exportCaption({ kind: "today" }, 1, KOLKATA, NOW)).toBe(
      "27 Aug 2026 · 1 expense",
    );
  });
});
