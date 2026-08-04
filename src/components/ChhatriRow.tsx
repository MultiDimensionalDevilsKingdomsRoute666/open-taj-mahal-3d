import { useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { useScene } from './SceneContext'
import { cachedGeometry } from '../lib/geoCache'
import { bulbProfile, columnProfile } from '../lib/shapes'

export interface ChhatriRowProps {
  positions: [number, number, number][]
  radius: number
  columnHeight: number
  domeHeight: number
  stone?: 'marble' | 'sandstone'
}

/**
 * A row of small chhatris drawn as five instanced meshes regardless of how
 * many kiosks there are.
 *
 * The great gate alone carries twenty-two of these along its parapet, and the
 * mosque and jawab add more; done as individual components that would be
 * several hundred draw calls for what is, visually, a repeated silhouette.
 */
export function ChhatriRow({
  positions,
  radius,
  columnHeight,
  domeHeight,
  stone = 'marble',
}: ChhatriRowProps) {
  const { q, mats } = useScene()
  const seg = Math.max(10, Math.round(q.segments * 0.4))
  const key = `${radius.toFixed(2)}_${columnHeight.toFixed(2)}_${domeHeight.toFixed(2)}_${seg}`


  const g = useMemo(
    () => ({
      base: cachedGeometry(`row.base.${key}`, () =>
        new THREE.CylinderGeometry(radius * 1.3, radius * 1.38, 0.5, 8),
      ),
      column: cachedGeometry(`row.col.${key}`, () => {
        const geo = new THREE.LatheGeometry(columnProfile(columnHeight, radius * 0.11), 8)
        geo.computeVertexNormals()
        return geo
      }),
      canopy: cachedGeometry(`row.canopy.${key}`, () =>
        new THREE.CylinderGeometry(radius * 1.16, radius * 1.4, 0.62, 8),
      ),
      dome: cachedGeometry(`row.dome.${key}`, () => {
        const geo = new THREE.LatheGeometry(bulbProfile(domeHeight, radius * 1.1, 22), seg)
        geo.computeVertexNormals()
        return geo
      }),
      finial: cachedGeometry(`row.finial.${key}`, () => {
        const geo = new THREE.ConeGeometry(radius * 0.15, radius * 0.8, 8)
        return geo
      }),
    }),
    [key, radius, columnHeight, domeHeight, seg],
  )

  const columnOffsets = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8
        return new THREE.Vector2(Math.sin(a) * radius, Math.cos(a) * radius)
      }),
    [radius],
  )

  /**
   * One callback-ref factory per layer. Callback refs re-run when r3f swaps
   * the underlying InstancedMesh — which it does whenever the shared
   * materials are rebuilt for a new quality profile.
   */
  const layerRef = useCallback(
    (dy: (canopyY: number) => number) => (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return
      const m = new THREE.Matrix4()
      const p = new THREE.Vector3()
      const qt = new THREE.Quaternion()
      const one = new THREE.Vector3(1, 1, 1)
      const canopyY = 0.5 + columnHeight
      positions.forEach(([x, y, z], i) => {
        mesh.setMatrixAt(i, m.compose(p.set(x, y + dy(canopyY), z), qt, one))
      })
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    },
    [positions, columnHeight],
  )

  const basesRef = useMemo(() => layerRef(() => 0.25), [layerRef])
  const canopiesRef = useMemo(() => layerRef((c) => c + 0.31), [layerRef])
  const domesRef = useMemo(() => layerRef((c) => c + 0.6), [layerRef])
  const finialsRef = useMemo(
    () => layerRef((c) => c + 0.6 + domeHeight * 1.05),
    [layerRef, domeHeight],
  )

  const columnsRef = useCallback(
    (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return
      const m = new THREE.Matrix4()
      const p = new THREE.Vector3()
      const qt = new THREE.Quaternion()
      const one = new THREE.Vector3(1, 1, 1)
      positions.forEach(([x, y, z], i) => {
        columnOffsets.forEach((o, j) => {
          mesh.setMatrixAt(i * 8 + j, m.compose(p.set(x + o.x, y + 0.5, z + o.y), qt, one))
        })
      })
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    },
    [positions, columnOffsets],
  )

  const body = stone === 'marble' ? mats.marbleFine : mats.sandstoneFine
  const cap = stone === 'marble' ? mats.marble : mats.marbleFine
  const n = positions.length

  return (
    <group>
      <instancedMesh ref={basesRef} args={[g.base, body, n]} castShadow receiveShadow />
      <instancedMesh ref={columnsRef} args={[g.column, body, n * 8]} castShadow />
      <instancedMesh ref={canopiesRef} args={[g.canopy, body, n]} castShadow receiveShadow />
      <instancedMesh ref={domesRef} args={[g.dome, cap, n]} castShadow receiveShadow />
      <instancedMesh ref={finialsRef} args={[g.finial, mats.gold, n]} castShadow />
    </group>
  )
}
