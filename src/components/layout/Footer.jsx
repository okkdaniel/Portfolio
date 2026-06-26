import React from "react";
import { EditorialLink } from "../text/EditorialLink.jsx";

/**
 * Footer — minimal. Hairline rule above, three-column grid: monogram /
 * contact list / colophon. No social-icon clutter.
 */
export function Footer({
  monogram = "/assets/brand/anura.svg",
  contactItems = [
    { label: "Email",    value: "danielkaliko.edu@gmail.com", href: "mailto:danielkaliko.edu@gmail.com" },
    { label: "LinkedIn", value: "/in/daniel-kaliko",     href: "https://www.linkedin.com/in/daniel-kaliko/" },
    { label: "GitHub",   value: "@okkdaniel",        href: "https://github.com/okkdaniel" },
    { label: "Instagram", value: "@ddanyuhl",        href: "https://www.instagram.com/ddanyuhl/" },
  ],
  colophon = "Set in Cormorant Garamond & Inter. Pattern by Daniel.",
  style,
  ...rest
}) {
  return (
    <footer
      {...rest}
      style={{
        marginTop: "var(--space-13)",
        paddingTop: "var(--space-7)",
        paddingBottom: "var(--space-9)",
        borderTop: "var(--hairline)",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        columnGap: "var(--space-9)",
        alignItems: "start",
        ...style,
      }}
    >
      <img
        src={monogram}
        alt="Daniel Kaliko"
        style={{ height: 56, width: "auto", display: "block" }}
      />
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, max-content))",
          columnGap: "var(--space-7)",
          rowGap: "var(--space-3)",
          margin: 0,
        }}
      >
        {contactItems.map(({ label, value, href }) => (
          <div key={label}>
            <dt
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--fs-meta)",
                letterSpacing: "var(--tracking-meta-wide)",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
                marginBottom: "var(--space-1)",
              }}
            >
              {label}
            </dt>
            <dd style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: "var(--fs-body-s)" }}>
              {href ? (
                <EditorialLink href={href}>{value}</EditorialLink>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--fs-meta)",
          letterSpacing: "var(--tracking-meta)",
          color: "var(--text-secondary)",
          maxWidth: "26ch",
          textAlign: "right",
        }}
      >
        {colophon}
      </div>
    </footer>
  );
}
