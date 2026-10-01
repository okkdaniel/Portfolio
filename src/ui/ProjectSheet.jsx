import React from "react";
import { ModelPlate } from "../components/media/ModelPlate.jsx";
import { ImageLightbox } from "../components/media/ImageLightbox.jsx";

/**
 * ProjectSheet — one project, on a sheet of paper that slides over the (still
 * growing) board. Short by default: title, one line, the object itself (3D
 * model or wireframe drawing), the render, a few facts. The whole
 * case study is folded under "full notes".
 *
 * Closes with the close control, a click outside, or Escape.
 */
export function ProjectSheet({ project: p, next, onClose }) {
  const [notes, setNotes] = React.useState(false);
  const [zoom, setZoom] = React.useState(null);
  const closeRef = React.useRef(null);
  const sheetRef = React.useRef(null);

  React.useEffect(() => {
    setNotes(false);
    sheetRef.current?.scrollTo(0, 0);
    closeRef.current?.focus({ preventScroll: true });
  }, [p.slug]);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !zoom) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, zoom]);

  const n = String(p.index).padStart(2, "0");

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <article ref={sheetRef} className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="sheet__bar">
          <span className="sheet__meta">{n} · {p.discipline} · {p.year}</span>
          <button ref={closeRef} type="button" className="sheet__close" onClick={onClose}>close [×]</button>
        </div>

        <h2 id="sheet-title" className="sheet__title">{p.title}</h2>
        <p className="sheet__lede">{p.lede}</p>

        <div className="sheet__object">
          {p.model ? (
            <ModelPlate
              src={p.model}
              poster={p.preview}
              alt={`${p.title}, interactive 3D model`}
              orientation={p.modelOrientation}
              zoom={p.modelZoom}
              lift={p.modelLift}
              caption="drag to turn it over"
            />
          ) : p.preview ? (
            <button type="button" className="drawing" onClick={() => setZoom(p.preview)} aria-label="Enlarge the wireframe drawing">
              <img src={p.preview} alt={`${p.title}, wireframe drawing`} />
            </button>
          ) : null}
        </div>

        {p.hero && (
          <button type="button" className="render" onClick={() => setZoom(p.hero)} aria-label="Enlarge the render">
            <img src={p.hero} alt={`${p.title}, render`} loading="lazy" />
          </button>
        )}

        {p.facts && (
          <dl className="sheet__facts">
            {p.facts.map((f) => (
              <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>
            ))}
          </dl>
        )}

        <button type="button" className="sheet__notes-toggle" aria-expanded={notes} onClick={() => setNotes(!notes)}>
          full notes <span aria-hidden="true">{notes ? "(−)" : "(+)"}</span>
        </button>

        {notes && <Notes p={p} />}

        {next && (
          <a className="sheet__next" href={`#work/${next.slug}`}>
            <span>next</span> {next.title} →
          </a>
        )}
      </article>

      {zoom && <ImageLightbox src={zoom} alt={p.title} onClose={() => setZoom(null)} />}
    </>
  );
}

function Notes({ p }) {
  return (
    <div className="notes">
      {p.summary && <p className="notes__summary">{p.summary}</p>}

      {p.overview && <Block label="Overview">{p.overview.map((t, i) => <p key={i}>{t}</p>)}</Block>}

      {p.goals && (
        <Block label="Goals">
          <ul>{p.goals.map((g) => <li key={g}>{g}</li>)}</ul>
        </Block>
      )}

      {p.process?.map((s) => (
        <Block key={s.heading} label={s.heading}>{s.body.map((t, i) => <p key={i}>{t}</p>)}</Block>
      ))}

      {p.extraSections?.map((s) => (
        <Block key={s.label} label={s.label}>{s.body.map((t, i) => <p key={i}>{t}</p>)}</Block>
      ))}

      {p.challenges && (
        <Block label="Challenges">
          {p.challenges.map((c) => (
            <div key={c.title} className="notes__challenge">
              <h4>{c.title}</h4>
              <p>{c.body}</p>
            </div>
          ))}
        </Block>
      )}

      {p.outcome && <Block label="Outcome">{p.outcome.map((t, i) => <p key={i}>{t}</p>)}</Block>}

      {p.techStack && (
        <Block label="Stack">
          <dl className="sheet__facts sheet__facts--tight">
            {p.techStack.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
          </dl>
        </Block>
      )}

      {p.links && (
        <Block label="Elsewhere">
          {p.links.map((l) => (
            <p key={l.href}><a className="link" href={l.href} target="_blank" rel="noopener noreferrer">{l.label} ↗</a></p>
          ))}
        </Block>
      )}

      {p.model && p.preview && (
        <div className="drawing drawing--still" aria-hidden="true">
          <img src={p.preview} alt="" loading="lazy" />
        </div>
      )}
    </div>
  );
}

function Block({ label, children }) {
  return (
    <section className="notes__block">
      <h3>{label}</h3>
      {children}
    </section>
  );
}
