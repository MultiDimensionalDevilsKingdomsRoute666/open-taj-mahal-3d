import { useExperience } from '../state/useExperience'

const WALK = [
  ['W A S D', 'Move through the garden'],
  ['Drag', 'Look around'],
  ['Shift', 'Sprint'],
  ['Space', 'Jump'],
]

const EXPLORE = [
  ['Drag', 'Orbit the monument'],
  ['Scroll', 'Zoom in and out'],
  ['Right-drag', 'Pan up, down and across'],
  ['W A S D', 'Fly across the site'],
  ['E / Q', 'Rise and descend'],
]

const SHORTCUTS = [
  ['M', 'Switch walk / explore'],
  ['T', 'Cinematic tour'],
  ['I', 'Information markers'],
  ['R', 'Reset to the front view'],
  ['F', 'Fullscreen'],
  ['H', 'Show or hide this panel'],
]

/** The controls reference. Opened from the dock or with H. */
export function ControlsHelp() {
  const helpVisible = useExperience((s) => s.helpVisible)
  const toggleHelp = useExperience((s) => s.toggleHelp)
  const mode = useExperience((s) => s.mode)

  if (!helpVisible) return null

  return (
    <div className="panel panel--help" role="dialog" aria-label="Controls">
      <div className="panel__head">
        <h2>Controls</h2>
        <button className="btn btn--ghost btn--tight" onClick={toggleHelp} aria-label="Close">
          Close
        </button>
      </div>

      <section>
        <h3>{mode === 'walk' ? 'Walk mode' : 'Explore mode'}</h3>
        <dl>
          {(mode === 'walk' ? WALK : EXPLORE).map(([k, v]) => (
            <div key={k}>
              <dt>
                <kbd>{k}</kbd>
              </dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h3>Shortcuts</h3>
        <dl>
          {SHORTCUTS.map(([k, v]) => (
            <div key={k}>
              <dt>
                <kbd>{k}</kbd>
              </dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h3>On touch</h3>
        <p className="panel__note">
          Drag to look or orbit, pinch to zoom. In walk mode a joystick appears at the lower left.
        </p>
      </section>
    </div>
  )
}
