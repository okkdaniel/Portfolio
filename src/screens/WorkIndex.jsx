// Work index screen — vertical list of projects, hairline-separated rows.
import React from "react";
import { Nav } from "../components/navigation/Nav.jsx";
import { Eyebrow } from "../components/text/Eyebrow.jsx";
import { ProjectIndexItem } from "../components/editorial/ProjectIndexItem.jsx";
import { SAMPLE_PROJECTS } from "../data.js";

const softMask = "radial-gradient(ellipse at center, #000 28%, transparent 78%)";

export function WorkIndex({ onNavigate, onOpenProject }) {
  const projects = SAMPLE_PROJECTS;
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Mid-right panel — sits to the right of the index rows, fades out
          on all edges. Continues the topography from Landing's bottom-left. */}
      <img
        aria-hidden="true"
        src="/assets/pattern/leopard-print.svg"
        alt=""
        style={{
          position: "absolute",
          top: "30vh",
          right: "-40vw",
          width: "min(1700px, 110vw)",
          opacity: 0.10,
          mixBlendMode: "multiply",
          WebkitMaskImage: softMask,
          maskImage: softMask,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 10 }}>
        <Nav active="work" onNavigate={onNavigate} />

        {/* Eyebrow + section title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "var(--space-9)" }}>
          <Eyebrow as="div">Selected · 2022 — 2024</Eyebrow>
          <Eyebrow as="div" style={{ color: "var(--text-quiet)" }}>05 projects</Eyebrow>
        </div>

        <h2 style={{
          fontFamily: "var(--font-serif-display)",
          fontWeight: 400,
          fontSize: "clamp(72px, 9vw, 156px)",
          lineHeight: 1.0,
          letterSpacing: "-0.035em",
          margin: "var(--space-5) 0 var(--space-12)",
        }}>
          Work
        </h2>

        {/* Project list */}
        <div>
          {projects.map((p, i) => (
            <ProjectIndexItem
              key={p.slug}
              index={p.index}
              rule={i === 0 ? "strong" : "soft"}
              discipline={p.discipline}
              year={p.year}
              title={p.title}
              href={`#work/${p.slug}`}
              onClick={(e) => { e.preventDefault(); onOpenProject(p.slug); }}
            />
          ))}
          <div style={{ borderTop: "1px solid var(--paper-300)" }}></div>
        </div>
      </div>
    </div>
  );
}
