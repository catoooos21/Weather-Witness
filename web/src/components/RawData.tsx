import { useMemo } from 'react'
import { PARAMS, YEARS, type Param } from '../config/metrics'
import { daysBetween, type DailySeries } from '../power'
import './rawdata.css'

const DIGITS: Record<Param, number> = { T2M_MAX: 2, T2M_MIN: 2, T2M: 2, T2MDEW: 2, PRECTOTCORR: 2, RH2M: 2 }

/** The hottest day of the last full year for this spot, as NASA POWER sends it. */
export function hottestRecentDay(d: DailySeries): { index: number; date: Date } | null {
  const from = daysBetween(YEARS.first, YEARS.last - 1)
  const tmax = d.values.T2M_MAX
  let best = -1
  for (let i = from; i < d.n; i++) {
    if (Number.isNaN(tmax[i])) continue
    if (best < 0 || tmax[i] > tmax[best]) best = i
  }
  if (best < 0) return null
  return { index: best, date: new Date(Date.UTC(YEARS.first, 0, 1) + best * 86400000) }
}

/**
 * The first thing under the title: one real day of the raw data, exactly as NASA's API names it,
 * so visitors see what the rest of the page translates into everyday words.
 */
export function RawData({ d }: { d: DailySeries }) {
  const day = useMemo(() => hottestRecentDay(d), [d])
  if (!day) return null
  const ymd = day.date.toISOString().slice(0, 10).replace(/-/g, '')
  const pairs: [string, string][] = [
    ['DATE', ymd],
    ...PARAMS.map((p): [string, string] => [p, Number.isNaN(d.values[p][day.index]) ? '-999' : d.values[p][day.index].toFixed(DIGITS[p])]),
  ]
  const human = day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  return (
    <section className="rawdata" aria-label="What NASA sends us">
      <p className="rawlabel">What NASA sends us</p>
      <code className="rawcode">
        {pairs.map(([k, v], i) => (
          <span key={k} className="rawpair">
            <span className="rawkey">"{k}"</span>: <span className="rawval">{v}</span>
            {i < pairs.length - 1 ? ', ' : ''}
          </span>
        ))}
      </code>
      <p className="rawnote">
        One real day for this spot: {human}, the hottest of {YEARS.last}. NASA has {d.n.toLocaleString('en-US')} days like this. Below, we turn them into two lives.
      </p>
    </section>
  )
}
