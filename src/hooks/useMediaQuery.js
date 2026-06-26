import { useEffect, useState } from "react";

/**
 * useMediaQuery — reports whether a CSS media query currently matches, and
 * keeps updating as the viewport changes. Lets inline-styled components pick a
 * different value on small screens without media queries in the style object.
 */
export function useMediaQuery(query) {
  const get = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false;

  const [matches, setMatches] = useState(get);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Phone-and-down breakpoint used to collapse multi-column layouts. */
export function useIsMobile() {
  return useMediaQuery("(max-width: 768px)");
}
