import { useMemo } from 'react'
import {
  EffectComposer,
  Bloom,
  SMAA,
  Vignette,
  HueSaturation,
  BrightnessContrast,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useScene } from './SceneContext'

/**
 * Post-processing.
 *
 * Deliberately restrained. White marble punishes heavy bloom — it smears into
 * a glowing blob — so the threshold stays high and the intensity comes from
 * the time-of-day preset. There is no depth of field, no lens dirt and no
 * chromatic aberration: the aim is a clean architectural render, not a game
 * filter.
 *
 * Screen-space ambient occlusion was tried and removed. Against the
 * alpha-tested tree canopies the normal pass is noisy wherever a card cuts
 * out, and every setting that produced visible occlusion on the building also
 * produced visible speckle in the garden. Contact darkening is instead handled
 * in the materials — recesses, reveals and blind arcading each carry their own
 * shaded backing — which costs nothing and never sparkles.
 */
export function Effects() {
  const { q, preset } = useScene()

  const grade = useMemo(() => {
    switch (preset.key) {
      case 'sunrise':
        return { hue: 0.012, saturation: 0.06, brightness: 0.008, contrast: 0.03 }
      case 'sunset':
        return { hue: -0.014, saturation: 0.1, brightness: 0.0, contrast: 0.05 }
      case 'moonlight':
        return { hue: -0.02, saturation: -0.16, brightness: 0.02, contrast: 0.07 }
      default:
        return { hue: 0, saturation: 0.02, brightness: 0.0, contrast: 0.02 }
    }
  }, [preset.key])

  if (!q.bloom) {
    // Performance profile: anti-aliasing and a whisper of grading only.
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <SMAA />
        <HueSaturation hue={grade.hue} saturation={grade.saturation} />
        <Vignette offset={0.32} darkness={0.42} eskil={false} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>
    )
  }

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <SMAA />
      <Bloom
        intensity={preset.bloomIntensity}
        luminanceThreshold={preset.bloomThreshold}
        luminanceSmoothing={0.28}
        mipmapBlur
        radius={0.62}
      />
      <HueSaturation hue={grade.hue} saturation={grade.saturation} />
      <BrightnessContrast brightness={grade.brightness} contrast={grade.contrast} />
      <Vignette offset={0.3} darkness={preset.key === 'moonlight' ? 0.58 : 0.44} eskil={false} />
    </EffectComposer>
  )
}
