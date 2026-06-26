// Project detail — the editorial spread: oversized hero, side metadata
// column, body paragraphs, "next project" close.
import React from "react";
import { Nav } from "../components/navigation/Nav.jsx";
import { ProjectTitle } from "../components/text/ProjectTitle.jsx";
import { MetaList } from "../components/text/MetaList.jsx";
import { Eyebrow } from "../components/text/Eyebrow.jsx";
import { EditorialLink } from "../components/text/EditorialLink.jsx";
import { PlateImage } from "../components/media/PlateImage.jsx";
import { useIsMobile } from "../hooks/useMediaQuery.js";
import { SAMPLE_PROJECTS } from "../data.js";

export function ProjectDetail({ slug, onNavigate, onOpenProject }) {
  const projects = SAMPLE_PROJECTS;
  const p = projects.find((x) => x.slug === slug) || projects[0];
  const next = projects.find((x) => x.index === p.index + 1) || projects[0];
  const isMobile = useIsMobile();

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Low-left wide panel — appears below the hero image. Soft mask
          fades all edges so it never ends abruptly. Continues the
          topographic graphic from Work's mid-right panel. */}
      <img
        aria-hidden="true"
        src="/assets/pattern/leopard-print-wide.svg"
        alt=""
        style={{
          position: "absolute",
          top: "95vh",
          left: "-42vw",
          width: "min(2000px, 120vw)",
          opacity: 0.10,
          mixBlendMode: "multiply",
          WebkitMaskImage: "radial-gradient(ellipse at center, #363636 28%, transparent 78%)",
          maskImage: "radial-gradient(ellipse at center, #363636 28%, transparent 78%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 10 }}>
        <Nav active="work" onNavigate={onNavigate} />

        {/* Title block — left-aligned, no centering */}
        <div style={{ margin: "var(--space-12) 0 var(--space-9)" }}>
          <ProjectTitle
            size="l"
            eyebrow={`${p.discipline} · ${p.year} · ${String(p.index).padStart(2, "0")}`}
            lede={p.lede}
          >
            {p.title}
          </ProjectTitle>
        </div>

        {/* Hero plate — full bleed */}
        {p.hero && (
          <PlateImage
            src={p.hero}
            alt={`${p.title}, CAD render`}
            bleed="full"
            caption={`Fig 01 · ${p.title} · CAD render, three-quarter view`}
            style={{ marginBottom: "var(--space-12)" }}
          />
        )}

        {/* Body grid — metadata column + writeup column */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(220px, 1fr) minmax(0, 2.4fr)",
          gap: "var(--space-9)",
          marginBottom: "var(--space-13)",
        }}>
          <aside>
            <Eyebrow as="div" style={{ marginBottom: "var(--space-5)" }}>Project details</Eyebrow>
            <MetaList items={p.meta || []} />
          </aside>
          <div>
            <Eyebrow as="div" style={{ marginBottom: "var(--space-5)" }}>Notes</Eyebrow>
            <div style={{ maxWidth: "60ch" }}>
              {(p.body || [p.lede]).map((para, i) => (
                <p key={i} style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--fs-body)",
                  lineHeight: "var(--lh-body)",
                  color: "var(--text-primary)",
                  marginTop: i === 0 ? 0 : "var(--space-5)",
                }}>{para}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Next project close */}
        <div style={{
          borderTop: "var(--hairline)",
          padding: "var(--space-9) 0 var(--space-12)",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "auto 1fr auto",
          alignItems: "baseline",
          columnGap: "var(--space-7)",
          rowGap: isMobile ? "var(--space-5)" : 0,
        }}>
          <Eyebrow as="div">Next · {String(next.index).padStart(2, "0")}</Eyebrow>
          <a
            href={`#work/${next.slug}`}
            onClick={(e) => { e.preventDefault(); onOpenProject(next.slug); window.scrollTo(0, 0); }}
            style={{
              fontFamily: "var(--font-serif-display)",
              fontSize: "clamp(40px, 5.4vw, 84px)",
              lineHeight: 1,
              letterSpacing: "-0.025em",
              color: "var(--text-primary)",
              textDecoration: "none",
              borderBottom: 0,
              justifySelf: "start",
            }}
          >
            {next.title}
          </a>
          <EditorialLink
            href={`#work/${next.slug}`}
            arrow
            onClick={(e) => { e.preventDefault(); onOpenProject(next.slug); window.scrollTo(0, 0); }}
            style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase" }}
          >
            Open
          </EditorialLink>
        </div>
      </div>
    </div>
  );
}
