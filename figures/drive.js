/**
 * Drive: the Rival Robotics 2024 robot's six-wheel drivetrain, a rounded
 * chassis plate with three wheels down each side and two vision cameras on
 * top. The pointer picks a wheel: its pod lifts on its suspension and the
 * others follow, less and later the farther they are, so the motion spreads
 * from the wheel touched. At rest the centre pair sits dropped (a real
 * drop-centre six-wheel) and the front camera holds the bright stroke. The
 * slider is the stagger, in ms.
 *
 * The pattern: one of many. Tweens, a stagger by distance, and a hit test on
 * the wheels' rest centres, which never move.
 */
const {
  Cam, clamp, facing, fit, hull, open, poly, prism, proj, rings,
  tween, tset, tval, tdone, mk, pointer, put, register, disposer, solid,
} = HL;

const R = 11, TW = 7;                       // wheel radius, tread width
const XS = [16, 60, 104], Y0 = -1, Y1 = 81;  // wheel stations; outer faces of the two sides
const DROP = 2.2, LIFT = 15;                // the drop-centre at rest; how far a pod lifts
const CHX = [2, 118], CHY = [7, 73], CHZ = [9, 16];

/** The six wheels: side 0 is the far side (small y), side 1 the near; i runs front to back along each. */
const WHEELS = [];
for (const side of [0, 1]) XS.forEach((x, i) => WHEELS.push({ side, i, x, y: side ? Y1 - TW : Y0, z0: R + (i === 1 ? -DROP : 0) }));

/** A wheel standing on edge: its silhouette and the near rim (the crease), axis at height z. */
function wheel(P, w, z) {
  const rim = (y) => Array.from({ length: 24 }, (_, k) => {
    const t = (k / 24) * Math.PI * 2;
    return P(w.x + R * Math.cos(t), y, z + R * Math.sin(t));
  });
  const far = rim(w.y), near = rim(w.y + TW);
  const hub = Array.from({ length: 10 }, (_, k) => {
    const t = (k / 10) * Math.PI * 2;
    return P(w.x + 3 * Math.cos(t), w.y + TW, z + 3 * Math.sin(t));
  });
  return { sil: poly(hull(far.concat(near))), crease: poly(near), hub: poly(hub) };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let step = value;
  const C = Cam(45, 0.5, 1.72);
  fit(C, [[CHX[0] - R, Y0, 0], [CHX[1] + R, Y1, 0], [CHX[1] + R, Y0, 0], [CHX[0] - R, Y1, 0], [60, 40, 44], [XS[0], Y0, 2 * R + LIFT]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const draw = (w, now) => {
    const z = tval(w.z, now);
    if (z === w.drawn) return;
    w.drawn = z;
    const q = wheel(P, w, z);
    w.el.sil.setAttribute("d", q.sil);
    w.el.cr.setAttribute("d", q.crease);
    w.hub.setAttribute("d", q.hub);
  };
  const addWheel = (w) => {
    w.el = solid(g);
    w.hub = mk("path", { class: "nf lo" }, w.el.g);
    w.z = tween(w.z0);
    w.drawn = NaN;
  };

  // Back to front: the far wheels, the chassis and what stands on it, the near wheels.
  WHEELS.filter((w) => w.side === 0).forEach(addWheel);
  const [cr, ci] = rings(CHX[0], CHY[0], CHX[1], CHY[1], 7, 1.8);
  put(solid(g), prism(P, front, cr, ci, CHZ[0], CHZ[1]));
  // Two vision cameras: one on a mast at the back, one low at the front.
  const box = (x0, y0, x1, y1, z0, z1, r = 1.6, b = 0.9) => {
    const [o, i] = rings(x0, y0, x1, y1, r, b);
    const s = solid(g);
    put(s, prism(P, front, o, i, z0, z1));
    return s;
  };
  box(22, 36, 27, 44, CHZ[1], 34, 1.2, 0.6);          // the mast
  box(17, 33, 32, 47, 34, 41);                        // the rear camera
  box(26, 18, 92, 24, CHZ[1], 19, 1.5, 0.7);          // a frame rail
  box(26, 56, 92, 62, CHZ[1], 19, 1.5, 0.7);          // a frame rail
  const cam = box(98, 31, 112, 49, CHZ[1], 25);       // the front camera
  const lens = mk("path", { class: "nf", d: open([P(112, 36, 18), P(112, 44, 18), P(112, 44, 22), P(112, 36, 22), P(112, 36, 18)]) }, cam.g);
  WHEELS.filter((w) => w.side === 1).forEach(addWheel);

  cam.sil.classList.add("hi");
  lens.classList.add("hi");

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const w of WHEELS) { draw(w, now); if (!tdone(w.z, now)) moving = true; }
    return moving;
  });
  bag.add(B.unregister);

  // Hit test on each wheel's rest pose, on screen: the nearest resting hub
  // within a wheel's radius and a bit. Rest centres never move (rule 01).
  const hubs = WHEELS.map((w) => P(w.x, w.y + TW / 2, w.z0));
  const reach = (P(R, 0, 0)[0] - P(0, 0, 0)[0]) * 1.9;
  const hit = (p) => {
    let best = -1, bd = reach;
    hubs.forEach((h, k) => { const d = Math.hypot(p[0] - h[0], p[1] - h[1]); if (d < bd) { bd = d; best = k; } });
    return best;
  };

  let act = -1;
  function choose(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    const o = WHEELS[from];
    WHEELS.forEach((w, k) => {
      const d = Math.hypot(w.x - o.x, w.y - o.y);
      const lift = a < 0 ? 0 : k === a ? LIFT : clamp(LIFT * (1 - d / 95), 0, LIFT) * 0.55;
      tset(w.z, w.z0 + lift, now, (d / 44) * step);
      w.el.sil.classList.toggle("hi", k === a);
    });
    cam.sil.classList.toggle("hi", a < 0);
    lens.classList.toggle("hi", a < 0);
    read.textContent = a < 0 ? "rest" : `wheel ${a + 1}`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { step = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "drive",
  means: "A six-wheel drivetrain: the wheel under the pointer lifts on its pod, and the rest follow in turn.",
  rules: [1, 2, 8, 9],
  range: [0, 45, 90],
  mount,
});
