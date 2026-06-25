import { useEffect, useRef, useState } from "react";

/**
 * useInView — reports whether the referenced element is intersecting the
 * viewport. Drives the quiet fade/slide reveals on the home page. By default
 * it toggles both ways (fades out again when scrolled away); pass `once` to
 * latch on first reveal.
 */
export function useInView({ threshold = 0.18, rootMargin = "0px 0px -10% 0px", once = false } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) io.disconnect();
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, inView];
}
