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
    growth.js          records, times and plays growth on a canvas (12fps beat)
    Field.jsx          the canvas: input, keep-outs, the frog, resize
    Specimen.jsx       a project render standing in its own growth; "3d model (+)"
                       turns it into the 3D model in place
  ui/
    Overlay.jsx        name, Works / About / Contact folds, hint, clock
    Clock.jsx          live Las Vegas time
    ProjectSheet.jsx   one project: specimen (lifts into 3D), facts, full notes
  components/media/    ModelPlate (3D viewer), ImageLightbox
  hooks/, utils/       media queries, preload, encrypted email
```

Each form is a generator: it lays down a little ink and yields, so the
field can pace it across frames. To add a plant, write a generator in
`forms.js` and add it to `anyForm`.

Any element marked `data-keepout` stays clear of new ink.
Reduced motion: each growth is drawn complete, instantly.

Each project sheet does the same thing as the frog with the project's render:
the render is masking fluid, and when it scrolls into view the ground and the
project's `plant` (data.js) grow around it. It's seeded by the project, so it
comes up the same way every visit.

## Frog reveal video

`tools/frog-reveal/` renders the site's opening (the clearing growing in over
the frog) as video with a transparent background, the frog left as a hole in
the growth. With the dev server running, open `/tools/frog-reveal/` to watch
it, or render files into `media/frog-reveal/`:

```bash
npm i --no-save puppeteer-core ffmpeg-static   # once
node tools/frog-reveal/render.mjs              # 1920×1080, 12fps, ~6s
node tools/frog-reveal/render.mjs w=540 h=960 flowers=12 --name frog-vertical
```

`media/frog-reveal/versions/` holds eight different versions in the vine style
(a tighter clearing, with vines wrapping the frog and opening the site's
plants), each from its own seed, picked from 24 for how completely they
outline the frog. `frog-reveal-grid.mp4` shows them side by side, and
`seeds.txt` lists the params to re-render any one. For a fresh batch:

```bash
node tools/frog-reveal/render.mjs style=vine --versions 8 --seeds w
```

Out come, with alpha: a `.mov` (QuickTime Animation, lossless) for editing,
a VP9 `.webm`, an animated `-preview.png` (half size; plays in phone
browsers), and the last frame as a `.png`. Without: `.mp4`s on the paper
colour and over a checkerboard (to see the transparency on a phone, which
can't play video with alpha). Page params
are listed at the top of `reveal.js`.
