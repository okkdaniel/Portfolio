import React from "react";
import { PlateImage } from "../media/PlateImage.jsx";
import { useIsMobile } from "../../hooks/useMediaQuery.js";
import { usePreloadProject } from "../../hooks/usePreloadProject.js";

/**
 * ProjectRow — a single project on the index, sized to be scanned: a preview
 * plate on the left, a brief on the right (number, discipline · year, title,
 * one-line summary, and an open cue). The whole row is the link; hover dims it
 * to the brand's 0.55. On mobile the plate stacks above the brief.
 */
export function ProjectRow({ project, onOpen, rule = "soft" }) {
  const [hover, setHover] = React.useState(false);
  const isMobile = useIsMobile();
  const preload = usePreloadProject(project);
  const p = project;

  return (
    <a
      href={`#work/${p.slug}`}
      onClick={(e) => { e.preventDefault(); onOpen(p.slug); }}
      onMouseEnter={() => { setHover(true); preload(); }}
      onMouseLeave={() => setHover(false)}
      onFocus={preload}
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.05fr) minmax(0, 1fr)",
        gap: isMobile ? "var(--space-5)" : "var(--space-9)",
        alignItems: "center",
        padding: "var(--space-9) 0",
        borderTop: rule === "strong" ? "var(--hairline)" : "var(--hairline-soft)",
        color: "var(--text-primary)",
        textDecoration: "none",
        borderBottom: 0,
        transition: "opacity var(--dur-quick) var(--ease-out-quiet)",
        opacity: hover ? 0.55 : 1,
      }}
    >
      <PlateImage
        src={p.preview || p.hero}
        alt={`${p.title} — preview`}
        ratio="16 / 10"
        fit="contain"
      />

      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "var(--space-4)",
      }}>
        <div style={{
          display: "flex",
          gap: "var(--space-5)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--fs-meta)",
          letterSpacing: "var(--tracking-meta-wide)",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
          fontVariantNumeric: "tabular-nums",
        }}>
          <span>{String(p.index).padStart(2, "0")}</span>
          <span>{p.discipline} · {p.year}</span>
        </div>

        <span style={{
          fontFamily: "var(--font-serif-display)",
          fontSize: "clamp(34px, 4vw, 64px)",
          lineHeight: 1.02,
          letterSpacing: "-0.025em",
        }}>
          {p.title}
        </span>

        <p style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--fs-body)",
          lineHeight: "var(--lh-body)",
          color: "var(--text-secondary)",
          margin: 0,
          maxWidth: "46ch",
        }}>
          {p.lede}
        </p>

        <span style={{
          marginTop: "var(--space-2)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--fs-meta)",
          letterSpacing: "var(--tracking-meta-wide)",
          textTransform: "uppercase",
          color: "var(--text-primary)",
        }}>
          View project <span aria-hidden="true" style={{ marginLeft: "0.4em" }}>→</span>
        </span>
      </div>
    </a>
  );
}
