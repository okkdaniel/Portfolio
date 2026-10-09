import React from "react";
import { Field } from "./art/Field.jsx";
import { Overlay } from "./ui/Overlay.jsx";
import { ProjectPage } from "./ui/ProjectPage.jsx";
import { Works } from "./art/Works.jsx";
import { SAMPLE_PROJECTS } from "./data.js";
import { preparePageFigure, whenIdle } from "./figures/load.js";

const PROJECTS = [...SAMPLE_PROJECTS].sort((a, b) => a.index - b.index);
const FALLBACK_MS = 1500; // the outgoing side goes anyway if the incoming one never says it's ready
const GONE_MS = 1200;     // a page that's leaving stays this long, to un-grow

/**
 * App — one sheet of paper that things grow on, with a little text over it.
 * The only route is '#work/<slug>', which opens that project's page; anything
 * else is the field alone. The field stays mounted throughout, so navigating
 * never erases what has grown.
 *
 * Three things can be on the paper: the field's growth, Works (the projects
 * surfaced in it, while its fold is open), and a project's page. One at a
 * time, and when one goes and another comes they run at the same moment
 * (vault/Rules.md): the incoming one gets itself ready (its figures, its
 * layout), says so, and starts growing as the outgoing one starts going
 * back. Should it never say so, the outgoing one goes anyway, after a bit.
 *
 *   field → Works      Works ready: the field retracts.
 *   Works → project    the page ready: Works un-grows.
 *   field → project    the page ready: the field retracts.
 *   project → project  the new page ready: the old one un-grows.
 *   project → Works    (closing it with the fold open) Works ready: the page un-grows.
 *   project → field    the page un-grows as the field regrows.
 *   Works → field      Works un-grows as the field regrows.
 */
