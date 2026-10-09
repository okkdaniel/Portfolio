---
tags: [log]
updated: 2026-10-05
---

# Changelog

Newest first. Commit hashes are on `redesign`. See [[Home]].

## 2026-10-08
- Project pages keep the leader lines on narrower windows (labels narrow down to 128px); numbers only on phones and very narrow stages.
- Project pages grow in Dia / narrow windows too: the compact layout is decided before the first measurement, and an early re-layout regrows instead of drawing complete (that was the snap).
- Project pages paced like home ↔ Works: figures dissolve evenly over 1 s, retractions 1 s, the page's caption and labels come in after its growth. Bar: `← works` (back to Works) and `close [×]` (home).
- Opening a project no longer snaps midway: a dropped StrictMode effect run was growing the page early (now guarded); unused pooled figures go back to the pool (pages and Works).
- Project page fixes: no more snap on opening (page figures made ahead, text waits for the growth); fold changes from a page go where the folds say (Works closed = home, opened = Works); `all works` in the page bar.
- Project pages rebuilt (Daniel: "full creative freedom"): the page is the paper itself, a specimen plate. The figure large in its own growth, its parts labelled on hairline leaders that follow them (hover a label to show that part; numbers + key on phones), the title as the caption, then the write-up open and set in serif. Works/field/pages hand over by the grow-as-the-other-retracts rule. Old sheet (ProjectSheet, Specimen) removed. See [[Project sheets]].

## 2026-10-07
- Stand: unfolding dropped for a turntable (pointer turns it round, a little up and down; same size, stays on the ground). Daniel wanted the interaction reworked from the ground up.
- Rival figure now isometric (az −45°, el 35.26°), was dimetric.
- Stand hover reworked: it unfolds where it stands (base on the ground) while the view swings round and rises to look down on the flat pattern square on; the pointer looks round it once open. No more turning the part to face you.
- Stand unfold smoothed: precomputed eased size/centre (no per-frame re-measuring), steps in turn (tabs, walls, then turn to face up), steady 1.4 s pace instead of a spring.
- Rival intake down 60° → 44° (it clipped the drivetrain; filled-triangle clearance check). FRC carriage now rides the stage's full 26.5" (was 19.6", sliding down the stage).
- Rival wrist at the top: 100° → 35°, the least turn for the most forward reach.
- Rival figure: elevator top 16 → 11 in; at the top the wrist now tips forward/down to 100° (was up 15°); drawn at 0.85 size (new per-figure `config.scale`, optical).
- Rival robot: real CAD (2025C-LL) replaces the placeholder figure: elevator up its 32.7° incline + intake wrist on the carriage, dimetric view. prepare.mjs --rival, rivaljoints.mjs, plotparts.mjs. Elevator travel is estimated. .gitignore: removed a garbled UTF-16 line, ignores 2025C-LL/. See [[CAD figures]].
- "Bishop" lettered in the anura frog's hand: public/assets/brand/bishop.svg (black), bishop.png and bishop-white.png (2400 × 1239, transparent). Made by tools/lettering/anura-type.mjs (hand-placed centre lines per letter, leaned 0.2, wandering width, smooth lumpy edges, taper/blob ends; seed "bishop").
- Added public/assets/brand/anura-white.png: the frog logo alone, white on transparent, 2568 × 2524 (4× the SVG), rendered from anura.svg for use on dark backgrounds/videos.
- Stand: baseline drop was too far (clipped the label) and slid unevenly; now a fixed drop of 30% of the gap (LOWER), eased in with the unfold.
- Stand: the flat pattern now sits on the folded stand's baseline (lower, nearer its label) instead of centred; tilt 15° → 22°.
- Monitor stand reworked again: hover unfolds (slowly), leave folds; pointer only tilts (15°); the flat pattern is scaled to its folded footprint so it never covers text or other previews.
- Monitor stand: pointer near the middle = folded; further out = unrolls fully (true bend allowance, K 0.5, matches the CAD flat pattern to 0.001 in) and turns to a square-on top view; corners tip it up to 32°. See [[CAD figures]].
- Monitor stand figure unfolds instead of spinning: tabs then walls open 75% of each bend, about bend axes measured from the CAD (new tools/cad-lines/planes.mjs, bends.mjs). See [[CAD figures]].
- Works keeps every figure's full reach (fully extended, zoomed) on screen, 12px from the edges (below the header on narrow screens): the FRC arm used to clip off the top. Figures now draw at 20fps (growth stays 12fps).
- Transitions: Works now gets ready (figures made ahead in a background pool, `prepareFigures`/`takeFigure`; layout) then calls `onReady`, and only then does the field retract, so both start on the same beat (~0.25s after the click, was ~0.6s with the field frozen then rushing). `growth.retract` counts only drawing time (stalls pause it) and finishes every pass before `onDone` (it used to snap the last of the field to paper). Faster Works layout: shaders compiled async (`view.warm`), models primed onto the GPU, silhouette canvases kept on the CPU, `resistFrom` spreads from edge pixels in JS. Made it a rule in [[Rules]] (Motion).
- Figures (three.js + GLBs) preload in the background ~2.5s after the home page loads (idle callback), not only on reaching for Works, so Works grows in as the field retracts instead of after (Daniel: transition waited). Click-to-growth ~1.4s cold → ~0.35s warm in headless.

