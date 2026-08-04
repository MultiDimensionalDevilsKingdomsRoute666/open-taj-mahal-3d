import { create } from 'zustand'
import { detectQuality, type Quality, type TimeOfDay } from '../lib/settings'

export type Phase = 'loading' | 'title' | 'running'
export type CameraMode = 'explore' | 'walk'

interface ExperienceState {
  phase: Phase
  /** 0..1, driven by the real asset/geometry loader. */
  progress: number
  mode: CameraMode
  timeOfDay: TimeOfDay
  quality: Quality
  tourActive: boolean
  tourStop: number
  infoVisible: boolean
  helpVisible: boolean
  audioEnabled: boolean
  /** Incremented to ask the camera controllers to snap back to the hero view. */
  resetToken: number
  /** Incremented when the loading screen hands control to the opening move. */
  introToken: number
  /** Which information marker is expanded, by id. */
  activeMarker: string | null
  pointerLocked: boolean

  setPhase: (p: Phase) => void
  setProgress: (v: number) => void
  setMode: (m: CameraMode) => void
  setTimeOfDay: (t: TimeOfDay) => void
  setQuality: (q: Quality) => void
  startTour: () => void
  stopTour: () => void
  setTourStop: (i: number) => void
  toggleInfo: () => void
  toggleHelp: () => void
  toggleAudio: () => void
  resetCamera: () => void
  setActiveMarker: (id: string | null) => void
  setPointerLocked: (v: boolean) => void
  begin: () => void
}

export const useExperience = create<ExperienceState>((set) => ({
  phase: 'loading',
  progress: 0,
  mode: 'explore',
  timeOfDay: 'day',
  quality: detectQuality(),
  tourActive: false,
  tourStop: 0,
  infoVisible: false,
  helpVisible: false,
  audioEnabled: false,
  resetToken: 0,
  introToken: 0,
  activeMarker: null,
  pointerLocked: false,

  setPhase: (phase) => set({ phase }),
  setProgress: (progress) => set((s) => ({ progress: Math.max(s.progress, progress) })),
  setMode: (mode) => set({ mode, tourActive: false, activeMarker: null }),
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  setQuality: (quality) => set({ quality }),
  startTour: () => set({ tourActive: true, tourStop: 0, activeMarker: null }),
  stopTour: () => set({ tourActive: false }),
  setTourStop: (tourStop) => set({ tourStop }),
  toggleInfo: () => set((s) => ({ infoVisible: !s.infoVisible, activeMarker: null })),
  toggleHelp: () => set((s) => ({ helpVisible: !s.helpVisible })),
  toggleAudio: () => set((s) => ({ audioEnabled: !s.audioEnabled })),
  resetCamera: () => set((s) => ({ resetToken: s.resetToken + 1, tourActive: false })),
  setActiveMarker: (activeMarker) => set({ activeMarker }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  begin: () =>
    set((s) => ({ phase: 'running', introToken: s.introToken + 1, tourActive: false })),
}))