export default function App() {
  const [hash, setHash] = React.useState(window.location.hash);
  const [open, setOpen] = React.useState(null);
  const [hovered, setHovered] = React.useState(null);
  const fieldRef = React.useRef(null);

  React.useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const slug = hash.startsWith("#work/") ? hash.slice("#work/".length) : null;
  const at = PROJECTS.findIndex((p) => p.slug === slug);
  const project = at >= 0 ? PROJECTS[at] : null;

  React.useEffect(() => {
    if (slug && !project) window.location.hash = "";
  }, [slug, project]);

  React.useEffect(() => {
    document.title = project ? `${project.title} · Daniel Kaliko` : "Daniel Kaliko";
  }, [project]);

  const worksOpen = open === "works";
  const now = React.useRef({});
  now.current = { worksOpen, slug: project?.slug ?? null };

  // The field: bare while Works or a page is up, grown otherwise.
  const bare = worksOpen || !!project;
  const retractField = React.useCallback(() => {
    if (now.current.worksOpen || now.current.slug) fieldRef.current?.retract();
  }, []);
  React.useEffect(() => {
    if (bare) {
      const t = setTimeout(retractField, FALLBACK_MS);
      return () => clearTimeout(t);
    }
    fieldRef.current?.regrow();
  }, [bare, retractField]);

  // Pages: the current one, and any still un-growing on their way out.
  const [pages, setPages] = React.useState([]); // [{ slug, id, leaving, at }]
  const [readySlug, setReadySlug] = React.useState(null); // the page last ready, while any is up
  const seq = React.useRef(0);
  const leavePages = React.useCallback((keep) => {
    setPages((ps) => ps.map((pg) => (pg.leaving || pg.slug === keep ? pg : { ...pg, leaving: true, at: performance.now() })));
  }, []);
  const pageReady = React.useCallback((s) => {
    if (s !== now.current.slug) return;
    setReadySlug(s);
    leavePages(s);
    retractField();
  }, [leavePages, retractField]);
  React.useEffect(() => {
    if (project) {
      const s = project.slug;
      setPages((ps) => (ps.some((pg) => pg.slug === s && !pg.leaving) ? ps : [...ps, { slug: s, id: ++seq.current, leaving: false }]));
      const t = setTimeout(() => pageReady(s), FALLBACK_MS);
      return () => clearTimeout(t);
    }
    setReadySlug(null);
    // Back to the field: go now, as it regrows. Back to Works: when it's
    // ready (worksReady), or after a bit.
    if (!now.current.worksOpen) { leavePages(null); return; }
    const t = setTimeout(() => leavePages(null), FALLBACK_MS);
    return () => clearTimeout(t);
  }, [project, pageReady, leavePages]);
  React.useEffect(() => {
    const out = pages.filter((pg) => pg.leaving);
    if (!out.length) return;
    const due = Math.max(0, Math.min(...out.map((pg) => pg.at + GONE_MS)) - performance.now());
    const t = setTimeout(() => setPages((ps) => ps.filter((pg) => !pg.leaving || pg.at + GONE_MS > performance.now())), due + 20);
    return () => clearTimeout(t);
  }, [pages]);

  // Works: up while its fold is open, except under a page (it stays until
  // the first page is ready, then un-grows). It stays mounted a moment
  // after, to un-grow; each time it comes back it grows afresh.
  const worksWanted = worksOpen && (!project || !readySlug);
  const [worksMounted, setWorksMounted] = React.useState(false);
  const [worksVisit, setWorksVisit] = React.useState(0);
  const wasWanted = React.useRef(false);
  const worksReady = React.useCallback(() => {
    retractField();
    if (!now.current.slug) leavePages(null);
    // With Works up, make the projects' page figures, so one opens at once.
    whenIdle(() => PROJECTS.forEach((p) => preparePageFigure(p.slug)), 1500);
  }, [retractField, leavePages]);
  // A project reached for (in the list or in Works): make its page figure.
  React.useEffect(() => { if (hovered) preparePageFigure(hovered); }, [hovered]);
  React.useEffect(() => {
    if (worksWanted) {
      setWorksVisit((v) => v + 1);
      setWorksMounted(true);
      wasWanted.current = true;
      return;
    }
    if (!wasWanted.current) return;
    wasWanted.current = false;
    const t = setTimeout(() => setWorksMounted(false), 1000);
    return () => clearTimeout(t);
  }, [worksWanted]);
  React.useEffect(() => { if (!worksOpen) setHovered(null); }, [worksOpen]);

  // Escape closes Works (an open page handles Escape itself, first).
  React.useEffect(() => {
    if (!worksOpen || project) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [worksOpen, project]);

  const close = React.useCallback(() => { window.location.hash = ""; }, []);
  // With a project open, any fold opened or closed leaves it for what the
  // folds now say: Works opened (or "all works" on the page) brings Works
  // back, Works closed goes home.
  const fold = React.useCallback((key) => {
    setOpen(key);
    if (now.current.slug) window.location.hash = "";
  }, []);
  const toWorks = React.useCallback(() => fold("works"), [fold]);
  const toHome = React.useCallback(() => fold(null), [fold]);
  const closeWorks = React.useCallback(() => setOpen(null), []);
  const reset = React.useCallback(() => fieldRef.current?.reset(), []);

  return (
    <>
      <Field ref={fieldRef} />
      {worksMounted && (
        <Works
          key={worksVisit}
          projects={PROJECTS}
          onReady={worksReady}
          hovered={hovered}
          onHover={setHovered}
          onClose={closeWorks}
          leaving={!worksWanted}
        />
      )}
      {pages.map((pg) => {
        const i = PROJECTS.findIndex((p) => p.slug === pg.slug);
        const next = PROJECTS[(i + 1) % PROJECTS.length];
        return (
          <ProjectPage
            key={pg.id}
            project={PROJECTS[i]}
            next={next.slug !== pg.slug ? next : null}
            leaving={pg.leaving}
            onReady={pageReady}
            onBack={close}
            onWorks={toWorks}
            onHome={toHome}
          />
        );
      })}
      <Overlay open={open} setOpen={fold} onReset={reset} projects={PROJECTS} hovered={hovered} onHover={setHovered} current={project?.slug ?? null} />
    </>
  );
}
