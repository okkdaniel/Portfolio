import React from "react";
import { EditorialLink } from "../text/EditorialLink.jsx";
import { PlateImage } from "../media/PlateImage.jsx";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { usePreloadProject } from "../../hooks/usePreloadProject.js";
import { SAMPLE_PROJECTS } from "../../data.js";

/**
 * WorkPeekItem — one project column in the home-page sneak peek: a preview
 * plate over a number, title, one-line brief, and discipline · year. No
 * container (grouped by a hairline rule + alignment, per the brand). Hover
 * dims to the brand's 0.55.
 */
function WorkPeekItem({ project, onOpenProject }) {
  const [hover, setHover] = React.useState(false);
  const preload = usePreloadProject(project);
  const p = project;

  return (
    <a
      href={`#work/${p.slug}`}
      onClick={(e) => { e.preventDefault(); onOpenProject(p.slug); }}
      onMouseEnter={() => { setHover(true); preload(); }}
      onMouseLeave={() => setHover(false)}
      onFocus={preload}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        textAlign: "center",
        alignItems: "center",
        borderTop: "var(--hairline)",
        paddingTop: "var(--space-5)",
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
        style={{ width: "100%", marginBottom: "var(--space-2)" }}
      />

      <span style={{
        fontFamily: "var(--font-sans)",
        fontSize: "var(--fs-meta)",
        letterSpacing: "var(--tracking-meta-wide)",
        textTransform: "uppercase",
        color: "var(--text-secondary)",
        fontVariantNumeric: "tabular-nums",
      }}>
        {String(p.index).padStart(2, "0")}
      </span>

      <span style={{
        fontFamily: "var(--font-serif-display)",
        fontSize: "clamp(26px, 2.6vw, 44px)",
        lineHeight: 1.05,
        letterSpacing: "-0.025em",
      }}>
        {p.title}
      </span>

      <p style={{
        fontFamily: "var(--font-sans)",
        fontSize: "var(--fs-body-s)",
        lineHeight: "var(--lh-body)",
        color: "var(--text-secondary)",
        margin: 0,
        maxWidth: "32ch",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        {p.lede}
      </p>

      <span style={{
        marginTop: "var(--space-2)",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--fs-meta)",
        letterSpacing: "var(--tracking-meta-wide)",
        textTransform: "uppercase",
        color: "var(--text-quiet)",
        fontVariantNumeric: "tabular-nums",
      }}>
        {p.discipline} · {p.year}
      </span>
    </a>
  );
}

/**
 * WorkPreview — a home-page sneak peek of a few projects, laid out side by
 * side and centered. Each column opens its project; the link below goes to
 * the full Work index.
 */
export function WorkPreview({ onNavigate, onOpenProject, limit = 3, showHeading = true }) {
  const projects = SAMPLE_PROJECTS.slice(0, limit);

  // Three text columns squish on tablets well before phone width — step down
  // 3 → 2 → 1 columns. Desktop (>1024px) keeps the original layout.
  const narrow = useMediaQuery("(max-width: 1024px)");
  const stack = useMediaQuery("(max-width: 600px)");
  const cols = stack
    ? "1fr"
    : narrow
      ? "repeat(2, minmax(0, 1fr))"
      : `repeat(${projects.length}, minmax(0, 1fr))`;

  return (
    <div style={{ width: "100%" }}>
      {/* Clear, prominent label so the three columns read as projects. The
          home page hides this and supplies its own "Explore my projects" cue
          at the foot of the hero instead. */}
      {showHeading && (
        <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
          <div style={{
            fontFamily: "var(--font-serif-display)",
            fontSize: "clamp(20px, 2.2vw, 28px)",
            fontWeight: "var(--fw-body-bold)",
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
          }}>
            Explore my projects
          </div>
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: cols,
        gap: "var(--space-7)",
        maxWidth: 1080,
        margin: "0 auto",
        textAlign: "left",
      }}>
        {projects.map((p) => (
          <WorkPeekItem key={p.slug} project={p} onOpenProject={onOpenProject} />
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: "var(--space-6)" }}>
        <EditorialLink
          href="#work"
          arrow
          onClick={(e) => { e.preventDefault(); onNavigate("#work"); }}
          style={{
            fontSize: "var(--fs-body-s)",
            letterSpacing: "var(--tracking-meta-wide)",
            textTransform: "uppercase",
          }}
        >
          View all projects
        </EditorialLink>
      </div>
    </div>
  );
}
