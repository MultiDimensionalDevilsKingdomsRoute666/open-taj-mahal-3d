import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import { useScene } from './SceneContext'
import { waterNormalTexture } from '../lib/textures'

export interface WaterProps {
  width: number
  length: number
  position: [number, number, number]
  /** Use a real planar reflection rather than just the environment map. */
  reflective?: boolean
  /** Larger, calmer ripples for the river. */
  calm?: boolean
}

/**
 * A body of still water.
 *
 * The long central channel is the whole point of the composition — the
 * monument doubled in the water is the image everyone recognises — so on
 * Balanced and Ultra it gets a genuine planar reflection. On Performance, and
 * for the secondary channels, the same surface falls back to a low-roughness
 * metallic material lit by the environment map, which still returns the sky
 * and the sun without a second render pass.
 */
export function ReflectingPool({
  width,
  length,
  position,
  reflective = false,
  calm = false,
}: WaterProps) {
  const { q, mats: _mats, preset } = useScene()
  void _mats
  const useReflector = reflective && q.reflectorRes > 0

  const normal = useMemo(() => {
    const t = waterNormalTexture().clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(calm ? length / 90 : length / 26, calm ? width / 90 : width / 26)
    t.needsUpdate = true
    return t
  }, [width, length, calm])

  useEffect(() => () => normal.dispose(), [normal])

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, length)
    g.rotateX(-Math.PI / 2)
    return g
  }, [width, length])
  useEffect(() => () => geo.dispose(), [geo])

  const drift = useRef(0)
  useFrame((_, dt) => {
    drift.current += dt
    normal.offset.set(
      Math.sin(drift.current * (calm ? 0.014 : 0.03)) * 0.5,
      drift.current * (calm ? 0.0035 : 0.011),
    )
  })

  const water = calm ? preset.river : preset.water

  if (useReflector) {
    return (
      <mesh geometry={geo} position={position} receiveShadow>
        {/* Low blur and a high mirror factor: the whole point of this pool is
            that the monument is legible in it. Heavy blur turns the
            reflection into a bright smear, which is what most real-time water
            gets wrong. */}
        <MeshReflectorMaterial
          resolution={q.reflectorRes}
          mixBlur={0.45}
          mixStrength={2.4}
          blur={[110, 30]}
          mirror={0.94}
          depthScale={0.4}
          minDepthThreshold={0.2}
          maxDepthThreshold={1.0}
          distortion={0.3}
          distortionMap={normal}
          color={preset.water.color}
          roughness={0.16}
          metalness={0.1}
        />
      </mesh>
    )
  }

  return (
    <mesh geometry={geo} position={position} receiveShadow>
      <meshStandardMaterial
        color={water.color}
        roughness={'roughness' in water ? water.roughness : 0.1}
        metalness={calm ? 0.5 : preset.water.metalness}
        normalMap={normal}
        normalScale={calm ? new THREE.Vector2(0.14, 0.14) : new THREE.Vector2(0.3, 0.3)}
        envMapIntensity={1.6}
        transparent
        opacity={calm ? 0.95 : preset.water.opacity}
      />
    </mesh>
  )
}
