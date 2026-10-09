import React from "react";
import { resistFrom, opaqueBounds, eraseMark, wipeCells } from "../art/ink.js";
import { plot, seeded, setRandom } from "../art/forms.js";
import { inkLayer, createGrowth } from "../art/growth.js";
import { edgePoints } from "../art/Works.jsx";
import { useMediaQuery } from "../hooks/useMediaQuery.js";
import { ModelPlate } from "../components/media/ModelPlate.jsx";
import { takePageFigure, preparePageFigure, putBackPageFigure, whenIdle } from "../figures/load.js";

const HALO = 22;      // px round the figure for its halo (figures/lines.js HALO)
const LABEL_W = 190;  // px a label takes beside the figure
const LABEL_GAP = 18; // px between a label and the figure's room
const SHOULDER = 14;  // px a leader runs level out of its label before turning
const SPREAD = 6;     // px of bare paper the growth keeps round the figure

/**
 * ProjectPage — one project, on the paper itself (not a sheet over it). Up
 * top, a plate: the project's object drawn as lines from its CAD (src/
 * figures), large, in a plot of its own growth, its parts labelled on
 * hairline leaders that follow them as it moves, and its title under it as
 * the caption. Hovering (or focusing) a label shows that part; the pointer on
 * the object drives it as everywhere else. Below, the write-up, open to read,
 * and the next project.
 *
 * Opening a project, the page lays itself out and starts growing, and says
 * so (onReady), so whatever was on the paper (Works, or the field) goes back
 * at the same moment (vault/Rules.md). `leaving` takes it back off: the
 * growth un-grows, newest first, as the figure and the text fade.
 *
 * On narrow screens the labels become numbers on the object, with a key
 * under it.
 */
