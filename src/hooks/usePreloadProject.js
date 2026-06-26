import { useCallback } from "react";

// Module-level cache so a given asset is only warmed once per session,
// regardless of how many times a card is hovered/focused.
const warmed = new Set();

function preloadImage(src) {
  if (!src || warmed.has(src) || typeof Image === "undefined") return;
  warmed.add(src);
  const img = new Image();
  img.decoding = "async";
  // Low priority so warming the next page never competes with the current one.
  if ("fetchPriority" in img) img.fetchPriority = "low";
  img.src = src;
}

/**
 * usePreloadProject — returns a stable callback that warms a project detail
 * page on intent (hover/focus). It preloads the page's key above-the-fold
 * image, the regular `hero` render. The wireframe `preview` is already on
 * screen as the card, and galleries are intentionally skipped.
 *
 * Route chunk note: every screen ships in the single app bundle (no dynamic
 * import / code-split), so the route itself is already loaded — there is no
 * chunk to warm. If routes are ever code-split, add the chunk import here.
 *
 * Wire it onto a card via both `onMouseEnter` and `onFocus`:
 *   const preload = usePreloadProject(project);
 *   <a onMouseEnter={preload} onFocus={preload} ... />
 */
export function usePreloadProject(project) {
  const hero = project && project.hero;
  return useCallback(() => {
    preloadImage(hero);
  }, [hero]);
}
