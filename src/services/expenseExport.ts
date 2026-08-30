import ExcelJS from "exceljs";
import {
  calendarDateInTimeZone,
  dateRangeForIsoDays,
  formatIsoDate,
  formatZonedDateTime,
  monthRange,
  parseIsoDate,
  startOfWeekCalendar,
  todayRange,
  weekRange,
  type CalendarDate,
  type InstantRange,
} from "../utils/dates";
import {
  EXPORT_BORDER_HEX,
  EXPORT_TEXT_HEX,
  HEADER_FILL_HEX,
  categoryPastelHex,
  hexToArgb,
  paymentMethodPastelHex,
} from "../utils/exportColors";
import { UNSPECIFIED_METHOD_LABEL } from "../utils/paymentMethods";

export type ExportFormat = "csv" | "xlsx";

export type NamedExportPeriod = "today" | "week" | "month";

export type ExportWindow =
  | { kind: NamedExportPeriod }
  | { kind: "custom"; from: string; to: string };

export interface ExportableExpense {
  createdAt: Date;
  amount: number;
  category: string;
  paymentMethod?: string | null;
  description: string;
}

export interface ExportRow {
  date: string;
  amount: number;
  category: string;
  paymentMethod: string;
  description: string;
}

export const EXPORT_HEADERS = [
  "Date",
  "Amount",
  "Category",
  "Payment method",
  "Description",
] as const;

export const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";
export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function instantRangeForExport(
  window: ExportWindow,
  timeZone: string,
  now: Date = new Date(),
): InstantRange | null {
  switch (window.kind) {
    case "today":
      return todayRange(timeZone, now);
    case "week":
      return weekRange(timeZone, now);
    case "month":
      return monthRange(timeZone, now);
    case "custom":
      return dateRangeForIsoDays(window.from, window.to, timeZone);
  }
}

export function toExportRows(
  expenses: ExportableExpense[],
  timeZone: string,
): ExportRow[] {
  return [...expenses]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((expense) => ({
      date: formatZonedDateTime(expense.createdAt, timeZone),
      amount: expense.amount,
      category: expense.category,
      paymentMethod: expense.paymentMethod || UNSPECIFIED_METHOD_LABEL,
      description: expense.description,
    }));
}

export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatExportAmount(amount: number): string {
  if (Number.isInteger(amount) || Math.abs(amount - Math.round(amount)) < 1e-9) {
    return String(Math.round(amount));
  }
  return String(amount);
}

export function toCsv(rows: ExportRow[]): string {
  const lines = [
    EXPORT_HEADERS.join(","),
    ...rows.map((row) =>
      [
        csvEscape(row.date),
        formatExportAmount(row.amount),
        csvEscape(row.category),
        csvEscape(row.paymentMethod),
        csvEscape(row.description),
      ].join(","),
    ),
  ];
  return lines.join("\n");
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: hexToArgb(EXPORT_BORDER_HEX) } },
  left: { style: "thin", color: { argb: hexToArgb(EXPORT_BORDER_HEX) } },
  bottom: { style: "thin", color: { argb: hexToArgb(EXPORT_BORDER_HEX) } },
  right: { style: "thin", color: { argb: hexToArgb(EXPORT_BORDER_HEX) } },
};

function solidFill(hex: string): ExcelJS.FillPattern {
  return {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: hexToArgb(hex) },
  };
}

function applyPastelCell(cell: ExcelJS.Cell, hex: string): void {
  cell.fill = solidFill(hex);
  cell.font = { color: { argb: hexToArgb(EXPORT_TEXT_HEX) } };
}

function autoWidthColumns(sheet: ExcelJS.Worksheet): void {
  const minWidths = [12, 10, 12, 16, 14];
  sheet.columns.forEach((column, index) => {
    let max = minWidths[index] ?? 10;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    column.width = Math.min(max + 2, 48);
  });
}

