// The figures, and three.js under them, are only fetched when something asks
// for one (the Works fold reached for, a project sheet opened), so the home
// page loads without them.
let mod = null;
export const figures = () => (mod ||= import("./index.js"));

export const createFigure = (...a) => figures().then((m) => m.createFigure(...a));
export const preloadFigure = (slug) => { figures().then((m) => m.preloadFigure(slug)); };
