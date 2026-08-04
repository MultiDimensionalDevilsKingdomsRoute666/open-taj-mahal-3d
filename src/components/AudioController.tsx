import { useEffect, useRef } from 'react'
import { useExperience } from '../state/useExperience'

/**
 * Ambient sound, synthesised in the browser.
 *
 * Nothing is downloaded and nothing is licensed: wind and water are filtered
 * noise, the birds are pitch-enveloped sine blips fired on a Poisson-ish
 * schedule, and the drone is three detuned oscillators at very low gain. The
 * whole graph is built lazily on the first user gesture, which keeps it on the
 * right side of browser autoplay policy, and the master gain always ramps
 * rather than switching.
 */

interface Graph {
  ctx: AudioContext
  master: GainNode
  timers: number[]
  stopped: boolean
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  // Brown noise: integrated white noise, gentler and less hissy than white.
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.2
  }
  return buf
}

function build(): Graph {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctx()
  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  const noise = noiseBuffer(ctx, 6)

  /* --- wind: low-passed brown noise with a drifting cutoff --- */
  const wind = ctx.createBufferSource()
  wind.buffer = noise
  wind.loop = true
  const windFilter = ctx.createBiquadFilter()
  windFilter.type = 'lowpass'
  windFilter.frequency.value = 420
  windFilter.Q.value = 0.6
  const windGain = ctx.createGain()
  windGain.gain.value = 0.5
  wind.connect(windFilter).connect(windGain).connect(master)

  const windLfo = ctx.createOscillator()
  windLfo.frequency.value = 0.055
  const windLfoGain = ctx.createGain()
  windLfoGain.gain.value = 230
  windLfo.connect(windLfoGain).connect(windFilter.frequency)

  /* --- water: a narrow band of noise, the fountains in the channel --- */
  const water = ctx.createBufferSource()
  water.buffer = noise
  water.loop = true
  const waterFilter = ctx.createBiquadFilter()
  waterFilter.type = 'bandpass'
  waterFilter.frequency.value = 2100
  waterFilter.Q.value = 0.8
  const waterGain = ctx.createGain()
  waterGain.gain.value = 0.1
  water.connect(waterFilter).connect(waterGain).connect(master)

  /* --- drone: three detuned oscillators, barely audible --- */
  const droneGain = ctx.createGain()
  droneGain.gain.value = 0.035
  droneGain.connect(master)
  const drones: OscillatorNode[] = []
  for (const [freq, type] of [
    [110, 'sine'],
    [164.81, 'sine'],
    [220.5, 'triangle'],
  ] as const) {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = freq
    const g = ctx.createGain()
    g.gain.value = type === 'triangle' ? 0.18 : 0.5
    o.connect(g).connect(droneGain)
    drones.push(o)
  }

  wind.start()
  water.start()
  windLfo.start()
  drones.forEach((d) => d.start())

  /* --- birds: short chirps at irregular intervals --- */
  const timers: number[] = []
  const chirp = () => {
    if (ctx.state === 'closed') return
    const now = ctx.currentTime
    const notes = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < notes; i++) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      const t = now + i * (0.06 + Math.random() * 0.06)
      const base = 1900 + Math.random() * 1700
      o.type = 'sine'
      o.frequency.setValueAtTime(base, t)
      o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.5), t + 0.04)
      o.frequency.exponentialRampToValueAtTime(base * 0.85, t + 0.09)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11)
      o.connect(g).connect(master)
      o.start(t)
      o.stop(t + 0.14)
    }
    timers.push(window.setTimeout(chirp, 2600 + Math.random() * 8000))
  }
  timers.push(window.setTimeout(chirp, 1400))

  return { ctx, master, timers, stopped: false }
}

export function AudioController() {
  const audioEnabled = useExperience((s) => s.audioEnabled)
  const graph = useRef<Graph | null>(null)

  useEffect(() => {
    if (!audioEnabled) {
      const g = graph.current
      if (g && !g.stopped) {
        g.master.gain.cancelScheduledValues(g.ctx.currentTime)
        g.master.gain.setValueAtTime(g.master.gain.value, g.ctx.currentTime)
        g.master.gain.linearRampToValueAtTime(0, g.ctx.currentTime + 0.6)
      }
      return
    }

    if (!graph.current) {
      try {
        graph.current = build()
      } catch {
        // No Web Audio support: the experience is fully usable without sound.
        return
      }
    }
    const g = graph.current
    void g.ctx.resume()
    g.master.gain.cancelScheduledValues(g.ctx.currentTime)
    g.master.gain.setValueAtTime(g.master.gain.value, g.ctx.currentTime)
    g.master.gain.linearRampToValueAtTime(0.34, g.ctx.currentTime + 1.4)
  }, [audioEnabled])

  useEffect(
    () => () => {
      const g = graph.current
      if (!g) return
      g.stopped = true
      g.timers.forEach((t) => window.clearTimeout(t))
      void g.ctx.close()
      graph.current = null
    },
    [],
  )

  return null
}
