import React from "react";
import { ImageLightbox } from "./ImageLightbox.jsx";

/**
 * PlateImage — the only image primitive. No border, no shadow, no rounding.
 * The image sits on the page. Pass `bleed` to extend past a gutter, `ratio`
 * to constrain aspect, `fit` to choose cover (default) vs contain (whole
 * drawing visible, for line-art schematics), `maxHeight` to cap the image so
 * the whole render stays in view (centered, aspect preserved), `zoomable` to
 * open a full-screen zoom/pan lightbox on click, and a caption to render a
 * tracked metadata line.
 */
export function PlateImage({
  src,
  alt = "",
  caption,
  bleed = "none",
  ratio,
  fit = "cover",
  maxHeight,
  zoomable = false,
  style,
  ...rest
}) {
  const [zoomOpen, setZoomOpen] = React.useState(false);
  const bleedStyles = {
    none:  { marginLeft: 0, marginRight: 0 },
    left:  { marginLeft: "calc(var(--page-gutter) * -1)" },
    right: { marginRight: "calc(var(--page-gutter) * -1)" },
    full:  { marginLeft: "calc(var(--page-gutter) * -1)", marginRight: "calc(var(--page-gutter) * -1)" },
  };

  // Three modes: fixed aspect (ratio), height-capped (maxHeight, centered so
  // the whole render is visible), or natural (default, full container width).
  const imgStyle = ratio
    ? { display: "block", width: "100%", height: "100%", objectFit: fit }
    : maxHeight
      ? { display: "block", width: "auto", maxWidth: "100%", height: "auto", maxHeight, margin: "0 auto" }
      : { display: "block", width: "100%", height: "auto", objectFit: "initial" };

  return (
    <figure
      {...rest}
      style={{
        margin: 0,
        ...bleedStyles[bleed],
        ...style,
      }}
    >
      <div style={{ background: "transparent", aspectRatio: ratio || undefined }}>
        <img
          src={src}
          alt={alt}
          onClick={zoomable ? () => setZoomOpen(true) : undefined}
          style={zoomable ? { ...imgStyle, cursor: "zoom-in" } : imgStyle}
        />
      </div>
      {zoomable && zoomOpen && (
        <ImageLightbox src={src} alt={alt} onClose={() => setZoomOpen(false)} />
      )}
      {caption && (
        <figcaption
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--fs-meta)",
            letterSpacing: "var(--tracking-meta)",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
            marginTop: "var(--space-4)",
            paddingLeft: bleed === "left" || bleed === "full" ? "var(--page-gutter)" : 0,
            paddingRight: bleed === "right" || bleed === "full" ? "var(--page-gutter)" : 0,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
