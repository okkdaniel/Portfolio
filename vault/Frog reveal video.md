---
tags: [video, tool]
updated: 2026-10-05
---

# Frog reveal video

Daniel's video asset: the site's opening (growth coming in around the frog) with a **transparent background, the frog as a hole**, for use in his videos. See [[Design taste]], [[Dev environment]].

## Files

- Tool: `tools/frog-reveal/` (`index.html` + `reveal.js` page, `render.mjs` renderer). Dev only, not deployed.
- Output: `media/frog-reveal/` (committed to git so he can view it on GitHub from his phone).
  - `frog-reveal.*`: the "ring" style version he approved earlier (`seed=cedar`, flowers ring, corner ferns).
  - `versions/frog-reveal-01…08.*`: **the current set**, 8 different "vine" style versions; `frog-reveal-grid.mp4` shows them side by side; `seeds.txt` has the params to re-render each.
- Per render: `.mov` (QuickTime **Animation codec**, lossless, alpha, ~4MB; for Premiere/FCP/Resolve/AE), `.webm` (VP9 alpha), `-on-paper.mp4`, `-on-checker.mp4` (to see transparency on a phone), `-last.png` (transparent last frame); the single render also gets `-preview.png` (animated PNG with alpha, half size).
- Why not ProRes: 114MB, over GitHub's 100MB limit. Phones can't play alpha video at all, hence the checker MP4 and APNG.

## The look he settled on

- **12fps**, every frame a new drawing.
- **Ease-out like the site** (quart): ink lands fast and tapers; the frog is legible by ~0.5s. A gentler curve felt slow at the start; site timing unmodified felt too sudden (frog in one frame).
- Growth **~4.1s**, ~0.17s lead-in, 1.5s hold. Total ~5.8s.
- Optically centered: the frog is placed by its alpha-weighted centroid, and the clearing's center of ink is shifted onto it.
- **Vine style** (current): tighter clearing, 2–3 vines wrapping the frog's outline that open the site's own plants with an occasional flower, so everything looks connected. He asked for fewer "actual plants", more of the site's forms, and concentration near the logo. No framing firs (he had them removed).
- Versions are picked from a pool of 24 seeds by an **outline score** (share of a thin band just outside the frog that gets inked), keeping the 8 best.

## Commands

```bash
npm run dev    # the renderer drives the dev server (port 5179 by default)
node tools/frog-reveal/render.mjs                              # the single ring version
node tools/frog-reveal/render.mjs style=vine --versions 8      # a batch
node tools/frog-reveal/render.mjs style=vine --versions 8 --seeds w   # a fresh, different batch
```

Page params (top of `reveal.js`): `w h dpr fps dur ease even style seed frog flowers trees`. Needs `npm i --no-save puppeteer-core ffmpeg-static`. On this machine ffmpeg needs the x64 build; see [[Dev environment]].
