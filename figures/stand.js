/**
 * Stand: the low-rise monitor stand, two right-triangle side plates with
 * triangular cut-outs on a bent base plate, and the monitor bolted to their
 * front edges. The pointer pushes the monitor: left of the middle tips the
 * stand forward onto its front foot, right of it rocks it back onto the rear,
 * the further out the more, up to a clamp. A dot on the floor is the centre of
 * gravity: it holds the bright at rest, and slides toward the foot as the
 * stand tips, while the foot it pivots on takes the bright. The slider is the
 * most it tips, in degrees.
 *
 * The pattern: a continuous push. One spring for the angle, a hit test on
 * the pointer's screen x, which never moves, and plates drawn as faces with
 * their holes cut by winding (a hole runs the other way round).
 */
const {
  Cam, clamp, fillet, fit, poly, proj, rad, rrect, seg,
  spring, stepS, mk, place, pointer, register, disposer,
} = HL;

const D = 60, H = 52, W = 46, T = 1.6;          // plate depth, height; stand width; sheet thickness
const MON = { x: -2.5, y0: -34, y1: W + 34, z0: 9, z1: 66, t: 2.4 };
const CG = [MON.x, W / 2, 40];                  // the monitor's centre of gravity, on its back

const tri = fillet([[0, 0], [D, 0], [0, H]], [2.5, 2.5, 3.5]);
const holes = [
  [[5, 29], [5, 42], [19.5, 29]],
  [[5, 5], [25, 5], [5, 19]],
  [[31, 5.5], [48, 5.5], [35.5, 17], [31, 17]],
].map((h) => fillet(h, h.map(() => 1.8)).reverse());
const baseOut = rrect(0, 0, D, W, 3, 4).map((q) => [q.u, q.v]);
const baseHoles = [[8, 8, 26, W - 8], [32, 8, 52, W - 8]].map(([a, b, c, d]) => rrect(a, b, c, d, 3, 4).map((q) => [q.u, q.v]).reverse());
const monOut = rrect(MON.y0, MON.z0, MON.y1, MON.z1, 3, 4).map((q) => [q.u, q.v]);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let most = value;
  const C = Cam(45, 0.5, 1.95);
  /** Tips a world point by a degrees: positive rocks it back on its rear foot, negative forward on its front. */
  const rot = (a) => {
    const s = Math.sin(rad(a)), c = Math.cos(rad(a)), px = a >= 0 ? D : 0;
    return (x, y, z) => [px + (x - px) * c + z * s, y, -(x - px) * s + z * c];
  };
  // Fit to the stand upright and at both extremes of the widest tilt.
  fit(C, [-16, 0, 16].flatMap((a) => [[MON.x, MON.y0, MON.z1], [MON.x, MON.y1, MON.z1], [D, 0, 0], [D, W, 0], [0, W, 0], [MON.x, MON.y0, MON.z0]].map((p) => rot(a)(...p))), 200, 166);
  const P0 = proj(C);
  const at = (a) => { const r = rot(a); return (x, y, z) => P0(...r(x, y, z)); };

  /** A face with holes: points in the face's own (u, v), and where (u, v) sits in the world. */
  const face = (P, out, hs, w) => poly(out.map(([u, v]) => P(...w(u, v)))) + hs.map((h) => poly(h.map(([u, v]) => P(...w(u, v))))).join("");

  const g = mk("g", {}, svg);
  const el = (cls) => mk("path", { class: cls }, g);
  // Back to front: the monitor, the base and the marks on it, the far plate, the near plate.
  const mon = [el("lo"), el("sil")];
  // The centre of gravity: a dot on the monitor's back, and its plumb line to the floor, behind the stand.
  const plumb = mk("path", { class: "nf dash" }, g);
  const cg = mk("circle", { r: 1.7, class: "dot" }, g);
  const base = [el("lo"), el("sil")];
  const feet = [mk("path", { class: "nf lo" }, g), mk("path", { class: "nf lo" }, g)];
  const plates = [0, W - T].map(() => ({ back: el("lo"), face: el("sil"), bolts: [mk("circle", { r: 1.1, class: "dot off" }, g), mk("circle", { r: 1.1, class: "dot off" }, g)] }));

  const ang = spring(0);
  let drawn = NaN;
  function draw() {
    const a = ang.x;
    if (a === drawn) return;
    drawn = a;
    const P = at(a);
    mon[0].setAttribute("d", face(P, monOut, [], (u, v) => [MON.x - MON.t, u, v]));
    mon[1].setAttribute("d", face(P, monOut, [], (u, v) => [MON.x, u, v]));
    base[0].setAttribute("d", face(P, baseOut, baseHoles, (u, v) => [u, v, 0]));
    base[1].setAttribute("d", face(P, baseOut, baseHoles, (u, v) => [u, v, T]));
    [0, W - T].forEach((y, k) => {
      const p = plates[k];
      p.back.setAttribute("d", face(P, tri, holes, (u, v) => [u, y, v]));
      p.face.setAttribute("d", face(P, tri, holes, (u, v) => [u, y + T, v]));
      place(p.bolts[0], P(2.6, y + T, 6)); place(p.bolts[1], P(2.6, y + T, H - 7));
    });
    // The centre of gravity, dropped to the floor, and the two feet it pivots on.
    const c3 = rot(a)(...CG);
    place(cg, P0(...c3));
    plumb.setAttribute("d", seg(P0(...c3), P0(c3[0], c3[1], 0)));
    feet[0].setAttribute("d", seg(P(0.5, 0, T), P(0.5, W, T)));
    feet[1].setAttribute("d", seg(P(D - 0.5, 0, T), P(D - 0.5, W, T)));
  }

  const B = register(stage, (dt) => { const m = stepS(ang, dt); draw(); return m; });
  bag.add(B.unregister);

  let over = null;
  function push(p) {
    const f = p ? clamp((p[0] - 200) / 140, -1, 1) : 0;
    ang.t = f * most;
    const foot = f > 0.02 ? 1 : f < -0.02 ? 0 : -1;
    feet.forEach((el, k) => el.classList.toggle("hi", k === foot));
    cg.setAttribute("class", foot < 0 ? "dot" : "dot m");
    read.textContent = foot < 0 ? "rest" : `tilt ${Math.round(Math.abs(ang.t))}°`;
    B.wake();
  }
  bag.add(pointer(stage, { move: (p) => { over = p; push(p); }, leave: () => { over = null; push(null); } }));
  bag.add(() => svg.replaceChildren());
  draw();

  return {
    set: (v) => { most = v; if (over) push(over); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "stand",
  means: "A low-rise monitor stand: push the monitor and it rocks onto a foot, its centre of gravity sliding toward the edge.",
  rules: [1, 3, 5, 6],
  range: [4, 9, 15],
  mount,
});
