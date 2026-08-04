import { useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { useScene } from './SceneContext'
import { Chhatri } from './Chhatri'
import { cachedGeometry } from '../lib/geoCache'
import { scaleUV } from '../lib/shapes'
import { MINARET_H, MINARET_R_BASE, MINARET_R_TOP, MINARET_TILT } from '../lib/dimensions'

/**
 * The three shaft sections and the levels at which the galleries sit.
 * The real minarets are divided into three almost equal parts with a balcony
 * at each intersection, plus a top gallery carrying the chhatri.
 */
const SOCLE_H = 2.7
const GALLERY: { y: number; slab: number }[] = [
  { y: 14.4, slab: 1.15 },
  { y: 26.2, slab: 1.1 },
  { y: 36.4, slab: 1.05 },
]

function radiusAt(y: number) {
  const t = THREE.MathUtils.clamp((y - SOCLE_H) / (MINARET_H - SOCLE_H), 0, 1)
  return THREE.MathUtils.lerp(MINARET_R_BASE, MINARET_R_TOP, t)
}

/**
 * One minaret. Four of these stand at the corners of the marble plinth,
 * each leaning very slightly outward — the original builders' insurance
 * policy so that a collapse would fall away from the tomb.
 *
 * `outward` is the horizontal direction the minaret should lean towards.
 */
export function Minaret({
  position,
  outward,
}: {
  position: [number, number, number]
  outward: [number, number]
}) {
  const { q, mats } = useScene()
  const seg = Math.max(16, Math.round(q.segments * 0.75))

  const g = useMemo(() => {
    const k = `${seg}`
    const shaft = (y0: number, y1: number) =>
      cachedGeometry(`min.shaft.${y0}.${y1}.${k}`, () => {
        const geo = new THREE.CylinderGeometry(radiusAt(y1), radiusAt(y0), y1 - y0, seg, 1, true)
        return scaleUV(geo, 4, (y1 - y0) / 6)
      })

    return {
      socle: cachedGeometry(`min.socle.${k}`, () =>
        new THREE.CylinderGeometry(MINARET_R_BASE * 1.16, MINARET_R_BASE * 1.42, SOCLE_H, 8),
      ),
      socleCap: cachedGeometry(`min.soclecap.${k}`, () =>
        new THREE.CylinderGeometry(MINARET_R_BASE * 1.02, MINARET_R_BASE * 1.2, 0.6, seg),
      ),
      s0: shaft(SOCLE_H, GALLERY[0].y),
      s1: shaft(GALLERY[0].y + GALLERY[0].slab, GALLERY[1].y),
      s2: shaft(GALLERY[1].y + GALLERY[1].slab, GALLERY[2].y),
      band: cachedGeometry(`min.band.${k}`, () => new THREE.BoxGeometry(0.34, 1, 0.2)),
      bracket: cachedGeometry(`min.bracket.${k}`, () => new THREE.BoxGeometry(0.32, 0.8, 0.85)),
      // Gallery slab, railing and coping are shared across the three levels and
      // scaled per level, so one geometry serves all of them.
      slab: cachedGeometry(`min.slab.${k}`, () =>
        new THREE.CylinderGeometry(1, 0.94, 0.34, seg),
      ),
      rail: cachedGeometry(`min.rail.${k}`, () => {
        const geo = new THREE.CylinderGeometry(1, 1, 1, seg, 1, true)
        return scaleUV(geo, 9, 1)
      }),
      coping: cachedGeometry(`min.coping.${k}`, () =>
        new THREE.CylinderGeometry(1, 1, 0.16, seg),
      ),
    }
  }, [seg])

  /* Vertical panel strips: the shafts are not smooth cylinders, they are
     divided into narrow vertical bands separated by inlaid lines. */
  const bandXforms = useMemo(() => {
    const out: { pos: THREE.Vector3; rot: number; scale: THREE.Vector3 }[] = []
    const sections: [number, number][] = [
      [SOCLE_H + 0.4, GALLERY[0].y - 0.4],
      [GALLERY[0].y + GALLERY[0].slab + 0.4, GALLERY[1].y - 0.4],
      [GALLERY[1].y + GALLERY[1].slab + 0.4, GALLERY[2].y - 0.4],
    ]
    for (const [y0, y1] of sections) {
      const h = y1 - y0
      const mid = (y0 + y1) / 2
      const r = radiusAt(mid)
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2
        out.push({
          pos: new THREE.Vector3(Math.sin(a) * (r + 0.02), mid, Math.cos(a) * (r + 0.02)),
          rot: a,
          scale: new THREE.Vector3(1, h, 1),
        })
      }
    }
    return out
  }, [])

  const bracketXforms = useMemo(() => {
    const out: { pos: THREE.Vector3; rot: number }[] = []
    for (const gal of GALLERY) {
      const r = radiusAt(gal.y)
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + Math.PI / 16
        out.push({
          pos: new THREE.Vector3(Math.sin(a) * (r + 0.42), gal.y - 0.45, Math.cos(a) * (r + 0.42)),
          rot: a,
        })
      }
    }
    return out
  }, [])

  /* Callback refs: see the note in MarblePlatform on why these cannot be
     effects keyed on the transform list. */
  const bandsRef = useCallback(
    (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return
      const m = new THREE.Matrix4()
      const e = new THREE.Euler()
      const qt = new THREE.Quaternion()
      bandXforms.forEach((b, i) => {
        e.set(0, b.rot, 0)
        mesh.setMatrixAt(i, m.compose(b.pos, qt.setFromEuler(e), b.scale))
      })
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    },
    [bandXforms],
  )

  const bracketsRef = useCallback(
    (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return
      const m = new THREE.Matrix4()
      const e = new THREE.Euler()
      const qt = new THREE.Quaternion()
      const one = new THREE.Vector3(1, 1, 1)
      bracketXforms.forEach((b, i) => {
        e.set(0, b.rot, 0)
        mesh.setMatrixAt(i, m.compose(b.pos, qt.setFromEuler(e), one))
      })
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    },
    [bracketXforms],
  )

  const lean: [number, number, number] = [
    outward[1] * MINARET_TILT,
    0,
    -outward[0] * MINARET_TILT,
  ]

  return (
    <group position={position} rotation={lean}>
      <mesh geometry={g.socle} position={[0, SOCLE_H / 2, 0]} material={mats.marbleFine} castShadow receiveShadow />
      <mesh geometry={g.socleCap} position={[0, SOCLE_H + 0.2, 0]} material={mats.marbleFine} castShadow receiveShadow />

      <mesh
        geometry={g.s0}
        position={[0, (SOCLE_H + GALLERY[0].y) / 2, 0]}
        material={mats.marbleFine}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={g.s1}
        position={[0, (GALLERY[0].y + GALLERY[0].slab + GALLERY[1].y) / 2, 0]}
        material={mats.marbleFine}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={g.s2}
        position={[0, (GALLERY[1].y + GALLERY[1].slab + GALLERY[2].y) / 2, 0]}
        material={mats.marbleFine}
        castShadow
        receiveShadow
      />

      <instancedMesh ref={bandsRef} args={[g.band, mats.marbleShadow, bandXforms.length]} castShadow />
      <instancedMesh ref={bracketsRef} args={[g.bracket, mats.marbleFine, bracketXforms.length]} castShadow />

      {GALLERY.map((gal, i) => {
        const r = radiusAt(gal.y) + 1.15
        return (
          <group key={i} position={[0, gal.y, 0]}>
            <mesh
              geometry={g.slab}
              scale={[r, gal.slab, r]}
              position={[0, gal.slab * 0.17, 0]}
              material={mats.marbleFine}
              castShadow
              receiveShadow
            />
            <mesh
              geometry={g.rail}
              scale={[r * 0.96, 1.15, r * 0.96]}
              position={[0, gal.slab * 0.17 + 0.75, 0]}
              material={mats.jali}
              castShadow
            />
            <mesh
              geometry={g.coping}
              scale={[r * 1.0, 1, r * 1.0]}
              position={[0, gal.slab * 0.17 + 1.35, 0]}
              material={mats.marbleFine}
              castShadow
            />
          </group>
        )
      })}

      {/* Crowning kiosk. Its columns are proportionally slimmer than the
          roof chhatris, matching the real minaret pavilions. */}
      <Chhatri
        radius={radiusAt(MINARET_H) * 1.28}
        columnHeight={2.9}
        domeHeight={2.6}
        position={[0, GALLERY[2].y + GALLERY[2].slab + 0.5, 0]}
        rotation={Math.PI / 8}
        detail={q.chhatriDetail}
      />
    </group>
  )
}
