import { useMemo } from 'react'
import * as THREE from 'three'
import { useScene } from './SceneContext'
import { archBandShape, pointedArch, scaleUV } from '../lib/shapes'
import { cachedGeometry } from '../lib/geoCache'
import { MARBLE_TILE, SAND_TILE } from '../lib/materials'

export interface DecorativeArchProps {
  /** Clear width and height of the opening in the wall. */
  w: number
  h: number
  spring: number
  /** How far the niche is hollowed back behind the wall face. */
  depth?: number
  /** Width of the moulded archivolt band around the opening. */
  band?: number
  /** How many stepped bands frame the opening. Two reads as a real reveal. */
  layers?: number
  stone?: 'marble' | 'sandstone'
  /** What closes the back of the niche. */
  back?: 'dark' | 'jali' | 'inlay' | 'none'
  position?: [number, number, number]
  rotation?: [number, number, number]
}

/**
 * The recessed pointed-arch niche that repeats all over the complex — the
 * flanking bays of the mausoleum, its canted corner bays, the wings of the
 * mosque and jawab, and the faces of the great gate.
 *
 * The opening itself is a hole cut through the wall geometry (see
 * `wallShape`); this component supplies everything that makes the hole read
 * as depth: stepped archivolt bands stepping backwards, a hollow reveal drawn
 * from the inside, and a back plate of dark shadow, pierced jali or inlay.
 */
export function DecorativeArch({
  w,
  h,
  spring,
  depth = 1.4,
  band = 0.55,
  layers = 2,
  stone = 'marble',
  back = 'dark',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: DecorativeArchProps) {
  const { mats } = useScene()
  const body = stone === 'marble' ? mats.marbleFine : mats.sandstoneFine
  const tile = stone === 'marble' ? MARBLE_TILE : SAND_TILE
  const key = [w, h, spring, depth, band, layers, stone].join('_')

  const g = useMemo(() => {
    // Archivolt: a narrow band standing proud of the wall, with wider, more
    // deeply set bands behind it. That stepped moulding is what catches a
    // shadow line all the way round every opening.
    const bands = Array.from({ length: layers }, (_, i) =>
      cachedGeometry(`ar.b${i}.${key}`, () => {
        const geo = new THREE.ExtrudeGeometry(
          archBandShape(w, h, spring, band * (1 + i * 0.62), 0.6),
          {
            depth: 0.3 - i * 0.09,
            bevelEnabled: true,
            bevelThickness: 0.05,
            bevelSize: 0.05,
            bevelSegments: 1,
            curveSegments: 20,
          },
        )
        return scaleUV(geo, 1 / tile, 1 / tile)
      }),
    )

    // Hollow reveal: a solid arch prism drawn from the inside, which gives the
    // jambs, the curved soffit and the back wall in one piece.
    const reveal = cachedGeometry(`ar.r.${key}`, () => {
      const geo = new THREE.ExtrudeGeometry(pointedArch(w, h, spring), {
        depth,
        bevelEnabled: false,
        curveSegments: 32,
      })
      geo.translate(0, 0, -depth)
      return scaleUV(geo, 1 / tile, 1 / tile)
    })

    const plate = cachedGeometry(`ar.p.${key}`, () => {
      const geo = new THREE.ShapeGeometry(pointedArch(w * 0.985, h * 0.985, spring), 24)
      return scaleUV(geo, 1 / (tile * 0.55), 1 / (tile * 0.55))
    })

    return { bands, reveal, plate }
  }, [key, w, h, spring, depth, band, layers, tile])

  const backMat = back === 'jali' ? mats.jali : back === 'inlay' ? mats.inlay : mats.opening

  return (
    <group position={position} rotation={rotation}>
      {g.bands.map((b, i) => (
        <mesh key={i} geometry={b} position={[0, 0, -0.14 * i]} material={body} castShadow receiveShadow />
      ))}

      <mesh geometry={g.reveal} material={mats.recess} receiveShadow />

      {/* A pierced screen only reads as a screen if there is darkness behind
          it, so jali backs get a shadow plate as well. */}
      {back === 'jali' && (
        <mesh geometry={g.plate} position={[0, 0, -depth + 0.04]} material={mats.opening} receiveShadow />
      )}
      {back !== 'none' && (
        <mesh
          geometry={g.plate}
          position={[0, 0, -depth + (back === 'jali' ? 0.34 : 0.04)]}
          material={backMat}
          receiveShadow
        />
      )}
    </group>
  )
}
