import { useState } from 'react'
import type { CityAnalysis } from '../metrics'
import type { City } from '../state'
import { Air } from './Air'
import { Land } from './Land'
import { SecondOpinion } from './SecondOpinion'

type Tab = 'rain' | 'air' | 'land'

const TABS: { id: Tab; label: string; about: string }[] = [
  { id: 'rain', label: 'Rain: a satellite check', about: 'NASA’s rain satellites next to the weather model, 1998–2025.' },
  { id: 'air', label: 'Dust and haze', about: 'How much dust, smoke and pollution dim the sun, 2001–2025.' },
  { id: 'land', label: 'The ground', about: 'Ground heat, soil wetness and evaporation, 1981–2025.' },
]

/**
 * Three more NASA records about the same spot, in one place so the page stays short.
 * Only the one that is picked is shown, so only that one is downloaded.
 */
export function MoreEvidence({ city, a }: { city: City; a: CityAnalysis }) {
  const [tab, setTab] = useState<Tab>('rain')
  const current = TABS.find((t) => t.id === tab)!
  return (
    <section className="moreevidence">
      <p>
        Three more looks at {city.name}, each from a different NASA record, each with the same trend test. Pick one:
      </p>
      <div className="modes" role="tablist" aria-label="More evidence">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`chip ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="muted small">{current.about}</p>
      {tab === 'rain' && <SecondOpinion city={city} a={a} />}
      {tab === 'air' && <Air city={city} />}
      {tab === 'land' && <Land city={city} a={a} />}
    </section>
  )
}