## 2026-10-06
- Works figures follow the mouse (as on sheets; list hover/focus still plays the set motion). Zoom moved from a CSS scale into the camera, so the halo is redrawn at its own size round the figure as it is, not scaled (Daniel: halo "just stays static"); canvases cover boxes.span (all, zoomed) so nothing is cut off.
- Figures: hovered (or dragged/pointed on a sheet) they zoom in 8% with a 0.6s ease-out (CSS scale about the rest centre, canvas drawn 1.08x denser so it stays sharp); the figure loop now draws at 12fps like the growth, springs substepped at 60Hz between frames.
- Figures grow in from the ground up in halftone dots, a beat after their growth starts (Works: delay 0.6s, 2.6s; sheet: 0.3s, 2s), and dissolve out on close; replaced the CSS opacity fade that popped them in before the growth (Daniel: "too sudden"). Reveal is clock-timed, not frame-timed.
- Figures: touch drags drive them (Works: drag moves, tap opens; sheet: touch-action none, figure capped shorter on phones); growth now grows under figures and each figure carries a 22px halo of paper dithered into halftone dots, so moving/turning never leaves a bare hole or hard edge (Daniel: growth "turns to white and sharply ends"); canvases sized 100% not 100vh/100vw (phone toolbar stretched them → "dead spot").
- Figures on the site (committed locally, not pushed): Works previews are the CAD line figures (hover moves them, click opens), and each sheet shows its figure in its growth, interactive. Rival is a placeholder. Code in `src/figures/`. See [[CAD figures]].
- Monitor stand CAD line figure (turntable); line renderer moved to `figures/lines.js`, shared by both figures. Not committed.
- CAD line figure of the FRC 987 robot from its Onshape export (not committed): see [[CAD figures]]. Hairline figures tried first and dropped as inaccurate.

## 2026-10-05
- Created this vault and `CLAUDE.md` so a new session can pick up the work.
- Works patches rebuilt like the home clearing (loose, partial outlines, random extra plants and runners) so they look grown, not drawn round the pictures. Pushed live 2026-10-06 (`a8f878f`).
- Retract back to newest first (a reversal), now with the soft fade. Pushed live 2026-10-06 (`a8f878f`).
- Retract fades instead of cutting: every mark and ground cell fades out in three staggered passes (35%, 50%, 100%), so the receding edge trails a soft band. Pushed live 2026-10-06 (`a8f878f`).
- Retract order switched to oldest first (Daniel: "opposite" of a rewind). Pushed live 2026-10-06 (`a8f878f`).
- Growth and retract made directional: ground spreads (walkers) instead of dropping discs, Works outlines are traced by runners, and retracting reverses growth (strokes newest first, ground cell by cell) at 1s. The home clearing uses the spreading ground too. Pushed live 2026-10-06 (`a8f878f`).
- Works laid out as in Daniel's sketch on wide screens (01 low-left, 02 high-middle, 03 mid-right, vines between); Works now starts growing the moment the field starts retracting. Pushed live 2026-10-06 (`a8f878f`).
- Works placement switched to composed arrangements (bigger, spread out, picked per visit); faster retracts (field 0.55s, Works 0.7s). Pushed live 2026-10-06 (`a8f878f`).
- Works refined per Daniel's notes: smooth growth (no mid-way jump), whole-screen random placement (per visit), leaning patches, vines joining the specimens, the home field retracting while Works is open and regrowing after, Works un-growing on close. Pushed live 2026-10-06 (`a8f878f`).
- `024ef99` Reworked how projects show up (Daniel gave full creative freedom, revert if disliked): opening Works surfaces each project in the paper as a bare-paper silhouette in its own growth; hover fills in the render. Pushed live 2026-10-06 (`a8f878f`). See [[Works]].

## 2026-10-04
- `610a698` Dropped the tagline under the name; link previews now say "Engineering student at the University of Nevada, Reno." (see [[Design taste]] for what he wants if a tagline returns).

## 2026-10-02
- `5935c3d` Window resizes followed live at full resolution (no stretching); last frame fades into the redraw. `1c96e5b` Field remembers plantings (relative position + seed) and redraws them for the new size; split-screen no longer wipes the field. See [[Art engine]].
- `0006870` 3D model: zoom and pan off, drag to orbit only. Reverted the halftone-dissolve edge (`435a619`, `080128e`) at Daniel's request.
- `b5257e0` One object per sheet: removed the separate 3D viewer; the render lifts into the 3D model via `3d model (+)`; wireframe moved into details. See [[Project sheets]].
- `2b6c827` A sheet's growth starts only once the render is fully in view.
- Frog reveal video, iterated: tool + first render (`bd2dc97`), committed renders (`b93d9ba`), lossless Animation-codec .mov (`d8850fb`), phone-viewable checker MP4 + APNG (`e3c3511`), stronger ease-out + framing (`55df472`), firs removed / 18 flowers (`4573d6a`), eight vine-style versions (`079f8ca`). See [[Frog reveal video]].
- `bd2dc97` Project sheets: each render grows its own patch (seeded plant per project); growth engine split out of `Field.jsx` into `growth.js`.

## 2026-10-01
- Redesign built and deployed: circuit-forest attempt (`484e351`) replaced by nature on paper (`056fb22`); frog experiments (logo, seal, lichen carving) ended in the frog as masking fluid (`282efb6`); Vercel production switched to `redesign` (`2de0f8c`); plain copy rewrite (`24abc84`); 12fps growth beat (`3ea6b96`); text-free link preview (`b372119`).
