/**
 * Geometry primitives specific to Mughal architecture.
 *
 * The two that matter most for recognisability are `pointedArch` (the
 * four-centred arch that frames every opening on the building) and
 * `ONION_PROFILE` (the bulbous, ogee-tapered dome silhouette). A hemisphere or
 * a half-sphere is the single most common way to get the Taj Mahal wrong, so
 * the dome profile here is a hand-tuned control polygon traced from elevation
 * drawings: the widest point sits about a quarter of the way up, and the
 * curve inflects and draws to a near-point at the apex.
 */
import * as THREE from 'three'

/* ------------------------------------------------------------------ arches */

/** Trace a Mughal four-centred pointed arch into an existing path or shape. */
function traceArch(
  p: THREE.Path,
  w: number,
  h: number,
  spring: number,
  cx: number,
  cy: number,
) {
  const hw = w / 2
  const rise = h - spring
  p.moveTo(cx - hw, cy)
  p.lineTo(cx - hw, cy + spring)
  p.bezierCurveTo(
    cx - hw, cy + spring + rise * 0.58,
    cx - w * 0.17, cy + h - rise * 0.15,
    cx, cy + h,
  )
  p.bezierCurveTo(
    cx + w * 0.17, cy + h - rise * 0.15,
    cx + hw, cy + spring + rise * 0.58,
    cx + hw, cy + spring,
  )
  p.lineTo(cx + hw, cy)
  p.closePath()
}

/**
 * The outline of a Mughal four-centred pointed arch opening.
 * `cx`,`cy` place the centre of the sill; `spring` is where the curve leaves
 * the vertical jambs.
 */
export function pointedArch(w: number, h: number, spring: number, cx = 0, cy = 0): THREE.Shape {
  const s = new THREE.Shape()
  traceArch(s, w, h, spring, cx, cy)
  return s
}

/** The same outline as a hole path. */
export function archHole(w: number, h: number, spring: number, cx = 0, cy = 0): THREE.Path {
  const p = new THREE.Path()
  traceArch(p, w, h, spring, cx, cy)
  return p
}

export interface Opening {
  /** Horizontal centre of the opening within the panel. */
  x: number
  /** Height of the sill above the panel base. */
  y: number
  w: number
  h: number
  spring: number
}

/**
 * A rectangular wall panel with any number of pointed-arch openings punched
 * clean through it. Extruded, this is a real wall you can see into — the
 * openings are holes in the geometry, not dark rectangles painted on a slab.
 */
export function wallShape(panelW: number, panelH: number, openings: Opening[]): THREE.Shape {
  const s = new THREE.Shape()
  const hw = panelW / 2
  s.moveTo(-hw, 0)
  s.lineTo(hw, 0)
  s.lineTo(hw, panelH)
  s.lineTo(-hw, panelH)
  s.closePath()
  for (const o of openings) s.holes.push(archHole(o.w, o.h, o.spring, o.x, o.y))
  return s
}

/**
 * The moulded band that runs around an arch opening — the archivolt. `band`
 * is its width and `drop` how far it continues below the sill so that the
 * hole never touches the outer boundary (which would triangulate badly).
 */
export function archBandShape(
  w: number,
  h: number,
  spring: number,
  band: number,
  drop = 0.5,
): THREE.Shape {
  const outer = pointedArch(
    w + 2 * band,
    h + band + drop,
    spring + band * 0.45 + drop,
    0,
    -drop,
  )
  outer.holes.push(archHole(w, h, spring))
  return outer
}

/** Footprint of the mausoleum: a square with chamfered corners. */
export function chamferedSquare(w: number, chamfer: number): THREE.Shape {
  const h = w / 2
  const c = chamfer
  const s = new THREE.Shape()
  s.moveTo(-h + c, -h)
  s.lineTo(h - c, -h)
  s.lineTo(h, -h + c)
  s.lineTo(h, h - c)
  s.lineTo(h - c, h)
  s.lineTo(-h + c, h)
  s.lineTo(-h, h - c)
  s.lineTo(-h, -h + c)
  s.closePath()
  return s
}

/** A rounded rectangle, used for recessed wall panels. */
export function panelShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape()
  const hw = w / 2
  s.moveTo(-hw + r, 0)
  s.lineTo(hw - r, 0)
  s.quadraticCurveTo(hw, 0, hw, r)
  s.lineTo(hw, h - r)
  s.quadraticCurveTo(hw, h, hw - r, h)
  s.lineTo(-hw + r, h)
  s.quadraticCurveTo(-hw, h, -hw, h - r)
  s.lineTo(-hw, r)
  s.quadraticCurveTo(-hw, 0, -hw + r, 0)
  s.closePath()
  return s
}

/* ------------------------------------------------------------------- domes */

/**
 * Normalised onion-dome control points: [heightFraction, radiusFraction].
 * Traced from published elevations of the Taj Mahal.
 */
const ONION_CONTROL: [number, number][] = [
  // A pronounced undercut at the neck, the widest point about a third of the
  // way up, then a long ogee to a near-point. The undercut is what separates
  // a Mughal onion dome from a bulb sitting on a drum.
  [0.0, 0.7],
  [0.035, 0.845],
  [0.085, 0.938],
  [0.15, 0.984],
  [0.23, 1.0],
  [0.31, 0.995],
  [0.4, 0.972],
  [0.5, 0.926],
  [0.6, 0.855],
  [0.69, 0.762],
  [0.775, 0.645],
  [0.85, 0.508],
  [0.908, 0.368],
  [0.951, 0.234],
  [0.981, 0.117],
  [1.0, 0.034],
]

