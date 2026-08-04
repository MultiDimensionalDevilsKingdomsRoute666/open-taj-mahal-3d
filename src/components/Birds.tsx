import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useScene } from './SceneContext'
import { cachedGeometry } from '../lib/geoCache'

interface Bird {
  radius: number
  height: number
  speed: number
  phase: number
  cx: number
  cz: number
  flap: number
}

/**
 * Birds wheeling over the complex.
 *
 * Two triangles each, one instanced draw call for the flock, and no shadows —
 * they exist purely so the sky is not empty. Each bird orbits its own centre
 * at its own rate, with a slow flap driven off the same clock.
 */
export function Birds() {
  const { q } = useScene()
  const mesh = useRef<THREE.InstancedMesh>(null)
  const count = q.birds

  const geo = useMemo(
    () =>
      cachedGeometry('bird', () => {
        // A shallow V: two wings meeting at the body.
        const g = new THREE.BufferGeometry()
        const v = new Float32Array([
          0, 0, 0, -1.7, 0.42, -0.55, -1.5, 0.1, 0.7,
          0, 0, 0, 1.5, 0.1, 0.7, 1.7, 0.42, -0.55,
        ])
        g.setAttribute('position', new THREE.BufferAttribute(v, 3))
        g.computeVertexNormals()
        return g
      }),
    [],
  )

  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#2b2b30',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.62,
      }),
    [],
  )
  useLayoutEffect(() => () => mat.dispose(), [mat])

  const birds = useMemo<Bird[]>(() => {
    let s = 4242
    const r = () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0
      return s / 4294967296
    }
    return Array.from({ length: count }, () => ({
      radius: 45 + r() * 190,
      height: 62 + r() * 95,
      speed: 0.055 + r() * 0.075,
      phase: r() * Math.PI * 2,
      cx: (r() - 0.5) * 260,
      cz: (r() - 0.5) * 340 + 60,
      flap: 2.4 + r() * 2.4,
    }))
  }, [count])

  const m = useMemo(() => new THREE.Matrix4(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const qt = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  const sc = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ clock }) => {
    const mi = mesh.current
    if (!mi) return
    const t = clock.elapsedTime
    birds.forEach((b, i) => {
      const a = b.phase + t * b.speed
      p.set(b.cx + Math.cos(a) * b.radius, b.height + Math.sin(a * 1.7) * 6, b.cz + Math.sin(a) * b.radius)
      // Bank into the turn and face along the tangent.
      e.set(Math.sin(t * b.flap + b.phase) * 0.34, -a + Math.PI / 2, 0.22)
      sc.setScalar(1.5)
      mi.setMatrixAt(i, m.compose(p, qt.setFromEuler(e), sc))
    })
    mi.instanceMatrix.needsUpdate = true
  })

  useLayoutEffect(() => {
    mesh.current?.computeBoundingSphere()
  }, [count])

  if (count === 0) return null
  return <instancedMesh ref={mesh} args={[geo, mat, count]} frustumCulled={false} />
}
