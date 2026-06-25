# Daniel Kaliko — Engineering Portfolio

A single-surface editorial portfolio, implemented from the **Kaliko Portfolio
design system**. Warm-gray canvas, near-black ink, two typefaces, hairlines,
oversized imagery, and one defining brand graphic — a topographic contour mark.

Built with **Vite + React**. Routing is hash-based so deep links work and the
browser back button behaves, with no server-side rewrite required.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # serve the production build
```

## Structure

```
index.html              entry; mounts src/main.jsx
src/
  main.jsx              React root
  App.jsx              hash router (#, #work, #work/<slug>, #about, …)
  styles.css           design-system entry — @imports the tokens
  data.js              project records (Work index + Project detail)
  tokens/              CSS custom properties: fonts, colors, type, spacing, motion, base
  components/
    brand/             LeopardPanel (the contour mark placement)
    editorial/         ProjectIndexItem (one Work row)
    layout/            PageFrame, Footer
    media/             PlateImage (the only image primitive)
    navigation/        Nav
    text/              EditorialLink, Eyebrow, MetaList, ProjectTitle
  screens/             Landing, WorkIndex, ProjectDetail, About
public/assets/
  brand/               wordmark.svg, monogram.svg
  pattern/             leopard-print.svg, leopard-print-wide.svg (contour mark)
  projects/            monitor-stand.svg (placeholder hero — see Caveats)
```

## Design rules (do not violate)

No cards, no buttons, no colored accents, no drop shadows, no rounded corners,
no emoji, no gradients, no backdrop blur. Two typefaces only (Cormorant
Garamond + Inter). The contour mark bleeds and fragments — it never frames
content, tiles, or sits centered. Eyebrows/metadata are `UPPERCASE TRACKED`
(0.16em) 12px Inter. Hover = opacity 0.55, 240ms fade. Full vocabulary lives in
the design system's `readme.md`.

## Caveats carried over from the design system

1. **Hero image is a placeholder.** The original `Monitor Stand.png` CAD render
   could not be retrieved (it exceeded the design tool's read cap). The current
   `public/assets/projects/monitor-stand.svg` is an on-brand wireframe stand-in.
   Drop the real render into `public/assets/projects/` and update the `hero`
   path on the first project in `src/data.js`.

2. **Contour mark is regenerated procedurally.** The two pattern SVGs are
   iso-lines of a smooth Gaussian scalar field (a survey/CMM-scan motif), built
   to the design system's brief. Regenerate or replace them freely — nothing
   else depends on their internals, only the two file paths.

3. **Cormorant Garamond substitutes for Canela / Ivy Presto.** Swap the
   `@import` in `src/tokens/fonts.css` for `@font-face` rules pointing at the
   licensed faces for production. Inter is the real reference — no swap needed.

4. **About / Resume / Contact share one screen.** `#resume` and `#contact`
   currently route to About. Give them their own screens when designed.