export async function toXlsx(rows: ExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Expenses");
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const headerRow = sheet.addRow([...EXPORT_HEADERS]);
  headerRow.eachCell((cell) => {
    cell.fill = solidFill(HEADER_FILL_HEX);
    cell.border = THIN_BORDER;
    cell.font = { bold: true, color: { argb: hexToArgb(EXPORT_TEXT_HEX) } };
  });

  for (const row of rows) {
    const excelRow = sheet.addRow([
      row.date,
      row.amount,
      row.category,
      row.paymentMethod,
      row.description,
    ]);
    excelRow.eachCell((cell) => {
      cell.border = THIN_BORDER;
    });
    applyPastelCell(excelRow.getCell(3), categoryPastelHex(row.category));
    applyPastelCell(excelRow.getCell(4), paymentMethodPastelHex(row.paymentMethod));
  }

  autoWidthColumns(sheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** ISO week (Mon–Sun) of a calendar date, for weekly filenames. */
export function isoWeekYear(date: CalendarDate): { year: number; week: number } {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: utc.getUTCFullYear(), week };
}

function sortedCustomDays(fromIso: string, toIso: string): {
  from: CalendarDate;
  to: CalendarDate;
} | null {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  if (!from || !to) return null;
  if (formatIsoDate(from) <= formatIsoDate(to)) return { from, to };
  return { from: to, to: from };
}

export function exportFilename(
  window: ExportWindow,
  format: ExportFormat,
  timeZone: string,
  now: Date = new Date(),
): string {
  const ext = format === "xlsx" ? "xlsx" : "csv";
  switch (window.kind) {
    case "today":
      return `expenses-${formatIsoDate(calendarDateInTimeZone(now, timeZone))}.${ext}`;
    case "week": {
      const { year, week } = isoWeekYear(startOfWeekCalendar(timeZone, now));
      return `expenses-${year}-W${pad2(week)}.${ext}`;
    }
    case "month": {
      const cal = calendarDateInTimeZone(now, timeZone);
      return `expenses-${cal.year}-${pad2(cal.month)}.${ext}`;
    }
    case "custom": {
      const days = sortedCustomDays(window.from, window.to);
      if (!days) return `expenses-custom.${ext}`;
      const start = formatIsoDate(days.from);
      const end = formatIsoDate(days.to);
      if (start === end) return `expenses-${start}.${ext}`;
      return `expenses-${start}-to-${end}.${ext}`;
    }
  }
}

function dayMonthYear(date: CalendarDate): string {
  return `${date.day} ${SHORT_MONTHS[date.month - 1]} ${date.year}`;
}

function captionRangeLabel(from: CalendarDate, to: CalendarDate): string {
  if (
    from.year === to.year &&
    from.month === to.month &&
    from.day === to.day
  ) {
    return dayMonthYear(from);
  }
  if (from.year === to.year && from.month === to.month) {
    return `${from.day}–${to.day} ${SHORT_MONTHS[from.month - 1]} ${from.year}`;
  }
  if (from.year === to.year) {
    return `${from.day} ${SHORT_MONTHS[from.month - 1]}–${to.day} ${SHORT_MONTHS[to.month - 1]} ${from.year}`;
  }
  return `${dayMonthYear(from)}–${dayMonthYear(to)}`;
}

export function exportCaption(
  window: ExportWindow,
  count: number,
  timeZone: string,
  now: Date = new Date(),
): string {
  const n = `${count} ${count === 1 ? "expense" : "expenses"}`;
  switch (window.kind) {
    case "today":
      return `${dayMonthYear(calendarDateInTimeZone(now, timeZone))} · ${n}`;
    case "week":
      return `${captionRangeLabel(startOfWeekCalendar(timeZone, now), calendarDateInTimeZone(now, timeZone))} · ${n}`;
    case "month": {
      const label = new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone,
      }).format(now);
      return `${label} · ${n}`;
    }
    case "custom": {
      const days = sortedCustomDays(window.from, window.to);
      if (!days) return n;
      return `${captionRangeLabel(days.from, days.to)} · ${n}`;
    }
  }
}

export type BuiltExport =
  | { empty: true }
  | {
      empty: false;
      buffer: Buffer;
      filename: string;
      caption: string;
      contentType: string;
    };

export async function buildExportFile(
  expenses: ExportableExpense[],
  window: ExportWindow,
  timeZone: string,
  format: ExportFormat,
  now: Date = new Date(),
): Promise<BuiltExport> {
  if (expenses.length === 0) return { empty: true };
  const rows = toExportRows(expenses, timeZone);
  const filename = exportFilename(window, format, timeZone, now);
  const caption = exportCaption(window, expenses.length, timeZone, now);
  if (format === "csv") {
    return {
      empty: false,
      buffer: Buffer.from(toCsv(rows), "utf8"),
      filename,
      caption,
      contentType: CSV_CONTENT_TYPE,
    };
  }
  return {
    empty: false,
    buffer: await toXlsx(rows),
    filename,
    caption,
    contentType: XLSX_CONTENT_TYPE,
  };
}
