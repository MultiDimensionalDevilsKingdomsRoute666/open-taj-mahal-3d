import { useMemo } from 'react'
import * as THREE from 'three'
import { useScene } from './SceneContext'
import { ReflectingPool } from './ReflectingPool'
import { CanopyTrees, type TreeInstance } from './Tree'
import { cachedGeometry } from '../lib/geoCache'
import { scaleUV } from '../lib/shapes'
import { SAND_TILE } from '../lib/materials'
import {
  RIVER_Y,
  RIVER_Z_FAR,
  RIVER_Z_NEAR,
  TERRACE_D,
  TERRACE_W,
  TERRACE_Z,
} from '../lib/dimensions'

const BANK_Z = RIVER_Z_NEAR + 6

/**
 * The Yamuna, immediately behind the mausoleum.
 *
 * The river is the reason the terrace is where it is: the tomb was sited so
 * that it rises straight out of the water when seen from the far bank. Wider
 * and calmer than the garden channels, with a sandy near bank, a retaining
 * wall under the terrace, and a hazy tree line on the far side.
 */
export function YamunaRiver() {
  const { mats } = useScene()

  const g = useMemo(
    () => ({
      retainingWall: cachedGeometry('riv.wall', () => {
        const geo = new THREE.BoxGeometry(TERRACE_W + 2, 12, 4)
        return scaleUV(geo, (TERRACE_W + 2) / SAND_TILE, 12 / SAND_TILE)
      }),
      nearBank: cachedGeometry('riv.near', () => {
        const geo = new THREE.PlaneGeometry(760, Math.abs(BANK_Z - (TERRACE_Z - TERRACE_D / 2)) + 12)
        geo.rotateX(-Math.PI / 2)
        return scaleUV(geo, 760 / 14, 6)
      }),
      farBank: cachedGeometry('riv.far', () => {
        const geo = new THREE.PlaneGeometry(1000, 240)
        geo.rotateX(-Math.PI / 2)
        return scaleUV(geo, 1000 / 16, 240 / 16)
      }),
      sandbar: cachedGeometry('riv.sandbar', () => {
        const geo = new THREE.CircleGeometry(46, 18)
        geo.rotateX(-Math.PI / 2)
        geo.scale(1.9, 1, 0.45)
        return scaleUV(geo, 8, 8)
      }),
    }),
    [],
  )

  const farTrees = useMemo<TreeInstance[]>(() => {
    const out: TreeInstance[] = []
    let s = 991
    const r = () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0
      return s / 4294967296
    }
    for (let i = 0; i < 70; i++) {
      out.push({
        x: (r() - 0.5) * 900,
        z: RIVER_Z_FAR - 12 - r() * 130,
        scale: 1.1 + r() * 1.0,
        rot: r() * Math.PI * 2,
      })
    }
    return out
  }, [])

  const northTerraceEdge = TERRACE_Z - TERRACE_D / 2

  return (
    <group>
      {/* Retaining wall holding the terrace above the flood plain. */}
      <mesh
        geometry={g.retainingWall}
        position={[0, -3.6, northTerraceEdge - 1.6]}
        material={mats.sandstone}
        castShadow
        receiveShadow
      />

      {/* Sandy strip between the wall and the water. */}
      <mesh
        geometry={g.nearBank}
        position={[0, RIVER_Y + 0.35, (northTerraceEdge + BANK_Z) / 2]}
        material={mats.ground}
        receiveShadow
      />

      <ReflectingPool
        width={900}
        length={Math.abs(RIVER_Z_FAR - BANK_Z)}
        position={[0, RIVER_Y, (BANK_Z + RIVER_Z_FAR) / 2]}
        calm
      />

      <mesh
        geometry={g.sandbar}
        position={[-120, RIVER_Y + 0.12, RIVER_Z_NEAR - 105]}
        material={mats.ground}
        receiveShadow
      />

      <mesh
        geometry={g.farBank}
        position={[0, RIVER_Y + 0.5, RIVER_Z_FAR - 118]}
        material={mats.ground}
        receiveShadow
      />

      <CanopyTrees items={farTrees} />
    </group>
  )
}
