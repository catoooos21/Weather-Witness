/**
 * The air: dust and haze. How much the air dims the sun (aerosol optical depth at 550 nm),
 * from NASA's CERES satellite product through NASA POWER, for the same point as the weather.
 *
 * Checked with real requests on 2026-11-14:
 *  - parameter AOD_55 "Aerosol Optical Depth 55", dimensionless, source CERES SYN1deg, served in
 *    local solar time (community AG); CORS is open; 25 years are about 300 KB and 2 s
 *  - it starts on 2001-01-01 (earlier dates are fill values); no missing days in the demo cities
 *  - NASA POWER has NO dust-only parameter: DUSMASS, DUCMASS, DUEXTTAU, TOTEXTTAU and PM25 are
 *    all rejected as incorrect. So this is haze from everything: dust, smoke and pollution.
 *
 * The scale, in NASA's words (Earth Observatory, Aerosol Optical Thickness): less than 0.1 is
 * "a crystal clear sky with maximum visibility", 1 is "very hazy conditions". The 0.5 line for
 * a "hazy day" is ours, halfway between the two.
 */
import { MAX_MISSING_FRACTION, YEARS, type MetricDef } from './config/metrics'
import { calendar, periodStat, type AnnualSeries, type MetricResult } from './metrics'
import { DEMO_CITIES, FILL, POWER_URL, cacheKey, daysBetween, idbGet, idbPut } from './power'
import { annualTrend } from './stats'

/** Years the haze record covers in full. */
export const AIR_YEARS = { first: 2001, last: YEARS.last }

const PARAM = 'AOD_55'

export const HAZE = {
  /** NASA: below this is a crystal clear sky. */
  clearBelow: 0.1,
  /** Ours: halfway between crystal clear and very hazy. */
  hazyFrom: 0.5,
  /** NASA: this is very hazy. */
  veryHazyFrom: 1,
} as const

export const HAZE_SCALE_SOURCE = { label: 'NASA Earth Observatory: Aerosol Optical Thickness', url: 'https://earthobservatory.nasa.gov/global-maps/MODAL2_M_AER_OD' }

/** Daily haze indexed by day since YEARS.first-01-01; NaN before AIR_YEARS.first and where missing. */
export interface AirDaily {
  lat: number
  lon: number
  n: number
  haze: Float32Array
  fetchedAt: string
}

export function airUrl(lat: number, lon: number): string {
  const q = new URLSearchParams({
    parameters: PARAM,
    community: 'AG',
    longitude: String(lon),
    latitude: String(lat),
    start: `${AIR_YEARS.first}0101`,
    end: `${AIR_YEARS.last}1231`,
    format: 'JSON',
  })
  return `${POWER_URL}?${q}`
}

function blank(): Float32Array {
  return new Float32Array(daysBetween(YEARS.first, YEARS.last)).fill(NaN)
}

/** POWER JSON (values keyed by YYYYMMDD) -> an array on the app's day index. */
export function parseAir(json: any, lat: number, lon: number): AirDaily {
  const fill = json?.header?.fill_value ?? FILL
  const series = json?.properties?.parameter?.[PARAM]
  if (!series) throw new Error(`POWER response has no parameter ${PARAM}`)
  const start = Date.UTC(YEARS.first, 0, 1)
  const haze = blank()
  for (const [k, v] of Object.entries<number>(series)) {
    const i = Math.round((Date.UTC(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8)) - start) / 86400000)
    if (i >= 0 && i < haze.length && v !== null && v !== fill) haze[i] = v
  }
  if (!haze.some((v) => !Number.isNaN(v))) throw new Error('NASA POWER returned no haze data for this place.')
  return { lat, lon, n: haze.length, haze, fetchedAt: new Date().toISOString() }
}

