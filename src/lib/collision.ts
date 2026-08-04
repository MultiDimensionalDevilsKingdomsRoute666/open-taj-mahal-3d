import * as THREE from 'three'
import {
  CHANNEL_HALF_W,
  GARDEN_Z0,
  GARDEN_Z1,
  GATE_D,
  GATE_W,
  GATE_Z,
  MAUS_W,
  MINARET_OFFSET,
  MINARET_R_BASE,
  MOSQUE_D,
  MOSQUE_OFFSET,
  MOSQUE_W,
  PLINTH_SIZE,
  PLINTH_TOP,
  RIVER_Z_NEAR,
  TANK_D,
  TANK_W,
  TANK_Z,
  TERRACE_D,
  TERRACE_H,
  TERRACE_W,
  TERRACE_Z,
  WORLD_RADIUS,
} from './dimensions'

/**
 * Collision and ground height for walk mode.
 *
 * Rather than raycasting against the scene every frame — which for geometry
 * this dense would be both slow and unreliable through the pierced walls —
 * the walkable world is described analytically: a short list of solid boxes
 * and cylinders to push out of, and a height function for the terraces.
 */

export interface Box {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface Cylinder {
  x: number
  z: number
  r: number
}

const box = (cx: number, cz: number, w: number, d: number): Box => ({
  minX: cx - w / 2,
  maxX: cx + w / 2,
  minZ: cz - d / 2,
  maxZ: cz + d / 2,
})

/* Reaches of the central channel, mirroring the layout in CharbaghGarden. */
const CH_N0 = GARDEN_Z0 + 8
const CH_N1 = TANK_Z - TANK_D / 2
const CH_S0 = TANK_Z + TANK_D / 2
const CH_S1 = GARDEN_Z1 - 8

/** Solids you can never walk into, at any height you can reach on foot. */
export const SOLIDS: Box[] = [
  // The tomb. Approximated by its bounding square, inset far enough that you
  // can step into the mouth of a great iwan and look up into the vault
  // without being able to walk through the back wall.
  box(0, 0, MAUS_W - 12, MAUS_W - 12),
  // Mosque and jawab.
  box(-MOSQUE_OFFSET, 0, MOSQUE_D + 2.4, MOSQUE_W + 2.4),
  box(MOSQUE_OFFSET, 0, MOSQUE_D + 2.4, MOSQUE_W + 2.4),
  // The two solid flanks of the great gate; the passage between stays open.
  box(-(GATE_W / 4 + 11 / 4), GATE_Z, (GATE_W - 11) / 2 + 4, GATE_D + 4),
  box(GATE_W / 4 + 11 / 4, GATE_Z, (GATE_W - 11) / 2 + 4, GATE_D + 4),
  // Garden boundary walls.
  box(-152, (GARDEN_Z0 + GARDEN_Z1) / 2, 6, 302),
  box(152, (GARDEN_Z0 + GARDEN_Z1) / 2, 6, 302),

  /*
   * The water. Without these you walk straight down the middle of the
   * reflecting pool, which looks absurd. The walkways either side are ~6 m
   * wide, and the axis can still be crossed at both ends of the garden and
   * over the raised rim of the central tank.
   */
  box(0, (CH_N0 + CH_N1) / 2, CHANNEL_HALF_W * 2 + 1.4, CH_N1 - CH_N0),
  box(0, (CH_S0 + CH_S1) / 2, CHANNEL_HALF_W * 2 + 1.4, CH_S1 - CH_S0),
  box(0, TANK_Z, TANK_W, TANK_D),
  box(-(TANK_W / 2 + 3 + 134 / 2), TANK_Z, 134, CHANNEL_HALF_W * 2 + 1.4),
  box(TANK_W / 2 + 3 + 134 / 2, TANK_Z, 134, CHANNEL_HALF_W * 2 + 1.4),
]

/** The raised marble tank platform, which you can walk across. */
const TANK_STEP = box(0, TANK_Z, TANK_W + 11, TANK_D + 11)
const TANK_RIM = box(0, TANK_Z, TANK_W + 7, TANK_D + 7)

export const MINARETS: Cylinder[] = [
  { x: MINARET_OFFSET, z: MINARET_OFFSET, r: MINARET_R_BASE * 1.5 },
  { x: -MINARET_OFFSET, z: MINARET_OFFSET, r: MINARET_R_BASE * 1.5 },
  { x: MINARET_OFFSET, z: -MINARET_OFFSET, r: MINARET_R_BASE * 1.5 },
  { x: -MINARET_OFFSET, z: -MINARET_OFFSET, r: MINARET_R_BASE * 1.5 },
]

const TERRACE = box(0, TERRACE_Z, TERRACE_W, TERRACE_D)
const PLINTH = box(0, 0, PLINTH_SIZE, PLINTH_SIZE)

/** Where the stairs are, so you can actually get up onto the terraces. */
const TERRACE_STAIR = box(0, TERRACE_Z + TERRACE_D / 2 + 3.2, 26, 8)
const PLINTH_STAIR = box(0, PLINTH_SIZE / 2 + 4.4, 16, 9)

function inside(b: Box, x: number, z: number, pad = 0): boolean {
  return x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad
}

function ramp(b: Box, x: number, z: number, from: number, to: number): number | null {
  if (!inside(b, x, z)) return null
  // Stairs run north-south; interpolate on Z.
  const t = THREE.MathUtils.clamp((b.maxZ - z) / (b.maxZ - b.minZ), 0, 1)
  return THREE.MathUtils.lerp(from, to, t)
}

/** Height of the walkable surface under a given point. */
export function groundHeight(x: number, z: number): number {
  const onPlinthStair = ramp(PLINTH_STAIR, x, z, TERRACE_H, PLINTH_TOP)
  if (onPlinthStair !== null) return onPlinthStair
  if (inside(PLINTH, x, z)) return PLINTH_TOP

  const onTerraceStair = ramp(TERRACE_STAIR, x, z, 0, TERRACE_H)
  if (onTerraceStair !== null) return onTerraceStair
  if (inside(TERRACE, x, z)) return TERRACE_H

  // The central tank is a two-step marble platform.
  if (inside(TANK_RIM, x, z)) return 1.7
  if (inside(TANK_STEP, x, z)) return 0.55

  return 0
}

/**
 * Push a proposed position out of anything solid and clamp it to the world.
 * Returns the corrected position; the caller keeps its own velocity.
 */
export function resolve(pos: THREE.Vector3, radius: number): THREE.Vector3 {
  let { x, z } = pos

  for (const b of SOLIDS) {
    if (!inside(b, x, z, radius)) continue
    // Push out along whichever axis needs the least correction.
    const dxMin = x - (b.minX - radius)
    const dxMax = b.maxX + radius - x
    const dzMin = z - (b.minZ - radius)
    const dzMax = b.maxZ + radius - z
    const m = Math.min(dxMin, dxMax, dzMin, dzMax)
    if (m === dxMin) x = b.minX - radius
    else if (m === dxMax) x = b.maxX + radius
    else if (m === dzMin) z = b.minZ - radius
    else z = b.maxZ + radius
  }

  for (const c of MINARETS) {
    const dx = x - c.x
    const dz = z - c.z
    const d = Math.hypot(dx, dz)
    const min = c.r + radius
    if (d < min && d > 1e-4) {
      x = c.x + (dx / d) * min
      z = c.z + (dz / d) * min
    }
  }

  // Never walk off the north side into the river, and never leave the site.
  if (z < RIVER_Z_NEAR + 8) z = RIVER_Z_NEAR + 8
  const dist = Math.hypot(x, z - 140)
  if (dist > WORLD_RADIUS) {
    x = (x / dist) * WORLD_RADIUS
    z = 140 + ((z - 140) / dist) * WORLD_RADIUS
  }

  pos.x = x
  pos.z = z
  return pos
}
