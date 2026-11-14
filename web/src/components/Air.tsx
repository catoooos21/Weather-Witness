import { useEffect, useMemo, useState } from 'react'
import { AIR_YEARS, HAZE, HAZE_SCALE_SOURCE, airStory, hazeWords, loadAir, type AirDaily, type AirRow } from '../air'
import { callOf } from '../casefile'
import { fmtNum, fmtP, fmtSigned } from '../format'
import type { MetricResult } from '../metrics'
import type { City } from '../state'
import { Verdict } from './Scrapbook'
import { Sparkline, YearChart } from './YearChart'
import './air.css'

const SPAN = AIR_YEARS.last - AIR_YEARS.first + 1

const isLevel = (r: MetricResult) => r.def.id === 'haze_level'

/** Decimals for a change per ten years: the haze level moves in hundredths, day counts in days. */
function rateDigits(r: MetricResult, n: number): number {
  if (isLevel(r)) return 2
  return Math.abs(n) < 2 ? 1 : 0
}

/** Unit of a change, with its trailing space; nothing for the haze level. "1 day", but "1.0 days". */
function rateUnit(r: MetricResult, shown?: string): string {
  if (isLevel(r)) return ''
  return shown === '1' ? 'day ' : 'days '
}

/** "Up about 12 days every ten years", "Up about 0.03 every ten years", or "No steady direction". */
export function airChange(r: MetricResult): string {
  const call = callOf(r)
  if (call === 'none' || call === null) return 'No steady direction'
  const n = Math.abs(r.slopePerDecade!)
  const shown = n.toFixed(rateDigits(r, n))
  return `${call === 'up' ? 'Up' : 'Down'} about ${shown} ${rateUnit(r, shown)}every ten years`
}

function TrendLine({ r }: { r: MetricResult }) {
  const t = r.trend
  if (!t) return <p className="muted">Fewer than ten complete years, so no trend test was run.</p>
  const s = r.slopePerDecade!
  const [lo, hi] = r.ciPerDecade!
  const dp = isLevel(r) ? 2 : 1
  const unit = rateUnit(r)
  return (
    <p className="trendsentence">
      {t.significant ? (
        <>
          <strong>Real change.</strong> Going {s > 0 ? 'up' : 'down'} by about {Math.abs(s).toFixed(rateDigits(r, Math.abs(s)))} {unit}every ten years (somewhere between {fmtSigned(lo, dp)} and{' '}
          {fmtSigned(hi, dp)}).
        </>
      ) : (
        <>
          <strong>No clear change.</strong> The best guess is {fmtSigned(s, dp)} {unit}every ten years, but it could be anywhere between {fmtSigned(lo, dp)} and {fmtSigned(hi, dp)}, so no steady
          direction.
        </>
      )}{' '}
      <small className="muted">
        Trend test: {fmtP(t.p)}, {t.n} years. The dots are each year; the line is the long-term trend.
      </small>
      {t.significant && lo <= 0 && hi >= 0 && <span className="raincaution">The range reaches zero, so this is a borderline case: the test for a steady direction passed, but the size of the change is not pinned down.</span>}
    </p>
  )
}

function typicalWords(row: AirRow): string {
  const mean = row.result.then.mean
  if (mean === null) return ''
  if (isLevel(row.result)) return `Typical year: ${fmtNum(mean, row.measure.digits)}, ${hazeWords(mean)}`
  const shown = fmtNum(mean, row.measure.digits)
  return `Typical year: ${shown} ${shown === '1' ? 'day' : 'days'}`
}

/**
 * Dust and haze over the city: how much the air dims the sun, from NASA's CERES satellite record.
 * Same point as the weather, the same trend test, 25 years instead of 45.
 */
