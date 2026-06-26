import React from "react";
import { Eyebrow } from "../text/Eyebrow.jsx";
import { MetaList } from "../text/MetaList.jsx";

/**
 * ExtLink — an inline external link rendered slightly bolder than body text so
 * it reads as clickable without shouting. Opens in a new tab.
 */
function ExtLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        fontWeight: "var(--fw-body-bold)",
        color: "inherit",
        borderBottom: 0,
      }}
    >
      {children}
    </a>
  );
}

const LINKS = {
  sloan: "https://www.instagram.com/sloancanyonrobotics/",
  team987: "https://www.team987.com/",
  unr: "https://www.unr.edu/",
};

/**
 * AboutBlock — the bio. Shared by the home page (so a visitor is hooked on a
 * quick scroll) and the standalone About route, so the two never diverge.
 * Pass `heading` to override the lede statement.
 */
export function AboutBlock({
  heading = "An engineering student who loves creating",
  style,
}) {
  return (
    <div style={style}>
      <div style={{ marginBottom: "var(--space-9)" }}>
        <Eyebrow as="div" style={{ marginBottom: "var(--space-5)" }}>About</Eyebrow>
        <h2 style={{
          fontFamily: "var(--font-serif-display)",
          fontWeight: 400,
          fontSize: "clamp(40px, 5.4vw, 92px)",
          lineHeight: 1.04,
          letterSpacing: "-0.035em",
          margin: 0,
          maxWidth: "18ch",
        }}>
          {heading}
        </h2>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(220px, 1fr) minmax(0, 1.8fr)",
        gap: "var(--space-9)",
      }}>
        <aside>
          <MetaList items={[
            { label: "Based",    value: "Las Vegas, Nevada" },
            { label: "Studying", value: <>Engineering · <ExtLink href={LINKS.unr}>University of Nevada, Reno</ExtLink></> },
            { label: "Focus",    value: "Robotics · Mechanical · PCB design" },
            { label: "VEX", value: <><ExtLink href={LINKS.sloan}>Sloan Canyon Robotics</ExtLink> — competitor & mentor</> },
            { label: "FRC",      value: <><ExtLink href={LINKS.team987}>Team 987</ExtLink> (Hall of Fame) — CAD design</> },
          ]} />
          <div style={{ marginTop: "var(--space-7)" }}>
            <a
              href="/assets/resume/resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5em",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--fs-meta)",
                letterSpacing: "var(--tracking-meta-wide)",
                textTransform: "uppercase",
                color: "var(--text-primary)",
                border: "var(--hairline)",
                padding: "var(--space-3) var(--space-5)",
                transition: "var(--transition-hover)",
              }}
            >
              View resume
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </aside>
        <div>
          <Eyebrow as="div" style={{ marginBottom: "var(--space-5)" }}>Bio</Eyebrow>
          <div style={{ maxWidth: "60ch" }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--fs-body-l)", lineHeight: "var(--lh-body)", margin: 0 }}>
              I'm a future student at the <ExtLink href={LINKS.unr}>University of Nevada, Reno</ExtLink>, majoring in engineering. I build things end to end and learn by making them real.
            </p>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)", marginTop: "var(--space-5)" }}>
              I competed and mentored for <ExtLink href={LINKS.sloan}>Sloan Canyon Robotics</ExtLink>, where I built the team's knowledge base and helped teach and inspire students, getting them interested in robotics.
            </p>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)", marginTop: "var(--space-5)" }}>
              I also competed for <ExtLink href={LINKS.team987}>FRC Hall of Fame team 987</ExtLink>, where I planned and designed competition robots in CAD.
            </p>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--fs-body)", lineHeight: "var(--lh-body)", marginTop: "var(--space-5)" }}>
              I enjoy building projects of every kind, from full robots to PCB design to simple websites.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
