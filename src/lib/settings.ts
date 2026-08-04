import * as THREE from 'three'

/* ---------------------------------------------------------------- quality */

export type Quality = 'performance' | 'balanced' | 'ultra'

export interface QualityProfile {
  label: string
  dpr: [number, number]
  shadows: boolean
  shadowMapSize: number
  shadowType: THREE.ShadowMapType
  /** Half-extent of the directional light's shadow frustum, in metres. */
  shadowRadius: number
  bloom: boolean
  /** Render-target width for the reflecting pool. 0 disables real reflection. */
  reflectorRes: number
  /** Radial segments on the domes, minarets and columns. */
  segments: number
  treeCount: number
  birds: number
  /** Fountain jets are the most expensive small detail; scale them down first. */
  fountainDetail: number
  chhatriDetail: boolean
  anisotropy: number
}

export const QUALITY: Record<Quality, QualityProfile> = {
  performance: {
    label: 'Performance',
    dpr: [0.7, 1],
    shadows: true,
    shadowMapSize: 1024,
    shadowType: THREE.PCFShadowMap,
    shadowRadius: 130,
    bloom: false,

    reflectorRes: 0,
    segments: 24,
    treeCount: 90,
    birds: 0,
    fountainDetail: 0,
    chhatriDetail: false,
    anisotropy: 2,
  },
  balanced: {
    label: 'Balanced',
    dpr: [1, 1.5],
    shadows: true,
    shadowMapSize: 2048,
    shadowType: THREE.PCFSoftShadowMap,
    shadowRadius: 160,
    bloom: true,

    reflectorRes: 256,
    segments: 40,
    treeCount: 190,
    birds: 14,
    fountainDetail: 1,
    chhatriDetail: true,
    anisotropy: 8,
  },
  ultra: {
    label: 'Ultra',
    dpr: [1, 2],
    shadows: true,
    shadowMapSize: 4096,
    shadowType: THREE.PCFSoftShadowMap,
    shadowRadius: 190,
    bloom: true,

    reflectorRes: 512,
    segments: 64,
    treeCount: 300,
    birds: 22,
    fountainDetail: 2,
    chhatriDetail: true,
    anisotropy: 16,
  },
}

/** Pick a sensible default profile from what the device reports. */
export function detectQuality(): Quality {
  if (typeof navigator === 'undefined') return 'balanced'
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  const cores = navigator.hardwareConcurrency ?? 4
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
  if (mobile || cores <= 4 || mem <= 4) return 'performance'
  return 'balanced'
}

/* ------------------------------------------------------------ time of day */

export type TimeOfDay = 'sunrise' | 'day' | 'sunset' | 'moonlight'

export interface TimePreset {
  key: TimeOfDay
  label: string
  /** Direction towards the light, normalised. */
  sun: [number, number, number]
  sunColor: string
  sunIntensity: number
  /** Warm bounce light coming back off the sandstone terrace and garden. */
  bounceColor: string
  bounceIntensity: number
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  fogColor: string
  fogDensity: number
  /** Preetham sky parameters. Ignored when `stars` is true. */
  turbidity: number
  rayleigh: number
  mieCoefficient: number
  mieDirectionalG: number
  exposure: number
  bloomIntensity: number
  bloomThreshold: number
  /** Vertical gradient used to build the procedural environment map. */
  env: { zenith: string; horizon: string; ground: string; sunGlow: string; sunSize: number }
  water: { color: string; roughness: number; metalness: number; opacity: number }
  river: { color: string; roughness: number }
  /** Multiplied into every marble surface: the stone genuinely changes hue. */
  marbleTint: string
  sandstoneTint: string
  grassTint: string
  envIntensity: number
  stars: boolean
  /** Restrained architectural uplighting, only after dark. */
  lanterns: boolean
  /**
   * Haze character, folded into the fog density above rather than drawn as a
   * separate plane. A world-sized mist quad reads fine from above and becomes
   * a huge translucent slab the moment the walk camera passes underneath it,
   * so the atmosphere here is all exponential fog.
   */
  mist: number
  /** Sky colour used behind the stars in the moonlight preset. */
  nightSky?: { top: string; mid: string; bottom: string }
}

const norm = (v: [number, number, number]): [number, number, number] => {
  const l = Math.hypot(v[0], v[1], v[2])
  return [v[0] / l, v[1] / l, v[2] / l]
}

