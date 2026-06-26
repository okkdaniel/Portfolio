// Landing screen — name centered in the first viewport, then a quick scroll
// reveals who I am (About) and a drifting band of tools (Skills). Two tall
// contour bands hug the page edges, running its full vertical length.
import React from "react";
import { Nav } from "../components/navigation/Nav.jsx";
import { AboutBlock } from "../components/about/AboutBlock.jsx";
import { WorkPreview } from "../components/editorial/WorkPreview.jsx";
import { SkillsMarquee } from "../components/skills/SkillsMarquee.jsx";
import { useInView } from "../hooks/useInView.js";

// Linear masks fade each tall edge band inward, so the contour stays dense at
// the very edge of the page and dissolves toward the content — no hard cut.
const edgeMaskLeft = "linear-gradient(to right, #000 0%, #000 26%, transparent 92%)";
const edgeMaskRight = "linear-gradient(to left, #000 0%, #000 26%, transparent 92%)";
// A second mask layer fades the band out toward its foot, so it dissolves
// before the Skills marquee instead of cutting off. Composited with the edge
// fade via intersect, both fades apply at once.
const bottomFade = "linear-gradient(to bottom, #000 0%, #000 78%, transparent 100%)";

export function Landing({ onNavigate, onOpenProject }) {
  const [aboutRef, aboutInView] = useInView({ threshold: 0.18 });
  const projectsRef = React.useRef(null);

  const scrollToProjects = () => {
    projectsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToAbout = () => {
    // Scroll to the foot of the page so the About section *and* the full
    // Skills marquee below it come into view together.
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Everything above the Skills band shares this relative wrapper, so the
          edge contours span only this region and end before the marquee. */}
      <div style={{ position: "relative" }}>
      {/* ---- Edge contours — one tall topographic band per side, running the
          full vertical length of the content above the Skills band. Bled
          mostly off-screen and masked so only a subtle sliver hugs each edge. ---- */}
      <img
        aria-hidden="true"
        src="/assets/pattern/contour-tall.svg"
        alt=""
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: "min(1092px, 78vw)",
          height: "100%",
          objectFit: "cover",
          objectPosition: "left center",
          transform: "translateX(-50%)",
          opacity: 0.06,
          mixBlendMode: "multiply",
          WebkitMaskImage: `${edgeMaskLeft}, ${bottomFade}`,
          maskImage: `${edgeMaskLeft}, ${bottomFade}`,
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <img
        aria-hidden="true"
        src="/assets/pattern/contour-tall.svg"
        alt=""
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: "min(1092px, 78vw)",
          height: "100%",
          objectFit: "cover",
          objectPosition: "right center",
          transform: "translateX(50%)",
          opacity: 0.06,
          mixBlendMode: "multiply",
          WebkitMaskImage: `${edgeMaskRight}, ${bottomFade}`,
          maskImage: `${edgeMaskRight}, ${bottomFade}`,
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ---- Hero ---- */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Anura mark as a large, quiet background graphic — sits behind the
            title (above the contour panels, below the text). */}
        <img
          aria-hidden="true"
          src="/assets/brand/anura.svg"
          alt=""
          style={{
            position: "absolute",
            top: "47%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(720px, 64vw)",
            opacity: 0.06,
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        <div style={{ position: "relative", zIndex: 10 }}>
          <Nav active="#" onNavigate={onNavigate} showLogo={false} />
        </div>

        {/* Hero — just the name, centered in the first viewport. The work
            sneak peek now lives below the fold; the cue at the foot invites
            the scroll down to it. */}
        <main style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}>
          {/* Name occupies the centre of the screen */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}>
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

            {/* Social links — subtle, sized to sit within the text above. */}
            <div style={{
              marginTop: "var(--space-5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "var(--space-5)",
            }}>
              {[
                { href: "https://www.instagram.com/ddanyuhl/", src: "/assets/links/instagram.png", label: "Instagram" },
                { href: "https://github.com/okkdaniel", src: "/assets/links/github.png", label: "GitHub" },
                { href: "https://www.linkedin.com/in/daniel-kaliko/", src: "/assets/links/linkedin.png", label: "LinkedIn" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  style={{
                    border: 0,
                    display: "inline-flex",
                    opacity: 0.7,
                    transition: "var(--transition-hover)",
                  }}
                >
                  <img
                    src={s.src}
                    alt={s.label}
                    width={28}
                    height={28}
                    style={{ width: 28, height: 28, objectFit: "contain", objectPosition: "center" }}
                  />
                </a>
              ))}
            </div>
          </div>

          {/* Scroll cue pinned to the foot of the first viewport. Click it —
              or just scroll — to reach the sneak peek of projects below. */}
          <button
            type="button"
            onClick={scrollToProjects}
            aria-label="Explore my projects — scroll to the work below"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-6) 0",
            }}
          >
            <span style={{
              fontFamily: "var(--font-serif-display)",
              fontSize: "clamp(20px, 2.2vw, 28px)",
              fontWeight: "var(--fw-body-bold)",
              letterSpacing: "-0.01em",
              color: "var(--text-primary)",
            }}>
              Explore my projects
            </span>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{
                color: "var(--text-secondary)",
                animation: "scroll-hint-drift var(--dur-drift) var(--ease-in-out-quiet) infinite",
              }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </main>
      </section>

      {/* ---- Work sneak peek — a full viewport like the hero, so its "Learn
          about me" cue lands in the same spot the hero's cue did. ---- */}
      <section
        ref={projectsRef}
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          paddingTop: "var(--space-10)",
        }}
      >
        <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Content sits at the top; the cue is pushed to the foot of the
              viewport, mirroring the hero layout. */}
          <div style={{ flex: 1 }}>
            <WorkPreview
              onNavigate={onNavigate}
              onOpenProject={onOpenProject}
              limit={3}
              showHeading={false}
            />

            {/* Location, carried down beneath the work */}
            <div style={{
              textAlign: "center",
              padding: "var(--space-8) 0 var(--space-6)",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
            }}>
              Las Vegas, Nevada · Updated June 2026
            </div>
          </div>

          {/* Cue down to the About section — mirrors the hero's "Explore my
              projects" indicator, pinned to the bottom of the viewport. */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={scrollToAbout}
              aria-label="Learn about me — scroll to the about section below"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-6) 0",
              }}
            >
              <span style={{
                fontFamily: "var(--font-serif-display)",
                fontSize: "clamp(20px, 2.2vw, 28px)",
                fontWeight: "var(--fw-body-bold)",
                letterSpacing: "-0.01em",
                color: "var(--text-primary)",
              }}>
                Learn about me
              </span>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{
                  color: "var(--text-secondary)",
                  animation: "scroll-hint-drift var(--dur-drift) var(--ease-in-out-quiet) infinite",
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ---- About (moved onto the home page) ---- */}
      <section
        ref={aboutRef}
        style={{
          position: "relative",
          paddingTop: "var(--space-12)",
          scrollMarginTop: "var(--space-6)",
          opacity: aboutInView ? 1 : 0,
          transform: aboutInView ? "none" : "translateY(28px)",
          transition: "var(--transition-reveal)",
        }}
      >
        <div style={{ position: "relative", zIndex: 10 }}>
          <AboutBlock />
        </div>
      </section>
      </div>{/* end contour wrapper — marquee sits below, clear of the contour */}

      {/* ---- Skills band ---- */}
      <SkillsMarquee />
    </div>
  );
}
