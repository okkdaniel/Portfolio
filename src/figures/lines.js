// A CAD model drawn as lines on paper: the renderer behind every figure.
//
// Three passes. One renders the scene's view-space normals (taken from each
// triangle itself, so facets are flat) and depth. Two inks wherever depth
// jumps between neighbouring pixels (outlines, dark) or the surface turns
// (creases, lighter); hidden lines never show, because what's behind
// something never makes a depth jump on screen. Inside the object it lays
// paper, so the figure covers what's behind it; round it, a halo of paper
// that thins out into halftone dots on the site's screen (as ink gives out
// near text), so the figure clears its own space in the growth wherever it
// moves, softly; past that, it's clear. Three averages that, drawn at twice
// the pixels, down to the screen, so lines are smooth.
//
// Everything is in metres, z up, as the models come out of
// tools/cad-lines/prepare.mjs.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

THREE.ColorManagement.enabled = false;             // the paper and ink are exact hex values
const SS = 2;                                       // supersampling
const full = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

// Each model is fetched and parsed once; every figure showing it gets its own
// copy of the scene (sharing the geometry), since each draws in its own context.
const models = new Map();
export function loadModel(url) {
  if (!models.has(url)) {
    models.set(url, new Promise((ok, fail) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(url, (g) => ok(g.scene), undefined, fail)));
  }
  return models.get(url);
}

/**
 * A line view on a canvas. `az` and `el` (degrees) place the orthographic
 * camera round its target; `sil` is the depth jump, in metres, over which an
 * outline goes from nothing to full ink (scale it with the model: a robot
 * wants centimetres, a small bracket millimetres).
 */
export const HALO = 22;   // CSS px of halo round the object
export const ZOOM = 0.08; // how much bigger a figure gets when hovered
const PITCH = 3;          // the site's halftone screen, CSS px