export const TIME_PRESETS: Record<TimeOfDay, TimePreset> = {
  /**
   * The Taj is famously side-lit at dawn from across the Yamuna. Low sun in
   * the east, heavy warm haze, and the marble picks up a distinct pink cast.
   */
  sunrise: {
    key: 'sunrise',
    label: 'Sunrise',
    sun: norm([1, 0.115, 0.34]),
    sunColor: '#ffb478',
    sunIntensity: 2.6,
    bounceColor: '#ffd7b0',
    bounceIntensity: 0.42,
    hemiSky: '#ffcfa8',
    hemiGround: '#6b5442',
    hemiIntensity: 0.55,
    fogColor: '#f0c4a4',
    fogDensity: 0.0026,
    turbidity: 6.5,
    rayleigh: 2.6,
    mieCoefficient: 0.011,
    mieDirectionalG: 0.83,
    exposure: 0.96,
    bloomIntensity: 0.42,
    bloomThreshold: 0.82,
    env: { zenith: '#5f7fb5', horizon: '#f6c79c', ground: '#6a5a48', sunGlow: '#ffd0a0', sunSize: 0.3 },
    water: { color: '#a9b6c0', roughness: 0.09, metalness: 0.35, opacity: 0.82 },
    river: { color: '#9aa7b0', roughness: 0.2 },
    marbleTint: '#fff0e2',
    sandstoneTint: '#ffd9c0',
    grassTint: '#e8dcc0',
    envIntensity: 0.85,
    stars: false,
    lanterns: false,
    mist: 0.85,
  },

  /**
   * Bright, crisp and neutral. Exposure is pulled down deliberately: white
   * marble under a high Indian sun clips instantly otherwise.
   */
  day: {
    key: 'day',
    label: 'Day',
    // Off to one side rather than straight overhead: raking light is what
    // makes the recesses, the chamfered bays and the minarets read as solid.
    sun: norm([0.62, 0.8, 0.36]),
    sunColor: '#fff4e2',
    sunIntensity: 3.1,
    bounceColor: '#c9b79c',
    bounceIntensity: 0.26,
    hemiSky: '#bcd8f5',
    hemiGround: '#8a7c62',
    // Low fill: white marble under a high sun needs its shadows to stay dark
    // or the whole building flattens into a single value.
    hemiIntensity: 0.46,
    fogColor: '#dbe5f0',
    fogDensity: 0.0013,
    turbidity: 4.2,
    rayleigh: 1.0,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.8,
    exposure: 0.66,
    bloomIntensity: 0.2,
    bloomThreshold: 0.95,
    env: { zenith: '#3f74c4', horizon: '#cfe0f0', ground: '#7d7059', sunGlow: '#ffffff', sunSize: 0.16 },
    water: { color: '#8ca3b6', roughness: 0.06, metalness: 0.4, opacity: 0.8 },
    river: { color: '#6b8296', roughness: 0.18 },
    marbleTint: '#ffffff',
    sandstoneTint: '#ffffff',
    grassTint: '#ffffff',
    envIntensity: 1.0,
    stars: false,
    lanterns: false,
    mist: 0.12,
  },

  /**
   * Golden hour from the west. The long axis of the garden runs north-south,
   * so at sunset the whole facade goes amber and the minarets throw long
   * shadows across the plinth.
   */
  sunset: {
    key: 'sunset',
    label: 'Sunset',
    sun: norm([-1, 0.1, 0.28]),
    sunColor: '#ff9048',
    sunIntensity: 3.0,
    bounceColor: '#ffbe86',
    bounceIntensity: 0.5,
    hemiSky: '#ffb684',
    hemiGround: '#5c4534',
    hemiIntensity: 0.5,
    fogColor: '#e8a273',
    fogDensity: 0.0015,
    turbidity: 9.5,
    rayleigh: 3.2,
    mieCoefficient: 0.014,
    mieDirectionalG: 0.88,
    exposure: 0.9,
    bloomIntensity: 0.62,
    bloomThreshold: 0.74,
    env: { zenith: '#3c5a92', horizon: '#ffa15c', ground: '#5c483a', sunGlow: '#ffb060', sunSize: 0.34 },
    water: { color: '#b3939a', roughness: 0.07, metalness: 0.45, opacity: 0.84 },
    river: { color: '#a08078', roughness: 0.16 },
    marbleTint: '#ffe6cd',
    sandstoneTint: '#ffcda8',
    grassTint: '#e6d2ae',
    envIntensity: 0.95,
    stars: false,
    lanterns: false,
    mist: 0.4,
  },

  /**
   * Full moon. Cool and blue, with the marble reading almost silver. A small
   * amount of warm uplighting keeps the arches legible without turning the
   * monument into a floodlit stadium.
   */
  moonlight: {
    key: 'moonlight',
    label: 'Moonlight',
    sun: norm([0.52, 0.66, 0.62]),
    sunColor: '#a8c2f0',
    sunIntensity: 1.05,
    bounceColor: '#5b6f96',
    bounceIntensity: 0.18,
    hemiSky: '#38507e',
    hemiGround: '#1a1e2c',
    hemiIntensity: 0.34,
    fogColor: '#1b2740',
    fogDensity: 0.0016,
    turbidity: 2,
    rayleigh: 0.6,
    mieCoefficient: 0.004,
    mieDirectionalG: 0.8,
    exposure: 1.15,
    bloomIntensity: 0.7,
    bloomThreshold: 0.62,
    env: { zenith: '#0c1226', horizon: '#2b3d63', ground: '#131826', sunGlow: '#c3d6ff', sunSize: 0.12 },
    water: { color: '#354862', roughness: 0.04, metalness: 0.6, opacity: 0.88 },
    river: { color: '#1e2a42', roughness: 0.12 },
    marbleTint: '#d3e0ff',
    sandstoneTint: '#7d86a0',
    grassTint: '#586b84',
    envIntensity: 0.7,
    stars: true,
    lanterns: true,
    mist: 0.5,
    nightSky: { top: '#060a18', mid: '#122145', bottom: '#2a3a5c' },
  },
}

export const TIME_ORDER: TimeOfDay[] = ['sunrise', 'day', 'sunset', 'moonlight']
