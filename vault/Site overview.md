---
tags: [site, code]
updated: 2026-10-05
---

# Site overview

React 18 + Vite 5 single page. Hash routing only: `#work/<slug>` opens a project page; anything else is the field. See [[Home]].

## What's on screen

- **The field** (full-window canvas): paper with growth. See [[Art engine]].
- **Overlay** (`src/ui/Overlay.jsx`): top-left the name (no tagline, see [[Design taste]]) and three folds:
  - *Works*: the project list (`01` Rival Robotics 2024, `02` FRC Team 987 Offseason Robot, `03` Low Rise Monitor Stand). Opening it also surfaces the projects in the paper; see [[Works]].
  - *About*: UNR, Las Vegas, Sloan Canyon Robotics, FRC Team 987, link to old.danielkaliko.com.
  - *Contact*: email (stored encrypted, `src/utils/email.js`), GitHub @okkdaniel, LinkedIn /in/daniel-kaliko, résumé PDF.
- Bottom-left: ↻ (clear the paper) and "(click to grow)". Bottom-right: live Las Vegas clock.
- **Project page** (`src/ui/ProjectPage.jsx`): the paper itself, as a specimen plate, then the write-up. See [[Project sheets]].

## Code map

```
src/
  App.jsx              field, Works, pages, overlay; hands over between them
  styles.css           tokens + base (imports art/art.css, ui/ui.css)
  data.js              project records (title, renders, glb, plant, case study)
  art/
    ink.js             wash + seed marks, palette C, resistFrom (masking fluid)
    forms.js           plants as generators; seeded randomness; clearing,
                       specimen, wildflower, lupine, vine
    growth.js          inkLayer (scratch + multiply flush), createGrowth
                       (record, ease, 12fps playback, timeline for offline)
    Field.jsx          the window canvas: frog, input, keep-outs/veil, resize
    Works.jsx          projects as silhouettes in the paper while Works is open
  ui/                  Overlay, Clock, ProjectPage, ui.css
  components/media/    ModelPlate (3D, model-viewer), ImageLightbox
tools/frog-reveal/     video renderer (dev only, not deployed)
media/frog-reveal/     rendered videos (committed)
vault/                 these notes
```

## Data

`src/data.js` holds `SAMPLE_PROJECTS`. Per project: `slug`, `index`, `title`, `lede`, `preview` (wireframe PNG), `hero` (cut-out render PNG), optional `model` (.glb), `plant` ("conifer" | "cedar" | "fern"), optional `seed`, plus case-study fields shown under "details".

## Link previews

`index.html` has Open Graph/Twitter tags. `public/og.jpg` (1200×630) is the frog surfacing in its clearing, rendered from the site itself, text-free. Description: "Engineering student at the University of Nevada, Reno."

## Leftovers

About 20 files in `public/assets/` from the old site aren't referenced anywhere (skill icons, leopard/contour patterns, wordmark/monogram, old project SVGs). Harmless; see [[Ideas and open threads]].
