import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Minimal Vite config — the eval suites live alongside this file and import each other relatively.
export default defineConfig({
  plugins: [react()],
  server: { port: 5180, open: true },
})
