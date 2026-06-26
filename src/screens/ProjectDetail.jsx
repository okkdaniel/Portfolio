// Project detail — an engineering case study. Hero render, then the story of
// the build: overview, goals, process, challenges, highlights, outcome, and a
// tech-stack table. Each section renders only when the project supplies it.
import React from "react";
import { Nav } from "../components/navigation/Nav.jsx";
import { ProjectTitle } from "../components/text/ProjectTitle.jsx";
import { MetaList } from "../components/text/MetaList.jsx";
import { Eyebrow } from "../components/text/Eyebrow.jsx";
import { EditorialLink } from "../components/text/EditorialLink.jsx";
import { PlateImage } from "../components/media/PlateImage.jsx";
import { useIsMobile } from "../hooks/useMediaQuery.js";
import { SAMPLE_PROJECTS } from "../data.js";

// A run of paragraphs in the standard body voice.
function Prose({ items, maxWidth = "64ch", style }) {
  return (
    <div style={{ maxWidth, ...style }}>
      {items.map((para, i) => (
        <p key={i} style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--fs-body)",
          lineHeight: "var(--lh-body)",
          color: "var(--text-primary)",
          marginTop: i === 0 ? 0 : "var(--space-5)",
        }}>{para}</p>
      ))}
    </div>
  );
}

// A major section: an eyebrow kicker over its content, with generous air above.
function Section({ label, children }) {
  return (
    <section style={{ marginTop: "var(--space-13)" }}>
      <Eyebrow as="h2" style={{ marginBottom: "var(--space-7)" }}>{label}</Eyebrow>
      {children}
    </section>
  );
}

// A serif sub-heading used inside the process and challenge sections.
function SubHeading({ children, style }) {
  return (
    <h3 style={{
      fontFamily: "var(--font-serif-display)",
      fontWeight: "var(--fw-display)",
      fontSize: "var(--fs-display-s)",
      lineHeight: "var(--lh-heading)",
      letterSpacing: "var(--tracking-display-tight)",
      color: "var(--text-heading)",
      margin: 0,
      ...style,
    }}>
      {children}
    </h3>
  );
}

