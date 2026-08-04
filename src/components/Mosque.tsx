import { useMemo } from 'react'
import * as THREE from 'three'
import { useScene } from './SceneContext'
import { DecorativeArch } from './DecorativeArch'
import { Chhatri } from './Chhatri'
import { cachedGeometry } from '../lib/geoCache'
import { bulbProfile, lotusCollarProfile, scaleUV, wallShape, type Opening } from '../lib/shapes'
import { MARBLE_TILE, SAND_TILE } from '../lib/materials'
import { MOSQUE_D, MOSQUE_H, MOSQUE_W } from '../lib/dimensions'

/*
 * Mosque and jawab.
 *
 * They are identical buildings — the jawab ("answer") on the east side exists
 * purely to balance the composition, since the mosque itself had to stand on
 * the west so that worshippers face Mecca. Both are red sandstone with white
 * marble domes, marble outlining and a tall central pishtaq facing the tomb.
 *
 * Local space: the building is MOSQUE_W wide along X, MOSQUE_D deep along Z,
 * and its front — the face that looks at the mausoleum — is at +Z.
 */

const CENTRE_ARCH = { w: 9.2, h: 14.2, spring: 6.4 }
const WING_ARCH = { w: 5.2, h: 9.4, spring: 4.4 }
const WING_X = [11.6, 20.8]
const PISHTAQ_W = 14.4

interface DomeSet {
  drum: THREE.BufferGeometry
  collar: THREE.BufferGeometry
  dome: THREE.BufferGeometry
  finial: THREE.BufferGeometry
  r: number
  drumH: number
  domeH: number
}

const FRONT_OPENINGS: Opening[] = [
  { x: 0, y: 0, ...CENTRE_ARCH },
  ...WING_X.flatMap((x) => [
    { x: -x, y: 0.4, ...WING_ARCH },
    { x, y: 0.4, ...WING_ARCH },
  ]),
]

