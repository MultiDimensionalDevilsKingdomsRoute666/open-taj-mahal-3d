import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useScene } from './SceneContext'
import { cachedGeometry } from '../lib/geoCache'

/**
 * The row of fountains that runs the length of the central water channel.
 *
 * Everything is instanced: one draw call for the marble nozzles, one for the
 * jets and one for the spreading ripple ring. The jets breathe on a slow sine
 * with a per-fountain phase offset, which is enough to read as water pressure
 * varying down the line without any simulation.
 */
export function Fountains({
  positions,
  y,
}: {
  positions: [number, number][]
  /** Water surface height. */
  y: number
}) {
  const { q, mats, preset } = useScene()
  const jets = useRef<THREE.InstancedMesh>(null)

  const g = useMemo(
    () => ({
      nozzle: cachedGeometry('fnt.nozzle', () => {
        const profile = [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.42, 0),
          new THREE.Vector2(0.4, 0.16),
          new THREE.Vector2(0.2, 0.26),
          new THREE.Vector2(0.13, 0.5),
          new THREE.Vector2(0.08, 0.62),
        ]
        const geo = new THREE.LatheGeometry(profile, 10)
        geo.computeVertexNormals()
        return geo
      }),
      jet: cachedGeometry('fnt.jet', () => {
        // A narrow spindle: wide at the nozzle, feathering out at the top.
        const geo = new THREE.CylinderGeometry(0.11, 0.045, 1, 7, 1, true)
        geo.translate(0, 0.5, 0)
        return geo
      }),
      ring: cachedGeometry('fnt.ring', () => {
        const geo = new THREE.RingGeometry(0.5, 1.5, 16)
        geo.rotateX(-Math.PI / 2)
        return geo
      }),
    }),
    [],
  )

  const jetMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#eaf2f6',
        transparent: true,
        opacity: 0.44,
        roughness: 0.12,
        metalness: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  )
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#dfeaf0',
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  )
  useLayoutEffect(
    () => () => {
      jetMat.dispose()
      ringMat.dispose()
    },
    [jetMat, ringMat],
  )

  /* Callback refs so the transforms survive an InstancedMesh rebuild. */
  const staticRef = useCallback(
    (dy: number) => (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return
      const m = new THREE.Matrix4()
      const p = new THREE.Vector3()
      const qt = new THREE.Quaternion()
      const one = new THREE.Vector3(1, 1, 1)
      positions.forEach(([x, z], i) => mesh.setMatrixAt(i, m.compose(p.set(x, y + dy, z), qt, one)))
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    },
    [positions, y],
  )
  const nozzleRef = useMemo(() => staticRef(-0.05), [staticRef])
  const ringRef = useMemo(() => staticRef(0.02), [staticRef])

  const t = useRef(0)
  useFrame((_, dt) => {
    t.current += dt
    const mesh = jets.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const p = new THREE.Vector3()
    const qt = new THREE.Quaternion()
    const s = new THREE.Vector3()
    const base = q.fountainDetail >= 2 ? 2.5 : 1.9
    positions.forEach(([x, z], i) => {
      const h = base + Math.sin(t.current * 1.15 + i * 0.7) * 0.32
      p.set(x, y + 0.55, z)
      s.set(1, h, 1)
      mesh.setMatrixAt(i, m.compose(p, qt, s))
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  useLayoutEffect(() => {
    // Water catches much more light at golden hour and reads almost white
    // under the moon; keep the jets in step with the rest of the scene.
    jetMat.opacity = preset.key === 'moonlight' ? 0.3 : 0.44
    ringMat.opacity = preset.key === 'moonlight' ? 0.1 : 0.16
  }, [preset, jetMat, ringMat])

  const n = positions.length

  return (
    <group>
      <instancedMesh ref={nozzleRef} args={[g.nozzle, mats.marbleFine, n]} castShadow />
      {q.fountainDetail > 0 && (
        <>
          <instancedMesh ref={jets} args={[g.jet, jetMat, n]} frustumCulled={false} />
          <instancedMesh ref={ringRef} args={[g.ring, ringMat, n]} />
        </>
      )}
    </group>
  )
}
