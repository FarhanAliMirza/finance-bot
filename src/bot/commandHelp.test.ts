import { describe, expect, it } from "vitest";
import {
  BOT_MENU_COMMANDS,
  HELP_TEXT,
  UNKNOWN_COMMAND_TEXT,
  parseSlashCommand,
} from "./commandHelp";

const ALL_COMMANDS = [
  "/start",
  "/help",
  "/today",
  "/week",
  "/month",
  "/export",
  "/budget",
  "/setBudget",
  "/setTimezone",
  "/methods",
  "/last",
  "/delete",
] as const;

describe("HELP_TEXT", () => {
  it("lists every bot command", () => {
    for (const command of ALL_COMMANDS) {
      expect(HELP_TEXT).toContain(command);
    }
  });

  it("mentions plain-English expenses, questions, edits, Confirm/Undo, and optional budget", () => {
    expect(HELP_TEXT).toMatch(/plain English/i);
    expect(HELP_TEXT).toContain("Confirm");
    expect(HELP_TEXT).toContain("Undo");
    expect(HELP_TEXT).toMatch(/optional/i);
    expect(HELP_TEXT).toContain("/setBudget");
    expect(HELP_TEXT).toContain("Asia/Kolkata");
    expect(HELP_TEXT).toMatch(/how much did I spend today/i);
    expect(HELP_TEXT).toMatch(/change that to 200/i);
    expect(HELP_TEXT).toContain("make it Travel");
    expect(HELP_TEXT).toContain("make it UPI");
    expect(HELP_TEXT).toContain("/methods");
    expect(HELP_TEXT).toMatch(/Cash/);
    expect(HELP_TEXT).toMatch(/UPI/);
  });
});

describe("UNKNOWN_COMMAND_TEXT", () => {
  it("tells the user the command is unknown and to try /help", () => {
    expect(UNKNOWN_COMMAND_TEXT).toBe("Unknown command. Try /help.");
  });
});

describe("BOT_MENU_COMMANDS", () => {
  it("registers only daily-use commands", () => {
    expect(BOT_MENU_COMMANDS.map((c) => c.command)).toEqual([
      "today",
      "week",
      "last",
      "delete",
    ]);
  });

  it("does not include setTimezone, methods, or export in the Telegram menu", () => {
    const commands = BOT_MENU_COMMANDS.map((c) => c.command);
    expect(commands).not.toContain("setTimezone");
    expect(commands).not.toContain("methods");
    expect(commands).not.toContain("export");
  });
});

describe("parseSlashCommand", () => {
  it("strips bot mention and arguments", () => {
    expect(parseSlashCommand("/today@MyBot extra")).toBe("/today");
    expect(parseSlashCommand("/setBudget 15000")).toBe("/setBudget");
  });

  it("returns null for non-slash text", () => {
    expect(parseSlashCommand("Spent 150 on coffee")).toBeNull();
  });
});
