---
tags: [rules]
updated: 2026-10-07
---

# Rules

Things that must not be broken. See [[Home]].

## Git and deploys

- **Never push to or merge into `main`.** `main` is the old editorial site (also tagged `v1-original`), served at old.danielkaliko.com. Daniel: "i dont want to be destructive."
- **All work happens on `redesign`.** It's the Vercel production branch: **every push to `redesign` goes live on danielkaliko.com within ~30–60s.** Commit locally freely; **push only when Daniel asks** (2026-10-07: "stop automatically pushing"). Show changes on localhost:5179 instead.
- Commit messages: a short imperative subject, then a plain paragraph on what and why. End with the co-author line the session specifies.
- Don't commit files over 100MB (GitHub rejects them). See [[Frog reveal video]] for why the `.mov` uses the Animation codec.

## Copy

- Plain and factual. No poetic, cute, or "vibes" phrasing. Daniel calls that corny.
- His touchstone line: "Studying engineering at the University of Nevada, Reno."
- No tagline under the name right now (see [[Design taste]]).
- Don't invent facts (e.g. his exact engineering major isn't stated anywhere; don't write "mechanical engineering student").

## Visuals

- Flat paper, halftone watercolor, abstract but recognizable PNW nature. No gradients, fog, vignettes, film grain, glow, or mascots. Details in [[Design taste]].

## Motion: growth and retraction

Daniel, 2026-10-07: "start the growth as soon as the retraction starts. Make this retraction/growth behavior a rule across the project."

- **When one growth goes and another comes, they run at the same time.** The incoming growth starts on the same beat the outgoing one starts retracting, never after it finishes. (Works opening: the field retracts as Works grows; Works closing: Works un-grows as the field regrows.)
- **Get the incoming side ready before either starts.** Anything slow (loading models, building figures, laying out) happens first, ahead of time where possible (Works' figures are made in the background once the home page loads, `prepareFigures` in `src/figures/load.js`). Then the incoming side signals it's ready (Works' `onReady`) and both start together. A fallback starts the outgoing side anyway if the incoming side fails.
- **A retraction never skips or snaps.** `growth.retract` counts only time it spends drawing (a stall pauses it rather than jumping ahead), and it isn't done until every fade pass has taken off every mark. Its `onDone` cleanup must never be what removes visible growth.
- **Every change of view plays like home ↔ Works** (Daniel, 2026-10-08: "make the retraction/growth/opening the same as switching between the homepage and the works page, smooth and retract/grow"). Outgoing: growth retracts over 1 s, figures dissolve over 1 s easing in and out (never front-loaded). Incoming: growth from the same beat (pace 1.6, ease 2), figures grow up from the ground (delay 0.6 s, 2.6 s), small text fades in a beat later, and big text (a page's caption) waits ~0.9 s and labels ~1.9 s, so no block of text arrives before the growth. Check with a screencast (CDP `Page.startScreencast`), not screenshots or ink totals: those hid a pop.
- **A dropped effect run must do nothing.** React (StrictMode, in dev) runs an effect, drops it and runs it again. A setup that lays out, grows or says it's ready must check it's still the current run (`alive`) in every async step, and a figure taken from the pool by a dropped run goes back to the pool, unused (`putBackFigure` / `putBackPageFigure`). Missing this made opening a project retract Works and then snap the page in complete (2026-10-08).
- Measure transitions, don't eyeball them: sample both canvases over time after the trigger (see [[Dev environment]]).

## Working style

- Verify changes visually before reporting them done. See [[Dev environment]] for the headless-browser screenshot setup.
- If the background dev server gets killed for low memory, say so; restart it only when asked.
