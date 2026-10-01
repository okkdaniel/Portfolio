# Daniel Kaliko — Undergrowth

A circuit board that is also a Pacific Northwest forest floor at night.
Copper traces grow like firs and roots, routed only at PCB angles; as they
age they oxidize through verdigris into moss, then fade, so the board slowly
regrows and is never the same twice. Fog drifts, fireflies pulse, and the
anura frog hops between solder pads.

Move to grow. Click to solder. The frog knows things.

> The previous, editorial portfolio lives on `main` (and is tagged
> `v1-original`). This `redesign` branch deploys to its own Vercel preview.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # serve the production build
```

## Structure

```
src/
  App.jsx              board + overlay; '#work/<slug>' opens a project sheet
  styles.css           tokens + base (imports art/art.css, ui/ui.css)
  data.js              project records (drive Works and the project sheets)
  art/
    growth.js          growth engine: lattice, tips, branching, ring buffers
    Board.jsx          canvas renderer, patina, fireflies, pointer input
    Atmosphere.jsx     fog, vignette, grain (pure CSS)
    Frog.jsx           the anura mark, hopping between pads
  ui/
    Overlay.jsx        name, Works / About / Contact folds, hint, clock
    Clock.jsx          live Las Vegas time
    ProjectSheet.jsx   one project: 3D model, print, facts, full notes
  components/media/    ModelPlate (3D viewer), ImageLightbox
  hooks/, utils/       media queries, preload, encrypted email
```

Any element marked `data-keepout` becomes a keep-out zone: traces route
around it, the way they would around a component on a real board.

Reduced motion: the board is pre-grown and drawn still; clicks still solder.
