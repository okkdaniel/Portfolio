import React from "react";
import { Clock } from "./Clock.jsx";
import { decryptEmail } from "../utils/email.js";
import { usePreloadProject } from "../hooks/usePreloadProject.js";
import { useMediaQuery } from "../hooks/useMediaQuery.js";
import { preloadFigure } from "../figures/load.js";

// The previous, professional version of the site (the main branch).
export const PROFESSIONAL_URL = "https://old.danielkaliko.com";

/**
 * Overlay — the only text on the piece. A name and three folds
 * (Works / About / Contact) in the top-left; a reset control and hint in the
 * bottom-left; the clock in the bottom-right. Only one fold is open at a time.
 */
export function Overlay({ open, setOpen, onReset, projects, hovered, onHover }) {
  const isTouch = useMediaQuery("(hover: none)");
  const toggle = (key) => setOpen(open === key ? null : key);
  // Reaching for Works starts fetching the figures' models.
  const warmWorks = React.useCallback(() => {
    for (const p of projects) preloadFigure(p.slug);
  }, [projects]);
  // And so does the home page settling: once it has loaded and the field has
  // had a few seconds to grow, they're fetched in the background, so Works
  // can come up as the field goes, not after.
  React.useEffect(() => {
    let idle = 0;
    const warm = () => { idle = (window.requestIdleCallback || setTimeout)(warmWorks); };
    const t = setTimeout(() => (document.readyState === "complete" ? warm() : window.addEventListener("load", warm, { once: true })), 2500);
    return () => { clearTimeout(t); window.removeEventListener("load", warm); (window.cancelIdleCallback || clearTimeout)(idle); };
  }, [warmWorks]);

  return (
    <div className="overlay">
      <header className="ov-head" data-keepout>
        <div className="ov-top">
          <h1 className="ov-name">Daniel Kaliko</h1>
        </div>

        <Fold id="works" label="Works" open={open === "works"} onToggle={toggle} onIntent={warmWorks}>
          <ol className="works">
            {projects.map((p) => <WorkItem key={p.slug} project={p} hot={hovered === p.slug} onHover={onHover} />)}
          </ol>
        </Fold>

        <Fold id="about" label="About" open={open === "about"} onToggle={toggle}>
          <div className="about">
            <p>Studying engineering at the University of Nevada, Reno.</p>
            <p>Based in Las Vegas, Nevada.</p>
            <p>
              Competed and mentored with{" "}
              <a className="link" href="https://www.instagram.com/sloancanyonrobotics/" target="_blank" rel="noopener noreferrer">Sloan Canyon Robotics</a>.
            </p>
            <p>
              Designed competition robots in CAD for{" "}
              <a className="link" href="https://www.team987.com/" target="_blank" rel="noopener noreferrer">FRC Team 987</a>.
            </p>
            <p>
              Previous portfolio:{" "}
              <a href={PROFESSIONAL_URL} className="link">old.danielkaliko.com&nbsp;→</a>
            </p>
          </div>
        </Fold>

        <Fold id="contact" label="Contact" open={open === "contact"} onToggle={toggle}>
          <ul className="contact">
            <li><span>email</span><EmailAddress /></li>
            <li><span>github</span><a className="link" href="https://github.com/okkdaniel" target="_blank" rel="noopener noreferrer">@okkdaniel</a></li>
            <li><span>linkedin</span><a className="link" href="https://www.linkedin.com/in/daniel-kaliko/" target="_blank" rel="noopener noreferrer">/in/daniel-kaliko</a></li>
            <li><span>résumé</span><a className="link" href="/assets/resume/resume.pdf" target="_blank" rel="noopener noreferrer">pdf ↗</a></li>
          </ul>
        </Fold>
      </header>

      <div className="ov-foot ov-foot--left" data-keepout>
        <button type="button" className="reset" onClick={onReset} aria-label="Clear the paper and start again" title="start again">↻</button>
        <span className="hint">{isTouch ? "(tap to grow)" : "(click to grow)"}</span>
      </div>

      <div className="ov-foot ov-foot--right" data-keepout>
        <Clock />
      </div>
    </div>
  );
}

function Fold({ id, label, open, onToggle, onIntent, children }) {
  return (
    <section className={`fold${open ? " fold--open" : ""}`}>
      <button
        type="button"
        className="fold__head"
        aria-expanded={open}
        aria-controls={`fold-${id}`}
        onClick={() => onToggle(id)}
        onPointerEnter={onIntent}
        onFocus={onIntent}
      >
        <span>{label}</span>
        <span className="fold__icon" aria-hidden="true">+</span>
      </button>
      <div className="fold__panel" id={`fold-${id}`} inert={open ? undefined : ""}>
        <div className="fold__inner">{children}</div>
      </div>
    </section>
  );
}

function WorkItem({ project: p, hot, onHover }) {
  const preload = usePreloadProject(p);
  return (
    <li>
      <a
        href={`#work/${p.slug}`}
        className={hot ? "is-hot" : undefined}
        onMouseEnter={() => { preload(); onHover?.(p.slug); }}
        onMouseLeave={() => onHover?.(null)}
        onFocus={() => { preload(); onHover?.(p.slug); }}
        onBlur={() => onHover?.(null)}
      >
        <span className="works__n">{String(p.index).padStart(2, "0")}</span>
        <span className="works__t">{p.title}</span>
        <span className="works__y">{p.year}</span>
      </a>
    </li>
  );
}

/** The email is stored encrypted (utils/email.js) and only decrypted here. */
function EmailAddress() {
  const [email, setEmail] = React.useState("");
  React.useEffect(() => {
    let alive = true;
    decryptEmail().then((e) => { if (alive) setEmail(e); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return email
    ? <a className="link" href={`mailto:${email}`}>{email}</a>
    : <span className="quiet">…</span>;
}
