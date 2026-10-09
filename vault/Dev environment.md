---
tags: [dev, environment]
updated: 2026-10-05
---

# Dev environment

Daniel's machine and how the work gets checked. See [[Home]].

## Machine

- Windows 11 **on ARM** (Node reports `arm64`). Shells: PowerShell and Git Bash. No Python.
- Files are mostly CRLF in the working tree. Editing scripts should preserve line endings (match on normalized text).
- ~16GB RAM. Claude Code kills idle background shells under memory pressure. When it "kills" the dev server, the `node vite` process has been seen to survive untracked (find it with `netstat -ano | grep :5179`).

## Dev server

- `npx vite --port 5179 --strictPort`. **Daniel wants localhost on port 5179.**
- For one-off checks without the dev server: `npm run build` then a short-lived `npx vite preview --port 5180`, killed afterwards.

## Visual testing (no Chrome extension needed)

- The Claude-in-Chrome extension has been flaky (disconnects). Instead, Claude's scratchpad has **puppeteer-core** driving installed **Edge** (`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`) headless for real-time screenshots, resize sequences, clicks, and reading model-viewer camera state.
- Headless Edge's own `--screenshot` with `--virtual-time-budget` does **not** run the growth animation properly. Use puppeteer with real waits.
- Scratchpad installs don't persist between sessions; reinstall `puppeteer-core` (and ffmpeg) as needed.

## ffmpeg

- `ffmpeg-static` has no Windows ARM build. Install with `npm_config_arch=x64`, then run `node node_modules/ffmpeg-static/install.js` with the same variable if the binary is missing (npm's allow-scripts blocks the install script). The x64 binary runs under emulation. Pass it to the renderer as `FFMPEG=<path>`.
- No system font path is used in filters (drawtext was avoided).

## Daniel's browser

Daniel's main browser is **Dia** (Chromium 155, Windows on ARM, Qualcomm Adreno GPU, 1x, window ~1270x840 or narrower). Claude in Chrome connects to it; test motion there (sample canvases with javascript_tool, read logs with read_console_messages). Headless Edge at 1440x900 missed a bug that only showed at his window size (2026-10-08).
