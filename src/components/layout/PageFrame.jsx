import React from "react";

/**
 * PageFrame — the canvas. Applies warm-gray background and side gutters via
 * the design-system tokens. Composes any portfolio view.
 *
 * Children are placed in a centered column with --page-max as the upper bound.
 * Use <LeopardPanel/> inside or outside the inner column to bleed the graphic
 * across or off the page.
 *
 * RULE: the decorative contour panels bleed off every edge with large negative
 * offsets. `overflow: clip` here (both axes) means the page can never scroll
 * past the last real content/margin — background graphics are clipped, never
 * extend the scrollable area. Keep this; don't let panels drive page length.
 */
export function PageFrame({ children, style, ...rest }) {
  return (
    <div
      {...rest}
      style={{
        minHeight: "100vh",
        background: "var(--bg-canvas)",
        color: "var(--text-primary)",
        position: "relative",
        overflow: "clip",
        ...style,
      }}
    >
      <div
        style={{
          maxWidth: "var(--page-max)",
          margin: "0 auto",
          paddingLeft: "var(--page-gutter)",
          paddingRight: "var(--page-gutter)",
          position: "relative",
          zIndex: 10,
        }}
      >
        {children}
      </div>
    </div>
  );
}
