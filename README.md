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