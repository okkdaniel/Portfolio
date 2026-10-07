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
function makeFigure(slug) {
  const canvas = document.createElement("canvas");
  canvas.className = "works-layer__fig";
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