export function Air({ city }: { city: City }) {
  const [air, setAir] = useState<AirDaily | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [open, setOpen] = useState<string | null>(null)
  const key = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`

  useEffect(() => {
    setAir(null)
    setError(null)
    const ac = new AbortController()
    loadAir(city.lat, city.lon, ac.signal)
      .then((d) => {
        if (!ac.signal.aborted) setAir(d)
      })
      .catch((e) => {
        if (!ac.signal.aborted) setError(e.message ?? String(e))
      })
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt])

  const rows = useMemo<AirRow[]>(() => (air ? airStory(air) : []), [air])
  const real = rows.filter((r) => r.result.trend?.significant).length
  const level = rows.find((r) => isLevel(r.result))?.result
  const hazy = rows.find((r) => r.result.def.id === 'hazy_days')?.result

  return (
    <section className="casefile air">
      <h3>The air over {city.name}: dust and haze</h3>
      <p>
        Heat and rain are not the whole sky. This is how much the air itself <strong>dims the sun</strong>: dust, smoke and pollution together, seen from space by NASA’s satellites.
      </p>
      <p className="muted small">
        Same spot and the same trend test as the rest of the page, over {SPAN} years ({AIR_YEARS.first}–{AIR_YEARS.last}): that is as far back as this satellite record goes.
      </p>

      {error && (
        <div className="error">
          <p>
            Could not get the haze data for {city.name}: {error}
          </p>
          <button type="button" className="btn small" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}
      {!air && !error && (
        <div className="loading">
          <div className="spinner" />
          <p>Asking NASA for {SPAN} years of haze…</p>
        </div>
      )}

      {air && rows.length > 0 && (
        <>
          <p className="airsum">
            {level && level.then.mean !== null && (
              <>
                In a typical year the air over {city.name} is <strong>{hazeWords(level.then.mean)}</strong> (haze level {fmtNum(level.then.mean, 2)}
                {hazy && hazy.then.mean !== null && (
                  <>
                    , with about <strong>{fmtNum(hazy.then.mean, 0)}</strong> hazy or dusty days
                  </>
                )}
                ).{' '}
              </>
            )}
            <strong>{real}</strong> of {rows.length} haze measures {real === 1 ? 'shows' : 'show'} a real change since {AIR_YEARS.first}.
          </p>
          <p className="hazescale">
            <span className="hs clear">below {HAZE.clearBelow}: crystal clear</span>
            <span className="hs hazy">{HAZE.hazyFrom} or more: hazy</span>
            <span className="hs very">{HAZE.veryHazyFrom} or more: very hazy</span>
          </p>
          <div className="casegroup">
            <ol className="caselist">
              {rows.map((row) => {
                const r = row.result
                const isOpen = open === r.def.id
                return (
                  <li className={isOpen ? 'open' : ''} key={r.def.id}>
                    <button type="button" className="caserow" onClick={() => setOpen(isOpen ? null : r.def.id)} aria-expanded={isOpen}>
                      <span className="what">
                        <strong>{r.def.name}</strong>
                        {r.def.plain && <small>{r.def.plain}</small>}
                      </span>
                      <Sparkline r={r} first={AIR_YEARS.first} />
                      <span className="howmuch">
                        {airChange(r)}
                        <small>{typicalWords(row)}</small>
                      </span>
                      <Verdict r={r} />
                    </button>
                    {isOpen && (
                      <div className="caseopen">
                        <YearChart r={r} then={AIR_YEARS} now={AIR_YEARS} first={AIR_YEARS.first} bands={false} />
                        <TrendLine r={r} />
                        <p className="muted small">{r.def.definition}</p>
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
          <p className="fadenote">
            This is not a dust meter. It counts everything in the air that blocks sunlight: desert dust, smoke from fires, and pollution from traffic and industry. In a desert city most of it is
            dust; in a big industrial city most of it is pollution. NASA’s service has no measure of dust alone. It is also the whole column of air above the city, not the air at street level.
          </p>
          <p className="hint">Tap any row to see every year since {AIR_YEARS.first}.</p>
          <p className="muted small">
            Source: aerosol optical depth at 550 nm from NASA CERES (SYN1deg), through <a href="https://power.larc.nasa.gov/docs/">NASA POWER</a>. The scale is from{' '}
            <a href={HAZE_SCALE_SOURCE.url}>{HAZE_SCALE_SOURCE.label}</a>; the {HAZE.hazyFrom} line for a hazy day is ours. With {SPAN} years instead of 45, a slow change is harder to see.
          </p>
        </>
      )}
    </section>
  )
}
