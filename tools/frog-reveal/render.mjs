// Render the frog reveal (reveal.js) to video files with transparency.
//
//   npm run dev                       # the page is served from the dev server
//   node tools/frog-reveal/render.mjs [page params] [--port 5179] [--name frog-reveal]
//
// Page params go straight through to the page, e.g. `seed=moss w=1080 h=1080`.
// Writes to media/frog-reveal/:
//   <name>.mov            QuickTime Animation, lossless with alpha (Premiere, Final Cut,
//                         Resolve, After Effects); small, since most of the frame is clear
//   <name>.webm           VP9 with alpha (browsers, web video)
//   <name>-on-paper.mp4   H.264 on the site's paper colour, for anything without alpha
//   <name>-last.png       the finished frame, transparent
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
const params = new URLSearchParams(args.map((a) => a.split("=")));
params.set("render", "");

const out = resolve("media/frog-reveal");
const tmp = join(out, `.frames-${name}`);
await rm(tmp, { recursive: true, force: true });
await mkdir(tmp, { recursive: true });

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

const { default: puppeteer } = await import("puppeteer-core");
const browser = await puppeteer.launch({ executablePath: browserPath, headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("page:", e.message));
page.on("console", (m) => console.log("page:", m.text()));
await page.goto(`http://localhost:${port}/tools/frog-reveal/?${params}`, { waitUntil: "load" });
await page.waitForFunction(() => window.reveal, { timeout: 30000 });
const { frames, fps, width, height } = await page.evaluate(() => {
  const { frames, fps, width, height } = window.reveal;
  return { frames, fps, width, height };
});
console.log(`${frames} frames, ${width}×${height} @ ${fps}fps`);

let last = "";
for (let n = 0; n < frames; n++) {
  const url = await page.evaluate((n) => window.reveal.frame(n), n);
  last = join(tmp, `${String(n).padStart(5, "0")}.png`);
  await writeFile(last, Buffer.from(url.split(",")[1], "base64"));
  if (n % 24 === 0) process.stdout.write(`\r${n}/${frames}`);
}
process.stdout.write(`\r${frames}/${frames}\n`);
await browser.close();

const seq = ["-y", "-hide_banner", "-loglevel", "error", "-framerate", String(fps), "-i", join(tmp, "%05d.png")];
const run = (...a) => execFileSync(ffmpeg, a, { stdio: "inherit" });
const file = (ext) => join(out, `${name}${ext}`);

run(...seq, "-c:v", "qtrle", "-pix_fmt", "argb", file(".mov"));
run(...seq, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "22", "-row-mt", "1", "-auto-alt-ref", "0", file(".webm"));
run(
  "-y", "-hide_banner", "-loglevel", "error",
  "-f", "lavfi", "-i", `color=c=0xf3f0e8:s=${width}x${height}:r=${fps}`,
  "-framerate", String(fps), "-i", join(tmp, "%05d.png"),
  "-filter_complex", "[0][1]overlay=shortest=1,format=yuv420p",
  "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-movflags", "+faststart",
  file("-on-paper.mp4"),
);
await copyFile(last, file("-last.png"));
await rm(tmp, { recursive: true, force: true });
console.log(`wrote ${out}`);
