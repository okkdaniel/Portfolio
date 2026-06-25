import React from "react";

/**
 * LeopardPanel — places the brand contour mark (kept named LeopardPanel
 * for API stability after the artwork changed). Always anchor it; never
 * frame content with it. Pass `position` (corner + offsets) and a `width`
 * — the panel will absolute-position the mark with overflow allowed past
 * the page edge. Use `variant="wide"` for horizontal bleed.
 *
 * Available positions:
 *   - top-left, top-right, bottom-left, bottom-right, left, right
 */
export function LeopardPanel({
  variant = "tall",
  width = 800,
  offset = {},
  position = "right",
  opacity = 0.95,
  parallaxRef,
  style,
  ...rest
}) {
  const src =
    variant === "wide"
      ? "/assets/pattern/leopard-print-wide.svg"
      : "/assets/pattern/leopard-print.svg";

  // Sensible per-position defaults; user overrides win
  const defaults = {
    "top-left":     { top: -120, left: -180 },
    "top-right":    { top: -120, right: -180 },
    "bottom-left":  { bottom: -180, left: -160 },
    "bottom-right": { bottom: -180, right: -160 },
    "left":         { top: "20%", left: -240 },
    "right":        { top: "20%", right: -240 },
  };

  const pos = { ...defaults[position], ...offset };

  return (
    <div
      aria-hidden="true"
      ref={parallaxRef}
      {...rest}
      style={{
        position: "absolute",
        pointerEvents: "none",
        zIndex: 0,
        width,
        opacity,
        ...pos,
        ...style,
      }}
    >
      <img
        src={src}
        alt=""
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </div>
  );
}
