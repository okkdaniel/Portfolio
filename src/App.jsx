import React from "react";
import { Field } from "./art/Field.jsx";
import { Overlay } from "./ui/Overlay.jsx";
import { ProjectSheet } from "./ui/ProjectSheet.jsx";
import { Works } from "./art/Works.jsx";
import { SAMPLE_PROJECTS } from "./data.js";

const PROJECTS = [...SAMPLE_PROJECTS].sort((a, b) => a.index - b.index);

/**
 * App — one sheet of paper that things grow on, with a little text over it.
 * The only route is '#work/<slug>', which opens that project's sheet; anything
 * else is the field alone. The field stays mounted throughout, so navigating
 * never erases what has grown.
 *
 * Opening the Works fold takes the field's growth back to bare paper and
 * surfaces the projects in it (Works); closing it un-grows the projects and
 * grows the field back. Works stays up under an open sheet, so closing the
 * sheet returns to it.
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
  const next = project ? PROJECTS[(at + 1) % PROJECTS.length] : null;

  React.useEffect(() => {
    if (slug && !project) window.location.hash = "";
  }, [slug, project]);

  React.useEffect(() => {
    document.title = project ? `${project.title} · Daniel Kaliko` : "Daniel Kaliko";
  }, [project]);

  // Works stays mounted for a moment after its fold closes, to un-grow.
  // The field goes the other way: back to paper as Works opens, growing
  // again as it closes.
  const worksOpen = open === "works";
  const [worksMounted, setWorksMounted] = React.useState(false);
  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    if (worksOpen) {
      setWorksMounted(true);
      fieldRef.current?.retract();
      wasOpen.current = true;
      return;
    }
    setHovered(null);
    if (!wasOpen.current) return;
    wasOpen.current = false;
    fieldRef.current?.regrow();
    const t = setTimeout(() => setWorksMounted(false), 900);
    return () => clearTimeout(t);
  }, [worksOpen]);

  // Escape closes Works (an open sheet handles Escape itself, first).
  React.useEffect(() => {
    if (!worksOpen || project) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [worksOpen, project]);

  const close = React.useCallback(() => { window.location.hash = ""; }, []);
  const closeWorks = React.useCallback(() => setOpen(null), []);
  const reset = React.useCallback(() => fieldRef.current?.reset(), []);

  return (
    <>
      <Field ref={fieldRef} dimmed={!!project} />
      {worksMounted && (
        <Works
          projects={PROJECTS}
          hovered={hovered}
          onHover={setHovered}
          onClose={closeWorks}
          dimmed={!!project}
          leaving={!worksOpen}
        />
      )}
      <Overlay open={open} setOpen={setOpen} onReset={reset} projects={PROJECTS} hovered={hovered} onHover={setHovered} />
      {project && <ProjectSheet project={project} next={next !== project ? next : null} onClose={close} />}
    </>
  );
}
