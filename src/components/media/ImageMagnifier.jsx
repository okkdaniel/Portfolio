import React from "react";

// Keep a value inside [min, max].
const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

/**
 * ImageMagnifier — wraps an image with a hover "lens" that magnifies the area
 * under the cursor. The lens is a square hairline-bordered loupe (no rounding
 * or shadow, in keeping with the design system) that follows the pointer in
 * real time.
 *
 * Performance: pointer moves are batched through requestAnimationFrame and the
 * lens is updated by writing styles directly to its ref, so moving the cursor
 * never triggers a React re-render. The lens is an absolutely-positioned
 * overlay with pointer-events none, so it never shifts layout.
 *
 * `imgStyle` is forwarded to the inner <img> so the wrapper matches whatever
 * sizing the caller (PlateImage) computed.
 */
export function ImageMagnifier({ src, alt = "", imgStyle, zoom = 2.2, lensSize = 180 }) {
  const imgRef = React.useRef(null);
  const lensRef = React.useRef(null);
  const rafRef = React.useRef(0);

  React.useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const handleMove = (e) => {
    const img = imgRef.current;
    const lens = lensRef.current;
    if (!img || !lens) return;
    const { clientX, clientY } = e;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = img.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Outside the rendered image — hide the lens.
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        lens.style.opacity = "0";
        return;
      }

      const bgW = rect.width * zoom;
      const bgH = rect.height * zoom;
      // Centre the hovered point in the lens, but clamp the magnified content
      // so the loupe is always full (no blank canvas near the edges).
      const bgX = clamp(lensSize / 2 - x * zoom, lensSize - bgW, 0);
      const bgY = clamp(lensSize / 2 - y * zoom, lensSize - bgH, 0);

      lens.style.opacity = "1";
      lens.style.left = `${x}px`;
      lens.style.top = `${y}px`;
      lens.style.backgroundSize = `${bgW}px ${bgH}px`;
      lens.style.backgroundPosition = `${bgX}px ${bgY}px`;
    });
  };

  const handleLeave = () => {
    cancelAnimationFrame(rafRef.current);
    if (lensRef.current) lensRef.current.style.opacity = "0";
  };

  return (
    <span style={{ display: "block", textAlign: "center" }}>
      <span
        onMouseMove={handleMove}
        onMouseEnter={handleMove}
        onMouseLeave={handleLeave}
        style={{
          position: "relative",
          display: "inline-block",
          lineHeight: 0,
          maxWidth: "100%",
          cursor: "zoom-in",
        }}
      >
        <img ref={imgRef} src={src} alt={alt} style={imgStyle} />
        <span
          ref={lensRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: lensSize,
            height: lensSize,
            transform: "translate(-50%, -50%)",
            backgroundImage: `url("${src}")`,
            backgroundRepeat: "no-repeat",
            border: "1px solid var(--ink-900)",
            pointerEvents: "none",
            opacity: 0,
            transition: "opacity var(--dur-quick) var(--ease-out-quiet)",
            zIndex: 5,
          }}
        />
      </span>
    </span>
  );
}
