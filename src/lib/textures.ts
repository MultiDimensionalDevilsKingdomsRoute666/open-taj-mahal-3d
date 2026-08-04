/**
 * Every texture in this project is generated procedurally on a 2D canvas at
 * runtime. Nothing is downloaded, nothing is licensed from a third party, and
 * the whole build stays under a few hundred kilobytes.
 *
 * The generators below are deliberately specific to Mughal architecture:
 * Makrana marble veining, Agra red sandstone bedding, pietra dura floral
 * inlay, thuluth-inspired calligraphic banding and jali lattice screens.
 *
 * Textures are memoised by key and disposed together via `disposeTextures()`.
 */
import * as THREE from 'three'

/* ------------------------------------------------------------------- noise */

/** Deterministic 2D hash in [0,1). */
function hash2(x: number, y: number, seed: number): number {
  let h = x * 374761393 + y * 668265263 + seed * 2246822519
  h = (h ^ (h >>> 13)) >>> 0
  h = Math.imul(h, 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

/** Tileable value noise on a grid of `period` cells. */
function valueNoise(x: number, y: number, period: number, seed: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = smoothstep(x - xi)
  const yf = smoothstep(y - yi)
  const w = (i: number, j: number) =>
    hash2(((i % period) + period) % period, ((j % period) + period) % period, seed)
  const a = w(xi, yi)
  const b = w(xi + 1, yi)
  const c = w(xi, yi + 1)
  const d = w(xi + 1, yi + 1)
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf
}

/** Seamless fractal Brownian motion. `u`,`v` in [0,1]. */
function fbm(u: number, v: number, octaves: number, baseFreq: number, seed: number): number {
  let sum = 0
  let amp = 0.5
  let norm = 0
  let freq = baseFreq
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(u * freq, v * freq, freq, seed + o * 101)
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / norm
}

/* ------------------------------------------------------------- canvas util */

function canvas(size: number, height?: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = size
  c.height = height ?? size
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')
  return [c, ctx]
}

const registry: THREE.Texture[] = []

function toTexture(
  c: HTMLCanvasElement,
  opts: { repeat?: [number, number]; srgb?: boolean; aniso?: number } = {},
): THREE.Texture {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1])
  t.colorSpace = opts.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = opts.aniso ?? 8
  t.needsUpdate = true
  registry.push(t)
  return t
}

/** Sobel-filter a greyscale height canvas into a tangent-space normal map. */
function normalFromHeight(src: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  const size = src.width
  const sctx = src.getContext('2d')!
  const height = sctx.getImageData(0, 0, size, size).data
  const [out, octx] = canvas(size)
  const img = octx.createImageData(size, size)
  const at = (x: number, y: number) => {
    const xi = ((x % size) + size) % size
    const yi = ((y % size) + size) % size
    return height[(yi * size + xi) * 4] / 255
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1))
      const dy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1))
      let nx = dx * strength
      let ny = dy * strength
      const nz = 1
      const len = Math.hypot(nx, ny, nz)
      nx /= len
      ny /= len
      const i = (y * size + x) * 4
      img.data[i] = (nx * 0.5 + 0.5) * 255
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255
      img.data[i + 2] = (nz / len) * 255
      img.data[i + 3] = 255
    }
  }
  octx.putImageData(img, 0, 0)
  return out
}

/* ------------------------------------------------------------------ marble */

export interface PbrSet {
  map: THREE.Texture
  normalMap: THREE.Texture
  roughnessMap: THREE.Texture
}

const cache = new Map<string, PbrSet>()

function memo(key: string, build: () => PbrSet): PbrSet {
  const hit = cache.get(key)
  if (hit) return hit
  const made = build()
  cache.set(key, made)
  return made
}

/**
 * Makrana marble. Warm white with a faint cool cast in the shadows, sparse
 * grey-gold veining, and a very fine crystalline grain. The veins are driven
 * by a turbulence-warped sine field, which is the classic way to get the
 * layered, folded look of real marble rather than random scribbles.
 */
