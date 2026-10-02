// Render the frog reveal (reveal.js) to video files with transparency.
//
//   npm run dev                       # the page is served from the dev server
//   node tools/frog-reveal/render.mjs [page params] [--name frog-reveal]
//   node tools/frog-reveal/render.mjs style=vine --versions 8 [--pool 24]
//
// Page params go straight through to the page, e.g. `seed=moss w=1080 h=1080`.
// One render writes to media/frog-reveal/:
//   <name>.mov            QuickTime Animation, lossless with alpha (Premiere, Final Cut,
//                         Resolve, After Effects); small, since most of the frame is clear
//   <name>.webm           VP9 with alpha (browsers, web video)
//   <name>-on-paper.mp4   H.264 on the site's paper colour, for anything without alpha
//   <name>-on-checker.mp4 H.264 over a checkerboard, to see the transparency on a phone
//   <name>-preview.png    animated PNG with alpha at half size; plays in phone browsers
//   <name>-last.png       the finished frame, transparent
//
// --versions N renders N different versions into media/frog-reveal/versions/
// as <name>-01 … <name>-NN (all of the above but the animated PNG), plus
// <name>-grid.mp4 showing them side by side. It tries --pool seeds (3N by
// default), scores how completely each one's ink outlines the frog, and
// keeps the best N.
//
// Other flags: --port 5179, --seeds <prefix> (seeds are <prefix>1, <prefix>2…;
// change it for a fresh batch).
//
// Needs, once, outside package.json:
//   npm i --no-save puppeteer-core ffmpeg-static
// and Chrome or Edge installed (or CHROME=<path>). FFMPEG=<path> overrides
// the ffmpeg binary. (On Windows on ARM, ffmpeg-static only ships x64:
// install it with npm_config_arch=x64.)

import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args.splice(i, 2)[1] : d;
};
const port = flag("port", "5179");
const name = flag("name", "frog-reveal");
const versions = Number(flag("versions", 0));
const pool = Number(flag("pool", versions * 3));
const prefix = flag("seeds", "v");
const params = new URLSearchParams(args.map((a) => a.split("=")));
params.set("render", "");

const browserPath =
  process.env.CHROME ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  ].find(existsSync);
let ffmpeg = process.env.FFMPEG;
if (!ffmpeg) {
  try { ffmpeg = (await import("ffmpeg-static")).default; } catch {}
}
ffmpeg ||= "ffmpeg";
const run = (...a) => execFileSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", ...a], { stdio: "inherit" });

const { default: puppeteer } = await import("puppeteer-core");
const browser = await puppeteer.launch({ executablePath: browserPath, headless: true });

