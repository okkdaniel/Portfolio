import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The portfolio is a single static surface. Hash-based routing keeps deep
// links working without a server-side rewrite, so no SPA fallback is needed.
export default defineConfig({
  plugins: [react()],
});
