import { useCallback, useEffect, useState } from 'react'
import { useExperience } from '../state/useExperience'
import { QUALITY, TIME_ORDER, TIME_PRESETS, type Quality } from '../lib/settings'
import { TOUR } from '../lib/viewpoints'
import { MobileControls } from './MobileControls'
import { ControlsHelp } from './ControlsHelp'

const QUALITIES: Quality[] = ['performance', 'balanced', 'ultra']

function useFullscreen() {
  const [active, setActive] = useState(false)
  useEffect(() => {
    const onChange = () => setActive(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const supported =
    typeof document !== 'undefined' && Boolean(document.documentElement.requestFullscreen)

  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.()
  }, [])

  return { active, toggle, supported }
}

/* ------------------------------------------------------------------ icons */

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

const ICONS = {
  walk: 'M13 4.5a1.2 1.2 0 1 0 0-.1M11 21l1.8-5.2L10 13l.8-4.4L8 10v3M14.6 21l-1.8-5.2 1.6-2.6.9 2.6 2.2 1.4',
  orbit: 'M12 3a9 9 0 1 0 9 9M21 3l-6 6M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  tour: 'M5 4.5v15l7-4 7 4v-15l-7 4z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8h.01M11 12h1v4h1',
  sound: 'M4 9v6h4l5 4V5L8 9H4zM17 9a4 4 0 0 1 0 6',
  mute: 'M4 9v6h4l5 4V5L8 9H4zM17 10l4 4M21 10l-4 4',
  reset: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  full: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  exitFull: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4M12 17h.01',
  gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 14h-.3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1v-.3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z',
}

/* -------------------------------------------------------------------- UI */

/**
 * The whole interface: a title, one control bar, one settings panel and a
 * help sheet. Everything is translucent and sits at the edges so the monument
 * is never obscured. There are no placeholder buttons — every control here
 * does something.
 */
export function ExperienceUI() {
  const phase = useExperience((s) => s.phase)
  const mode = useExperience((s) => s.mode)
  const setMode = useExperience((s) => s.setMode)
  const timeOfDay = useExperience((s) => s.timeOfDay)
  const setTimeOfDay = useExperience((s) => s.setTimeOfDay)
  const quality = useExperience((s) => s.quality)
  const setQuality = useExperience((s) => s.setQuality)
  const tourActive = useExperience((s) => s.tourActive)
  const tourStop = useExperience((s) => s.tourStop)
  const startTour = useExperience((s) => s.startTour)
  const stopTour = useExperience((s) => s.stopTour)
  const infoVisible = useExperience((s) => s.infoVisible)
  const toggleInfo = useExperience((s) => s.toggleInfo)
  const helpVisible = useExperience((s) => s.helpVisible)
  const toggleHelp = useExperience((s) => s.toggleHelp)
  const audioEnabled = useExperience((s) => s.audioEnabled)
  const toggleAudio = useExperience((s) => s.toggleAudio)
  const resetCamera = useExperience((s) => s.resetCamera)
  const pointerLocked = useExperience((s) => s.pointerLocked)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const fullscreen = useFullscreen()

  /* Keyboard shortcuts. */
  useEffect(() => {
    if (phase !== 'running') return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey) return
      switch (e.code) {
        case 'KeyM':
          setMode(mode === 'walk' ? 'explore' : 'walk')
          break
        case 'KeyT':
          if (tourActive) stopTour()
          else startTour()
          break
        case 'KeyI':
          toggleInfo()
          break
        case 'KeyH':
          toggleHelp()
          break
        case 'KeyR':
          resetCamera()
          break
        case 'KeyF':
          fullscreen.toggle()
          break
        case 'Escape':
          if (tourActive) stopTour()
          else if (helpVisible) toggleHelp()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, mode, tourActive, helpVisible, setMode, startTour, stopTour, toggleInfo, toggleHelp, resetCamera, fullscreen])

  if (phase !== 'running') return null

  const hidden = tourActive || pointerLocked

  return (
    <div className={`ui ${hidden ? 'ui--dim' : ''}`}>
      {/* ---------------------------------------------------------- title */}
      <header className="ui__title">
        <h1>Taj Mahal</h1>
        <p>An Interactive Journey</p>
      </header>

      {/* ------------------------------------------------ time of day rail */}
      <div className="ui__times" role="group" aria-label="Time of day">
        {TIME_ORDER.map((t) => (
          <button
            key={t}
            className={`time ${timeOfDay === t ? 'time--on' : ''}`}
            onClick={() => setTimeOfDay(t)}
            aria-pressed={timeOfDay === t}
          >
            <span className={`time__dot time__dot--${t}`} aria-hidden="true" />
            <span className="time__label">{TIME_PRESETS[t].label}</span>
          </button>
        ))}
      </div>

      {/* --------------------------------------------------- settings card */}
      {settingsOpen && (
        <div className="panel panel--settings">
          <h2>Graphics quality</h2>
          <div className="seg">
            {QUALITIES.map((qq) => (
              <button
                key={qq}
                className={`seg__btn ${quality === qq ? 'seg__btn--on' : ''}`}
                onClick={() => setQuality(qq)}
                aria-pressed={quality === qq}
              >
                {QUALITY[qq].label}
              </button>
            ))}
          </div>
          <p className="panel__note">
            Changing quality rebuilds the textures and takes a moment. Balanced suits most laptops.
          </p>
        </div>
      )}

      {/* ------------------------------------------------------ tour strip */}
      {tourActive && (
        <div className="tour">
          <div className="tour__label">
            <span className="tour__index">
              {tourStop + 1} / {TOUR.length}
            </span>
            <span className="tour__name">{TOUR[tourStop]?.label}</span>
          </div>
          <button className="btn btn--ghost" onClick={stopTour}>
            Exit Tour
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------ dock */}
      <nav className="dock" aria-label="Experience controls">
        <div className="dock__group">
          <button
            className={`btn btn--icon ${mode === 'walk' ? 'btn--on' : ''}`}
            onClick={() => setMode('walk')}
            title="Walk mode (M)"
            aria-pressed={mode === 'walk'}
          >
            <Icon d={ICONS.walk} />
            <span>Walk</span>
          </button>
          <button
            className={`btn btn--icon ${mode === 'explore' ? 'btn--on' : ''}`}
            onClick={() => setMode('explore')}
            title="Explore mode (M)"
            aria-pressed={mode === 'explore'}
          >
            <Icon d={ICONS.orbit} />
            <span>Explore</span>
          </button>
        </div>

        <div className="dock__group">
          <button
            className={`btn btn--icon ${tourActive ? 'btn--on' : ''}`}
            onClick={() => (tourActive ? stopTour() : startTour())}
            title="Cinematic tour (T)"
          >
            <Icon d={ICONS.tour} />
            <span>Tour</span>
          </button>
          <button
            className={`btn btn--icon ${infoVisible ? 'btn--on' : ''}`}
            onClick={toggleInfo}
            title="Information markers (I)"
            aria-pressed={infoVisible}
          >
            <Icon d={ICONS.info} />
            <span>Info</span>
          </button>
        </div>

        <div className="dock__group">
          <button className="btn btn--icon" onClick={resetCamera} title="Reset view (R)">
            <Icon d={ICONS.reset} />
            <span>Reset</span>
          </button>
          <button
            className={`btn btn--icon ${audioEnabled ? 'btn--on' : ''}`}
            onClick={toggleAudio}
            title={audioEnabled ? 'Mute ambience' : 'Play ambience'}
            aria-pressed={audioEnabled}
          >
            <Icon d={audioEnabled ? ICONS.sound : ICONS.mute} />
            <span>{audioEnabled ? 'Sound' : 'Muted'}</span>
          </button>
          {fullscreen.supported && (
            <button className="btn btn--icon" onClick={fullscreen.toggle} title="Fullscreen (F)">
              <Icon d={fullscreen.active ? ICONS.exitFull : ICONS.full} />
              <span>Full</span>
            </button>
          )}
          <button
            className={`btn btn--icon ${settingsOpen ? 'btn--on' : ''}`}
            onClick={() => setSettingsOpen((v) => !v)}
            title="Graphics quality"
            aria-pressed={settingsOpen}
          >
            <Icon d={ICONS.gear} />
            <span>Quality</span>
          </button>
          <button
            className={`btn btn--icon ${helpVisible ? 'btn--on' : ''}`}
            onClick={toggleHelp}
            title="Controls (H)"
            aria-pressed={helpVisible}
          >
            <Icon d={ICONS.help} />
            <span>Help</span>
          </button>
        </div>
      </nav>

      <ControlsHelp />
      <MobileControls />
    </div>
  )
}
