import React from "react";

/**
 * EditorialLink — a text link in the editorial vocabulary: same-color
 * hairline underline that softens on hover. Pass `quiet` for low-emphasis,
 * `arrow` to append a → glyph, and `as` to render as a non-anchor.
 */
export function EditorialLink({
  children,
  href,
  arrow = false,
  quiet = false,
  underline = true,
  as: As = "a",
  style,
  ...rest
}) {
  return (
    <As
      href={href}
      {...rest}
      style={{
        color: quiet ? "var(--text-secondary)" : "var(--text-primary)",
        textDecoration: "none",
        borderBottom: underline ? "1px solid currentColor" : "0",
        paddingBottom: underline ? 1 : 0,
        transition: "var(--transition-hover)",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      {children}
      {arrow && <span aria-hidden="true" style={{ marginLeft: "0.4em" }}>→</span>}
    </As>
  );
}
