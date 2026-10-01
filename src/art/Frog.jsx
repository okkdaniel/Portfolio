import React from "react";
import { useMediaQuery } from "../hooks/useMediaQuery.js";

// The anura mark is drawn leaping toward its upper left; this is that heading,
// so the sprite can be rotated to face wherever it hops next.
const ART_HEADING = -138;

const rand = (a, b) => a + Math.random() * (b - a);

/**
 * Frog — the anura mark, living on the board. Every so often it turns toward a
 * nearby solder pad and hops to it in an arc; where it lands, a few twigs
 * sprout. Clicking it opens the About section. Sits still under reduced motion.
 *
 * `board` is the Board ref ({ randomPad, ping }); `avoid()` returns the rect
 * (the text column) it should never land under.
 */
export function Frog({ board, avoid, onClick }) {
  const elRef = React.useRef(null);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isSmall = useMediaQuery("(max-width: 768px)");
  const size = isSmall ? 38 : 52;
  const st = React.useRef(null);

  if (!st.current) {
    st.current = {
      x: window.innerWidth * (isSmall ? 0.7 : 0.64),
      y: window.innerHeight * 0.74,
      a: rand(-180, 180),
    };
  }

  const place = React.useCallback((x, y, a, scale = 1) => {
    return `translate(${x - size / 2}px, ${y - size / 2}px) rotate(${a - ART_HEADING}deg) scale(${scale})`;
  }, [size]);

  React.useEffect(() => {
    const el = elRef.current;
    const s = st.current;
    el.style.transform = place(s.x, s.y, s.a);
    if (reducedMotion) return;

    let timer = 0;
    let alive = true;

    const hop = async () => {
      if (!alive) return;
      const w = window.innerWidth, h = window.innerHeight;
      let target = null;
      for (let i = 0; i < 6 && !target; i++) {
        const p = board.current?.randomPad(s.x, s.y, Math.min(w, h) * 0.32, avoid());
        if (p && p.y < h - 90) target = p;
      }
      if (!target) {
        target = { x: rand(w * 0.45, w * 0.9), y: rand(h * 0.45, h * 0.85) };
      }

      // Turn to face the hop, then leap in an arc.
      const a1 = (Math.atan2(target.y - s.y, target.x - s.x) * 180) / Math.PI;
      const a = s.a + (((a1 - s.a) % 360) + 540) % 360 - 180; // shortest way round
      await el.animate(
        [{ transform: place(s.x, s.y, s.a) }, { transform: place(s.x, s.y, a) }],
        { duration: 260, easing: "ease-in-out", fill: "forwards" }
      ).finished.catch(() => {});
      if (!alive) return;

      const dist = Math.hypot(target.x - s.x, target.y - s.y);
      const arc = Math.min(90, 20 + dist * 0.35);
      const mx = (s.x + target.x) / 2, my = (s.y + target.y) / 2 - arc;
      await el.animate(
        [
          { transform: place(s.x, s.y, a, 1), offset: 0 },
          { transform: place(mx, my, a, 1.22), offset: 0.5 },
          { transform: place(target.x, target.y, a, 1), offset: 1 },
        ],
        { duration: Math.min(900, 380 + dist * 1.1), easing: "cubic-bezier(.3,.1,.4,1)", fill: "forwards" }
      ).finished.catch(() => {});
      if (!alive) return;

      s.x = target.x; s.y = target.y; s.a = a;
      el.style.transform = place(s.x, s.y, s.a);
      el.getAnimations().forEach((an) => an.cancel());
      board.current?.ping(s.x, s.y);
      timer = setTimeout(hop, rand(9000, 15000));
    };

    timer = setTimeout(hop, rand(4000, 7000));
    return () => { alive = false; clearTimeout(timer); };
  }, [board, avoid, place, reducedMotion]);

  return (
    <button
      ref={elRef}
      type="button"
      className="frog"
      style={{ width: size, height: size }}
      onClick={onClick}
      aria-label="The frog. Opens the about section."
      title="hello"
    >
      <span className="frog__body" />
    </button>
  );
}
