export type PriceRoundMode = "none" | "10" | "100";

export function roundPriceUp(value: number, mode: PriceRoundMode): number {
  if (mode === "none") return value;
  const multiple = mode === "10" ? 10 : 100;
  return Math.ceil(value / multiple) * multiple;
}

export function applyPriceIncrease(
  price: number,
  percentage: number,
  roundMode: PriceRoundMode,
): number {
  return roundPriceUp(price * (1 + percentage), roundMode);
}
