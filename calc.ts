import { Decimal } from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const WEIGHT_UNITS = ['mg', 'g', 'kg', 'tola', 'oz'] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export const UNIT_TO_GRAMS: Record<WeightUnit, string> = {
  mg: '0.001',
  g: '1',
  kg: '1000',
  tola: '11.6638038',
  oz: '31.1034768',
};

export function toGrams(value: number | string, unit: WeightUnit): Decimal {
  return new Decimal(value).times(UNIT_TO_GRAMS[unit]);
}

export function fromGrams(grams: number | string | Decimal, unit: WeightUnit): Decimal {
  return new Decimal(grams as string).div(UNIT_TO_GRAMS[unit]);
}

export function convertWeight(
  value: number | string,
  from: WeightUnit,
  to: WeightUnit
): string {
  const grams = toGrams(value, from);
  return fromGrams(grams, to).toString();
}

export function fineWeight(
  grossWeight: number | string,
  purity: number
): string {
  if (!purity || purity <= 0) return '0';
  return new Decimal(grossWeight).times(purity).div(1000).toString();
}

export function grossWeight(
  fineWt: number | string,
  purity: number
): string {
  if (!purity || purity <= 0) return '0';
  return new Decimal(fineWt).times(1000).div(purity).toString();
}

export function amount(
  weight: number | string,
  rate: number | string
): string {
  return new Decimal(weight).times(rate).toString();
}

export function roundTo(value: number | string | Decimal, decimals: number): string {
  return new Decimal(value).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toString();
}

export function formatWeight(value: number | string | null | undefined, decimals = 3): string {
  if (value === null || value === undefined || value === '') return '—';
  const d = new Decimal(value);
  if (d.isZero()) return '0.000';
  return d.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toFixed(decimals);
}

export function formatNumber(value: number | string | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || value === '') return '—';
  const d = new Decimal(value);
  return d.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toFixed(decimals);
}

export function addDecimals(...values: (number | string | null | undefined)[]): string {
  return values
    .filter((v) => v !== null && v !== undefined && v !== '')
    .reduce<Decimal>((acc, v) => acc.plus(new Decimal(v as string)), new Decimal(0))
    .toString();
}

export function subDecimals(a: number | string | null | undefined, b: number | string | null | undefined): string {
  return new Decimal(a ?? 0).minus(new Decimal(b ?? 0)).toString();
}

export function isPositive(v: number | string | null | undefined): boolean {
  if (v === null || v === undefined || v === '') return false;
  return new Decimal(v).gt(0);
}

export function isNegative(v: number | string | null | undefined): boolean {
  if (v === null || v === undefined || v === '') return false;
  return new Decimal(v).lt(0);
}

export function absValue(v: number | string | null | undefined): string {
  return new Decimal(v ?? 0).abs().toString();
}

export function variancePct(book: number | string, physical: number | string): string {
  const b = new Decimal(book);
  if (b.isZero()) return '0';
  return new Decimal(physical).minus(b).div(b).times(100).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toString();
}

export function toNumber(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const d = new Decimal(v);
  return d.toNumber();
}
