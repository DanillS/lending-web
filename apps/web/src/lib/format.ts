export function formatPrice(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function formatPhone(value: string): string {
  return value;
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
