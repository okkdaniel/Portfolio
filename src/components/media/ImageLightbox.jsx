import React from "react";
import { createPortal } from "react-dom";

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
const MIN_SCALE = 1;
const MAX_SCALE = 8;

/**
 * ImageLightbox — a full-screen overlay for viewing a single image up close.
 * Scroll wheel zooms toward the cursor; drag pans. Close with the button, a
 * click on the backdrop, or Escape.
 *
 * Rendered through a portal to document.body so no ancestor's stacking or
 * clipping affects it. Zoom/pan write the transform straight to the image ref,
 * so dragging and zooming never trigger a React re-render.
 */
export function ImageLightbox({ src, alt = "", onClose }) {
  const overlayRef = React.useRef(null);
  const imgRef = React.useRef(null);
  const st = React.useRef({ scale: 1, x: 0, y: 0, dragging: false, lx: 0, ly: 0 });

  const apply = () => {
    const { scale, x, y } = st.current;
    const img = imgRef.current;
    if (img) img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  };

  React.useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);

    // Native, non-passive wheel listener so we can preventDefault the zoom.
    const el = overlayRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const s = st.current;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      // Vector from the (translated) image centre to the cursor.
      const dx = e.clientX - (cx + s.x);
      const dy = e.clientY - (cy + s.y);
      const factor = Math.exp(-e.deltaY * 0.0015);
      const newScale = clamp(s.scale * factor, MIN_SCALE, MAX_SCALE);
      const ratio = newScale / s.scale;
      // Shift so the point under the cursor stays put while scaling.
      s.x += dx * (1 - ratio);
      s.y += dy * (1 - ratio);
      s.scale = newScale;
      if (newScale === MIN_SCALE) { s.x = 0; s.y = 0; } // snap back to centre
      apply();
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      el.removeEventListener("wheel", onWheel);
    };
  }, [onClose]);

  const onPointerDown = (e) => {
    const s = st.current;
    s.dragging = true;
    s.lx = e.clientX;
    s.ly = e.clientY;
    if (imgRef.current) imgRef.current.style.cursor = "grabbing";
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const s = st.current;
    if (!s.dragging) return;
    s.x += e.clientX - s.lx;
    s.y += e.clientY - s.ly;
    s.lx = e.clientX;
    s.ly = e.clientY;
    apply();
  };
  const onPointerUp = () => {
    st.current.dragging = false;
    if (imgRef.current) imgRef.current.style.cursor = "grab";
  };

  const metaText = {
    fontFamily: "var(--font-sans)",
    fontSize: "var(--fs-meta)",
    letterSpacing: "var(--tracking-meta-wide)",
    textTransform: "uppercase",
    color: "var(--paper-100)",
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(10, 10, 10, 0.94)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overscrollBehavior: "contain",
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top: "var(--space-6)",
          right: "var(--space-6)",
          ...metaText,
          opacity: 0.8,
          cursor: "pointer",
          zIndex: 1,
        }}
      >
        Close ✕
      </button>

      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          maxWidth: "92vw",
          maxHeight: "92vh",
          width: "auto",
          height: "auto",
          transform: "translate(0px, 0px) scale(1)",
          transformOrigin: "center center",
          cursor: "grab",
          userSelect: "none",
          touchAction: "none",
          willChange: "transform",
        }}
      />

      <div style={{
        position: "absolute",
        bottom: "var(--space-6)",
        left: "50%",
        transform: "translateX(-50%)",
        ...metaText,
        fontSize: "var(--fs-meta-xs)",
        opacity: 0.55,
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}>
        Scroll to zoom · drag to pan · esc to close
      </div>
    </div>,
    document.body
  );
}
