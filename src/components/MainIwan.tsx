import { useMemo } from 'react'
import * as THREE from 'three'
import { useScene } from './SceneContext'
import { DecorativeArch } from './DecorativeArch'
import { cachedGeometry } from '../lib/geoCache'
import { archBandShape, guldastaProfile, pointedArch, scaleUV } from '../lib/shapes'
import { MARBLE_TILE } from '../lib/materials'
import {
  FACADE_H,
  IWAN_DEPTH,
  IWAN_H,
  IWAN_SPRING,
  IWAN_W,
  PISHTAQ_PROJ,
  PISHTAQ_W,
} from '../lib/dimensions'

/** Width of the calligraphic band that frames the pishtaq. */
const BAND_W = 1.75

/**
 * The great iwan — the pishtaq — on one face of the mausoleum.
 *
 * Four of these, identical, are what make the building read as the Taj Mahal
 * from any of the cardinal directions. Each is a tall rectangular frame
 * carrying a band of calligraphy, enclosing a deeply recessed pointed arch
 * with floral inlay in the spandrels, a dark doorway on the back wall and a
 * pierced jali screen above it.
 *
 * Local space: the wall face lies on z = 0 and the iwan faces +Z.
 */
export function MainIwan() {
  const { mats } = useScene()

  const g = useMemo(() => {
    const bandDepth = PISHTAQ_PROJ
    return {
      // Verticals are built lying down and rotated upright so that the
      // calligraphy runs along the band rather than across it.
      // The calligraphy texture is 8:1, so one repeat covers eight band widths.
      // Fewer, longer repeats keep the script from reading as a chain.
      bandV: cachedGeometry('iwan.bandV', () => {
        const geo = new THREE.BoxGeometry(FACADE_H, BAND_W, bandDepth)
        return scaleUV(geo, FACADE_H / (BAND_W * 8), 1)
      }),
      bandH: cachedGeometry('iwan.bandH', () => {
        const geo = new THREE.BoxGeometry(PISHTAQ_W, BAND_W, bandDepth)
        return scaleUV(geo, PISHTAQ_W / (BAND_W * 8), 1)
      }),
      // The flat marble margin between the calligraphy and the arch.
      margin: cachedGeometry('iwan.margin', () => {
        const inner = PISHTAQ_W - BAND_W * 2
        const shape = new THREE.Shape()
        shape.moveTo(-inner / 2, 0)
        shape.lineTo(inner / 2, 0)
        shape.lineTo(inner / 2, FACADE_H - BAND_W)
        shape.lineTo(-inner / 2, FACADE_H - BAND_W)
        shape.closePath()
        shape.holes.push(
          new THREE.Path(pointedArch(IWAN_W + 1.35, IWAN_H + 0.9, IWAN_SPRING).getPoints(48)),
        )
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: bandDepth * 0.62,
          bevelEnabled: false,
          curveSegments: 20,
        })
        return scaleUV(geo, 1 / MARBLE_TILE, 1 / MARBLE_TILE)
      }),
      // Floral inlay spandrels, set into the corners above the arch.
      spandrel: cachedGeometry('iwan.spandrel', () => new THREE.PlaneGeometry(4.4, 4.4)),
      // A moulded band chasing the arch itself, inside the margin.
      archivolt: cachedGeometry('iwan.archivolt', () => {
        const geo = new THREE.ExtrudeGeometry(archBandShape(IWAN_W, IWAN_H, IWAN_SPRING, 0.62, 0.8), {
          depth: 0.34,
          bevelEnabled: true,
          bevelThickness: 0.06,
          bevelSize: 0.06,
          bevelSegments: 1,
          curveSegments: 24,
        })
        return scaleUV(geo, 1 / MARBLE_TILE, 1 / MARBLE_TILE)
      }),
      // Back wall of the recess: a doorway, a jali light above it, and two
      // tiers of small blind arches either side.
      doorPlate: cachedGeometry('iwan.doorPlate', () =>
        new THREE.ShapeGeometry(pointedArch(5.4, 9.6, 4.2), 24),
      ),
      doorBand: cachedGeometry('iwan.doorBand', () => {
        const geo = new THREE.ExtrudeGeometry(archBandShape(5.4, 9.6, 4.2, 0.4, 0.4), {
          depth: 0.22,
          bevelEnabled: false,
          curveSegments: 18,
        })
        return scaleUV(geo, 1 / MARBLE_TILE, 1 / MARBLE_TILE)
      }),
      jaliPlate: cachedGeometry('iwan.jaliPlate', () => {
        const geo = new THREE.ShapeGeometry(pointedArch(4.6, 5.6, 2.4), 20)
        return scaleUV(geo, 0.7, 0.7)
      }),
      jaliShadow: cachedGeometry('iwan.jaliShadow', () =>
        new THREE.ShapeGeometry(pointedArch(4.8, 5.8, 2.5), 20),
      ),
      nichePlate: cachedGeometry('iwan.nichePlate', () =>
        new THREE.ShapeGeometry(pointedArch(2.6, 5.4, 2.4), 18),
      ),
      nicheBand: cachedGeometry('iwan.nicheBand', () => {
        const geo = new THREE.ExtrudeGeometry(archBandShape(2.6, 5.4, 2.4, 0.34, 0.3), {
          depth: 0.14,
          bevelEnabled: false,
          curveSegments: 14,
        })
        return scaleUV(geo, 1 / MARBLE_TILE, 1 / MARBLE_TILE)
      }),
      guldasta: cachedGeometry('iwan.guldasta', () => {
        const geo = new THREE.LatheGeometry(guldastaProfile(7.2, 0.72), 14)
        geo.computeVertexNormals()
        return geo
      }),
    }
  }, [])

  const inner = PISHTAQ_W - BAND_W * 2
  const backZ = -IWAN_DEPTH + 0.06

  return (
    <group>
      {/* --- calligraphic frame --- */}
      <mesh
        geometry={g.bandV}
        position={[-(PISHTAQ_W - BAND_W) / 2, FACADE_H / 2, PISHTAQ_PROJ / 2]}
        rotation={[0, 0, Math.PI / 2]}
        material={mats.calligraphy}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={g.bandV}
        position={[(PISHTAQ_W - BAND_W) / 2, FACADE_H / 2, PISHTAQ_PROJ / 2]}
        rotation={[0, 0, Math.PI / 2]}
        material={mats.calligraphy}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={g.bandH}
        position={[0, FACADE_H - BAND_W / 2, PISHTAQ_PROJ / 2]}
        material={mats.calligraphy}
        castShadow
        receiveShadow
      />

      {/* --- marble margin, archivolt and spandrels --- */}
      <mesh geometry={g.margin} material={mats.marbleFine} castShadow receiveShadow />
      <mesh geometry={g.archivolt} position={[0, 0, 0.02]} material={mats.marbleFine} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          geometry={g.spandrel}
          position={[(s * (inner / 2 - 2.7)), IWAN_H - 2.2, PISHTAQ_PROJ * 0.63]}
          material={mats.inlay}
        />
      ))}

      {/* --- the recess itself --- */}
      <DecorativeArch
        w={IWAN_W}
        h={IWAN_H}
        spring={IWAN_SPRING}
        depth={IWAN_DEPTH}
        band={0.5}
        layers={1}
        back="none"
      />

      {/* --- back wall of the recess --- */}
      <group position={[0, 0, backZ]}>
        <mesh geometry={g.doorBand} position={[0, 0.6, 0.02]} material={mats.marbleFine} />
        <mesh geometry={g.doorPlate} position={[0, 0.6, 0.04]} material={mats.opening} />
        <mesh geometry={g.jaliShadow} position={[0, 12.0, 0.03]} material={mats.opening} />
        <mesh geometry={g.jaliPlate} position={[0, 12.0, 0.16]} material={mats.jali} />
        {/* Two tiers of small blind niches either side of the doorway. These
            are flat plates rather than modelled recesses: at 7 m back inside
            the iwan they are always in deep shade, and a real recess here
            just adds geometry nobody can resolve. */}
        {[-1, 1].map((s) =>
          [1.1, 7.4].map((y) => (
            <group key={`${s}_${y}`} position={[s * 5.4, y, 0]}>
              <mesh geometry={g.nicheBand} position={[0, 0, 0.02]} material={mats.marbleFine} />
              <mesh geometry={g.nichePlate} position={[0, 0, 0.05]} material={mats.opening} />
            </group>
          )),
        )}
      </group>

      {/* --- guldastas on the shoulders of the pishtaq --- */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          geometry={g.guldasta}
          position={[(s * (PISHTAQ_W + 0.4)) / 2, FACADE_H - 0.4, PISHTAQ_PROJ * 0.4]}
          material={mats.marbleFine}
          castShadow
        />
      ))}
    </group>
  )
}
