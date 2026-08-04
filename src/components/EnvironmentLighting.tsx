import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import { useScene } from './SceneContext'
import { PLINTH_TOP, TERRACE_H } from '../lib/dimensions'

const SUN_DISTANCE = 900

/* ------------------------------------------------ procedural environment */

/**
 * Build an equirectangular sky from the preset's gradient and prefilter it
 * into an environment map.
 *
 * Using a generated gradient rather than a downloaded HDRI keeps the whole
 * build local — no CDN, no licence, nothing to 404 in production — and it
 * means the marble's reflections change correctly when the time of day does.
 */
function buildEnvironment(
  renderer: THREE.WebGLRenderer,
  env: { zenith: string; horizon: string; ground: string; sunGlow: string; sunSize: number },
  sun: THREE.Vector3,
): THREE.Texture {
  const w = 256
  const h = 128
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!

  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, env.zenith)
  grad.addColorStop(0.42, env.zenith)
  grad.addColorStop(0.5, env.horizon)
  grad.addColorStop(0.56, env.ground)
  grad.addColorStop(1, env.ground)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // The sun / moon, placed with three's equirect convention.
  const u = Math.atan2(sun.z, sun.x) / (Math.PI * 2) + 0.5
  const v = Math.asin(THREE.MathUtils.clamp(sun.y, -1, 1)) / Math.PI + 0.5
  const sx = u * w
  const sy = (1 - v) * h
  const r = env.sunSize * h
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r)
  glow.addColorStop(0, env.sunGlow)
  glow.addColorStop(0.25, env.sunGlow)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(sx, sy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(c)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true

  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const target = pmrem.fromEquirectangular(tex)
  tex.dispose()
  pmrem.dispose()
  return target.texture
}

/* --------------------------------------------------------- night sky dome */

const NIGHT_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const NIGHT_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uBottom;
  uniform vec3 uMoonDir;
  uniform vec3 uMoonColor;
  varying vec3 vDir;

  void main() {
    vec3 d = normalize(vDir);
    float t = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uBottom, uMid, smoothstep(0.35, 0.5, t));
    col = mix(col, uTop, smoothstep(0.5, 0.95, t));

    // Soft halo around the moon.
    float a = max(dot(d, normalize(uMoonDir)), 0.0);
    col += uMoonColor * pow(a, 220.0) * 3.0;
    col += uMoonColor * pow(a, 12.0) * 0.16;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

function NightSky({ moon }: { moon: THREE.Vector3 }) {
  const { preset } = useScene()
  const night = preset.nightSky ?? { top: '#070b1a', mid: '#132247', bottom: '#22304e' }

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(night.top) },
          uMid: { value: new THREE.Color(night.mid) },
          uBottom: { value: new THREE.Color(night.bottom) },
          uMoonDir: { value: moon.clone() },
          uMoonColor: { value: new THREE.Color('#cfdcff') },
        },
        vertexShader: NIGHT_VERT,
        fragmentShader: NIGHT_FRAG,
      }),
    [night.top, night.mid, night.bottom, moon],
  )

  const geo = useMemo(() => new THREE.SphereGeometry(1800, 32, 16), [])
  useEffect(
    () => () => {
      material.dispose()
      geo.dispose()
    },
    [material, geo],
  )

  return <mesh geometry={geo} material={material} frustumCulled={false} renderOrder={-1000} />
}

/* ------------------------------------------------------------- lanterns */

/** Restrained warm uplighting so the arches stay legible after dark. */
function Lanterns() {
  return (
    <group>
      {[-1, 1].map((s) => (
        <pointLight
          key={s}
          position={[s * 26, PLINTH_TOP + 2, 34]}
          intensity={160}
          distance={95}
          decay={2}
          color="#ffcf95"
        />
      ))}
      <pointLight position={[0, PLINTH_TOP + 1.5, 40]} intensity={190} distance={110} decay={2} color="#ffd9a8" />
      <pointLight position={[0, TERRACE_H + 3, -46]} intensity={110} distance={90} decay={2} color="#ffcf95" />
    </group>
  )
}

/* ------------------------------------------------------------ main light */

/**
 * All lighting, sky and atmosphere for the current time of day.
 *
 * Each preset drives the sun vector, its colour and intensity, the sky model,
 * the fog, the tone-mapping exposure and a freshly prefiltered environment
 * map, so the four modes genuinely relight the scene rather than tinting it.
 */
export function EnvironmentLighting() {
  const { q, preset } = useScene()
  const { scene, gl } = useThree()
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const targetRef = useRef<THREE.Object3D>(null)

  const sunDir = useMemo(() => new THREE.Vector3(...preset.sun).normalize(), [preset])
  const sunPos = useMemo(() => sunDir.clone().multiplyScalar(SUN_DISTANCE), [sunDir])

  /* --- fog --- */
  useEffect(() => {
    const fog = new THREE.FogExp2(preset.fogColor, preset.fogDensity)
    scene.fog = fog
    return () => {
      scene.fog = null
    }
  }, [scene, preset])

  /* --- tone mapping --- */
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = preset.exposure
  }, [gl, preset])

  /* --- environment map --- */
  useEffect(() => {
    const tex = buildEnvironment(gl, preset.env, sunDir)
    scene.environment = tex
    return () => {
      scene.environment = null
      tex.dispose()
    }
  }, [gl, scene, preset, sunDir])

  /* --- keep the shadow camera aimed at the monument --- */
  useEffect(() => {
    const light = sunRef.current
    const target = targetRef.current
    if (!light || !target) return
    light.target = target
    target.updateMatrixWorld()
    light.shadow.camera.updateProjectionMatrix()
  }, [preset, q.shadowRadius])

  const r = q.shadowRadius

  return (
    <group>
      {preset.stars ? (
        <>
          <NightSky moon={sunDir} />
          <Stars radius={900} depth={260} count={2600} factor={9} saturation={0} fade speed={0.4} />
          <mesh position={sunPos.toArray()}>
            <sphereGeometry args={[26, 24, 16]} />
            <meshBasicMaterial color="#eef3ff" toneMapped={false} />
          </mesh>
        </>
      ) : (
        <Sky
          distance={2500}
          sunPosition={sunPos.toArray()}
          turbidity={preset.turbidity}
          rayleigh={preset.rayleigh}
          mieCoefficient={preset.mieCoefficient}
          mieDirectionalG={preset.mieDirectionalG}
        />
      )}

      <object3D ref={targetRef} position={[0, 12, 30]} />

      <directionalLight
        ref={sunRef}
        position={sunPos.toArray()}
        intensity={preset.sunIntensity}
        color={preset.sunColor}
        castShadow={q.shadows}
        shadow-mapSize-width={q.shadowMapSize}
        shadow-mapSize-height={q.shadowMapSize}
        shadow-camera-left={-r}
        shadow-camera-right={r}
        shadow-camera-top={r}
        shadow-camera-bottom={-r}
        shadow-camera-near={SUN_DISTANCE - 400}
        shadow-camera-far={SUN_DISTANCE + 500}
        shadow-bias={-0.0006}
        shadow-normalBias={0.05}
      />

      {/* Warm light bouncing back off the sandstone terrace and the garden. */}
      <directionalLight
        position={[-sunDir.x * 300, 90, -sunDir.z * 300]}
        intensity={preset.bounceIntensity}
        color={preset.bounceColor}
      />

      <hemisphereLight
        intensity={preset.hemiIntensity}
        color={preset.hemiSky}
        groundColor={preset.hemiGround}
      />

      {preset.lanterns && <Lanterns />}
    </group>
  )
}
