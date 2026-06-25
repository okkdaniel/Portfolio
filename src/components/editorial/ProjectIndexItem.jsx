import React from "react";

/**
 * ProjectIndexItem — a single row in the works listing. Year column,
 * discipline tag column, project title (large serif), spacer.
 *
 * Hover lightens the title row's opacity to 0.55 (the brand hover state).
 */
export function ProjectIndexItem({
  index,
  year,
  discipline,
  title,
  href,
  onClick,
  rule = "soft",
  style,
}) {
  const [hover, setHover] = React.useState(false);

  return (
    <a
      href={href}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(48px, max-content) minmax(80px, max-content) 1fr auto",
        columnGap: "var(--space-7)",
        alignItems: "baseline",
        padding: "var(--space-7) 0",
        borderTop: rule === "strong" ? "var(--hairline)" : "var(--hairline-soft)",
        color: "var(--text-primary)",
        textDecoration: "none",
        borderBottom: 0,
        transition: "opacity var(--dur-quick) var(--ease-out-quiet)",
        opacity: hover ? 0.55 : 1,
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--fs-meta)",
          letterSpacing: "var(--tracking-meta-wide)",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {String(index).padStart(2, "0")}
      </span>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--fs-meta)",
          letterSpacing: "var(--tracking-meta-wide)",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {discipline}
      </span>
      <span
        style={{
          fontFamily: "var(--font-serif-display)",
          fontSize: "clamp(40px, 5.4vw, 84px)",
          lineHeight: 1.0,
          letterSpacing: "-0.025em",
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--fs-meta)",
          letterSpacing: "var(--tracking-meta-wide)",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {year}
      </span>
    </a>
  );
}
