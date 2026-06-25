import React from "react";
import { Eyebrow } from "../text/Eyebrow.jsx";
import { SKILLS } from "../../data.js";
import { useInView } from "../../hooks/useInView.js";
import "./skills.css";

/**
 * SkillsMarquee — a slow horizontal band of tool logos that drifts across the
 * page and fades at the edges. The whole section fades and lifts in as it
 * enters the viewport, and back out as it leaves. Logos are placeholders;
 * swap the files under /public/assets/skills/ for the real marks.
 */
export function SkillsMarquee({ items = SKILLS }) {
  const [ref, inView] = useInView({ threshold: 0.25 });
  // Duplicate the list so the -50% drift loops seamlessly.
  const loop = [...items, ...items];

  return (
    <section
      ref={ref}
      aria-label="Skills and tools"
      style={{
        padding: "var(--space-12) 0 var(--space-13)",
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : "translateY(28px)",
        transition: "var(--transition-reveal)",
      }}
    >
      <div style={{ marginBottom: "var(--space-9)" }}>
        <Eyebrow as="div">Tools · Skills</Eyebrow>
      </div>

      <div className="skills-viewport">
        <div className="skills-track">
          {loop.map((s, i) => (
            <div
              className="skill-item"
              key={`${s.slug}-${i}`}
              aria-hidden={i >= items.length ? "true" : undefined}
            >
              <img src={s.logo} alt={`${s.name} logo`} />
              <span className="skill-label">{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
