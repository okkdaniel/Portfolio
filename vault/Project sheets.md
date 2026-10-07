---
tags: [code, site]
updated: 2026-10-05
---

# Project sheets

`#work/<slug>` opens a paper sheet sliding in from the right over the dimmed field (`src/ui/ProjectSheet.jsx`). See [[Site overview]].

## Layout (top to bottom)

1. Meta bar (sticky): `01 · ROBOTICS · 2024` and `close [×]`.
2. Title (Cormorant), lede (italic).
3. **The specimen**: the cut-out render standing in its own growth (`src/art/Specimen.jsx`).
4. `3d model (+)` control, only for projects with a `.glb`.
5. Facts (Role / Collaboration / Software).
6. `details (+)`: the full case study, with the wireframe drawing at the end.
7. `next →` link.

## The specimen

- The render is a **resist** (masking fluid, spread 8px), like the frog on the field, so the growth leaves the object bare with a thin margin.
- Growth starts **only once the render is fully in view** (loaded, entirely on screen below the sticky bar; or filling the screen if it's taller than it).
- Plants are seeded by slug, so the same composition appears every visit: FRC 987 gets **conifer**, Monitor Stand **cedar** (two small boughs), Rival Robotics **fern + fiddlehead**. The reasons (one trunk = master sketch, etc.) live only in code comments, never on the page.
- Keep-outs: lede, the 3D control, the facts, and the canvas edges (feather 36).
- Redraws itself complete if the sheet changes size.

## 3D lift

- `3d model (+)` swaps the render for the model in the same box (`ModelPlate`, Google model-viewer) and fades the growth to 22%; `(−)` puts the render back. The library loads only on request, warmed on hover/focus.
- **Zoom and pan are disabled**: drag to orbit only, gentle auto-rotate. The page scrolls normally over the model. (A halftone-dissolve edge for zooming was built and then reverted at Daniel's request; see [[Design taste]].)
- Before this, every sheet had a separate 3D viewer above the render. Removed 2026-10-02 as cluttered.

## Notes

- `@google/model-viewer` 4.3.1 prints debug logs (`[$updateSource] called!`) in production. They come from the library, not this code.
