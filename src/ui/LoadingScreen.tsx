import { useState } from 'react'
import { useExperience } from '../state/useExperience'

/**
 * The opening sequence.
 *
 * Real progress: the bar is driven by the procedural texture pipeline in
 * `App`, not a fake timer. Once everything is built and the first frame has
 * been drawn, the title card appears and Start Exploring hands over to the
 * gentle dolly towards the monument.
 */
export function LoadingScreen() {
  const phase = useExperience((s) => s.phase)
  const progress = useExperience((s) => s.progress)
  const begin = useExperience((s) => s.begin)
  const [leaving, setLeaving] = useState(false)

  if (phase === 'running' && !leaving) return null

  const pct = Math.round(progress * 100)
  const ready = phase === 'title'

  const start = () => {
    setLeaving(true)
    begin()
    window.setTimeout(() => setLeaving(false), 1400)
  }

  return (
    <div className={`loading ${leaving ? 'loading--out' : ''}`} role="status" aria-live="polite">
      <div className="loading__inner">
        <div className="loading__ornament" aria-hidden="true">
          <svg viewBox="0 0 120 60" width="120" height="60">
            <path
              d="M60 4 C 47 20, 44 34, 60 56 C 76 34, 73 20, 60 4 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.9"
            />
            <path d="M6 52 H 46" stroke="currentColor" strokeWidth="0.7" />
            <path d="M74 52 H 114" stroke="currentColor" strokeWidth="0.7" />
            <circle cx="60" cy="2" r="1.6" fill="currentColor" />
          </svg>
        </div>

        <h1 className="loading__title">Taj Mahal</h1>
        <p className="loading__subtitle">An Interactive Journey</p>

        <div className="loading__bar" aria-hidden={ready}>
          <div className="loading__fill" style={{ width: `${pct}%` }} />
        </div>

        {ready ? (
          <button className="btn btn--primary loading__start" onClick={start} autoFocus>
            Start Exploring
          </button>
        ) : (
          <p className="loading__status">
            {progress < 0.35
              ? 'Quarrying Makrana marble…'
              : progress < 0.6
                ? 'Cutting red sandstone…'
                : progress < 0.85
                  ? 'Laying out the Charbagh…'
                  : 'Filling the water channels…'}{' '}
            {pct}%
          </p>
        )}

        <p className="loading__credit">
          Agra, India &middot; commissioned 1631 &middot; completed c. 1653
        </p>
      </div>
    </div>
  )
}
