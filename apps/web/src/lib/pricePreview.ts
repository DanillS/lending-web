export type PricePreview = {
  count: number;
  rows: { id: string; name: string; base_price: number; current_price: number; new_price: number }[];
};

export function selectedProductIds(selected: Record<string, boolean>): string[] {
  return Object.entries(selected)
    .filter(([, on]) => on)
    .map(([id]) => id);
}

export function applyPercent(basePrice: number, percent: number): number {
  return Math.max(0, Math.round(basePrice * (1 + percent / 100)));
}

export function livePricePreview(
  items: { id: string; name: string; base_price: number; current_price: number }[],
  selected: Record<string, boolean>,
  selectAll: boolean,
  percent: number,
): PricePreview | null {
  if (percent === 0) return null;
  const chosen = selectAll ? items : items.filter((item) => selected[item.id]);
  if (chosen.length === 0) return null;
  return {
    count: chosen.length,
    rows: chosen.map((item) => ({
      id: item.id,
      name: item.name,
      base_price: item.base_price,
      current_price: item.current_price,
      new_price: applyPercent(item.base_price, percent),
    })),
  };
}
