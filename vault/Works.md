---
tags: [code, site]
updated: 2026-10-05
---

# Works

How the projects show up when the **Works** fold opens (`src/art/Works.jsx`, added 2026-10-05). Daniel asked for a rework with full creative freedom, with the option to revert. See [[Site overview]], [[Project sheets]].

## The idea

The site's one trick, applied to the work: just as the frog is masking fluid revealed by growth, each project's cut-out render becomes masking fluid on a layer over the field, and a patch of that project's own growth comes up around it. The objects appear as **bare-paper silhouettes in the growth**. Hovering or focusing one fills in the render; clicking opens its sheet.

## Behaviour

- **Opening Works:** the home field **retracts** (`Field.retract()`, 1s; 0.55s was "too snappy", 1.2s "a little slow"): strokes and small marks come off **newest first**, a reversal, so plants shrink back toward their roots, while the ground goes cell by cell in roughly the same order with chance mixed in. Everything fades out in three staggered passes (35%, 50%, 100%) so the receding edge is soft. (Daniel tried oldest-first, `order: "oldest"`, then asked for the reversal back once the fade was in.) (Erasing every mark's whole disc read as "spots fading out"; Daniel wanted an actual reversal.) **At the same time** (Daniel wanted no pause; on wide screens the layout doesn't depend on the header, so nothing waits), the three specimens grow at a gentler pace than the field (`pace 1.6, ease 2`), and **vines** grow between them in a chain (nearest neighbour), opening small site plants and the odd flower.
- **Placement (wide screens): Daniel's sketch** (2026-10-06), `SKETCH` in `Works.jsx`: 01 low-left (0.207w, 0.712h), 02 high-middle just right of the header (0.539w, 0.284h), 03 mid-right and the biggest (0.824w, 0.617h); sizes ~0.26w (capped by 0.36h and 380px); vines 01→02→03. Fixed, not random.
- **Placement (narrow screens):** under the header, one of the `TALL` sets by chance, waiting for the fold to open. (Before the sketch, wide screens used one of a few **composed arrangements** (`WIDE` / `TALL` in `Works.jsx`: zigzag, rising, V shapes; fractions of the open paper), picked by chance **each visit**, jittered a little, projects dealt to its places at random, sizes ±15% around a big base (up to 360px desktop, 240px phone). Wide windows use the whole window (the header keeps its corner; any place touching it is pushed clear); narrow ones use the paper under the header. Pure random scattering looked odd to Daniel; then he sketched the layout he wanted.)
- **Each patch leans:** a heavy side (more and bigger washes, moss, the plant) thinning toward the other, with the outline kept at least half density so the shape still reads.
- **Arrival** (2026-10-09): each figure comes in moving: hover pose and zoomed in (ZOOM 8%), held until the reveal starts (0.6 s; was 1.1 s, Daniel wanted it falling into place as the growth reveals it), then eased back to rest and zoomed out over ~1.9 s (`arrive({ hold, settle })`; springs slowed to 0.38x until settled). A hover in the meantime is ignored unless it's a real one (on); pointer/hover takes over.
- Labels: number + title on wide screens, just the number on phones.
- Hover/focus a silhouette or its list item: the render fills the hole; highlight shared with the list.
- Click: opens the sheet; Works stays under it (dimmed).
- **Closing Works** (empty paper, Escape, closing or switching the fold): the specimens **un-grow** the same way (0.85s) while the field **regrows** from the start.
- Resizing re-lays the specimens complete; the first layout waits for the fold to open, so it doesn't cut the growth short.

## How it's drawn

- `scatter()` in `Works.jsx` places them; `chain()` + `between()` build the vine paths (bowed, wavering, edge to edge); `vine()` in `forms.js` grows them.
- `plot(ink, plant, box, s, edge, bounds)` in `forms.js` (2026-10-06, after Daniel said the patches looked fake, too perfect around the pictures): built **like the frog's clearing**, from loose pieces: ground spreading from 2–4 off-centre points; 2–4 runners along random stretches of the outline (50–85% coverage, gaps, wandering offset and size), never all the way round; 2–6 moss and 0–2 lichen wherever they fall; the project's plant off one flank; 1–3 random site plants nearby; sometimes a runner that wanders off; spores. Counts and places vary per patch and per visit. Previously: **runners traced the silhouette's outline** (ordered by angle from its middle), starting on the heavy side and creeping both ways round, laying growth on the edge and ground a little outside it; the inner edges (cut-outs) fill in on their own; ground **spreads** from the heavy side (`spread()`: walkers creeping outward, not discs); then moss, maybe a lichen, the plant on the heavy flank, spores. Daniel asked for "actual growths" rather than things fading in, "more dynamic and less radial".
- The home clearing's ground also uses `spread()` now (was 16 big discs).
- Reversing: `createGrowth` records every mark drawn; `retract({ duration, size, erase, wipe })` takes small marks off newest first with `eraseMark()` and wipes broad-wash cells in ranked order with `wipeCells()` (`ink.js`), to paper (field) or to transparent (Works).
- `growth.plant(gens, { pace, ease })`: per-planting tempo; the field keeps the default (1, quart).

## Tuning history

- First pass (`024ef99`): even ground only, so the silhouettes read as blobs and the frog clearing showed through. Fixed with outline-hugging washes and a hushed field.
- Daniel's feedback (2026-10-05/06): growth jumped to finished midway (a re-layout fired as the fold opened, and the ground front-loaded), placement too uniform and all on the right, growth too even. Fixed with the layout key/wait, a gentler tempo, whole-screen scatter, and leaning patches. He also asked for the field to retract/regrow around Works, Works to un-grow on close, and vines connecting the specimens.
