import { useEffect, useRef, useState } from 'react'
import { useExperience } from '../state/useExperience'
import { resetTouchMove, touchMove } from '../lib/touchInput'

const RADIUS = 52

/**
 * Virtual joystick for walk mode on touch devices.
 *
 * Only rendered when the device actually reports coarse pointers, so it never
 * clutters a desktop screen. It writes straight into the shared `touchMove`
 * ref rather than React state — sixty re-renders a second would otherwise
 * ripple through the whole scene graph.
 */
export function MobileControls() {
  const mode = useExperience((s) => s.mode)
  const tourActive = useExperience((s) => s.tourActive)
  const [touch, setTouch] = useState(false)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const [sprint, setSprint] = useState(false)
  const padRef = useRef<HTMLDivElement>(null)
  const active = useRef<number | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setTouch(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => () => resetTouchMove(), [])

  useEffect(() => {
    touchMove.current.sprint = sprint
  }, [sprint])

  if (!touch || mode !== 'walk' || tourActive) return null

  const from = (e: React.Touch, rect: DOMRect) => {
    let dx = e.clientX - (rect.left + rect.width / 2)
    let dy = e.clientY - (rect.top + rect.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS
      dy = (dy / len) * RADIUS
    }
    return { dx, dy }
  }

  return (
    <>
      <div
        ref={padRef}
        className="joystick"
        onTouchStart={(e) => {
          const t = e.changedTouches[0]
          active.current = t.identifier
          const rect = padRef.current!.getBoundingClientRect()
          const { dx, dy } = from(t, rect)
          setKnob({ x: dx, y: dy })
          touchMove.current.x = dx / RADIUS
          touchMove.current.y = -dy / RADIUS
        }}
        onTouchMove={(e) => {
          const rect = padRef.current!.getBoundingClientRect()
          for (const t of Array.from(e.changedTouches)) {
            if (t.identifier !== active.current) continue
            const { dx, dy } = from(t, rect)
            setKnob({ x: dx, y: dy })
            touchMove.current.x = dx / RADIUS
            touchMove.current.y = -dy / RADIUS
          }
        }}
        onTouchEnd={() => {
          active.current = null
          setKnob({ x: 0, y: 0 })
          touchMove.current.x = 0
          touchMove.current.y = 0
        }}
        aria-hidden="true"
      >
        <div className="joystick__ring" />
        <div className="joystick__knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>

      <button
        className={`touchbtn touchbtn--sprint ${sprint ? 'touchbtn--on' : ''}`}
        onTouchStart={() => setSprint(true)}
        onTouchEnd={() => setSprint(false)}
        aria-label="Sprint"
      >
        Run
      </button>
      <button
        className="touchbtn touchbtn--jump"
        onTouchStart={() => {
          touchMove.current.jump = true
          window.setTimeout(() => (touchMove.current.jump = false), 140)
        }}
        aria-label="Jump"
      >
        Jump
      </button>
    </>
  )
}
