import React from "react";
import { PAPER, resistFrom, opaqueBounds } from "./ink.js";
import { specimen, seeded, setRandom } from "./forms.js";
import { inkLayer, createGrowth } from "./growth.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";
import { ModelPlate } from "../components/media/ModelPlate.jsx";
import { createFigure } from "../figures/load.js";

const HALO = 22;   // px round the figure for its halo (figures/lines.js HALO)
// The tallest a figure gets on the sheet: on a phone, short enough to leave
// room to scroll past it, since a drag on the figure drives it.
const maxHeight = () => (window.innerWidth <= 768 ? Math.min(420, window.innerHeight * 0.55) : 560);

/**
 * Specimen — a project's figure (its object drawn as lines from its CAD; see
 * src/figures), standing in its own patch of growth on the sheet. Its
 * silhouette at rest is laid on the paper as masking fluid (as the frog is on
 * the field), so once it's scrolled fully into view the ground and the
 * project's plant (`project.plant`) grow around it. The growth comes in under
 * it too: the figure clears its own space with a halo of paper that dissolves
 * into the screen's dots, so as it moves nothing is left bare or cut off.
 *
 * The figure answers the pointer: the robot runs its cycle with the
 * pointer's height, a part turns with its position across. A line under it
 * says what it's showing.
 *
 * The growth is seeded by the project, so it comes up the same every visit.
 * If the sheet changes size, it's redrawn complete at the new size.
 *
 * A project with a 3D model (`project.model`) can still be picked up: "3d
 * model (+)" turns the figure into the model in the same spot, to drag
 * around, while the growth fades back; "(−)" sets it down again.
 */
