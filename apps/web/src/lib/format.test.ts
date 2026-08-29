import { describe, expect, it } from "vitest";
import { formatDateTime, formatPhone, formatPrice, newIdempotencyKey } from "./format";

describe("formatPrice", () => {
  it("formats rubles", () => {
    expect(formatPrice(4050)).toContain("050");
  });
});

describe("formatDateTime", () => {
  it("formats iso datetime", () => {
    const text = formatDateTime("2026-08-29T17:12:00+00:00");
    expect(text).toMatch(/\d{2}\.\d{2}\.\d{4}/);
    expect(text).toMatch(/\d{2}:\d{2}/);
  });
});

describe("formatPhone", () => {
  it("returns the raw value", () => {
    expect(formatPhone("+79503101560")).toBe("+79503101560");
  });
});

describe("newIdempotencyKey", () => {
  it("returns a non-empty key", () => {
    expect(newIdempotencyKey().length).toBeGreaterThan(8);
  });
});
