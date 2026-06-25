import React from "react";
import { Eyebrow } from "./Eyebrow.jsx";

/**
 * ProjectTitle — large serif title with optional eyebrow above and lede
 * below. The default H1 of every project view.
 */
export function ProjectTitle({
  children,
  eyebrow,
  lede,
  as: As = "h1",
  size = "l",
  style,
}) {
  const sizeMap = {
    xl: { fontSize: "var(--fs-display-xl)", lineHeight: "var(--lh-display-tight)" },
    l:  { fontSize: "var(--fs-display-l)",  lineHeight: "var(--lh-display)" },
    m:  { fontSize: "var(--fs-display-m)",  lineHeight: "var(--lh-display)" },
    s:  { fontSize: "var(--fs-display-s)",  lineHeight: "var(--lh-heading)" },
  };

  return (
    <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", ...style }}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <As
        style={{
          fontFamily: "var(--font-serif-display)",
          fontWeight: "var(--fw-display)",
          letterSpacing: "var(--tracking-display-tight)",
          color: "var(--text-heading)",
          margin: 0,
          ...sizeMap[size],
        }}
      >
        {children}
      </As>
      {lede && (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--fs-body-l)",
            lineHeight: "var(--lh-body)",
            color: "var(--text-primary)",
            maxWidth: "44ch",
            margin: 0,
          }}
        >
          {lede}
        </p>
      )}
    </header>
  );
}
