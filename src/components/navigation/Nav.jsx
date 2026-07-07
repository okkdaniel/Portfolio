import React from "react";
import { EditorialLink } from "../text/EditorialLink.jsx";
import { useIsMobile } from "../../hooks/useMediaQuery.js";

/**
 * Nav — the minimal portfolio navigation. Wordmark on the left, link list on
 * the right. No background, no pills, no outlines. Sits inside PageFrame.
 */
export function Nav({
  brand = "Daniel Kaliko",
  logo = "/assets/brand/anura.svg",
  showLogo = true,
  items = [
    { label: "Projects", href: "#work" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
  ],
  active,
  style,
  onNavigate,
  ...rest
}) {
  const isMobile = useIsMobile();
  return (
    <nav
      {...rest}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-7) 0",
        ...style,
      }}
    >
      {showLogo ? (
        <a
          href="#"
          aria-label={brand}
          onClick={onNavigate && ((e) => { e.preventDefault(); onNavigate("#"); })}
          style={{
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
            borderBottom: 0,
            lineHeight: 0,
          }}
        >
          <img
            src={logo}
            alt={brand}
            style={{ height: 40, width: "auto", display: "block" }}
          />
        </a>
      ) : (
        // Spacer keeps the link list right-aligned when the home button is
        // hidden (the home page shows the mark as a background graphic instead).
        <span aria-hidden="true" />
      )}
      <ul
        style={{
          display: "flex",
          gap: isMobile ? "var(--space-5)" : "var(--space-7)",
          listStyle: "none",
          margin: 0,
          padding: 0,
        }}
      >
        {items.map(({ label, href }) => {
          const isActive = active === href || active === label.toLowerCase();
          return (
            <li key={href}>
              <EditorialLink
                href={href}
                underline={false}
                quiet={!isActive}
                onClick={onNavigate && ((e) => { e.preventDefault(); onNavigate(href); })}
                style={{
                  fontSize: "var(--fs-meta)",
                  letterSpacing: "var(--tracking-meta-wide)",
                  textTransform: "uppercase",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                {label}
              </EditorialLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
