import * as THREE from 'three'
import { DOME_APEX_Y, GATE_Z, PLINTH_TOP, TANK_Z, TERRACE_Z } from './dimensions'

export interface Viewpoint {
  position: [number, number, number]
  target: [number, number, number]
}

/**
 * The hero view: standing on the axis at the south end of the long channel,
 * with the tomb centred and doubled in the water. This is the composition the
 * experience opens on and the one "Reset View" always returns to.
 */
export const HERO: Viewpoint = {
  // Just south of the central tank, low over the water: this is where the
  // bench sits at the real site and where every photograph is taken from.
  position: [0, 6.4, 242],
  target: [0, 20, 0],
}

/**
 * Where the opening camera move starts: just inside the garden at the mouth
 * of the great gate, twenty metres behind the hero framing.
 */
export const INTRO_START: Viewpoint = {
  position: [0, 12, 296],
  target: [0, 24, 0],
}

/**
 * The cinematic tour. Ten composed stops, each with a dwell time; the camera
 * eases along a Catmull-Rom curve through the positions while the look-at
 * point follows its own curve, so there are no cuts and nothing clips.
 */
export interface TourStop extends Viewpoint {
  label: string
  /** Seconds spent travelling to this stop from the previous one. */
  travel: number
  /** Seconds held at the stop. */
  hold: number
}

export const TOUR: TourStop[] = [
  {
    label: 'The Great Gate',
    position: [0, 9, GATE_Z + 26],
    target: [0, 22, GATE_Z - 40],
    travel: 3.5,
    hold: 2.4,
  },
  {
    label: 'Through the Darwaza',
    position: [0, 8, GATE_Z - 14],
    target: [0, 30, 0],
    travel: 5.0,
    hold: 2.0,
  },
  {
    label: 'The Charbagh',
    position: [0, 16, 300],
    target: [0, 34, 0],
    travel: 5.5,
    hold: 1.8,
  },
  {
    label: 'The Reflecting Pool',
    position: [0, 5.4, 244],
    target: [0, 28, 0],
    travel: 6.0,
    hold: 3.2,
  },
  {
    label: 'Beneath the Minarets',
    // Kept inside the minaret ring: parked further west, the spline's
    // overshoot on the way to the next stop drives straight through the
    // south-west minaret.
    position: [-30, 8, 66],
    target: [4, 58, -4],
    travel: 6.5,
    hold: 2.6,
  },
  {
    label: 'The Central Arch',
    position: [0, PLINTH_TOP + 4.5, 52],
    target: [0, PLINTH_TOP + 17, 0],
    travel: 5.5,
    hold: 3.0,
  },
  {
    // Routed south of the minaret line rather than straight across it: the
    // spline between this stop and the last otherwise clips the south-west
    // minaret at about fifteen metres up.
    label: 'The Mosque',
    position: [-116, 34, 80],
    target: [-42, 26, 6],
    travel: 6.5,
    hold: 2.4,
  },
  {
    label: 'The Whole Complex',
    position: [128, 132, 236],
    target: [0, 44, 40],
    travel: 8.0,
    hold: 3.0,
  },
  {
    label: 'The Yamuna',
    position: [46, 34, -176],
    target: [0, 44, TERRACE_Z],
    travel: 8.0,
    hold: 3.2,
  },
  {
    // The long swing from the river back round to the west crosses the whole
    // terrace; both ends are lifted so the path clears the mosque and the
    // north-west minaret rather than passing through them.
    label: 'Golden Hour',
    position: [-112, 54, 166],
    target: [0, 34, 0],
    travel: 7.5,
    hold: 3.0,
  },
  {
    label: 'Return',
    position: HERO.position,
    target: HERO.target,
    travel: 7.0,
    hold: 2.5,
  },
]

/** Total running time of the tour, in seconds. */
export const TOUR_DURATION = TOUR.reduce((a, s) => a + s.travel + s.hold, 0)

/**
 * Build the two smooth curves the tour follows. A `centripetal` Catmull-Rom
 * avoids the overshoot that a uniform spline produces between the widely
 * spaced stops, which is what would otherwise send the camera through the
 * minarets between stops five and six.
 */
export function buildTourCurves(start: Viewpoint) {
  const positions = [new THREE.Vector3(...start.position), ...TOUR.map((s) => new THREE.Vector3(...s.position))]
  const targets = [new THREE.Vector3(...start.target), ...TOUR.map((s) => new THREE.Vector3(...s.target))]
  return {
    position: new THREE.CatmullRomCurve3(positions, false, 'centripetal', 0.4),
    target: new THREE.CatmullRomCurve3(targets, false, 'centripetal', 0.4),
  }
}

/** Named places used by the information markers. */
export const LANDMARKS = {
  dome: new THREE.Vector3(0, DOME_APEX_Y - 6, 0),
  minaret: new THREE.Vector3(41.5, PLINTH_TOP + 26, 41.5),
  iwan: new THREE.Vector3(0, PLINTH_TOP + 14, 29),
  mosque: new THREE.Vector3(-76, 22, 6),
  jawab: new THREE.Vector3(76, 22, 6),
  pool: new THREE.Vector3(0, 1.4, 268),
  garden: new THREE.Vector3(-64, 3, TANK_Z),
  gate: new THREE.Vector3(0, 24, GATE_Z - 16),
  plinth: new THREE.Vector3(-40, PLINTH_TOP + 1.5, 40),
  history: new THREE.Vector3(0, 6, 120),
  river: new THREE.Vector3(0, 4, -120),
}
