// Growth: how forms get from generators onto a canvas, over time.
//
// `inkLayer` is a canvas to paint on plus the scratch layer ink is drawn to
// first. `createGrowth` takes plantings (sets of form generators), records
// them, times every stroke and plays them back on a 12fps beat. The Field
// runs one of each over the whole window; each project's specimen runs its
// own on the sheet.

import { Ink } from "./ink.js";
import { setRandom } from "./forms.js";

/**
 * A canvas plus a transparent scratch layer the same size. Ink is drawn with
 * plain blending onto the scratch, which `flush` multiplies onto the canvas in
 * a single draw, over just the area that changed, then wipes. Multiplying
 * every wash directly made the GPU copy the canvas behind each draw call:
 * ~3.5x the cost (measured).
 */
export function inkLayer(canvas, pitch) {
  const ctx = canvas.getContext("2d");
  const scratch = document.createElement("canvas");
  const sctx = scratch.getContext("2d");
  const ink = new Ink(sctx, pitch);

  const layer = {
    ctx,
    ink,
    dpr: 1,

    /** Size both layers to w × h CSS px. This wipes the canvas. */
    size(w, h, dpr) {
      layer.dpr = dpr;
      ink.pixelRatio = dpr;
      canvas.width = scratch.width = Math.round(w * dpr);
      canvas.height = scratch.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ink.dirty = null;
    },

    /** Lay fresh paper over the whole canvas. */
    paper(color) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    },

    flush() {
      const d = ink.dirty;
      if (!d) return;
      ink.dirty = null;
      const k = layer.dpr;
      const x0 = Math.max(0, Math.floor(d[0] * k) - 2);
      const y0 = Math.max(0, Math.floor(d[1] * k) - 2);
      const x1 = Math.min(canvas.width, Math.ceil(d[2] * k) + 2);
      const y1 = Math.min(canvas.height, Math.ceil(d[3] * k) + 2);
      if (x1 <= x0 || y1 <= y0) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 1;
      ctx.drawImage(scratch, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
      ctx.restore();
      sctx.save();
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(x0, y0, x1 - x0, y1 - y0);
      sctx.restore();
    },

    /** Throw away ink that hasn't been flushed yet. */
    clearScratch() {
      ink.dirty = null;
      sctx.save();
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(0, 0, scratch.width, scratch.height);
      sctx.restore();
    },
  };
  return layer;
}

/**
 * The growth loop for one ink layer.
 *
 * When something is planted, its generators run to the end against a
 * recorder rather than the real ink, which captures every mark as a tree of
 * strokes (ink.open/close in forms.js; a spawned plant is a stroke too). Each
 * stroke is then timed on its own ease-out curve, quick to start and slowing
 * before it finishes, and each child stroke starts the moment its parent
 * reaches the spot it branches from. Playback just draws marks as their times
 * come due. Keep-out fades are still decided at draw time, against the real
 * ink.
 *
 * A planting can bring its own source of randomness (forms.js setRandom), so
 * it grows the same way every time.
 *
 * Reduced motion: each planting is drawn complete, at once.
 */
