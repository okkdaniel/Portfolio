/**
 * Elevator: FRC Team 987's 2025 offseason robot, measured from its CAD, in
 * inches. A 35.6" bumpered swerve chassis (2025O-1000); a two-stage elevator
 * (21000) that stands 38.5" and runs out to 65"; the carriage and carbon arm
 * (22000V2), whose tip reaches 87.8" with the arm at 68.36°; and the intake
 * (23000), stowed upright, swung out 143.69° to the floor to pick up.
 *
 * The pointer's height is the cycle: low, the intake swings out to the floor
 * and the arm hangs ready to take the piece; higher, the intake stows, the
 * elevator runs out and the arm swings up to a scoring level. Four dots on
 * the elevator mark the levels. At rest the grabber holds the bright. The
 * slider is the arm's top angle, in degrees.
 *
 * World: x is the robot's depth (+x is the front, where the intake is), y its
 * width, z up; one unit is an inch.
 */
const {
  Cam, clamp, fit, hull, lerp, open, poly, prism, proj, rad, rings, rrect, facing,
  spring, stepS, mk, place, pointer, put, register, disposer, solid,
} = HL;

const B = 17.8;                                   // bumper half-size
const RET = 38.5, EXT = 65;                       // elevator retracted / extended height
const RY = [-9, -6];                              // the rails' y span, left of centre, as built
const ARM_Y = -2.6, ARM_L = 22, ARM_R = 1.25;     // the carbon tube: its plane, length, radius
const GRAB = 7;                                   // the grabber, past the tube's end
const IP = [13, 13], IL = 13, IY = 13.6;          // intake pivot (x, z), arm length, half width
const STOW = 90, OUT = STOW - 143.686355;         // intake angles: upright, and swung out to the floor
const LEVELS = 4;

const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };

/** A box or tube from a to b in the x–z plane at width yc, rounded in section: its silhouette and top crease. */
function bar(P, a, b, yc, hw, ht, r = 0.8) {
  const sec = rrect(-hw, -ht, hw, ht, Math.min(r, hw, ht), 3);
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len, nz = dx / len;
  const at = (o, q) => P(o[0] + nx * q.v, yc + q.u, o[1] + nz * q.v);
  const pts = sec.flatMap((q) => [at(a, q), at(b, q)]);
  const top = (o) => P(o[0] + nx * (ht - 0.5), yc + hw - 0.5, o[1] + nz * (ht - 0.5));
  return { sil: poly(hull(pts)), crease: open([top(a), top(b)]) };
}
/** A roller lying across the robot: a cylinder along y at (x, z). */
function roller(P, x, z, y0, y1, r) {
  const ring = (y) => Array.from({ length: 20 }, (_, k) => { const t = (k / 20) * Math.PI * 2; return P(x + r * Math.cos(t), y, z + r * Math.sin(t)); });
  return { sil: poly(hull(ring(y0).concat(ring(y1)))), crease: poly(ring(y1)) };
}

