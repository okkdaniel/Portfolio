---
tags: [code, art]
updated: 2026-10-05
---

# Art engine

How the growth works. Files in `src/art/`. See [[Site overview]].

## Ink (`ink.js`)

- Two marks. **wash**: a soft disc of halftone dots on one fixed screen grid (pitch 3 CSS px, 2.2 on phones), dense in the middle, ragged at the edge. **seed**: one crisp dot (spores, capsules).
- Marks go onto a transparent scratch layer, which is **multiplied** onto the paper once per frame over the dirty rect (much cheaper than multiplying every wash).
- Palette `C`: moss, lichen, spring, fern, fir, spruce, glacier, rain, cedar, rust, sun, bark, berry, salal, stone, plus fireweed and lupine (used only by video flowers).
- **Keep-outs**: rects ink fades away from over a feathered, wobbly edge (`ink.feather` / `ink.wobble`, default 70/36).
- **Resist** (masking fluid): an alpha mask (`resistFrom(img, x, y, w, h, spread)`); ink never lands inside. This is how the frog and project renders stay bare.

## Forms (`forms.js`)

- Each plant is a **generator** that lays a little ink and yields. Strokes are bracketed with `ink.open()/close()` so each eases on its own; a form can `yield { spawn }` another form (runners do).
- Plants: fern, fiddlehead, moss, lichen, conifer, cedar, runner, spores, bleed. `anyForm` picks one. `grow()` = what a click sets off. `clearing(box)` = the dense patch over the frog. `specimen(plant, box)` = a project render's patch. Video only: `wildflower`, `lupine`, `vine(path)`.
- **Seeded randomness**: all randomness goes through `random()`; `setRandom(fn)` swaps in `seeded(key)` (mulberry32). Same seed means the same plant.

## Growth (`growth.js`)

- `inkLayer(canvas, pitch)`: canvas + scratch + `flush()`, `size()`, `paper()`.
- `createGrowth(layer)`: generators run against a **recorder** (resumably, a few ms per frame) into a stroke tree; each stroke gets an **ease-out quart** timeline, child strokes start when the parent reaches their branch point; playback draws due marks on a **12fps beat** with time and dot budgets per frame.
- `plant(gens, { random, now })`. `now` draws instantly (reduced motion uses this). `timeline(gens)` returns timed marks for offline rendering ([[Frog reveal video]]).

## The field (`Field.jsx`)

- The frog (`public/assets/brand/anura.svg`) is a resist at `(w*0.66, h*0.56)` desktop / `(w*0.5, h*0.66)` phone; a `clearing` is planted over it 300ms after load; a second patch grows top-right at 2.2s on desktop.
- The **veil**: a second canvas of paper over the text, dithered along the same feather, hiding ink that grew before a fold opened over it.
- GPU warm-up draws in the top-left corner under the header so the first growth frames don't stall.
- **Memory + resize** (2026-10-02): every planting is stored as `{kind, fx, fy, k, seed, at}` (position as a fraction of the window), plus the cursor's spore trail. While a window is being resized, each frame sizes the canvas 1:1 and redraws the snapshot shifted so the frog keeps its layout position (no stretching). 150ms after resizing stops, a full redraw places everything for the new size (plantings under 9s old regrow) while the last frame fades out (`.field-ghost`). Height-only changes under 100px (phone toolbars) keep the painting. A full redraw costs ~100–150ms, too much to do per frame.
