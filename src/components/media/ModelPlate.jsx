import React from "react";
import { useInView } from "../../hooks/useInView.js";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import "./ModelPlate.css";

/**
 * ModelPlate — an interactive 3D model in the same slot a wireframe PlateImage
 * would occupy. Drag to orbit, scroll/pinch to zoom (no pan). A gentle auto-spin
 * runs by default and pauses while the viewer is being dragged.
 *
 * Performance: the ~250KB `<model-viewer>` library is code-split and only
 * dynamically imported once the slot scrolls near the viewport, so it never
 * touches the initial bundle or pages without a model.
 *
 * Loading: while the library imports and the model streams in, an editorial
 * hairline loader fills the slot (a drifting segment on a hairline track under a
 * tracked "Loading model" label — see ModelPlate.css). model-viewer's own
 * progress bar is suppressed via an empty `progress-bar` slot. The loader fades
 * out on the model's `load` event. If the model fails to load, the `poster`
 * (the project's wireframe render) is shown as a graceful fallback.
 *
 * Props: `src` (glb path), `poster` (wireframe image used only as an error
 * fallback), `alt`, `caption`, `ratio` (container aspect), `orientation`
 * (roll/pitch/yaw fix for Onshape's Z-up), and `style` (spread onto the figure).
 * No border/shadow/rounding — matches the PlateImage caption treatment.
 */
export function ModelPlate({
  src,
  poster,
  alt = "",
  caption = "Interactive model · drag to orbit · scroll to zoom",
  ratio = "4 / 3",
  // Onshape exports Z-up; glTF/model-viewer is Y-up, so models arrive tipped on
  // their side. This roll/pitch/yaw rights them. Override per project via
  // `modelOrientation` in data.js if a model needs a different correction.
  orientation = "0deg -90deg 0deg",
  style,
  ...rest
}) {
  const [inViewRef, inView] = useInView({ once: true, rootMargin: "200px 0px" });
  const [ready, setReady] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [errored, setErrored] = React.useState(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mvRef = React.useRef(null);

  // Load the viewer library only once the slot is near the viewport. The import
  // registers the <model-viewer> custom element as a side effect.
  React.useEffect(() => {
    if (!inView || ready) return;
    let alive = true;
    import("@google/model-viewer").then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [inView, ready]);

  // model-viewer dispatches native events; React doesn't bind them, so wire the
  // `load`/`error` events by hand once the element is mounted.
  React.useEffect(() => {
    const el = mvRef.current;
    if (!el) return;
    const onLoad = () => setLoaded(true);
    const onError = () => setErrored(true);
    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("load", onLoad);
      el.removeEventListener("error", onError);
    };
  }, [ready]);

  return (
    <figure ref={inViewRef} {...rest} style={{ margin: 0, ...style }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: ratio, background: "transparent" }}>
        {ready && !errored && (
          <model-viewer
            ref={mvRef}
            src={src}
            alt={alt}
            camera-controls=""
            disable-pan=""
            touch-action="pan-y"
            orientation={orientation}
            auto-rotate={reducedMotion ? undefined : ""}
            auto-rotate-delay="0"
            rotation-per-second="18deg"
            interaction-prompt="none"
            shadow-intensity="0"
            environment-image="neutral"
            tone-mapping="neutral"
            exposure="0.5"
            min-camera-orbit="auto auto auto"
            max-camera-orbit="auto auto 200%"
            style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
          >
            {/* Suppress model-viewer's default progress bar; we render our own. */}
            <div slot="progress-bar" />
          </model-viewer>
        )}

        {/* Graceful fallback: if the model fails to load, show the wireframe. */}
        {errored && (
          <img
            src={poster}
            alt={alt}
            style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
          />
        )}

        {/* Editorial loader — visible until the model loads, then fades out. */}
        {!errored && (
          <div
            className="mp-loader"
            role="status"
            aria-label="Loading 3D model"
            style={{ opacity: loaded ? 0 : 1 }}
          >
            <span className="mp-loader__label">Loading model</span>
            <div className="mp-loader__track">
              <div className="mp-loader__seg" />
            </div>
          </div>
        )}
      </div>
      {caption && (
        <figcaption
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--fs-meta)",
            letterSpacing: "var(--tracking-meta)",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
            marginTop: "var(--space-4)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
