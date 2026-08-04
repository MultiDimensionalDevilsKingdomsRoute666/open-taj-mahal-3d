/**
 * Shared virtual-joystick state.
 *
 * The on-screen joystick lives in the DOM overlay and walk mode lives inside
 * the canvas; passing the vector through a plain mutable ref rather than React
 * state keeps the joystick from re-rendering the scene sixty times a second.
 */
export const touchMove = {
  current: { x: 0, y: 0, sprint: false, jump: false },
}

export function resetTouchMove() {
  touchMove.current.x = 0
  touchMove.current.y = 0
  touchMove.current.sprint = false
  touchMove.current.jump = false
}
