// Landing screen — name centered in the first viewport, then a quick scroll
// reveals who I am (About) and a drifting band of tools (Skills). Two
// soft-masked contour panels bleed off opposite corners of the hero.
import React from "react";
import { Nav } from "../components/navigation/Nav.jsx";
import { AboutBlock } from "../components/about/AboutBlock.jsx";
import { WorkPreview } from "../components/editorial/WorkPreview.jsx";
import { SkillsMarquee } from "../components/skills/SkillsMarquee.jsx";
import { useInView } from "../hooks/useInView.js";

// A soft radial mask keeps the dense center of the contour mark intact and
// fades its edges to transparent — no rectangular clip cut-offs.
const softMask = "radial-gradient(ellipse at center, #000 28%, transparent 78%)";

export function Landing({ onNavigate, onOpenProject }) {
  const [aboutRef, aboutInView] = useInView({ threshold: 0.18 });

  return (
    <div style={{ position: "relative" }}>
      {/* ---- Hero ---- */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Top-right panel — anchored well above the name. Mask fades its
            edges so it dissolves into the canvas. */}
        <img
          aria-hidden="true"
          src="/assets/pattern/leopard-print.svg"
          alt=""
          style={{
            position: "absolute",
            top: "-35vh",
            right: "-30vw",
            width: "min(2400px, 160vw)",
            opacity: 0.1,
            mixBlendMode: "multiply",
            WebkitMaskImage: softMask,
            maskImage: softMask,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        {/* Bottom-left wide panel — echoes the top-right, opposite corner. */}
        <img
          aria-hidden="true"
          src="/assets/pattern/leopard-print-wide.svg"
          alt=""
          style={{
            position: "absolute",
            bottom: "-12vh",
            left: "-34vw",
            width: "min(2600px, 170vw)",
            opacity: 0.09,
            mixBlendMode: "multiply",
            WebkitMaskImage: softMask,
            maskImage: softMask,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div style={{ position: "relative", zIndex: 10 }}>
          <Nav active="#" onNavigate={onNavigate} />
        </div>

        {/* Centered hero — name pulled up to make room for a side-by-side
            sneak peek of work, all visible without scrolling. */}
        <main style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "var(--space-8)",
          padding: "var(--space-6) 0",
          textAlign: "center",
        }}>
          <div>
            <h1 style={{
              fontFamily: "var(--font-serif-display)",
              fontWeight: 400,
              fontSize: "clamp(64px, 9vw, 168px)",
              lineHeight: 0.95,
              letterSpacing: "-0.035em",
              margin: 0,
              color: "var(--text-primary)",
            }}>
              Daniel Kaliko
            </h1>
            <div style={{
              marginTop: "var(--space-5)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
            }}>
              Engineering Portfolio
            </div>
          </div>

          {/* Disciplines line — the top of the sandwich */}
          <div style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}>
            Mechanical · Robotics
          </div>

          {/* Selected work — three projects side by side, centered */}
          <WorkPreview onNavigate={onNavigate} onOpenProject={onOpenProject} limit={3} />
        </main>

        {/* Location pinned to the foot of the hero */}
        <div style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          padding: "var(--space-6) 0",
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
        }}>
          Las Vegas, Nevada · Updated June 2026
        </div>
      </section>

      {/* ---- About (moved onto the home page) ---- */}
      <section
        ref={aboutRef}
        style={{
          position: "relative",
          paddingTop: "var(--space-12)",
          opacity: aboutInView ? 1 : 0,
          transform: aboutInView ? "none" : "translateY(28px)",
          transition: "var(--transition-reveal)",
        }}
      >
        {/* One quiet fragment, low-left, continuing the topography. */}
        <img
          aria-hidden="true"
          src="/assets/pattern/leopard-print-wide.svg"
          alt=""
          style={{
            position: "absolute",
            top: "30%",
            right: "-40vw",
            width: "min(1900px, 115vw)",
            opacity: 0.08,
            mixBlendMode: "multiply",
            WebkitMaskImage: softMask,
            maskImage: softMask,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div style={{ position: "relative", zIndex: 10 }}>
          <AboutBlock />
        </div>
      </section>

      {/* ---- Skills band ---- */}
      <SkillsMarquee />
    </div>
  );
}
