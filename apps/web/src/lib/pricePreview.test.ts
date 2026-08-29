import { describe, expect, it } from "vitest";
import { applyPercent, livePricePreview, selectedProductIds } from "./pricePreview";

const item = (id: string, name: string, base = 1000, current = 1000) => ({
  id,
  name,
  base_price: base,
  current_price: current,
});

describe("selectedProductIds", () => {
  it("keeps only checked ids", () => {
    expect(selectedProductIds({ a: true, b: false, c: true })).toEqual(["a", "c"]);
  });
});

describe("applyPercent", () => {
  it("matches server rounding from base price", () => {
    expect(applyPercent(1000, 10)).toBe(1100);
    expect(applyPercent(1000, -10)).toBe(900);
    expect(applyPercent(4050, -10)).toBe(3645);
  });
});

describe("livePricePreview", () => {
  const items = [item("a", "A", 1000), item("b", "B", 2000)];

  it("adds checked rows and drops unchecked ones", () => {
    expect(livePricePreview(items, { a: true }, false, -10)?.rows.map((r) => r.id)).toEqual(["a"]);
    expect(livePricePreview(items, { a: true, b: true }, false, -10)?.rows.map((r) => r.id)).toEqual(["a", "b"]);
    expect(livePricePreview(items, { a: false, b: true }, false, -10)?.rows.map((r) => r.id)).toEqual(["b"]);
  });

  it("hides preview when nothing is selected", () => {
    expect(livePricePreview(items, { a: false }, false, -10)).toBeNull();
  });

  it("uses all loaded items when select-all is on", () => {
    const shown = livePricePreview(items, {}, true, -10);
    expect(shown?.count).toBe(2);
    expect(shown?.rows[1].new_price).toBe(1800);
  });
});