export function marbleTextures(size = 1024): PbrSet {
  return memo(`marble${size}`, () => {
    const [albedo, actx] = canvas(size)
    const [heightC, hctx] = canvas(size)
    const [roughC, rctx] = canvas(size)

    const aImg = actx.createImageData(size, size)
    const hImg = hctx.createImageData(size, size)
    const rImg = rctx.createImageData(size, size)

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size
        const v = y / size

        // Large scale warm/cool drift across the slab.
        const drift = fbm(u, v, 4, 3, 11)
        // Turbulence that warps the vein field.
        const warp = fbm(u, v, 5, 7, 27) - 0.5
        const warp2 = fbm(u + 0.31, v - 0.17, 4, 13, 53) - 0.5
        // Folded vein bands.
        const band = Math.sin((u * 5.3 + v * 2.1 + warp * 5.5 + warp2 * 2.2) * Math.PI * 2)
        // Sharpen into thin veins.
        const vein = Math.pow(1 - Math.min(1, Math.abs(band) * 2.6), 3)
        const microVein =
          Math.pow(1 - Math.min(1, Math.abs(Math.sin((u * 17 + v * 9 + warp * 9) * Math.PI * 2)) * 3.4), 4) * 0.45
        const grain = fbm(u, v, 3, 190, 77)

        const veinAmt = Math.min(1, vein + microVein)

        // Base colour: warm ivory, cooled slightly where the stone drifts.
        let r = 236 + drift * 9
        let g = 231 + drift * 8
        let b = 221 + (1 - drift) * 11

        // Veins are a soft grey with a gold undertone.
        r -= veinAmt * 34
        g -= veinAmt * 33
        b -= veinAmt * 26

        // Crystalline sparkle.
        const sp = (grain - 0.5) * 13
        r += sp
        g += sp
        b += sp

        const i = (y * size + x) * 4
        aImg.data[i] = r
        aImg.data[i + 1] = g
        aImg.data[i + 2] = b
        aImg.data[i + 3] = 255

        // Veins sit a hair proud of the polished surface; grain gives tooth.
        const h = 200 - veinAmt * 70 + (grain - 0.5) * 26
        hImg.data[i] = hImg.data[i + 1] = hImg.data[i + 2] = h
        hImg.data[i + 3] = 255

        // Polished marble: low roughness, veins and grain scatter more.
        const rough = 0.24 + veinAmt * 0.22 + (grain - 0.5) * 0.1 + drift * 0.06
        const rv = Math.max(0, Math.min(255, rough * 255))
        rImg.data[i] = rImg.data[i + 1] = rImg.data[i + 2] = rv
        rImg.data[i + 3] = 255
      }
    }
    actx.putImageData(aImg, 0, 0)
    hctx.putImageData(hImg, 0, 0)
    rctx.putImageData(rImg, 0, 0)

    return {
      map: toTexture(albedo, { srgb: true, aniso: 16 }),
      normalMap: toTexture(normalFromHeight(heightC, 1.5)),
      roughnessMap: toTexture(roughC),
    }
  })
}

/**
 * Agra red sandstone: horizontally bedded, mottled, with paler quartz
 * speckling and a much rougher surface than the marble.
 */
