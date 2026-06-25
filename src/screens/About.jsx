// About screen — the standalone bio route. Shares AboutBlock with the home
// page so the two never diverge; adds a contour panel and the footer.
import React from "react";
import { Nav } from "../components/navigation/Nav.jsx";
import { AboutBlock } from "../components/about/AboutBlock.jsx";
import { Footer } from "../components/layout/Footer.jsx";

export function About({ onNavigate }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Bottom-right panel — anchored below the bio, fading on all edges. */}
      <img
        aria-hidden="true"
        src="/assets/pattern/leopard-print.svg"
        alt=""
        style={{
          position: "absolute",
          top: "75vh",
          right: "-38vw",
          width: "min(2000px, 115vw)",
          opacity: 0.10,
          mixBlendMode: "multiply",
          WebkitMaskImage: "radial-gradient(ellipse at center, #000 28%, transparent 78%)",
          maskImage: "radial-gradient(ellipse at center, #000 28%, transparent 78%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 10 }}>
        <Nav active="about" onNavigate={onNavigate} />

        <AboutBlock style={{ marginTop: "var(--space-12)", marginBottom: "var(--space-13)" }} />

        <Footer />
      </div>
    </div>
  );
}
