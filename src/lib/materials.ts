import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import {
  calligraphyBandTexture,
  foliageTexture,
  grassTexture,
  jaliTexture,
  marblePavingTexture,
  marbleTextures,
  pathwayTexture,
  pietraDuraTexture,
  sandstoneTextures,
} from './textures'
import type { Quality, TimePreset } from './settings'
import { QUALITY } from './settings'

/**
 * Texel density is controlled per geometry rather than per material: building
 * materials tile once per UV unit, and each geometry scales its own UVs so
 * that one texture repeat covers this many metres. Keeping it in one place is
 * what stops the marble from looking like different stone on different walls.
 */
export const MARBLE_TILE = 5.5
export const SAND_TILE = 4
export const PATH_TILE = 6

/** Clone a texture so it can carry its own tiling without touching the original. */
function tiled(t: THREE.Texture, x: number, y: number, aniso: number): THREE.Texture {
  const c = t.clone()
  c.wrapS = c.wrapT = THREE.RepeatWrapping
  c.repeat.set(x, y)
  c.anisotropy = aniso
  c.needsUpdate = true
  return c
}

export interface Materials {
  /** The main body of the mausoleum: large-format marble. */
  marble: THREE.MeshStandardMaterial
  /** Finer tiling for minarets, chhatris and small mouldings. */
  marbleFine: THREE.MeshStandardMaterial
  /** Underfoot: the paved plinth. */
  marbleFloor: THREE.MeshStandardMaterial
  /** Inside the recesses: the same stone reading darker in permanent shade. */
  marbleShadow: THREE.MeshStandardMaterial
  /**
   * Back-face material for hollow reveals. A niche is modelled as a solid arch
   * prism drawn inside-out, which yields jambs, curved soffit and back wall
   * from a single geometry.
   */
  recess: THREE.MeshStandardMaterial
  sandstone: THREE.MeshStandardMaterial
  sandstoneFine: THREE.MeshStandardMaterial
  /** Pietra dura floral inlay panels. */
  inlay: THREE.MeshStandardMaterial
  /** The calligraphic band framing the great arches. */
  calligraphy: THREE.MeshStandardMaterial
  /** Pierced marble screen, alpha-tested. */
  jali: THREE.MeshStandardMaterial
  /** The gilded finial and the crescent. */
  gold: THREE.MeshStandardMaterial
  /** Near-black interior seen through doorways and windows. */
  opening: THREE.MeshStandardMaterial
  grass: THREE.MeshStandardMaterial
  pathway: THREE.MeshStandardMaterial
  bark: THREE.MeshStandardMaterial
  cypress: THREE.MeshStandardMaterial
  canopy: THREE.MeshStandardMaterial
  ground: THREE.MeshStandardMaterial
  all: THREE.Material[]
}

function build(quality: Quality): Materials {
  const q = QUALITY[quality]
  // Texture generation is CPU-bound procedural noise, so resolution is the
  // main lever on how long the loading screen lasts. 512 already gives ~93
  // texels per metre at the tiling densities below.
  const size = quality === 'ultra' ? 768 : 512
  const m = marbleTextures(size)
  const s = sandstoneTextures(512)
  const aniso = q.anisotropy

  const marble = new THREE.MeshStandardMaterial({
    map: tiled(m.map, 1, 1, aniso),
    normalMap: tiled(m.normalMap, 1, 1, aniso),
    roughnessMap: tiled(m.roughnessMap, 1, 1, aniso),
    normalScale: new THREE.Vector2(0.32, 0.32),
    roughness: 1,
    metalness: 0.02,
    color: '#ffffff',
  })

  const marbleFine = new THREE.MeshStandardMaterial({
    map: tiled(m.map, 1, 1, aniso),
    normalMap: tiled(m.normalMap, 1, 1, aniso),
    roughnessMap: tiled(m.roughnessMap, 1, 1, aniso),
    normalScale: new THREE.Vector2(0.26, 0.26),
    roughness: 1,
    metalness: 0.02,
  })

  const marbleFloor = new THREE.MeshStandardMaterial({
    map: tiled(marblePavingTexture(), 24, 24, aniso),
    normalMap: tiled(m.normalMap, 24, 24, aniso),
    normalScale: new THREE.Vector2(0.16, 0.16),
    roughness: 0.42,
    metalness: 0.02,
  })

  const marbleShadow = new THREE.MeshStandardMaterial({
    map: tiled(m.map, 1, 1, aniso),
    normalMap: tiled(m.normalMap, 1, 1, aniso),
    normalScale: new THREE.Vector2(0.3, 0.3),
    color: '#b9b2a5',
    roughness: 0.62,
    metalness: 0.0,
  })

  const recess = new THREE.MeshStandardMaterial({
    map: tiled(m.map, 1, 1, aniso),
    normalMap: tiled(m.normalMap, 1, 1, aniso),
    normalScale: new THREE.Vector2(0.24, 0.24),
    color: '#8e887d',
    roughness: 0.72,
    metalness: 0,
    side: THREE.BackSide,
  })

  const sandstone = new THREE.MeshStandardMaterial({
    map: tiled(s.map, 1, 1, aniso),
    normalMap: tiled(s.normalMap, 1, 1, aniso),
    roughnessMap: tiled(s.roughnessMap, 1, 1, aniso),
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughness: 1,
    metalness: 0,
  })

  const sandstoneFine = new THREE.MeshStandardMaterial({
    map: tiled(s.map, 1, 1, aniso),
    normalMap: tiled(s.normalMap, 1, 1, aniso),
    roughnessMap: tiled(s.roughnessMap, 1, 1, aniso),
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughness: 1,
    metalness: 0,
  })

  const inlay = new THREE.MeshStandardMaterial({
    map: pietraDuraTexture(quality === 'performance' ? 256 : 512),
    roughness: 0.3,
    metalness: 0.08,
  })

  const calligraphy = new THREE.MeshStandardMaterial({
    map: calligraphyBandTexture(2048, 256),
    roughness: 0.34,
    metalness: 0.02,
  })

  const jali = new THREE.MeshStandardMaterial({
    map: jaliTexture(512, 7),
    transparent: true,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 0.4,
    metalness: 0.02,
  })
  jali.alphaMap = jali.map

  const gold = new THREE.MeshStandardMaterial({
    color: '#c9a24a',
    roughness: 0.26,
    metalness: 0.95,
  })

  const opening = new THREE.MeshStandardMaterial({
    color: '#14100c',
    roughness: 0.9,
    metalness: 0,
  })

  const grass = new THREE.MeshStandardMaterial({
    map: tiled(grassTexture(), 40, 40, aniso),
    roughness: 0.94,
    metalness: 0,
  })

  const pathway = new THREE.MeshStandardMaterial({
    map: tiled(pathwayTexture(), 1, 1, aniso),
    normalMap: tiled(s.normalMap, 1, 1, aniso),
    normalScale: new THREE.Vector2(0.4, 0.4),
    roughness: 0.86,
    metalness: 0,
  })

  const bark = new THREE.MeshStandardMaterial({ color: '#4a3b2c', roughness: 0.95 })
  const cypress = new THREE.MeshStandardMaterial({ color: '#2f4a2c', roughness: 0.9 })
  const canopy = new THREE.MeshStandardMaterial({
    map: foliageTexture(256, '#3f5f34'),
    transparent: true,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.9,
    depthWrite: true,
  })
  // Dusty plain beyond the walls. Kept independent of the sandstone tint so
  // the horizon does not turn brick red.
  const ground = new THREE.MeshStandardMaterial({ color: '#9c9070', roughness: 1 })

  const all = [
    marble, marbleFine, marbleFloor, marbleShadow, recess, sandstone, sandstoneFine,
    inlay, calligraphy, jali, gold, opening, grass, pathway, bark, cypress, canopy, ground,
  ]

  return {
    marble, marbleFine, marbleFloor, marbleShadow, recess, sandstone, sandstoneFine,
    inlay, calligraphy, jali, gold, opening, grass, pathway, bark, cypress, canopy, ground, all,
  }
}