/**
 * Sample the onion profile into points for a LatheGeometry.
 * `y0` shifts the profile vertically in local space.
 */
export function onionProfile(height: number, radius: number, segments = 48, y0 = 0): THREE.Vector2[] {
  const curve = new THREE.SplineCurve(
    ONION_CONTROL.map(([t, r]) => new THREE.Vector2(r * radius, t * height + y0)),
  )
  return curve.getPoints(segments)
}

/**
 * A shallower dome used for the mosque, the jawab and the great gate. Mughal
 * secondary domes are still bulbous but sit on a shorter neck.
 */
export function bulbProfile(height: number, radius: number, segments = 36, y0 = 0): THREE.Vector2[] {
  const control: [number, number][] = [
    [0.0, 0.8],
    [0.08, 0.94],
    [0.2, 1.0],
    [0.34, 0.98],
    [0.48, 0.9],
    [0.62, 0.76],
    [0.75, 0.57],
    [0.86, 0.38],
    [0.94, 0.21],
    [1.0, 0.05],
  ]
  const curve = new THREE.SplineCurve(
    control.map(([t, r]) => new THREE.Vector2(r * radius, t * height + y0)),
  )
  return curve.getPoints(segments)
}

/**
 * The inverted-lotus collar. Both the great dome and every chhatri sit on a
 * ring of lotus petals, and the same motif is repeated under the finial. It is
 * one of the most distinctive small details on the building.
 */
export function lotusCollarProfile(height: number, radius: number, y0 = 0): THREE.Vector2[] {
  const control: [number, number][] = [
    [0.0, 0.72],
    [0.18, 0.92],
    [0.4, 1.0],
    [0.62, 0.97],
    [0.82, 0.87],
    [1.0, 0.78],
  ]
  const curve = new THREE.SplineCurve(
    control.map(([t, r]) => new THREE.Vector2(r * radius, t * height + y0)),
  )
  return curve.getPoints(18)
}

/**
 * The gilded finial: a tapering spire threaded with flattened spheres, capped
 * by a crescent moon whose horns point up. Returned as a lathe profile; the
 * crescent itself is separate geometry.
 */
export function finialProfile(height: number, baseRadius: number): THREE.Vector2[] {
  const pts: THREE.Vector2[] = []
  const push = (r: number, y: number) => pts.push(new THREE.Vector2(r * baseRadius, y * height))
  push(0.0, 0.0)
  push(1.0, 0.0)
  push(0.95, 0.04)
  push(0.55, 0.07)
  // lower kalash (pot)
  push(0.62, 0.1)
  push(0.85, 0.16)
  push(0.62, 0.23)
  push(0.32, 0.27)
  // shaft
  push(0.26, 0.31)
  // middle sphere
  push(0.58, 0.36)
  push(0.62, 0.4)
  push(0.44, 0.45)
  push(0.2, 0.49)
  // upper sphere
  push(0.42, 0.55)
  push(0.44, 0.59)
  push(0.26, 0.64)
  push(0.15, 0.68)
  // small sphere
  push(0.3, 0.73)
  push(0.28, 0.77)
  push(0.12, 0.81)
  // spire
  push(0.08, 0.9)
  push(0.03, 1.0)
  push(0.0, 1.0)
  return pts
}

/** A slender guldasta — the decorative spire on the corner of every pishtaq. */
export function guldastaProfile(height: number, radius: number): THREE.Vector2[] {
  const pts: THREE.Vector2[] = []
  const push = (r: number, y: number) => pts.push(new THREE.Vector2(r * radius, y * height))
  push(0, 0)
  push(1.0, 0)
  push(1.0, 0.05)
  push(0.72, 0.08)
  push(0.78, 0.12)
  push(0.78, 0.52)
  push(0.92, 0.56)
  push(0.92, 0.6)
  push(0.7, 0.63)
  // little bulb
  push(0.86, 0.7)
  push(0.8, 0.78)
  push(0.5, 0.84)
  push(0.24, 0.9)
  push(0.1, 0.96)
  push(0, 1.0)
  return pts
}

/** Column with a simple Mughal capital and base, for chhatris and pavilions. */
export function columnProfile(height: number, radius: number): THREE.Vector2[] {
  const pts: THREE.Vector2[] = []
  const push = (r: number, y: number) => pts.push(new THREE.Vector2(r * radius, y * height))
  push(0, 0)
  push(1.35, 0)
  push(1.35, 0.045)
  push(1.05, 0.075)
  push(1.0, 0.12)
  push(0.92, 0.82)
  push(1.0, 0.86)
  push(1.28, 0.9)
  push(1.28, 0.95)
  push(1.1, 0.97)
  push(1.1, 1.0)
  push(0, 1.0)
  return pts
}

/* ------------------------------------------------------------------ shared */

/**
 * Rescale a geometry's UVs in place. Lets one shared material tile at
 * different densities on different meshes without cloning the texture.
 */
export function scaleUV<T extends THREE.BufferGeometry>(geo: T, sx: number, sy: number): T {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute | undefined
  if (!uv) return geo
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy)
  }
  uv.needsUpdate = true
  return geo
}

/** Merge duplicate lathe caps: lathes built from open profiles need no caps. */
export function latheGeometry(profile: THREE.Vector2[], segments: number): THREE.LatheGeometry {
  const g = new THREE.LatheGeometry(profile, segments)
  g.computeVertexNormals()
  return g
}

/** Extrude a shape with a small bevel, which catches light on every edge. */
export function extrude(
  shape: THREE.Shape,
  depth: number,
  bevel = 0,
  curveSegments = 16,
): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments,
  })
  g.computeVertexNormals()
  return g
}
