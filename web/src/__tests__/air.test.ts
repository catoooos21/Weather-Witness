import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { YEARS } from '../config/metrics'
import { AIR_MEASURES, AIR_YEARS, HAZE, airResult, airStory, airUrl, hazeWords, parseAir, parseDemoAir, type AirDaily } from '../air'
import { airChange } from '../components/Air'
import { calendar } from '../metrics'
import { daysBetween } from '../power'

const demoJson = (id: string) => JSON.parse(readFileSync(resolve(__dirname, `../../public/demo/${id}.air.json`), 'utf-8'))
const demo = (id: string): AirDaily => parseDemoAir(demoJson(id), 0, 0)
const measure = (id: string) => AIR_MEASURES.find((m) => m.def.id === id)!
const at = (r: { annual: { values: (number | null)[] } }, year: number) => r.annual.values[year - YEARS.first]

describe('haze: reading the data', () => {
  it('asks NASA POWER for the haze measure from 2001', () => {
    const u = new URL(airUrl(29.3759, 47.9774))
    expect(u.searchParams.get('parameters')).toBe('AOD_55')
    expect(u.searchParams.get('start')).toBe('20010101')
    expect(u.searchParams.get('end')).toBe(`${YEARS.last}1231`)
    // local days, like the weather: no time-standard override
    expect(u.searchParams.has('time-standard')).toBe(false)
  })

  it('places POWER values on the app day index and turns fill values into gaps', () => {
    const json = { header: { fill_value: -999 }, properties: { parameter: { AOD_55: { '20010101': 0.46, '20010102': -999, '20010103': 1.2 } } } }
    const r = parseAir(json, 29.4, 48)
    const i0 = daysBetween(YEARS.first, 2000) // index of 2001-01-01
    expect(r.n).toBe(daysBetween(YEARS.first, YEARS.last))
    expect(r.haze[i0]).toBeCloseTo(0.46, 2)
    expect(Number.isNaN(r.haze[i0 + 1])).toBe(true)
    expect(r.haze[i0 + 2]).toBeCloseTo(1.2, 2)
    expect(Number.isNaN(r.haze[i0 - 1])).toBe(true)
  })

  it('refuses an answer with no haze data at all', () => {
    expect(() => parseAir({ header: { fill_value: -999 }, properties: { parameter: { AOD_55: { '20010101': -999 } } } }, 0, 0)).toThrow(/no haze data/)
    expect(() => parseAir({ properties: { parameter: {} } }, 0, 0)).toThrow(/AOD_55/)
  })

  it('reads the bundled demo copy onto the same index', () => {
    const j = demoJson('kuwait-city')
    const r = parseDemoAir(j, 29.3759, 47.9774)
    const i0 = daysBetween(YEARS.first, 2000)
    expect(j.first).toBe(2001)
    expect(j.values.AOD_55).toHaveLength(daysBetween(2001, YEARS.last))
    expect(r.haze[i0]).toBeCloseTo(j.values.AOD_55[0], 2)
    expect(r.haze[r.n - 1]).toBeCloseTo(j.values.AOD_55.at(-1), 2)
    expect(Number.isNaN(r.haze[i0 - 1])).toBe(true)
  })
})

