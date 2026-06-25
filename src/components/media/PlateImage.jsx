import React from "react";

/**
 * PlateImage — the only image primitive. No border, no shadow, no rounding.
 * The image sits on the page. Pass `bleed` to extend past a gutter, `tall`
 * to constrain aspect, and a caption to render a tracked metadata line.
 */
export function PlateImage({
  src,
  alt = "",
  caption,
  bleed = "none",
  ratio,
  style,
  ...rest
}) {
  const bleedStyles = {
    none:  { marginLeft: 0, marginRight: 0 },
    left:  { marginLeft: "calc(var(--page-gutter) * -1)" },
    right: { marginRight: "calc(var(--page-gutter) * -1)" },
    full:  { marginLeft: "calc(var(--page-gutter) * -1)", marginRight: "calc(var(--page-gutter) * -1)" },
  };

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
          style={{
            display: "block",
            width: "100%",
            height: ratio ? "100%" : "auto",
            objectFit: ratio ? "cover" : "initial",
          }}
        />
      </div>
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
