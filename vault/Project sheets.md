---
tags: [code, site]
updated: 2026-10-08
---

# Project pages

`#work/<slug>` opens a project's page (`src/ui/ProjectPage.jsx`). Rebuilt 2026-10-08 when Daniel asked for the project pages to be reworked "however you see fit based on the existing theme". Before that it was a 700px sheet sliding in from the right over the dimmed field, with the figure below the fold and the write-up folded under "details (+)" (see git history before the rework: `ProjectSheet.jsx`, `Specimen.jsx`). See [[Site overview]], [[Works]], [[CAD figures]].

## The idea

The page is the paper itself, laid out like a specimen plate: the object large, in its own plot of growth, its parts labelled on hairline leaders, the title under it as the caption. Then the write-up, open, set to read.

## Layout

- A full-window scrolling layer (`.page`, z 2) over the field, under the head (z 3). On desktop the head keeps its column on the left (content starts at `--page-left`, 420px) and stays usable; the reset control is hidden (no field to clear). On phones (≤768) the head and footers hide and the page has the screen.
- **Bar** (sticky): `02 · ROBOTICS · OFFSEASON` and `close [×]`. Clear at the top so a raised pose can show through it; paper once the page scrolls.
- **Plate**: the stage (the figure's room) takes the window height less the caption. The figure is sized by its **rest** pose (about 84% of the stage height, at its optical scale), standing on the stage floor; poses that rise may reach up into the bar's space, no further, and nothing may reach past the stage's sides. Its growth is `plot()` (as in Works), seeded by slug, over the whole plate out to the window edges, keeping clear of the labels, caption, side and head.
- **Labels** (wide screens, stage ≥ 820px): each part's label sits beside the figure's room, level with the part at rest, spread so none overlap; a hairline leader (level shoulder, then straight) runs to a dot on the part and follows it every frame as the figure moves. **Hovering or focusing a label poses the figure to show that part** (and updates the read-out). Narrow: numbered markers on the parts and a key under the figure (tap to show).
- **Foot**: the title (Cormorant, up to 62px) and lede on the left; on the right the read-out, `3d model (+)` (the model takes the figure's box, growth fades to 22%), and the facts.
- **Write-up** (always open): summary large in serif, then sections in a 180px label column (mono, cedar) beside serif body text (21px): Overview, Goals (ruled list), process sections, extra sections, Challenges (numbered), Outcome, Stack, Elsewhere, and the render. Then **Next** (number and title).

## The labels (figure `notes`)

Each figure kind returns `notes: [{ id, label, sub, obj, at }]` and `show(id)`. `pin(view, obj, want)` (`figures/lines.js`) picks the vertex near a spot that's nearest the camera, in the body's own coordinates, so it moves with it. `anchors()` projects them to canvas px; `onFrame(fn)` redraws the leaders with the figure. Text only from Daniel's write-up, his numbers, or the CAD:
- FRC 987: Ground intake (swings 144° out to the floor), Elevator, belt driven (38.5 to 65 in), Scoring arm, carbon fiber (the gripper's belt runs through it).
- Rival: Mecanum drive, Elevator, two stages (leaning 33° forward), Intake, on a wrist.
- Stand: Mounting tab (lines up with a standard monitor), Weight reduction pockets, One sheet, 1/8 in (bent with a 1/16 in inside radius).

## Transitions (App.jsx)

Per [[Rules]]: the incoming side lays out, says it's ready, and starts growing as the outgoing one goes back (1.5s fallback). Works → page: page ready, Works un-grows. Field → page: page ready, field retracts. Page → page (Next, or the list): new page ready, old one un-grows (stays mounted 1.2s). Page → Works (closing with the fold open): Works regrows fresh, then the page un-grows. Page → field: page un-grows as the field regrows. The page's text fades in a beat after the growth starts and goes first.

## Notes

- The layout waits for `document.fonts.ready` (the caption's height sets the stage's) and re-lays on resize; any lay-out after the first draws the growth complete.
- Testing: puppeteer `screenshot({ clip })` briefly resizes the viewport (innerWidth 1), which re-ran the page's effects and moved the labels mid-hover. Pass `captureBeyondViewport: false`.
- `@google/model-viewer` 4.3.1 prints debug logs (`[$updateSource] called!`) in production. They come from the library.
