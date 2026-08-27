import { describe, expect, it } from "vitest";
import {
  SET_TIMEZONE_USAGE,
  UNKNOWN_TIMEZONE_TEXT,
  currentTimezoneMessage,
  parseTimezoneArgument,
  timezoneSavedMessage,
} from "./setTimezone";

describe("parseTimezoneArgument", () => {
  it("returns undefined when there is no argument", () => {
    expect(parseTimezoneArgument("/setTimezone")).toBeUndefined();
    expect(parseTimezoneArgument("/setTimezone@MyBot")).toBeUndefined();
    expect(parseTimezoneArgument("/setTimezone   ")).toBeUndefined();
  });

  it("reads the IANA name after the command", () => {
    expect(parseTimezoneArgument("/setTimezone Asia/Kolkata")).toBe(
      "Asia/Kolkata",
    );
    expect(parseTimezoneArgument("/setTimezone@MyBot America/New_York")).toBe(
      "America/New_York",
    );
  });
});

describe("setTimezone copy", () => {
  it("shows current timezone and usage when called with no args", () => {
    expect(currentTimezoneMessage("Asia/Kolkata")).toBe(
      "Your timezone is Asia/Kolkata.\n\nUsage: /setTimezone Asia/Kolkata",
    );
    expect(SET_TIMEZONE_USAGE).toBe("/setTimezone Asia/Kolkata");
  });

  it("confirms a saved timezone", () => {
    expect(timezoneSavedMessage("Asia/Kolkata")).toBe(
      "Timezone set to Asia/Kolkata.",
    );
  });

  it("rejects unknown names with a short example", () => {
    expect(UNKNOWN_TIMEZONE_TEXT).toBe(
      "Unknown timezone. Usage: /setTimezone Asia/Kolkata",
    );
  });
});
