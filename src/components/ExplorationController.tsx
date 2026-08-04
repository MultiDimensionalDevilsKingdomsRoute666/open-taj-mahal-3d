import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useExperience } from '../state/useExperience'
import { touchMove } from '../lib/touchInput'
import { groundHeight, resolve } from '../lib/collision'
import { HERO, INTRO_START } from '../lib/viewpoints'
import { RIVER_Z_NEAR } from '../lib/dimensions'

const EYE_HEIGHT = 1.68
/**
 * Brisk by design. The garden alone is 300 m on a side and it is another
 * 130 m from the gate to the tank, so a realistic 1.4 m/s stroll turns
 * crossing the site into a chore.
 */
const WALK_SPEED = 9.5
const SPRINT_SPEED = 22
const ACCEL = 13
const DAMP = 9
const BODY_RADIUS = 0.6
const GRAVITY = 22
const JUMP = 6.4

/* --------------------------------------------------------------- keyboard */

function useKeys() {
  const keys = useRef<Record<string, boolean>>({})
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true
      // Stop the page scrolling out from under the canvas.
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false
    }
    const blur = () => {
      keys.current = {}
    }
    window.addEventListener('keydown', down, { passive: false })
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])
  return keys
}

/* ------------------------------------------------------------- walk mode */

/**
 * First-person walking with mouse look, momentum, sprint, a jump and
 * analytic collision against the monument, minarets, side buildings and
 * boundary walls. Ground height comes from `groundHeight`, so the stairs up
 * to the terrace and the plinth are genuinely walkable.
 *
 * On touch devices the virtual joystick in the UI feeds the same `touchMove`
 * vector, and a drag anywhere else on the screen turns the head.
 */
function WalkMode({ active }: { active: boolean }) {
  const { camera, gl } = useThree()
  const keys = useKeys()

  const state = useRef({
    yaw: Math.PI,
    pitch: -0.06,
    velocity: new THREE.Vector3(),
    vy: 0,
    grounded: true,
  })

  /*
   * Mouse look.
   *
   * Deliberately drag-to-look rather than pointer lock. Grabbing the pointer
   * the moment you click the scene hides the cursor and makes every control
   * in the dock unreachable until you happen to guess Escape — which reads,
   * correctly, as "none of the buttons work". Dragging costs a little
   * ergonomics and keeps the whole interface usable at all times.
   */
  useEffect(() => {
    if (!active) return
    const el = gl.domElement
    let dragging = false
    let lastX = 0
    let lastY = 0

    const look = (dx: number, dy: number, scale: number) => {
      const s = state.current
      s.yaw -= dx * scale
      s.pitch = THREE.MathUtils.clamp(s.pitch - dy * scale, -1.35, 1.35)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return
      look(e.clientX - lastX, e.clientY - lastY, 0.004)
      lastX = e.clientX
      lastY = e.clientY
    }
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      el.style.cursor = 'grabbing'
    }
    const onUp = () => {
      dragging = false
      el.style.cursor = ''
    }

    let touchId: number | null = null
    const onTouchStart = (e: TouchEvent) => {
      const t = e.changedTouches[0]
      // The left third of the screen belongs to the joystick.
      if (t.clientX < window.innerWidth * 0.34) return
      touchId = t.identifier
      lastX = t.clientX
      lastY = t.clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== touchId) continue
        look(t.clientX - lastX, t.clientY - lastY, 0.005)
        lastX = t.clientX
        lastY = t.clientY
      }
    }
    const onTouchEnd = () => {
      touchId = null
    }

    el.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onUp)
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)

    return () => {
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onUp)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.style.cursor = ''
    }
  }, [active, gl])

  /* Seed the walker from wherever the camera currently is. */
  useEffect(() => {
    if (!active) return
    const s = state.current
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    s.yaw = Math.atan2(-dir.x, -dir.z)
    s.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1))
    s.velocity.set(0, 0, 0)
    s.vy = 0
    const ground = groundHeight(camera.position.x, camera.position.z)
    camera.position.y = ground + EYE_HEIGHT
  }, [active, camera])

  const forward = useMemo(() => new THREE.Vector3(), [])
  const right = useMemo(() => new THREE.Vector3(), [])
  const wish = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, rawDt) => {
    if (!active) return
    const dt = Math.min(rawDt, 0.05)
    const s = state.current
    const k = keys.current
    const touch = touchMove.current

    forward.set(-Math.sin(s.yaw), 0, -Math.cos(s.yaw))
    right.set(Math.cos(s.yaw), 0, -Math.sin(s.yaw))

    let fz = 0
    let fx = 0
    if (k['KeyW'] || k['ArrowUp']) fz += 1
    if (k['KeyS'] || k['ArrowDown']) fz -= 1
    if (k['KeyD'] || k['ArrowRight']) fx += 1
    if (k['KeyA'] || k['ArrowLeft']) fx -= 1
    fz += touch.y
    fx += touch.x

    wish.set(0, 0, 0).addScaledVector(forward, fz).addScaledVector(right, fx)
    if (wish.lengthSq() > 1) wish.normalize()

    const speed = k['ShiftLeft'] || k['ShiftRight'] || touch.sprint ? SPRINT_SPEED : WALK_SPEED

    /*
     * Exponentially approach the target velocity. The obvious
     * "add acceleration, then damp" formulation settles at accel/damping,
     * which is nowhere near the intended top speed — raising WALK_SPEED then
     * does almost nothing, which is exactly how walking ended up feeling
     * sluggish. This reaches `speed` exactly and decelerates the same way.
     */
    wish.multiplyScalar(speed)
    const rate = 1 - Math.exp(-(wish.lengthSq() > 0 ? ACCEL : DAMP) * dt)
    s.velocity.lerp(wish, rate)

    const next = camera.position.clone().addScaledVector(s.velocity, dt)
    resolve(next, BODY_RADIUS)

    const ground = groundHeight(next.x, next.z) + EYE_HEIGHT
    if (s.grounded && (k['Space'] || touch.jump)) {
      s.vy = JUMP
      s.grounded = false
    }
    s.vy -= GRAVITY * dt
    let y = camera.position.y + s.vy * dt

    if (y <= ground) {
      // Step up onto stairs and kerbs smoothly rather than snapping.
      y = ground
      s.vy = 0
      s.grounded = true
    } else {
      s.grounded = false
    }
    // Belt and braces: never end up under the map.
    if (y < ground) y = ground

    camera.position.set(next.x, y, next.z)
    camera.rotation.set(0, 0, 0)
    camera.rotateY(s.yaw)
    camera.rotateX(s.pitch)
  })

  return null
}

