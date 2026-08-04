/**
 * Architectural dimensions of the Taj Mahal complex, in metres.
 *
 * Figures are taken from published survey data and the Archaeological Survey of
 * India descriptions of the monument. Where sources disagree (they do, by a few
 * metres, depending on whether one measures from the river bank, the garden or
 * the marble plinth) the value chosen is the one that preserves the *silhouette
 * ratios* of the real building, because those are what make it recognisable:
 *
 *   - overall height : facade width          ~ 1.24
 *   - dome region    : cube facade height    ~ 1.31
 *   - dome bulge     : facade width          ~ 0.39
 *   - minaret tip sits above the drum top but well below the dome apex
 *
 * Key published references:
 *   marble plinth  95.5 m square, 6 m high
 *   tomb building  ~57 m square with chamfered corners (an irregular octagon)
 *   pishtaq        33 m high vaulted archway on each of the four long faces
 *   drum           12 m high, 18.4 m inner diameter
 *   dome           ~23 m of arc above the drum, 17.7 m diameter at the neck
 *   finial         9.6 m gilded spire
 *   minarets       >40 m, one at each corner of the plinth
 *   riverfront terrace 300 m long
 *   charbagh       ~300 m square
 *
 * World axes used throughout the project:
 *   +Z is SOUTH  (towards the Charbagh garden and the great gate)
 *   -Z is NORTH  (towards the Yamuna river, behind the mausoleum)
 *   +X is EAST   (the jawab)
 *   -X is WEST   (the mosque, which must face Mecca)
 *   Y is up, with the garden walkway at y = 0.
 */

/* ------------------------------------------------------------------ levels */

export const GARDEN_Y = 0
/** Red sandstone riverfront terrace that carries the tomb, mosque and jawab. */
export const TERRACE_H = 2.6
/** White marble plinth, rising above the sandstone terrace. */
export const PLINTH_H = 6.2
/** Walking level on top of the marble plinth (the mausoleum floor). */
export const PLINTH_TOP = TERRACE_H + PLINTH_H

/* ----------------------------------------------------------------- terrace */

export const TERRACE_W = 300 // east-west
export const TERRACE_D = 130 // north-south
/**
 * Centre of the terrace along Z. Offset north of the tomb so that the terrace
 * runs out to the river wall behind, while still leaving a 12 m apron in front
 * of the plinth for the stairs up from the garden.
 */
export const TERRACE_Z = -5

/* ------------------------------------------------------------------ plinth */

export const PLINTH_SIZE = 95.5

/* -------------------------------------------------------------- mausoleum */

/** Overall square footprint before the corners are chamfered. */
export const MAUS_W = 57
/**
 * How much of each corner is cut away, measured along one axis. Chosen so the
 * chamfered face is ~0.41 of a main face, which is the ratio you measure off
 * photographs of the front elevation and the reason the corners read as
 * proper canted bays rather than a bevelled box.
 */
export const MAUS_CHAMFER = 10.5
/** Length of each of the four long faces: 57 - 2 x 10.5 = 36 m. */
export const MAUS_FACE = MAUS_W - 2 * MAUS_CHAMFER
/** Length of each chamfered (diagonal) face: 10.5 x sqrt(2) ~ 14.85 m. */
export const MAUS_CHAMFER_FACE = MAUS_CHAMFER * Math.SQRT2
/** Perpendicular distance from the centre to a main face / a chamfered face. */
export const MAUS_FACE_DIST = MAUS_W / 2
export const MAUS_CHAMFER_DIST = (MAUS_W - MAUS_CHAMFER) / Math.SQRT2

/** Height of the cube walls, from the plinth up to the base of the parapet. */
export const FACADE_H = 30.5
export const WALL_T = 2.2
export const PARAPET_H = 1.9

/* ------------------------------------------------------------- great iwan */

/** Clear width of the great arched opening. */
export const IWAN_W = 17.5
export const IWAN_H = 24.5
/** Height at which the arch springs from its jambs. */
export const IWAN_SPRING = 11
/** Depth of the recess cut back into the facade. */
export const IWAN_DEPTH = 7.0
/** Outer width of the flat pishtaq panel that frames the arch. */
export const PISHTAQ_W = 23.5
/** How far the pishtaq panel projects in front of the wall face. */
export const PISHTAQ_PROJ = 0.85

/* --------------------------------------------------------- drum and dome */

export const DRUM_R = 10.6
/**
 * Only part of the drum reads from outside — the parapet and the corner
 * chhatris hide its base — so a tall exposed cylinder makes the dome look
 * perched. Keeping it low lets the lotus collar flare straight off the roof.
 */
export const DRUM_H = 8.6
/** Vertical arc of the onion dome above the top of the drum. */
export const DOME_H = 24.0
/** Widest radius of the onion bulge. */
export const DOME_R = 12.8
export const FINIAL_H = 8.8

/** Apex of the dome, in world Y (before the finial). */
export const DOME_APEX_Y = PLINTH_TOP + FACADE_H + PARAPET_H + DRUM_H + DOME_H

/* ---------------------------------------------------------------- chhatris */

/**
 * Diagonal distance from the tomb centre to each of the four corner chhatris.
 * They straddle the chamfered bays, just inside the parapet line.
 */
export const CHHATRI_R = 26.0
export const CHHATRI_BASE_R = 5.1
export const CHHATRI_COL_H = 5.8
export const CHHATRI_DOME_H = 6.4

/* ---------------------------------------------------------------- minarets */

export const MINARET_H = 41.0
/** Distance from the centre along X and Z: just inside the plinth corners. */
export const MINARET_OFFSET = 41.5
/**
 * The real minarets are far stouter than they look in photographs: about 40 m
 * tall on a shaft roughly 7 m across, a height-to-diameter ratio near 6. Model
 * them any thinner and they read as flagpoles.
 */
export const MINARET_R_BASE = 2.85
export const MINARET_R_TOP = 1.85
/** The real minarets lean outward slightly so they would fall away from the tomb. */
export const MINARET_TILT = 0.016 // radians

/* ------------------------------------------------------ mosque and jawab */

export const MOSQUE_W = 56.6 // north-south (they are long buildings, gable to the tomb)
export const MOSQUE_D = 23.4 // east-west
export const MOSQUE_H = 20.0
/** Distance from the world centre line to the centre of each building. */
export const MOSQUE_OFFSET = 76.0

/* ---------------------------------------------------------------- charbagh */

export const GARDEN_SIZE = 300
/** South edge of the terrace = north edge of the garden. */
export const GARDEN_Z0 = TERRACE_Z + TERRACE_D / 2 // 60
export const GARDEN_Z1 = GARDEN_Z0 + GARDEN_SIZE // 360
/** The raised marble tank at the crossing of the two water channels. */
export const TANK_Z = (GARDEN_Z0 + GARDEN_Z1) / 2 // 210
export const TANK_W = 23
export const TANK_D = 34

/** The long north-south reflecting channel. */
export const CHANNEL_HALF_W = 3.7
export const POOL_Y = -0.55

/* -------------------------------------------------------------- great gate */

export const GATE_Z = GARDEN_Z1 + 21
export const GATE_W = 46
export const GATE_D = 30
export const GATE_H = 30

/* ------------------------------------------------------------------- river */

export const RIVER_Z_NEAR = -78
export const RIVER_Z_FAR = -310
export const RIVER_Y = -3.2

/* ---------------------------------------------------------- world extents */

/** Radius beyond which the walk controller refuses to let you wander. */
export const WORLD_RADIUS = 430