export function Specimen({ project: p }) {
  const canvasRef = React.useRef(null);
  const figRef = React.useRef(null);
  const objRef = React.useRef(null);
  const [fig, setFig] = React.useState(null);
  const [read, setRead] = React.useState("");
  const [lifted, setLifted] = React.useState(false);
  const [ratio, setRatio] = React.useState("1 / 1");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isSmall = useMediaQuery("(max-width: 768px)");
  const inView = useFullyInView(figRef, !!fig);

  // The figure: made once, sized to the sheet's object column (and again
  // when that changes). It gets a canvas of its own each time, since a
  // figure's drawing context goes with it when it's destroyed.
  React.useEffect(() => {
    let alive = true, made = null, watcher = null;
    const canvas = document.createElement("canvas");
    canvas.className = "figure__canvas";
    canvas.setAttribute("aria-hidden", "true");
    figRef.current.append(canvas);
    createFigure(p.slug, canvas, { reducedMotion }).then((f) => {
      if (!alive) { f?.destroy(); return; }
      if (!f) return;
      made = f;
      const size = () => {
        const { all } = f.boxes, aw = all.max.x - all.min.x, ah = all.max.y - all.min.y;
        let w = objRef.current.clientWidth, h = ((w - 2 * HALO) * ah) / aw + 2 * HALO;
        if (h > maxHeight()) { h = maxHeight(); w = ((h - 2 * HALO) * aw) / ah + 2 * HALO; }
        Object.assign(canvas.style, { width: `${w}px`, height: `${h}px` });
        f.layout();
      };
      size();
      watcher = new ResizeObserver(size);
      watcher.observe(objRef.current);
      setRead("rest");
      setFig(f);
    });
    return () => { alive = false; watcher?.disconnect(); made?.destroy(); canvas.remove(); setFig(null); };
  }, [p.slug, reducedMotion]);

  // Without a plant there's no growth to wait for: show the figure as it is.
  React.useEffect(() => { if (fig && !p.plant) fig.reveal(1); }, [fig, p.plant]);

  React.useEffect(() => {
    if (!inView || !fig || !p.plant) return;
    const canvas = canvasRef.current;
    const figCanvas = figRef.current.querySelector("canvas");
    const layer = inkLayer(canvas, isSmall ? 2.2 : 3);
    const { ink } = layer;
    // The sheet is a small piece of paper; ink gives out over a shorter edge.
    ink.feather = 36;
    ink.wobble = 18;
    const growth = createGrowth(layer, { reducedMotion });
    const spread = isSmall ? 6 : 8;
    let laid = "";

    // Lay the specimen out against the sheet as it is now. `now` draws it
    // complete at once instead of growing it.
    const lay = (now) => {
      const c = canvas.getBoundingClientRect();
      const w = c.width, h = c.height;
      const r = figCanvas.getBoundingClientRect();
      const key = `${Math.round(w)}x${Math.round(h)}/${Math.round(r.width)}`;
      if (!w || !h || !r.width || key === laid) return;
      laid = key;
      growth.clear();
      layer.clearScratch();
      layer.size(w, h, Math.min(2, window.devicePixelRatio || 1));
      layer.paper(PAPER);

      // The silhouette at rest shapes the growth; it isn't masking fluid.
      const mask = resistFrom(fig.silhouette(), Math.round(r.left - c.left), Math.round(r.top - c.top), Math.round(r.width), Math.round(r.height), spread);
      ink.resist = null;

      // Keep clear of the text above and below (and the 3D control), and
      // fade out before the canvas's own edges.
      const rel = (q) => ({ x: q.left - c.left - 6, y: q.top - c.top - 6, w: q.width + 12, h: q.height + 12 });
      const sheet = canvas.closest(".sheet");
      const near = sheet ? [...sheet.querySelectorAll(".sheet__lede, .plate__lift, .plate__read, .sheet__facts")] : [];
      const F = 1e4;
      ink.keepouts = [
        ...near.map((el) => rel(el.getBoundingClientRect())),
        { x: -F, y: -F, w: 3 * F, h: F },
        { x: -F, y: h, w: 3 * F, h: F },
        { x: -F, y: -F, w: F, h: 3 * F },
        { x: w, y: -F, w: F, h: 3 * F },
      ];

      const box = opaqueBounds(mask, spread);
      if (!box) return;
      const s = Math.min(1.1, Math.max(0.6, box.h / 380));
      const random = seeded(String(p.seed ?? p.slug));
      let gens;
      setRandom(random);
      try {
        gens = specimen(growth.recorder, p.plant, box, s);
      } finally {
        setRandom(null);
      }
      growth.plant(gens, { random, now });
      fig.reveal(1, now ? {} : { delay: 0.3, duration: 2 });
    };

    lay(reducedMotion);
    const watcher = new ResizeObserver(() => lay(true));
    watcher.observe(canvas);
    watcher.observe(figCanvas);
    return () => {
      watcher.disconnect();
      growth.clear();
    };
  }, [inView, fig, reducedMotion, isSmall, p.plant, p.seed, p.slug]);

  // The pointer over the figure, as 0..1 across and up it.
  const point = (e) => {
    if (!fig || lifted) return;
    const r = figRef.current.querySelector("canvas").getBoundingClientRect();
    setRead(fig.point((e.clientX - r.left) / r.width, (r.bottom - e.clientY) / r.height));
  };
  const leave = () => { if (fig) setRead(fig.leave()); };

  // The model takes the figure's box.
  const lift = () => {
    const c = figRef.current;
    if (c?.clientWidth) setRatio(`${c.clientWidth} / ${c.clientHeight}`);
    setLifted(!lifted);
  };
  // Start fetching the viewer as soon as someone reaches for the control.
  const warm = () => { import("@google/model-viewer"); };

  return (
    <>
      <div className={`plate${p.model ? " plate--model" : ""}${lifted ? " plate--lifted" : ""}`}>
        <canvas ref={canvasRef} className="plate__ink" aria-hidden="true" />
        <div ref={objRef} className="object">
          <div
            ref={figRef}
            className="figure"
            role="img"
            aria-label={`${p.title}, drawn from its CAD`}
            onPointerDown={point}
            onPointerMove={point}
            onPointerLeave={leave}
          />
          {lifted && (
            <div className="object__model">
              <ModelPlate
                src={p.model}
                poster={p.preview}
                alt={`${p.title}, interactive 3D model`}
                orientation={p.modelOrientation}
                zoom={p.modelZoom}
                lift={p.modelLift}
                ratio={ratio}
                caption={null}
              />
            </div>
          )}
        </div>
      </div>
      <p className="plate__read" aria-live="polite">{fig && !lifted ? read : " "}</p>
      {p.model && (
        <button type="button" className="plate__lift" aria-pressed={lifted} onClick={lift} onPointerEnter={warm} onFocus={warm}>
          3d model <span aria-hidden="true">{lifted ? "(−)" : "(+)"}</span>
          <span className="plate__hint">drag to rotate</span>
        </button>
      )}
    </>
  );
}

/**
 * Whether the element has (once) been scrolled fully into view, once it's
 * `ready` (laid out at its size): entirely on screen below the sheet's sticky
 * bar, or, if it's taller than the screen, filling what's visible. Latches.
 */
function useFullyInView(ref, ready) {
  const [seen, setSeen] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !ready || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const bar = el.closest(".sheet")?.querySelector(".sheet__bar")?.offsetHeight ?? 0;
    const io = new IntersectionObserver(
      ([e]) => {
        const full = e.intersectionRatio > 0.99 || (e.rootBounds && e.intersectionRect.height >= e.rootBounds.height - 2);
        if (full) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: `-${bar}px 0px 0px 0px`, threshold: Array.from({ length: 21 }, (_, i) => i / 20) }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, ready, seen]);

  return seen;
}
