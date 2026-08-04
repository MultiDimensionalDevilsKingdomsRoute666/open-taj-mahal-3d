import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { useExperience } from '../state/useExperience'
import { FACTS, type Fact } from '../lib/facts'

/**
 * A single hotspot: a small dot in world space that expands into a card when
 * selected. Markers are hidden by default and never appear during the tour,
 * so the monument is the only thing on screen unless you ask for more.
 */
export function InformationMarker({ fact }: { fact: Fact }) {
  const activeMarker = useExperience((s) => s.activeMarker)
  const setActiveMarker = useExperience((s) => s.setActiveMarker)
  const open = activeMarker === fact.id

  const position = useMemo<[number, number, number]>(
    () => [fact.at.x, fact.at.y, fact.at.z],
    [fact.at],
  )

  return (
    <Html position={position} center distanceFactor={90} zIndexRange={[40, 0]} style={{ pointerEvents: 'auto' }}>
      <div className={`marker ${open ? 'marker--open' : ''}`}>
        <button
          className="marker__dot"
          aria-label={fact.title}
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation()
            setActiveMarker(open ? null : fact.id)
          }}
        >
          <span className="marker__pulse" aria-hidden="true" />
          <span className="marker__i" aria-hidden="true">
            i
          </span>
        </button>
        {open && (
          <div className="marker__card" role="dialog" aria-label={fact.title}>
            <h3>{fact.title}</h3>
            <p>{fact.body}</p>
          </div>
        )}
      </div>
    </Html>
  )
}

/** All markers, shown only when information mode is on. */
export function InformationMarkers() {
  const infoVisible = useExperience((s) => s.infoVisible)
  const tourActive = useExperience((s) => s.tourActive)
  if (!infoVisible || tourActive) return null
  return (
    <group>
      {FACTS.map((f) => (
        <InformationMarker key={f.id} fact={f} />
      ))}
    </group>
  )
}