export function sandstoneTextures(size = 768): PbrSet {
  return memo(`sandstone${size}`, () => {
    const [albedo, actx] = canvas(size)
    const [heightC, hctx] = canvas(size)
    const [roughC, rctx] = canvas(size)
    const aImg = actx.createImageData(size, size)
    const hImg = hctx.createImageData(size, size)
    const rImg = rctx.createImageData(size, size)

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size
        const v = y / size
        // Bedding planes are stretched horizontally.
        const bed = fbm(u * 0.35, v * 3.0, 5, 8, 5)
        const mottle = fbm(u, v, 5, 16, 91)
        const speck = fbm(u, v, 2, 240, 33)
        const seam = Math.pow(1 - Math.min(1, Math.abs(Math.sin(v * 11 * Math.PI + bed * 4)) * 6), 2)

        let r = 154 + bed * 46 + mottle * 22
        let g = 74 + bed * 26 + mottle * 20
        let b = 54 + bed * 16 + mottle * 18

        // Pale quartz flecks.
        if (speck > 0.72) {
          const f = (speck - 0.72) * 2.2
          r += f * 70
          g += f * 62
          b += f * 52
        }
        r -= seam * 40
        g -= seam * 22
        b -= seam * 16

        const i = (y * size + x) * 4
        aImg.data[i] = r
        aImg.data[i + 1] = g
        aImg.data[i + 2] = b
        aImg.data[i + 3] = 255

        const h = 150 + (mottle - 0.5) * 90 + (speck - 0.5) * 40 - seam * 60
        hImg.data[i] = hImg.data[i + 1] = hImg.data[i + 2] = h
        hImg.data[i + 3] = 255

        const rough = 0.74 + (mottle - 0.5) * 0.18 + seam * 0.1
        const rv = Math.max(0, Math.min(255, rough * 255))
        rImg.data[i] = rImg.data[i + 1] = rImg.data[i + 2] = rv
        rImg.data[i + 3] = 255
      }
    }
    actx.putImageData(aImg, 0, 0)
    hctx.putImageData(hImg, 0, 0)
    rctx.putImageData(rImg, 0, 0)

    return {
      map: toTexture(albedo, { srgb: true, aniso: 8 }),
      normalMap: toTexture(normalFromHeight(heightC, 2.6)),
      roughnessMap: toTexture(roughC),
    }
  })
}

/* --------------------------------------------------------- pietra dura ---- */

const INLAY_COLOURS = ['#2f4d92', '#3c7355', '#9d3230', '#b5822f', '#5c3f7a', '#2a6a72']

/** One symmetrical flower with `petals` petals, drawn about (0,0). */
function flower(ctx: CanvasRenderingContext2D, r: number, petals: number, colour: string, seed: number) {
  ctx.save()
  ctx.rotate(hash2(seed, 3, 7) * Math.PI)
  for (let p = 0; p < petals; p++) {
    ctx.save()
    ctx.rotate((p / petals) * Math.PI * 2)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(r * 0.42, -r * 0.28, r * 0.9, -r * 0.16, r, 0)
    ctx.bezierCurveTo(r * 0.9, r * 0.16, r * 0.42, r * 0.28, 0, 0)
    ctx.fillStyle = colour
    ctx.fill()
    ctx.restore()
  }
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2)
  ctx.fillStyle = '#b5822f'
  ctx.fill()
  ctx.restore()
}