/**
 * Shared material set. Rebuilt only when the quality profile changes (texture
 * resolution and anisotropy are baked in); the time-of-day tint is applied as
 * a cheap colour multiply so switching from day to moonlight costs nothing.
 */
export function useMaterials(quality: Quality, preset: TimePreset): Materials {
  const mats = useMemo(() => build(quality), [quality])

  useEffect(() => () => {
    mats.all.forEach((mat) => {
      const std = mat as THREE.MeshStandardMaterial
      // Textures on these materials are per-material clones; the underlying
      // images live in the texture cache and are released separately.
      std.map?.dispose()
      std.normalMap?.dispose()
      std.roughnessMap?.dispose()
      mat.dispose()
    })
  }, [mats])

  useEffect(() => {
    const marbleTint = new THREE.Color(preset.marbleTint)
    const sandTint = new THREE.Color(preset.sandstoneTint)
    const grassTint = new THREE.Color(preset.grassTint)

    mats.marble.color.copy(marbleTint)
    mats.marbleFine.color.copy(marbleTint)
    mats.marbleFloor.color.copy(marbleTint).multiplyScalar(0.94)
    mats.marbleShadow.color.copy(marbleTint).multiplyScalar(0.68)
    mats.recess.color.copy(marbleTint).multiplyScalar(0.4)
    mats.inlay.color.copy(marbleTint)
    mats.calligraphy.color.copy(marbleTint)
    mats.jali.color.copy(marbleTint)
    mats.sandstone.color.copy(sandTint)
    mats.sandstoneFine.color.copy(sandTint)
    mats.pathway.color.copy(sandTint)
    mats.grass.color.copy(grassTint)
    mats.cypress.color.copy(grassTint).multiplyScalar(0.85)
    mats.canopy.color.copy(grassTint)
    mats.ground.color.set('#9c9070').lerp(grassTint, 0.35).multiplyScalar(0.92)

    // Night needs the marble to catch more of the sky so it reads as luminous.
    const e = preset.envIntensity
    mats.marble.envMapIntensity = e * 1.15
    mats.marbleFine.envMapIntensity = e * 1.15
    mats.marbleFloor.envMapIntensity = e * 0.9
    mats.marbleShadow.envMapIntensity = e * 0.7
    mats.recess.envMapIntensity = e * 0.3
    mats.inlay.envMapIntensity = e
    mats.calligraphy.envMapIntensity = e
    mats.jali.envMapIntensity = e
    mats.gold.envMapIntensity = e * 1.6
    mats.sandstone.envMapIntensity = e * 0.75
    mats.sandstoneFine.envMapIntensity = e * 0.75
    mats.opening.envMapIntensity = e * 0.25

    mats.all.forEach((m) => (m.needsUpdate = true))
  }, [mats, preset])

  return mats
}
