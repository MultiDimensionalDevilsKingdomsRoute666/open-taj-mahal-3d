import { useMemo } from 'react'
import * as THREE from 'three'
import { useScene } from './SceneContext'
import { cachedGeometry } from '../lib/geoCache'
import { scaleUV } from '../lib/shapes'
import { GARDEN_Z0, GARDEN_Z1, GATE_Z } from '../lib/dimensions'

/**
 * Ground beyond the walls, plus a low ridge on the horizon.
 *
 * The complex sits inside a much larger plain; without something out there the
 * fog has nothing to sit in front of and the boundary wall reads as the edge
 * of the world.
 */
export function Terrain() {
  const { mats } = useScene()

  const g = useMemo(
    () => ({
      plain: cachedGeometry('ter.plain', () => {
        const geo = new THREE.PlaneGeometry(3600, 3600)
        geo.rotateX(-Math.PI / 2)
        return scaleUV(geo, 3600 / 18, 3600 / 18)
      }),
      forecourt: cachedGeometry('ter.forecourt', () => {
        const geo = new THREE.PlaneGeometry(320, 150)
        geo.rotateX(-Math.PI / 2)
        return scaleUV(geo, 320 / 6, 150 / 6)
      }),
      ridge: cachedGeometry('ter.ridge', () => {
        // A shallow ring of hills far out, deliberately low-poly: it only ever
        // appears through heavy aerial haze.
        const geo = new THREE.CylinderGeometry(1360, 1420, 58, 48, 1, true)
        const pos = geo.getAttribute('position') as THREE.BufferAttribute
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i)
          const z = pos.getZ(i)
          const a = Math.atan2(z, x)
          const bump = Math.sin(a * 7.3) * 14 + Math.sin(a * 3.1 + 1.7) * 22 + Math.sin(a * 13.7) * 7
          if (pos.getY(i) > 0) pos.setY(i, pos.getY(i) + bump)
        }
        pos.needsUpdate = true
        geo.computeVertexNormals()
        return geo
      }),
    }),
    [],
  )

  return (
    <group>
      <mesh geometry={g.plain} position={[0, -0.6, 100]} material={mats.ground} receiveShadow />
      {/* Paved forecourt in front of the great gate. */}
      <mesh
        geometry={g.forecourt}
        position={[0, -0.45, GATE_Z + 90]}
        material={mats.pathway}
        receiveShadow
      />
      <mesh
        geometry={g.ridge}
        position={[0, 8, (GARDEN_Z0 + GARDEN_Z1) / 2 - 200]}
        material={mats.ground}
      />
    </group>
  )
}