export function lineView(canvas, { az = -38, el = 24, sil = [0.012, 0.03], paper = "#f3f0e8", ink = "#262a25" } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 50);
  camera.up.set(0, 0, 1);

  const normalMat = new THREE.ShaderMaterial({
    vertexShader: "varying vec3 vPos; void main(){ vec4 p = modelViewMatrix * vec4(position,1.0); vPos = p.xyz; gl_Position = projectionMatrix * p; }",
    fragmentShader: "varying vec3 vPos; void main(){ vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos))); gl_FragColor = vec4(n*0.5+0.5, 1.0); }",
    side: THREE.DoubleSide,
  });
  const inkMat = new THREE.ShaderMaterial({
    uniforms: {
      tN: { value: null }, tD: { value: null }, px: { value: new THREE.Vector2() }, unit: { value: 1 }, reveal: { value: 1 },
      paper: { value: new THREE.Color(paper) }, ink: { value: new THREE.Color(ink) },
      span: { value: camera.far - camera.near }, sil: { value: new THREE.Vector2(...sil) },
    },
    vertexShader: full,
    fragmentShader: `
      uniform sampler2D tN, tD; uniform vec2 px, sil; uniform vec3 paper, ink; uniform float span, unit, reveal; varying vec2 vUv;
      float D(vec2 o){ return texture2D(tD, vUv + o * px).r; }
      // Whether the object covers a point, o in render pixels from here.
      float on(vec2 o){ return texture2D(tN, vUv + o * px).a; }
      float hash(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
      vec3 N(vec2 o){ return texture2D(tN, vUv + o * px).xyz * 2.0 - 1.0; }
      void main(){
        float d = D(vec2(0)); vec3 n = N(vec2(0));
        float de = 0.0, ne = 0.0;
        for (int i = 0; i < 4; i++) {
          vec2 o = i == 0 ? vec2(1,0) : i == 1 ? vec2(-1,0) : i == 2 ? vec2(0,1) : vec2(0,-1);
          float dd = D(o);
          // Next to empty space, depth jumps all the way: that's an outline.
          de = max(de, (dd >= 1.0) != (d >= 1.0) ? 1.0 : abs(dd - d) * span);
          ne = max(ne, 1.0 - dot(n, N(o)));
        }
        float outline = (d >= 1.0 && de >= 1.0) ? 1.0 : smoothstep(sil.x, sil.y, de);
        float crease = d >= 1.0 ? 0.0 : smoothstep(0.12, 0.3, ne); // about 30 to 45 degrees
        float a = max(outline, crease * 0.55) * 0.9;
        vec4 c;
        if (d < 1.0) {
          c = vec4(mix(paper, ink, a), 1.0);        // inside: paper, inked
        } else {
          // Outside: how near the object is, from rings of samples (unit is
          // render pixels per CSS px), as paper that thins out into the
          // screen's dots: each dot is kept with that much chance.
          float near = 0.0;
          for (int r = 1; r <= 4; r++) {
            float rad = float(r) * ${(HALO / 4).toFixed(1)} * unit;
            float hit = 0.0;
            for (int k = 0; k < 12; k++) {
              float t = float(k) * 0.5236;
              hit = max(hit, on(vec2(cos(t), sin(t)) * rad));
            }
            if (hit > 0.5) { near = 1.0 - (float(r) - 1.0) / 4.0; break; }
          }
          vec2 cell = floor(gl_FragCoord.xy / (${PITCH.toFixed(1)} * unit));
          float f = near * near * (3.0 - 2.0 * near);
          float keep = (near >= 1.0 || hash(cell) < f * 0.92) ? 1.0 : 0.0;
          c = mix(vec4(ink, a), vec4(mix(paper, ink, a), 1.0), keep);
        }
        // Coming in (reveal 0 to 1), the figure grows up from the ground in
        // the screen's dots: each dot shows once reveal passes its height
        // plus a little chance. Going out, the same, backwards.
        if (reveal < 1.0) {
          vec2 grain = floor(gl_FragCoord.xy / (${PITCH.toFixed(1)} * unit));
          float when = vUv.y * 0.6 + hash(grain + 7.0) * 0.4;
          c *= step(when, reveal * 1.02);
        }
        gl_FragColor = vec4(c.rgb * c.a, c.a);   // premultiplied
      }`,
    transparent: true,
  });
  const downMat = new THREE.ShaderMaterial({
    uniforms: { t: { value: null }, px: { value: new THREE.Vector2() } },
    vertexShader: full,
    fragmentShader: "uniform sampler2D t; uniform vec2 px; varying vec2 vUv; void main(){ vec4 c = vec4(0); for (int i = 0; i < 2; i++) for (int j = 0; j < 2; j++) c += texture2D(t, vUv + (vec2(i, j) - 0.5) * px); gl_FragColor = c / 4.0; }",
    transparent: true, blending: THREE.NoBlending,
  });
  inkMat.blending = THREE.NoBlending;
  const quad = (m) => { const s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m)); return s; };
  const post = quad(inkMat), down = quad(downMat), flat = new THREE.Camera();
  let target = null, inked = null;

  const view = {
    scene, camera, renderer, material: normalMat,
    frame: { cx: 0, cy: 0, h: 1 },

    /** Points the camera at `look` (a Vector3) from its azimuth and elevation. */
    aim(look = new THREE.Vector3()) {
      const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
      camera.position.copy(look).add(new THREE.Vector3(Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e)).multiplyScalar(10));
      camera.lookAt(look);
      camera.updateMatrixWorld();
    },

    /** A copy of a model's scene for this view, drawn by the normal pass. */
    async model(url) {
      const s = (await loadModel(url)).clone(true);
      s.traverse((o) => { if (o.isMesh) o.material = normalMat; });
      return s;
    },

    /** The camera-space box round the scene as posed now (each mesh's own box, transformed), added to `box`. */
    box(box = new THREE.Box3()) {
      scene.updateMatrixWorld(true);
      const inv = camera.matrixWorldInverse, c = new THREE.Vector3();
      scene.traverse((o) => {
        if (!o.isMesh) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const b = o.geometry.boundingBox;
        for (let k = 0; k < 8; k++) box.expandByPoint(c.set(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).applyMatrix4(o.matrixWorld).applyMatrix4(inv));
      });
      return box;
    },

    /** Frames exactly a camera-space box (the canvas is expected to share its aspect). */
    frameTo(box) {
      const aspect = canvas.clientWidth / canvas.clientHeight || 1;
      const h = Math.max((box.max.y - box.min.y) / 2, (box.max.x - box.min.x) / 2 / aspect);
      view.frame = { cx: (box.min.x + box.max.x) / 2, cy: (box.min.y + box.max.y) / 2, h };
      view.resize();
    },

    project() {
      const f = view.frame, W = (f.h * canvas.clientWidth) / canvas.clientHeight;
      Object.assign(camera, { left: f.cx - W, right: f.cx + W, top: f.cy + f.h, bottom: f.cy - f.h });
      camera.updateProjectionMatrix();
    },

    resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight, r = renderer.getPixelRatio() * SS;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      view.project();
      target?.dispose(); inked?.dispose();
      const W2 = Math.round(w * r), H2 = Math.round(h * r);
      target = new THREE.WebGLRenderTarget(W2, H2, { depthTexture: new THREE.DepthTexture(W2, H2) });
      inked = new THREE.WebGLRenderTarget(W2, H2, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
      inkMat.uniforms.tN.value = target.texture;
      inkMat.uniforms.tD.value = target.depthTexture;
      inkMat.uniforms.px.value.set(1 / W2, 1 / H2);
      inkMat.uniforms.unit.value = r;
      downMat.uniforms.t.value = inked.texture;
      downMat.uniforms.px.value.set(1 / W2, 1 / H2);
    },

    /** How far in the figure has grown, 0..1 (see the ink pass). */
    setReveal(v) { inkMat.uniforms.reveal.value = v; },

    draw() {
      if (!target) return;
      renderer.setRenderTarget(target); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
      renderer.setRenderTarget(inked); renderer.clear(); renderer.render(post, flat);
      renderer.setRenderTarget(null); renderer.clear(); renderer.render(down, flat);
    },

    /**
     * Where the object is, as a canvas the size of this one in CSS px:
     * opaque on the object, clear elsewhere. For laying it down as masking
     * fluid (ink.js resistFrom).
     */
    silhouette() {
      view.draw();
      const W2 = target.width, H2 = target.height;
      const px = new Uint8Array(W2 * H2 * 4);
      renderer.readRenderTargetPixels(target, 0, 0, W2, H2, px);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const out = document.createElement("canvas");
      out.width = W2; out.height = H2;
      const c = out.getContext("2d"), img = c.createImageData(W2, H2);
      for (let y = 0; y < H2; y++) {
        for (let x = 0; x < W2; x++) {
          const a = px[((H2 - 1 - y) * W2 + x) * 4 + 3];
          img.data[(y * W2 + x) * 4 + 3] = a;
        }
      }
      c.putImageData(img, 0, 0);
      const small = document.createElement("canvas");
      small.width = Math.round(w); small.height = Math.round(h);
      small.getContext("2d").drawImage(out, 0, 0, small.width, small.height);
      return small;
    },

    dispose() {
      target?.dispose(); inked?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
  return view;
}

/** A spring on one number, as the site's: k 100, c 18. step(dt) returns whether it's still moving. */
export function spring(x) {
  return {
    x, v: 0, t: x,
    step(dt) {
      this.v += (100 * (this.t - this.x) - 18 * this.v) * dt;
      this.x += this.v * dt;
      const moving = Math.abs(this.v) > 1e-4 || Math.abs(this.t - this.x) > 1e-4;
      if (!moving) { this.x = this.t; this.v = 0; }
      return moving;
    },
    jump(v) { this.t = this.x = v; this.v = 0; },
  };
}

export { THREE };