export function Mosque({
  position,
  rotation = 0,
}: {
  position: [number, number, number]
  /** Rotate the whole building so its front faces the mausoleum. */
  rotation?: number
}) {
  const { q, mats } = useScene()
  const seg = Math.max(16, Math.round(q.segments * 0.6))

  const g = useMemo(
    () => ({
      plinth: cachedGeometry('mq.plinth', () => {
        const geo = new THREE.BoxGeometry(MOSQUE_W + 2.4, 1.3, MOSQUE_D + 2.4)
        return scaleUV(geo, (MOSQUE_W + 2.4) / SAND_TILE, (MOSQUE_D + 2.4) / SAND_TILE)
      }),
      front: cachedGeometry('mq.front', () => {
        const geo = new THREE.ExtrudeGeometry(wallShape(MOSQUE_W, MOSQUE_H, FRONT_OPENINGS), {
          depth: 1.8,
          bevelEnabled: false,
          curveSegments: 16,
        })
        geo.translate(0, 0, -1.8)
        return scaleUV(geo, 1 / SAND_TILE, 1 / SAND_TILE)
      }),
      /** Solid mass behind the front screen. */
      body: cachedGeometry('mq.body', () => {
        const geo = new THREE.BoxGeometry(MOSQUE_W, MOSQUE_H, MOSQUE_D - 2.4)
        return scaleUV(geo, MOSQUE_W / SAND_TILE, MOSQUE_H / SAND_TILE)
      }),
      pishtaq: cachedGeometry('mq.pishtaq', () => {
        const geo = new THREE.BoxGeometry(PISHTAQ_W + 2.6, MOSQUE_H + 3.4, 1.0)
        return scaleUV(geo, (PISHTAQ_W + 2.6) / SAND_TILE, (MOSQUE_H + 3.4) / SAND_TILE)
      }),
      /**
       * The mosque pishtaq is red sandstone *outlined* in white marble, not
       * faced in it. A solid marble panel here turns the building into a
       * blank white billboard, so this is a frame with the middle cut out.
       */
      pishtaqInset: cachedGeometry('mq.pishtaqInset', () => {
        const w = PISHTAQ_W
        const h = MOSQUE_H + 2.4
        const t = 0.85
        const shape = new THREE.Shape()
        shape.moveTo(-w / 2, 0)
        shape.lineTo(w / 2, 0)
        shape.lineTo(w / 2, h)
        shape.lineTo(-w / 2, h)
        shape.closePath()
        const hole = new THREE.Path()
        hole.moveTo(-w / 2 + t, t)
        hole.lineTo(w / 2 - t, t)
        hole.lineTo(w / 2 - t, h - t)
        hole.lineTo(-w / 2 + t, h - t)
        hole.closePath()
        shape.holes.push(hole)
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.42, bevelEnabled: false })
        return scaleUV(geo, 1 / MARBLE_TILE, 1 / MARBLE_TILE)
      }),
      cornice: cachedGeometry('mq.cornice', () => {
        const geo = new THREE.BoxGeometry(MOSQUE_W + 2.0, 0.9, MOSQUE_D + 2.0)
        return scaleUV(geo, (MOSQUE_W + 2) / SAND_TILE, (MOSQUE_D + 2) / SAND_TILE)
      }),
      parapet: cachedGeometry('mq.parapet', () => {
        const geo = new THREE.BoxGeometry(MOSQUE_W + 0.6, 1.5, MOSQUE_D + 0.6)
        return scaleUV(geo, (MOSQUE_W + 0.6) / MARBLE_TILE, 1)
      }),
      roof: cachedGeometry('mq.roof', () => {
        const geo = new THREE.BoxGeometry(MOSQUE_W - 0.6, 0.4, MOSQUE_D - 0.6)
        return scaleUV(geo, (MOSQUE_W - 0.6) / SAND_TILE, (MOSQUE_D - 0.6) / SAND_TILE)
      }),
    }),
    [],
  )

  /** Drum + bulbous marble dome, used three times per building. */
  const domeGeo = useMemo(() => {
    const make = (r: number, drumH: number, domeH: number, tag: string): DomeSet => ({
      drum: cachedGeometry(`mq.drum.${tag}`, () => new THREE.CylinderGeometry(r * 0.92, r * 0.98, drumH, seg)),
      collar: cachedGeometry(`mq.collar.${tag}`, () =>
        new THREE.LatheGeometry(lotusCollarProfile(r * 0.28, r, 0), seg),
      ),
      dome: cachedGeometry(`mq.dome.${tag}`, () => {
        const geo = new THREE.LatheGeometry(bulbProfile(domeH, r * 1.06, 26), seg)
        geo.computeVertexNormals()
        return geo
      }),
      finial: cachedGeometry(`mq.finial.${tag}`, () => new THREE.ConeGeometry(r * 0.14, r * 0.9, 8)),
      r,
      drumH,
      domeH,
    })
    return { big: make(6.4, 3.6, 8.6, 'big'), small: make(4.1, 2.4, 5.4, 'small') }
  }, [seg])

  const roofY = MOSQUE_H + 1.3

  const dome = (d: DomeSet, x: number) => (
    <group position={[x, roofY + 1.9, 0]} key={x}>
      <mesh geometry={d.drum} position={[0, d.drumH / 2, 0]} material={mats.marbleFine} castShadow receiveShadow />
      <mesh geometry={d.collar} position={[0, d.drumH, 0]} material={mats.marbleFine} castShadow />
      <mesh geometry={d.dome} position={[0, d.drumH + d.r * 0.18, 0]} material={mats.marble} castShadow receiveShadow />
      <mesh
        geometry={d.finial}
        position={[0, d.drumH + d.r * 0.18 + d.domeH + d.r * 0.4, 0]}
        material={mats.gold}
        castShadow
      />
    </group>
  )

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh geometry={g.plinth} position={[0, 0.65, 0]} material={mats.sandstone} castShadow receiveShadow />

      <group position={[0, 1.3, 0]}>
        <mesh geometry={g.body} position={[0, MOSQUE_H / 2, -1.2]} material={mats.sandstone} castShadow receiveShadow />
        <mesh geometry={g.front} position={[0, 0, MOSQUE_D / 2]} material={mats.sandstone} castShadow receiveShadow />

        {/* Projecting central pishtaq, outlined in marble. */}
        <mesh
          geometry={g.pishtaq}
          position={[0, (MOSQUE_H + 3.4) / 2, MOSQUE_D / 2 + 0.5]}
          material={mats.sandstone}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={g.pishtaqInset}
          position={[0, 0, MOSQUE_D / 2 + 1.05]}
          material={mats.marbleFine}
          castShadow
        />
        <DecorativeArch
          w={CENTRE_ARCH.w}
          h={CENTRE_ARCH.h}
          spring={CENTRE_ARCH.spring}
          depth={4.2}
          band={0.5}
          layers={2}
          stone="marble"
          back="dark"
          position={[0, 0, MOSQUE_D / 2 + 1.35]}
        />

        {FRONT_OPENINGS.slice(1).map((o, i) => (
          <DecorativeArch
            key={i}
            w={o.w}
            h={o.h}
            spring={o.spring}
            depth={2.4}
            band={0.4}
            layers={2}
            stone="sandstone"
            back="dark"
            position={[o.x, o.y, MOSQUE_D / 2]}
          />
        ))}

        {/* Blind arcading on the two end walls and the back. Without it the
            building reads as a plain red box from anywhere in the garden. */}
        {([
          [-1, -Math.PI / 2],
          [1, Math.PI / 2],
        ] as const).map(([s, rot]) =>
          [1.0, 10.4].map((y) => (
            <DecorativeArch
              key={`${s}_${y}`}
              w={5.0}
              h={7.6}
              spring={3.6}
              depth={1.4}
              band={0.36}
              layers={2}
              stone="sandstone"
              back="dark"
              position={[s * (MOSQUE_W / 2), y, -1.2]}
              rotation={[0, rot, 0]}
            />
          )),
        )}
        {[-18.4, 0, 18.4].map((x) => (
          <DecorativeArch
            key={`bk${x}`}
            w={5.0}
            h={8.4}
            spring={3.8}
            depth={1.4}
            band={0.36}
            layers={2}
            stone="sandstone"
            back="dark"
            position={[x, 1.0, -MOSQUE_D / 2 - 1.2]}
            rotation={[0, Math.PI, 0]}
          />
        ))}

        <mesh geometry={g.cornice} position={[0, MOSQUE_H - 0.2, 0]} material={mats.sandstoneFine} castShadow receiveShadow />
        <mesh geometry={g.roof} position={[0, MOSQUE_H + 0.4, 0]} material={mats.sandstoneFine} receiveShadow />
        <mesh geometry={g.parapet} position={[0, MOSQUE_H + 1.0, 0]} material={mats.marbleFine} castShadow receiveShadow />
      </group>

      {dome(domeGeo.big, 0)}
      {dome(domeGeo.small, -18.6)}
      {dome(domeGeo.small, 18.6)}

      {/* Corner turrets */}
      {([[-1, -1], [-1, 1], [1, -1], [1, 1]] as const).map(([sx, sz], i) => (
        <Chhatri
          key={i}
          radius={1.9}
          columnHeight={2.4}
          domeHeight={2.2}
          position={[sx * (MOSQUE_W / 2 - 1.2), roofY + 1.6, sz * (MOSQUE_D / 2 - 1.2)]}
          rotation={Math.PI / 8}
          stone="sandstone"
          detail={false}
        />
      ))}
    </group>
  )
}
