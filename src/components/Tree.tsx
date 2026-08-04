import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useScene } from './SceneContext'
import { cachedGeometry } from '../lib/geoCache'

export interface TreeInstance {
  x: number
  z: number
  scale: number
  rot: number
}

/**
 * Adds a wind sway to an instanced material without touching the CPU each
 * frame. The phase is derived from the instance's own world position so the
 * canopy ripples across the garden rather than moving in lockstep.
 */
function useWindMaterial(base: THREE.Material, amplitude: number) {
  const time = useRef({ value: 0 })
  const mat = useMemo(() => {
    const m = base.clone()
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time.current
      shader.uniforms.uWind = { value: amplitude }
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;
           uniform float uWind;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           #ifdef USE_INSTANCING
             float phase = instanceMatrix[3].x * 0.13 + instanceMatrix[3].z * 0.09;
           #else
             float phase = 0.0;
           #endif
           float hf = clamp((position.y + 1.0) / 6.0, 0.0, 1.0);
           transformed.x += sin(uTime * 0.9 + phase) * uWind * hf;
           transformed.z += cos(uTime * 0.67 + phase * 1.3) * uWind * 0.6 * hf;`,
        )
    }
    m.needsUpdate = true
    return m
  }, [base, amplitude])

  useFrame((_, dt) => {
    time.current.value += dt
  })

  useLayoutEffect(() => () => mat.dispose(), [mat])
  return mat
}

/**
 * Returns a callback ref that fills an InstancedMesh with tree transforms.
 *
 * Deliberately a callback ref rather than a ref plus an effect: react-three-
 * fiber rebuilds the InstancedMesh whenever its `args` change identity — which
 * happens every time the quality profile swaps the shared materials — and an
 * effect keyed on the item list alone would never re-run, leaving every
 * instance stacked at the origin.
 */
function useInstanceRef(items: TreeInstance[], yScale = 1, y = 0) {
  return useCallback(
    (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return
      const m = new THREE.Matrix4()
      const p = new THREE.Vector3()
      const q = new THREE.Quaternion()
      const e = new THREE.Euler()
      const s = new THREE.Vector3()
      items.forEach((it, i) => {
        p.set(it.x, y, it.z)
        e.set(0, it.rot, 0)
        s.set(it.scale, it.scale * yScale, it.scale)
        mesh.setMatrixAt(i, m.compose(p, q.setFromEuler(e), s))
      })
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    },
    [items, yScale, y],
  )
}

/**
 * The tall dark cypresses that line the central water axis. They are the
 * vertical counterpoint to the horizontal channel in every photograph of the
 * garden, so they matter more than their polygon count suggests.
 */
export function Cypresses({ items }: { items: TreeInstance[] }) {
  const { mats } = useScene()
  const trunkRef = useInstanceRef(items, 1, 0.7)
  const bodyRef = useInstanceRef(items, 1, 1.1)

  const g = useMemo(
    () => ({
      trunk: cachedGeometry('tree.cypTrunk', () => new THREE.CylinderGeometry(0.16, 0.24, 1.4, 6)),
      body: cachedGeometry('tree.cypBody', () => {
        // A slightly pinched spindle, not a plain cone.
        const profile = [
          new THREE.Vector2(0.02, 0),
          new THREE.Vector2(0.62, 0.6),
          new THREE.Vector2(0.86, 1.9),
          new THREE.Vector2(0.94, 3.4),
          new THREE.Vector2(0.82, 5.2),
          new THREE.Vector2(0.56, 6.8),
          new THREE.Vector2(0.26, 7.9),
          new THREE.Vector2(0.0, 8.5),
        ]
        const geo = new THREE.LatheGeometry(profile, 9)
        geo.computeVertexNormals()
        return geo
      }),
    }),
    [],
  )

  const swayMat = useWindMaterial(mats.cypress, 0.11)

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[g.trunk, mats.bark, items.length]} castShadow />
      <instancedMesh ref={bodyRef} args={[g.body, swayMat, items.length]} castShadow receiveShadow />
    </group>
  )
}

/** Broad-canopy garden trees, built from three crossed alpha-mapped quads. */
export function CanopyTrees({ items }: { items: TreeInstance[] }) {
  const { mats } = useScene()
  const trunkRef = useInstanceRef(items, 1, 1.7)
  const canopyRef = useInstanceRef(items, 1, 0)

  const g = useMemo(
    () => ({
      trunk: cachedGeometry('tree.trunk', () => new THREE.CylinderGeometry(0.22, 0.42, 3.4, 6)),
      canopy: cachedGeometry('tree.canopy', () => {
        const quads: THREE.BufferGeometry[] = []
        for (let i = 0; i < 3; i++) {
          const p = new THREE.PlaneGeometry(6.4, 5.4)
          p.rotateY((i / 3) * Math.PI)
          p.translate(0, 4.2, 0)
          quads.push(p)
        }
        // Cheap manual merge: three planes share the same attribute layout.
        const geo = new THREE.BufferGeometry()
        const pos: number[] = []
        const nor: number[] = []
        const uv: number[] = []
        const idx: number[] = []
        let off = 0
        for (const qd of quads) {
          const pp = qd.getAttribute('position')
          const pn = qd.getAttribute('normal')
          const pu = qd.getAttribute('uv')
          const pi = qd.getIndex()!
          for (let i = 0; i < pp.count; i++) {
            pos.push(pp.getX(i), pp.getY(i), pp.getZ(i))
            nor.push(pn.getX(i), pn.getY(i), pn.getZ(i))
            uv.push(pu.getX(i), pu.getY(i))
          }
          for (let i = 0; i < pi.count; i++) idx.push(pi.getX(i) + off)
          off += pp.count
          qd.dispose()
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
        geo.setIndex(idx)
        geo.computeBoundingSphere()
        return geo
      }),
    }),
    [],
  )

  const swayMat = useWindMaterial(mats.canopy, 0.16)

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[g.trunk, mats.bark, items.length]} castShadow />
      <instancedMesh ref={canopyRef} args={[g.canopy, swayMat, items.length]} castShadow receiveShadow />
    </group>
  )
}
