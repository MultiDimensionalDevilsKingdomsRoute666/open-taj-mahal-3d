import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useExperience } from '../state/useExperience'
import { HERO, TOUR, buildTourCurves } from '../lib/viewpoints'
import { groundHeight } from '../lib/collision'

/** Smootherstep: zero first *and* second derivative at both ends. */
function ease(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/**
 * The cinematic tour.
 *
 * The camera runs along a centripetal Catmull-Rom curve through the eleven
 * composed stops while the look-at point follows its own curve. Time is
 * remapped per segment — travel eased, hold frozen — so the camera glides,
 * settles on each composition, then moves off again. There are no cuts.
 *
 * Any input, or the Exit button, hands control straight back.
 */
export function CinematicTour() {
  const { camera } = useThree()
  const tourActive = useExperience((s) => s.tourActive)
  const stopTour = useExperience((s) => s.stopTour)
  const setTourStop = useExperience((s) => s.setTourStop)

  const start = useRef<{ position: [number, number, number]; target: [number, number, number] }>({
    position: HERO.position,
    target: HERO.target,
  })
  const curves = useRef(buildTourCurves(HERO))
  const elapsed = useRef(0)
  const lastIndex = useRef(-1)

  /** Cumulative timeline: [travelEnd, holdEnd] per stop. */
  const timeline = useMemo(() => {
    let t = 0
    return TOUR.map((s) => {
      const travelStart = t
      t += s.travel
      const travelEnd = t
      t += s.hold
      return { travelStart, travelEnd, holdEnd: t }
    })
  }, [])

  const total = timeline[timeline.length - 1].holdEnd

  useEffect(() => {
    if (!tourActive) return
    // Begin from wherever the user happens to be, so the tour eases in rather
    // than teleporting.
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    const focus = camera.position.clone().addScaledVector(dir, 90)
    start.current = {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [focus.x, focus.y, focus.z],
    }
    curves.current = buildTourCurves(start.current)
    elapsed.current = 0
    lastIndex.current = -1
    setTourStop(0)
  }, [tourActive, camera, setTourStop])

  /* Any deliberate input exits the tour. */
  useEffect(() => {
    if (!tourActive) return
    // Ignore the tail of the click that started the tour.
    const armed = { at: performance.now() + 350 }
    const bail = (e: Event) => {
      if (performance.now() < armed.at) return
      if (e instanceof KeyboardEvent && (e.key === 'Shift' || e.key === 'Alt')) return
      stopTour()
    }
    window.addEventListener('keydown', bail)
    window.addEventListener('wheel', bail, { passive: true })
    window.addEventListener('pointerdown', bail)
    return () => {
      window.removeEventListener('keydown', bail)
      window.removeEventListener('wheel', bail)
      window.removeEventListener('pointerdown', bail)
    }
  }, [tourActive, stopTour])

  const pos = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, rawDt) => {
    if (!tourActive) return
    elapsed.current += Math.min(rawDt, 0.05)
    const t = elapsed.current

    if (t >= total) {
      stopTour()
      return
    }

    // Find the active stop and convert wall-clock time into curve parameter.
    let index = timeline.findIndex((s) => t < s.holdEnd)
    if (index < 0) index = timeline.length - 1
    const seg = timeline[index]
    const local =
      t < seg.travelEnd
        ? ease(THREE.MathUtils.clamp((t - seg.travelStart) / (seg.travelEnd - seg.travelStart), 0, 1))
        : 1
    // Curve parameter: index 0 is the start point, so stop i sits at (i+1)/n.
    const n = TOUR.length
    const u = THREE.MathUtils.clamp((index + local) / n, 0, 1)

    curves.current.position.getPoint(u, pos)
    curves.current.target.getPoint(u, look)

    // A Catmull-Rom through widely spaced stops can dip below the line between
    // them. Clamping to the walkable surface guarantees the tour never sinks
    // into the garden however the stops are later re-composed.
    const floor = groundHeight(pos.x, pos.z) + 1.9
    if (pos.y < floor) pos.y = floor

    camera.position.copy(pos)
    camera.lookAt(look)
    camera.updateMatrixWorld()

    // Only push to the store when the caption actually needs to change.
    if (index !== lastIndex.current) {
      lastIndex.current = index
      setTourStop(index)
    }
  })

  return null
}
