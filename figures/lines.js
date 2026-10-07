// A CAD model drawn as lines on paper: the shared renderer for figures/*.
//
// The drawing is three passes. One renders the scene's view-space normals
// (taken from each triangle itself, so facets are flat) and depth. Two inks
// wherever depth jumps between neighbouring pixels (outlines, dark) or the
// surface turns (creases, lighter) and leaves paper everywhere else; hidden
// lines never show, because what's behind something never makes a depth
// jump on screen. Three averages that, drawn at twice the pixels, down to the
// screen, so lines are smooth.
//
// Everything is in metres, z up, as the models come out of
// tools/cad-lines/prepare.mjs.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

THREE.ColorManagement.enabled = false;             // the paper and ink are exact hex values
const SS = 2;                                       // supersampling
const full = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

/**
 * A line view on a canvas. `az` and `el` (degrees) place the orthographic
 * camera round its target; `sil` is the depth jump, in metres, over which an
 * outline goes from nothing to full ink (scale it with the model: a robot
 * wants centimetres, a small bracket millimetres).
 */
export function lineView(canvas, { az = -38, el = 24, sil = [0.012, 0.03], paper = "#f3f0e8", ink = "#262a25" } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
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
      tN: { value: null }, tD: { value: null }, px: { value: new THREE.Vector2() },
      paper: { value: new THREE.Color(paper) }, ink: { value: new THREE.Color(ink) },
      span: { value: camera.far - camera.near }, sil: { value: new THREE.Vector2(...sil) },
    },
    vertexShader: full,
    fragmentShader: `
      uniform sampler2D tN, tD; uniform vec2 px, sil; uniform vec3 paper, ink; uniform float span; varying vec2 vUv;
      float D(vec2 o){ return texture2D(tD, vUv + o * px).r; }
      vec3 N(vec2 o){ return texture2D(tN, vUv + o * px).xyz * 2.0 - 1.0; }
      void main(){
        float d = D(vec2(0)); vec3 n = N(vec2(0));
        float de = 0.0, ne = 0.0;
        for (int i = 0; i < 4; i++) {
          vec2 o = i == 0 ? vec2(1,0) : i == 1 ? vec2(-1,0) : i == 2 ? vec2(0,1) : vec2(0,-1);
          de = max(de, abs(D(o) - d) * span);
          ne = max(ne, 1.0 - dot(n, N(o)));
        }
        float outline = smoothstep(sil.x, sil.y, de);
        float crease = d >= 1.0 ? 0.0 : smoothstep(0.12, 0.3, ne); // about 30 to 45 degrees
        gl_FragColor = vec4(mix(paper, ink, max(outline, crease * 0.55) * 0.9), 1.0);
      }`,
  });
  const downMat = new THREE.ShaderMaterial({
    uniforms: { t: { value: null }, px: { value: new THREE.Vector2() } },
    vertexShader: full,
    fragmentShader: "uniform sampler2D t; uniform vec2 px; varying vec2 vUv; void main(){ vec4 c = vec4(0); for (int i = 0; i < 2; i++) for (int j = 0; j < 2; j++) c += texture2D(t, vUv + (vec2(i, j) - 0.5) * px); gl_FragColor = c / 4.0; }",
  });
  const quad = (m) => { const s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m)); return s; };
  const post = quad(inkMat), down = quad(downMat), flat = new THREE.Camera();
  let target = null, inked = null;

  const view = {
    scene, camera, renderer,
    frame: { cx: 0, cy: 0, h: 1 },

    /** Points the camera at `look` from its azimuth and elevation. */
    aim(look = new THREE.Vector3()) {
      const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
      camera.position.copy(look).add(new THREE.Vector3(Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e)).multiplyScalar(10));
      camera.lookAt(look);
      camera.updateMatrixWorld();
    },

    /** Loads a model, its meshes drawn by the normal pass. */
    load: (url) => new Promise((ok, fail) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(url, (gltf) => {
      gltf.scene.traverse((o) => { if (o.isMesh) o.material = normalMat; });
      ok(gltf);
    }, undefined, fail)),

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

    /** The frame round a camera-space box, with a margin. */
    frameFor(box, margin = 1.12) {
      const aspect = canvas.clientWidth / canvas.clientHeight;
      const h = Math.max((box.max.y - box.min.y) / 2, (box.max.x - box.min.x) / 2 / aspect) * margin;
      return { cx: (box.min.x + box.max.x) / 2, cy: (box.min.y + box.max.y) / 2, h };
    },

    /** Moves the frame part of the way (k) to `want`; returns whether it's still moving. */
    ease(want, k = 0.12) {
      const f = view.frame;
      f.cx += (want.cx - f.cx) * k; f.cy += (want.cy - f.cy) * k; f.h += (want.h - f.h) * k;
      view.project();
      return Math.abs(want.h - f.h) > 1e-5 || Math.abs(want.cy - f.cy) > 1e-5 || Math.abs(want.cx - f.cx) > 1e-5;
    },

    project() {
      const f = view.frame, W = (f.h * canvas.clientWidth) / canvas.clientHeight;
      Object.assign(camera, { left: f.cx - W, right: f.cx + W, top: f.cy + f.h, bottom: f.cy - f.h });
      camera.updateProjectionMatrix();
    },

    resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight, r = renderer.getPixelRatio() * SS;
      renderer.setSize(w, h, false);
      view.project();
      target?.dispose(); inked?.dispose();
      const W2 = Math.round(w * r), H2 = Math.round(h * r);
      target = new THREE.WebGLRenderTarget(W2, H2, { depthTexture: new THREE.DepthTexture(W2, H2), type: THREE.HalfFloatType });
      inked = new THREE.WebGLRenderTarget(W2, H2, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
      inkMat.uniforms.tN.value = target.texture;
      inkMat.uniforms.tD.value = target.depthTexture;
      inkMat.uniforms.px.value.set(1 / W2, 1 / H2);
      downMat.uniforms.t.value = inked.texture;
      downMat.uniforms.px.value.set(1 / W2, 1 / H2);
    },

    draw() {
      renderer.setRenderTarget(target); renderer.setClearColor(0x808080, 1); renderer.render(scene, camera);
      renderer.setRenderTarget(inked); renderer.render(post, flat);
      renderer.setRenderTarget(null); renderer.render(down, flat);
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
      return Math.abs(this.v) > 1e-4 || Math.abs(this.t - this.x) > 1e-4;
    },
    jump(v) { this.t = this.x = v; this.v = 0; },
  };
}

export { THREE };
