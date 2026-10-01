import React from "react";
import { Board } from "./art/Board.jsx";
import { Atmosphere } from "./art/Atmosphere.jsx";
import { Frog } from "./art/Frog.jsx";
import { Overlay } from "./ui/Overlay.jsx";
import { ProjectSheet } from "./ui/ProjectSheet.jsx";
import { SAMPLE_PROJECTS } from "./data.js";

const PROJECTS = [...SAMPLE_PROJECTS].sort((a, b) => a.index - b.index);

/**
 * App — one living board with text over it. The only route is '#work/<slug>',
 * which opens that project's sheet; anything else is the board alone. The
 * board stays mounted throughout, so navigating never resets what has grown.
 */
export default function App() {
  const [hash, setHash] = React.useState(window.location.hash);
  const [open, setOpen] = React.useState(null);
  const boardRef = React.useRef(null);
  const headRef = React.useRef(null);

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
  const reset = React.useCallback(() => boardRef.current?.reset(), []);
  const openAbout = React.useCallback(() => setOpen("about"), []);

  // Where the frog may not land: under the text column, plus a margin.
  const avoid = React.useCallback(() => {
    const r = headRef.current?.getBoundingClientRect();
    return r ? { x: r.left - 40, y: r.top - 40, w: r.width + 80, h: r.height + 80 } : null;
  }, []);

  return (
    <>
      <Board ref={boardRef} dimmed={!!project} />
      <Atmosphere />
      <Frog board={boardRef} avoid={avoid} onClick={openAbout} />
      <Overlay open={open} setOpen={setOpen} onReset={reset} projects={PROJECTS} headRef={headRef} />
      {project && <ProjectSheet project={project} next={next !== project ? next : null} onClose={close} />}
    </>
  );
}