/** Bundled demo copy: an array that starts on `first`-01-01, null where missing (scripts/fetch_demo_air.py). */
export function parseDemoAir(j: any, lat: number, lon: number): AirDaily {
  const offset = daysBetween(YEARS.first, (j.first ?? AIR_YEARS.first) - 1)
  const haze = blank()
  const src: (number | null)[] = j.values[PARAM]
  for (let i = 0; i < src.length && offset + i < haze.length; i++) if (src[i] !== null) haze[offset + i] = src[i] as number
  return { lat, lon, n: haze.length, haze, fetchedAt: j.fetchedAt }
}

async function fetchAir(lat: number, lon: number, signal?: AbortSignal): Promise<AirDaily> {
  const r = await fetch(airUrl(lat, lon), { signal })
  if (!r.ok) {
    let msg = `NASA POWER returned HTTP ${r.status}`
    try {
      const j = await r.json()
      if (j?.messages) msg += `: ${j.messages.join(' ')}`
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return parseAir(await r.json(), lat, lon)
}

interface StoredAir {
  lat: number
  lon: number
  n: number
  haze: ArrayBuffer
  fetchedAt: string
}

/** Demo file, then this browser's cache, then NASA POWER. */
export async function loadAir(lat: number, lon: number, signal?: AbortSignal): Promise<AirDaily> {
  const key = cacheKey(lat, lon)
  const demo = DEMO_CITIES.find((d) => cacheKey(d.lat, d.lon) === key)
  if (demo) {
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}demo/${demo.id}.air.json`, { signal })
      if (r.ok) return parseDemoAir(await r.json(), demo.lat, demo.lon)
    } catch {
      /* fall through to the network */
    }
  }
  const stored = await idbGet<StoredAir>(`${key}|air`)
  if (stored?.haze) return { ...stored, haze: new Float32Array(stored.haze) }
  const d = await fetchAir(lat, lon, signal)
  await idbPut(`${key}|air`, { lat: d.lat, lon: d.lon, n: d.n, haze: d.haze.buffer as ArrayBuffer, fetchedAt: d.fetchedAt } satisfies StoredAir)
  return d
}

// ---------- the measures ----------

export interface AirMeasure {
  /**
   * Worded like the app's other measures so the shared stamp, sparkline and chart can draw it.
   * `needs` and `compute` belong to the weather engine and are not used for haze.
   */
  def: MetricDef
  /** Yearly number: the average haze of the days, or how many days pass the test. */
  kind: 'mean' | 'count'
  test?: (haze: number) => boolean
  /** Decimals for the yearly value. */
  digits: number
  /** Leave the row out where it hardly ever happens (fewer than this many days in a typical year). */
  showFrom?: number
}

/** Haze measures do not go through the weather engine, so these two fields are placeholders. */
const NOT_WEATHER = { needs: [], compute: { kind: 'mean', value: () => NaN } } as Pick<MetricDef, 'needs' | 'compute'>

/** The haze level has no unit; the shared wording code prints the unit as it is. */
const NO_UNIT = '' as MetricDef['unit']

export const AIR_MEASURES: AirMeasure[] = [
  {
    kind: 'mean',
    digits: 2,
    def: {
      ...NOT_WEATHER,
      id: 'haze_level',
      name: 'Haze level',
      plain: `How much the air dims the sun, averaged over the year. Below ${HAZE.clearBelow} is crystal clear, ${HAZE.veryHazyFrom} is very hazy.`,
      unit: NO_UNIT,
      unitLong: 'on the haze scale, yearly average',
      definition: 'Annual mean of the daily aerosol optical depth at 550 nm (POWER parameter AOD_55, from CERES SYN1deg). It has no unit: it measures how much sunlight the particles in the whole column of air stop.',
    },
  },
  {
    kind: 'count',
    test: (h) => h >= HAZE.hazyFrom,
    digits: 0,
    showFrom: 1,
    def: {
      ...NOT_WEATHER,
      id: 'hazy_days',
      name: 'Hazy or dusty days',
      plain: `Days with a haze level of ${HAZE.hazyFrom} or more: the sky is clearly dimmed.`,
      unit: 'days',
      definition: `Days whose aerosol optical depth is ${HAZE.hazyFrom} or more. The ${HAZE.hazyFrom} line is our own, halfway between NASA’s “crystal clear” (below ${HAZE.clearBelow}) and “very hazy” (${HAZE.veryHazyFrom}).`,
    },
  },
  {
    kind: 'count',
    test: (h) => h >= HAZE.veryHazyFrom,
    digits: 0,
    showFrom: 1,
    def: {
      ...NOT_WEATHER,
      id: 'very_hazy_days',
      name: 'Very hazy days',
      plain: `Days with a haze level of ${HAZE.veryHazyFrom} or more: a dust storm, thick smoke or heavy smog.`,
      unit: 'days',
      definition: `Days whose aerosol optical depth is ${HAZE.veryHazyFrom} or more, the level NASA describes as “very hazy conditions”.`,
    },
  },
  {
    kind: 'count',
    test: (h) => h < HAZE.clearBelow,
    digits: 0,
    showFrom: 1,
    def: {
      ...NOT_WEATHER,
      id: 'clear_days',
      name: 'Crystal-clear days',
      plain: `Days with a haze level below ${HAZE.clearBelow}: the cleanest air there is.`,
      unit: 'days',
      definition: `Days whose aerosol optical depth is below ${HAZE.clearBelow}, the level NASA describes as “a crystal clear sky with maximum visibility”.`,
    },
  },
]

/** One number per year; a year with more than MAX_MISSING_FRACTION of its days missing is dropped. */
export function airAnnual(m: AirMeasure, d: AirDaily): AnnualSeries {
  const cal = calendar(d.n)
  const years: number[] = []
  const values: (number | null)[] = []
  const missing: number[] = []
  for (let y = YEARS.first; y <= YEARS.last; y++) {
    const i0 = cal.yearStart.get(y)!
    const len = cal.yearLength.get(y)!
    let sum = 0
    let hits = 0
    let k = 0
    for (let i = i0; i < i0 + len; i++) {
      const v = d.haze[i]
      if (Number.isNaN(v)) continue
      k++
      sum += v
      if (m.test?.(v)) hits++
    }
    const frac = (len - k) / len
    years.push(y)
    missing.push(frac)
    if (frac > MAX_MISSING_FRACTION || k === 0) values.push(null)
    else values.push(m.kind === 'mean' ? sum / k : hits)
  }
  return { years, values, missing }
}

/** One haze measure: yearly values for AIR_YEARS only, with the same trend test as the rest of the page. */
export function airResult(m: AirMeasure, d: AirDaily): MetricResult {
  const annual = airAnnual(m, d)
  const trend = annualTrend(annual.years, annual.values)
  const typical = periodStat(annual, AIR_YEARS)
  return {
    def: m.def,
    annual,
    trend,
    slopePerDecade: trend ? trend.slope * 10 : null,
    ciPerDecade: trend ? [trend.ci[0] * 10, trend.ci[1] * 10] : null,
    baselineMean: typical.mean,
    shown: m.showFrom === undefined || (typical.mean !== null && typical.mean >= m.showFrom),
    // the visitor's "then" is usually before 2001, so both hold the typical year of the haze record instead
    then: typical,
    now: typical,
    diff: null,
  }
}

export interface AirRow {
  measure: AirMeasure
  result: MetricResult
}

/** Every haze measure that happens here. */
export function airStory(d: AirDaily): AirRow[] {
  return AIR_MEASURES.map((measure) => ({ measure, result: airResult(measure, d) })).filter((r) => r.result.shown)
}

/** In plain words, where a typical year sits on NASA's scale. */
export function hazeWords(level: number): string {
  if (level < HAZE.clearBelow) return 'crystal clear'
  if (level < 0.25) return 'mostly clear'
  if (level < HAZE.hazyFrom) return 'often hazy'
  if (level < HAZE.veryHazyFrom) return 'hazy most of the time'
  return 'very hazy'
}
