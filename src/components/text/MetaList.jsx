import React from "react";

/**
 * MetaList — a definition list for project metadata. Keys are eyebrow-style
 * uppercase; values are sans body. Aligns into two columns at md+.
 */
export function MetaList({ items = [], style, ...rest }) {
  return (
    <dl
      {...rest}
      style={{
        display: "grid",
        gridTemplateColumns: "max-content 1fr",
        columnGap: "var(--space-7)",
        rowGap: "var(--space-4)",
        margin: 0,
        ...style,
      }}
    >
      {items.map(({ label, value }, i) => (
        <React.Fragment key={i}>
          <dt
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--fs-meta)",
              fontWeight: "var(--fw-body-md)",
              letterSpacing: "var(--tracking-meta-wide)",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              fontVariantNumeric: "tabular-nums",
              paddingTop: 3,
            }}
          >
            {label}
          </dt>
          <dd
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--fs-body-s)",
              lineHeight: "var(--lh-body)",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {value}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
