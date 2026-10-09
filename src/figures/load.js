// The figures, and three.js under them, are only fetched when something asks
// for one (the Works fold reached for, a project sheet opened), so the home
// page loads without them.
let mod = null;
export const figures = () => (mod ||= import("./index.js"));

export const createFigure = (...a) => figures().then((m) => m.createFigure(...a));
export const preloadFigure = (slug) => { figures().then((m) => m.preloadFigure(slug)); };

// Works' figures, made ahead: each on its own canvas, its shaders compiled
// and its model on the GPU, so opening Works only has to lay them out.
// Works takes them (takeFigure); once it has closed, another set is made.
const pool = new Map(); // slug -> Promise<{ fig, canvas } | null>
const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
function makeFigure(slug, className = "works-layer__fig") {
  const canvas = document.createElement("canvas");
  canvas.className = className;
  canvas.setAttribute("aria-hidden", "true");
  return createFigure(slug, canvas, { reducedMotion: reduced() })
    .then((fig) => { if (!fig) return null; fig.prime(); return { fig, canvas }; })
    .catch(() => null);
}
export const prepareFigures = (slugs) => { for (const s of slugs) if (!pool.has(s)) pool.set(s, makeFigure(s)); };
export const takeFigure = (slug) => {
  const got = pool.get(slug) ?? makeFigure(slug);
  pool.delete(slug);
  return got;
};

/** Returns taken figures, unused, to the pool (or, where one's there already, destroys them). */
export const putBackFigure = (slug, got) => {
  if (!pool.has(slug)) { pool.set(slug, got); return; }
  got.then((g) => { g?.fig.destroy(); g?.canvas.remove(); });
};

// Project pages' figures, made ahead the same way (a page's figure is its
// own, drawn larger), so opening a project only has to lay it out: made
// when Works has come up, when a project is reached for, and for the next
// project while one is open.
const pagePool = new Map();
export const preparePageFigure = (slug) => { if (!pagePool.has(slug)) pagePool.set(slug, makeFigure(slug, "page__canvas")); };
export const takePageFigure = (slug) => {
  const got = pagePool.get(slug) ?? makeFigure(slug, "page__canvas");
  pagePool.delete(slug);
  return got;
};
/** Returns a taken figure, unused, to the pool (or, if one's there already, destroys it). */
export const putBackPageFigure = (slug, got) => {
  if (!pagePool.has(slug)) { pagePool.set(slug, got); return; }
  got.then((g) => { g?.fig.destroy(); g?.canvas.remove(); });
};
/** Runs fn once the page has had a moment and is idle. */
export const whenIdle = (fn, ms = 1200) => { setTimeout(() => (window.requestIdleCallback || setTimeout)(fn), ms); };
