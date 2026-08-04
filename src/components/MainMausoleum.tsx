import { useMemo } from 'react'
import * as THREE from 'three'
import { useScene } from './SceneContext'
import { MainIwan } from './MainIwan'
import { MainDome } from './MainDome'
import { Chhatri } from './Chhatri'
import { DecorativeArch } from './DecorativeArch'
import { cachedGeometry } from '../lib/geoCache'
import { chamferedSquare, guldastaProfile, scaleUV, wallShape, type Opening } from '../lib/shapes'
import { MARBLE_TILE } from '../lib/materials'
import {
  CHHATRI_BASE_R,
  CHHATRI_COL_H,
  CHHATRI_DOME_H,
  CHHATRI_R,
  FACADE_H,
  IWAN_H,
  IWAN_SPRING,
  IWAN_W,
  MAUS_CHAMFER,
  MAUS_CHAMFER_DIST,
  MAUS_CHAMFER_FACE,
  MAUS_FACE,
  MAUS_FACE_DIST,
  MAUS_W,
  PARAPET_H,
  WALL_T,
} from '../lib/dimensions'

/* --------------------------------------------------------- facade layout */

/** The two-tier arched bays that flank the great iwan on each main face. */
const SIDE_BAY = { w: 4.8, h: 9.6, spring: 4.6 }
const SIDE_BAY_X = 14.9
const SIDE_BAY_LOWER_Y = 1.4
const SIDE_BAY_UPPER_Y = 16.2

/** The taller bays on the four canted corner faces. */
const CORNER_BAY_LOWER = { w: 6.0, h: 11.0, spring: 5.0 }
const CORNER_BAY_UPPER = { w: 6.0, h: 10.0, spring: 4.6 }
const CORNER_BAY_LOWER_Y = 1.4
const CORNER_BAY_UPPER_Y = 17.5

const MAIN_OPENINGS: Opening[] = [
  { x: 0, y: 0, w: IWAN_W, h: IWAN_H, spring: IWAN_SPRING },
  { x: -SIDE_BAY_X, y: SIDE_BAY_LOWER_Y, ...SIDE_BAY },
  { x: SIDE_BAY_X, y: SIDE_BAY_LOWER_Y, ...SIDE_BAY },
  { x: -SIDE_BAY_X, y: SIDE_BAY_UPPER_Y, ...SIDE_BAY },
  { x: SIDE_BAY_X, y: SIDE_BAY_UPPER_Y, ...SIDE_BAY },
]

const CORNER_OPENINGS: Opening[] = [
  { x: 0, y: CORNER_BAY_LOWER_Y, ...CORNER_BAY_LOWER },
  { x: 0, y: CORNER_BAY_UPPER_Y, ...CORNER_BAY_UPPER },
]

/** The eight faces of the irregular octagon, with the rotation that aims each outward. */
const FACES = [
  { dir: [0, 1], rot: 0 },
  { dir: [Math.SQRT1_2, Math.SQRT1_2], rot: Math.PI / 4 },
  { dir: [1, 0], rot: Math.PI / 2 },
  { dir: [Math.SQRT1_2, -Math.SQRT1_2], rot: (Math.PI * 3) / 4 },
  { dir: [0, -1], rot: Math.PI },
  { dir: [-Math.SQRT1_2, -Math.SQRT1_2], rot: (-Math.PI * 3) / 4 },
  { dir: [-1, 0], rot: -Math.PI / 2 },
  { dir: [-Math.SQRT1_2, Math.SQRT1_2], rot: -Math.PI / 4 },
] as const

/* -------------------------------------------------------------- component */

/**
 * The tomb itself: an irregular octagon of eight pierced marble walls, four
 * great iwans, sixteen flanking arched bays, a projecting cornice, a parapet,
 * four corner chhatris and the great dome.
 *
 * Placed with its floor at y = 0; the caller lifts it onto the marble plinth.
 */