/** A curling vine with leaves, used to link the flowers. */
function vine(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  bow: number, seed: number,
) {
  const mx = (x0 + x1) / 2 + bow
  const my = (y0 + y1) / 2 - bow * 0.6
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.quadraticCurveTo(mx, my, x1, y1)
  ctx.strokeStyle = '#3c7355'
  ctx.lineWidth = Math.max(1.2, ctx.canvas.width * 0.004)
  ctx.stroke()
  // leaves
  for (let i = 1; i <= 2; i++) {
    const t = i / 3
    const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1
    const py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1
    const a = hash2(seed, i, 19) * Math.PI * 2
    const lr = ctx.canvas.width * 0.022
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(a)
    ctx.beginPath()
    ctx.ellipse(lr * 0.6, 0, lr * 0.6, lr * 0.26, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#3c7355'
    ctx.fill()
    ctx.restore()
  }
}

/**
 * Pietra dura panel: semi-precious floral inlay set into white marble. Used on
 * the spandrels, dado panels and the borders of the great arch.
 */
export function pietraDuraTexture(size = 512): THREE.Texture {
  const key = `pietra${size}`
  const hit = cacheSimple.get(key)
  if (hit) return hit
  const [c, ctx] = canvas(size)
  // marble ground
  const g = ctx.createLinearGradient(0, 0, size, size)
  g.addColorStop(0, '#f2eee4')
  g.addColorStop(1, '#e8e2d5')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  // Central medallion with a four-fold symmetry, as on the real dado panels.
  ctx.save()
  ctx.translate(size / 2, size / 2)
  for (let ring = 0; ring < 3; ring++) {
    const rr = size * (0.11 + ring * 0.115)
    const n = 4 + ring * 4
    for (let i = 0; i < n; i++) {
      ctx.save()
      ctx.rotate((i / n) * Math.PI * 2)
      vine(ctx, 0, 0, 0, -rr, size * 0.045 * (ring % 2 ? -1 : 1), ring * 31 + i)
      ctx.translate(0, -rr)
      flower(ctx, size * (0.05 - ring * 0.009), 6, INLAY_COLOURS[(ring + i) % INLAY_COLOURS.length], i + ring * 7)
      ctx.restore()
    }
  }
  flower(ctx, size * 0.062, 8, '#9d3230', 3)
  ctx.restore()

  // Fine border line, as the inlay panels are always framed.
  ctx.strokeStyle = '#6c604a'
  ctx.lineWidth = size * 0.012
  ctx.strokeRect(size * 0.045, size * 0.045, size * 0.91, size * 0.91)
  ctx.strokeStyle = '#9d3230'
  ctx.lineWidth = size * 0.005
  ctx.strokeRect(size * 0.082, size * 0.082, size * 0.836, size * 0.836)

  const t = toTexture(c, { srgb: true, aniso: 8 })
  cacheSimple.set(key, t)
  return t
}

const cacheSimple = new Map<string, THREE.Texture>()

/**
 * A calligraphic band inspired by the thuluth inscriptions that frame the
 * great arches. The strokes are deliberately abstract and do not spell
 * anything: the real inscriptions are Quranic and reproducing them
 * approximately would be disrespectful.
 */
export function calligraphyBandTexture(w = 1024, h = 256): THREE.Texture {
  const key = `calli${w}x${h}`
  const hit = cacheSimple.get(key)
  if (hit) return hit
  const [c, ctx] = canvas(w, h)
  ctx.fillStyle = '#f1ece1'
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = '#20201e'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Strokes are deliberately heavy: at the distances this band is actually
  // viewed from, a fine hand disappears into a grey smudge and the black
  // Quranic banding is one of the strongest cues that this is the Taj.
  const baseline = h * 0.7
  let x = w * 0.015
  let s = 0
  while (x < w * 0.985) {
    const wid = h * (0.2 + hash2(s, 1, 3) * 0.24)
    // baseline body
    ctx.lineWidth = h * 0.125
    ctx.beginPath()
    ctx.moveTo(x, baseline)
    ctx.quadraticCurveTo(x + wid * 0.5, baseline + h * (hash2(s, 2, 5) * 0.12 - 0.02), x + wid, baseline)
    ctx.stroke()
    // tall ascender every few glyphs
    if (hash2(s, 4, 9) > 0.36) {
      const hgt = h * (0.34 + hash2(s, 5, 13) * 0.3)
      ctx.lineWidth = h * 0.1
      ctx.beginPath()
      ctx.moveTo(x + wid * 0.35, baseline)
      ctx.quadraticCurveTo(x + wid * 0.18, baseline - hgt * 0.7, x + wid * 0.44, baseline - hgt)
      ctx.stroke()
    }
    // descending bowl
    if (hash2(s, 6, 17) > 0.55) {
      ctx.lineWidth = h * 0.09
      ctx.beginPath()
      ctx.arc(x + wid * 0.55, baseline + h * 0.08, h * 0.15, Math.PI * 0.05, Math.PI * 0.95)
      ctx.stroke()
    }
    // diacritic dots
    if (hash2(s, 7, 23) > 0.5) {
      ctx.fillStyle = '#20201e'
      ctx.beginPath()
      ctx.arc(x + wid * 0.5, baseline - h * 0.24, h * 0.045, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#20201e'
    }
    x += wid * (0.78 + hash2(s, 8, 29) * 0.26)
    s++
  }
  const t = toTexture(c, { srgb: true, aniso: 16 })
  cacheSimple.set(key, t)
  return t
}

/**
 * Jali lattice: the eight-pointed star and cross screen used for the marble
 * railings and window grilles. Returned as a colour + alpha texture so it can
 * be used with `transparent` + `alphaTest` on a single quad.
 */
export function jaliTexture(size = 512, cells = 6): THREE.Texture {
  const key = `jali${size}x${cells}`
  const hit = cacheSimple.get(key)
  if (hit) return hit
  const [c, ctx] = canvas(size)
  ctx.clearRect(0, 0, size, size)
  const step = size / cells
  const bar = step * 0.15

  ctx.fillStyle = '#eee8dc'
  // Draw the lattice as overlapping rotated squares: the classic star pattern.
  for (let j = -1; j <= cells; j++) {
    for (let i = -1; i <= cells; i++) {
      const cx = (i + 0.5) * step
      const cy = (j + 0.5) * step
      for (const rot of [0, Math.PI / 4]) {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(rot)
        const half = step * 0.44
        ctx.beginPath()
        ctx.rect(-half, -half, half * 2, half * 2)
        ctx.rect(-half + bar, -half + bar, (half - bar) * 2, (half - bar) * 2)
        ctx.fill('evenodd')
        ctx.restore()
      }
      // connecting nodes
      ctx.beginPath()
      ctx.arc(cx + step * 0.5, cy + step * 0.5, bar * 0.75, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const t = toTexture(c, { srgb: true, aniso: 8 })
  cacheSimple.set(key, t)
  return t
}

/**
 * The marble paving of the plinth: large slabs with a fine octagon-and-star
 * inlay grid, which is what is actually underfoot at the Taj.
 */
export function marblePavingTexture(size = 512): THREE.Texture {
  const key = `paving${size}`
  const hit = cacheSimple.get(key)
  if (hit) return hit
  const [c, ctx] = canvas(size)
  ctx.fillStyle = '#e9e3d6'
  ctx.fillRect(0, 0, size, size)
  // subtle stone variation per slab
  const n = 4
  const s = size / n
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const v = hash2(i, j, 61)
      ctx.fillStyle = `rgba(${190 + v * 40},${184 + v * 40},${170 + v * 38},0.5)`
      ctx.fillRect(i * s, j * s, s, s)
    }
  }
  // joint lines
  ctx.strokeStyle = 'rgba(120,110,96,0.55)'
  ctx.lineWidth = Math.max(1, size * 0.004)
  for (let i = 0; i <= n; i++) {
    ctx.beginPath()
    ctx.moveTo(i * s, 0)
    ctx.lineTo(i * s, size)
    ctx.moveTo(0, i * s)
    ctx.lineTo(size, i * s)
    ctx.stroke()
  }
  // dark inlay stars at the slab intersections
  ctx.fillStyle = '#3a3a44'
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      ctx.save()
      ctx.translate(i * s, j * s)
      ctx.rotate(Math.PI / 8)
      const r = size * 0.014
      ctx.beginPath()
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  }
  const t = toTexture(c, { srgb: true, repeat: [1, 1], aniso: 16 })
  cacheSimple.set(key, t)
  return t
}

/** Red sandstone paving with white marble banding, as on the garden walkways. */
export function pathwayTexture(size = 512): THREE.Texture {
  const key = `path${size}`
  const hit = cacheSimple.get(key)
  if (hit) return hit
  const [c, ctx] = canvas(size)
  ctx.fillStyle = '#9d5137'
  ctx.fillRect(0, 0, size, size)
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      const v = hash2(i, j, 13)
      ctx.fillStyle = `rgba(${150 + v * 55},${76 + v * 34},${56 + v * 26},0.85)`
      ctx.fillRect(i * (size / 8) + 1, j * (size / 8) + 1, size / 8 - 2, size / 8 - 2)
    }
  }
  // marble banding
  ctx.fillStyle = '#ded7c7'
  ctx.fillRect(0, 0, size, size * 0.055)
  ctx.fillRect(0, size * 0.945, size, size * 0.055)
  const t = toTexture(c, { srgb: true, aniso: 16 })
  cacheSimple.set(key, t)
  return t
}

