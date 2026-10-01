import React from "react";

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Clock — live local time in Las Vegas, ticking once a second. */
export function Clock({ place = "Las Vegas, NV" }) {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    // Align ticks to the wall-clock second so it never drifts visibly.
    let timer = setTimeout(function tick() {
      setNow(new Date());
      timer = setTimeout(tick, 1000 - (Date.now() % 1000));
    }, 1000 - (Date.now() % 1000));
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="clock">
      <span className="clock__place">{place}</span>
      <time className="clock__time" dateTime={now.toISOString()}>{fmt.format(now)}</time>
    </div>
  );
}