export function MainMausoleum() {
  const { q, mats } = useScene()

  const g = useMemo(() => {
    const wall = (name: string, w: number, openings: Opening[]) =>
      cachedGeometry(`maus.${name}`, () => {
        const geo = new THREE.ExtrudeGeometry(wallShape(w + 0.3, FACADE_H, openings), {
          depth: WALL_T,
          bevelEnabled: false,
          curveSegments: 20,
        })
        geo.translate(0, 0, -WALL_T)
        return scaleUV(geo, 1 / MARBLE_TILE, 1 / MARBLE_TILE)
      })

    const prism = (name: string, size: number, chamfer: number, h: number, tile: number) =>
      cachedGeometry(`maus.${name}`, () => {
        const geo = new THREE.ExtrudeGeometry(chamferedSquare(size, chamfer), {
          depth: h,
          bevelEnabled: false,
        })
        geo.rotateX(-Math.PI / 2)
        return scaleUV(geo, 1 / tile, 1 / tile)
      })

    /**
     * Each pair of stacked bays sits inside its own raised rectangular frame,
     * with a string course dividing the two tiers. That frame is what gives
     * the real elevation its grid; without it the flanking arches float on a
     * blank wall and the whole facade reads as a plain white box.
     */
    const bayFrame = (name: string, w: number, h: number, y0: number) =>
      cachedGeometry(`maus.${name}`, () => {
        const shape = new THREE.Shape()
        shape.moveTo(-w / 2, y0)
        shape.lineTo(w / 2, y0)
        shape.lineTo(w / 2, y0 + h)
        shape.lineTo(-w / 2, y0 + h)
        shape.closePath()
        const t = 0.62
        const hole = new THREE.Path()
        hole.moveTo(-w / 2 + t, y0 + t)
        hole.lineTo(w / 2 - t, y0 + t)
        hole.lineTo(w / 2 - t, y0 + h - t)
        hole.lineTo(-w / 2 + t, y0 + h - t)
        hole.closePath()
        shape.holes.push(hole)
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: 0.34,
          bevelEnabled: true,
          bevelThickness: 0.05,
          bevelSize: 0.05,
          bevelSegments: 1,
        })
        return scaleUV(geo, 1 / MARBLE_TILE, 1 / MARBLE_TILE)
      })

    // Parapet ring: the octagon with a smaller octagon punched out of it.
    const parapet = cachedGeometry('maus.parapet', () => {
      const outer = chamferedSquare(MAUS_W, MAUS_CHAMFER)
      const t = 1.3
      const innerShape = chamferedSquare(MAUS_W - t * 2, MAUS_CHAMFER * ((MAUS_W - t * 2) / MAUS_W))
      outer.holes.push(new THREE.Path(innerShape.getPoints(1)))
      const geo = new THREE.ExtrudeGeometry(outer, { depth: PARAPET_H, bevelEnabled: false })
      geo.rotateX(-Math.PI / 2)
      return scaleUV(geo, 1 / MARBLE_TILE, 1 / MARBLE_TILE)
    })

    return {
      mainWall: wall('mainWall', MAUS_FACE, MAIN_OPENINGS),
      cornerWall: wall('cornerWall', MAUS_CHAMFER_FACE, CORNER_OPENINGS),
      // A solid core so no angle ever lets you see into a hollow shell.
      core: prism('core', MAUS_W - 16, MAUS_CHAMFER * 0.72, FACADE_H, MARBLE_TILE),
      cornice: prism('cornice', MAUS_W + 1.7, MAUS_CHAMFER * 1.03, 1.0, MARBLE_TILE),
      deck: prism('deck', MAUS_W, MAUS_CHAMFER, 0.5, MARBLE_TILE),
      plinthCourse: prism('plinthCourse', MAUS_W + 1.2, MAUS_CHAMFER * 1.02, 1.1, MARBLE_TILE),
      parapet,
      coping: prism('coping', MAUS_W + 0.5, MAUS_CHAMFER * 1.01, 0.32, MARBLE_TILE),
      sideBayFrame: bayFrame('sideBayFrame', SIDE_BAY.w + 2.5, 27.4, 0.7),
      cornerBayFrame: bayFrame('cornerBayFrame', CORNER_BAY_LOWER.w + 3.0, 28.2, 0.6),
      /** String course dividing the two tiers within a bay frame. */
      stringCourse: cachedGeometry('maus.stringCourse', () => {
        const geo = new THREE.BoxGeometry(1, 0.55, 0.42)
        return scaleUV(geo, 1 / MARBLE_TILE, 1)
      }),
      /** Inlay medallion in the head of each bay frame. */
      medallion: cachedGeometry('maus.medallion', () => new THREE.PlaneGeometry(2.0, 2.0)),
      guldasta: cachedGeometry('maus.guldasta', () => {
        const geo = new THREE.LatheGeometry(guldastaProfile(6.4, 0.66), 14)
        geo.computeVertexNormals()
        return geo
      }),
    }
  }, [])

  const roofY = FACADE_H + 0.5
  const chhatriXZ = CHHATRI_R * Math.SQRT1_2

  const corners = useMemo(
    () =>
      [
        [1, 1],
        [1, -1],
        [-1, -1],
        [-1, 1],
      ] as const,
    [],
  )

  return (
    <group>
      {/* --- a low course at the foot of the walls --- */}
      <mesh geometry={g.plinthCourse} position={[0, 0, 0]} material={mats.marbleFine} castShadow receiveShadow />

      <mesh geometry={g.core} position={[0, 0, 0]} material={mats.marbleShadow} castShadow receiveShadow />

      {/* --- the eight walls --- */}
      {FACES.map((f, i) => {
        const isMain = i % 2 === 0
        const dist = isMain ? MAUS_FACE_DIST : MAUS_CHAMFER_DIST
        const pos: [number, number, number] = [f.dir[0] * dist, 0, f.dir[1] * dist]
        return (
          <group key={i} position={pos} rotation={[0, f.rot, 0]}>
            <mesh
              geometry={isMain ? g.mainWall : g.cornerWall}
              material={mats.marble}
              castShadow
              receiveShadow
            />
            {isMain ? (
              <>
                <MainIwan />
                {[-SIDE_BAY_X, SIDE_BAY_X].map((x) => (
                  <group key={x} position={[x, 0, 0]}>
                    <mesh geometry={g.sideBayFrame} material={mats.marbleFine} castShadow receiveShadow />
                    <mesh
                      geometry={g.stringCourse}
                      scale={[SIDE_BAY.w + 2.5, 1, 1]}
                      position={[0, 13.4, 0.34]}
                      material={mats.marbleFine}
                      castShadow
                    />
                    {[SIDE_BAY_LOWER_Y, SIDE_BAY_UPPER_Y].map((y) => (
                      <DecorativeArch
                        key={y}
                        w={SIDE_BAY.w}
                        h={SIDE_BAY.h}
                        spring={SIDE_BAY.spring}
                        depth={1.9}
                        band={0.42}
                        layers={2}
                        back={y > 10 ? 'jali' : 'dark'}
                        position={[0, y, 0]}
                      />
                    ))}
                  </group>
                ))}
              </>
            ) : (
              <>
                <mesh geometry={g.cornerBayFrame} material={mats.marbleFine} castShadow receiveShadow />
                <mesh
                  geometry={g.stringCourse}
                  scale={[CORNER_BAY_LOWER.w + 3.0, 1, 1]}
                  position={[0, 14.4, 0.34]}
                  material={mats.marbleFine}
                  castShadow
                />
                <mesh geometry={g.medallion} position={[0, 25.6, 0.4]} material={mats.inlay} />
                <DecorativeArch
                  w={CORNER_BAY_LOWER.w}
                  h={CORNER_BAY_LOWER.h}
                  spring={CORNER_BAY_LOWER.spring}
                  depth={2.1}
                  band={0.48}
                  layers={2}
                  back="dark"
                  position={[0, CORNER_BAY_LOWER_Y, 0]}
                />
                <DecorativeArch
                  w={CORNER_BAY_UPPER.w}
                  h={CORNER_BAY_UPPER.h}
                  spring={CORNER_BAY_UPPER.spring}
                  depth={2.1}
                  band={0.48}
                  layers={2}
                  back="jali"
                  position={[0, CORNER_BAY_UPPER_Y, 0]}
                />
              </>
            )}
          </group>
        )
      })}

      {/* --- cornice, roof deck, parapet --- */}
      <mesh geometry={g.cornice} position={[0, FACADE_H - 0.5, 0]} material={mats.marbleFine} castShadow receiveShadow />
      <mesh geometry={g.deck} position={[0, FACADE_H, 0]} material={mats.marbleFloor} receiveShadow />
      <mesh geometry={g.parapet} position={[0, roofY, 0]} material={mats.marbleFine} castShadow receiveShadow />
      <mesh geometry={g.coping} position={[0, roofY + PARAPET_H, 0]} material={mats.marbleFine} castShadow receiveShadow />

      {/* --- corner chhatris, straddling the canted bays --- */}
      {corners.map(([sx, sz], i) => (
        <Chhatri
          key={i}
          radius={CHHATRI_BASE_R}
          columnHeight={CHHATRI_COL_H}
          domeHeight={CHHATRI_DOME_H}
          position={[sx * chhatriXZ, roofY, sz * chhatriXZ]}
          rotation={Math.PI / 8}
          detail={q.chhatriDetail}
        />
      ))}

      {/* --- guldastas marking the roof corners --- */}
      {corners.map(([sx, sz], i) => (
        <mesh
          key={i}
          geometry={g.guldasta}
          position={[sx * (MAUS_W / 2 - 2.4), roofY, sz * (MAUS_W / 2 - 2.4)]}
          material={mats.marbleFine}
          castShadow
        />
      ))}

      <MainDome baseY={roofY + PARAPET_H} />
    </group>
  )
}