/** Open the page with these params and wait for it to be ready. */
async function open(p) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("page:", e.message));
  await page.goto(`http://localhost:${port}/tools/frog-reveal/?${p}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.reveal, { timeout: 30000 });
  return page;
}

/** Render one version to `<out>/<base>*`. */
async function render(p, out, base, { preview = true } = {}) {
  const tmp = join(out, `.frames-${base}`);
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const page = await open(p);
  const { frames, fps, width, height } = await page.evaluate(() => {
    const { frames, fps, width, height } = window.reveal;
    return { frames, fps, width, height };
  });
  console.log(`${base}: ${frames} frames, ${width}×${height} @ ${fps}fps`);
  let last = "";
  for (let n = 0; n < frames; n++) {
    const url = await page.evaluate((n) => window.reveal.frame(n), n);
    last = join(tmp, `${String(n).padStart(5, "0")}.png`);
    await writeFile(last, Buffer.from(url.split(",")[1], "base64"));
  }
  await page.close();

  const seq = ["-framerate", String(fps), "-i", join(tmp, "%05d.png")];
  const file = (ext) => join(out, `${base}${ext}`);
  const h264 = ["-c:v", "libx264", "-crf", "16", "-preset", "slow", "-movflags", "+faststart"];
  run(...seq, "-c:v", "qtrle", "-pix_fmt", "argb", file(".mov"));
  run(...seq, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "22", "-row-mt", "1", "-auto-alt-ref", "0", file(".webm"));
  run(
    "-f", "lavfi", "-i", `color=c=0xf3f0e8:s=${width}x${height}:r=${fps}`, ...seq,
    "-filter_complex", "[0][1]overlay=shortest=1,format=yuv420p", ...h264, file("-on-paper.mp4"),
  );
  // Over a checkerboard, the usual stand-in for "transparent", for phones,
  // which can't play video with alpha.
  run(
    "-f", "lavfi", "-i", `color=c=white:s=${width}x${height}:r=${fps},format=gray,geq=lum='if(mod(floor(X/32)+floor(Y/32),2),205,240)'`, ...seq,
    "-filter_complex", "[0][1]overlay=shortest=1,format=yuv420p", ...h264, file("-on-checker.mp4"),
  );
  if (preview) run(...seq, "-vf", `scale=${Math.round(width / 2)}:-1:flags=lanczos`, "-plays", "0", "-f", "apng", file("-preview.png"));
  await copyFile(last, file("-last.png"));
  await rm(tmp, { recursive: true, force: true });
  return { width, height };
}

if (!versions) {
  const out = resolve("media/frog-reveal");
  await mkdir(out, { recursive: true });
  await render(params, out, name);
  console.log(`wrote ${out}`);
} else {
  // Score a pool of seeds and keep the ones that outline the frog best.
  const scored = [];
  for (let i = 1; i <= pool; i++) {
    const seed = `${prefix}${i}`;
    const p = new URLSearchParams(params);
    p.set("seed", seed);
    p.set("dpr", "1");
    const page = await open(p);
    const score = await page.evaluate(() => window.reveal.score());
    await page.close();
    scored.push({ seed, score });
    console.log(`${seed}: ${score.toFixed(3)}`);
  }
  const keep = scored.sort((a, b) => b.score - a.score).slice(0, versions);

  const out = resolve("media/frog-reveal/versions");
  await mkdir(out, { recursive: true });
  let size;
  const names = [];
  for (const [i, { seed }] of keep.entries()) {
    const p = new URLSearchParams(params);
    p.set("seed", seed);
    const base = `${name}-${String(i + 1).padStart(2, "0")}`;
    size = await render(p, out, base, { preview: false });
    names.push(base);
  }
  await writeFile(
    join(out, "seeds.txt"),
    `Each version's page params, to re-render one exactly:\n\n` +
      keep.map(({ seed, score }, i) => `${names[i]}  ${params.toString().replace(/&?render=/, "")}&seed=${seed}  (outline ${score.toFixed(2)})`).join("\n") + "\n",
  );

  // All of them side by side, on paper, for picking from on a phone: left to
  // right, top to bottom, 01 first.
  const cols = Math.min(names.length, names.length > 4 ? 4 : 2);
  const rows = Math.ceil(names.length / cols);
  const tw = 480, th = Math.round((tw * size.height) / size.width / 2) * 2;
  const inputs = names.flatMap((b) => ["-i", join(out, `${b}-on-paper.mp4`)]);
  const scaled = names.map((_, i) => `[${i}:v]scale=${tw}:${th}[v${i}]`);
  const layout = names.map((_, i) => `${(i % cols) * tw}_${Math.floor(i / cols) * th}`).join("|");
  const pad = names.length < cols * rows ? `,pad=${cols * tw}:${rows * th}:0:0:color=0xf3f0e8` : "";
  run(
    ...inputs,
    "-filter_complex", `${scaled.join(";")};${names.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${names.length}:layout=${layout}:fill=0xf3f0e8${pad},format=yuv420p`,
    "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-movflags", "+faststart",
    join(out, `${name}-grid.mp4`),
  );
  console.log(`wrote ${names.length} versions to ${out}`);
}
await browser.close();
