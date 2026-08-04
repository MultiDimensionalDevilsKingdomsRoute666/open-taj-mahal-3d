import { createContext, useContext } from 'react'
import type { Materials } from '../lib/materials'
import type { QualityProfile, TimePreset } from '../lib/settings'

export interface SceneConfig {
  q: QualityProfile
  mats: Materials
  preset: TimePreset
}

export const SceneContext = createContext<SceneConfig | null>(null)

export function useScene(): SceneConfig {
  const v = useContext(SceneContext)
  if (!v) throw new Error('useScene must be used inside <SceneContext.Provider>')
  return v
}
