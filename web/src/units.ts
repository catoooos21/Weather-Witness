/**
 * How a metric's numbers are worded. One place, so a measure in °C, mm or % reads correctly on a
 * tile, in a trend sentence, on a chart axis and in a what-if.
 */
import type { MetricDef } from './config/metrics'

/** True when a number is written as exactly "1": "1 day", but "1.0 days". Pass the text that is shown. */
function isOne(shown?: number | string): boolean {
  return shown !== undefined && String(shown) === '1'
}

/** Short unit for a value or a chart axis: "days", "mm", "°C", "%". `shown` picks "day" for exactly "1". */
export function unitShort(def: MetricDef, shown?: number | string): string {
  if (def.unit !== 'days') return def.unit
  return isOne(shown) ? 'day' : 'days'
}

/**
 * Unit of a change. A percentage changes in points (43 % to 40 % is 3 points, not 3 %);
 * everything else changes in its own unit.
 */
export function rateUnit(def: MetricDef, shown?: number | string): string {
  if (def.unit === '%') return isOne(shown) ? 'point' : 'points'
  return unitShort(def, shown)
}

/** What the big number on a tile means: "days a year", "mm on the wettest day", "°C, yearly average". */
export function unitLong(def: MetricDef): string {
  return def.unitLong ?? (def.unit === 'days' ? 'days a year' : def.unit)
}

/** Decimals worth showing for a change per ten years: temperature and humidity move in small steps. */
export function rateDigits(def: MetricDef, n: number): number {
  if (def.unit === '°C') return 2
  if (def.unit === '%') return Math.abs(n) < 1 ? 2 : 1
  return Math.abs(n) < 2 ? 1 : 0
}

/** Decimals for the yearly value itself. */
export function valueDigits(def: MetricDef): number {
  return def.unit === '°C' || def.unit === '%' ? 1 : 0
}

/** Keep an extrapolated value inside what the unit allows. Temperature may be negative; days, rain and percentages may not. */
export function clampValue(def: MetricDef, v: number): number {
  if (def.unit === 'days') return Math.max(0, Math.min(366, v))
  if (def.unit === '%') return Math.max(0, Math.min(100, v))
  if (def.unit === 'mm') return Math.max(0, v)
  return v
}

/** Counts, rain and percentages start at zero on a chart; temperature does not (27 °C against 28 °C would look flat). */
export function axisFromZero(def: MetricDef): boolean {
  return def.unit !== '°C'
}