export function ProjectPage({ project: p, next, leaving = false, onReady, onBack, onWorks, onHome }) {
  const plateRef = React.useRef(null);
  const stageRef = React.useRef(null);
  const inkRef = React.useRef(null);
  const figRef = React.useRef(null);
  const leadersRef = React.useRef(null);
  const closeRef = React.useRef(null);
  const retractRef = React.useRef(() => {});
  const grown = React.useRef(false); // grown once: any later lay-out draws complete
  const readyRef = React.useRef(onReady);
  readyRef.current = onReady;
  const [fig, setFig] = React.useState(null);
  const [layout, setLayout] = React.useState(null); // { stageH, fig: box, labels: [{ id, x, y, side }] }
  const [read, setRead] = React.useState("");
  const [active, setActive] = React.useState(null);
  const [lifted, setLifted] = React.useState(false);
  const [shown, setShown] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isPhone = useMediaQuery("(max-width: 768px)");

  // The text comes in with the growth (shown once laid out), not before.
  React.useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);

  React.useEffect(() => {
    if (leaving) return;
    const onKey = (e) => { if (e.key === "Escape") onBack(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack, leaving]);

  // The figure, on a canvas of its own, made ahead as a rule (figures/
  // load.js). Once this page is done with it, another is made for next time.
  React.useEffect(() => {
    let alive = true, made = null, canvas = null;
    const taking = takePageFigure(p.slug);
    taking.then((got) => {
      // A dropped run hands its figure back, still unused, for the next.
      if (!alive) { if (got) putBackPageFigure(p.slug, taking); return; }
      if (!got) { setShown(true); readyRef.current?.(p.slug); return; }
      ({ fig: made, canvas } = got);
      figRef.current.append(canvas);
      setRead("rest");
      setFig(made);
    });
    return () => {
      const used = !!made;
      alive = false; made?.destroy(); canvas?.remove(); setFig(null);
      if (used) whenIdle(() => preparePageFigure(p.slug), 1500);
    };
  }, [p.slug]);
  // And the next project's, for its link.
  React.useEffect(() => { if (next && fig) whenIdle(() => preparePageFigure(next.slug)); }, [next, fig]);

  const notes = fig?.notes ?? [];
  const compact = isPhone || (layout?.compact ?? false);

  // Lay the plate out for the window as it is, then grow its plot. `now`
  // draws the growth complete (a resize) instead of growing it.
  React.useEffect(() => {
    if (!fig) return;
    const canvas = figRef.current.querySelector("canvas");
    const ink = inkRef.current, stage = stageRef.current, plate = plateRef.current;
    const layer = inkLayer(ink, isPhone ? 2.2 : 3);
    layer.ink.feather = 40;
    layer.ink.wobble = 20;
    const growth = createGrowth(layer, { reducedMotion });
    // `alive`: this run of the effect is current (React may run it, drop
    // it and run it again; a dropped run must not lay out or grow anything).
    let laid = "", leavingNow = false, alive = true;

    // Where everything goes: the stage (the figure's room, with the labels
    // either side of it on wide screens), the figure fitted in at its
    // optical size, sitting on the stage's floor.
    const place = () => {
      const W = stage.clientWidth;
      const compactNow = isPhone || W < 820;
      const foot = plate.querySelector(".page__foot")?.offsetHeight ?? 0;
      const bar = plate.parentElement.querySelector(".page__bar")?.offsetHeight ?? 0;
      const roomW = compactNow ? W : W - 2 * (LABEL_W + LABEL_GAP);
      const stageH = compactNow
        ? Math.min(isPhone ? 420 : 540, window.innerHeight * (isPhone ? 0.5 : 0.6))
        : Math.max(380, window.innerHeight - bar - foot - 56);
      // Sized by the object at rest, which takes most of the stage's height,
      // standing on its floor. A pose that rises (an elevator going up) may
      // reach above the stage, into the bar's space (clear while at the
      // top), but no further; nor may any pose reach past the stage's sides.
      const { rest } = fig.boxes, rw = rest.max.x - rest.min.x, rh = rest.max.y - rest.min.y;
      const reach = bar - 6;
      let size = rw >= rh ? Math.min(roomW, (stageH * 0.84 * rw) / rh) : Math.min(stageH * 0.84, (roomW * rh) / rw);
      let box = null;
      for (let k = 0; k < 16; k++) {
        const restH = (rw >= rh ? (size * rh) / rw : size) * fig.optical;
        const at = fig.place({ cx: W / 2, cy: stageH - restH / 2 - 8, size });
        box = { x: at.x, y: at.y, w: at.w, h: at.h };
        if (at.y + HALO >= -reach && at.w - 2 * HALO <= roomW + 1) break;
        size *= 0.95;
      }
      const w = box.w, h = box.h;
      Object.assign(canvas.style, { width: `${w}px`, height: `${h}px` });
      Object.assign(figRef.current.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${w}px`, height: `${h}px` });
      stage.style.height = `${stageH}px`;
      fig.layout();

      // Labels beside the figure's room, level with the parts they name,
      // as they are now (at rest), spread so none overlap.
      let labels = [];
      if (!compactNow && notes.length) {
        const at = fig.anchors().map((a) => ({ ...a, x: a.x + box.x, y: a.y + box.y }));
        const mid = box.x + w / 2;
        at.forEach((a) => { a.side = a.x < mid ? "left" : "right"; });
        for (const side of ["left", "right"]) {
          const mine = at.filter((a) => a.side === side), other = at.filter((a) => a.side !== side);
          if (mine.length > other.length + 1) mine.sort((a, b) => Math.abs(a.x - mid) - Math.abs(b.x - mid))[0].side = side === "left" ? "right" : "left";
        }
        for (const side of ["left", "right"]) {
          const mine = at.filter((a) => a.side === side).sort((a, b) => a.y - b.y);
          let y = 12;
          for (const a of mine) { a.ly = Math.max(y, Math.min(stageH - 44, a.y - 10)); y = a.ly + 58; }
          for (let i = mine.length - 1; i >= 0; i--) {
            const below = mine[i + 1];
            if (below && mine[i].ly > below.ly - 58) mine[i].ly = below.ly - 58;
          }
        }
        labels = at.map((a) => ({
          id: a.id, side: a.side, y: a.ly,
          x: Math.max(0, Math.min(W - LABEL_W, a.side === "left" ? box.x + HALO - LABEL_GAP - LABEL_W : box.x + w - HALO + LABEL_GAP)),
        }));
      }
      setLayout({ compact: compactNow, stageH, fig: box, labels });
      return { box, labels, compactNow };
    };

    const lay = (now) => {
      if (leavingNow || !alive) return;
      const foot = plate.querySelector(".page__foot")?.offsetHeight ?? 0;
      const key = `${window.innerWidth}x${window.innerHeight}/${plate.clientWidth}/${foot}`;
      if (key === laid) return;
      laid = key;
      const { box, labels } = place();

      // The growth: the plot round the figure, over the whole plate and out
      // to the window's edges.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (leavingNow || !alive) return;
        const c = ink.getBoundingClientRect(), W = c.width, H = c.height;
        const r = canvas.getBoundingClientRect();
        growth.clear();
        layer.clearScratch();
        layer.size(W, H, Math.min(2, window.devicePixelRatio || 1));
        const mask = resistFrom(fig.silhouette(), Math.round(r.left - c.left), Math.round(r.top - c.top), Math.round(r.width), Math.round(r.height), SPREAD);
        layer.ink.resist = null;
        const rel = (q, n = 8) => ({ x: q.left - c.left - n, y: q.top - c.top - n, w: q.width + 2 * n, h: q.height + 2 * n });
        const F = 1e4;
        const text = [...plate.querySelectorAll(".page__note, .page__key, .page__caption, .page__side")].map((el) => rel(el.getBoundingClientRect()));
        const head = document.querySelector(".ov-head");
        layer.ink.keepouts = [
          ...text,
          ...(head && !isPhone ? [rel(head.getBoundingClientRect(), 16)] : []),
          { x: -F, y: -F, w: 3 * F, h: F },
          { x: -F, y: H, w: 3 * F, h: F },
          { x: -F, y: -F, w: F, h: 3 * F },
          { x: W, y: -F, w: F, h: 3 * F },
        ];
        const fb = opaqueBounds(mask, SPREAD) ?? { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
        const random = seeded(String(p.seed ?? p.slug));
        let gens;
        setRandom(random);
        try {
          gens = plot(growth.recorder, p.plant, fb, Math.min(1.25, Math.max(0.6, fb.h / 320)), edgePoints(mask), { w: W, h: H });
        } finally {
          setRandom(null);
        }
        const again = grown.current;
        grown.current = true;
        growth.plant(gens, { random, now: now || again, pace: 1.6, ease: 2 });
        if (!again) {
          fig.reveal(1, now ? {} : { delay: 0.6, duration: 2.6 });
          setShown(true);
          readyRef.current?.(p.slug);
        } else fig.reveal(1);
      }));
      void box; void labels;
    };

    retractRef.current = () => {
      leavingNow = true;
      fig.reveal(0, { duration: 1 });
      const c = ink.getBoundingClientRect();
      growth.retract({
        duration: reducedMotion ? 0 : 1, // as the field's and Works'
        size: { w: c.width, h: c.height },
        erase: (m, alpha) => eraseMark(layer.ctx, m, layer.ink.pitch, null, alpha),
        wipe: (xy, from, to, alpha) => wipeCells(layer.ctx, xy, from, to, layer.ink.pitch, null, alpha),
        onDone: () => { layer.clearScratch(); layer.size(1, 1, 1); },
      });
    };

    // Once the type is in, so the caption's height (which sets the stage's)
    // is its own.
    let fontsIn = false;
    (document.fonts?.ready ?? Promise.resolve()).then(() => { fontsIn = true; lay(reducedMotion); });
    let settle = 0;
    const relay = () => { clearTimeout(settle); settle = setTimeout(() => { if (fontsIn) lay(true); }, 150); };
    const watcher = new ResizeObserver(relay);
    watcher.observe(plate);
    window.addEventListener("resize", relay);
    return () => {
      alive = false;
      clearTimeout(settle);
      watcher.disconnect();
      window.removeEventListener("resize", relay);
      growth.clear();
    };
  }, [fig, isPhone, reducedMotion, p.slug, p.plant, p.seed]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => { if (leaving) retractRef.current(); }, [leaving]);

  // The leaders (or, on narrow screens, the numbers), redrawn with every
  // frame of the figure, so they stay on their parts as it moves.
  React.useEffect(() => {
    if (!fig || !layout) return;
    const svg = leadersRef.current, box = layout.fig;
    const draw = () => {
      if (!svg) return;
      const at = fig.anchors();
      at.forEach((a, i) => {
        const ax = a.x + box.x, ay = a.y + box.y;
        if (layout.compact) {
          const m = svg.querySelector(`[data-mark="${a.id}"]`);
          m?.setAttribute("transform", `translate(${ax.toFixed(1)} ${ay.toFixed(1)})`);
          return;
        }
        const l = layout.labels.find((q) => q.id === a.id);
        if (!l) return;
        const sx = l.side === "left" ? l.x + LABEL_W + 6 : l.x - 6, sy = l.y + 9;
        const kx = sx + (l.side === "left" ? SHOULDER : -SHOULDER);
        svg.querySelector(`[data-line="${a.id}"]`)?.setAttribute("d", `M${sx.toFixed(1)} ${sy.toFixed(1)}H${kx.toFixed(1)}L${ax.toFixed(1)} ${ay.toFixed(1)}`);
        svg.querySelector(`[data-dot="${a.id}"]`)?.setAttribute("transform", `translate(${ax.toFixed(1)} ${ay.toFixed(1)})`);
        void i;
      });
    };
    draw();
    return fig.onFrame(draw);
  }, [fig, layout]);

  // The pointer on the figure, as 0..1 across and up it.
  const point = (e) => {
    if (!fig || lifted) return;
    const r = figRef.current.getBoundingClientRect();
    setActive(null);
    setRead(fig.point((e.clientX - r.left) / r.width, (r.bottom - e.clientY) / r.height));
  };
  const leave = () => { if (fig && !lifted) { setActive(null); setRead(fig.leave()); } };
  const show = (id) => { if (fig && !lifted) { setActive(id); setRead(fig.show(id)); } };

  const n = String(p.index).padStart(2, "0");
  const warm = () => { import("@google/model-viewer"); };

  return (
    <article
      className={`page${shown && !leaving ? " page--shown" : ""}${leaving ? " page--leaving" : ""}${lifted ? " page--lifted" : ""}${scrolled ? " page--scrolled" : ""}`}
      onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}
      aria-labelledby={`page-title-${p.slug}`}
    >
      <div className="page__bar">
        <span className="page__nav">
          <button ref={closeRef} type="button" className="page__close" onClick={onWorks}>← works</button>
          <span className="page__meta">{n} · {p.discipline} · {p.year}</span>
        </span>
        <button type="button" className="page__close" onClick={onHome}>close [×]</button>
      </div>

      <section ref={plateRef} className={`page__plate${compact ? " page__plate--compact" : ""}`}>
        <canvas ref={inkRef} className="page__ink" aria-hidden="true" />
        <div ref={stageRef} className="page__stage">
          <div
            ref={figRef}
            className="page__fig"
            role="img"
            aria-label={`${p.title}, drawn from its CAD`}
            onPointerDown={point}
            onPointerMove={point}
            onPointerLeave={leave}
          />
          {lifted && layout && (
            <div className="page__model" style={{ left: layout.fig.x, top: layout.fig.y, width: layout.fig.w, height: layout.fig.h }}>
              <ModelPlate
                src={p.model}
                poster={p.preview}
                alt={`${p.title}, interactive 3D model`}
                orientation={p.modelOrientation}
                zoom={p.modelZoom}
                lift={p.modelLift}
                ratio={`${layout.fig.w} / ${layout.fig.h}`}
                caption={null}
              />
            </div>
          )}
          <svg ref={leadersRef} className="page__leaders" aria-hidden="true">
            {layout && notes.map((m, i) => (
              layout.compact ? (
                <g key={m.id} data-mark={m.id} className={active === m.id ? "is-on" : undefined}>
                  <circle r="8" />
                  <text dy="3.5">{i + 1}</text>
                </g>
              ) : (
                <g key={m.id} className={active === m.id ? "is-on" : undefined}>
                  <path data-line={m.id} />
                  <circle data-dot={m.id} r="2.5" />
                </g>
              )
            ))}
          </svg>
          {layout && !layout.compact && notes.map((m) => {
            const l = layout.labels.find((q) => q.id === m.id);
            if (!l) return null;
            return (
              <button
                key={m.id}
                type="button"
                className={`page__note page__note--${l.side}${active === m.id ? " is-on" : ""}`}
                style={{ left: l.x, top: l.y, width: LABEL_W }}
                onPointerEnter={() => show(m.id)}
                onPointerLeave={leave}
                onFocus={() => show(m.id)}
                onBlur={leave}
              >
                <span className="page__note-label">{m.label}</span>
                {m.sub && <span className="page__note-sub">{m.sub}</span>}
              </button>
            );
          })}
        </div>

        {compact && notes.length > 0 && (
          <ol className="page__key">
            {notes.map((m, i) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={active === m.id ? "is-on" : undefined}
                  onClick={() => (active === m.id ? leave() : show(m.id))}
                  onPointerEnter={(e) => { if (e.pointerType === "mouse") show(m.id); }}
                  onPointerLeave={(e) => { if (e.pointerType === "mouse") leave(); }}
                >
                  <span className="page__key-n">{i + 1}</span>
                  <span>{m.label}{m.sub && <span className="page__note-sub">{m.sub}</span>}</span>
                </button>
              </li>
            ))}
          </ol>
        )}

        <div className="page__foot">
          <div className="page__caption">
            <h2 id={`page-title-${p.slug}`} className="page__title">{p.title}</h2>
            <p className="page__lede">{p.lede}</p>
          </div>
          <div className="page__side">
            <p className="page__read" aria-live="polite">{fig && !lifted ? read : " "}</p>
            {p.model && (
              <button type="button" className="page__lift" aria-pressed={lifted} onClick={() => setLifted(!lifted)} onPointerEnter={warm} onFocus={warm}>
                3d model <span aria-hidden="true">{lifted ? "(−)" : "(+)"}</span>
                {lifted && <span className="page__hint">drag to rotate</span>}
              </button>
            )}
            {p.facts && (
              <dl className="page__facts">
                {p.facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
              </dl>
            )}
          </div>
        </div>
      </section>

      <WriteUp p={p} />

      {next && (
        <a className="page__next" href={`#work/${next.slug}`}>
          <span className="page__next-label">Next</span>
          <span className="page__next-n">{String(next.index).padStart(2, "0")}</span>
          <span className="page__next-title">{next.title} →</span>
        </a>
      )}
    </article>
  );
}

/** The case study, laid out to read: a label column and the text beside it. */
function WriteUp({ p }) {
  return (
    <section className="write">
      {p.summary && <p className="write__summary">{p.summary}</p>}

      {p.overview && <Part label="Overview">{p.overview.map((t, i) => <p key={i}>{t}</p>)}</Part>}

      {p.goals && (
        <Part label="Goals">
          <ul className="write__goals">{p.goals.map((g) => <li key={g}>{g}</li>)}</ul>
        </Part>
      )}

      {p.process?.map((s) => (
        <Part key={s.heading} label={s.heading}>{s.body.map((t, i) => <p key={i}>{t}</p>)}</Part>
      ))}

      {p.extraSections?.map((s) => (
        <Part key={s.label} label={s.label}>{s.body.map((t, i) => <p key={i}>{t}</p>)}</Part>
      ))}

      {p.challenges && (
        <Part label="Challenges">
          <ol className="write__challenges">
            {p.challenges.map((c, i) => (
              <li key={c.title}>
                <span className="write__n">{String(i + 1).padStart(2, "0")}</span>
                <h4>{c.title}</h4>
                <p>{c.body}</p>
              </li>
            ))}
          </ol>
        </Part>
      )}

      {p.outcome && <Part label="Outcome">{p.outcome.map((t, i) => <p key={i}>{t}</p>)}</Part>}

      {p.techStack && (
        <Part label="Stack">
          <dl className="page__facts page__facts--stack">
            {p.techStack.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
          </dl>
        </Part>
      )}

      {p.links && (
        <Part label="Elsewhere">
          {p.links.map((l) => (
            <p key={l.href}><a className="link" href={l.href} target="_blank" rel="noopener noreferrer">{l.label} ↗</a></p>
          ))}
        </Part>
      )}

      {p.hero && (
        <Part label="Render">
          <img className="write__render" src={p.hero} alt={`${p.title}, rendered`} loading="lazy" />
        </Part>
      )}
    </section>
  );
}

function Part({ label, children }) {
  return (
    <section className="write__part">
      <h3>{label}</h3>
      <div className="write__body">{children}</div>
    </section>
  );
}
