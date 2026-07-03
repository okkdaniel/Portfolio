import React from "react";

/**
 * Eyebrow — uppercase tracked label. Used above project titles, above
 * sections, anywhere a small piece of context is needed. Body sans, 12px.
 */
export function Eyebrow({ children, as: As = "div", style, ...rest }) {
  return (
    <As
      {...rest}
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "var(--fs-meta)",
        fontWeight: "var(--fw-body-md)",
        letterSpacing: "var(--tracking-meta-wide)",
        textTransform: "uppercase",
        color: "var(--accent)",
        fontVariantNumeric: "tabular-nums",
        ...style,
      }}
    >
      {children}
    </As>
  );
}