export function createGrowth(layer, { reducedMotion = false } = {}) {
  const { ink } = layer;
  const PER_MARK = 0.022; // seconds of stroke per mark, before easing
  const MIN_STROKE = 0.35;
  // A planting's tempo: `pace` stretches its strokes (2 = twice as long) and
  // `ease` is the power of each stroke's ease-out (4, quart, is the field's
  // own: quick to start, slowing hard; lower is gentler and more even).
  const TEMPO = { pace: 1, ease: 4 };
  const easeOutInv = (p, e) => 1 - Math.pow(1 - p, 1 / e); // inverse of ease-out

  const recorder = {
    stack: null,
    top() { return this.stack[this.stack.length - 1]; },
    wash(...a) { this.top().marks.push(["wash", a]); },
    seed(...a) { this.top().marks.push(["seed", a]); },
    open() {
      const parent = this.top();
      const s = { marks: [], kids: [] };
      parent.kids.push({ at: parent.marks.length, s });
      this.stack.push(s);
    },
    close() { this.stack.pop(); },
    blocked: (x, y) => ink.blocked(x, y),
  };

  // Recording is resumable and runs a slice at a time inside the frame loop,
  // so a click never stalls a frame however much it sets off. `pending`
  // holds one entry per top-level form; each keeps a stack of generator
  // contexts, since a form can spawn another (a runner opening a fern)
  // whose tree hangs off the stroke it was spawned from. A form starts
  // playing as soon as its own tree is fully recorded.
  let pending = [];
  const contextFor = ({ it }, attach = null) => {
    const root = { marks: [], kids: [] };
    return { it, root, stack: [root], attach };
  };

  const advance = (deadline, emit) => {
    try {
      while (pending.length) {
        const top = pending[0];
        const ctx = top.stack[top.stack.length - 1];
        recorder.stack = ctx.stack;
        setRandom(top.random);
        let finished = false;
        for (let k = 0; k < 32; k++) {
          const r = ctx.it.next();
          if (r.done) { finished = true; break; }
          if (r.value && r.value.spawn) {
            const s = ctx.stack[ctx.stack.length - 1];
            top.stack.push(contextFor(r.value.spawn, { s, at: s.marks.length }));
            break;
          }
        }
        if (finished) {
          top.stack.pop();
          if (ctx.attach) ctx.attach.s.kids.push({ at: ctx.attach.at, s: ctx.root });
          else { pending.shift(); emit(ctx.root, top.tempo); }
        }
        if (performance.now() > deadline) return;
      }
    } finally {
      setRandom(null);
    }
  };

  // Flatten a stroke tree into [time, mark] pairs.
  const schedule = (s, start, out, tempo = TEMPO) => {
    const n = s.marks.length;
    const D = Math.max(MIN_STROKE, n * PER_MARK) * tempo.pace;
    const times = s.marks.map((_, j) => start + D * easeOutInv((j + 1) / n, tempo.ease));
    s.marks.forEach((m, j) => out.push([times[j], m]));
    for (const k of s.kids) schedule(k.s, k.at > 0 ? times[k.at - 1] : start, out, tempo);
    return out;
  };

  // Every mark drawn, in order, so the growth can be taken back off in
  // reverse (retract). Cleared whenever the canvas is repainted (clear).
  let drawn = [];
  const draw = (m) => {
    const [kind, a] = m;
    if (kind === "wash") ink.wash(...a);
    else ink.seed(...a);
    drawn.push(m);
  };

  // Each planting is its own timeline of marks sorted by when they land.
  // Drawing is capped at a few milliseconds per frame: whatever's due past
  // that waits for the next frame. Under heavy clicking, growth falls a beat
  // behind its schedule instead of the page stuttering. Plantings take
  // turns starting first, so none is starved while others are busy.
  // Two caps: script time, and dots handed to the canvas (the canvas fills
  // them after the script returns, so time alone undercounts the cost).
  const RECORD_MS = 4;
  // Growth is drawn on a 12fps beat, for a stop-motion feel: the loop still
  // runs every display frame (recording stays responsive), but ink only
  // lands on every ~5th, and each beat draws whatever came due since the
  // last. With far fewer drawing frames, each gets a bigger budget.
  const GROWTH_FPS = 12;
  const BUDGET_MS = 10;
  const BUDGET_DOTS = 9000;
  let growing = [];
  let raf = 0;
  let back = 0; // a retract's frame loop
  let lastBeat = -Infinity;
  let turn = 0;
  const play = (root, tempo) => {
    const marks = schedule(root, 0, [], tempo).sort((p, q) => p[0] - q[0]);
    growing.push({ marks, t0: null, i: 0 });
  };
  const frame = (ms) => {
    const now = ms / 1000;
    advance(performance.now() + RECORD_MS, play);
    // Not a beat yet: start the clock on anything new, but draw nothing.
    // (A few ms of slack so 60Hz frames land on a steady every-4th beat.)
    if (now - lastBeat < 1 / GROWTH_FPS - 0.004) {
      for (const g of growing) if (g.t0 === null) g.t0 = now;
      raf = growing.length || pending.length ? requestAnimationFrame(frame) : 0;
      return;
    }
    lastBeat = now;
    const start = performance.now();
    const dots0 = ink.dots;
    const spent = () => performance.now() - start > BUDGET_MS || ink.dots - dots0 > BUDGET_DOTS;
    const n = growing.length;
    for (let k = 0; k < n; k++) {
      const g = growing[(k + turn) % n];
      if (g.t0 === null) g.t0 = now;
      const t = now - g.t0;
      while (g.i < g.marks.length && g.marks[g.i][0] <= t) {
        const [kind, a] = g.marks[g.i][1];
        if (kind === "wash") {
          // A big wash may not fit in what's left of the frame; draw what
          // fits and pick it up from the same row next frame.
          const left = Math.max(1, BUDGET_DOTS - (ink.dots - dots0));
          const row = ink.wash(a[0], a[1], a[2], a[3], a[4] ?? 0.4, a[5] ?? 1, g.row ?? null, left);
          if (row !== -1) { g.row = row; break; }
          g.row = null;
        } else {
          ink.seed(...a);
        }
        drawn.push(g.marks[g.i][1]);
        g.i++;
        if (spent()) break;
      }
      if (spent()) break;
    }
    layer.flush();
    turn++;
    growing = growing.filter((g) => g.i < g.marks.length);
    raf = growing.length || pending.length ? requestAnimationFrame(frame) : 0;
  };

  return {
    recorder,

    /**
     * Queue a set of generators to be recorded, timed and played. `random`
     * is the randomness they grow with (default Math.random). `now` draws
     * them complete at once, as reduced motion always does. `pace` and
     * `ease` set their tempo (see TEMPO).
     */
    plant(gens, { random = null, now = reducedMotion, pace = 1, ease = 4 } = {}) {
      const tempo = { pace, ease };
      for (const g of gens) pending.push({ stack: [contextFor(g)], random, tempo });
      if (now) {
        advance(Infinity, (root) => schedule(root, 0, []).forEach((m) => draw(m[1])));
        layer.flush();
        return;
      }
      if (!raf) raf = requestAnimationFrame(frame);
    },

    /**
     * Record a set of generators without playing them: every mark with the
     * time (s) it lands, sorted. For drawing growth frame by frame offline
     * (tools/frog-reveal); draw a mark with `ink.wash(...)`/`ink.seed(...)`.
     */
    timeline(gens, { random = null } = {}) {
      const out = [];
      for (const g of gens) pending.push({ stack: [contextFor(g)], random });
      advance(Infinity, (root) => schedule(root, 0, out));
      return out.sort((p, q) => p[0] - q[0]);
    },

    /** Note a mark drawn outside the loop (it's taken back off with the rest). */
    note(kind, args) {
      drawn.push([kind, args]);
    },

    /**
     * Take everything drawn back off, last mark first, over `duration`
     * seconds on the same 12fps beat: quick at first, slowing, so the newest
     * growth goes first and the oldest last. `erase(mark)` wipes one mark
     * (see eraseMark in ink.js); `onDone` runs at the end, and should leave
     * the canvas clean (marks may overlap, and a tight beat skips the rest).
     */
    retract({ duration = 1.1, erase, onDone } = {}) {
      const marks = drawn.reverse();
      this.clear();
      const n = marks.length;
      let i = 0, t0 = null, last = -Infinity;
      const tick = (ms) => {
        const now = ms / 1000;
        if (t0 === null) t0 = now;
        if (now - last >= 1 / GROWTH_FPS - 0.004) {
          last = now;
          const u = Math.min(1, (now - t0) / duration);
          const to = Math.floor(n * (1 - (1 - u) * (1 - u)));
          const start = performance.now();
          while (i < to && performance.now() - start < 14) erase(marks[i++]);
          if (u >= 1) { back = 0; onDone?.(); return; }
        }
        back = requestAnimationFrame(tick);
      };
      back = requestAnimationFrame(tick);
    },

    /** Whether the loop is running (it flushes the layer every beat). */
    get busy() { return raf !== 0; },

    /**
     * Drop everything planted that hasn't finished growing, and any retract
     * under way. The canvas is about to be repainted, so the record of what
     * was drawn goes too.
     */
    clear() {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(back);
      raf = 0;
      back = 0;
      growing = [];
      pending = [];
      drawn = [];
    },
  };
}