/** Grass for the charbagh parterres. */
export function grassTexture(size = 512): THREE.Texture {
  const key = `grass${size}`
  const hit = cacheSimple.get(key)
  if (hit) return hit
  const [c, ctx] = canvas(size)
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const blotch = fbm(u, v, 4, 6, 3)
      const blade = fbm(u, v, 3, 120, 71)
      const i = (y * size + x) * 4
      img.data[i] = 62 + blotch * 44 + (blade - 0.5) * 30
      img.data[i + 1] = 88 + blotch * 52 + (blade - 0.5) * 34
      img.data[i + 2] = 44 + blotch * 26 + (blade - 0.5) * 18
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = toTexture(c, { srgb: true, aniso: 16 })
  cacheSimple.set(key, t)
  return t
}

/** Water normal map: two overlapping ripple fields. */
export function waterNormalTexture(size = 512): THREE.Texture {
  const key = `water${size}`
  const hit = cacheSimple.get(key)
  if (hit) return hit
  const [h, hctx] = canvas(size)
  const img = hctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const a = fbm(u, v, 4, 5, 9)
      const b = fbm(u + 0.4, v + 0.2, 3, 11, 44)
      const i = (y * size + x) * 4
      const val = 128 + (a - 0.5) * 150 + (b - 0.5) * 90
      img.data[i] = img.data[i + 1] = img.data[i + 2] = val
      img.data[i + 3] = 255
    }
  }
  hctx.putImageData(img, 0, 0)
  const t = toTexture(normalFromHeight(h, 0.9), { aniso: 4 })
  cacheSimple.set(key, t)
  return t
}

