// 404 screen — a page that doesn't exist. Built from the same editorial
// vocabulary as the rest of the site: nav, a serif display line, and a couple
// of quiet links back into the portfolio.
import React from "react";
import { ProjectTitle } from "../components/text/ProjectTitle.jsx";
import { EditorialLink } from "../components/text/EditorialLink.jsx";
import { Footer } from "../components/layout/Footer.jsx";

export function NotFound({ onNavigate }) {
  const linkStyle = {
    fontSize: "var(--fs-body-s)",
    letterSpacing: "var(--tracking-meta-wide)",
    textTransform: "uppercase",
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Anura brand mark — a quiet backdrop, matched to the home mark. */}
      <img
        aria-hidden="true"
        src="/assets/brand/anura.svg"
        alt=""
        style={{
          position: "absolute",
          top: "47vh",
          left: "50%",
          transform: "translate(-54%, -50%)",
          width: "min(720px, 64vw)",
          opacity: 0.06,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <section style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingTop: "var(--space-11)",
          paddingBottom: "var(--space-13)",
        }}>
          <ProjectTitle
            size="l"
            eyebrow="Error 404"
            lede="The page you're looking for doesn't exist, or it may have moved. Let's get you back on track."
          >
            Page not found.
          </ProjectTitle>

          <div style={{
            marginTop: "var(--space-9)",
            display: "flex",
            gap: "var(--space-7)",
            flexWrap: "wrap",
          }}>
            <EditorialLink
              href="#"
              arrow
              onClick={(e) => { e.preventDefault(); onNavigate("#"); }}
              style={linkStyle}
            >
              Back home
            </EditorialLink>
            <EditorialLink
              href="#work"
              arrow
              onClick={(e) => { e.preventDefault(); onNavigate("#work"); }}
              style={linkStyle}
            >
              View projects
            </EditorialLink>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
