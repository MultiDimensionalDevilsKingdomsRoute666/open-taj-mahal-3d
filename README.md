# Taj Mahal — An Interactive Journey

A real-time 3D recreation of the Taj Mahal and its Charbagh complex at Agra, built with
React, TypeScript, Vite and Three.js. Walk the garden, follow the reflecting pool,
climb to the marble plinth, or let a cinematic tour carry you through the site at
sunrise, noon, golden hour or under a full moon.

**Live: https://open-taj-mahal-3d.vercel.app**

---

## What this is

Every stone in the scene is generated procedurally at runtime. There are no downloaded
models, no HDRI environment maps and no photographic textures — the entire experience is
about 415 kB gzipped, and the marble, sandstone, pietra dura inlay, jali screens and
calligraphic banding are all drawn onto 2D canvases when the page loads.

The geometry is driven from a single table of survey dimensions
([`src/lib/dimensions.ts`](src/lib/dimensions.ts)) so the proportions hold together:
the 95.5 m marble plinth, the ~57 m octagonal tomb with its chamfered corner bays, the
33 m pishtaq on each of the four faces, the 12 m drum, the onion dome, the 9.6 m gilded
finial, and four minarets over 40 m tall leaning very slightly outward.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

```bash
npm run build      # type-check and build to dist/
npm run preview    # serve the production build locally
npm run lint       # ESLint
npm run typecheck  # tsc only
```

Node 20 or newer.

## Controls

**Explore mode** (default)

| Input | Action |
| --- | --- |
| Drag | Orbit the monument |
| Scroll | Zoom |
| Right-drag | Pan up, down and across |
| `W` `A` `S` `D` | Fly across the site |
| `E` / `Q` | Rise and descend |

**Walk mode**

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` | Walk |
| Drag | Look around |
| `Shift` | Sprint |
| `Space` | Jump |

**Anywhere**

| Key | Action |
| --- | --- |
| `M` | Switch walk / explore |
| `T` | Start or stop the cinematic tour |
| `I` | Information markers |
| `R` | Reset to the front view |
| `F` | Fullscreen |
| `H` | Controls panel |
| `Esc` | Exit the tour |

On touch devices a joystick appears at the lower left in walk mode; drag anywhere else to
look, and pinch to zoom in explore mode.

## Architecture

```
src/
  lib/
    dimensions.ts   Survey figures for the whole complex — the single source of truth
    shapes.ts       Mughal geometry: four-centred arches, onion profiles, guldastas
    textures.ts     Every texture, generated on a 2D canvas (marble, sandstone, jali…)
    materials.ts    Shared PBR materials, re-tinted per time of day
    settings.ts     Quality profiles and the four lighting presets
    collision.ts    Analytic collision and ground height for walk mode
    viewpoints.ts   Hero framing and the eleven cinematic tour stops
    facts.ts        Text for the information markers
    geoCache.ts     Shared BufferGeometry cache for repeated architecture
  components/       The scene graph (see below)
  ui/               DOM overlay: loading screen, dock, help, mobile controls
  state/            Zustand store