/** Tree canopy billboard: a soft cluster of leaves with an alpha edge. */
export function foliageTexture(size = 256, tint = '#3f5f34'): THREE.Texture {
  const key = `foliage${size}${tint}`
  const hit = cacheSimple.get(key)
  if (hit) return hit
  const [c, ctx] = canvas(size)
  ctx.clearRect(0, 0, size, size)
  const base = new THREE.Color(tint)
  for (let i = 0; i < 420; i++) {
    const a = hash2(i, 1, 5) * Math.PI * 2
    const rr = Math.pow(hash2(i, 2, 7), 0.62) * size * 0.47
    const x = size / 2 + Math.cos(a) * rr
    const y = size / 2 + Math.sin(a) * rr * 0.98
    const s = size * (0.028 + hash2(i, 3, 11) * 0.05)
    const shade = 0.62 + hash2(i, 4, 13) * 0.62
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(hash2(i, 5, 17) * Math.PI)
    ctx.beginPath()
    ctx.ellipse(0, 0, s, s * 0.56, 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgb(${base.r * 255 * shade},${base.g * 255 * shade},${base.b * 255 * shade})`
    ctx.globalAlpha = 0.9
    ctx.fill()
    ctx.restore()
  }
  const t = toTexture(c, { srgb: true, aniso: 4 })
  cacheSimple.set(key, t)
  return t
}

/** Release every generated texture. Called when the WebGL context is torn down. */
export function disposeTextures() {
  registry.forEach((t) => t.dispose())
  registry.length = 0
  cache.clear()
  cacheSimple.clear()
}
