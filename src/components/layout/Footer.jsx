import React from "react";
import { EditorialLink } from "../text/EditorialLink.jsx";
import { useIsMobile } from "../../hooks/useMediaQuery.js";
import { getEmail, getMailtoHref } from "../../utils/email.js";

/**
 * Footer — minimal. Hairline rule above, three-column grid: monogram /
 * contact list / colophon. No social-icon clutter. Stacks to one column on
 * mobile. The email is decoded from an obfuscated form at render time.
 */
export function Footer({
  monogram = "/assets/brand/anura.svg",
  contactItems = [
    { label: "Email",    value: getEmail(), href: getMailtoHref() },
    { label: "LinkedIn", value: "/in/daniel-kaliko",     href: "https://www.linkedin.com/in/daniel-kaliko/" },
    { label: "GitHub",   value: "@okkdaniel",        href: "https://github.com/okkdaniel" },
  ],
  colophon = "Set in Cormorant Garamond & Inter. Pattern by Daniel.",
  style,
  ...rest
}) {
  const isMobile = useIsMobile();
  return (
    <footer
      {...rest}
      style={{
        marginTop: "var(--space-13)",
        paddingTop: "var(--space-7)",
        paddingBottom: "var(--space-9)",
        borderTop: "var(--hairline)",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "auto 1fr auto",
        columnGap: "var(--space-9)",
        rowGap: isMobile ? "var(--space-7)" : 0,
        alignItems: "start",
        ...style,
      }}
    >
      <button
        type="button"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{ lineHeight: 0, cursor: "pointer" }}
      >
        <img
          src={monogram}
          alt="Daniel Kaliko"
          style={{ height: 56, width: "auto", display: "block" }}
        />
      </button>
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
          textAlign: isMobile ? "left" : "right",
        }}
      >
        {colophon}
      </div>
    </footer>
  );
}
