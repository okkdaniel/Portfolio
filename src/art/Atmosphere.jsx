import React from "react";

/**
 * Atmosphere — everything between the board and the text: drifting fog banks,
 * a vignette, and film grain. Pure CSS (see art.css); never takes the pointer.
 */
export function Atmosphere() {
  return (
    <div className="atmos" aria-hidden="true">
      <div className="fog fog--a" />
      <div className="fog fog--b" />
      <div className="fog fog--c" />
      <div className="vignette" />
      <div className="grain" />
    </div>
  );
}
