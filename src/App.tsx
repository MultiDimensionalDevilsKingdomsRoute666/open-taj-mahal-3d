import { useCallback, useEffect, useRef, useState } from 'react'
import { Scene } from './components/Scene'
import { AudioController } from './components/AudioController'
import { ExperienceUI } from './ui/ExperienceUI'
import { LoadingScreen } from './ui/LoadingScreen'
import { useExperience } from './state/useExperience'
import {
  calligraphyBandTexture,
  foliageTexture,
  grassTexture,
  jaliTexture,
  marblePavingTexture,
  marbleTextures,
  pathwayTexture,
  pietraDuraTexture,
  sandstoneTextures,
  waterNormalTexture,
} from './lib/textures'
import { QUALITY } from './lib/settings'

/**
 * Warm-up steps. Every texture in the project is generated procedurally on a
 * 2D canvas, which is genuinely the slow part of startup, so the loading bar
 * tracks these rather than counting imaginary downloads. Yielding to the event
 * loop between steps lets the bar actually paint.
 */
function warmupSteps(marbleSize: number): { weight: number; run: () => void }[] {
  return [
    { weight: 34, run: () => void marbleTextures(marbleSize) },
    { weight: 22, run: () => void sandstoneTextures(512) },
    { weight: 8, run: () => void pietraDuraTexture(512) },
    { weight: 6, run: () => void calligraphyBandTexture(2048, 256) },
    { weight: 5, run: () => void jaliTexture(512, 7) },
    { weight: 5, run: () => void marblePavingTexture(512) },
    { weight: 4, run: () => void pathwayTexture(512) },
    { weight: 7, run: () => void grassTexture(512) },
    { weight: 6, run: () => void waterNormalTexture(512) },
    { weight: 3, run: () => void foliageTexture(256, '#3f5f34') },
  ]
}

function WebGLUnsupported() {
  return (
    <div className="fatal">
      <h1>Taj Mahal</h1>
      <p>
        This experience needs WebGL, which this browser does not appear to support. Try a recent
        version of Chrome, Edge, Firefox or Safari with hardware acceleration enabled.
      </p>
    </div>
  )
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') ?? c.getContext('webgl')
    // Release the probe context immediately: browsers cap the number of live
    // WebGL contexts, and leaking one here can starve the real renderer.
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return Boolean(gl)
  } catch {
    return false
  }
}

export default function App() {
  const setProgress = useExperience((s) => s.setProgress)
  const setPhase = useExperience((s) => s.setPhase)
  const phase = useExperience((s) => s.phase)
  const quality = useExperience((s) => s.quality)
  const [supported] = useState(hasWebGL)
  const [built, setBuilt] = useState(false)
  const firstFrame = useRef(false)

  /* ---- build the textures, reporting real progress as we go ---- */
  useEffect(() => {
    if (!supported) return
    let cancelled = false
    const steps = warmupSteps(QUALITY[quality].label === 'Ultra' ? 768 : 512)
    const total = steps.reduce((a, s) => a + s.weight, 0)
    let done = 0

    const timers: number[] = []
    const tick = (i: number) => {
      if (cancelled) return
      if (i >= steps.length) {
        setProgress(0.9)
        setBuilt(true)
        return
      }
      steps[i].run()
      done += steps[i].weight
      setProgress((done / total) * 0.88)
      // Yield so the bar repaints between steps. Deliberately a timer rather
      // than requestAnimationFrame: rAF is suspended in a background tab, and
      // a page opened in one should still finish loading rather than sitting
      // on an empty progress bar until it is focused.
      timers.push(window.setTimeout(() => tick(i + 1), 16))
    }
    timers.push(window.setTimeout(() => tick(0), 32))

    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
    }
    // Quality is read once at mount; changing it later rebuilds materials
    // inside the scene rather than replaying the loading screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported])

  const onSceneReady = useCallback(() => {
    if (firstFrame.current) return
    firstFrame.current = true
    setProgress(1)
    if (useExperience.getState().phase === 'loading') setPhase('title')
  }, [setProgress, setPhase])

  /* Safety net: never strand the user on the loading screen. */
  useEffect(() => {
    if (!supported) return
    const id = window.setTimeout(() => {
      if (useExperience.getState().phase === 'loading') {
        setProgress(1)
        setPhase('title')
      }
    }, 20000)
    return () => window.clearTimeout(id)
  }, [supported, setPhase, setProgress])

  /* Dev-only: drive the store from the console while checking framing. */
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as { __store?: unknown }).__store = useExperience
  }, [])

  if (!supported) return <WebGLUnsupported />

  return (
    <div className={`app app--${phase}`}>
      {built && <Scene onReady={onSceneReady} />}
      <AudioController />
      <ExperienceUI />
      <LoadingScreen />
    </div>
  )
}
