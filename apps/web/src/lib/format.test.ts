import { describe, expect, it } from "vitest";
import { formatPrice } from "./format";

describe("formatPrice", () => {
  it("formats rubles", () => {
    expect(formatPrice(4050)).toContain("050");
  });
});