```

The monument is composed from reusable pieces rather than one large mesh:
`TajMahalComplex` → `MarblePlatform`, `MainMausoleum` (→ `MainIwan`, `DecorativeArch`,
`Chhatri`, `MainDome`), four `Minaret`s from one component, `Mosque` used twice for the
mosque and its jawab, `EntranceGate`, `CharbaghGarden` (→ `ReflectingPool`, `Fountain`,
`Tree`), `YamunaRiver` and `Terrain`.

### Notes on a few decisions

**Openings are real holes.** Every arch is punched through the wall geometry with
`wallShape()`, then given stepped archivolt bands and a hollow reveal drawn inside-out.
Dark rectangles painted on a flat slab do not survive being walked up to.

**The onion dome profile is hand-traced.** A hemisphere is the single most common way to
get the Taj Mahal wrong. `ONION_CONTROL` in `shapes.ts` is a control polygon with a
pinched neck, the widest point about a third of the way up, and a long ogee taper to a
near-point.

**Texel density is per-geometry, not per-material.** Building materials tile once per UV
unit and each geometry scales its own UVs to a fixed metres-per-repeat, which is what
stops the marble looking like different stone on different walls.

**Instanced meshes use callback refs.** React Three Fiber rebuilds an `InstancedMesh`
whenever its `args` change identity — which happens every time the quality selector swaps
the shared materials. An effect keyed on the transform list alone never re-runs, and every
instance silently collapses to the origin.

**No screen-space ambient occlusion.** It was implemented and removed: against the
alpha-tested tree canopies the normal pass is noisy wherever a card cuts out, and every
setting strong enough to occlude the building also speckled the garden. Contact darkening
is handled in the materials instead — recesses, reveals and blind arcading each carry
their own shaded backing.

**No pointer lock.** Walk mode uses drag-to-look. Capturing the pointer the moment you
click the scene hides the cursor and puts every control out of reach until you guess
`Escape`, which reads — correctly — as the interface being broken.

## Performance

Three quality profiles, selectable from the dock; **Balanced** is the default, and
`detectQuality()` drops to **Performance** on mobile or on machines reporting four cores
or less.

| | Performance | Balanced | Ultra |
| --- | --- | --- | --- |
| Device pixel ratio | 0.7–1 | 1–1.5 | 1–2 |
| Shadow map | 1024 PCF | 2048 PCF soft | 4096 PCF soft |
| Planar reflections | none | 1 @ 256 | 3 @ 512 |
| Bloom | off | on | on |
| Radial segments | 24 | 40 | 64 |
| Garden trees | 90 | 190 | 300 |
| Birds | 0 | 14 | 22 |

Each planar reflection costs a full extra pass over the scene, so Balanced spends its one
reflection on the northern channel — the view the whole composition is built around — and
everything else falls back to the environment map.

Measured on Balanced at 1920×794: **1362 draw calls and 629k triangles per frame**, across
the main pass, the shadow pass and one reflection — roughly 450 draw calls per pass. Two
changes account for most of that: instancing the eight columns and eight arches inside
every chhatri (there are sixteen chhatris, so that alone is ~220 calls a frame), and
dropping the second reflector from Balanced.

Other measures: shared `BufferGeometry` across repeated architecture, instanced meshes for
trees, fountains, blind arcading, minaret banding and the gate's chhatri row, a GPU wind
shader so the foliage sways without touching the CPU, `AdaptiveDpr`, no shadow casting on
small decorative instances, and explicit disposal of every generated texture, geometry and
material when the experience unmounts or the quality profile changes.

Known cost: the whole scene is one ~1.4 MB JavaScript bundle (415 kB gzipped), dominated
by Three.js. It is not code-split because nothing in it can be deferred past the first
frame.

## Known limitations

- The interior of the mausoleum is not modelled. Doorways read as dark recesses; you
  cannot walk inside.
- The calligraphy is deliberately abstract. The real bands carry Quranic inscriptions in
  thuluth, and approximating scripture as decorative noise would be disrespectful, so the
  strokes here are non-textual by design.
- Pietra dura is a procedurally drawn floral motif, not a reproduction of the actual
  inlay panels.
- The Yamuna is a flat reflective plane; there is no flow simulation.
- Reflections are planar and single-bounce, so the pool does not reflect other reflections.
- Shadow coverage is a fixed frustum around the monument; trees at the far south end of
  the garden do not cast shadows at Performance quality.

## Deployment

Deployed on Vercel as a static Vite build.

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- `vercel.json` adds SPA rewrites and long-lived caching for hashed assets.

## Assets and licences

There are no third-party assets. All geometry and all textures are generated in code at
runtime, so there is nothing to attribute and nothing under a third-party licence.

The one external resource is the webfont pair (Cormorant Garamond and Inter) loaded from
Google Fonts, both under the SIL Open Font License 1.1.

Source code is MIT licensed — see [LICENSE](LICENSE).

"Taj Mahal" refers to a real monument and UNESCO World Heritage Site in Agra, India. This
project is an independent educational recreation and is not affiliated with the
Archaeological Survey of India or any other body.
