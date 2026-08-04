import { useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { useScene } from './SceneContext'
import { cachedGeometry } from '../lib/geoCache'
import { archBandShape, pointedArch, scaleUV } from '../lib/shapes'
import { MARBLE_TILE, SAND_TILE } from '../lib/materials'
import {
  PLINTH_H,
  PLINTH_SIZE,
  PLINTH_TOP,
  TERRACE_D,
  TERRACE_H,
  TERRACE_W,
  TERRACE_Z,
} from '../lib/dimensions'

/** A flight of steps built as a stack of boxes. */
function useStairGeometry(width: number, rise: number, steps: number, tread: number, tile: number) {
  return useMemo(
    () =>
      cachedGeometry(`stair.${width}.${rise}.${steps}.${tread}`, () => {
        const parts: THREE.BufferGeometry[] = []
        const h = rise / steps
        for (let i = 0; i < steps; i++) {
          const depth = tread * (steps - i)
          const box = new THREE.BoxGeometry(width, h, depth)
          box.translate(0, h * (i + 0.5), depth / 2)
          parts.push(box)
        }
        const merged = mergeBoxes(parts)
        return scaleUV(merged, 1 / tile, 1 / tile)
      }),
    [width, rise, steps, tread, tile],
  )
}

/** Minimal buffer-geometry merge; avoids pulling in the whole addons bundle. */
function mergeBoxes(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry()
  let vCount = 0
  let iCount = 0
  for (const p of parts) {
    vCount += p.getAttribute('position').count
    iCount += p.getIndex()!.count
  }
  const pos = new Float32Array(vCount * 3)
  const nor = new Float32Array(vCount * 3)
  const uv = new Float32Array(vCount * 2)
  const idx = new Uint32Array(iCount)
  let vo = 0
  let io = 0
  for (const p of parts) {
    const pp = p.getAttribute('position') as THREE.BufferAttribute
    const pn = p.getAttribute('normal') as THREE.BufferAttribute
    const pu = p.getAttribute('uv') as THREE.BufferAttribute
    const pi = p.getIndex()!
    pos.set(pp.array as Float32Array, vo * 3)
    nor.set(pn.array as Float32Array, vo * 3)
    uv.set(pu.array as Float32Array, vo * 2)
    for (let i = 0; i < pi.count; i++) idx[io + i] = pi.getX(i) + vo
    vo += pp.count
    io += pi.count
    p.dispose()
  }
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  out.setIndex(new THREE.BufferAttribute(idx, 1))
  out.computeBoundingSphere()
  return out
}

/**
 * The two-level base of the monument: the long red sandstone riverfront
 * terrace, and the 95.5 m square white marble plinth standing on it that
 * carries the tomb and the four minarets.
 *
 * Both are ringed with blind arcading, which is what stops them reading as
 * plain extruded boxes at a distance.
 */
export function MarblePlatform() {
  const { mats } = useScene()

  const g = useMemo(
    () => ({
      terrace: cachedGeometry('plat.terrace', () => {
        const geo = new THREE.BoxGeometry(TERRACE_W, TERRACE_H, TERRACE_D)
        return scaleUV(geo, TERRACE_W / SAND_TILE, TERRACE_D / SAND_TILE)
      }),
      terraceTop: cachedGeometry('plat.terraceTop', () => {
        const geo = new THREE.PlaneGeometry(TERRACE_W, TERRACE_D)
        geo.rotateX(-Math.PI / 2)
        return scaleUV(geo, TERRACE_W / SAND_TILE, TERRACE_D / SAND_TILE)
      }),
      terraceCoping: cachedGeometry('plat.terraceCoping', () => {
        const geo = new THREE.BoxGeometry(TERRACE_W + 1.4, 0.7, TERRACE_D + 1.4)
        return scaleUV(geo, (TERRACE_W + 1.4) / MARBLE_TILE, (TERRACE_D + 1.4) / MARBLE_TILE)
      }),
      plinth: cachedGeometry('plat.plinth', () => {
        const geo = new THREE.BoxGeometry(PLINTH_SIZE, PLINTH_H, PLINTH_SIZE)
        return scaleUV(geo, PLINTH_SIZE / MARBLE_TILE, PLINTH_H / MARBLE_TILE)
      }),
      plinthTop: cachedGeometry('plat.plinthTop', () => {
        const geo = new THREE.PlaneGeometry(PLINTH_SIZE, PLINTH_SIZE)
        geo.rotateX(-Math.PI / 2)
        return geo
      }),
      plinthCoping: cachedGeometry('plat.plinthCoping', () => {
        const geo = new THREE.BoxGeometry(PLINTH_SIZE + 1.6, 0.75, PLINTH_SIZE + 1.6)
        return scaleUV(geo, (PLINTH_SIZE + 1.6) / MARBLE_TILE, 1, )
      }),
      /*
       * Blind arcading, instanced around each perimeter. A raised outline
       * alone is invisible on white marble at any distance, so each arch also
       * gets a shaded panel set behind it — the shadow is what you actually
       * read from across the garden.
       */
      blindArchMarble: cachedGeometry('plat.blindM', () => {
        const geo = new THREE.ExtrudeGeometry(archBandShape(2.4, 4.3, 2.0, 0.34, 0.3), {
          depth: 0.26,
          bevelEnabled: false,
          curveSegments: 12,
        })
        return scaleUV(geo, 1 / MARBLE_TILE, 1 / MARBLE_TILE)
      }),
      blindPanelMarble: cachedGeometry('plat.blindPM', () =>
        new THREE.ShapeGeometry(pointedArch(2.4, 4.3, 2.0), 16),
      ),
      blindArchSand: cachedGeometry('plat.blindS', () => {
        const geo = new THREE.ExtrudeGeometry(archBandShape(1.7, 2.0, 0.95, 0.24, 0.2), {
          depth: 0.2,
          bevelEnabled: false,
          curveSegments: 10,
        })
        return scaleUV(geo, 1 / SAND_TILE, 1 / SAND_TILE)
      }),
      blindPanelSand: cachedGeometry('plat.blindPS', () =>
        new THREE.ShapeGeometry(pointedArch(1.7, 2.0, 0.95), 12),
      ),
    }),
    [],
  )

  const plinthStair = useStairGeometry(16, PLINTH_H, 14, 0.62, MARBLE_TILE)
  const terraceStair = useStairGeometry(26, TERRACE_H, 7, 0.9, SAND_TILE)

  /* Instance transforms for the two blind arcades. */
  const arcades = useMemo(() => {
    /**
     * Ring a rectangular block with evenly spaced blind arches.
     *
     * `halfX`/`halfZ` are the faces the arches sit on — the geometry extrudes
     * outward from there, so insetting them buries the whole arcade inside the
     * solid. `margin` keeps the arches clear of the corners.
     */
    const build = (
      halfX: number,
      halfZ: number,
      spacing: number,
      y: number,
      zc: number,
      margin: number,
    ) => {
      const out: { p: THREE.Vector3; r: number }[] = []
      const run = (span: number, place: (t: number) => THREE.Vector3, rot: number) => {
        const usable = span - margin * 2
        const count = Math.max(2, Math.round(usable / spacing))
        for (let i = 0; i < count; i++) {
          const t = ((i + 0.5) / count - 0.5) * usable
          out.push({ p: place(t), r: rot })
        }
      }
      run(halfX * 2, (t) => new THREE.Vector3(t, y, zc + halfZ), 0)
      run(halfX * 2, (t) => new THREE.Vector3(t, y, zc - halfZ), Math.PI)
      run(halfZ * 2, (t) => new THREE.Vector3(halfX, y, zc + t), Math.PI / 2)
      run(halfZ * 2, (t) => new THREE.Vector3(-halfX, y, zc + t), -Math.PI / 2)
      return out
    }

    return {
      plinth: build(PLINTH_SIZE / 2 + 0.02, PLINTH_SIZE / 2 + 0.02, 6.0, TERRACE_H + 0.85, 0, 5),
      terrace: build(TERRACE_W / 2 + 0.02, TERRACE_D / 2 + 0.02, 6.4, 0.32, TERRACE_Z, 4),
    }
  }, [])

  /**
   * Callback refs rather than an effect over a stored ref: r3f rebuilds an
   * InstancedMesh whenever its `args` change identity, which happens every
   * time the quality profile swaps the shared materials. An effect keyed on
   * the transform list alone would not re-run and the whole arcade would
   * collapse to the origin.
   */
  const arcadeRef = useCallback(
    (items: { p: THREE.Vector3; r: number }[], inset: number) =>
      (mesh: THREE.InstancedMesh | null) => {
        if (!mesh) return
        const m = new THREE.Matrix4()
        const qt = new THREE.Quaternion()
        const e = new THREE.Euler()
        const one = new THREE.Vector3(1, 1, 1)
        const p = new THREE.Vector3()
        items.forEach((it, i) => {
          e.set(0, it.r, 0)
          // Push the shaded panel back along the face normal.
          p.set(it.p.x - Math.sin(it.r) * inset, it.p.y, it.p.z - Math.cos(it.r) * inset)
          m.compose(p, qt.setFromEuler(e), one)
          mesh.setMatrixAt(i, m)
        })
        mesh.instanceMatrix.needsUpdate = true
        mesh.computeBoundingSphere()
      },
    [],
  )

  const plinthArcade = useMemo(() => arcadeRef(arcades.plinth, 0), [arcadeRef, arcades])
  const plinthPanels = useMemo(() => arcadeRef(arcades.plinth, 0.16), [arcadeRef, arcades])
  const terraceArcade = useMemo(() => arcadeRef(arcades.terrace, 0), [arcadeRef, arcades])
  const terracePanels = useMemo(() => arcadeRef(arcades.terrace, 0.12), [arcadeRef, arcades])

  return (
    <group>
      {/* --- red sandstone riverfront terrace --- */}
      <mesh
        geometry={g.terrace}
        position={[0, TERRACE_H / 2, TERRACE_Z]}
        material={mats.sandstone}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={terracePanels}
        args={[g.blindPanelSand, mats.marbleShadow, arcades.terrace.length]}
        receiveShadow
      />
      <instancedMesh
        ref={terraceArcade}
        args={[g.blindArchSand, mats.sandstoneFine, arcades.terrace.length]}
        castShadow
      />
      <mesh
        geometry={g.terraceCoping}
        position={[0, TERRACE_H - 0.15, TERRACE_Z]}
        material={mats.marbleFine}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={g.terraceTop}
        position={[0, TERRACE_H + 0.21, TERRACE_Z]}
        material={mats.pathway}
        receiveShadow
      />

      {/* --- white marble plinth --- */}
      <mesh
        geometry={g.plinth}
        position={[0, TERRACE_H + PLINTH_H / 2, 0]}
        material={mats.marble}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={plinthPanels}
        args={[g.blindPanelMarble, mats.marbleShadow, arcades.plinth.length]}
        receiveShadow
      />
      <instancedMesh
        ref={plinthArcade}
        args={[g.blindArchMarble, mats.marbleFine, arcades.plinth.length]}
        castShadow
      />
      <mesh
        geometry={g.plinthCoping}
        position={[0, PLINTH_TOP - 0.32, 0]}
        material={mats.marbleFine}
        castShadow
        receiveShadow
      />
      <mesh geometry={g.plinthTop} position={[0, PLINTH_TOP + 0.02, 0]} material={mats.marbleFloor} receiveShadow />

      {/* --- stairs: garden up to the terrace, terrace up to the plinth --- */}
      <mesh
        geometry={terraceStair}
        position={[0, 0, TERRACE_Z + TERRACE_D / 2]}
        material={mats.sandstoneFine}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={plinthStair}
        position={[0, TERRACE_H, PLINTH_SIZE / 2]}
        material={mats.marbleFine}
        castShadow
        receiveShadow
      />
    </group>
  )
}
