import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { EXPENSE_CATEGORIES } from "../types/expense";
import {
  CATEGORY_PASTEL_HEX,
  EXPORT_TEXT_HEX,
  HEADER_FILL_HEX,
  PAYMENT_METHOD_PASTEL_HEX,
  hexToArgb,
} from "../utils/exportColors";
import {
  buildExportFile,
  exportCaption,
  exportFilename,
  isoWeekYear,
  toCsv,
  toExportRows,
  toXlsx,
  type ExportableExpense,
  type ExportRow,
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

function fillArgb(cell: ExcelJS.Cell): string | undefined {
  const fill = cell.fill;
  if (!fill || fill.type !== "pattern" || fill.pattern !== "solid") {
    return undefined;
  }
  return fill.fgColor?.argb?.toUpperCase();
}

function fontArgb(cell: ExcelJS.Cell): string | undefined {
  return cell.font?.color?.argb?.toUpperCase();
}

describe("toXlsx styling", () => {
  it("applies pastel fills only to category and payment method cells", async () => {
    const allRows: ExportRow[] = EXPENSE_CATEGORIES.map((category, i) => ({
      date: "2026-08-27 01:30",
      amount: i + 1,
      category,
      paymentMethod: (["Cash", "Card", "UPI", "Unspecified"] as const)[i % 4],
      description: category,
    }));

    const buffer = await toXlsx(allRows);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("Expenses");
    expect(sheet).toBeDefined();
    if (!sheet) return;

    expect(sheet.views?.[0]).toMatchObject({ state: "frozen", ySplit: 1 });

    for (let col = 1; col <= 5; col++) {
      expect(fillArgb(sheet.getCell(1, col))).toBe(hexToArgb(HEADER_FILL_HEX));
      expect(fontArgb(sheet.getCell(1, col))).toBe(hexToArgb(EXPORT_TEXT_HEX));
      expect(sheet.getCell(1, col).font?.bold).toBe(true);
    }

    for (let i = 0; i < EXPENSE_CATEGORIES.length; i++) {
      const excelRow = i + 2;
      const category = EXPENSE_CATEGORIES[i];
      const method = (["Cash", "Card", "UPI", "Unspecified"] as const)[i % 4];

      expect(fillArgb(sheet.getCell(excelRow, 1))).toBeUndefined();
      expect(fillArgb(sheet.getCell(excelRow, 2))).toBeUndefined();
      expect(fillArgb(sheet.getCell(excelRow, 5))).toBeUndefined();

      expect(fillArgb(sheet.getCell(excelRow, 3))).toBe(
        hexToArgb(CATEGORY_PASTEL_HEX[category]),
      );
      expect(fillArgb(sheet.getCell(excelRow, 4))).toBe(
        hexToArgb(PAYMENT_METHOD_PASTEL_HEX[method]),
      );
      expect(fontArgb(sheet.getCell(excelRow, 3))).toBe(hexToArgb(EXPORT_TEXT_HEX));
      expect(fontArgb(sheet.getCell(excelRow, 4))).toBe(hexToArgb(EXPORT_TEXT_HEX));
    }
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
