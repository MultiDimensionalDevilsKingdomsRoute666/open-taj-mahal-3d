import { useMemo } from 'react'
import * as THREE from 'three'
import { useScene } from './SceneContext'
import { ReflectingPool } from './ReflectingPool'
import { Fountains } from './Fountain'
import { CanopyTrees, Cypresses, type TreeInstance } from './Tree'
import { cachedGeometry } from '../lib/geoCache'
import { scaleUV } from '../lib/shapes'
import { MARBLE_TILE, PATH_TILE, SAND_TILE } from '../lib/materials'
import {
  CHANNEL_HALF_W,
  GARDEN_SIZE,
  GARDEN_Z0,
  GARDEN_Z1,
  POOL_Y,
  TANK_D,
  TANK_W,
  TANK_Z,
} from '../lib/dimensions'

/* ------------------------------------------------------------------ layout */

const HALF = GARDEN_SIZE / 2 // 150
/** Half-width of the paved corridor either side of each water channel. */
const WALK = 10
/** Extent of the raised central tank. */
const TANK_Z0 = TANK_Z - TANK_D / 2
const TANK_Z1 = TANK_Z + TANK_D / 2
/** Where the north and south reaches of the central channel begin and end. */
const CH_N0 = GARDEN_Z0 + 8
const CH_N1 = TANK_Z0
const CH_S0 = TANK_Z1
const CH_S1 = GARDEN_Z1 - 8

/** Deterministic PRNG so the garden lays out identically on every load. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * The Charbagh — the fourfold paradise garden.
 *
 * Two water channels cross at a raised marble tank, dividing the 300 m square
 * into four quadrants; minor paths divide each quadrant again into four, for
 * the sixteen parterres of the original plan. Cypresses line the main axis,
 * fountains run the length of the central channel, and the whole thing is
 * enclosed by a red sandstone wall.
 */
