import React from "react";
import { Field } from "./art/Field.jsx";
import { Overlay } from "./ui/Overlay.jsx";
import { ProjectSheet } from "./ui/ProjectSheet.jsx";
import { SAMPLE_PROJECTS } from "./data.js";

const PROJECTS = [...SAMPLE_PROJECTS].sort((a, b) => a.index - b.index);

/**
 * App — one sheet of paper that things grow on, with a little text over it.
 * The only route is '#work/<slug>', which opens that project's sheet; anything
 * else is the field alone. The field stays mounted throughout, so navigating
 * never erases what has grown.
 */
export default function App() {
  const [hash, setHash] = React.useState(window.location.hash);
  const [open, setOpen] = React.useState(null);
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

  const close = React.useCallback(() => { window.location.hash = ""; }, []);
  const reset = React.useCallback(() => fieldRef.current?.reset(), []);

  return (
    <>
      <Field ref={fieldRef} dimmed={!!project} />
      <Overlay open={open} setOpen={setOpen} onReset={reset} projects={PROJECTS} />
      {project && <ProjectSheet project={project} next={next !== project ? next : null} onClose={close} />}
    </>
  );
}