export function ProjectDetail({ slug, onNavigate, onOpenProject }) {
  const projects = SAMPLE_PROJECTS;
  const p = projects.find((x) => x.slug === slug) || projects[0];
  const next = projects.find((x) => x.index === p.index + 1) || projects[0];
  const isMobile = useIsMobile();

  const twoCol = isMobile ? "1fr" : "minmax(220px, 1fr) minmax(0, 2.4fr)";

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Low-left wide panel — continues the topographic graphic. */}
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

        {/* ---- Hero ---- */}
        <div style={{ margin: "var(--space-12) 0 var(--space-7)" }}>
          <ProjectTitle
            size="l"
            eyebrow={`${p.discipline} · ${p.date || p.year}`}
            lede={p.summary || p.lede}
          >
            {p.title}
          </ProjectTitle>
        </div>

        {/* Tags */}
        {p.tags && p.tags.length > 0 && (
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-3) var(--space-5)",
            marginBottom: "var(--space-9)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--fs-meta)",
            letterSpacing: "var(--tracking-meta-wide)",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}>
            {p.tags.map((t) => (
              <span key={t} style={{ borderTop: "var(--hairline)", paddingTop: "var(--space-2)" }}>{t}</span>
            ))}
          </div>
        )}

        {/* Hero plate — the regular render. Slightly larger than the
            wireframe; sized to stay fully in view. */}
        {p.hero && (
          <PlateImage
            src={p.hero}
            alt={`${p.title} — render`}
            maxHeight="76vh"
            caption={`Fig 01 · ${p.title}`}
            style={{ marginBottom: "var(--space-9)" }}
          />
        )}

        {/* ---- Overview ---- */}
        {(p.overview || p.facts) && (
          <Section label="Overview">
            <div style={{
              display: "grid",
              gridTemplateColumns: twoCol,
              gap: "var(--space-9)",
            }}>
              <aside>
                {p.facts && <MetaList items={p.facts} />}
              </aside>
              <div>
                {p.overview && <Prose items={p.overview} />}
              </div>
            </div>
          </Section>
        )}

        {/* ---- Design Goals + Engineering Process — the text runs continuously
            down the left column while the wireframe sits to the right and
            follows along as you read, so there's no gap in the writeup ---- */}
        {((p.goals && p.goals.length) || (p.process && p.process.length)) && (
          <section style={{ marginTop: "var(--space-13)" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile || !p.preview ? "1fr" : "minmax(0, 1.4fr) minmax(0, 1fr)",
              gap: "var(--space-9)",
              alignItems: "start",
            }}>
              {/* Left — continuous text: goals then the process writeup */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
                {p.goals && p.goals.length > 0 && (
                  <div>
                    <Eyebrow as="h2" style={{ marginBottom: "var(--space-7)" }}>Design Goals</Eyebrow>
                    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                      {p.goals.map((g, i) => (
                        <li key={i} style={{
                          borderTop: i === 0 ? "var(--hairline)" : "var(--hairline-soft)",
                          padding: "var(--space-4) 0",
                          display: "grid",
                          gridTemplateColumns: "auto 1fr",
                          columnGap: "var(--space-6)",
                          alignItems: "baseline",
                          fontFamily: "var(--font-sans)",
                          fontSize: "var(--fs-body)",
                          lineHeight: "var(--lh-body)",
                          color: "var(--text-primary)",
                        }}>
                          <span style={{
                            fontSize: "var(--fs-meta)",
                            letterSpacing: "var(--tracking-meta-wide)",
                            color: "var(--text-quiet)",
                            fontVariantNumeric: "tabular-nums",
                          }}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* On mobile the wireframe sits right after the goals */}
                {isMobile && p.preview && (
                  <PlateImage src={p.preview} alt={`${p.title} — wireframe`} caption="Wireframe view" />
                )}

                {p.process && p.process.length > 0 && (
                  <div>
                    <Eyebrow as="h2" style={{ marginBottom: "var(--space-7)" }}>Engineering Process</Eyebrow>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-11)" }}>
                      {p.process.map((step, i) => (
                        <div key={i}>
                          <SubHeading style={{ marginBottom: "var(--space-5)" }}>{step.heading}</SubHeading>
                          {step.body && <Prose items={step.body} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right — wireframe, follows along on desktop */}
              {!isMobile && p.preview && (
                <div style={{ position: "sticky", top: "var(--space-9)" }}>
                  <PlateImage src={p.preview} alt={`${p.title} — wireframe`} caption="Wireframe view" />
                </div>
              )}
            </div>
          </section>
        )}

        {/* ---- Extra named sections (e.g. Competition) ---- */}
        {p.extraSections && p.extraSections.map((s, i) => (
          <Section key={i} label={s.label}>
            <Prose items={s.body} />
          </Section>
        ))}

        {/* ---- Technical Highlights — responsive grid, no cards ---- */}
        {p.highlights && p.highlights.length > 0 && (
          <Section label="Technical Highlights">
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "var(--space-6) var(--space-7)",
            }}>
              {p.highlights.map((h, i) => (
                <div key={i} style={{
                  borderTop: "var(--hairline)",
                  paddingTop: "var(--space-4)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--fs-body-s)",
                  fontWeight: "var(--fw-body-md)",
                  letterSpacing: "var(--tracking-meta)",
                  color: "var(--text-primary)",
                }}>
                  {h}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ---- Engineering Challenges, with the Outcome and Tech Stack held to
            the right so the wrap-up reads together without a long scroll ---- */}
        {((p.challenges && p.challenges.length) || (p.outcome && p.outcome.length) || (p.techStack && p.techStack.length)) && (
          <section style={{ marginTop: "var(--space-13)" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.2fr) minmax(0, 1fr)",
              gap: "var(--space-11) var(--space-12)",
              alignItems: "start",
            }}>
              {/* Left — the engineering challenges */}
              {p.challenges && p.challenges.length > 0 && (
                <div>
                  <Eyebrow as="h2" style={{ marginBottom: "var(--space-7)" }}>Engineering Challenges</Eyebrow>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-9)" }}>
                    {p.challenges.map((c, i) => (
                      <div key={i}>
                        <h3 style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: "var(--fs-body-l)",
                          fontWeight: "var(--fw-body-bold)",
                          lineHeight: "var(--lh-heading)",
                          color: "var(--text-primary)",
                          margin: "0 0 var(--space-3)",
                        }}>
                          {c.title}
                        </h3>
                        <p style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: "var(--fs-body)",
                          lineHeight: "var(--lh-body)",
                          color: "var(--text-secondary)",
                          margin: 0,
                        }}>
                          {c.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Right — outcome and tech stack, kept beside the challenges */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-11)" }}>
                {p.outcome && p.outcome.length > 0 && (
                  <div>
                    <Eyebrow as="h2" style={{ marginBottom: "var(--space-7)" }}>Outcome</Eyebrow>
                    <Prose items={p.outcome} maxWidth="100%" />
                  </div>
                )}
                {p.techStack && p.techStack.length > 0 && (
                  <div>
                    <Eyebrow as="h2" style={{ marginBottom: "var(--space-7)" }}>Tech Stack</Eyebrow>
                    <div>
                      {p.techStack.map((row, i) => (
                        <div key={i} style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(110px, 0.6fr) 1fr",
                          columnGap: "var(--space-6)",
                          padding: "var(--space-4) 0",
                          borderTop: i === 0 ? "var(--hairline)" : "var(--hairline-soft)",
                        }}>
                          <span style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: "var(--fs-meta)",
                            letterSpacing: "var(--tracking-meta-wide)",
                            textTransform: "uppercase",
                            color: "var(--text-secondary)",
                          }}>
                            {row.label}
                          </span>
                          <span style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: "var(--fs-body-s)",
                            lineHeight: "var(--lh-body)",
                            color: "var(--text-primary)",
                          }}>
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ---- Gallery ---- */}
        {p.gallery && p.gallery.length > 0 && (
          <Section label="Gallery">
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-9)" }}>
              {p.gallery.map((g, i) => (
                <PlateImage key={i} src={g.src} alt={g.caption || `${p.title} ${i + 1}`} caption={g.caption} />
              ))}
            </div>
          </Section>
        )}

        {/* ---- Next project close ---- */}
        <div style={{
          marginTop: "var(--space-13)",
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
              fontSize: "clamp(32px, 5.4vw, 84px)",
              lineHeight: 1.04,
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
