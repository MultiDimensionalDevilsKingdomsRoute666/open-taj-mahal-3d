import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { AdaptiveDpr, AdaptiveEvents, Preload } from '@react-three/drei'
import { SceneContext } from './SceneContext'
import { TajMahalComplex } from './TajMahalComplex'
import { EnvironmentLighting } from './EnvironmentLighting'
import { ExplorationController } from './ExplorationController'
import { CinematicTour } from './CinematicTour'
import { InformationMarkers } from './InformationMarker'
import { Effects } from './Effects'
import { useMaterials } from '../lib/materials'
import { QUALITY, TIME_PRESETS } from '../lib/settings'
import { useExperience } from '../state/useExperience'
import { disposeTextures } from '../lib/textures'
import { disposeGeometryCache } from '../lib/geoCache'
import { INTRO_START } from '../lib/viewpoints'

/** Renderer settings that have to be applied to the WebGL context itself. */
function RendererSetup({ shadows, shadowType }: { shadows: boolean; shadowType: THREE.ShadowMapType }) {
  const { gl } = useThree()
  useEffect(() => {
    gl.shadowMap.enabled = shadows
    gl.shadowMap.type = shadowType
    gl.shadowMap.needsUpdate = true
  }, [gl, shadows, shadowType])
  return null
}

/**
 * Development-only handle used to drive the camera from the console while
 * checking framing against reference photographs. Stripped from production
 * builds by the `import.meta.env.DEV` guard.
 */
function DevHandle() {
  const three = useThree()
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __taj?: unknown }
    w.__taj = {
      three,
      look: (px: number, py: number, pz: number, tx: number, ty: number, tz: number) => {
        // Park the orbit controller first: leaving it enabled means its own
        // update() fights the manual placement on the next frame.
        const c = three.controls as
          | { enabled?: boolean; target?: THREE.Vector3; update?: () => void }
          | null
        if (c) c.enabled = false
        three.camera.position.set(px, py, pz)
        three.camera.lookAt(tx, ty, tz)
        three.camera.updateMatrixWorld()
      },
    }
  }, [three])
  return null
}

/** Signal that the first frame has been drawn. */
function FirstFrame({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(onReady))
    return () => cancelAnimationFrame(id)
  }, [onReady])
  return null
}

function SceneContents({ onReady }: { onReady: () => void }) {
  const quality = useExperience((s) => s.quality)
  const timeOfDay = useExperience((s) => s.timeOfDay)
  const q = QUALITY[quality]
  const preset = TIME_PRESETS[timeOfDay]
  const mats = useMaterials(quality, preset)

  const value = useMemo(() => ({ q, mats, preset }), [q, mats, preset])

  return (
    <SceneContext.Provider value={value}>
      <RendererSetup shadows={q.shadows} shadowType={q.shadowType} />
      <EnvironmentLighting />
      <TajMahalComplex />
      <InformationMarkers />
      <ExplorationController />
      <CinematicTour />
      <Effects />
      <Preload all />
      <AdaptiveDpr pixelated={false} />
      <AdaptiveEvents />
      <FirstFrame onReady={onReady} />
      <DevHandle />
    </SceneContext.Provider>
  )
}

/** Release every shared GPU resource when the experience unmounts. */
function DisposeOnUnmount() {
  useEffect(
    () => () => {
      disposeGeometryCache()
      disposeTextures()
    },
    [],
  )
  return null
}

export function Scene({ onReady }: { onReady: () => void }) {
  const quality = useExperience((s) => s.quality)
  const q = QUALITY[quality]

  return (
    <Canvas
      className="scene"
      dpr={q.dpr}
      shadows={false}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true,
        preserveDrawingBuffer: import.meta.env.DEV,
      }}
      camera={{
        // 48 degrees is roughly a 40 mm lens: wide enough to hold the garden
        // and the minarets, tight enough that the tomb does not shrink to a
        // speck from the far end of the pool.
        fov: 48,
        near: 0.3,
        far: 4600,
        position: INTRO_START.position,
      }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor('#0d1220')
        camera.lookAt(...INTRO_START.target)
      }}
    >
      <SceneContents onReady={onReady} />
      <DisposeOnUnmount />
    </Canvas>
  )
}
