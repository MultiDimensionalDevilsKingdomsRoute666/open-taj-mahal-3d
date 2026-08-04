import { useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { useScene } from './SceneContext'
import { bulbProfile, columnProfile, lotusCollarProfile, pointedArch } from '../lib/shapes'
import { cachedGeometry } from '../lib/geoCache'

export interface ChhatriProps {
  /** Radius out to the centre line of the columns. */
  radius: number
  columnHeight: number
  domeHeight: number
  position?: [number, number, number]
  rotation?: number
  /** Red sandstone chhatris appear on the gate; marble ones on the tomb. */
  stone?: 'marble' | 'sandstone'
  /** Drop the pointed-arch spans between columns on low quality settings. */
  detail?: boolean
}

/**
 * A chhatri: the octagonal domed kiosk that crowns Mughal roofs. Four of them
 * surround the great dome, one caps each minaret, and rows of them run along
 * the parapet of the great gate.
 *
 * Built from eight columns carrying a moulded octagonal canopy and a bulbous
 * dome with its own lotus collar and finial.
 */
export function Chhatri({
  radius,
  columnHeight,
  domeHeight,
  position = [0, 0, 0],
  rotation = 0,
  stone = 'marble',
  detail = true,
}: ChhatriProps) {
  const { q, mats } = useScene()
  const seg = Math.max(12, Math.round(q.segments * 0.6))
  const body = stone === 'marble' ? mats.marbleFine : mats.sandstoneFine
  const trim = stone === 'marble' ? mats.marbleFine : mats.sandstoneFine

  const key = `${radius.toFixed(2)}_${columnHeight.toFixed(2)}_${domeHeight.toFixed(2)}_${seg}`

  const g = useMemo(() => {
    const colR = radius * 0.1
    return {
      base: cachedGeometry(`ch.base.${key}`, () =>
        new THREE.CylinderGeometry(radius * 1.28, radius * 1.36, 0.55, 8),
      ),
      plinth: cachedGeometry(`ch.plinth.${key}`, () =>
        new THREE.CylinderGeometry(radius * 1.18, radius * 1.22, 0.3, 8),
      ),
      column: cachedGeometry(`ch.col.${key}`, () => {
        const geo = new THREE.LatheGeometry(columnProfile(columnHeight, colR), 10)
        geo.computeVertexNormals()
        return geo
      }),
      arch: cachedGeometry(`ch.arch.${key}`, () => {
        const w = radius * 0.76
        const s = pointedArch(w, columnHeight * 0.42, columnHeight * 0.12)
        const outer = new THREE.Shape()
        outer.moveTo(-w / 2, 0)
        outer.lineTo(w / 2, 0)
        outer.lineTo(w / 2, columnHeight * 0.42)
        outer.lineTo(-w / 2, columnHeight * 0.42)
        outer.closePath()
        const hole = new THREE.Path(s.getPoints(28))
        outer.holes.push(hole)
        const geo = new THREE.ExtrudeGeometry(outer, {
          depth: colR * 1.1,
          bevelEnabled: false,
          curveSegments: 10,
        })
        geo.translate(0, 0, -colR * 0.55)
        return geo
      }),
      canopy: cachedGeometry(`ch.canopy.${key}`, () =>
        new THREE.CylinderGeometry(radius * 1.42, radius * 1.24, 0.5, 8),
      ),
      cornice: cachedGeometry(`ch.cornice.${key}`, () =>
        new THREE.CylinderGeometry(radius * 1.1, radius * 1.42, 0.42, 8),
      ),
      collar: cachedGeometry(`ch.collar.${key}`, () =>
        new THREE.LatheGeometry(lotusCollarProfile(domeHeight * 0.18, radius * 1.06), seg),
      ),
      dome: cachedGeometry(`ch.dome.${key}`, () => {
        const geo = new THREE.LatheGeometry(bulbProfile(domeHeight, radius * 1.12, 30), seg)
        geo.computeVertexNormals()
        return geo
      }),
      finial: cachedGeometry(`ch.finial.${key}`, () => {
        const geo = new THREE.LatheGeometry(
          [
            new THREE.Vector2(0, 0),
            new THREE.Vector2(radius * 0.16, 0.06),
            new THREE.Vector2(radius * 0.09, radius * 0.2),
            new THREE.Vector2(radius * 0.2, radius * 0.34),
            new THREE.Vector2(radius * 0.1, radius * 0.5),
            new THREE.Vector2(radius * 0.04, radius * 0.78),
            new THREE.Vector2(0, radius * 0.95),
          ],
          12,
        )
        geo.computeVertexNormals()
        return geo
      }),
    }
  }, [key, radius, columnHeight, domeHeight, seg])

  const columns = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8
        return { key: i, x: Math.sin(a) * radius, z: Math.cos(a) * radius, a }
      }),
    [radius],
  )

  /* Callback refs so the transforms survive an InstancedMesh rebuild. */
  const columnsRef = useCallback(
    (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return
      const m = new THREE.Matrix4()
      const p = new THREE.Vector3()
      const qt = new THREE.Quaternion()
      const one = new THREE.Vector3(1, 1, 1)
      columns.forEach((c, i) => mesh.setMatrixAt(i, m.compose(p.set(c.x, 0.55, c.z), qt, one)))
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    },
    [columns],
  )

  const archesRef = useCallback(
    (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return
      const m = new THREE.Matrix4()
      const p = new THREE.Vector3()
      const qt = new THREE.Quaternion()
      const e = new THREE.Euler()
      const one = new THREE.Vector3(1, 1, 1)
      const r = radius * Math.cos(Math.PI / 8)
      columns.forEach((c, i) => {
        const a = c.a + Math.PI / 8
        e.set(0, a, 0)
        p.set(Math.sin(a) * r, 0.55 + columnHeight * 0.55, Math.cos(a) * r)
        mesh.setMatrixAt(i, m.compose(p, qt.setFromEuler(e), one))
      })
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    },
    [columns, radius, columnHeight],
  )

  const canopyY = 0.55 + columnHeight

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh geometry={g.base} position={[0, 0.275, 0]} material={body} castShadow receiveShadow />
      <mesh geometry={g.plinth} position={[0, 0.7, 0]} material={trim} castShadow receiveShadow />

      {/* Eight columns and eight spanning arches, two draw calls instead of
          sixteen. There are sixteen chhatris across the complex, so this one
          change is worth a couple of hundred draw calls a frame. */}
      <instancedMesh ref={columnsRef} args={[g.column, body, 8]} castShadow receiveShadow />
      {detail && <instancedMesh ref={archesRef} args={[g.arch, body, 8]} castShadow />}

      <mesh geometry={g.canopy} position={[0, canopyY + 0.25, 0]} material={body} castShadow receiveShadow />
      <mesh geometry={g.cornice} position={[0, canopyY + 0.68, 0]} material={trim} castShadow receiveShadow />
      <mesh geometry={g.collar} position={[0, canopyY + 0.85, 0]} material={trim} castShadow />
      <mesh
        geometry={g.dome}
        position={[0, canopyY + 0.85 + domeHeight * 0.14, 0]}
        material={stone === 'marble' ? mats.marble : mats.marbleFine}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={g.finial}
        position={[0, canopyY + 0.85 + domeHeight * 1.1, 0]}
        material={mats.gold}
        castShadow
      />
    </group>
  )
}
