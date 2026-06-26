import React from "react";
import { PageFrame } from "./components/layout/PageFrame.jsx";
import { Landing } from "./screens/Landing.jsx";
import { WorkIndex } from "./screens/WorkIndex.jsx";
import { ProjectDetail } from "./screens/ProjectDetail.jsx";
import { About } from "./screens/About.jsx";

/**
 * App — hash-based router for the four-screen portfolio. Hash routing keeps
 * deep links working and the back button correct without a server rewrite.
 *
 * Route shapes: '#', '#work', '#work/<slug>', '#about', '#contact', '#resume'.
 * Resume and Contact route to About for now — they are not yet designed.
 */
export default function App() {
  const [route, setRoute] = React.useState(window.location.hash || "#");

  React.useEffect(() => {
    const onHash = () => setRoute(window.location.hash || "#");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Every route change starts at the top — otherwise a click made halfway down
  // the home page lands you halfway down the next screen.
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  const navigate = (href) => {
    if (href.startsWith("mailto:")) { window.location.href = href; return; }
    window.location.hash = href.replace(/^#?/, "#");
  };
  const openProject = (slug) => navigate(`#work/${slug}`);

  let screen;
  if (route === "#" || route === "") {
    screen = <Landing onNavigate={navigate} onOpenProject={openProject} />;
  } else if (route === "#work") {
    screen = <WorkIndex onNavigate={navigate} onOpenProject={openProject} />;
  } else if (route.startsWith("#work/")) {
    const slug = route.slice("#work/".length);
    screen = <ProjectDetail slug={slug} onNavigate={navigate} onOpenProject={openProject} />;
  } else if (route === "#about" || route === "#resume" || route === "#contact") {
    screen = <About onNavigate={navigate} />;
  } else {
    screen = <Landing onNavigate={navigate} onOpenProject={openProject} />;
  }

  return <PageFrame>{screen}</PageFrame>;
}