describe('haze: the measures', () => {
  const kuwait = demo('kuwait-city')

  it('gives yearly values for the haze years only', () => {
    const r = airResult(measure('hazy_days'), kuwait)
    expect(at(r, 2000)).toBeNull()
    expect(at(r, 1981)).toBeNull()
    expect(r.annual.values.filter((v) => v !== null)).toHaveLength(AIR_YEARS.last - AIR_YEARS.first + 1)
    expect(r.trend!.n).toBe(25)
  })

  it('counts days and averages the level straight from the daily values', () => {
    const cal = calendar(kuwait.n)
    for (const year of [2001, 2012, 2022]) {
      const i0 = cal.yearStart.get(year)!
      const len = cal.yearLength.get(year)!
      const days = Array.from(kuwait.haze.subarray(i0, i0 + len))
      expect(at(airResult(measure('hazy_days'), kuwait), year)).toBe(days.filter((v) => v >= HAZE.hazyFrom).length)
      expect(at(airResult(measure('very_hazy_days'), kuwait), year)).toBe(days.filter((v) => v >= HAZE.veryHazyFrom).length)
      expect(at(airResult(measure('clear_days'), kuwait), year)).toBe(days.filter((v) => v < HAZE.clearBelow).length)
      expect(at(airResult(measure('haze_level'), kuwait), year)!).toBeCloseTo(days.reduce((a, b) => a + b, 0) / days.length, 3)
    }
    // the numbers seen when the service was first checked: 137 hazy days in 2001, 213 in 2022
    expect(at(airResult(measure('hazy_days'), kuwait), 2001)).toBe(137)
    expect(at(airResult(measure('hazy_days'), kuwait), 2022)).toBe(213)
  })

  it('drops a year with too many missing days', () => {
    const cal = calendar(kuwait.n)
    const holed: AirDaily = { ...kuwait, haze: new Float32Array(kuwait.haze) }
    const i0 = cal.yearStart.get(2010)!
    holed.haze.fill(NaN, i0, i0 + 60)
    expect(at(airResult(measure('hazy_days'), holed), 2010)).toBeNull()
    expect(at(airResult(measure('hazy_days'), holed), 2011)).not.toBeNull()
  })

  it('leaves out what hardly ever happens: no crystal-clear row in Delhi, no very hazy row in Sydney', () => {
    const ids = (id: string) => airStory(demo(id)).map((r) => r.result.def.id)
    expect(ids('delhi')).toContain('very_hazy_days')
    expect(ids('delhi')).not.toContain('clear_days')
    expect(ids('sydney')).toContain('clear_days')
    expect(ids('sydney')).not.toContain('very_hazy_days')
    // the level is always shown, and every city has it first
    for (const id of ['kuwait-city', 'london', 'sydney', 'delhi']) expect(ids(id)[0]).toBe('haze_level')
  })

  it('puts the desert and the megacity above the cleaner cities', () => {
    const level = (id: string) => airResult(measure('haze_level'), demo(id)).then.mean!
    expect(level('kuwait-city')).toBeGreaterThan(level('london'))
    expect(level('delhi')).toBeGreaterThan(level('kuwait-city'))
    expect(level('london')).toBeGreaterThan(level('sydney'))
  })

  it('describes a level in words on NASA’s scale', () => {
    expect(hazeWords(0.05)).toBe('crystal clear')
    expect(hazeWords(0.13)).toBe('mostly clear')
    expect(hazeWords(0.3)).toBe('often hazy')
    expect(hazeWords(0.52)).toBe('hazy most of the time')
    expect(hazeWords(1.1)).toBe('very hazy')
  })

  it('words a change without a unit for the level and in days for the counts', () => {
    const level = airResult(measure('haze_level'), kuwait)
    const days = airResult(measure('hazy_days'), kuwait)
    for (const r of [level, days]) {
      const words = airChange(r)
      if (!r.trend!.significant) expect(words).toBe('No steady direction')
      else expect(words).toMatch(/^(Up|Down) about [\d.]+ (days? )?every ten years$/)
    }
    expect(airChange({ ...level, trend: { ...level.trend!, significant: true, direction: 'up' }, slopePerDecade: 0.031 })).toBe('Up about 0.03 every ten years')
    expect(airChange({ ...days, trend: { ...days.trend!, significant: true, direction: 'down' }, slopePerDecade: -12.4 })).toBe('Down about 12 days every ten years')
    expect(airChange({ ...days, trend: { ...days.trend!, significant: true, direction: 'up' }, slopePerDecade: 1 })).toBe('Up about 1.0 days every ten years')
  })
})
