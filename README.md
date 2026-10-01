# Daniel Kaliko

A sheet of paper that things grow on. Click the ground and a patch of the
Pacific Northwest comes up: ferns unfurling from fiddleheads, moss cushions
with their spore capsules, lichen rosettes, firs and drooping cedar, with
roots creeping outward and opening more plants as they go.

Everything is drawn in halftone washes on one screen grid and multiplied
onto the paper, so overlapping color deepens like watercolor. The canvas is
never cleared; the field only accumulates until you start again (↻).

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
  App.jsx              field + overlay; '#work/<slug>' opens a project sheet
  styles.css           tokens + base (imports art/art.css, ui/ui.css)
  data.js              project records (drive Works and the project sheets)
  art/
    ink.js             the two marks (halftone wash, seed) and the palette
    forms.js           fern, fiddlehead, moss, lichen, conifer, cedar, runners
    Field.jsx          the canvas: paces growth, input, keep-outs, resize
  ui/
    Overlay.jsx        name, Works / About / Contact folds, hint, clock
    Clock.jsx          live Las Vegas time
    ProjectSheet.jsx   one project: 3D model, render, facts, full notes
  components/media/    ModelPlate (3D viewer), ImageLightbox
  hooks/, utils/       media queries, preload, encrypted email
```

Each form is a generator: it lays down a little ink and yields, so the
field can pace it across frames. To add a plant, write a generator in
`forms.js` and add it to `anyForm`.

Any element marked `data-keepout` stays clear of new ink.
Reduced motion: each growth is drawn complete, instantly.
