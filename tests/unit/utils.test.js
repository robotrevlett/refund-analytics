import { describe, it, expect } from "vitest";
import { parseDays, daysAgo } from "../../app/utils.server.js";

describe("parseDays", () => {
  function makeParams(obj) {
    return new URLSearchParams(obj);
  }

  it("returns 30 when no days param", () => {
    expect(parseDays(makeParams({}))).toBe(30);
  });

  it("parses valid integer", () => {
    expect(parseDays(makeParams({ days: "7" }))).toBe(7);
    expect(parseDays(makeParams({ days: "90" }))).toBe(90);
  });

  it("returns 30 for NaN input", () => {
    expect(parseDays(makeParams({ days: "abc" }))).toBe(30);
    expect(parseDays(makeParams({ days: "" }))).toBe(30);
  });

  it("returns 30 for negative or zero", () => {
    expect(parseDays(makeParams({ days: "0" }))).toBe(30);
    expect(parseDays(makeParams({ days: "-5" }))).toBe(30);
  });

  it("caps at 365", () => {
    expect(parseDays(makeParams({ days: "9999" }))).toBe(365);
    expect(parseDays(makeParams({ days: "365" }))).toBe(365);
    expect(parseDays(makeParams({ days: "366" }))).toBe(365);
  });
});

describe("daysAgo", () => {
  it("returns a date N days in the past at midnight", () => {
    const result = daysAgo(7);
    const expected = new Date();
    expected.setDate(expected.getDate() - 7);
    expected.setHours(0, 0, 0, 0);

    expect(result.getTime()).toBe(expected.getTime());
  });

  it("returns midnight", () => {
    const result = daysAgo(1);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it("handles 0 days (today at midnight)", () => {
    const result = daysAgo(0);
    const today = new Date();
    expect(result.getDate()).toBe(today.getDate());
  });
});