/* ---------------------------------------------------------- explore mode */

/**
 * Orbit around the monument with damping, sensible distance limits and a
 * polar clamp that stops the camera dropping below the garden.
 */
function ExploreMode({ active }: { active: boolean }) {
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const { camera } = useThree()
  const keys = useKeys()
  const resetToken = useExperience((s) => s.resetToken)
  const introToken = useExperience((s) => s.introToken)
  const tourActive = useExperience((s) => s.tourActive)

  /* The opening move: glide forward from behind the hero framing. */
  const intro = useRef<{ t: number; running: boolean }>({ t: 0, running: false })
  const introVecs = useMemo(
    () => ({
      p0: new THREE.Vector3(...INTRO_START.position),
      p1: new THREE.Vector3(...HERO.position),
      t0: new THREE.Vector3(...INTRO_START.target),
      t1: new THREE.Vector3(...HERO.target),
    }),
    [],
  )

  useEffect(() => {
    if (!active || introToken === 0) return
    camera.position.set(...INTRO_START.position)
    controls.current?.target.set(...INTRO_START.target)
    intro.current = { t: 0, running: true }
  }, [introToken, active, camera])

  useEffect(() => {
    if (!active || resetToken === 0) return
    intro.current.running = false
    camera.position.set(...HERO.position)
    controls.current?.target.set(...HERO.target)
    controls.current?.update()
  }, [resetToken, active, camera])

  /* Scratch vectors for the keyboard fly-around. */
  const fly = useMemo(
    () => ({ f: new THREE.Vector3(), r: new THREE.Vector3(), d: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }),
    [],
  )

  useFrame((_, rawDt) => {
    if (!active || tourActive) return
    const dt = Math.min(rawDt, 0.05)

    /* The opening move takes priority while it is running. */
    if (intro.current.running) {
      const i = intro.current
      i.t = Math.min(1, i.t + dt / 5.5)
      // Ease out so the move settles rather than stopping dead.
      const e = 1 - Math.pow(1 - i.t, 3)
      camera.position.lerpVectors(introVecs.p0, introVecs.p1, e)
      controls.current?.target.lerpVectors(introVecs.t0, introVecs.t1, e)
      if (i.t >= 1) i.running = false
      return
    }

    /*
     * Keyboard fly-around. Orbiting alone pins you to one point of interest;
     * being able to truck the pivot around the site is what makes explore
     * mode feel like flying over the complex rather than spinning a model on
     * a turntable. The camera and its pivot move together so the framing is
     * preserved.
     */
    const k = keys.current
    const target = controls.current?.target
    if (!target) return

    let fwd = 0
    let side = 0
    let lift = 0
    if (k['KeyW'] || k['ArrowUp']) fwd += 1
    if (k['KeyS'] || k['ArrowDown']) fwd -= 1
    if (k['KeyD'] || k['ArrowRight']) side += 1
    if (k['KeyA'] || k['ArrowLeft']) side -= 1
    if (k['KeyE'] || k['Space']) lift += 1
    if (k['KeyQ'] || k['ShiftLeft'] || k['ShiftRight']) lift -= 1
    if (!fwd && !side && !lift) return

    // Speed scales with how far out you are, so the same key feels right
    // whether you are inspecting an arch or looking at the whole complex.
    const dist = camera.position.distanceTo(target)
    const speed = THREE.MathUtils.clamp(dist * 0.55, 12, 130) * dt

    fly.f.subVectors(target, camera.position).setY(0).normalize()
    fly.r.crossVectors(fly.f, fly.up).normalize()
    fly.d.set(0, 0, 0).addScaledVector(fly.f, fwd).addScaledVector(fly.r, side).addScaledVector(fly.up, lift)
    if (fly.d.lengthSq() === 0) return
    fly.d.normalize().multiplyScalar(speed)

    camera.position.add(fly.d)
    target.add(fly.d)

    // Keep the pivot inside the site and above the ground.
    target.y = Math.max(target.y, 1)
    target.x = THREE.MathUtils.clamp(target.x, -430, 430)
    target.z = THREE.MathUtils.clamp(target.z, -420, 560)
    controls.current?.update()
  })

  return (
    <OrbitControls
      ref={controls}
      enabled={active && !tourActive}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.52}
      zoomSpeed={0.9}
      panSpeed={0.9}
      // Screen-space panning so a right-drag lifts and lowers the view the
      // way the mouse moves, rather than sliding along the ground plane.
      screenSpacePanning
      minDistance={6}
      maxDistance={620}
      /**
       * Slightly past the horizontal. Clamping to exactly 90 degrees would
       * make it impossible to sit below the orbit target, which is precisely
       * where the iconic low view from the end of the pool is taken from.
       * The hard floor on camera.y in `ExplorationController` stops the
       * camera dropping through the garden at extreme zoom-out.
       */
      maxPolarAngle={1.68}
      minPolarAngle={0.06}
      target={[HERO.target[0], HERO.target[1], HERO.target[2]]}
      makeDefault
    />
  )
}

/* -------------------------------------------------------------- exported */

export function ExplorationController() {
  const mode = useExperience((s) => s.mode)
  const tourActive = useExperience((s) => s.tourActive)
  const phase = useExperience((s) => s.phase)
  const setPointerLocked = useExperience((s) => s.setPointerLocked)
  const { camera } = useThree()

  // Nothing grabs the pointer any more; make sure the flag can never stick.
  useEffect(() => setPointerLocked(false), [setPointerLocked])

  /* Keep the camera out of the river and off the floor in every mode. */
  useFrame(() => {
    if (camera.position.y < 1.2) camera.position.y = 1.2
    if (camera.position.z < RIVER_Z_NEAR - 220) camera.position.z = RIVER_Z_NEAR - 220
  })

  const live = phase === 'running' && !tourActive
  return (
    <>
      <WalkMode active={live && mode === 'walk'} />
      <ExploreMode active={phase === 'running' && mode === 'explore'} />
    </>
  )
}