export function CharbaghGarden() {
  const { q, mats } = useScene()

  const g = useMemo(() => {
    const plane = (name: string, w: number, d: number, tile: number) =>
      cachedGeometry(`gd.${name}`, () => {
        const geo = new THREE.PlaneGeometry(w, d)
        geo.rotateX(-Math.PI / 2)
        return scaleUV(geo, w / tile, d / tile)
      })

    const box = (name: string, w: number, h: number, d: number, tile: number) =>
      cachedGeometry(`gd.${name}`, () => {
        const geo = new THREE.BoxGeometry(w, h, d)
        return scaleUV(geo, Math.max(w, d) / tile, h / tile)
      })

    // The walkways either side of a channel are separate strips: a single
    // slab across the corridor would roof over the water, which is exactly
    // the thing the whole composition is built around.
    const walkStrip = WALK - (CHANNEL_HALF_W + 1.1)

    /**
     * Quadrant size. The lawn is four separate parterres rather than one
     * plane across the whole garden: a single plane sits above the recessed
     * channels and hides the water completely, which is the one thing this
     * garden exists to show.
     */
    const quadW = HALF - WALK
    const quadD = GARDEN_SIZE / 2 - WALK

    return {
      lawn: plane('lawn', quadW, quadD, 7.5),
      quadW,
      quadD,
      axisWalk: plane('axisWalk', walkStrip, GARDEN_SIZE, PATH_TILE),
      axisCap: plane('axisCap', WALK * 2, 10, PATH_TILE),
      crossWalk: plane('crossWalk', GARDEN_SIZE, walkStrip, PATH_TILE),
      walkStrip,
      minorPathV: plane('minorPathV', 5, (GARDEN_SIZE - WALK * 2) / 2, PATH_TILE),
      minorPathH: plane('minorPathH', (GARDEN_SIZE - WALK * 2) / 2, 5, PATH_TILE),
      perimeterV: plane('perimeterV', 6, GARDEN_SIZE, PATH_TILE),
      perimeterH: plane('perimeterH', GARDEN_SIZE, 6, PATH_TILE),
      kerbV: box('kerbV', 1.1, 0.9, 1, MARBLE_TILE),
      kerbH: box('kerbH', 1, 0.9, 1.1, MARBLE_TILE),
      /**
       * The central tank is a raised marble rim around a recessed pool, not a
       * solid slab — a slab would roof over its own water.
       */
      tankRim: cachedGeometry('gd.tankRim', () => {
        const ow = TANK_W + 7
        const od = TANK_D + 7
        const shape = new THREE.Shape()
        shape.moveTo(-ow / 2, -od / 2)
        shape.lineTo(ow / 2, -od / 2)
        shape.lineTo(ow / 2, od / 2)
        shape.lineTo(-ow / 2, od / 2)
        shape.closePath()
        const hole = new THREE.Path()
        hole.moveTo(-TANK_W / 2, -TANK_D / 2)
        hole.lineTo(TANK_W / 2, -TANK_D / 2)
        hole.lineTo(TANK_W / 2, TANK_D / 2)
        hole.lineTo(-TANK_W / 2, TANK_D / 2)
        hole.closePath()
        shape.holes.push(hole)
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.15, bevelEnabled: false })
        geo.rotateX(-Math.PI / 2)
        return scaleUV(geo, 1 / MARBLE_TILE, 1 / MARBLE_TILE)
      }),
      tankStep: box('tankStep', TANK_W + 11, 0.55, TANK_D + 11, MARBLE_TILE),
      wall: box('wall', 1.8, 9, GARDEN_SIZE, SAND_TILE),
      wallCap: box('wallCap', 2.4, 0.6, GARDEN_SIZE, SAND_TILE),
      bench: box('bench', 3.2, 0.45, 0.9, MARBLE_TILE),
    }
  }, [])

  /* ---------------------------------------------------------- planting */

  const trees = useMemo(() => {
    const r = rng(20250804)
    const cypress: TreeInstance[] = []
    const canopy: TreeInstance[] = []

    // Cypress avenues flanking the central channel, on both reaches.
    for (const [z0, z1] of [
      [CH_N0, CH_N1],
      [CH_S0, CH_S1],
    ]) {
      const count = Math.max(4, Math.round((z1 - z0) / 13))
      for (let i = 0; i < count; i++) {
        const z = z0 + ((i + 0.5) / count) * (z1 - z0)
        for (const x of [-WALK + 1.6, WALK - 1.6]) {
          cypress.push({ x, z, scale: 0.92 + r() * 0.24, rot: r() * Math.PI })
        }
      }
    }
    // And along the cross axis.
    for (const dir of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const x = dir * (WALK + 8 + i * 14)
        if (Math.abs(x) > HALF - 12) continue
        for (const z of [TANK_Z - WALK + 1.6, TANK_Z + WALK - 1.6]) {
          cypress.push({ x, z, scale: 0.88 + r() * 0.22, rot: r() * Math.PI })
        }
      }
    }

    // Canopy trees scattered through the sixteen parterres.
    const budget = q.treeCount
    let guard = 0
    while (canopy.length < budget && guard < budget * 20) {
      guard++
      const x = (r() - 0.5) * 2 * (HALF - 10)
      const z = GARDEN_Z0 + 8 + r() * (GARDEN_SIZE - 16)
      // Keep the main axes and the cross axis clear.
      if (Math.abs(x) < WALK + 4) continue
      if (Math.abs(z - TANK_Z) < WALK + 4) continue
      // Leave a margin around the minor paths so trees do not sit on them.
      canopy.push({ x, z, scale: 0.78 + r() * 0.6, rot: r() * Math.PI * 2 })
    }
    return { cypress, canopy }
  }, [q.treeCount])

  /* --------------------------------------------------------- fountains */

  const fountainPositions = useMemo(() => {
    const out: [number, number][] = []
    for (const [z0, z1] of [
      [CH_N0 + 5, CH_N1 - 5],
      [CH_S0 + 5, CH_S1 - 5],
    ]) {
      const count = Math.max(3, Math.round((z1 - z0) / 11))
      for (let i = 0; i < count; i++) {
        out.push([0, z0 + ((i + 0.5) / count) * (z1 - z0)])
      }
    }
    return out
  }, [])

  /* ------------------------------------------------------------ render */

  const quadrantPaths = useMemo(() => {
    const out: { pos: [number, number, number]; horizontal: boolean }[] = []
    const qHalf = (HALF - WALK) / 2
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const cx = sx * (WALK + qHalf)
        const cz = TANK_Z + sz * (WALK + (GARDEN_SIZE / 2 - WALK) / 2)
        out.push({ pos: [cx, 0.03, cz], horizontal: false })
        out.push({ pos: [cx, 0.03, cz], horizontal: true })
      }
    }
    return out
  }, [])

  const channelY = POOL_Y

  return (
    <group>
      {/* --- the four parterres --- */}
      {([-1, 1] as const).map((sx) =>
        ([-1, 1] as const).map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            geometry={g.lawn}
            position={[sx * (WALK + g.quadW / 2), -0.02, TANK_Z + sz * (WALK + g.quadD / 2)]}
            material={mats.grass}
            receiveShadow
          />
        )),
      )}

      {/* --- paved axes, split around the water channels --- */}
      {[-1, 1].map((s) => (
        <mesh
          key={`aw${s}`}
          geometry={g.axisWalk}
          position={[s * (CHANNEL_HALF_W + 1.1 + g.walkStrip / 2), 0.02, GARDEN_Z0 + GARDEN_SIZE / 2]}
          material={mats.pathway}
          receiveShadow
        />
      ))}
      {[-1, 1].map((s) => (
        <mesh
          key={`cw${s}`}
          geometry={g.crossWalk}
          position={[0, 0.02, TANK_Z + s * (CHANNEL_HALF_W + 1.1 + g.walkStrip / 2)]}
          material={mats.pathway}
          receiveShadow
        />
      ))}
      {/* Solid paving where the channel stops short of each end. */}
      {[GARDEN_Z0 + 4, GARDEN_Z1 - 4].map((z) => (
        <mesh key={`ac${z}`} geometry={g.axisCap} position={[0, 0.021, z]} material={mats.pathway} receiveShadow />
      ))}
      {quadrantPaths.map((p, i) => (
        <mesh
          key={i}
          geometry={p.horizontal ? g.minorPathH : g.minorPathV}
          position={p.pos}
          material={mats.pathway}
          receiveShadow
        />
      ))}
      {[-1, 1].map((s) => (
        <mesh
          key={`pv${s}`}
          geometry={g.perimeterV}
          position={[s * (HALF - 4), 0.02, GARDEN_Z0 + GARDEN_SIZE / 2]}
          material={mats.pathway}
          receiveShadow
        />
      ))}
      {[GARDEN_Z0 + 4, GARDEN_Z1 - 4].map((z) => (
        <mesh key={`ph${z}`} geometry={g.perimeterH} position={[0, 0.02, z]} material={mats.pathway} receiveShadow />
      ))}

      {/*
        The central channel, in two reaches either side of the tank.

        The northern reach is the one everybody photographs — you stand at the
        tank and the tomb doubles in the water in front of you — so it gets the
        real planar reflection first. The southern reach only earns a second
        render pass on Ultra.
      */}
      {[
        { z0: CH_N0, z1: CH_N1, reflective: true },
        { z0: CH_S0, z1: CH_S1, reflective: q.reflectorRes >= 512 },
      ].map(({ z0, z1, reflective }, i) => (
        <group key={i}>
          <ReflectingPool
            width={CHANNEL_HALF_W * 2}
            length={z1 - z0}
            position={[0, channelY, (z0 + z1) / 2]}
            reflective={reflective}
          />
          {[-1, 1].map((s) => (
            <mesh
              key={s}
              geometry={g.kerbV}
              scale={[1, 1, z1 - z0]}
              position={[s * (CHANNEL_HALF_W + 0.55), -0.35, (z0 + z1) / 2]}
              material={mats.marbleFine}
              receiveShadow
              castShadow
            />
          ))}
        </group>
      ))}

      {/* --- cross channel --- */}
      {[-1, 1].map((s) => {
        const x0 = s * (TANK_W / 2 + 3)
        const x1 = s * (HALF - 8)
        return (
          <group key={s}>
            <ReflectingPool
              width={Math.abs(x1 - x0)}
              length={CHANNEL_HALF_W * 2}
              position={[(x0 + x1) / 2, channelY, TANK_Z]}
            />
            {[-1, 1].map((t) => (
              <mesh
                key={t}
                geometry={g.kerbH}
                scale={[Math.abs(x1 - x0), 1, 1]}
                position={[(x0 + x1) / 2, -0.35, TANK_Z + t * (CHANNEL_HALF_W + 0.55)]}
                material={mats.marbleFine}
                receiveShadow
                castShadow
              />
            ))}
          </group>
        )
      })}

      {/* --- raised marble tank at the crossing --- */}
      <mesh geometry={g.tankStep} position={[0, 0.27, TANK_Z]} material={mats.marbleFine} receiveShadow castShadow />
      <mesh geometry={g.tankRim} position={[0, 0.55, TANK_Z]} material={mats.marbleFloor} receiveShadow castShadow />
      {/* Each planar reflector costs a whole extra pass over the scene, so
          Balanced spends its one reflection on the northern channel — the
          view everybody actually photographs — and the tank falls back to
          the environment map. */}
      <ReflectingPool
        width={TANK_W - 0.4}
        length={TANK_D - 0.4}
        position={[0, 1.0, TANK_Z]}
        reflective={q.reflectorRes >= 512}
      />

      <Fountains positions={fountainPositions} y={channelY + 0.05} />

      {/* --- planting --- */}
      <Cypresses items={trees.cypress} />
      <CanopyTrees items={trees.canopy} />

      {/* --- enclosing wall --- */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh
            geometry={g.wall}
            position={[s * (HALF + 1), 4.5, GARDEN_Z0 + GARDEN_SIZE / 2]}
            material={mats.sandstone}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={g.wallCap}
            position={[s * (HALF + 1), 9.2, GARDEN_Z0 + GARDEN_SIZE / 2]}
            material={mats.sandstoneFine}
            castShadow
          />
        </group>
      ))}

      {/* --- benches along the cross axis --- */}
      {[-1, 1].map((s) =>
        [-1, 1].map((t) => (
          <mesh
            key={`${s}${t}`}
            geometry={g.bench}
            position={[s * (WALK + 16), 0.25, TANK_Z + t * (WALK - 3)]}
            material={mats.marbleFine}
            castShadow
            receiveShadow
          />
        )),
      )}
    </group>
  )
}
