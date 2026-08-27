import { describe, expect, it } from "vitest";
import { parseExportArgs } from "./export";

describe("parseExportArgs", () => {
  it("defaults to this month as CSV", () => {
    expect(parseExportArgs("/export")).toEqual({
      ok: true,
      format: "csv",
      window: { kind: "month" },
    });
    expect(parseExportArgs("/export@MyBot")).toEqual({
      ok: true,
      format: "csv",
      window: { kind: "month" },
    });
  });

  it("honors format without changing the default period", () => {
    expect(parseExportArgs("/export csv")).toEqual({
      ok: true,
      format: "csv",
      window: { kind: "month" },
    });
    expect(parseExportArgs("/export excel")).toEqual({
      ok: true,
      format: "xlsx",
      window: { kind: "month" },
    });
    expect(parseExportArgs("/export xlsx")).toEqual({
      ok: true,
      format: "xlsx",
      window: { kind: "month" },
    });
  });

  it("parses named periods", () => {
    expect(parseExportArgs("/export week")).toEqual({
      ok: true,
      format: "csv",
      window: { kind: "week" },
    });
    expect(parseExportArgs("/export month")).toEqual({
      ok: true,
      format: "csv",
      window: { kind: "month" },
    });
    expect(parseExportArgs("/export today")).toEqual({
      ok: true,
      format: "csv",
      window: { kind: "today" },
    });
  });

  it("honors format and period in either order", () => {
    expect(parseExportArgs("/export excel week")).toEqual({
      ok: true,
      format: "xlsx",
      window: { kind: "week" },
    });
    expect(parseExportArgs("/export week excel")).toEqual({
      ok: true,
      format: "xlsx",
      window: { kind: "week" },
    });
    expect(parseExportArgs("/export csv today")).toEqual({
      ok: true,
      format: "csv",
      window: { kind: "today" },
    });
  });

  it("parses inclusive custom dates", () => {
    expect(parseExportArgs("/export 2026-08-01 2026-08-15")).toEqual({
      ok: true,
      format: "csv",
      window: { kind: "custom", from: "2026-08-01", to: "2026-08-15" },
    });
    expect(parseExportArgs("/export excel 2026-08-01 2026-08-15")).toEqual({
      ok: true,
      format: "xlsx",
      window: { kind: "custom", from: "2026-08-01", to: "2026-08-15" },
    });
    expect(parseExportArgs("/export 2026-08-15 2026-08-01 csv")).toEqual({
      ok: true,
      format: "csv",
      window: { kind: "custom", from: "2026-08-01", to: "2026-08-15" },
    });
    expect(parseExportArgs("/export 2026-08-27")).toEqual({
      ok: true,
      format: "csv",
      window: { kind: "custom", from: "2026-08-27", to: "2026-08-27" },
    });
  });

  it("rejects unknown tokens and mixed period styles", () => {
    expect(parseExportArgs("/export pdf")).toEqual({ ok: false });
    expect(parseExportArgs("/export week month")).toEqual({ ok: false });
    expect(parseExportArgs("/export week 2026-08-01")).toEqual({ ok: false });
    expect(parseExportArgs("/export csv excel")).toEqual({ ok: false });
  });
});
