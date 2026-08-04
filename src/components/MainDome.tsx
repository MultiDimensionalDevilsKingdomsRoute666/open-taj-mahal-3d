import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useScene } from './SceneContext'
import { archBandShape, bulbProfile, finialProfile, lotusCollarProfile, onionProfile, pointedArch } from '../lib/shapes'
import { DOME_H, DOME_R, DRUM_H, DRUM_R, FINIAL_H } from '../lib/dimensions'

/** Gilded crescent, horns pointing up, as it sits on the real finial. */
function crescentGeometry(r: number, thickness: number): THREE.ExtrudeGeometry {
  const s = new THREE.Shape()
  s.absarc(0, 0, r, 0, Math.PI * 2, false)
  const hole = new THREE.Path()
  hole.absarc(0, r * 0.36, r * 0.84, 0, Math.PI * 2, true)
  s.holes.push(hole)
  const g = new THREE.ExtrudeGeometry(s, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.3,
    bevelSize: thickness * 0.3,
    bevelSegments: 2,
    curveSegments: 24,
  })
  g.center()
  return g
}

/**
 * The great onion dome, its drum, the lotus collars above and below it, and
 * the 9.6 m gilded finial.
 *
 * `baseY` is the top of the roof parapet: everything here is built upward
 * from there.
 */
export function MainDome({ baseY }: { baseY: number }) {
  const { q, mats } = useScene()
  const seg = q.segments

  const geo = useMemo(() => {
    // Drum: a cylinder with mouldings top and bottom.
    const drum = new THREE.CylinderGeometry(DRUM_R, DRUM_R * 1.035, DRUM_H, seg, 1, true)
    const drumBase = new THREE.CylinderGeometry(DRUM_R * 1.12, DRUM_R * 1.2, 1.5, seg)
    const drumCornice = new THREE.CylinderGeometry(DRUM_R * 1.06, DRUM_R * 1.02, 0.9, seg)

    // A ring of blind arched panels around the drum. The shaded plate sits
    // just proud of the cylinder and the moulded band just proud of that —
    // extruding them inward buries the whole ring inside the drum wall.
    const panel = new THREE.ShapeGeometry(pointedArch(2.1, 5.4, 2.5), 14)
    const panelBand = new THREE.ExtrudeGeometry(archBandShape(2.1, 5.4, 2.5, 0.3, 0.3), {
      depth: 0.24,
      bevelEnabled: false,
      curveSegments: 12,
    })

    // Lotus collar where the dome springs from the drum.
    const collar = new THREE.LatheGeometry(lotusCollarProfile(2.3, DOME_R * 0.96), seg)

    const dome = new THREE.LatheGeometry(onionProfile(DOME_H, DOME_R, 56), seg)
    dome.computeVertexNormals()

    // Small inverted-lotus pedestal that the finial stands on.
    const pedestal = new THREE.LatheGeometry(bulbProfile(1.6, 1.5, 14), seg)

    const finial = new THREE.LatheGeometry(finialProfile(FINIAL_H, 1.05), Math.max(16, seg / 2))
    finial.computeVertexNormals()

    const crescent = crescentGeometry(1.15, 0.22)

    return { drum, drumBase, drumCornice, panel, panelBand, collar, dome, pedestal, finial, crescent }
  }, [seg])

  useEffect(
    () => () => Object.values(geo).forEach((g) => (g as THREE.BufferGeometry).dispose()),
    [geo],
  )

  const drumMidY = baseY + 0.6 + DRUM_H / 2
  const drumTopY = baseY + 0.6 + DRUM_H
  const domeApexY = drumTopY + DOME_H

  const panels = useMemo(() => {
    const n = 18
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + Math.PI / n
      const s = Math.sin(a)
      const c = Math.cos(a)
      return {
        key: i,
        plate: [s * (DRUM_R + 0.03), 0, c * (DRUM_R + 0.03)] as [number, number, number],
        band: [s * (DRUM_R + 0.06), 0, c * (DRUM_R + 0.06)] as [number, number, number],
        rotation: [0, a, 0] as [number, number, number],
      }
    })
  }, [])

  return (
    <group>
      {/* --- drum --- */}
      <mesh geometry={geo.drumBase} position={[0, baseY + 0.75, 0]} material={mats.marbleFine} castShadow receiveShadow />
      <mesh geometry={geo.drum} position={[0, drumMidY, 0]} material={mats.marbleFine} castShadow receiveShadow />
      <group position={[0, baseY + 2.1, 0]}>
        {panels.map((p) => (
          <group key={p.key}>
            <mesh geometry={geo.panel} position={p.plate} rotation={p.rotation} material={mats.marbleShadow} />
            <mesh
              geometry={geo.panelBand}
              position={p.band}
              rotation={p.rotation}
              material={mats.marbleFine}
              castShadow
            />
          </group>
        ))}
      </group>
      <mesh geometry={geo.drumCornice} position={[0, drumTopY - 0.45, 0]} material={mats.marbleFine} castShadow receiveShadow />

      {/* --- lotus collar and the dome itself --- */}
      <mesh geometry={geo.collar} position={[0, drumTopY - 0.3, 0]} material={mats.marbleFine} castShadow receiveShadow />
      <mesh geometry={geo.dome} position={[0, drumTopY, 0]} material={mats.marble} castShadow receiveShadow />

      {/* --- finial --- */}
      <mesh geometry={geo.pedestal} position={[0, domeApexY - 0.5, 0]} material={mats.marbleFine} castShadow />
      <mesh geometry={geo.finial} position={[0, domeApexY + 0.9, 0]} material={mats.gold} castShadow />
      <mesh
        geometry={geo.crescent}
        position={[0, domeApexY + 0.9 + FINIAL_H * 1.02, 0]}
        rotation={[0, Math.PI / 2, 0]}
        material={mats.gold}
        castShadow
      />
    </group>
  )
}
