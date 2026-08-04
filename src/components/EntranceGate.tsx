import { useMemo } from 'react'
import * as THREE from 'three'
import { useScene } from './SceneContext'
import { DecorativeArch } from './DecorativeArch'
import { ChhatriRow } from './ChhatriRow'
import { cachedGeometry } from '../lib/geoCache'
import { bulbProfile, scaleUV } from '../lib/shapes'
import { MARBLE_TILE, SAND_TILE } from '../lib/materials'
import { GATE_D, GATE_H, GATE_W, GATE_Z } from '../lib/dimensions'

/** Clear dimensions of the passage cut through the gate. */
const PASSAGE_W = 11
const PASSAGE_H = 19.5
const ARCH_W = 10.4
const ARCH_H = 17.5
const ARCH_SPRING = 8.4
const PISHTAQ_W = 20
const BAND_W = 1.5

/**
 * The Darwaza-i rauza — the great gate.
 *
 * Visitors enter through it and the tomb is deliberately framed by its arch,
 * appearing to shrink as you walk towards it. Red sandstone inlaid with white
 * marble, a tall pishtaq on each face carrying a calligraphic band, octagonal
 * corner towers, and twenty-two small marble chhatris along the parapet — one
 * for each year the monument took to build.
 */
export function EntranceGate() {
  const { q, mats } = useScene()
  const seg = Math.max(12, Math.round(q.segments * 0.5))

  const g = useMemo(
    () => ({
      plinth: cachedGeometry('gate.plinth', () => {
        const geo = new THREE.BoxGeometry(GATE_W + 4, 1.6, GATE_D + 4)
        return scaleUV(geo, (GATE_W + 4) / SAND_TILE, (GATE_D + 4) / SAND_TILE)
      }),
      // Two solid flanks and a lintel block leave a clear passage between them.
      flank: cachedGeometry('gate.flank', () => {
        const w = (GATE_W - PASSAGE_W) / 2
        const geo = new THREE.BoxGeometry(w, GATE_H, GATE_D)
        return scaleUV(geo, w / SAND_TILE, GATE_H / SAND_TILE)
      }),
      lintel: cachedGeometry('gate.lintel', () => {
        const h = GATE_H - PASSAGE_H
        const geo = new THREE.BoxGeometry(PASSAGE_W, h, GATE_D)
        return scaleUV(geo, PASSAGE_W / SAND_TILE, h / SAND_TILE)
      }),
      soffit: cachedGeometry('gate.soffit', () => {
        const geo = new THREE.BoxGeometry(PASSAGE_W, 0.3, GATE_D)
        return scaleUV(geo, PASSAGE_W / SAND_TILE, GATE_D / SAND_TILE)
      }),
      pishtaq: cachedGeometry('gate.pishtaq', () => {
        const geo = new THREE.BoxGeometry(PISHTAQ_W + BAND_W * 2, GATE_H + 2.6, 1.1)
        return scaleUV(geo, (PISHTAQ_W + BAND_W * 2) / SAND_TILE, (GATE_H + 2.6) / SAND_TILE)
      }),
      bandV: cachedGeometry('gate.bandV', () => {
        const geo = new THREE.BoxGeometry(GATE_H + 2.6, BAND_W, 0.5)
        return scaleUV(geo, (GATE_H + 2.6) / (BAND_W * 4), 1)
      }),
      bandH: cachedGeometry('gate.bandH', () => {
        const geo = new THREE.BoxGeometry(PISHTAQ_W + BAND_W * 2, BAND_W, 0.5)
        return scaleUV(geo, (PISHTAQ_W + BAND_W * 2) / (BAND_W * 4), 1)
      }),
      tower: cachedGeometry('gate.tower', () => {
        const geo = new THREE.CylinderGeometry(3.1, 3.5, GATE_H + 2.0, 8)
        return scaleUV(geo, 4, (GATE_H + 2) / SAND_TILE)
      }),
      towerCap: cachedGeometry('gate.towerCap', () =>
        new THREE.CylinderGeometry(3.5, 3.2, 0.7, 8),
      ),
      towerDome: cachedGeometry('gate.towerDome', () => {
        const geo = new THREE.LatheGeometry(bulbProfile(4.2, 3.2, 22), seg)
        geo.computeVertexNormals()
        return geo
      }),
      cornice: cachedGeometry('gate.cornice', () => {
        const geo = new THREE.BoxGeometry(GATE_W + 2.4, 0.9, GATE_D + 2.4)
        return scaleUV(geo, (GATE_W + 2.4) / SAND_TILE, (GATE_D + 2.4) / SAND_TILE)
      }),
      parapet: cachedGeometry('gate.parapet', () => {
        const geo = new THREE.BoxGeometry(GATE_W + 0.8, 1.8, GATE_D + 0.8)
        return scaleUV(geo, (GATE_W + 0.8) / MARBLE_TILE, 1)
      }),
      roof: cachedGeometry('gate.roof', () => {
        const geo = new THREE.BoxGeometry(GATE_W - 0.4, 0.4, GATE_D - 0.4)
        return scaleUV(geo, (GATE_W - 0.4) / SAND_TILE, (GATE_D - 0.4) / SAND_TILE)
      }),
      inlayPanel: cachedGeometry('gate.inlay', () => new THREE.PlaneGeometry(3.4, 3.4)),
    }),
    [seg],
  )

  const flankX = (GATE_W - PASSAGE_W) / 4 + PASSAGE_W / 2
  const roofY = 1.6 + GATE_H

  /** Chhatris march along the north and south edges of the parapet. */
  const chhatriPositions = useMemo(() => {
    const perSide = q.segments >= 56 ? 11 : q.segments >= 36 ? 7 : 5
    const out: [number, number, number][] = []
    for (const dz of [-1, 1]) {
      for (let i = 0; i < perSide; i++) {
        const t = ((i + 0.5) / perSide - 0.5) * (GATE_W - 6)
        out.push([t, roofY + 2.4, dz * (GATE_D / 2 - 2.2)])
      }
    }
    return out
  }, [q.segments, roofY])

  /** The pishtaq assembly, repeated on the garden face and the outer face. */
  const face = (sign: 1 | -1) => (
    <group key={sign} position={[0, 0, (sign * GATE_D) / 2]} rotation={[0, sign > 0 ? 0 : Math.PI, 0]}>
      <mesh geometry={g.pishtaq} position={[0, (GATE_H + 2.6) / 2, 0.55]} material={mats.sandstone} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          geometry={g.bandV}
          position={[(s * (PISHTAQ_W + BAND_W)) / 2, (GATE_H + 2.6) / 2, 1.34]}
          rotation={[0, 0, Math.PI / 2]}
          material={mats.calligraphy}
          castShadow
        />
      ))}
      <mesh
        geometry={g.bandH}
        position={[0, GATE_H + 2.6 - BAND_W / 2, 1.34]}
        material={mats.calligraphy}
        castShadow
      />
      <DecorativeArch
        w={ARCH_W}
        h={ARCH_H}
        spring={ARCH_SPRING}
        depth={3.4}
        band={0.55}
        layers={2}
        stone="sandstone"
        back="none"
        position={[0, 0, 1.15]}
      />
      {[-1, 1].map((s) => (
        <mesh
          key={`i${s}`}
          geometry={g.inlayPanel}
          position={[s * 7.4, ARCH_H - 1.4, 1.18]}
          material={mats.inlay}
        />
      ))}
      {/* Small blind niches flanking the great arch, two tiers. */}
      {[-1, 1].map((s) =>
        [1.0, 11.0].map((y) => (
          <DecorativeArch
            key={`${s}_${y}`}
            w={3.6}
            h={7.2}
            spring={3.4}
            depth={1.3}
            band={0.34}
            layers={2}
            stone="sandstone"
            back="dark"
            position={[s * 16.6, y, 0.06]}
          />
        )),
      )}
    </group>
  )

  return (
    <group position={[0, 0, GATE_Z]}>
      <mesh geometry={g.plinth} position={[0, 0.8, 0]} material={mats.sandstone} castShadow receiveShadow />

      <group position={[0, 1.6, 0]}>
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            geometry={g.flank}
            position={[s * flankX, GATE_H / 2, 0]}
            material={mats.sandstone}
            castShadow
            receiveShadow
          />
        ))}
        <mesh
          geometry={g.lintel}
          position={[0, PASSAGE_H + (GATE_H - PASSAGE_H) / 2, 0]}
          material={mats.sandstone}
          castShadow
          receiveShadow
        />
        <mesh geometry={g.soffit} position={[0, PASSAGE_H - 0.15, 0]} material={mats.sandstoneFine} receiveShadow />

        {face(1)}
        {face(-1)}

        {/* Octagonal corner towers. */}
        {([[-1, -1], [-1, 1], [1, -1], [1, 1]] as const).map(([sx, sz], i) => (
          <group key={i} position={[sx * (GATE_W / 2 - 0.6), 0, sz * (GATE_D / 2 - 0.6)]}>
            <mesh geometry={g.tower} position={[0, (GATE_H + 2) / 2, 0]} material={mats.sandstone} castShadow receiveShadow />
            <mesh geometry={g.towerCap} position={[0, GATE_H + 2.3, 0]} material={mats.marbleFine} castShadow />
            <mesh geometry={g.towerDome} position={[0, GATE_H + 2.6, 0]} material={mats.marble} castShadow receiveShadow />
          </group>
        ))}

        <mesh geometry={g.cornice} position={[0, GATE_H - 0.2, 0]} material={mats.sandstoneFine} castShadow receiveShadow />
        <mesh geometry={g.roof} position={[0, GATE_H + 0.4, 0]} material={mats.sandstoneFine} receiveShadow />
        <mesh geometry={g.parapet} position={[0, GATE_H + 1.2, 0]} material={mats.marbleFine} castShadow receiveShadow />
      </group>

      <ChhatriRow positions={chhatriPositions} radius={1.5} columnHeight={1.9} domeHeight={1.9} />
    </group>
  )
}