/** Where everything is at cycle position e (0 intake, 1 top level), with the arm's top angle `top`. */
function pose(e, top) {
  const intake = lerp(OUT, STOW, ease((e - 0.08) / 0.22));
  const run = ease((e - 0.22) / 0.78);
  const lift = lerp(RET, EXT, run);
  const arm = lerp(-90, top, ease((e - 0.25) / 0.75));
  const sh = [0, lift - 4.5];
  const tube = [sh[0] + ARM_L * Math.cos(rad(arm)), sh[1] + ARM_L * Math.sin(rad(arm))];
  const tip = [sh[0] + (ARM_L + GRAB) * Math.cos(rad(arm)), sh[1] + (ARM_L + GRAB) * Math.sin(rad(arm))];
  const it = [IP[0] + IL * Math.cos(rad(intake)), IP[1] + IL * Math.sin(rad(intake))];
  return { lift, sh, tube, tip, it };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let top = value;
  const C = Cam(45, 0.5, 3.2);
  const hi = pose(1, 85), lo = pose(0, 85);
  fit(C, [[-B, -B, 0], [B + 7, B, 0], [B + 7, -B, 0], [-B, B, 0], [hi.tip[0], ARM_Y, hi.tip[1] + 4], [0, RY[0], EXT + 1], [lo.it[0] + 3, 0, 0]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const box = (x0, y0, x1, y1, z0, z1, r = 1, b = 0.6) => { const [o, i] = rings(x0, y0, x1, y1, r, b); const s = solid(g); put(s, prism(P, front, o, i, z0, z1)); return s; };

  // The chassis: bumpers, and the tops of the four swerve modules in its corners.
  box(-B, -B, B, B, 1, 6.6, 3.2, 1.4);
  for (const [x, y] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) box(x - 3.2, y - 3.2, x + 3.2, y + 3.2, 6.6, 8.6, 1.4, 0.6);

  // The elevator: the fixed stage, the moving stage, the carriage, back to front.
  box(-6.5, RY[0], -4.5, RY[1], 6.6, RET);
  const inner = [solid(g), solid(g)];
  const car = solid(g);
  box(4.5, RY[0], 6.5, RY[1], 6.6, RET);
  box(-6.5, RY[0], 6.5, RY[1], RET - 1.2, RET, 0.8, 0.4);
  const marks = [];
  for (let k = 0; k < LEVELS; k++) marks.push(mk("circle", { r: 0.7, class: "dot off" }, g));
  const crown = solid(g);
  // The arm, its grabber, then the intake across the front.
  const tube = solid(g), grab = solid(g);
  const plates = [solid(g)];
  const roll = solid(g);
  plates.push(solid(g));

  const e = spring(0.12);
  let drawn = NaN;
  function draw() {
    const v = e.x;
    if (v === drawn) return;
    drawn = v;
    const q = pose(v, top);
    const [i0, i1] = rings(-4.3, -8.6, -3.1, -6.4, 0.6, 0.3), [j0, j1] = rings(3.1, -8.6, 4.3, -6.4, 0.6, 0.3);
    put(inner[0], prism(P, front, i0, i1, q.lift - RET + 7, q.lift));
    put(inner[1], prism(P, front, j0, j1, q.lift - RET + 7, q.lift));
    const [cr, ci] = rings(-4.6, -6.2, 4.6, -4.8, 1, 0.4);
    put(car, prism(P, front, cr, ci, q.lift - 15, q.lift - 1));
    const [kr, ki] = rings(-4.6, -8.8, 4.6, -6.2, 0.8, 0.4);
    put(crown, prism(P, front, kr, ki, q.lift - 1, q.lift));
    put(tube, bar(P, q.sh, q.tube, ARM_Y, ARM_R, ARM_R, 1.2));
    put(grab, bar(P, q.tube, q.tip, ARM_Y - 1, 3.2, 2.6, 1));
    put(plates[0], bar(P, IP, q.it, -IY, 0.5, 1.6, 0.4));
    put(plates[1], bar(P, IP, q.it, IY, 0.5, 1.6, 0.4));
    put(roll, roller(P, q.it[0], q.it[1], -IY + 0.6, IY - 0.6, 2.4));
    marks.forEach((m, k) => place(m, P(6.6, (RY[0] + RY[1]) / 2, lerp(RET + 2, EXT - 2, k / (LEVELS - 1)) - (EXT - q.lift))));
  }
  grab.sil.classList.add("hi");

  const loop = register(stage, (dt) => { const m = stepS(e, dt); draw(); return m; });
  bag.add(loop.unregister);

  // The pointer's height against the robot at rest, which never moves.
  const yBot = P(0, 0, 0)[1], yTop = P(0, 0, EXT + 8)[1];
  let mode = null, over = null;
  function aim(p) {
    const f = p ? clamp((yBot - p[1]) / (yBot - yTop), 0, 1) : 0.12;
    e.t = f;
    const lv = p ? (f < 0.15 ? 0 : clamp(Math.ceil(((f - 0.15) / 0.85) * LEVELS), 1, LEVELS)) : -1;
    if (lv !== mode) {
      mode = lv;
      grab.sil.classList.toggle("hi", lv < 0);
      roll.sil.classList.toggle("hi", lv === 0);
      marks.forEach((m, k) => m.setAttribute("class", k === lv - 1 ? "dot" : "dot off"));
    }
    read.textContent = lv < 0 ? "rest" : lv === 0 ? "intake" : `L${lv}`;
    loop.wake();
  }
  bag.add(pointer(stage, { move: (p) => { over = p; aim(p); }, leave: () => { over = null; aim(null); } }));
  bag.add(() => svg.replaceChildren());
  draw();

  return {
    set: (v) => { top = v; drawn = NaN; draw(); if (over) aim(over); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "elevator",
  means: "FRC 987's offseason robot: low, the intake swings out; higher, the elevator runs out and the arm swings up to score.",
  rules: [1, 3, 5, 9],
  range: [40, 68.36, 85],
  mount,
});
