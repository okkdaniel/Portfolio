// Work index screen — a scannable list of projects: each row pairs a preview
// plate with a brief so a visitor (or a hiring manager) gets the idea before
// opening anything.
import React from "react";
import { Nav } from "../components/navigation/Nav.jsx";
import { Eyebrow } from "../components/text/Eyebrow.jsx";
import { ProjectRow } from "../components/editorial/ProjectRow.jsx";
import { SAMPLE_PROJECTS } from "../data.js";

export function WorkIndex({ onNavigate, onOpenProject }) {
  const projects = SAMPLE_PROJECTS;
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>

      <div style={{ position: "relative", zIndex: 10 }}>
        <Nav active="work" onNavigate={onNavigate} />

        {/* Eyebrow + section title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "var(--space-9)" }}>
          <Eyebrow as="div">Selected · 2022 — 2024</Eyebrow>
          <Eyebrow as="div" style={{ color: "var(--text-quiet)" }}>
            {String(projects.length).padStart(2, "0")} projects
          </Eyebrow>
        </div>

        <h2 style={{
          fontFamily: "var(--font-serif-display)",
          fontWeight: 400,
          fontSize: "clamp(72px, 9vw, 156px)",
          lineHeight: 1.0,
          letterSpacing: "-0.035em",
          margin: "var(--space-5) 0 var(--space-7)",
        }}>
          Projects
        </h2>

        {/* A line of context so the list reads with intent, not just as a grid */}
        <p style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--fs-body-l)",
          lineHeight: "var(--lh-body)",
          color: "var(--text-secondary)",
          maxWidth: "54ch",
          margin: "0 0 var(--space-11)",
        }}>
          A collection of projects I've designed and built from start to finish.
        </p>

        {/* Project list — preview + brief per row */}
        <div>
          {projects.map((p, i) => (
            <ProjectRow
              key={p.slug}
              project={p}
              rule={i === 0 ? "strong" : "soft"}
              onOpen={onOpenProject}
            />
          ))}
          <div style={{ borderTop: "var(--hairline-soft)" }}></div>
        </div>
      </div>
    </div>
  );
}
