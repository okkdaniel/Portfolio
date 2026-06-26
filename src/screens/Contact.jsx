// Contact screen — the standalone "get in touch" route. Built from the same
// editorial vocabulary as About: a contour panel bleeding off-corner, an
// eyebrow, a serif display line, and a tracked list of channels as links.
import React from "react";
import { Nav } from "../components/navigation/Nav.jsx";
import { Eyebrow } from "../components/text/Eyebrow.jsx";
import { MetaList } from "../components/text/MetaList.jsx";
import { EditorialLink } from "../components/text/EditorialLink.jsx";
import { useIsMobile } from "../hooks/useMediaQuery.js";

const softMask = "radial-gradient(ellipse at center, #000 28%, transparent 78%)";

// Channels live here so the page reads in one glance; values render as
// editorial links. Mirrors the contacts the footer used to carry.
const CHANNELS = [
  { label: "Email",     value: "danielkaliko.edu@gmail.com", href: "mailto:danielkaliko.edu@gmail.com" },
  { label: "LinkedIn",  value: "/in/daniel-kaliko",          href: "https://www.linkedin.com/in/daniel-kaliko/" },
  { label: "GitHub",    value: "@okkdaniel",                 href: "https://github.com/okkdaniel" },
  { label: "Instagram", value: "@ddanyuhl",                  href: "https://www.instagram.com/ddanyuhl/" },
];

export function Contact({ onNavigate }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Bottom-right panel — anchored below the heading, fading on all edges. */}
      <img
        aria-hidden="true"
        src="/assets/pattern/leopard-print.svg"
        alt=""
        style={{
          position: "absolute",
          top: "60vh",
          right: "-38vw",
          width: "min(2000px, 115vw)",
          opacity: 0.10,
          mixBlendMode: "multiply",
          WebkitMaskImage: softMask,
          maskImage: softMask,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Nav active="contact" onNavigate={onNavigate} />

        {/* Center the contact block in the remaining viewport so the page reads
            full and settled rather than ending abruptly under the last line. */}
        <section style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingTop: "var(--space-11)",
          paddingBottom: "var(--space-13)",
        }}>
          <Eyebrow as="div" style={{ marginBottom: "var(--space-5)" }}>Contact</Eyebrow>

          <h1 style={{
            fontFamily: "var(--font-serif-display)",
            fontWeight: 400,
            fontSize: "clamp(40px, 5.4vw, 92px)",
            lineHeight: 1.04,
            letterSpacing: "-0.035em",
            margin: 0,
            maxWidth: "16ch",
          }}>
            Let's get in touch.
          </h1>

          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(220px, 1fr) minmax(0, 1.8fr)",
            gap: "var(--space-9)",
            marginTop: "var(--space-11)",
          }}>
            <aside>
              <Eyebrow as="div" style={{ marginBottom: "var(--space-5)" }}>Channels</Eyebrow>
              <MetaList items={CHANNELS.map(({ label, value, href }) => ({
                label,
                value: <EditorialLink href={href}>{value}</EditorialLink>,
              }))} />
            </aside>

            <div style={{ maxWidth: "48ch" }}>
              <Eyebrow as="div" style={{ marginBottom: "var(--space-5)" }}>Reach out</Eyebrow>
              <p style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--fs-body-l)",
                lineHeight: "var(--lh-body)",
                margin: 0,
              }}>
                Whether it's engineering work, a collaboration, or just to talk
                robotics — I'd love to hear from you. Email is the fastest way to
                reach me, and I'm on the channels at left.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
